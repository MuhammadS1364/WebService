import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";
import SafeImage from "../../lib/SafeImage";
import { resolveStudentProfile, type LoggedInStudentProfile } from "../../lib/accountResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import type { ContentTableRecord } from "../../lib/types";
import {
  GraduationCap,
  Award,
  Compass,
  Zap,
  LayoutGrid,
  List,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Calendar,
  Building2,
  Heart,
  Loader2,
} from "lucide-react";

// --- Type Definitions ---
interface Student extends LoggedInStudentProfile {
  Grand_Total_Points?: number;
  Registration_Count?: number;
  OutReach_Count?: number;
  Achievements_Counts?: number;
  Total_Point_Anjuman?: number;
}

interface EnrolledProgram {
  Program_Code: string;
  Program_Title: string;
  Program_Poster?: string;
  Description?: string;
  Category?: string;
  Group?: string;
  WingCode?: string;
  Venue?: string;
  Date?: string;
  IsConducted: boolean;
  IsResultPublished: boolean;
  isContentRequired?: boolean;
  ContentSubmition_deadLine?: string | null;
}

interface Achievement {
  Achieve_Id: string;
  Achievement_Title: string;
  Position_Achieved: string;
  Point_Obtained: number;
}

interface Outreach {
  OutReach_Id: string;
  OutReach_Title: string;
  OutReach_Type: string;
  Point_Obtained: number;
}

