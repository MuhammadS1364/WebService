import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import { Trophy, Award, Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface RegisteredCandidate {
  addNo: string;
  name: string;
}

interface HolderState {
  addNo: string;
  name: string;
}

interface Holders {
  first: HolderState;
  second: HolderState;
  third: HolderState;
  aGrade: HolderState;
  bGrade: HolderState;
}

interface Programme {
  Program_Code: string;
  Program_Title?: string;
  Date?: string;
  Venue?: string;
  WingCode?: string;
  is_group_program?: boolean;
}

const INITIAL_HOLDERS: Holders = {
  first: { addNo: "", name: "" },
  second: { addNo: "", name: "" },
  third: { addNo: "", name: "" },
  aGrade: { addNo: "", name: "" },
  bGrade: { addNo: "", name: "" },
};

const POSITION_CONFIG: { key: keyof Holders; label: string; icon: string; points: number; badgeColor: string }[] = [
  { key: "first", label: "1st Place Winner", icon: "🥇", points: 7, badgeColor: "bg-amber-100 text-amber-900 border-amber-300" },
  { key: "second", label: "2nd Place Runner-Up", icon: "🥈", points: 5, badgeColor: "bg-slate-200 text-slate-800 border-slate-300" },
  { key: "third", label: "3rd Place", icon: "🥉", points: 3, badgeColor: "bg-amber-700/10 text-amber-800 border-amber-700/20" },
  { key: "aGrade", label: "A-Grade Special Recognition", icon: "⭐", points: 2, badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { key: "bGrade", label: "B-Grade Recognition", icon: "✨", points: 1, badgeColor: "bg-blue-100 text-blue-900 border-blue-300" },
];

export default function CreateResult() {
  const { actWing } = useParams<{ actWing: string }>();

  // State
  const [wingCode, setWingCode] = useState<string>("");
  const [wingTitle, setWingTitle] = useState<string>("");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  // Registered candidates for the selected program
  const [registeredCandidates, setRegisteredCandidates] = useState<RegisteredCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);

  // Holders state
  const [holders, setHolders] = useState<Holders>(INITIAL_HOLDERS);
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // 1. Fetch Wing Code
  useEffect(() => {
    async function fetchWingData() {
      if (!actWing) return;
      try {
        const { data: wData, error } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, WingEmail, WingTitle")
          .eq("WingEmail", actWing)
          .maybeSingle();

        if (!error && wData) {
          setWingCode(wData.WingCode);
          setWingTitle(wData.WingTitle || wData.WingCode);
        }
      } catch (err) {
        console.error("Error fetching wing data:", err);
      }
    }
    fetchWingData();
  }, [actWing]);

  // 2. Fetch unresulted programmes for this wing (or all unresulted if admin/general)
  useEffect(() => {
    async function fetchProgrammes() {
      try {
        let query = SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Date, Venue, WingCode, is_group_program")
          .eq("IsResulted", false)
          .order("Date", { ascending: false });

        if (wingCode) {
          query = query.eq("WingCode", wingCode);
        }

        const { data, error } = await query;
        if (!error && data) {
          setProgrammes(data as Programme[]);
        }
      } catch (err) {
        console.error("Error fetching programmes:", err);
      }
    }
    fetchProgrammes();
  }, [wingCode]);

  // 3. When programme is selected, load ONLY registered candidates for this specific programme
  useEffect(() => {
    async function fetchCandidatesForProgram() {
      if (!selectedProgram) {
        setRegisteredCandidates([]);
        setHolders(INITIAL_HOLDERS);
        return;
      }

      setLoadingCandidates(true);
      setStatusMsg({ type: "", text: "" });
      try {
        // Query CandidateRegistrationTable
        const { data: regRows, error: regError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code")
          .eq("Program_Code", selectedProgram);

        if (regError) throw regError;

        const candidateCodes = Array.from(
          new Set(
            (regRows || [])
              .map((r) => r.Candidate_Code)
              .filter((code): code is string => Boolean(code && code.trim()))
          )
        );

        if (candidateCodes.length === 0) {
          setRegisteredCandidates([]);
          return;
        }

        // Fetch student details from StudentsBox
        const { data: studentRows, error: stnError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .in("AddNo", candidateCodes);

        if (stnError) throw stnError;

        const mapped: RegisteredCandidate[] = (studentRows || []).map((s) => ({
          addNo: s.AddNo,
          name: s.StudentName || "Unnamed Student",
        }));

        // In case some registered candidate codes aren't in StudentsBox, keep them visible
        const foundAddNos = new Set(mapped.map((m) => m.addNo));
        candidateCodes.forEach((code) => {
          if (!foundAddNos.has(code)) {
            mapped.push({ addNo: code, name: `Candidate (${code})` });
          }
        });

        // Sort by Student Name
        mapped.sort((a, b) => a.name.localeCompare(b.name));
        setRegisteredCandidates(mapped);
      } catch (err: any) {
        console.error("Error loading candidates:", err);
        setStatusMsg({ type: "error", text: "Could not load candidate registrations: " + err.message });
      } finally {
        setLoadingCandidates(false);
      }
    }

    fetchCandidatesForProgram();
  }, [selectedProgram]);

  // Track which candidates are currently chosen across all positions to forbid duplicate selection
  const assignedPositions = useMemo(() => {
    const map: Record<string, keyof Holders> = {};
    (Object.keys(holders) as (keyof Holders)[]).forEach((pos) => {
      const addNo = holders[pos].addNo;
      if (addNo) {
        map[addNo] = pos;
      }
    });
    return map;
  }, [holders]);

  // Position change handler with strict uniqueness enforcement
  const handlePositionSelect = (posKey: keyof Holders, selectedAddNo: string) => {
    setStatusMsg({ type: "", text: "" });

    if (!selectedAddNo) {
      // Clear position
      setHolders((prev) => ({
        ...prev,
        [posKey]: { addNo: "", name: "" },
      }));
      return;
    }

    // Check if candidate is already assigned to a DIFFERENT position in this result
    const currentOwner = assignedPositions[selectedAddNo];
    if (currentOwner && currentOwner !== posKey) {
      const ownerLabel = POSITION_CONFIG.find((p) => p.key === currentOwner)?.label || currentOwner;
      setStatusMsg({
        type: "error",
        text: `⚠️ Conflict: Candidate ${selectedAddNo} is already assigned to "${ownerLabel}". A candidate cannot hold multiple positions in the same result!`,
      });
      return;
    }

    const candidate = registeredCandidates.find((c) => c.addNo === selectedAddNo);
    const candidateName = candidate ? candidate.name : selectedAddNo;

    setHolders((prev) => ({
      ...prev,
      [posKey]: { addNo: selectedAddNo, name: candidateName },
    }));
  };

  // Submit and update database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) {
      setStatusMsg({ type: "error", text: "Please select a programme first." });
      return;
    }

    // Double-check no duplicate candidates are selected across any awarded positions
    const assigned = POSITION_CONFIG
      .map((p) => ({ pos: p.label, key: p.key, addNo: holders[p.key].addNo }))
      .filter((h) => Boolean(h.addNo));

    if (assigned.length === 0) {
      setStatusMsg({ type: "error", text: "Please assign at least one holder or recognized position." });
      return;
    }

    const uniqueAddNos = new Set(assigned.map((a) => a.addNo));
    if (uniqueAddNos.size !== assigned.length) {
      setStatusMsg({
        type: "error",
        text: "Submission blocked: Duplicate candidate detected across positions. Each candidate can hold at most ONE position in a single result.",
      });
      return;
    }

    try {
      setLoadingSubmit(true);
      setStatusMsg({ type: "", text: "" });

      // 1. Insert into ResultBox
      const resultPayload = {
        Program_Id: selectedProgram,
        First_Holder: holders.first.addNo || null,
        Second_Holder: holders.second.addNo || null,
        Third_Holder: holders.third.addNo || null,
        AGrade: holders.aGrade.addNo || null,
        BGrade: holders.bGrade.addNo || null,
        creaded_At: new Date().toTimeString().split(" ")[0], // time without timezone
      };

      const { error: insertError } = await SupaBaseFunction
        .from("ResultBox")
        .insert([resultPayload]);

      if (insertError) throw insertError;

      // 2. Increment score and resulted counts in StudentsBox
      for (const config of POSITION_CONFIG) {
        const addNo = holders[config.key].addNo;
        const pts = config.points;

        if (addNo) {
          const { data: stn } = await SupaBaseFunction
            .from("StudentsBox")
            .select("Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
            .eq("AddNo", addNo)
            .maybeSingle();

          if (stn) {
            await SupaBaseFunction
              .from("StudentsBox")
              .update({
                Resluted_Count: (stn.Resluted_Count || 0) + 1,
                Total_Point_Anjuman: (stn.Total_Point_Anjuman || 0) + pts,
                Grand_Total_Points: (stn.Grand_Total_Points || 0) + pts,
              })
              .eq("AddNo", addNo);
          }
        }
      }

      // 3. Mark program as Resulted and Result Published
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({
          IsResulted: true,
          IsResultPublished: true,
        })
        .eq("Program_Code", selectedProgram);

      // 4. Update Accademic_Info total_resulted metrics
      try {
        const { data: progInfo } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("AccademicYear")
          .eq("Program_Code", selectedProgram)
          .maybeSingle();

        if (progInfo?.AccademicYear) {
          const { data: acad } = await SupaBaseFunction
            .from("Accademic_Info")
            .select("total_resulted")
            .eq("accademic_id", progInfo.AccademicYear)
            .maybeSingle();
          if (acad) {
            await SupaBaseFunction
              .from("Accademic_Info")
              .update({ total_resulted: (acad.total_resulted || 0) + 1 })
              .eq("accademic_id", progInfo.AccademicYear);
          }
        }
      } catch (acadErr) {
        console.warn("Could not update Accademic_Info metrics:", acadErr);
      }

      // Success
      setStatusMsg({
        type: "success",
        text: `🎉 Official result published successfully for program ${selectedProgram}! Candidate scores and standings have been credited.`,
      });

      // Clear form
      setProgrammes((prev) => prev.filter((p) => p.Program_Code !== selectedProgram));
      setSelectedProgram("");
      setHolders(INITIAL_HOLDERS);
      setRegisteredCandidates([]);
    } catch (err: any) {
      console.error("Failed to publish result:", err);
      setStatusMsg({ type: "error", text: "Failed to publish result: " + (err.message || "Database error") });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const selectedProgDetails = programmes.find((p) => p.Program_Code === selectedProgram);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Trophy className="w-6 h-6 text-amber-300" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              {wingTitle ? `${wingTitle} Wing` : "Results Office"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Generate Programme Result</h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">
            Select an unresulted programme, pick winners strictly from registered candidates, and award Anjuman points.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {statusMsg.text && (
        <div
          className={`p-4 rounded-2xl mb-6 flex items-start gap-3 border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-semibold">{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Programme */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <label className="block text-sm font-bold text-slate-900 mb-2">
            1. Select Programme for Result Declaration
          </label>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">-- Choose an Unresulted Programme ({programmes.length} Available) --</option>
            {programmes.map((p) => (
              <option key={p.Program_Code} value={p.Program_Code}>
                [{p.Program_Code}] {p.Program_Title || "Untitled"} {p.is_group_program ? "(Group Event)" : "(Individual)"} - {p.Date || "TBA"}
              </option>
            ))}
          </select>

          {selectedProgDetails && (
            <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-indigo-950 text-sm block">{selectedProgDetails.Program_Title}</span>
                <span className="text-indigo-600 font-mono font-semibold">{selectedProgDetails.Program_Code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-white text-indigo-800 font-bold rounded-lg shadow-xs border border-indigo-200">
                  {selectedProgDetails.is_group_program ? "👥 Group Event" : "👤 Individual Event"}
                </span>
                <span className="px-2.5 py-1 bg-white text-slate-700 font-medium rounded-lg border border-slate-200">
                  Venue: {selectedProgDetails.Venue || "TBA"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Registered Candidates Display Box */}
        {selectedProgram && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  2. Registered Candidates ({registeredCandidates.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Only these verified candidates can be awarded positions
              </span>
            </div>

            {loadingCandidates ? (
              <div className="py-8 text-center text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                Loading registered candidates...
              </div>
            ) : registeredCandidates.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-900">No candidates registered for this programme yet.</p>
                <p className="text-xs text-amber-700 mt-1">
                  Students or squads must register before official results can be published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                {registeredCandidates.map((c) => {
                  const assignedPosKey = assignedPositions[c.addNo];
                  const posConfig = assignedPosKey ? POSITION_CONFIG.find((p) => p.key === assignedPosKey) : null;

                  return (
                    <div
                      key={c.addNo}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        posConfig
                          ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400 font-semibold"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono font-bold text-indigo-700 block text-[11px]">{c.addNo}</span>
                        <span className="text-slate-900 font-semibold truncate block">{c.name}</span>
                      </div>
                      {posConfig ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white shrink-0 shadow-xs">
                          {posConfig.icon} {posConfig.label.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">Eligible</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Candidate Selection Dropdowns (Restricted & Unique) */}
        {selectedProgram && registeredCandidates.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                3. Assign Standings & Recognition
              </h2>
              <p className="text-xs text-slate-500">
                Rule: A candidate cannot hold more than one position in the same result. Candidates already chosen in another position are locked.
              </p>
            </div>

            <div className="space-y-4">
              {POSITION_CONFIG.map(({ key, label, icon, points, badgeColor }) => {
                const currentSelection = holders[key].addNo;

                return (
                  <div
                    key={key}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3 md:w-1/3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">{label}</span>
                        <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md border mt-0.5 ${badgeColor}`}>
                          +{points} Pts to Student
                        </span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <select
                        value={currentSelection}
                        onChange={(e) => handlePositionSelect(key, e.target.value)}
                        className={`w-full p-2.5 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                          currentSelection
                            ? "bg-white border-indigo-400 text-indigo-950 ring-2 ring-indigo-100"
                            : "bg-white border-slate-300 text-slate-700"
                        }`}
                      >
                        <option value="">-- No Candidate Awarded / None --</option>
                        {registeredCandidates.map((c) => {
                          const isAssignedElsewhere = assignedPositions[c.addNo] && assignedPositions[c.addNo] !== key;
                          const otherOwnerLabel = isAssignedElsewhere
                            ? POSITION_CONFIG.find((p) => p.key === assignedPositions[c.addNo])?.label
                            : null;

                          return (
                            <option
                              key={c.addNo}
                              value={c.addNo}
                              disabled={Boolean(isAssignedElsewhere)}
                            >
                              [{c.addNo}] {c.name}
                              {isAssignedElsewhere ? ` ⚠️ (Assigned to ${otherOwnerLabel})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {currentSelection && (
                      <div className="md:w-36 text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                          ✓ Assigned
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setHolders(INITIAL_HOLDERS)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Reset Positions
              </button>

              <button
                type="submit"
                disabled={loadingSubmit}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {loadingSubmit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Publishing Official Result...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" /> Publish Result & Credit Points
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
