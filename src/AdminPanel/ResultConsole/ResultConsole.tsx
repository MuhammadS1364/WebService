import React, { useState, useEffect, useMemo, useCallback } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { hydrateResultRecords, ensureCandidateRegistrationUuid, deleteOfficialResult } from "../../lib/resultService";
import { syncAllStudentAndSquadPoints, type PointSyncReport } from "../../lib/pointAuditService";
import type { PointsTemplateRecord } from "../../lib/types";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
import {
  Trophy,
  Award,
  Search,
  Trash2,
  Edit,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Zap,
  X,
} from "lucide-react";

interface ProgrammeRow {
  Program_Code: string;
  Program_Title: string;
  Category?: string | null;
  WingCode?: string | null;
  Date?: string | null;
  Venue?: string | null;
  IsResulted?: boolean;
  IsResultPublished?: boolean;
  is_group_program?: boolean;
  points_template?: string | null;
  Total_Registration?: number;
}

interface CandidateItem {
  addNo: string;
  name: string;
  candidateUuid?: string;
  photoUrl?: string | null;
  className?: string | null;
}

interface SquadItem {
  squad_id: string;
  squad_title: string;
  members: { addNo: string; name: string }[];
}

type GradeSelection = "none" | "A" | "B";

interface HolderEntry {
  addNo: string; // AddNo or squad_id
  name: string;
  grade: GradeSelection;
  squadMembers?: { addNo: string; name: string }[];
}

interface HoldersState {
  first: HolderEntry;
  second: HolderEntry;
  third: HolderEntry;
  aGrade: HolderEntry;
  bGrade: HolderEntry;
}

const INITIAL_HOLDERS: HoldersState = {
  first: { addNo: "", name: "", grade: "none" },
  second: { addNo: "", name: "", grade: "none" },
  third: { addNo: "", name: "", grade: "none" },
  aGrade: { addNo: "", name: "", grade: "A" },
  bGrade: { addNo: "", name: "", grade: "B" },
};