export default function StudentAnalytics() {
  const { actStn } = useParams<{ actStn: string }>();
  const meta = useProgrammeMeta();

  const [student, setStudent] = useState<Student | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !localStorage.getItem("cached_student_profile"));
  const [programs, setPrograms] = useState<EnrolledProgram[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [programFilter, setProgramFilter] = useState<string>("All");

  // View Mode: Cards vs Table Row View
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Content Submissions
  const [submittedContents, setSubmittedContents] = useState<Record<string, ContentTableRecord>>({});
  const [contentModal, setContentModal] = useState<{
    isOpen: boolean;
    program: EnrolledProgram | null;
    contentTitle: string;
    submitting: boolean;
    error: string | null;
    success: string | null;
  }>({
    isOpen: false,
    program: null,
    contentTitle: "",
    submitting: false,
    error: null,
    success: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchStudentData = async (silent = false) => {
      if (!silent && !student) {
        setLoading(true);
      }
      try {
        const studentData = await resolveStudentProfile(actStn);
        if (!studentData) throw new Error("Student not found");

        if (isMounted) {
          setStudent(studentData as Student);
        }

        const addNo = studentData.AddNo;

        // Fetch registered programmes
        const { data: registrations } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", addNo);

        const programCodes = registrations?.map((reg: { Program_Code: string }) => reg.Program_Code) || [];

        if (programCodes.length > 0) {
          const { data: programsData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .in("Program_Code", programCodes);
          if (isMounted) setPrograms((programsData as EnrolledProgram[]) || []);

          // Fetch student submissions from Content_Table
          const { data: contentData } = await SupaBaseFunction
            .from("Content_Table")
            .select("*")
            .eq("student_addNo", addNo);

          if (isMounted && contentData) {
            const cMap: Record<string, ContentTableRecord> = {};
            contentData.forEach((c: any) => {
              if (c.programe_code) {
                cMap[c.programe_code] = c;
              }
            });
            setSubmittedContents(cMap);
          }
        }

        const { data: outreachData } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("StnAddNo", addNo);
        if (isMounted) setOutreach(outreachData || []);

        const { data: achievementsData } = await SupaBaseFunction
          .from("StudentsAchievements")
          .select("*")
          .eq("StnAddNo", addNo);
        if (isMounted) setAchievements(achievementsData || []);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error fetching student analytics:", errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudentData(Boolean(student));

    const handleProfileSync = () => {
      fetchStudentData(true);
    };
    window.addEventListener("student-profile-synced", handleProfileSync);

    return () => {
      isMounted = false;
      window.removeEventListener("student-profile-synced", handleProfileSync);
    };
  }, [actStn]);

  const programGroups = useMemo(() => {
    return ["All", ...Array.from(new Set(programs.map((p) => p.Group).filter(Boolean)))];
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    return programFilter === "All" ? programs : programs.filter((p) => p.Group === programFilter);
  }, [programs, programFilter]);

  // Check if deadline is open or expired
  const isSubmissionOpen = (prog: EnrolledProgram) => {
    if (!prog.isContentRequired) return false;
    if (!prog.ContentSubmition_deadLine) return true;

    const todayStr = new Date().toISOString().split("T")[0];
    return todayStr <= prog.ContentSubmition_deadLine;
  };

  // Open modal to submit content
  const handleOpenContentModal = (prog: EnrolledProgram) => {
    setContentModal({
      isOpen: true,
      program: prog,
      contentTitle: "",
      submitting: false,
      error: null,
      success: null,
    });
  };

  // Submit content handler
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentModal.program || !student?.AddNo) return;

    if (!contentModal.contentTitle.trim()) {
      setContentModal((prev) => ({ ...prev, error: "Content Title is required." }));
      return;
    }

    if (!isSubmissionOpen(contentModal.program)) {
      setContentModal((prev) => ({
        ...prev,
        error: "Content submission deadline has passed. Submissions are closed.",
      }));
      return;
    }

    setContentModal((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const payload = {
        content_title: contentModal.contentTitle.trim(),
        programe_code: contentModal.program.Program_Code,
        student_addNo: student.AddNo,
        like_count: 0,
      };

      const { data, error } = await SupaBaseFunction
        .from("Content_Table")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setSubmittedContents((prev) => ({
        ...prev,
        [contentModal.program!.Program_Code]: data as ContentTableRecord,
      }));

      setContentModal((prev) => ({
        ...prev,
        submitting: false,
        success: "Content submitted successfully!",
      }));

      setTimeout(() => {
        setContentModal({
          isOpen: false,
          program: null,
          contentTitle: "",
          submitting: false,
          error: null,
          success: null,
        });
      }, 1500);
    } catch (err: any) {
      setContentModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || "Failed to submit content.",
      }));
    }
  };

  // Programs requiring content
  const pendingContentPrograms = useMemo(() => {
    return programs.filter(
      (p) => p.isContentRequired && !submittedContents[p.Program_Code] && isSubmissionOpen(p)
    );
  }, [programs, submittedContents]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800">Student Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">Please ensure your account credentials are valid.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-28 font-sans px-1 sm:px-2">
      {/* HEADER HERO */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left min-w-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
            {student.Student_Photo_Urls ? (
              <SafeImage
                src={student.Student_Photo_Urls}
                alt={student.StudentName}
                fallbackCategory="student"
                fallbackText={student.StudentName}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-2xl flex items-center justify-center">
                {(student.StudentName || "S")[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              {student.StudentName}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {student.Class || "Student"} | {student.CollegeName || "Darul Huda Islamic University"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-0.5 rounded-full text-xs font-semibold">
              <span>ID:</span>
              <span className="font-mono">{student.AddNo}</span>
            </div>
          </div>
        </div>

        {/* Grand Total Points Badge */}
        <div className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shrink-0 shadow-xs flex sm:flex-col items-center justify-between sm:justify-center gap-1 min-w-[150px]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</p>
          <p className="text-3xl sm:text-4xl font-black text-indigo-600 flex items-center gap-1">
            <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
            {student.Grand_Total_Points || 0}
          </p>
          <span className="text-[10px] font-bold text-slate-400">Total Points</span>
        </div>
      </div>

      {/* OVERVIEW STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <OverviewClipBox
          BoxTitle="Events Joined"
          BoxValue={programs.length}
          BoxSvgLogo={<GraduationCap className="w-5 h-5 text-indigo-600" />}
        />
        <OverviewClipBox
          BoxTitle="Achievements"
          BoxValue={achievements.length}
          BoxSvgLogo={<Award className="w-5 h-5 text-amber-500" />}
        />
        <OverviewClipBox
          BoxTitle="Outreach"
          BoxValue={outreach.length}
          BoxSvgLogo={<Compass className="w-5 h-5 text-cyan-600" />}
        />
        <OverviewClipBox
          BoxTitle="Anjuman Points"
          BoxValue={student.Total_Point_Anjuman || 0}
          BoxSvgLogo={<Zap className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* ACTION REQUIRED: PENDING CONTENT SUBMISSIONS BANNER */}
      {pendingContentPrograms.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-xl shadow-2xs">
                <FileText size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Required Content Submission ({pendingContentPrograms.length} Pending)
                </h3>
                <p className="text-xs text-amber-800">
                  You are registered in programmes requiring content submission before the designated deadline.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingContentPrograms.map((prog) => (
              <div
                key={prog.Program_Code}
                className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 block">
                    #{prog.Program_Code}
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate" title={prog.Program_Title}>
                    {prog.Program_Title}
                  </p>
                  <span className="text-[11px] text-amber-800 flex items-center gap-1 mt-0.5 font-medium">
                    <Clock size={12} /> Deadline: {prog.ContentSubmition_deadLine || "TBA"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenContentModal(prog)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Send size={12} /> Submit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & PROGRAMMES LIST WITH VIEW TOGGLE (CARD & TABLE ROW VIEW) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Enrolled Activities ({filteredPrograms.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Switch between interactive grid cards or compact tabular rows
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {programGroups.map((group) => (
                <button
                  key={group}
                  onClick={() => setProgramFilter(String(group))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                    programFilter === group
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>

            {/* View Mode Switcher Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === "card"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table Row View"
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <p className="text-xs text-slate-400 py-10 text-center font-medium">
            No programmes enrolled under this category.
          </p>
        ) : viewMode === "card" ? (
          /* --- 1. CARD VIEW (GRID OF CARDS) --- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((prog) => {
              const submission = submittedContents[prog.Program_Code];
              const isRequired = Boolean(prog.isContentRequired);
              const isOpen = isSubmissionOpen(prog);

              return (
                <div
                  key={prog.Program_Code}
                  className="border border-slate-200/90 rounded-3xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-300 bg-white flex flex-col justify-between group"
                >
                  {/* Poster / Image Display */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <SafeImage
                      src={prog.Program_Poster}
                      alt={prog.Program_Title || prog.Program_Code}
                      fallbackCategory="programme"
                      fallbackText={prog.Program_Title || prog.Program_Code}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs">
                        {prog.Group || "General"}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[10px] font-mono font-bold text-white bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        #{prog.Program_Code}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        {prog.WingCode && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                            {meta.wingMap[prog.WingCode] || prog.WingCode}
                          </span>
                        )}
                        {prog.Category && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                            {meta.categoryMap[prog.Category] || prog.Category}
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-sm font-bold text-slate-900 leading-snug line-clamp-2"
                        title={prog.Program_Title}
                      >
                        {prog.Program_Title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {prog.Description || "No description provided."}
                      </p>

                      {/* Metadata chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                        {prog.Date && (
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Calendar size={11} className="text-indigo-500" /> {prog.Date}
                          </span>
                        )}
                        {prog.Venue && (
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Building2 size={11} className="text-slate-400" /> {meta.venueMap[prog.Venue] || prog.Venue}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Submission Status on Card */}
                    {isRequired && (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <FileText size={12} className="text-amber-600" /> Content Submission:
                          </span>
                          {prog.ContentSubmition_deadLine && (
                            <span className="text-[10px] text-amber-700 font-semibold">
                              Due: {prog.ContentSubmition_deadLine}
                            </span>
                          )}
                        </div>

                        {submission ? (
                          <div className="flex items-center justify-between bg-white text-emerald-800 p-2 rounded-xl text-[11px] border border-emerald-200 font-semibold">
                            <span className="flex items-center gap-1 truncate" title={submission.content_title || ""}>
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              Submitted: {submission.content_title}
                            </span>
                            <span className="flex items-center gap-0.5 text-rose-600 text-[10px] shrink-0 font-bold">
                              <Heart size={11} className="fill-rose-500" /> {submission.like_count || 0}
                            </span>
                          </div>
                        ) : isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleOpenContentModal(prog)}
                            className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Send size={12} /> Submit Required Content
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-400 bg-white p-1.5 rounded-xl text-center border border-slate-200 font-medium">
                            Submission Closed (Deadline Passed)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer status */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{prog.Category ? meta.categoryMap[prog.Category] || prog.Category : "Standard"}</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${
                          prog.IsConducted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {prog.IsConducted ? "Conducted" : "Upcoming"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* --- 2. TABLE ROW VIEW (COMPACT TABULAR LIST) --- */
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Program & Code</th>
                  <th className="py-3 px-3">Group & Wing</th>
                  <th className="py-3 px-3">Date & Venue</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Content Submission</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPrograms.map((prog) => {
                  const submission = submittedContents[prog.Program_Code];
                  const isRequired = Boolean(prog.isContentRequired);
                  const isOpen = isSubmissionOpen(prog);

                  return (
                    <tr
                      key={prog.Program_Code}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Title & Code with Poster Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-900 overflow-hidden shrink-0 shadow-2xs border border-slate-200">
                            <SafeImage
                              src={prog.Program_Poster}
                              alt={prog.Program_Title}
                              fallbackCategory="programme"
                              fallbackText={prog.Program_Title || prog.Program_Code}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-indigo-600 block text-[11px]">
                              #{prog.Program_Code}
                            </span>
                            <span
                              className="font-bold text-slate-900 block truncate max-w-xs"
                              title={prog.Program_Title}
                            >
                              {prog.Program_Title}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Group & Wing */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {prog.Group || "General"}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {prog.WingCode ? meta.wingMap[prog.WingCode] || prog.WingCode : "General"}
                        </span>
                      </td>

                      {/* Date & Venue */}
                      <td className="py-3.5 px-3">
                        <span className="text-slate-700 block font-medium">
                          {prog.Date || "TBA"}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {prog.Venue ? meta.venueMap[prog.Venue] || prog.Venue : "Campus Venue"}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {prog.Category ? meta.categoryMap[prog.Category] || prog.Category : "Standard"}
                        </span>
                      </td>

                      {/* Content Submission Status */}
                      <td className="py-3.5 px-3">
                        {isRequired ? (
                          submission ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span className="truncate max-w-[120px]" title={submission.content_title || ""}>
                                Submitted
                              </span>
                            </div>
                          ) : isOpen ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <Clock size={11} /> Required
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Closed (Expired)</span>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Event Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            prog.IsConducted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {prog.IsConducted ? "Conducted" : "Upcoming"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isRequired && !submission && isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleOpenContentModal(prog)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                          >
                            Submit
                          </button>
                        ) : submission ? (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                            <Heart size={11} className="text-rose-500 fill-rose-500" />
                            {submission.like_count || 0}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: SUBMIT CONTENT (Content_Table) */}
      {contentModal.isOpen && contentModal.program && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Submit Programme Content
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setContentModal((prev) => ({ ...prev, isOpen: false, error: null }))
                }
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <span className="font-mono text-indigo-600 font-bold block">
                #{contentModal.program.Program_Code}
              </span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {contentModal.program.Program_Title}
              </p>
              {contentModal.program.ContentSubmition_deadLine && (
                <span className="text-amber-800 block mt-1 font-medium">
                  Deadline: {contentModal.program.ContentSubmition_deadLine}
                </span>
              )}
            </div>

            {contentModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-500" />
                <span>{contentModal.error}</span>
              </div>
            )}

            {contentModal.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <span>{contentModal.success}</span>
              </div>
            )}

            <form onSubmit={handleSubmitContent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Content Title / Topic / Submission Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Essay on Islamic Heritage, Speech Notes, Presentation Topic..."
                  value={contentModal.contentTitle}
                  onChange={(e) =>
                    setContentModal((prev) => ({ ...prev, contentTitle: e.target.value }))
                  }
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-semibold transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setContentModal((prev) => ({ ...prev, isOpen: false, error: null }))
                  }
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={contentModal.submitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {contentModal.submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Content
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
