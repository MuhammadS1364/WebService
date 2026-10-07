import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import { useProgrammeMeta } from "../../src/lib/programmeMeta";
import type { PointsTemplateRecord } from "../../src/lib/types";
import {
  Trophy,
  Award,
  Users,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface RegisteredCandidate {
  addNo: string;
  name: string;
}

type GradeSelection = "none" | "A" | "B";

interface HolderEntry {
  addNo: string;
  name: string;
  grade: GradeSelection;
}

interface HoldersState {
  first: HolderEntry;
  second: HolderEntry;
  third: HolderEntry;
  aGrade: HolderEntry;
  bGrade: HolderEntry;
}

interface ProgrammeDetails {
  Program_Code: string;
  Program_Title?: string;
  Date?: string;
  Venue?: string;
  WingCode?: string;
  is_group_program?: boolean;
  points_template?: string | null;
  AccademicYear?: string | null;
}

const DEFAULT_POINTS_FALLBACK: PointsTemplateRecord = {
  p_template_id: "default",
  point_template_title: "Default Competition Template",
  first_only: 5,
  second_only: 3,
  third_only: 1,
  first_A_grade: 10,
  first_B_grade: 8,
  second_A_grade: 8,
  second_B_grade: 6,
  third_A_grade: 6,
  third_B_grade: 4,
  A_grade: 5,
  B_grade: 3,
};

const INITIAL_HOLDERS: HoldersState = {
  first: { addNo: "", name: "", grade: "none" },
  second: { addNo: "", name: "", grade: "none" },
  third: { addNo: "", name: "", grade: "none" },
  aGrade: { addNo: "", name: "", grade: "A" },
  bGrade: { addNo: "", name: "", grade: "B" },
};

export default function CreateResult() {
  const { actWing } = useParams<{ actWing: string }>();
  const meta = useProgrammeMeta();

  // State
  const [wingCode, setWingCode] = useState<string>("");
  const [wingTitle, setWingTitle] = useState<string>("");
  const [programmes, setProgrammes] = useState<ProgrammeDetails[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  // Points Template State
  const [allTemplates, setAllTemplates] = useState<PointsTemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<PointsTemplateRecord>(DEFAULT_POINTS_FALLBACK);

  // Registered candidates
  const [registeredCandidates, setRegisteredCandidates] = useState<RegisteredCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);

  // Holders
  const [holders, setHolders] = useState<HoldersState>(INITIAL_HOLDERS);
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "";
    text: string;
    details?: string[];
  }>({ type: "", text: "" });

  // 1. Fetch Wing details if actWing param exists
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

  // 2. Fetch all Points Templates for selection/customization
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data, error } = await SupaBaseFunction
          .from("Points_Templates")
          .select("*")
          .order("point_template_title", { ascending: true });

        if (!error && data && data.length > 0) {
          setAllTemplates(data as PointsTemplateRecord[]);
        }
      } catch (err) {
        console.error("Error loading points templates:", err);
      }
    }
    fetchTemplates();
  }, []);

  // 3. Fetch unresulted programmes
  useEffect(() => {
    async function fetchProgrammes() {
      try {
        let query = SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Date, Venue, WingCode, is_group_program, points_template, AccademicYear")
          .eq("IsResulted", false)
          .order("Date", { ascending: false });

        if (wingCode) {
          query = query.eq("WingCode", wingCode);
        }

        const { data, error } = await query;
        if (!error && data) {
          setProgrammes(data as ProgrammeDetails[]);
        }
      } catch (err) {
        console.error("Error fetching programmes:", err);
      }
    }
    fetchProgrammes();
  }, [wingCode]);

  // 4. When a programme is chosen: load template and load registered candidates
  useEffect(() => {
    async function onProgramChange() {
      if (!selectedProgram) {
        setRegisteredCandidates([]);
        setHolders(INITIAL_HOLDERS);
        return;
      }

      const prog = programmes.find((p) => p.Program_Code === selectedProgram);
      if (prog?.points_template) {
        setSelectedTemplateId(prog.points_template);
        const match = allTemplates.find((t) => t.p_template_id === prog.points_template);
        if (match) {
          setActiveTemplate(match);
        }
      } else if (allTemplates.length > 0) {
        setSelectedTemplateId(allTemplates[0].p_template_id);
        setActiveTemplate(allTemplates[0]);
      } else {
        setActiveTemplate(DEFAULT_POINTS_FALLBACK);
      }

      setLoadingCandidates(true);
      setStatusMsg({ type: "", text: "" });

      try {
        // Query candidate registrations
        const { data: regRows, error: regError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code")
          .eq("Program_Code", selectedProgram);

        if (regError) throw regError;

        const candidateCodes = Array.from(
          new Set(
            (regRows || [])
              .map((r) => r.Candidate_Code)
              .filter((c): c is string => Boolean(c && c.trim()))
          )
        );

        if (candidateCodes.length === 0) {
          setRegisteredCandidates([]);
          return;
        }

        // Query StudentsBox
        const { data: studentRows, error: stnError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .in("AddNo", candidateCodes);

        if (stnError) throw stnError;

        const mapped: RegisteredCandidate[] = (studentRows || []).map((s) => ({
          addNo: s.AddNo,
          name: s.StudentName || "Unnamed Student",
        }));

        const foundAddNos = new Set(mapped.map((m) => m.addNo));
        candidateCodes.forEach((code) => {
          if (!foundAddNos.has(code)) {
            mapped.push({ addNo: code, name: `Candidate (${code})` });
          }
        });

        mapped.sort((a, b) => a.name.localeCompare(b.name));
        setRegisteredCandidates(mapped);
      } catch (err: any) {
        console.error("Error loading candidates:", err);
        setStatusMsg({ type: "error", text: "Could not load candidate registrations: " + err.message });
      } finally {
        setLoadingCandidates(false);
      }
    }

    onProgramChange();
  }, [selectedProgram, programmes, allTemplates]);

  // When selectedTemplateId changes, update activeTemplate
  useEffect(() => {
    if (!selectedTemplateId) return;
    const match = allTemplates.find((t) => t.p_template_id === selectedTemplateId);
    if (match) {
      setActiveTemplate(match);
    }
  }, [selectedTemplateId, allTemplates]);

  // Calculate points for each position dynamically
  const calculatePoints = (pos: keyof HoldersState, grade: GradeSelection): number => {
    const t = activeTemplate;
    if (pos === "first") {
      if (grade === "A") return t.first_A_grade ?? 10;
      if (grade === "B") return t.first_B_grade ?? 8;
      return t.first_only ?? 5;
    }
    if (pos === "second") {
      if (grade === "A") return t.second_A_grade ?? 8;
      if (grade === "B") return t.second_B_grade ?? 6;
      return t.second_only ?? 3;
    }
    if (pos === "third") {
      if (grade === "A") return t.third_A_grade ?? 6;
      if (grade === "B") return t.third_B_grade ?? 4;
      return t.third_only ?? 1;
    }
    if (pos === "aGrade") {
      return t.A_grade ?? 5;
    }
    if (pos === "bGrade") {
      return t.B_grade ?? 3;
    }
    return 0;
  };

  // Track assigned positions to avoid duplicate candidate assignments
  const assignedPositions = useMemo(() => {
    const map: Record<string, keyof HoldersState> = {};
    (Object.keys(holders) as (keyof HoldersState)[]).forEach((pos) => {
      const addNo = holders[pos].addNo;
      if (addNo) {
        map[addNo] = pos;
      }
    });
    return map;
  }, [holders]);

  // Position candidate select handler
  const handleCandidateSelect = (posKey: keyof HoldersState, selectedAddNo: string) => {
    setStatusMsg({ type: "", text: "" });

    if (!selectedAddNo) {
      setHolders((prev) => ({
        ...prev,
        [posKey]: { ...prev[posKey], addNo: "", name: "" },
      }));
      return;
    }

    const currentOwner = assignedPositions[selectedAddNo];
    if (currentOwner && currentOwner !== posKey) {
      setStatusMsg({
        type: "error",
        text: `⚠️ Conflict: Candidate ${selectedAddNo} is already assigned to another position in this result!`,
      });
      return;
    }

    const candidate = registeredCandidates.find((c) => c.addNo === selectedAddNo);
    const candidateName = candidate ? candidate.name : selectedAddNo;

    setHolders((prev) => ({
      ...prev,
      [posKey]: { ...prev[posKey], addNo: selectedAddNo, name: candidateName },
    }));
  };

  // Grade selection handler
  const handleGradeSelect = (posKey: keyof HoldersState, grade: GradeSelection) => {
    setHolders((prev) => ({
      ...prev,
      [posKey]: { ...prev[posKey], grade },
    }));
  };

  // Computed point allocations summary
  const allocationsSummary = useMemo(() => {
    const list: {
      positionKey: keyof HoldersState;
      label: string;
      addNo: string;
      name: string;
      gradeLabel: string;
      points: number;
    }[] = [];

    const configs: { key: keyof HoldersState; label: string }[] = [
      { key: "first", label: "1st Place Winner" },
      { key: "second", label: "2nd Place Runner-Up" },
      { key: "third", label: "3rd Place" },
      { key: "aGrade", label: "A-Grade Recognition" },
      { key: "bGrade", label: "B-Grade Recognition" },
    ];

    configs.forEach(({ key, label }) => {
      const h = holders[key];
      if (h.addNo) {
        const pts = calculatePoints(key, h.grade);
        const gradeText =
          key === "aGrade"
            ? "A Grade"
            : key === "bGrade"
            ? "B Grade"
            : h.grade === "A"
            ? "A Grade"
            : h.grade === "B"
            ? "B Grade"
            : "Position Only (No Grade)";

        list.push({
          positionKey: key,
          label,
          addNo: h.addNo,
          name: h.name,
          gradeLabel: gradeText,
          points: pts,
        });
      }
    });

    return list;
  }, [holders, activeTemplate]);

  const totalPointsAwarded = allocationsSummary.reduce((sum, a) => sum + a.points, 0);

  // Submit official result and assign points to students and wing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) {
      setStatusMsg({ type: "error", text: "Please select a programme first." });
      return;
    }

    if (allocationsSummary.length === 0) {
      setStatusMsg({ type: "error", text: "Please assign at least one candidate position before publishing." });
      return;
    }

    // Verify uniqueness
    const uniqueAddNos = new Set(allocationsSummary.map((a) => a.addNo));
    if (uniqueAddNos.size !== allocationsSummary.length) {
      setStatusMsg({
        type: "error",
        text: "Duplicate candidate detected across positions. Each candidate can hold at most ONE position.",
      });
      return;
    }

    try {
      setLoadingSubmit(true);
      setStatusMsg({ type: "", text: "" });

      const selectedProgDetails = programmes.find((p) => p.Program_Code === selectedProgram);
      const progWingCode = selectedProgDetails?.WingCode || wingCode;

      // 1. Insert into ResultBox
      const resultPayload = {
        Program_Id: selectedProgram,
        First_Holder: holders.first.addNo || null,
        Second_Holder: holders.second.addNo || null,
        Third_Holder: holders.third.addNo || null,
        AGrade: holders.aGrade.addNo || null,
        BGrade: holders.bGrade.addNo || null,
        creaded_At: new Date().toTimeString().split(" ")[0],
      };

      const { error: insertError } = await SupaBaseFunction.from("ResultBox").insert([resultPayload]);
      if (insertError) throw insertError;

      // 2. MUST ASSIGN POINTS TO EACH STUDENT in StudentsBox
      const studentFeedbackLines: string[] = [];
      for (const allocation of allocationsSummary) {
        const { data: stn, error: stnFetchError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
          .eq("AddNo", allocation.addNo)
          .maybeSingle();

        if (stnFetchError) {
          console.warn("Could not fetch student:", allocation.addNo, stnFetchError);
        }

        const currentResulted = Number(stn?.Resluted_Count || 0);
        const currentAnjumanPts = Number(stn?.Total_Point_Anjuman || 0);
        const currentGrandPts = Number(stn?.Grand_Total_Points || 0);

        const newAnjumanPts = currentAnjumanPts + allocation.points;
        const newGrandPts = currentGrandPts + allocation.points;

        const { error: updateStnErr } = await SupaBaseFunction
          .from("StudentsBox")
          .update({
            Resluted_Count: currentResulted + 1,
            Total_Point_Anjuman: newAnjumanPts,
            Grand_Total_Points: newGrandPts,
          })
          .eq("AddNo", allocation.addNo);

        if (updateStnErr) {
          console.error("Error updating student points:", allocation.addNo, updateStnErr);
        } else {
          studentFeedbackLines.push(
            `• ${allocation.name} (${allocation.addNo}): +${allocation.points} PTS [${allocation.label} - ${allocation.gradeLabel}]`
          );
        }
      }

      // 3. MUST ASSIGN POINTS TO WING in Chs-WingS
      if (progWingCode) {
        try {
          const { data: wingRow } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("WingCode, Total_Points, Total_Resulted")
            .eq("WingCode", progWingCode)
            .maybeSingle();

          if (wingRow) {
            await SupaBaseFunction
              .from("Chs-WingS")
              .update({
                Total_Points: (wingRow.Total_Points || 0) + totalPointsAwarded,
                Total_Resulted: (wingRow.Total_Resulted || 0) + 1,
              })
              .eq("WingCode", progWingCode);
          }
        } catch (wingErr) {
          console.warn("Could not credit wing points:", wingErr);
        }
      }

      // 4. Mark ProgrammeBox as Resulted
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({
          IsResulted: true,
          IsResultPublished: true,
          points_template: activeTemplate.p_template_id !== "default" ? activeTemplate.p_template_id : null,
        })
        .eq("Program_Code", selectedProgram);

      // 5. Update Accademic_Info total_resulted metrics
      if (selectedProgDetails?.AccademicYear) {
        try {
          const { data: acad } = await SupaBaseFunction
            .from("Accademic_Info")
            .select("total_resulted")
            .eq("accademic_id", selectedProgDetails.AccademicYear)
            .maybeSingle();

          if (acad) {
            await SupaBaseFunction
              .from("Accademic_Info")
              .update({ total_resulted: (acad.total_resulted || 0) + 1 })
              .eq("accademic_id", selectedProgDetails.AccademicYear);
          }
        } catch (acadErr) {
          console.warn("Could not update Accademic_Info:", acadErr);
        }
      }

      // 6. Success notification
      setStatusMsg({
        type: "success",
        text: `Official result published successfully for program ${selectedProgram}! Points assigned to students and credited to wing standings.`,
        details: [
          `Points Template Applied: "${activeTemplate.point_template_title}"`,
          `Total Points Disbursed: ${totalPointsAwarded} PTS`,
          ...studentFeedbackLines,
        ],
      });

      // Clear selection
      setProgrammes((prev) => prev.filter((p) => p.Program_Code !== selectedProgram));
      setSelectedProgram("");
      setHolders(INITIAL_HOLDERS);
      setRegisteredCandidates([]);
    } catch (err: any) {
      console.error("Failed to publish result:", err);
      setStatusMsg({
        type: "error",
        text: "Failed to publish result: " + (err.message || "Database error occurred"),
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const selectedProgDetails = programmes.find((p) => p.Program_Code === selectedProgram);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Trophy className="w-6 h-6 text-amber-300" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              {wingTitle ? `${wingTitle} Wing` : "Results Office & Points Engine"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Generate Programme Result
          </h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">
            Declare official winners from registered candidates and automatically assign competition points based on the active Points Template.
          </p>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {statusMsg.text && (
        <div
          className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-sm font-bold block">{statusMsg.text}</span>
              {statusMsg.details && statusMsg.details.length > 0 && (
                <div className="mt-2 space-y-1 text-xs font-medium text-emerald-800 bg-white/80 p-3 rounded-xl border border-emerald-200">
                  {statusMsg.details.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: SELECT PROGRAMME */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-slate-900">
              1. Select Programme for Result Declaration
            </label>
            <span className="text-xs font-bold text-slate-500">
              {programmes.length} Unresulted Events
            </span>
          </div>

          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">-- Choose an Unresulted Programme --</option>
            {programmes.map((p) => (
              <option key={p.Program_Code} value={p.Program_Code}>
                [{p.Program_Code}] {p.Program_Title || "Untitled"} {p.is_group_program ? "(Group Event)" : "(Individual)"} - {p.Date || "TBA"}
              </option>
            ))}
          </select>

          {selectedProgDetails && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-indigo-950 text-sm block">
                  {selectedProgDetails.Program_Title}
                </span>
                <span className="text-indigo-600 font-mono font-semibold">
                  {selectedProgDetails.Program_Code}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-white text-indigo-800 font-bold rounded-lg shadow-2xs border border-indigo-200">
                  {selectedProgDetails.is_group_program ? "👥 Group Event" : "👤 Individual Event"}
                </span>
                <span className="px-2.5 py-1 bg-white text-slate-700 font-medium rounded-lg border border-slate-200">
                  Venue: {meta.venueMap[selectedProgDetails.Venue || ""] || selectedProgDetails.Venue || "Campus Venue"}
                </span>
                <span className="px-2.5 py-1 bg-white text-amber-700 font-bold rounded-lg border border-amber-200">
                  Wing: {meta.wingMap[selectedProgDetails.WingCode || ""] || selectedProgDetails.WingCode || "General"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: POINTS TEMPLATE CONFIGURATION */}
        {selectedProgram && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-black text-slate-900">
                  2. Points Template & Point Rules
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Governs points credited to students upon result submission
              </span>
            </div>

            {/* Enhanced Template Selector & Breakdown */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Active Points Template Scheme:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Defines points awarded to students and calculated for wing standings based on positions and grades.
                  </p>
                </div>
                <div className="sm:w-72 shrink-0">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer transition"
                  >
                    {allTemplates.map((t) => (
                      <option key={t.p_template_id} value={t.p_template_id}>
                        {t.point_template_title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visual Template Breakdown Matrix */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    <span>Template Scoring Breakdown — {activeTemplate.point_template_title}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Auto-Applied on Publish
                  </span>
                </div>

                {/* 3 Positions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1st Place Card */}
                  <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                          🥇
                        </div>
                        <span className="text-xs font-black text-amber-950">1st Place</span>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {activeTemplate.first_only} pts base
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                      <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ A-Grade</span>
                        <span className="font-mono font-black text-amber-900 text-xs">{activeTemplate.first_A_grade} pts</span>
                      </div>
                      <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ B-Grade</span>
                        <span className="font-mono font-black text-amber-900 text-xs">{activeTemplate.first_B_grade} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* 2nd Place Card */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs">
                          🥈
                        </div>
                        <span className="text-xs font-black text-slate-900">2nd Place</span>
                      </div>
                      <span className="text-xs font-mono font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        {activeTemplate.second_only} pts base
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ A-Grade</span>
                        <span className="font-mono font-black text-slate-900 text-xs">{activeTemplate.second_A_grade} pts</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ B-Grade</span>
                        <span className="font-mono font-black text-slate-900 text-xs">{activeTemplate.second_B_grade} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* 3rd Place Card */}
                  <div className="bg-white rounded-2xl p-3.5 border border-orange-200/80 shadow-2xs space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs">
                          🥉
                        </div>
                        <span className="text-xs font-black text-orange-950">3rd Place</span>
                      </div>
                      <span className="text-xs font-mono font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        {activeTemplate.third_only} pts base
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                      <div className="bg-orange-50/60 p-1.5 rounded-lg border border-orange-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ A-Grade</span>
                        <span className="font-mono font-black text-orange-900 text-xs">{activeTemplate.third_A_grade} pts</span>
                      </div>
                      <div className="bg-orange-50/60 p-1.5 rounded-lg border border-orange-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ B-Grade</span>
                        <span className="font-mono font-black text-orange-900 text-xs">{activeTemplate.third_B_grade} pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Standalone Grades Banner */}
                <div className="bg-white rounded-xl p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                    <Award size={13} className="text-indigo-600" /> Non-Position Standalone Grades:
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                      A-Grade Only: <span className="font-mono font-black">{activeTemplate.A_grade} pts</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                      B-Grade Only: <span className="font-mono font-black">{activeTemplate.B_grade} pts</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTERED CANDIDATES */}
        {selectedProgram && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-900">
                  3. Registered Candidates ({registeredCandidates.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Only verified candidates can be awarded positions
              </span>
            </div>

            {loadingCandidates ? (
              <div className="py-8 text-center text-slate-400 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                Loading registered candidates...
              </div>
            ) : registeredCandidates.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-900">
                  No candidates registered for this programme yet.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Candidates must be registered in the system before official results can be published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                {registeredCandidates.map((c) => {
                  const assignedPosKey = assignedPositions[c.addNo];
                  const isAssigned = Boolean(assignedPosKey);

                  return (
                    <div
                      key={c.addNo}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition ${
                        isAssigned
                          ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400 font-semibold"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono font-bold text-indigo-700 block text-[11px]">
                          {c.addNo}
                        </span>
                        <span className="text-slate-900 font-bold truncate block">{c.name}</span>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white shrink-0 shadow-2xs">
                          Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          Eligible
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: ASSIGN POSITIONS & GRADES */}
        {selectedProgram && registeredCandidates.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-0.5">
                4. Award Positions, Grades & Student Points
              </h2>
              <p className="text-xs text-slate-500">
                Each position calculates points automatically. When submitted, points are instantly credited to the student's record and wing total.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1st Place */}
              <PositionRow
                icon="🥇"
                label="1st Place Winner"
                posKey="first"
                holders={holders}
                registeredCandidates={registeredCandidates}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("first", holders.first.grade)}
                hasGradeOptions={true}
              />

              {/* 2nd Place */}
              <PositionRow
                icon="🥈"
                label="2nd Place Runner-Up"
                posKey="second"
                holders={holders}
                registeredCandidates={registeredCandidates}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("second", holders.second.grade)}
                hasGradeOptions={true}
              />

              {/* 3rd Place */}
              <PositionRow
                icon="🥉"
                label="3rd Place"
                posKey="third"
                holders={holders}
                registeredCandidates={registeredCandidates}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("third", holders.third.grade)}
                hasGradeOptions={true}
              />

              {/* A-Grade Recognition */}
              <PositionRow
                icon="⭐"
                label="A-Grade Special Recognition"
                posKey="aGrade"
                holders={holders}
                registeredCandidates={registeredCandidates}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("aGrade", "A")}
                hasGradeOptions={false}
              />

              {/* B-Grade Recognition */}
              <PositionRow
                icon="✨"
                label="B-Grade Recognition"
                posKey="bGrade"
                holders={holders}
                registeredCandidates={registeredCandidates}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("bGrade", "B")}
                hasGradeOptions={false}
              />
            </div>

            {/* LIVE RECEIPT PREVIEW */}
            {allocationsSummary.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    Points Crediting Summary ({allocationsSummary.length} Recipients)
                  </span>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Total: +{totalPointsAwarded} PTS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {allocationsSummary.map((item) => (
                    <div
                      key={item.positionKey}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-900 block truncate">
                          {item.name} ({item.addNo})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.label} • {item.gradeLabel}
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                        +{item.points} PTS
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBMIT BUTTONS */}
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
                disabled={loadingSubmit || allocationsSummary.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {loadingSubmit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Assigning Student Points & Publishing...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" /> Publish Result & Assign Points (+{totalPointsAwarded} PTS)
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

// Subcomponent: Position Row
function PositionRow({
  icon,
  label,
  posKey,
  holders,
  registeredCandidates,
  assignedPositions,
  onCandidateSelect,
  onGradeSelect,
  calculatedPoints,
  hasGradeOptions,
}: {
  icon: string;
  label: string;
  posKey: keyof HoldersState;
  holders: HoldersState;
  registeredCandidates: RegisteredCandidate[];
  assignedPositions: Record<string, keyof HoldersState>;
  onCandidateSelect: (posKey: keyof HoldersState, addNo: string) => void;
  onGradeSelect: (posKey: keyof HoldersState, grade: GradeSelection) => void;
  calculatedPoints: number;
  hasGradeOptions: boolean;
}) {
  const currentSelection = holders[posKey].addNo;
  const currentGrade = holders[posKey].grade;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition">
      {/* Title & Icon */}
      <div className="flex items-center gap-3 md:w-5/12">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
            {label}
          </span>
          <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md border mt-0.5 bg-amber-50 text-amber-900 border-amber-200">
            +{calculatedPoints} Points to Student
          </span>
        </div>
      </div>

      {/* Candidate Select */}
      <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
        <select
          value={currentSelection}
          onChange={(e) => onCandidateSelect(posKey, e.target.value)}
          className={`w-full p-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
            currentSelection
              ? "bg-white border-indigo-400 text-indigo-950 ring-2 ring-indigo-100"
              : "bg-white border-slate-300 text-slate-700"
          }`}
        >
          <option value="">-- No Candidate Awarded --</option>
          {registeredCandidates.map((c) => {
            const isAssignedElsewhere =
              assignedPositions[c.addNo] && assignedPositions[c.addNo] !== posKey;

            return (
              <option
                key={c.addNo}
                value={c.addNo}
                disabled={Boolean(isAssignedElsewhere)}
              >
                [{c.addNo}] {c.name} {isAssignedElsewhere ? " ⚠️ (Assigned)" : ""}
              </option>
            );
          })}
        </select>

        {/* Grade Options (for 1st, 2nd, 3rd) */}
        {hasGradeOptions && currentSelection && (
          <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase sm:hidden">Grade:</span>
            <button
              type="button"
              onClick={() => onGradeSelect(posKey, "none")}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentGrade === "none"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
              title="Position Only (No Grade)"
            >
              Position Only
            </button>
            <button
              type="button"
              onClick={() => onGradeSelect(posKey, "A")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentGrade === "A"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
              title="A Grade"
            >
              A Grade
            </button>
            <button
              type="button"
              onClick={() => onGradeSelect(posKey, "B")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentGrade === "B"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
              title="B Grade"
            >
              B Grade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
