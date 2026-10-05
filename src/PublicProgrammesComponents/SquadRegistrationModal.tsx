import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import type { SquadMateRecord } from "../lib/types";
import { Shield, CheckCircle, AlertCircle, X, Plus } from "lucide-react";

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
  const [selectedSquadId, setSelectedSquadId] = useState("");
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // Create Squad Form State
  const [squadTitle, setSquadTitle] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);

  useEffect(() => {
    if (isOpen) {
      loadSquads();
    }
  }, [isOpen]);

  const loadSquads = async () => {
    try {
      setLoadingSquads(true);
      const { data, error } = await SupaBaseFunction
        .from("SquadMate")
        .select("*")
        .eq("is_active", true)
        .order("total_points", { ascending: false });

      if (error) throw error;
      setExistingSquads(data || []);
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
    if (!selectedSquadId) {
      setStatus({ type: "error", text: "Please select a squad from the list." });
      return;
    }

    const targetSquad = existingSquads.find((s) => s.squad_id === selectedSquadId);
    if (!targetSquad) return;

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
        <p className="text-xs text-slate-500 mb-4">{programTitle} ({programCode})</p>

        {status.text && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {status.text}
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
              <label className="block text-xs font-bold text-slate-700 mb-2">Available Squads ({existingSquads.length})</label>
              {loadingSquads ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading squads...</p>
              ) : existingSquads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-xs text-slate-500 mb-2">No active squads found.</p>
                  <button
                    type="button"
                    onClick={() => setTab("create")}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Build the first Squad now →
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {existingSquads.map((sq) => {
                    const memberCount = [
                      sq.member1_uuid, sq.member2_uuid, sq.member3_uuid,
                      sq.member4_uuid, sq.member5_uuid, sq.member6_uuid, sq.member7_uuid
                    ].filter(Boolean).length;

                    return (
                      <label
                        key={sq.squad_id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                          selectedSquadId === sq.squad_id ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="squadSelection"
                            value={sq.squad_id}
                            checked={selectedSquadId === sq.squad_id}
                            onChange={(e) => setSelectedSquadId(e.target.value)}
                            className="text-indigo-600"
                          />
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">{sq.squad_title}</span>
                            <span className="text-[11px] text-slate-500">{memberCount} squad members</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {sq.total_points || 0} pts
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {existingSquads.length > 0 && (
              <button
                type="submit"
                disabled={submitting || !selectedSquadId}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Registering Squad..." : "Register Selected Squad to Event"}
              </button>
            )}
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Forming Squad..." : "Create Squad & Register to Event"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
