import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { exportToExcel } from "../../lib/excelService";
import SafeImage from "../../lib/SafeImage";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
import {
  Users,
  UserPlus,
  Trash2,
  Printer,
  FileSpreadsheet,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
} from "lucide-react";

interface ProgrammeDetails {
  Program_Code: string;
  Program_Title: string;
  Category?: string | null;
  WingCode?: string | null;
  Date?: string | null;
  Venue?: string | null;
  Group?: string | null;
  Total_Registration?: number | null;
  is_group_program?: boolean;
  is_topic_required?: boolean;
  isContentRequired?: boolean;
  IsOpenRegistration?: boolean;
}

interface RegisteredCandidate {
  CandidateUUiD: string;
  Program_Code: string;
  Candidate_Code: string;
  squad_uuid?: string | null;
  created_at?: string;
  // Hydrated student info
  studentName?: string;
  studentPhoto?: string | null;
  studentClass?: string | null;
  studentCollege?: string | null;
  squadTitle?: string | null;
  topicTitle?: string | null;
  isTopicApproved?: boolean;
}

interface StudentSearchResult {
  AddNo: string;
  StudentName: string;
  Stn_Class: string | null;
  CollegeName: string | null;
  Student_Photo_Urls: string | null;
}

export default function ManageCandidateRegistrations() {
  const { P_Code, actUser, actWing, actController } = useParams<{
    P_Code?: string;
    actUser?: string;
    actWing?: string;
    actController?: string;
  }>();

  const navigate = useNavigate();
  const meta = useProgrammeMeta();

  // Core Data
  const [programme, setProgramme] = useState<ProgrammeDetails | null>(null);
  const [registeredCandidates, setRegisteredCandidates] = useState<RegisteredCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Candidate Assignment Form State
  const [inputAddNo, setInputAddNo] = useState<string>("");
  const [verifiedStudent, setVerifiedStudent] = useState<StudentSearchResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ type: "success" | "warning" | "error" | "info"; text: string } | null>(null);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState<boolean>(false);
  const [adminCategoryOverride, setAdminCategoryOverride] = useState<boolean>(false);
  const [isCategoryMismatch, setIsCategoryMismatch] = useState<boolean>(false);

  // Search & Filter within registered list
  const [tableSearch, setTableSearch] = useState<string>("");

  // Modals
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState<boolean>(false);
  const [candidateToDelete, setCandidateToDelete] = useState<RegisteredCandidate | null>(null);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState<boolean>(false);

  // Determine back URL based on route context
  const backUrl = useMemo(() => {
    if (actUser) return `/admin-panel/${actUser}/Programmes-List`;
    if (actWing) return `/wing-panel/${actWing}/wing-programmes`;
    if (actController) return `/controller-panel/${actController}/programmes`;
    return -1 as any;
  }, [actUser, actWing, actController]);

  // Role tag
  const roleTag = actUser ? "Admin Authority" : actWing ? "Wing Authority" : "Category Controller";

  // 1. Fetch Programme Details & Registered Candidates
  const loadData = useCallback(async (isSilent = false) => {
    if (!P_Code) {
      setErrorMsg("No Programme Code was provided in the route.");
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg(null);

    try {
      // Step A: Load Programme
      const { data: progData, error: progErr } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("*")
        .eq("Program_Code", P_Code)
        .maybeSingle();

      if (progErr) throw progErr;
      if (!progData) {
        throw new Error(`Programme with code "${P_Code}" was not found.`);
      }

      setProgramme(progData as ProgrammeDetails);

      // Step B: Load Registered Candidates
      const { data: regRows, error: regErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("*")
        .eq("Program_Code", P_Code);

      if (regErr) throw regErr;
      const rawRegs = (regRows as RegisteredCandidate[]) || [];

      // Step C: Hydrate student details
      const addNos = Array.from(new Set(rawRegs.map((r) => r.Candidate_Code).filter(Boolean)));
      let studentMap: Record<string, StudentSearchResult> = {};

      if (addNos.length > 0) {
        const { data: stnRows } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
          .in("AddNo", addNos);

        (stnRows || []).forEach((s: any) => {
          studentMap[s.AddNo] = s;
        });
      }

      // Step D: Hydrate Squads if group program
      const squadIds = Array.from(new Set(rawRegs.map((r) => r.squad_uuid).filter(Boolean))) as string[];
      let squadMap: Record<string, string> = {};
      if (squadIds.length > 0) {
        const { data: sqRows } = await SupaBaseFunction
          .from("SquadMate")
          .select("squad_id, squad_title")
          .in("squad_id", squadIds);

        (sqRows || []).forEach((sq: any) => {
          squadMap[sq.squad_id] = sq.squad_title;
        });
      }

      // Step E: Hydrate Topics if topic required
      let topicsMap: Record<string, { title: string; is_approved: boolean }> = {};
      if (progData.is_topic_required && addNos.length > 0) {
        const { data: topicRows } = await SupaBaseFunction
          .from("Topics_Box")
          .select("student_addNo, topic_title, is_approved")
          .eq("program_code", P_Code)
          .in("student_addNo", addNos);

        (topicRows || []).forEach((t: any) => {
          if (t.student_addNo) {
            topicsMap[t.student_addNo] = {
              title: t.topic_title,
              is_approved: Boolean(t.is_approved),
            };
          }
        });
      }

      // Combine hydrated info
      const hydrated: RegisteredCandidate[] = rawRegs.map((r) => {
        const stn = studentMap[r.Candidate_Code];
        const topic = topicsMap[r.Candidate_Code];
        return {
          ...r,
          studentName: stn?.StudentName || r.Candidate_Code,
          studentPhoto: stn?.Student_Photo_Urls || null,
          studentClass: stn?.Stn_Class || null,
          studentCollege: stn?.CollegeName || null,
          squadTitle: r.squad_uuid ? squadMap[r.squad_uuid] || null : null,
          topicTitle: topic?.title || null,
          isTopicApproved: topic?.is_approved,
        };
      });

      // Sort by Name / AddNo
      hydrated.sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""));
      setRegisteredCandidates(hydrated);

      // Keep Total_Registration synchronized
      if (progData.Total_Registration !== hydrated.length) {
        await SupaBaseFunction
          .from("ProgrammesBox")
          .update({ Total_Registration: hydrated.length })
          .eq("Program_Code", P_Code);
      }
    } catch (err: any) {
      console.error("Error loading candidate registrations:", err);
      setErrorMsg(err.message || "Failed to load candidate registrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [P_Code]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Debounced Student AddNo Lookup for Assign Form
  useEffect(() => {
    const cleanCode = inputAddNo.trim();
    if (!cleanCode) {
      setVerifiedStudent(null);
      setLookupFeedback(null);
      setIsCategoryMismatch(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      setLookupFeedback(null);
      setIsCategoryMismatch(false);

      try {
        // Query StudentsBox
        const { data: stn, error: stnErr } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
          .ilike("AddNo", cleanCode)
          .maybeSingle();

        if (stnErr) throw stnErr;

        if (!stn) {
          setVerifiedStudent(null);
          setLookupFeedback({
            type: "error",
            text: `No student found with admission code: "${cleanCode}".`,
          });
          return;
        }

        setVerifiedStudent(stn as StudentSearchResult);

        // Check if ALREADY registered in this programme
        const isAlready = registeredCandidates.some(
          (c) => c.Candidate_Code.toUpperCase() === stn.AddNo.toUpperCase()
        );

        if (isAlready) {
          setLookupFeedback({
            type: "warning",
            text: `⚠️ ${stn.StudentName} (#${stn.AddNo}) is ALREADY registered in this programme.`,
          });
          return;
        }

        // Category Bonding Check
        if (programme?.Category) {
          const progCatId = programme.Category;
          const progCatTitle = meta.categoryMap[progCatId] || progCatId;

          if (
            progCatTitle &&
            progCatTitle.toLowerCase() !== "general" &&
            progCatTitle.toLowerCase() !== "all"
          ) {
            // Find student's category
            const classId = stn.Stn_Class;
            const matchedClass = meta.classes.find(
              (c) =>
                (classId && c.class_id === classId) ||
                (classId && (c.standard_name === classId || c.class_nick_name === classId))
            );
            const resolvedClassId = matchedClass?.class_id || classId;

            let studentCatTitle = "";
            let studentCatId = "";
            if (resolvedClassId) {
              const cat = meta.categories.find(
                (c) =>
                  c.class_1 === resolvedClassId ||
                  c.class_2 === resolvedClassId ||
                  c.class_3 === resolvedClassId
              );
              if (cat) {
                studentCatTitle = cat.category_title;
                studentCatId = cat.category_id;
              }
            }

            const isMatch =
              studentCatId === progCatId ||
              (studentCatTitle && studentCatTitle.toLowerCase().trim() === progCatTitle.toLowerCase().trim());

            if (!isMatch && studentCatTitle) {
              setIsCategoryMismatch(true);
              setLookupFeedback({
                type: "warning",
                text: `⚠️ Category Mismatch: Programme is for "${progCatTitle}". ${stn.StudentName} is in "${studentCatTitle}". (Admin override available)`,
              });
              return;
            }
          }
        }

        // Verified and eligible!
        setLookupFeedback({
          type: "success",
          text: `✅ Verified: ${stn.StudentName} (${stn.Stn_Class || "No class"}) is eligible to be assigned.`,
        });
      } catch (err: any) {
        console.error("Lookup error:", err);
        setLookupFeedback({
          type: "error",
          text: "Verification failed. Check network connection.",
        });
      } finally {
        setIsLookingUp(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputAddNo, programme, registeredCandidates, meta]);

  // 3. Main Assign Candidate Action
  const handleAssignCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedStudent || !programme) return;

    // Guard against category mismatch without explicit override
    if (isCategoryMismatch && !adminCategoryOverride) {
      alert("Please check 'Admin Override' to assign a candidate from a different category.");
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const payload = {
        Program_Code: programme.Program_Code,
        Candidate_Code: verifiedStudent.AddNo,
      };

      const { data: inserted, error: insertErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert([payload])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Increment count in ProgrammesBox
      const newTotal = registeredCandidates.length + 1;
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", programme.Program_Code);

      // Add to local state
      const newReg: RegisteredCandidate = {
        CandidateUUiD: inserted.CandidateUUiD || String(Date.now()),
        Program_Code: programme.Program_Code,
        Candidate_Code: verifiedStudent.AddNo,
        studentName: verifiedStudent.StudentName,
        studentPhoto: verifiedStudent.Student_Photo_Urls,
        studentClass: verifiedStudent.Stn_Class,
        studentCollege: verifiedStudent.CollegeName,
        created_at: new Date().toISOString(),
      };

      setRegisteredCandidates((prev) => [newReg, ...prev]);
      setProgramme((prev) => (prev ? { ...prev, Total_Registration: newTotal } : prev));

      // Reset form
      setInputAddNo("");
      setVerifiedStudent(null);
      setLookupFeedback({
        type: "success",
        text: `🎉 Successfully assigned ${verifiedStudent.StudentName} (#${verifiedStudent.AddNo})!`,
      });
      setAdminCategoryOverride(false);
      setIsCategoryMismatch(false);
    } catch (err: any) {
      console.error("Assign error:", err);
      alert(`Could not assign candidate: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // 4. Remove / Unregister Candidate Action
  const handleConfirmDelete = async () => {
    if (!candidateToDelete || !programme) return;

    setIsDeletingCandidate(true);
    try {
      const { error: delErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .delete()
        .eq("CandidateUUiD", candidateToDelete.CandidateUUiD);

      if (delErr) throw delErr;

      // Decrement Total_Registration in ProgrammesBox
      const newTotal = Math.max(0, registeredCandidates.length - 1);
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", programme.Program_Code);

      setRegisteredCandidates((prev) =>
        prev.filter((c) => c.CandidateUUiD !== candidateToDelete.CandidateUUiD)
      );
      setProgramme((prev) => (prev ? { ...prev, Total_Registration: newTotal } : prev));
      setCandidateToDelete(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`Failed to remove candidate: ${err.message}`);
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  // 5. Excel Export
  const handleExportExcel = () => {
    if (registeredCandidates.length === 0) {
      alert("No registered candidates to export.");
      return;
    }

    const rows = registeredCandidates.map((c, idx) => ({
      "Sr No": idx + 1,
      "Admission No (AddNo)": c.Candidate_Code,
      "Student Name": c.studentName || c.Candidate_Code,
      "Class": c.studentClass || "N/A",
      "College / Institution": c.studentCollege || "N/A",
      "Programme Code": programme?.Program_Code || "",
      "Programme Title": programme?.Program_Title || "",
      "Squad / Group": c.squadTitle || "Individual",
      "Topic Title": c.topicTitle || "N/A",
      "Topic Approved": c.isTopicApproved ? "Approved" : "Pending / N/A",
    }));

    exportToExcel(rows, `${programme?.Program_Code || "programme"}_registered_candidates`);
  };

  // Filtered registered candidates for table
  const filteredCandidates = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return registeredCandidates;
    return registeredCandidates.filter((c) => {
      const code = (c.Candidate_Code || "").toLowerCase();
      const name = (c.studentName || "").toLowerCase();
      const cls = (c.studentClass || "").toLowerCase();
      const sq = (c.squadTitle || "").toLowerCase();
      const top = (c.topicTitle || "").toLowerCase();
      return code.includes(q) || name.includes(q) || cls.includes(q) || sq.includes(q) || top.includes(q);
    });
  }, [registeredCandidates, tableSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading registrations for {P_Code}...</p>
      </div>
    );
  }

  if (errorMsg || !programme) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-black text-slate-900">Registration Portal Error</h2>
        <p className="text-sm text-slate-600">{errorMsg || "Programme not found."}</p>
        <button
          type="button"
          onClick={() => {
            if (typeof backUrl === "string") navigate(backUrl);
            else navigate(-1);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Programmes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (typeof backUrl === "string") navigate(backUrl);
                  else navigate(-1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-xs transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Programmes Directory</span>
              </button>

              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-400/20">
                {roleTag}
              </span>

              <span className="text-[10px] font-mono font-bold bg-white/15 text-white px-2.5 py-1 rounded-md">
                {programme.Program_Code}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>{programme.Program_Title}</span>
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap pt-1">
              <span className="flex items-center gap-1">
                <Building2 size={13} className="text-indigo-400" />
                <span>Wing: {meta.wingMap[programme.WingCode || ""] || programme.WingCode || "Campus"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Category: {meta.categoryMap[programme.Category || ""] || programme.Category || "All / General"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-amber-400" />
                <span>Date: {formatResultDate(programme.Date)}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-rose-400" />
                <span>Venue: {meta.venueMap[programme.Venue || ""] || programme.Venue || "Campus Venue"}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsPrintSheetOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer active:scale-95"
              title="Print Official A4 Registered Candidate Sheet"
            >
              <Printer size={15} />
              <span>Print Sheet (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
              title="Download registration list as Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              <span>Excel Export</span>
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Refresh registration data"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Live Counters Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 mt-6 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Registered</span>
            <span className="text-xl font-black text-white">{registeredCandidates.length} Candidates</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Format</span>
            <span className="text-xl font-black text-white">{programme.is_group_program ? "Group Event" : "Individual"}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Registration Status</span>
            <span className={`text-xl font-black ${programme.IsOpenRegistration !== false ? "text-emerald-400" : "text-amber-400"}`}>
              {programme.IsOpenRegistration !== false ? "Open" : "Closed"}
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Requirements</span>
            <span className="text-xl font-black text-white">
              {programme.is_topic_required ? "Topic" : ""}{programme.is_topic_required && programme.isContentRequired ? " + " : ""}{programme.isContentRequired ? "Content" : !programme.is_topic_required ? "Standard" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workflow: Assign Candidate Form & Registered Candidates Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Assign Any Candidate by AddNo (Admin / Wing exclusive) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-1.5">
              <UserPlus size={12} />
              <span>Manager Tool</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Assign Candidate by AddNo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Administrators and Wing managers can assign any student to this event by typing their Admission Number.
            </p>
          </div>

          <form onSubmit={handleAssignCandidate} className="space-y-4">
            {/* Input AddNo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Candidate Admission No (AddNo) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. U1476, U1541, U1604..."
                  value={inputAddNo}
                  onChange={(e) => setInputAddNo(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-slate-300 p-3.5 pl-4 pr-10 text-slate-900 font-mono font-bold text-sm placeholder-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition bg-white"
                />
                {isLookingUp && (
                  <div className="absolute right-3.5 top-3.5">
                    <RefreshCw size={18} className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Live Verification Box */}
            {lookupFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold border flex items-start gap-2.5 transition-all ${
                  lookupFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : lookupFeedback.type === "warning"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {lookupFeedback.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="leading-snug">{lookupFeedback.text}</p>
                </div>
              </div>
            )}

            {/* Verified Student Details Card */}
            {verifiedStudent && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100/80 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {verifiedStudent.Student_Photo_Urls ? (
                    <SafeImage
                      src={verifiedStudent.Student_Photo_Urls}
                      alt={verifiedStudent.StudentName}
                      fallbackCategory="student"
                      fallbackText={verifiedStudent.StudentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{verifiedStudent.StudentName[0]}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-slate-900 text-sm truncate">
                    {verifiedStudent.StudentName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-500">
                    <span className="font-mono font-bold text-indigo-700">#{verifiedStudent.AddNo}</span>
                    <span>•</span>
                    <span className="font-bold">{verifiedStudent.Stn_Class || "Unassigned Class"}</span>
                    {verifiedStudent.CollegeName && (
                      <>
                        <span>•</span>
                        <span className="truncate">{verifiedStudent.CollegeName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Category Mismatch Admin Override Checkbox */}
            {isCategoryMismatch && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminCategoryOverride}
                  onChange={(e) => setAdminCategoryOverride(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Authorize Admin Category Override for this student</span>
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                !verifiedStudent ||
                isSubmittingAssign ||
                Boolean(lookupFeedback?.type === "warning" && lookupFeedback.text.includes("ALREADY")) ||
                (isCategoryMismatch && !adminCategoryOverride)
              }
              className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md ${
                !verifiedStudent || (isCategoryMismatch && !adminCategoryOverride)
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white shadow-indigo-600/25 cursor-pointer"
              }`}
            >
              {isSubmittingAssign ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Assigning Candidate...</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Confirm & Assign Candidate</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Currently Registered Candidates Management Table */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Registered Candidates
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-extrabold">
                  {registeredCandidates.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official candidate roster enrolled in this competition.
              </p>
            </div>

            {/* Search filter input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by name, AddNo..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition bg-slate-50"
              />
            </div>
          </div>

          {/* Table */}
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
              <Users size={32} className="mx-auto text-slate-400" />
              <h3 className="font-bold text-slate-700 text-sm">No Registered Candidates Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {registeredCandidates.length === 0
                  ? "No candidates are enrolled in this programme yet. Assign students using the form on the left."
                  : "No registered students matched your search criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Class</th>
                    {programme.is_topic_required && <th className="py-3 px-3">Topic</th>}
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredCandidates.map((c, idx) => (
                    <tr key={c.CandidateUUiD} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {c.studentPhoto ? (
                              <SafeImage
                                src={c.studentPhoto}
                                alt={c.studentName || c.Candidate_Code}
                                fallbackCategory="student"
                                fallbackText={c.studentName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{(c.studentName || c.Candidate_Code)[0]}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 truncate" title={c.studentName}>
                              {c.studentName || c.Candidate_Code}
                            </p>
                            <span className="font-mono text-[10px] text-indigo-700 font-bold block">
                              #{c.Candidate_Code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] whitespace-nowrap">
                          {c.studentClass || "General"}
                        </span>
                      </td>

                      {programme.is_topic_required && (
                        <td className="py-3 px-3">
                          {c.topicTitle ? (
                            <div className="min-w-[120px] max-w-[180px]">
                              <span className="font-bold text-slate-800 text-[11px] truncate block" title={c.topicTitle}>
                                {c.topicTitle}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                  c.isTopicApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {c.isTopicApproved ? "Approved" : "Pending"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold">Not registered</span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setCandidateToDelete(c)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove candidate from this event"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Removing Candidate */}
      <ConfirmDeleteModal
        isOpen={Boolean(candidateToDelete)}
        onCancel={() => setCandidateToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Candidate from Programme"
        message={`Are you sure you want to unregister ${candidateToDelete?.studentName || candidateToDelete?.Candidate_Code} (#${candidateToDelete?.Candidate_Code}) from ${programme.Program_Title}?`}
        itemDescription={candidateToDelete?.studentName || candidateToDelete?.Candidate_Code || "Candidate"}
        isDeleting={isDeletingCandidate}
      />

      {/* Print Candidate Sheet Modal */}
      {isPrintSheetOpen && (
        <PrintCandidateSheetModal
          isOpen={isPrintSheetOpen}
          onClose={() => setIsPrintSheetOpen(false)}
          programCode={programme.Program_Code}
          initialProgramTitle={programme.Program_Title}
        />
      )}
    </div>
  );
}
