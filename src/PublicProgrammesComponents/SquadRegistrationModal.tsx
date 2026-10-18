import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import type { SquadMateRecord } from "../lib/types";
import { resolveStudentProfile } from "../lib/accountResolver";
import { Shield, CheckCircle, AlertCircle, X, Plus, Lock, LogIn, BookOpen, FileText, ExternalLink, Users } from "lucide-react";

interface SquadRegistrationModalProps {
  programCode: string;
  programTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SquadRegistrationModal({
  programCode,
  programTitle,
  isOpen,
  onClose,
  onSuccess,
}: SquadRegistrationModalProps) {
  const [tab, setTab] = useState<"select" | "create">("select");
  const [existingSquads, setExistingSquads] = useState<SquadMateRecord[]>([]);
  const [registeredSquadIds, setRegisteredSquadIds] = useState<Set<string>>(new Set());
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedSquadId, setSelectedSquadId] = useState("");
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [programMeta, setProgramMeta] = useState<any>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // Check if current user is logged in
  const checkAuth = () => {
    try {
      const hasToken = Boolean(localStorage.getItem("userToken") || localStorage.getItem("token"));
      const storedUser = localStorage.getItem("user");
      const cachedStudent = localStorage.getItem("cached_student_profile");
      const cachedWing = localStorage.getItem("cached_wing_profile");
      if (hasToken || cachedStudent || cachedWing) return true;
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && (parsed.IsAuthenticated || parsed.UserEmail || parsed.role || parsed.AddNo)) return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const isAuthenticated = checkAuth();

  // Create Squad Form State
  const [squadTitle, setSquadTitle] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);

  useEffect(() => {
    if (isOpen) {
      void (async () => {
        await loadSquads();
      })();
    }
  }, [isOpen, programCode]);

  const loadSquads = async () => {
    try {
      setLoadingSquads(true);
      const student = await resolveStudentProfile();
      if (student) {
        setCurrentUser(student);
        setMembers([student.AddNo || "", ""]);
      }

      const [squadRes, regRes, progRes] = await Promise.all([
        SupaBaseFunction
          .from("SquadMate")
          .select("*")
          .eq("is_active", true)
          .order("total_points", { ascending: false }),
        SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code, squad_uuid")
          .eq("Program_Code", programCode),
        SupaBaseFunction
          .from("ProgrammesBox")
          .select("is_limitation, group_limit_count, drive_link, topic_title, is_topic")
          .eq("Program_Code", programCode)
          .maybeSingle(),
      ]);

      if (squadRes.error) throw squadRes.error;
      if (progRes.data) {
        setProgramMeta(progRes.data);
      }

      const registeredSet = new Set<string>(
        (regRes.data || []).map((r: any) => r.squad_uuid).filter(Boolean)
      );
      setRegisteredSquadIds(registeredSet);

      const allSquads = squadRes.data || [];
      if (student?.AddNo) {
        const userAddNo = student.AddNo.trim().toUpperCase();

        // Check if student is already personally registered in this programme
        const isPersonallyReg = (regRes.data || []).some(
          (r: any) => r.Candidate_Code && r.Candidate_Code.trim().toUpperCase() === userAddNo
        );
        setIsUserRegistered(isPersonallyReg);

        // Strictly ONLY show squads that belong to the logged-in student (Creator or Teammate)
        const mySquads = allSquads.filter((sq) => {
          return [
            sq.member1_uuid,
            sq.member2_uuid,
            sq.member3_uuid,
            sq.member4_uuid,
            sq.member5_uuid,
            sq.member6_uuid,
            sq.member7_uuid,
          ].some((m) => m && m.trim().toUpperCase() === userAddNo);
        });
        setExistingSquads(mySquads);
      } else {
        // Never show other users' squads to unauthenticated / unresolved profiles
        setIsUserRegistered(false);
        setExistingSquads([]);
      }
    } catch (err: any) {
      console.warn("Could not load squads:", err.message);
    } finally {
      setLoadingSquads(false);
    }
  };

  if (!isOpen) return null;

