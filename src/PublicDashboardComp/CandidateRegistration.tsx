import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import PrintCandidateSheetModal from "../components/PrintCandidateSheetModal";
import { Printer } from "lucide-react";

// Define the shape of your program data
interface ProgramDetails {
  Program_Code: string;
  Program_Title: string;
  Category?: string;
  Total_Registration?: number;
}

// Define the shape of your status alerts
interface StatusState {
  type: string;
  text: string;
}

export default function CandidateRegistration() {
  const meta = useProgrammeMeta();
  // Extract P_Code from the URL and tell TypeScript it's a string
  // IMPORTANT: Your router MUST look like: <Route path="/register/:P_Code" element={...} />
  const { P_Code } = useParams<{ P_Code: string }>();
  const navigate = useNavigate();

  // Core Data States
  const [programDetails, setProgramDetails] = useState<ProgramDetails | null>(null);
  const [candidateCode, setCandidateCode] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  
  // UI/UX Status States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [categoryMismatch, setCategoryMismatch] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusState>({ type: "", text: "" });
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState<boolean>(false);

  // ----------------------------------------
  // 1. Fetch current program info 
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
          .select("Program_Code, Program_Title, Category, Total_Registration")
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
  // 2. Real-time Student Lookup Validation
  // ----------------------------------------
  useEffect(() => {
    if (!candidateCode.trim()) {
      setStudentName("");
      setIsDuplicate(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setStudentName("Checking system registry...");
        setIsDuplicate(false);
        setCategoryMismatch(false);

        // Step A: Check if the student exists in StudentsBox
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("StudentName, Stn_Class, Class")
          .eq("AddNo", candidateCode.trim())
          .maybeSingle();

        if (studentError || !studentData) {
          setStudentName("❌ Student record not found");
          return;
        }

        // Step B: Category Bonding Check
        if (programDetails?.Category) {
          const progCatId = programDetails.Category;
          const progCatTitle = meta.categoryMap[progCatId] || progCatId;

          if (
            progCatTitle &&
            progCatTitle.toLowerCase() !== "general" &&
            progCatTitle.toLowerCase() !== "all"
          ) {
            // Find student's category
            const classId = studentData.Stn_Class;
            const className = studentData.Class;
            const matchedClass = meta.classes.find(
              (c) =>
                (classId && c.class_id === classId) ||
                (className && (c.standard_name === className || c.class_nick_name === className))
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

            if (!studentCatTitle && className) {
              const cat = meta.categories.find(
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
                `❌ Category Mismatch: This programme is strictly for "${progCatTitle}". ${studentData.StudentName} belongs to "${studentCatTitle}".`
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
          .eq("Candidate_Code", candidateCode.trim())
          .maybeSingle();

        if (duplicateError && duplicateError.code !== "PGRST116") throw duplicateError;

        if (duplicateCheck) {
          setStudentName(`⚠️ ${studentData.StudentName} is ALREADY registered!`);
          setIsDuplicate(true);
        } else {
          setStudentName(`✅ ${studentData.StudentName}`);
          setIsDuplicate(false);
          setCategoryMismatch(false);
        }
      } catch (err) {
        console.error(err);
        setStudentName("⚠️ Validation service runtime exception");
      }
    }, 450); // Debounce delay for smooth typing UX

    return () => clearTimeout(delayDebounce);
  }, [candidateCode, P_Code, programDetails, meta]);


  // ----------------------------------------
  // 3. Process the Registration
  // ----------------------------------------
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!studentName.startsWith("✅") || isDuplicate || categoryMismatch) {
      alert("Registration blocked due to invalid candidate code, duplicate registration, or category restriction.");
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", text: "" });

    try {
      // Step A: Insert record into CandidateRegistrationTable
      const { error: insertError } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert([{
          Program_Code: P_Code,
          Candidate_Code: candidateCode.trim()
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
        .eq("AddNo", candidateCode.trim())
        .maybeSingle();

      if (currentStudent) {
        await SupaBaseFunction
          .from("StudentsBox")
          .update({ Registration_Count: (currentStudent.Registration_Count || 0) + 1 })
          .eq("AddNo", candidateCode.trim());
      }

      setStatus({ type: "success", text: "🎉 Candidate successfully assigned to program!" });
      setCandidateCode("");
      setStudentName("");
      
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center animate-pulse">
          <div className="h-10 w-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium tracking-wide">Validating secure channel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center font-sans selection:bg-violet-500 selection:text-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-10 transition-all">
        
        {/* Header Section */}
        <div className="mb-8 border-b border-slate-100 pb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Candidate Entry</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Assign records to active programs seamlessly.</p>
          </div>
          {programDetails && (
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
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold border transition-all flex items-start ${
            status.type === "success" 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
            <span className="mr-2 text-lg">{status.type === "success" ? "✅" : "⚠️"}</span>
            <span className="mt-0.5">{status.text}</span>
          </div>
        )}

        {/* Prevent rendering form if the P_Code wasn't found in DB */}
        {!programDetails && status.type === "error" ? (
           <button
            onClick={() => navigate("/student-panel/:actStn/candidate-registration")}
            className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
           >
             Return to Program List
           </button>
        ) : status.type === "success" ? (
          // Success / Next Action Workflow
          <div className="space-y-6 py-4 animate-in fade-in zoom-in duration-300">
            <p className="text-slate-600 text-center font-medium">What would you like to do next?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setStatus({ type: "", text: "" })}
                className="w-full py-3.5 bg-violet-600 text-white font-bold rounded-xl shadow-md shadow-violet-200 hover:bg-violet-700 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer text-center"
              >
                + Register Another
              </button>
              <button
                type="button"
                onClick={() => setIsPrintSheetOpen(true)}
                className="w-full py-3.5 bg-violet-50 text-violet-700 border border-violet-200 font-bold rounded-xl hover:bg-violet-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer size={16} /> Print Sheet (A4)
              </button>
            </div>
          </div>
        ) : (
          // Main Form
          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* Field 1: Program Meta Reference */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Program</label>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap gap-3 items-center">
                <span className="font-bold text-violet-700 bg-violet-100 px-2.5 py-1 rounded-md text-xs tracking-wide shadow-sm">
                  {P_Code || "N/A"}
                </span>
                <span className="text-slate-700 font-semibold text-sm">
                  {programDetails ? programDetails.Program_Title : "Loading title..."}
                </span>
                {programDetails?.Category && (
                  <span className="ml-auto text-xs font-bold bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full shadow-sm">
                    {programDetails.Category}
                  </span>
                )}
              </div>
            </div>

            {/* Field 2: Target Candidate Admission Code */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Candidate Admission No (AddNo) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 4501"
                value={candidateCode}
                onChange={(e) => setCandidateCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3.5 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 transition-all text-sm font-bold bg-white"
              />
            </div>

            {/* Field 3: Dynamic Verification Feedback Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Identity Verification</label>
              <div className={`w-full rounded-xl border p-3.5 text-sm font-semibold transition-all duration-300 flex items-center ${
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

            {/* Form Actions */}
            <div className="pt-4 flex flex-col align-middle justify-center sm:flex-row gap-3">
              {/* <button
                type="button"
                onClick={() => navigate("/admin-panel/admin@gmail.com/")}
                className="w-full sm:w-1/3 order-2 sm:order-1 py-3.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
              >
                Cancel
              </button> */}
              <button
                type="submit"
                disabled={isSubmitting || !studentName.startsWith("✅") || isDuplicate}
                className={`w-full sm:w-2/3 order-1 sm:order-2 py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-200 shadow-lg flex justify-center items-center ${
                  isSubmitting || !studentName.startsWith("✅") || isDuplicate
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-violet-600 hover:bg-violet-700 hover:-translate-y-0.5 hover:shadow-violet-300 active:scale-[0.98]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </>
                ) : "Complete Registration"}
              </button>
            </div>
            
          </form>
        )}

        {/* Print Candidate Sheet Modal (A4) */}
        {programDetails && (
          <PrintCandidateSheetModal
            isOpen={isPrintSheetOpen}
            programCode={programDetails.Program_Code}
            initialProgramTitle={programDetails.Program_Title}
            onClose={() => setIsPrintSheetOpen(false)}
          />
        )}
      </div>
    </div>
  );
}