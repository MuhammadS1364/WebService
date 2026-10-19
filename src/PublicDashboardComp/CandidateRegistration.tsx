import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { resolveStudentProfile } from "../lib/accountResolver";
import PrintCandidateSheetModal from "../components/PrintCandidateSheetModal";
import TopicRegistrationModal from "../components/TopicRegistrationModal";
import {
  Printer,
  FileText,
  Sparkles,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Eye,
  ExternalLink,
  Clock,
  BookOpen,
  Users,
} from "lucide-react";

// Define the shape of your program data
interface ProgramDetails {
  Program_Code: string;
  Program_Title: string;
  Category?: string;
  WingCode?: string;
  Date?: string;
  Venue?: string;
  Total_Registration?: number;
  is_topic_required?: boolean;
  IsOpenRegistration?: boolean;
  is_group_program?: boolean;
  is_limitation?: boolean;
  individual_limit_count?: number;
  group_limit_count?: number;
  is_topic?: boolean;
  topic_title?: string;
  drive_link?: string;
  Expected_Time?: string;
}

// Define the shape of your status alerts
interface StatusState {
  type: string;
  text: string;
}

export default function CandidateRegistration() {
  const meta = useProgrammeMeta();
  const { P_Code, actStn } = useParams<{ P_Code?: string; actStn?: string }>();
  const navigate = useNavigate();

  // Core Data States
  const [programDetails, setProgramDetails] = useState<ProgramDetails | null>(null);
  const [candidateCode, setCandidateCode] = useState<string>("");
  const [verifiedStudent, setVerifiedStudent] = useState<any>(null);
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [studentName, setStudentName] = useState<string>("");
  const [isStudent, setIsStudent] = useState<boolean>(true);
  const [loggedInStudent, setLoggedInStudent] = useState<{
    AddNo: string;
    StudentName: string;
    Stn_Class?: string | null;
  } | null>(null);

  // UI/UX Status States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [categoryMismatch, setCategoryMismatch] = useState<boolean>(false);
  const [isLimitReached, setIsLimitReached] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusState>({ type: "", text: "" });
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState<boolean>(false);
  const [canPrintSheet, setCanPrintSheet] = useState<boolean>(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState<boolean>(false);
  const [lastRegisteredStudent, setLastRegisteredStudent] = useState<string>("");

  // 1. Resolve Logged-in Student Profile (Dynamic AddNo prefill & Readonly lock)
  useEffect(() => {
    async function resolveCurrentStudent() {
      try {
        let identifier = actStn;

        // If no actStn in URL, check localStorage
        if (!identifier) {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            const role = (parsed.role || parsed.UserRole || "").toLowerCase();
            if (role === "student" || !role) {
              identifier = parsed.UserEmail || parsed.UserId;
            }
          }
        }

        // Check cached profile first
        const cached = localStorage.getItem("cached_student_profile");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.AddNo) {
              setLoggedInStudent(parsed);
              setCandidateCode(parsed.AddNo);
              setIsStudent(true);
            }
          } catch {}
        }

        if (identifier) {
          const profile = await resolveStudentProfile(identifier);
          if (profile?.AddNo) {
            setLoggedInStudent({
              AddNo: profile.AddNo,
              StudentName: profile.StudentName || profile.AddNo,
              Stn_Class: (profile as any).Stn_Class || (profile as any).Class || null,
            });
            setCandidateCode(profile.AddNo);
            setIsStudent(true);
          }
        }
      } catch (e) {
        console.error("Could not resolve student:", e);
      }
    }

    resolveCurrentStudent();
  }, [actStn]);

  // Check Print permissions (Admins/Wings)
  useEffect(() => {
    try {
      const cachedWing = localStorage.getItem("cached_wing_profile");
      if (cachedWing) {
        setCanPrintSheet(true);
        return;
      }
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const role = (parsed.role || parsed.UserRole || "").toLowerCase();
        if (role === "admin" || role === "wing" || role === "manager" || role === "program manager") {
          setCanPrintSheet(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setCanPrintSheet(false);
  }, []);

  // ----------------------------------------
  // 2. Fetch current program info 
  // ----------------------------------------
  useEffect(() => {
    async function fetchProgram() {
      if (!P_Code) {
        setStatus({ type: "error", text: "Program Code missing from URL. Check your Router setup." });
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Category, WingCode, Date, Venue, Total_Registration, is_topic_required, IsOpenRegistration, is_group_program, is_limitation, individual_limit_count, group_limit_count, is_topic, topic_title, drive_link, Expected_Time")
          .eq("Program_Code", P_Code)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setProgramDetails(data as ProgramDetails);
        } else {
          setStatus({ type: "error", text: `No program found with code: ${P_Code}` });
        }
      } catch (err) {
        console.error("Error fetching program details:", err);
        setStatus({ type: "error", text: "Failed to load program metadata. Check your column names in Supabase." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgram();
  }, [P_Code]);

  // ----------------------------------------
  // 3. Real-time Student Lookup Validation
  // ----------------------------------------
  const contextRef = useRef({ programDetails, meta });
  contextRef.current = { programDetails, meta };

  useEffect(() => {
    const clean = candidateCode.trim();
    if (!clean) {
      setStudentName("");
      setIsDuplicate(false);
      setCategoryMismatch(false);
      setStudentSuggestions([]);
      setVerifiedStudent(null);
      return;
    }

    // Prevent re-querying if this exact student is already verified
    if (verifiedStudent && verifiedStudent.AddNo.toUpperCase() === clean.toUpperCase()) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setStudentName("Checking system registry...");
        setIsDuplicate(false);
        setCategoryMismatch(false);
        setStudentSuggestions([]);

        const { programDetails: curProg, meta: curMeta } = contextRef.current;

        // Step A: Check if the student exists in StudentsBox by exact AddNo first
        let studentData: any = null;
        const { data: byAddNo } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class")
          .ilike("AddNo", clean)
          .maybeSingle();

        if (byAddNo) {
          studentData = byAddNo;
        } else {
          // Search by student name or partial AddNo
          const { data: searchResults } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Stn_Class")
            .or(`StudentName.ilike.%${clean}%,AddNo.ilike.%${clean}%`)
            .limit(6);

          if (searchResults && searchResults.length === 1) {
            studentData = searchResults[0];
          } else if (searchResults && searchResults.length > 1) {
            setStudentSuggestions(searchResults);
            setVerifiedStudent(null);
            setStudentName(`ℹ️ Found ${searchResults.length} matching students. Please select below:`);
            return;
          }
        }

        if (!studentData) {
          setVerifiedStudent(null);
          setStudentName("❌ Student record not found (search by AddNo or Student Name)");
          return;
        }

        const resolvedAddNo = studentData.AddNo.toUpperCase();
        setVerifiedStudent(studentData);

        // Step B: Category Bonding Check
        if (curProg?.Category) {
          const progCatId = curProg.Category;
          const progCatTitle = curMeta.categoryMap[progCatId] || progCatId;

          if (
            progCatTitle &&
            progCatTitle.toLowerCase() !== "general" &&
            progCatTitle.toLowerCase() !== "all"
          ) {
            // Find student's category
            const classId = studentData.Stn_Class;
            const matchedClass = curMeta.classes.find(
              (c) =>
                (classId && c.class_id === classId) ||
                (classId && (c.standard_name === classId || c.class_nick_name === classId))
            );
            const resolvedClassId = matchedClass?.class_id || classId;
            const className = matchedClass?.standard_name || matchedClass?.class_nick_name || "";

            let studentCatTitle = "";
            let studentCatId = "";
            if (resolvedClassId) {
              const cat = curMeta.categories.find(
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

            if (!studentCatTitle && className) {
              const cat = curMeta.categories.find(
                (c) => c.category_title.toLowerCase().trim() === className.toLowerCase().trim()
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
              setStudentName(
                `❌ Category Mismatch: This programme is strictly for "${progCatTitle}". Your class is in "${studentCatTitle}".`
              );
              setCategoryMismatch(true);
              return;
            }
          }
        }

        // Step C: Check for an existing registration to prevent duplicates
        const { data: duplicateCheck, error: duplicateError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("CandidateUUiD")
          .eq("Program_Code", P_Code)
          .ilike("Candidate_Code", resolvedAddNo)
          .maybeSingle();

        if (duplicateError && duplicateError.code !== "PGRST116") throw duplicateError;

        if (duplicateCheck) {
          setStudentName(`⚠️ You are ALREADY registered for this event!`);
          setIsDuplicate(true);
          return;
        }

        // Step D: Enforce is_limitation limit
        if (curProg?.is_limitation) {
          const maxLimit = curProg.is_group_program
            ? (curProg.group_limit_count ?? 7)
            : (curProg.individual_limit_count ?? 15);
          const currentCount = curProg.Total_Registration || 0;
          if (currentCount >= maxLimit) {
            setStudentName(
              `❌ Registration Limit Reached: Maximum of ${maxLimit} ${
                curProg.is_group_program ? "groups" : "candidates"
              } allowed for this event.`
            );
            setIsLimitReached(true);
            return;
          }
        }

        setStudentName(`✅ ${studentData.StudentName} (#${resolvedAddNo})`);
        setIsDuplicate(false);
        setCategoryMismatch(false);
        setIsLimitReached(false);
      } catch (err) {
        console.error(err);
        setStudentName("⚠️ Validation service runtime exception");
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [candidateCode, P_Code]);

  // ----------------------------------------
  // 4. Process the Registration
  // ----------------------------------------
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!studentName.startsWith("✅") || isDuplicate || categoryMismatch || isLimitReached) {
      alert("Registration blocked due to invalid candidate code, duplicate registration, category restriction, or event limit reached.");
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", text: "" });

    try {
      const finalCandidateCode = (verifiedStudent?.AddNo || candidateCode).trim().toUpperCase();

      // Step A: Insert record into CandidateRegistrationTable
      const { error: insertError } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert([{
          Program_Code: P_Code,
          Candidate_Code: finalCandidateCode
        }]);

      if (insertError) throw insertError;

      // Step B: Increment total registrations in ProgrammesBox
      if (programDetails) {
        await SupaBaseFunction
          .from("ProgrammesBox")
          .update({ Total_Registration: (programDetails.Total_Registration || 0) + 1 })
          .eq("Program_Code", P_Code);
      }

      // Step C: Increment Registration_Count +1 for the student in StudentsBox
      const { data: currentStudent } = await SupaBaseFunction
        .from("StudentsBox")
        .select("Registration_Count")
        .ilike("AddNo", finalCandidateCode)
        .maybeSingle();

      if (currentStudent) {
        await SupaBaseFunction
          .from("StudentsBox")
          .update({ Registration_Count: (currentStudent.Registration_Count || 0) + 1 })
          .ilike("AddNo", finalCandidateCode);
      }

      setLastRegisteredStudent(finalCandidateCode);
      setStatus({
        type: "success",
        text: programDetails?.is_topic_required
          ? "🎉 You have been successfully registered! Topic registration is required for this competition."
          : `🎉 You have been successfully registered for ${programDetails?.Program_Title || "this event"}!`,
      });
      
    } catch (err) {
      console.error("Workflow Pipeline Failure:", err);
      const error = err as Error;
      setStatus({ type: "error", text: error.message || "Failed to commit registration operations." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------
  // RENDER UI
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center animate-pulse">
          <div className="h-10 w-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium tracking-wide">Validating candidate access...</p>
        </div>
      </div>
    );
  }

  const studentProfileUrl = actStn ? `/student-panel/${actStn}/stn-program` : "/student-panel/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12 flex items-center justify-center font-sans selection:bg-violet-500 selection:text-white">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-10 transition-all">
        
        {/* Header Section */}
        <div className="mb-6 border-b border-slate-100 pb-5 flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-violet-200/60">
              <ShieldCheck size={12} />
              <span>Student Self-Registration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Event Entry</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">Enroll yourself in campus competitions & programmes.</p>
          </div>
          {programDetails && canPrintSheet && (
            <button
              type="button"
              onClick={() => setIsPrintSheetOpen(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Print Official Registered Candidate Sheet (A4)"
            >
              <Printer size={15} /> Print Sheet (A4)
            </button>
          )}
        </div>

        {/* Action Validation Alerts */}
        {status.text && (
          <div className={`p-4 rounded-2xl mb-6 text-sm font-semibold border transition-all flex items-start gap-2.5 ${
            status.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs" 
              : "bg-rose-50 text-rose-800 border-rose-200 shadow-xs"
          }`}>
            <span className="text-lg shrink-0 mt-0.5">{status.type === "success" ? "🎉" : "⚠️"}</span>
            <span className="leading-snug">{status.text}</span>
          </div>
        )}

        {/* Prevent rendering form if the P_Code wasn't found in DB */}
        {!programDetails && status.type === "error" ? (
          <button
            type="button"
            onClick={() => navigate(studentProfileUrl)}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
          >
            Return to My Events
          </button>
        ) : status.type === "success" ? (
          // Success / Next Action Workflow
          <div className="space-y-5 py-4 animate-in fade-in zoom-in duration-300">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-black text-emerald-950">You're Officially Registered!</h3>
              <p className="text-xs text-emerald-800 font-medium">
                Your entry for <span className="font-bold underline">{programDetails?.Program_Title}</span> (#{P_Code}) has been confirmed under admission code <span className="font-mono font-bold">#{candidateCode}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {programDetails?.is_topic_required && (
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(true)}
                  className="sm:col-span-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-2 text-xs"
                >
                  <FileText size={16} /> Register Candidate Topic & Lyrics (Topics_Box)
                </button>
              )}
              
              <Link
                to={studentProfileUrl}
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl shadow-md hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer text-center text-xs flex items-center justify-center gap-2"
              >
                <Eye size={15} />
                <span>View My Registered Events</span>
              </Link>

              <Link
                to={actStn ? `/student-panel/${actStn}/all-programmes-list` : "/public-panel/our-programmes"}
                className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 cursor-pointer text-center text-xs flex items-center justify-center gap-2"
              >
                <Calendar size={15} />
                <span>Browse More Events</span>
              </Link>
            </div>
          </div>
        ) : (
          // Main Student Registration Form
          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Field 1: Program Meta Reference */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Program</label>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-violet-700 bg-violet-100 px-2.5 py-1 rounded-md text-xs tracking-wide shadow-xs">
                    {P_Code || "N/A"}
                  </span>
                  <span className="text-slate-900 font-extrabold text-sm sm:text-base leading-snug">
                    {programDetails ? programDetails.Program_Title : "Loading title..."}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap pt-1">
                  {programDetails?.Category && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[11px]">
                      Category: {meta.categoryMap[programDetails.Category] || programDetails.Category}
                    </span>
                  )}
                  {programDetails?.WingCode && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[11px]">
                      Wing: {meta.wingMap[programDetails.WingCode] || programDetails.WingCode}
                    </span>
                  )}
                  {programDetails?.Expected_Time && meta.expectedTimeMap[programDetails.Expected_Time] && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] flex items-center gap-1">
                      <Clock size={11} /> {meta.expectedTimeMap[programDetails.Expected_Time]}
                    </span>
                  )}
                  {programDetails?.Date && (
                    <span className="text-[11px] font-medium text-slate-600">
                      Date: {programDetails.Date}
                    </span>
                  )}
                  {programDetails?.is_limitation && (
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${
                      (programDetails.Total_Registration || 0) >= (programDetails.individual_limit_count || 15)
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      <Users size={11} />
                      <span>
                        Capacity: {programDetails.Total_Registration || 0} / {programDetails.individual_limit_count || 15}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Common Assigned Topic (Wing Creator provided topic) */}
              {programDetails?.is_topic && programDetails?.topic_title && (
                <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-2 text-teal-900 font-bold">
                    <BookOpen size={15} className="text-teal-600 shrink-0" />
                    <span>Official Competition Topic (Wing Assigned):</span>
                  </div>
                  <p className="text-teal-950 font-black pl-5.5 text-sm">
                    "{programDetails.topic_title}"
                  </p>
                  <p className="text-[10px] text-teal-700 pl-5.5">
                    All candidates competing in this event will present on this designated topic.
                  </p>
                </div>
              )}

              {/* Study Material / Drive Link */}
              {programDetails?.drive_link && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span>Study material & resources available for this event.</span>
                  </div>
                  <a
                    href={programDetails.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition shadow-xs"
                  >
                    <ExternalLink size={12} />
                    <span>Open Drive</span>
                  </a>
                </div>
              )}

              {/* Notice if Topic Registration is required */}
              {programDetails?.is_topic_required && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 text-xs mt-1">
                  <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                    <Sparkles size={15} className="text-indigo-600 shrink-0" />
                    <span>Topic submission required for this competition.</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                    Topics_Box
                  </span>
                </div>
              )}
            </div>

            {/* Field 2: Target Candidate Admission Code (READONLY FOR STUDENTS!) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>Candidate Admission No (AddNo)</span>
                  <span className="text-rose-500">*</span>
                </label>
                {isStudent && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-200">
                    <Lock size={10} />
                    <span>Locked to your account</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isStudent}
                  placeholder="e.g. U1476, or search student name..."
                  value={candidateCode}
                  onChange={(e) => {
                    if (!isStudent) setCandidateCode(e.target.value.toUpperCase());
                  }}
                  className={`w-full rounded-2xl border p-3.5 text-sm font-mono font-bold transition-all ${
                    isStudent
                      ? "bg-slate-100 text-slate-800 border-indigo-200 cursor-not-allowed select-none"
                      : "bg-white text-slate-800 border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
                  }`}
                />
                {isStudent && (
                  <div className="absolute right-3.5 top-3.5 text-slate-400">
                    <Lock size={16} />
                  </div>
                )}
              </div>

              {/* Matching Student Suggestions Dropdown */}
              {!isStudent && studentSuggestions.length > 0 && (
                <div className="mt-2 p-2 bg-white rounded-2xl border border-indigo-200 shadow-xl max-h-52 overflow-y-auto space-y-1 z-20">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider px-2 py-1 block">
                    Matching Students ({studentSuggestions.length}) - Click to Select:
                  </span>
                  {studentSuggestions.map((s: any) => (
                    <button
                      type="button"
                      key={s.AddNo}
                      onClick={() => {
                        setCandidateCode(s.AddNo.toUpperCase());
                        setStudentSuggestions([]);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 transition flex items-center justify-between gap-2 cursor-pointer border border-transparent hover:border-indigo-100"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 block truncate">
                          {s.StudentName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Class: {s.Stn_Class || "N/A"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
                        #{s.AddNo}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {isStudent && loggedInStudent && (
                <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    Authenticated student: <span className="font-bold text-slate-800">{loggedInStudent.StudentName}</span> (AddNo: {loggedInStudent.AddNo})
                  </span>
                </p>
              )}
            </div>

            {/* Field 3: Dynamic Verification Feedback Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Identity & Eligibility</label>
              <div className={`w-full rounded-2xl border p-3.5 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center ${
                  studentName.startsWith("✅")
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-inner"
                    : isDuplicate || studentName.startsWith("❌") || studentName.startsWith("⚠️")
                    ? "bg-rose-50 border-rose-200 text-rose-800 shadow-inner"
                    : "bg-slate-50 border-slate-200 text-slate-400 font-medium italic"
                }`}
              >
                {studentName || "Awaiting valid admission number..."}
              </div>
            </div>

            {/* If Already Registered: Show quick direct link to View Events */}
            {isDuplicate && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <span className="text-amber-900 font-bold">You are already registered in this competition.</span>
                <Link
                  to={studentProfileUrl}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition"
                >
                  View My Events
                </Link>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-1/3 py-3.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 cursor-pointer text-center"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !studentName.startsWith("✅") ||
                  isDuplicate ||
                  categoryMismatch ||
                  !candidateCode.trim()
                }
                className={`w-full sm:w-2/3 py-3.5 text-xs font-black rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isSubmitting ||
                  !studentName.startsWith("✅") ||
                  isDuplicate ||
                  categoryMismatch ||
                  !candidateCode.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-violet-500/25 cursor-pointer hover:-translate-y-0.5"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <span>Complete My Registration</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Print Candidate Sheet Modal */}
      {isPrintSheetOpen && programDetails && (
        <PrintCandidateSheetModal
          isOpen={isPrintSheetOpen}
          onClose={() => setIsPrintSheetOpen(false)}
          programCode={programDetails.Program_Code}
          initialProgramTitle={programDetails.Program_Title}
        />
      )}

      {/* Topic Registration Modal */}
      {isTopicModalOpen && programDetails && (
        <TopicRegistrationModal
          isOpen={isTopicModalOpen}
          onClose={() => setIsTopicModalOpen(false)}
          programCode={programDetails.Program_Code}
          programTitle={programDetails.Program_Title}
          studentAddNo={lastRegisteredStudent || candidateCode}
          onSuccess={() => {
            setIsTopicModalOpen(false);
            navigate(studentProfileUrl);
          }}
        />
      )}
    </div>
  );
}