  const handleMemberChange = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value.trim();
    setMembers(updated);
  };

  const addMemberField = () => {
    if (members.length < 7) {
      setMembers([...members, ""]);
    }
  };

  const removeMemberField = (index: number) => {
    if (members.length > 2) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    if (!isAuthenticated) {
      setStatus({
        type: "error",
        text: "Assigning or forming a squad is not permitted for unauthenticated persons. Please log in first.",
      });
      return;
    }

    const trimmedTitle = squadTitle.trim();
    if (!trimmedTitle) {
      setStatus({ type: "error", text: "Please enter a unique Squad Name." });
      return;
    }

    const filledMembers = members.filter((m) => m.trim().length > 0);
    if (filledMembers.length < 2) {
      setStatus({ type: "error", text: "A group squad must have at least 2 members." });
      return;
    }

    if (programMeta?.is_limitation) {
      const maxGroups = programMeta.group_limit_count ?? 7;
      if (registeredSquadIds.size >= maxGroups) {
        setStatus({
          type: "error",
          text: `⚠️ Group Registration Limit Reached: Maximum of ${maxGroups} squads allowed for this tournament.`,
        });
        return;
      }
    }

    try {
      setSubmitting(true);

      // Verify that all member AddNos exist in StudentsBox
      const { data: validStudents, error: stnError } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName")
        .in("AddNo", filledMembers);

      if (stnError) throw stnError;

      const foundIds = new Set((validStudents || []).map((s) => s.AddNo));
      const missing = filledMembers.filter((id) => !foundIds.has(id));

      if (missing.length > 0) {
        throw new Error(`The following student IDs were not found in StudentsBox: ${missing.join(", ")}`);
      }

      // Prepare SquadMate Payload
      const squadPayload: any = {
        squad_title: trimmedTitle,
        member1_uuid: filledMembers[0],
        member2_uuid: filledMembers[1],
        member3_uuid: filledMembers[2] || null,
        member4_uuid: filledMembers[3] || null,
        member5_uuid: filledMembers[4] || null,
        member6_uuid: filledMembers[5] || null,
        member7_uuid: filledMembers[6] || null,
        is_active: true,
        total_particiations: 1,
        total_points: 0,
        winning_rate: 0,
      };

      const { data: squadData, error: squadError } = await SupaBaseFunction
        .from("SquadMate")
        .insert([squadPayload])
        .select("squad_id")
        .single();

      if (squadError) throw squadError;

      // Register all squad members to CandidateRegistrationTable for this program
      const candidateInserts = filledMembers.map((memberId) => ({
        Program_Code: programCode,
        Candidate_Code: memberId,
        squad_uuid: squadData?.squad_id || null,
      }));

      await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert(candidateInserts);

      // Increment program registration counter
      const { data: prog } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Total_Registration")
        .eq("Program_Code", programCode)
        .maybeSingle();

      if (prog) {
        await SupaBaseFunction
          .from("ProgrammesBox")
          .update({ Total_Registration: (prog.Total_Registration || 0) + filledMembers.length })
          .eq("Program_Code", programCode);
      }

      setStatus({
        type: "success",
        text: `🎉 Squad "${trimmedTitle}" registered with ${filledMembers.length} members!`,
      });

      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "Failed to create squad." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterExistingSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setStatus({
        type: "error",
        text: "Assigning a squad to an event is not possible for unauthenticated persons. Please log in first.",
      });
      return;
    }

    if (!selectedSquadId) {
      setStatus({ type: "error", text: "Please select a squad from the list." });
      return;
    }

    const targetSquad = existingSquads.find((s) => s.squad_id === selectedSquadId);
    if (!targetSquad) return;

    if (targetSquad.squad_id && registeredSquadIds.has(targetSquad.squad_id)) {
      setStatus({
        type: "error",
        text: `⚠️ Squad "${targetSquad.squad_title}" is already registered for this programme.`,
      });
      return;
    }

    if (programMeta?.is_limitation) {
      const maxGroups = programMeta.group_limit_count ?? 7;
      if (registeredSquadIds.size >= maxGroups) {
        setStatus({
          type: "error",
          text: `⚠️ Group Registration Limit Reached: Maximum of ${maxGroups} squads allowed for this tournament.`,
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const squadMembers = [
        targetSquad.member1_uuid,
        targetSquad.member2_uuid,
        targetSquad.member3_uuid,
        targetSquad.member4_uuid,
        targetSquad.member5_uuid,
        targetSquad.member6_uuid,
        targetSquad.member7_uuid,
      ].filter(Boolean) as string[];

      const candidateInserts = squadMembers.map((m) => ({
        Program_Code: programCode,
        Candidate_Code: m,
        squad_uuid: targetSquad.squad_id || null,
      }));

      await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert(candidateInserts);

      // Update squad participation count
      await SupaBaseFunction
        .from("SquadMate")
        .update({ total_particiations: (targetSquad.total_particiations || 0) + 1 })
        .eq("squad_id", targetSquad.squad_id);

      // Update program count
      const { data: prog } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Total_Registration")
        .eq("Program_Code", programCode)
        .maybeSingle();

      if (prog) {
        await SupaBaseFunction
          .from("ProgrammesBox")
          .update({ Total_Registration: (prog.Total_Registration || 0) + squadMembers.length })
          .eq("Program_Code", programCode);
      }

      setStatus({
        type: "success",
        text: `🎉 Squad "${targetSquad.squad_title}" has been registered for this event!`,
      });

      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "Failed to register squad." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Shield className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-slate-900">Group / Squad Registration</h3>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-xs text-slate-500 font-medium">{programTitle} ({programCode})</p>
          {programMeta?.is_limitation && (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
              registeredSquadIds.size >= (programMeta.group_limit_count || 7)
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}>
              <Users size={12} />
              <span>Squad Limit: {registeredSquadIds.size} / {programMeta.group_limit_count || 7} registered</span>
            </span>
          )}
        </div>

        {/* Assigned Topic for Competition */}
        {programMeta?.is_topic && programMeta?.topic_title && (
          <div className="p-3 mb-3.5 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold">
              <BookOpen size={14} className="text-teal-600 shrink-0" />
              <span>Official Tournament Topic:</span>
            </div>
            <p className="text-teal-950 font-black pl-5 text-xs sm:text-sm">
              "{programMeta.topic_title}"
            </p>
          </div>
        )}

        {/* Study Material / Drive Link */}
        {programMeta?.drive_link && (
          <div className="p-2.5 mb-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-blue-900 font-medium">
              <FileText size={14} className="text-blue-600 shrink-0" />
              <span>Study materials provided for this tournament.</span>
            </div>
            <a
              href={programMeta.drive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 transition"
            >
              <ExternalLink size={10} />
              <span>Drive Material</span>
            </a>
          </div>
        )}

        {status.text && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {status.text}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <Lock size={26} />
            </div>
            <h4 className="text-base font-extrabold text-slate-900 mb-1.5">
              Authentication Required to Assign Squad
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mb-5 leading-relaxed">
              Assigning a squad or creating a group for an institutional event is not possible for unauthenticated persons. You must be logged in to assign or register a squad.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn size={14} /> Log In to Assign Squad
              </Link>
            </div>
          </div>
        ) : (
          <>
            {isUserRegistered && (
              <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>You or your squad are already registered for this programme. Multiple registrations are disabled.</span>
              </div>
            )}

            <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => setTab("select")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  tab === "select" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
                }`}
              >
                Select Existing Squad
              </button>
              <button
                type="button"
                onClick={() => setTab("create")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  tab === "create" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
                }`}
              >
                Create New Squad
              </button>
            </div>

            {tab === "select" ? (
              <form onSubmit={handleRegisterExistingSquad} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {currentUser ? "Your Squads" : "Available Squads"} ({existingSquads.length})
                    </label>
                    {existingSquads.length > 0 && registeredSquadIds.size > 0 && (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Squad already registered
                      </span>
                    )}
                  </div>
                  {loadingSquads ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading squads...</p>
                  ) : existingSquads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                      <p className="text-xs text-slate-500 mb-2">
                        {currentUser
                          ? `You (${currentUser.AddNo}) haven't created or joined any squads yet.`
                          : "No active squads found."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setTab("create")}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Build your Squad now →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {existingSquads.map((sq) => {
                        const memberCount = [
                          sq.member1_uuid, sq.member2_uuid, sq.member3_uuid,
                          sq.member4_uuid, sq.member5_uuid, sq.member6_uuid, sq.member7_uuid
                        ].filter(Boolean).length;
                        const isAlreadyRegistered = Boolean(sq.squad_id && registeredSquadIds.has(sq.squad_id));

                        return (
                          <label
                            key={sq.squad_id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition ${
                              isAlreadyRegistered
                                ? "border-emerald-200 bg-emerald-50/40 opacity-80 cursor-not-allowed"
                                : selectedSquadId === sq.squad_id
                                ? "border-indigo-600 bg-indigo-50/50 cursor-pointer"
                                : "border-slate-200 hover:border-slate-300 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="squadSelection"
                                value={sq.squad_id}
                                disabled={isAlreadyRegistered}
                                checked={selectedSquadId === sq.squad_id}
                                onChange={(e) => setSelectedSquadId(e.target.value)}
                                className="text-indigo-600"
                              />
                              <div>
                                <span className="text-sm font-bold text-slate-900 block">{sq.squad_title}</span>
                                <span className="text-[11px] text-slate-500">{memberCount} squad members</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAlreadyRegistered ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle size={11} /> Registered
                                </span>
                              ) : (
                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  {sq.total_points || 0} pts
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isUserRegistered ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs">
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span>Already Registered for this Event</span>
                  </div>
                ) : existingSquads.length > 0 ? (
                  <button
                    type="submit"
                    disabled={submitting || !selectedSquadId || registeredSquadIds.has(selectedSquadId)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? "Registering Squad..."
                      : selectedSquadId && registeredSquadIds.has(selectedSquadId)
                      ? "Selected Squad Already Registered"
                      : "Register Selected Squad to Event"}
                  </button>
                ) : null}
              </form>
            ) : (
              <form onSubmit={handleCreateSquad} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Squad Name / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Fursan Falcon Squad"
                    value={squadTitle}
                    onChange={(e) => setSquadTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">Squad Members (Student Admission No) *</label>
                    {members.length < 7 && (
                      <button
                        type="button"
                        onClick={addMemberField}
                        className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        <Plus size={14} /> Add Member (Max 7)
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {members.map((memberId, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-16">Member {idx + 1}:</span>
                        <input
                          type="text"
                          required={idx < 2}
                          placeholder={idx === 0 ? "Squad Leader AddNo (e.g. STN101)" : `Member ${idx + 1} AddNo`}
                          value={memberId}
                          onChange={(e) => handleMemberChange(idx, e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-hidden font-mono"
                        />
                        {idx >= 2 && (
                          <button
                            type="button"
                            onClick={() => removeMemberField(idx)}
                            className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {isUserRegistered ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs">
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span>Already Registered for this Event</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Forming Squad..." : "Create Squad & Register to Event"}
                  </button>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