export default function ResultConsole() {
  // Mode: "directory" (table of all programmes & declared results) or "workspace" (create/edit result for a programme)
  const [activeTab, setActiveTab] = useState<"directory" | "workspace">("directory");

  // Core Data
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [pointsTemplates, setPointsTemplates] = useState<PointsTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ running: boolean; report: PointSyncReport | null; msg: string }>({
    running: false,
    report: null,
    msg: "",
  });

  // Directory Filters
  const [dirSearch, setDirSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "resulted" | "pending">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "group">("all");
  const [wingFilter, setWingFilter] = useState("all");

  // Workspace / Editor State
  const [selectedProgCode, setSelectedProgCode] = useState<string>("");
  const [holders, setHolders] = useState<HoldersState>(INITIAL_HOLDERS);
  const [registeredCandidates, setRegisteredCandidates] = useState<CandidateItem[]>([]);
  const [registeredSquads, setRegisteredSquads] = useState<SquadItem[]>([]);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [workspaceMsg, setWorkspaceMsg] = useState<{ type: "success" | "error" | ""; text: string; details?: string[] }>({
    type: "",
    text: "",
  });

  // Candidate UUID lookup caching
  const [candCodeToUuid, setCandCodeToUuid] = useState<Record<string, string>>({});

  // Modals
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; progCode: string; progTitle: string }>({
    isOpen: false,
    progCode: "",
    progTitle: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [printModalProgCode, setPrintModalProgCode] = useState<string | null>(null);

  // 1. Load All Programmes, Results, and Templates
  const loadConsoleData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [progsRes, resultsRes, tmplRes] = await Promise.all([
        SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Category, WingCode, Date, Venue, IsResulted, IsResultPublished, is_group_program, points_template, Total_Registration")
          .order("Program_Code", { ascending: true }),
        SupaBaseFunction
          .from("ResultBox")
          .select("*"),
        SupaBaseFunction
          .from("Points_Templates")
          .select("*"),
      ]);

      const progs = (progsRes.data || []) as ProgrammeRow[];
      setProgrammes(progs);

      const hydratedResults = await hydrateResultRecords(resultsRes.data || []);
      setResultsList(hydratedResults);

      const tmpls = (tmplRes.data || []) as PointsTemplateRecord[];
      setPointsTemplates(tmpls);
    } catch (err: any) {
      console.error("Error loading result console data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConsoleData();
  }, [loadConsoleData]);

  // Selected programme details
  const selectedProg = useMemo(() => {
    return programmes.find((p) => p.Program_Code === selectedProgCode) || null;
  }, [programmes, selectedProgCode]);

  // Active Points Template for selected programme
  const activeTemplate = useMemo<PointsTemplateRecord>(() => {
    if (selectedProg?.points_template) {
      const found = pointsTemplates.find((t) => t.p_template_id === selectedProg.points_template);
      if (found) return found;
    }
    return (
      pointsTemplates[0] || {
        p_template_id: "default",
        point_template_title: "Default Scheme (10/8/6)",
        first_only: 5,
        first_A_grade: 10,
        first_B_grade: 8,
        second_only: 3,
        second_A_grade: 8,
        second_B_grade: 6,
        third_only: 1,
        third_A_grade: 6,
        third_B_grade: 4,
        A_grade: 5,
        B_grade: 3,
      }
    );
  }, [selectedProg, pointsTemplates]);

  // 2. Load candidates/squads when selected programme changes
  const loadCandidatesForProgram = useCallback(async (progCode: string) => {
    if (!progCode) {
      setRegisteredCandidates([]);
      setRegisteredSquads([]);
      setHolders(INITIAL_HOLDERS);
      setIsEditingExisting(false);
      return;
    }

    setLoadingCandidates(true);
    setWorkspaceMsg({ type: "", text: "" });

    try {
      const targetProg = programmes.find((p) => p.Program_Code === progCode);
      const isGroup = Boolean(targetProg?.is_group_program);

      // Check for existing result
      const existingRes = resultsList.find((r) => r.Program_Id === progCode);

      if (isGroup) {
        // Fetch group squads
        const { data: regRows } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("squad_uuid")
          .eq("Program_Code", progCode);

        const squadIds = Array.from(new Set((regRows || []).map((r: any) => r.squad_uuid).filter(Boolean))) as string[];

        let loadedSquads: SquadItem[] = [];
        if (squadIds.length > 0) {
          const { data: sqRows } = await SupaBaseFunction
            .from("SquadMate")
            .select("squad_id, squad_title, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
            .in("squad_id", squadIds);

          const studentCodes: string[] = [];
          (sqRows || []).forEach((sq: any) => {
            [
              sq.member1_uuid,
              sq.member2_uuid,
              sq.member3_uuid,
              sq.member4_uuid,
              sq.member5_uuid,
              sq.member6_uuid,
              sq.member7_uuid,
            ]
              .filter(Boolean)
              .forEach((m) => studentCodes.push(String(m).trim()));
          });

          let studentNamesMap: Record<string, string> = {};
          if (studentCodes.length > 0) {
            const { data: stnRows } = await SupaBaseFunction
              .from("StudentsBox")
              .select("AddNo, StudentName")
              .in("AddNo", Array.from(new Set(studentCodes)));

            (stnRows || []).forEach((s: any) => {
              studentNamesMap[s.AddNo] = s.StudentName || s.AddNo;
            });
          }

          loadedSquads = (sqRows || []).map((sq: any) => {
            const members = [
              sq.member1_uuid,
              sq.member2_uuid,
              sq.member3_uuid,
              sq.member4_uuid,
              sq.member5_uuid,
              sq.member6_uuid,
              sq.member7_uuid,
            ]
              .filter(Boolean)
              .map((m: string) => ({
                addNo: m,
                name: studentNamesMap[m] || m,
              }));

            return {
              squad_id: sq.squad_id,
              squad_title: sq.squad_title || "Unnamed Squad",
              members,
            };
          });
        }

        setRegisteredSquads(loadedSquads);
        setRegisteredCandidates([]);

        // Populate existing group result if present
        if (existingRes) {
          setIsEditingExisting(true);
          const g1 = existingRes["1st_holder_group"] || "";
          const g2 = existingRes["2nd_holder_group"] || "";
          const g3 = existingRes["3rd_holder_group"] || "";
          const ga = existingRes.grade_holder_group1 || "";
          const gb = existingRes.grade_holder_group2 || "";

          const resolveSquadTitle = (sqId?: string) => {
            if (!sqId) return "";
            const found = loadedSquads.find((s) => s.squad_id.toLowerCase() === sqId.toLowerCase());
            return found?.squad_title || sqId;
          };

          setHolders({
            first: {
              addNo: g1,
              name: resolveSquadTitle(g1),
              grade: ga && ga.toLowerCase() === g1.toLowerCase() ? "A" : gb && gb.toLowerCase() === g1.toLowerCase() ? "B" : "none",
            },
            second: {
              addNo: g2,
              name: resolveSquadTitle(g2),
              grade: ga && ga.toLowerCase() === g2.toLowerCase() ? "A" : gb && gb.toLowerCase() === g2.toLowerCase() ? "B" : "none",
            },
            third: {
              addNo: g3,
              name: resolveSquadTitle(g3),
              grade: ga && ga.toLowerCase() === g3.toLowerCase() ? "A" : gb && gb.toLowerCase() === g3.toLowerCase() ? "B" : "none",
            },
            aGrade: {
              addNo: ga && ga !== g1 && ga !== g2 && ga !== g3 ? ga : "",
              name: resolveSquadTitle(ga && ga !== g1 && ga !== g2 && ga !== g3 ? ga : ""),
              grade: "A",
            },
            bGrade: {
              addNo: gb && gb !== g1 && gb !== g2 && gb !== g3 ? gb : "",
              name: resolveSquadTitle(gb && gb !== g1 && gb !== g2 && gb !== g3 ? gb : ""),
              grade: "B",
            },
          });
        } else {
          setIsEditingExisting(false);
          setHolders(INITIAL_HOLDERS);
        }
      } else {
        // Fetch individual candidates
        const { data: regRows } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("CandidateUUiD, Candidate_Code")
          .eq("Program_Code", progCode);

        const codeMap: Record<string, string> = {};
        const candidateCodes: string[] = [];
        (regRows || []).forEach((r: any) => {
          if (r.Candidate_Code) {
            const clean = String(r.Candidate_Code).trim();
            candidateCodes.push(clean);
            if (r.CandidateUUiD) codeMap[clean] = r.CandidateUUiD;
          }
        });
        setCandCodeToUuid(codeMap);

        let loadedCandidates: CandidateItem[] = [];
        if (candidateCodes.length > 0) {
          const { data: stnRows } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Stn_Class, Student_Photo_Urls")
            .in("AddNo", candidateCodes);

          loadedCandidates = (stnRows || []).map((s: any) => ({
            addNo: s.AddNo,
            name: s.StudentName || s.AddNo,
            candidateUuid: codeMap[s.AddNo],
            photoUrl: s.Student_Photo_Urls || null,
            className: s.Stn_Class || null,
          }));
        }

        setRegisteredCandidates(loadedCandidates);
        setRegisteredSquads([]);

        // Populate existing individual result if present
        if (existingRes) {
          setIsEditingExisting(true);
          const u1 = existingRes.First_Holder_uuid;
          const u2 = existingRes.Second_Holder_uuid;
          const u3 = existingRes.Third_Holder_uuid;
          const ua = existingRes.Grade1_uuid;
          const ub = existingRes.Grade2_uuid;

          const resolveCand = (uuid?: string, fallbackText?: string) => {
            if (uuid) {
              const found = loadedCandidates.find((c) => c.candidateUuid?.toLowerCase() === uuid.toLowerCase());
              if (found) return { addNo: found.addNo, name: found.name };
            }
            if (fallbackText) {
              const clean = fallbackText.split(",")[0].trim();
              const found = loadedCandidates.find((c) => c.addNo.toLowerCase() === clean.toLowerCase());
              if (found) return { addNo: found.addNo, name: found.name };
              return { addNo: clean, name: clean };
            }
            return { addNo: "", name: "" };
          };

          const c1 = resolveCand(u1, existingRes.First_Holder);
          const c2 = resolveCand(u2, existingRes.Second_Holder);
          const c3 = resolveCand(u3, existingRes.Third_Holder);
          const ca = resolveCand(ua, existingRes.AGrade);
          const cb = resolveCand(ub, existingRes.BGrade);

          setHolders({
            first: {
              ...c1,
              grade: ua && ua === u1 ? "A" : ub && ub === u1 ? "B" : "none",
            },
            second: {
              ...c2,
              grade: ua && ua === u2 ? "A" : ub && ub === u2 ? "B" : "none",
            },
            third: {
              ...c3,
              grade: ua && ua === u3 ? "A" : ub && ub === u3 ? "B" : "none",
            },
            aGrade: {
              addNo: ua && ua !== u1 && ua !== u2 && ua !== u3 ? ca.addNo : "",
              name: ua && ua !== u1 && ua !== u2 && ua !== u3 ? ca.name : "",
              grade: "A",
            },
            bGrade: {
              addNo: ub && ub !== u1 && ub !== u2 && ub !== u3 ? cb.addNo : "",
              name: ub && ub !== u1 && ub !== u2 && ub !== u3 ? cb.name : "",
              grade: "B",
            },
          });
        } else {
          setIsEditingExisting(false);
          setHolders(INITIAL_HOLDERS);
        }
      }
    } catch (err) {
      console.error("Error loading candidate registrations:", err);
    } finally {
      setLoadingCandidates(false);
    }
  }, [programmes, resultsList]);

  const handleSelectProgramForEdit = (progCode: string) => {
    setSelectedProgCode(progCode);
    setActiveTab("workspace");
    loadCandidatesForProgram(progCode);
  };

  // Point Calculation Helper
  const calculatePoints = useCallback(
    (pos: keyof HoldersState, gr: GradeSelection): number => {
      const t = activeTemplate;
      if (pos === "first") return gr === "A" ? (t.first_A_grade ?? 10) : gr === "B" ? (t.first_B_grade ?? 8) : (t.first_only ?? 5);
      if (pos === "second") return gr === "A" ? (t.second_A_grade ?? 8) : gr === "B" ? (t.second_B_grade ?? 6) : (t.second_only ?? 3);
      if (pos === "third") return gr === "A" ? (t.third_A_grade ?? 6) : gr === "B" ? (t.third_B_grade ?? 4) : (t.third_only ?? 1);
      if (pos === "aGrade") return t.A_grade ?? 5;
      if (pos === "bGrade") return t.B_grade ?? 3;
      return 0;
    },
    [activeTemplate]
  );

  // Computed allocations summary
  const allocationsSummary = useMemo(() => {
    const list: {
      positionKey: keyof HoldersState;
      label: string;
      addNo: string;
      name: string;
      groupName?: string;
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

    const isGroup = Boolean(selectedProg?.is_group_program);

    configs.forEach(({ key, label }) => {
      const h = holders[key];
      if (h.addNo) {
        const pts = calculatePoints(key, h.grade);
        const gradeText =
          key === "aGrade" ? "A Grade" : key === "bGrade" ? "B Grade" : h.grade === "A" ? "A Grade" : h.grade === "B" ? "B Grade" : "Position Only";

        if (isGroup) {
          const sq = registeredSquads.find((s) => s.squad_id === h.addNo);
          const title = sq?.squad_title || h.name;
          list.push({
            positionKey: key,
            label: `${label} (Squad: ${title})`,
            addNo: h.addNo,
            name: title,
            groupName: title,
            gradeLabel: gradeText,
            points: pts,
          });
        } else {
          list.push({
            positionKey: key,
            label,
            addNo: h.addNo,
            name: h.name,
            gradeLabel: gradeText,
            points: pts,
          });
        }
      }
    });

    return list;
  }, [holders, calculatePoints, selectedProg, registeredSquads]);

  // 3. Save / Update Official Result
  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgCode) {
      setWorkspaceMsg({ type: "error", text: "Please select a programme first." });
      return;
    }

    if (allocationsSummary.length === 0) {
      setWorkspaceMsg({
        type: "error",
        text: `Please assign at least one winner before publishing.`,
      });
      return;
    }

    const isGroup = Boolean(selectedProg?.is_group_program);

    try {
      setSubmittingResult(true);
      setWorkspaceMsg({ type: "", text: "" });

      const isValidUuid = (u?: string | null): boolean => {
        return Boolean(u && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.trim()));
      };

      const resolveCandidateUuid = async (candidateAddNo?: string | null): Promise<string | null> => {
        if (!candidateAddNo || !candidateAddNo.trim()) return null;
        const clean = candidateAddNo.trim();
        if (isValidUuid(clean)) return clean;
        if (candCodeToUuid[clean] && isValidUuid(candCodeToUuid[clean])) return candCodeToUuid[clean];
        const resolved = await ensureCandidateRegistrationUuid(selectedProgCode, clean);
        return resolved && isValidUuid(resolved) ? resolved : null;
      };

      let resultPayload: any = {};

      if (isGroup) {
        const firstSquadUuid = holders.first.addNo || null;
        const secondSquadUuid = holders.second.addNo || null;
        const thirdSquadUuid = holders.third.addNo || null;

        const rawGradeSquad1 =
          holders.aGrade.addNo ||
          (holders.first.grade === "A" ? holders.first.addNo : null) ||
          (holders.second.grade === "A" ? holders.second.addNo : null) ||
          (holders.third.grade === "A" ? holders.third.addNo : null);

        const rawGradeSquad2 =
          holders.bGrade.addNo ||
          (holders.first.grade === "B" ? holders.first.addNo : null) ||
          (holders.second.grade === "B" ? holders.second.addNo : null) ||
          (holders.third.grade === "B" ? holders.third.addNo : null);

        resultPayload = {
          Program_Id: selectedProgCode,
          creaded_At: new Date().toTimeString().split(" ")[0],
          is_published: true,
          is_group: true,
          "1st_holder_group": firstSquadUuid,
          "2nd_holder_group": secondSquadUuid,
          "3rd_holder_group": thirdSquadUuid,
          grade_holder_group1: rawGradeSquad1,
          grade_holder_group2: rawGradeSquad2,
          First_Holder_uuid: null,
          Second_Holder_uuid: null,
          Third_Holder_uuid: null,
          Grade1_uuid: null,
          Grade2_uuid: null,
        };
      } else {
        const firstCandUuid = await resolveCandidateUuid(holders.first.addNo);
        const secondCandUuid = await resolveCandidateUuid(holders.second.addNo);
        const thirdCandUuid = await resolveCandidateUuid(holders.third.addNo);
        const aGradeCandUuid = await resolveCandidateUuid(holders.aGrade.addNo);
        const bGradeCandUuid = await resolveCandidateUuid(holders.bGrade.addNo);

        const grade1CandUuid =
          aGradeCandUuid ||
          (holders.first.grade === "A" ? firstCandUuid : null) ||
          (holders.second.grade === "A" ? secondCandUuid : null) ||
          (holders.third.grade === "A" ? thirdCandUuid : null);

        const grade2CandUuid =
          bGradeCandUuid ||
          (holders.first.grade === "B" ? firstCandUuid : null) ||
          (holders.second.grade === "B" ? secondCandUuid : null) ||
          (holders.third.grade === "B" ? thirdCandUuid : null);

        resultPayload = {
          Program_Id: selectedProgCode,
          creaded_At: new Date().toTimeString().split(" ")[0],
          is_published: true,
          is_group: false,
          First_Holder_uuid: firstCandUuid,
          Second_Holder_uuid: secondCandUuid,
          Third_Holder_uuid: thirdCandUuid,
          Grade1_uuid: grade1CandUuid,
          Grade2_uuid: grade2CandUuid,
          "1st_holder_group": null,
          "2nd_holder_group": null,
          "3rd_holder_group": null,
          grade_holder_group1: null,
          grade_holder_group2: null,
        };
      }

      // Upsert into ResultBox
      const { data: existing } = await SupaBaseFunction
        .from("ResultBox")
        .select("Result_id")
        .eq("Program_Id", selectedProgCode)
        .maybeSingle();

      if (existing?.Result_id) {
        const { error: updErr } = await SupaBaseFunction
          .from("ResultBox")
          .update(resultPayload)
          .eq("Result_id", existing.Result_id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await SupaBaseFunction
          .from("ResultBox")
          .insert([resultPayload]);
        if (insErr) throw insErr;
      }

      // Update ProgrammesBox flags
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({
          IsResulted: true,
          IsResultPublished: true,
          IsConducted: true,
          is_freezed: true,
          points_template: activeTemplate.p_template_id !== "default" ? activeTemplate.p_template_id : null,
        })
        .eq("Program_Code", selectedProgCode);

      // Recalibrate and synchronize all points across students, squads, and wings authoritatively
      const syncReport = await syncAllStudentAndSquadPoints();

      setWorkspaceMsg({
        type: "success",
        text: `Official result for ${selectedProgCode} successfully published!`,
        details: [
          `Recalibrated: ${syncReport.studentsUpdated} student record(s), ${syncReport.squadsUpdated} squad(s).`,
          `Scheme Applied: "${activeTemplate.point_template_title}"`,
        ],
      });

      // Reload console list data in background
      loadConsoleData(true);
      setIsEditingExisting(true);
    } catch (err: any) {
      console.error("Failed to save result:", err);
      setWorkspaceMsg({
        type: "error",
        text: "Error saving result: " + (err.message || "Database update failed"),
      });
    } finally {
      setSubmittingResult(false);
    }
  };

  // 4. Delete Result Handler
  const handleDeleteResult = async (progCode: string) => {
    try {
      setIsDeleting(true);
      const outcome = await deleteOfficialResult(progCode);
      if (!outcome.success) {
        throw new Error(outcome.message);
      }

      // Reset workspace if deleted programme is currently open
      if (selectedProgCode === progCode) {
        setHolders(INITIAL_HOLDERS);
        setIsEditingExisting(false);
        setWorkspaceMsg({
          type: "success",
          text: `Result for programme ${progCode} deleted and all points cleanly rolled back.`,
        });
      }

      setDeleteModalState({ isOpen: false, progCode: "", progTitle: "" });
      await loadConsoleData(true);
    } catch (err: any) {
      console.error("Failed to delete result:", err);
      alert("Failed to delete result: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 5. Global Point Audit & Reconcile Trigger
  const handleTriggerSync = async () => {
    try {
      setSyncStatus({ running: true, report: null, msg: "Reconciling all student & squad points..." });
      const report = await syncAllStudentAndSquadPoints();
      setSyncStatus({
        running: false,
        report,
        msg: `Audit Complete: ${report.studentsUpdated} student(s) updated, ${report.squadsUpdated} squad(s) updated.`,
      });
      await loadConsoleData(true);
    } catch (err: any) {
      setSyncStatus({ running: false, report: null, msg: "Point sync error: " + err.message });
    }
  };

  // Directory Filtered List
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const q = dirSearch.toLowerCase().trim();
      if (q) {
        const matchesCode = p.Program_Code.toLowerCase().includes(q);
        const matchesTitle = p.Program_Title?.toLowerCase().includes(q);
        const matchesWing = p.WingCode?.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesWing) return false;
      }

      if (statusFilter === "resulted" && !p.IsResulted) return false;
      if (statusFilter === "pending" && p.IsResulted) return false;

      if (typeFilter === "individual" && p.is_group_program) return false;
      if (typeFilter === "group" && !p.is_group_program) return false;

      if (wingFilter !== "all" && p.WingCode !== wingFilter) return false;

      return true;
    });
  }, [programmes, dirSearch, statusFilter, typeFilter, wingFilter]);

  // Overall Statistics
  const totalCount = programmes.length;
  const resultedCount = programmes.filter((p) => p.IsResulted).length;
  const pendingCount = totalCount - resultedCount;
  const uniqueWings = Array.from(new Set(programmes.map((p) => p.WingCode).filter(Boolean))) as string[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-2.5">
            <ShieldCheck size={14} className="text-indigo-400" />
            <span>Admin Authority • Official Result Console (Resole)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span>Resole: Result Control Center</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl">
            Full control suite to declare, edit, audit, and delete competition results with real-time authoritative point synchronization.
          </p>
        </div>

        {/* Global Point Audit Button */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => loadConsoleData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition cursor-pointer"
            title="Refresh results and programmes"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={syncStatus.running}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
            title="Recalculate and reconcile all points across the system"
          >
            <RefreshCw size={15} className={syncStatus.running ? "animate-spin" : ""} />
            <span>{syncStatus.running ? "Auditing Points..." : "Audit & Reconcile Points"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedProgCode("");
              setHolders(INITIAL_HOLDERS);
              setIsEditingExisting(false);
              setActiveTab("workspace");
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Declare New Result</span>
          </button>
        </div>

        {/* Sync message alert */}
        {syncStatus.msg && (
          <div className="absolute bottom-2 left-6 right-6 text-xs font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 rounded-xl px-3 py-1 flex items-center justify-between">
            <span>{syncStatus.msg}</span>
            <button type="button" onClick={() => setSyncStatus((s) => ({ ...s, msg: "" }))} className="text-white hover:text-slate-300">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Events</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{totalCount}</p>
          <span className="text-[10px] text-slate-500">Scheduled Programmes</span>
        </div>

        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">Result Declared</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-0.5">{resultedCount}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{Math.round((resultedCount / (totalCount || 1)) * 100)}% Completed</span>
        </div>

        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-amber-50/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">Pending Results</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-0.5">{pendingCount}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Awaiting Declaration</span>
        </div>

        <div className="bg-white border border-indigo-200/90 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-indigo-50/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">Official Podium Records</span>
          <p className="text-2xl sm:text-3xl font-black text-indigo-700 mt-0.5">{resultsList.length}</p>
          <span className="text-[10px] text-indigo-600 font-semibold">Published ResultBox Rows</span>
        </div>
      </div>

      {/* VIEW TABS: DIRECTORY VS WORKSPACE */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "directory"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Trophy size={16} />
          <span>Results Directory & Management ({resultedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "workspace"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Edit size={16} />
          <span>
            {selectedProgCode
              ? `Workspace: ${selectedProgCode} (${isEditingExisting ? "Edit Result" : "Declare Result"})`
              : "Create / Edit Result Workspace"}
          </span>
        </button>
      </div>

      {/* TAB 1: RESULTS DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder="Search by programme code, title, wing..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="all">All Statuses ({totalCount})</option>
                <option value="resulted">Declared Only ({resultedCount})</option>
                <option value="pending">Pending Only ({pendingCount})</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual Events</option>
                <option value="group">Group / Squad Events</option>
              </select>

              <select
                value={wingFilter}
                onChange={(e) => setWingFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="all">All Wings</option>
                {uniqueWings.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLE OF PROGRAMMES & RESULTS */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading official results directory...</p>
            </div>
          ) : filteredProgrammes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
              <Trophy size={40} className="text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No programmes found</h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search keywords or filter dropdowns.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Programme Details</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Declared Winners</th>
                      <th className="py-3 px-4 text-right">Actions (Full Control)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProgrammes.map((p) => {
                      const res = resultsList.find((r) => r.Program_Id === p.Program_Code);
                      const isResulted = Boolean(p.IsResulted || res);

                      return (
                        <tr key={p.Program_Code} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-indigo-600 text-[11px] block">
                              #{p.Program_Code}
                            </span>
                            <span className="font-bold text-slate-900 text-sm block">
                              {p.Program_Title || "Untitled Programme"}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>Wing: {p.WingCode || "General"}</span>
                              <span>•</span>
                              <span>{formatResultDate(p.Date)}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                p.is_group_program
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {p.is_group_program ? "👥 Group / Squad" : "👤 Individual"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isResulted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>Declared & Published</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle size={12} className="text-amber-600" />
                                <span>Pending Declaration</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            {res ? (
                              <div className="space-y-1">
                                {res.First_Holder && (
                                  <div className="text-[11px] text-slate-800 truncate">
                                    <strong className="text-amber-600">1st:</strong> {res.First_Holder}
                                  </div>
                                )}
                                {res.Second_Holder && (
                                  <div className="text-[11px] text-slate-700 truncate">
                                    <strong className="text-slate-500">2nd:</strong> {res.Second_Holder}
                                  </div>
                                )}
                                {res.Third_Holder && (
                                  <div className="text-[11px] text-slate-700 truncate">
                                    <strong className="text-orange-600">3rd:</strong> {res.Third_Holder}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No winners declared</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {isResulted ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectProgramForEdit(p.Program_Code)}
                                    className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                                    title="Edit Official Result"
                                  >
                                    <Edit size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setPrintModalProgCode(p.Program_Code)}
                                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
                                    title="View / Print Judgement Sheet"
                                  >
                                    <Printer size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteModalState({
                                        isOpen: true,
                                        progCode: p.Program_Code,
                                        progTitle: p.Program_Title,
                                      })
                                    }
                                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                                    title="Delete Result & Rollback Points"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectProgramForEdit(p.Program_Code)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs transition cursor-pointer"
                                >
                                  <PlusCircle size={13} />
                                  <span>Declare Result</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESULT WORKSPACE (CREATE / EDIT MODE) */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          {/* TOP BAR / PROGRAMME SELECTOR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">Workspace Selector</span>
                <h2 className="text-lg font-black text-slate-900">Select Programme to Control Results</h2>
              </div>

              {selectedProgCode && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProgCode("");
                    setHolders(INITIAL_HOLDERS);
                    setIsEditingExisting(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <X size={14} /> Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedProgCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedProgCode(code);
                    loadCandidatesForProgram(code);
                  }}
                  className="w-full p-3 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">-- Choose Programme from List --</option>
                  {programmes.map((p) => (
                    <option key={p.Program_Code} value={p.Program_Code}>
                      #{p.Program_Code} - {p.Program_Title} {p.IsResulted ? "✓ (Declared)" : "⏳ (Pending)"} [{p.is_group_program ? "Group" : "Individual"}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedProg && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase">Selected Mode</span>
                    <span className="text-xs font-black text-indigo-950">
                      {isEditingExisting ? "✏️ Edit Official Result" : "⭐ Declare Fresh Result"}
                    </span>
                  </div>

                  {isEditingExisting && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModalState({
                          isOpen: true,
                          progCode: selectedProg.Program_Code,
                          progTitle: selectedProg.Program_Title,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Delete Result
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* PROGRAMME SUMMARY BANNER */}
            {selectedProg && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-mono font-bold text-indigo-600 text-[11px] block">#{selectedProg.Program_Code}</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedProg.Program_Title}</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Wing: <strong>{selectedProg.WingCode || "Wing"}</strong> | Scheme: <strong>{activeTemplate.point_template_title}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold">
                    {selectedProg.is_group_program ? `👥 ${registeredSquads.length} Registered Squad(s)` : `👤 ${registeredCandidates.length} Registered Candidate(s)`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* WORKSPACE FEEDBACK ALERTS */}
          {workspaceMsg.text && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold ${
                workspaceMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{workspaceMsg.text}</span>
                <button type="button" onClick={() => setWorkspaceMsg({ type: "", text: "" })}>
                  <X size={14} />
                </button>
              </div>
              {workspaceMsg.details && workspaceMsg.details.length > 0 && (
                <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-[11px]">
                  {workspaceMsg.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ACTIVE ASSIGNMENT FORM */}
          {selectedProg && (
            <form onSubmit={handleSubmitResult} className="space-y-6">
              {loadingCandidates ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-semibold">Loading candidates & registrations...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* PODIUM SLOTS (2 COLS) */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* FIRST PLACE */}
                    <div className="bg-white rounded-3xl border-2 border-amber-300 p-5 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                          <Trophy size={14} className="text-amber-600" />
                          <span>1st Place Winner</span>
                        </span>
                        <span className="text-xs font-black text-amber-700">
                          +{calculatePoints("first", holders.first.grade)} PTS
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            {selectedProg.is_group_program ? "Select Winning Squad" : "Select Candidate"}
                          </label>
                          <select
                            value={holders.first.addNo}
                            onChange={(e) => {
                              const val = e.target.value;
                              const name = selectedProg.is_group_program
                                ? registeredSquads.find((s) => s.squad_id === val)?.squad_title || val
                                : registeredCandidates.find((c) => c.addNo === val)?.name || val;
                              setHolders((prev) => ({ ...prev, first: { ...prev.first, addNo: val, name } }));
                            }}
                            className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                          >
                            <option value="">-- Choose 1st Place --</option>
                            {selectedProg.is_group_program
                              ? registeredSquads.map((sq) => (
                                  <option key={sq.squad_id} value={sq.squad_id}>
                                    👥 {sq.squad_title} ({sq.members.length} members)
                                  </option>
                                ))
                              : registeredCandidates.map((c) => (
                                  <option key={c.addNo} value={c.addNo}>
                                    👤 {c.name} ({c.addNo})
                                  </option>
                                ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Grade (A/B)</label>
                          <select
                            value={holders.first.grade}
                            onChange={(e) =>
                              setHolders((prev) => ({ ...prev, first: { ...prev.first, grade: e.target.value as GradeSelection } }))
                            }
                            className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                          >
                            <option value="none">No Grade (Base {activeTemplate.first_only} pts)</option>
                            <option value="A">Grade A ({activeTemplate.first_A_grade} pts)</option>
                            <option value="B">Grade B ({activeTemplate.first_B_grade} pts)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* SECOND PLACE */}
                    <div className="bg-white rounded-3xl border border-slate-300 p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-800 bg-slate-200 px-3 py-1 rounded-full border border-slate-300">
                          <Award size={14} className="text-slate-600" />
                          <span>2nd Place Runner-Up</span>
                        </span>
                        <span className="text-xs font-black text-slate-700">
                          +{calculatePoints("second", holders.second.grade)} PTS
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            {selectedProg.is_group_program ? "Select Squad" : "Select Candidate"}
                          </label>
                          <select
                            value={holders.second.addNo}
                            onChange={(e) => {
                              const val = e.target.value;
                              const name = selectedProg.is_group_program
                                ? registeredSquads.find((s) => s.squad_id === val)?.squad_title || val
                                : registeredCandidates.find((c) => c.addNo === val)?.name || val;
                              setHolders((prev) => ({ ...prev, second: { ...prev.second, addNo: val, name } }));
                            }}
                            className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                          >
                            <option value="">-- Choose 2nd Place --</option>
                            {selectedProg.is_group_program
                              ? registeredSquads.map((sq) => (
                                  <option key={sq.squad_id} value={sq.squad_id}>
                                    👥 {sq.squad_title} ({sq.members.length} members)
                                  </option>
                                ))
                              : registeredCandidates.map((c) => (
                                  <option key={c.addNo} value={c.addNo}>
                                    👤 {c.name} ({c.addNo})
                                  </option>
                                ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Grade (A/B)</label>
                          <select
                            value={holders.second.grade}
                            onChange={(e) =>
                              setHolders((prev) => ({ ...prev, second: { ...prev.second, grade: e.target.value as GradeSelection } }))
                            }
                            className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                          >
                            <option value="none">No Grade (Base {activeTemplate.second_only} pts)</option>
                            <option value="A">Grade A ({activeTemplate.second_A_grade} pts)</option>
                            <option value="B">Grade B ({activeTemplate.second_B_grade} pts)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* THIRD PLACE */}
                    <div className="bg-white rounded-3xl border border-orange-200 p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-orange-900 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                          <Award size={14} className="text-orange-600" />
                          <span>3rd Place</span>
                        </span>
                        <span className="text-xs font-black text-orange-700">
                          +{calculatePoints("third", holders.third.grade)} PTS
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            {selectedProg.is_group_program ? "Select Squad" : "Select Candidate"}
                          </label>
                          <select
                            value={holders.third.addNo}
                            onChange={(e) => {
                              const val = e.target.value;
                              const name = selectedProg.is_group_program
                                ? registeredSquads.find((s) => s.squad_id === val)?.squad_title || val
                                : registeredCandidates.find((c) => c.addNo === val)?.name || val;
                              setHolders((prev) => ({ ...prev, third: { ...prev.third, addNo: val, name } }));
                            }}
                            className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                          >
                            <option value="">-- Choose 3rd Place --</option>
                            {selectedProg.is_group_program
                              ? registeredSquads.map((sq) => (
                                  <option key={sq.squad_id} value={sq.squad_id}>
                                    👥 {sq.squad_title} ({sq.members.length} members)
                                  </option>
                                ))
                              : registeredCandidates.map((c) => (
                                  <option key={c.addNo} value={c.addNo}>
                                    👤 {c.name} ({c.addNo})
                                  </option>
                                ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Grade (A/B)</label>
                          <select
                            value={holders.third.grade}
                            onChange={(e) =>
                              setHolders((prev) => ({ ...prev, third: { ...prev.third, grade: e.target.value as GradeSelection } }))
                            }
                            className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                          >
                            <option value="none">No Grade (Base {activeTemplate.third_only} pts)</option>
                            <option value="A">Grade A ({activeTemplate.third_A_grade} pts)</option>
                            <option value="B">Grade B ({activeTemplate.third_B_grade} pts)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* SEPARATE GRADE RECOGNITIONS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* A-GRADE RECOGNITION */}
                      <div className="bg-white rounded-3xl border border-emerald-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase text-emerald-800">Grade A Recognition</span>
                          <span className="text-xs font-black text-emerald-700">+{activeTemplate.A_grade} PTS</span>
                        </div>
                        <select
                          value={holders.aGrade.addNo}
                          onChange={(e) => {
                            const val = e.target.value;
                            const name = selectedProg.is_group_program
                              ? registeredSquads.find((s) => s.squad_id === val)?.squad_title || val
                              : registeredCandidates.find((c) => c.addNo === val)?.name || val;
                            setHolders((prev) => ({ ...prev, aGrade: { ...prev.aGrade, addNo: val, name } }));
                          }}
                          className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                        >
                          <option value="">-- None (No A-Grade Award) --</option>
                          {selectedProg.is_group_program
                            ? registeredSquads.map((sq) => (
                                <option key={sq.squad_id} value={sq.squad_id}>
                                  👥 {sq.squad_title}
                                </option>
                              ))
                            : registeredCandidates.map((c) => (
                                <option key={c.addNo} value={c.addNo}>
                                  👤 {c.name} ({c.addNo})
                                </option>
                              ))}
                        </select>
                      </div>

                      {/* B-GRADE RECOGNITION */}
                      <div className="bg-white rounded-3xl border border-teal-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase text-teal-800">Grade B Recognition</span>
                          <span className="text-xs font-black text-teal-700">+{activeTemplate.B_grade} PTS</span>
                        </div>
                        <select
                          value={holders.bGrade.addNo}
                          onChange={(e) => {
                            const val = e.target.value;
                            const name = selectedProg.is_group_program
                              ? registeredSquads.find((s) => s.squad_id === val)?.squad_title || val
                              : registeredCandidates.find((c) => c.addNo === val)?.name || val;
                            setHolders((prev) => ({ ...prev, bGrade: { ...prev.bGrade, addNo: val, name } }));
                          }}
                          className="w-full p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                        >
                          <option value="">-- None (No B-Grade Award) --</option>
                          {selectedProg.is_group_program
                            ? registeredSquads.map((sq) => (
                                <option key={sq.squad_id} value={sq.squad_id}>
                                  👥 {sq.squad_title}
                                </option>
                              ))
                            : registeredCandidates.map((c) => (
                                <option key={c.addNo} value={c.addNo}>
                                  👤 {c.name} ({c.addNo})
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY & SUBMISSION PANEL (1 COL) */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Zap size={16} className="text-amber-500 fill-amber-500" />
                        <span>Award Allocation Summary</span>
                      </h3>

                      <div className="space-y-2 text-xs">
                        {allocationsSummary.length === 0 ? (
                          <p className="text-slate-400 italic text-center py-4">No positions selected yet.</p>
                        ) : (
                          allocationsSummary.map((a, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-slate-800 truncate">{a.name}</p>
                                <span className="text-[10px] text-slate-500">{a.label}</span>
                              </div>
                              <span className="font-mono font-black text-indigo-600 shrink-0">+{a.points} PTS</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-slate-500 text-xs">Total Disbursed:</span>
                        <span className="text-lg font-black text-indigo-700">
                          {allocationsSummary.reduce((sum, a) => sum + a.points, 0)} PTS
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingResult || allocationsSummary.length === 0}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submittingResult ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Publishing & Reconciling...</span>
                          </>
                        ) : isEditingExisting ? (
                          <>
                            <Edit size={16} />
                            <span>Update Official Result</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Save & Publish Official Result</span>
                          </>
                        )}
                      </button>

                      {isEditingExisting && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteModalState({
                              isOpen: true,
                              progCode: selectedProg.Program_Code,
                              progTitle: selectedProg.Program_Title,
                            })
                          }
                          className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Trash2 size={14} />
                          <span>Delete This Result</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-[11px] text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700">💡 Strict Authoritative Protocol:</p>
                      <p>• Results declared or edited here update candidate records in real time.</p>
                      <p>• Deleting results rolls back student and squad totals with zero phantom points.</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title="Delete Official Result"
        message={`Are you sure you want to delete the result for "${deleteModalState.progTitle}" (${deleteModalState.progCode})? All student points, squad totals, and wing metrics will be authoritatively rolled back.`}
        confirmText="Yes, Delete Result"
        cancelText="Cancel"
        isDeleting={isDeleting}
        onConfirm={() => handleDeleteResult(deleteModalState.progCode)}
        onCancel={() => setDeleteModalState({ isOpen: false, progCode: "", progTitle: "" })}
      />

      {/* PRINT SHEET MODAL */}
      {printModalProgCode && (
        <PrintCandidateSheetModal
          isOpen={Boolean(printModalProgCode)}
          onClose={() => setPrintModalProgCode(null)}
          programCode={printModalProgCode}
          initialProgramTitle={programmes.find((p) => p.Program_Code === printModalProgCode)?.Program_Title}
        />
      )}
    </div>
  );
}
