
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";

export default function CandidateRegistration() {
  const { P_Code } = useParams();
  const navigate = useNavigate();

  // Component states
  const [programDetails, setProgramDetails] = useState(null);
  const [candidateCode, setCandidateCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  // 1. Fetch current program info on component initialization
  useEffect(() => {
    async function fetchProgram() {
      if (!P_Code) return;
      try {
        const { data, error } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Category, Total_Registration")
          .eq("Program_Code", P_Code)
          .maybeSingle();

        if (error) throw error;
        setProgramDetails(data);
      } catch (err) {
        console.error("Error fetching program details:", err);
        setStatus({ type: "error", text: "Failed to load program metadata." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgram();
  }, [P_Code]);

  // 2. Real-time Student Lookup & Duplicate Registration check
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

        // Step A: Check if the student exists in StudentsBox
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("Student_Name")
          .eq("AddNo", candidateCode.trim())
          .maybeSingle();

        if (studentError || !studentData) {
          setStudentName("❌ Student record not found");
          return;
        }

        // Step B: Check for an existing registration to prevent duplicates
        const { data: duplicateCheck, error: duplicateError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("CandidateUUiD")
          .eq("Program_Code", P_Code)
          .eq("Candidate_Code", candidateCode.trim())
          .maybeSingle();

        if (duplicateCheck) {
          setStudentName(`⚠️ ${studentData.Student_Name} is ALREADY registered!`);
          setIsDuplicate(true);
        } else {
          setStudentName(`✅ ${studentData.Student_Name}`);
          setIsDuplicate(false);
        }
      } catch (err) {
        setStudentName("⚠️ Validation service runtime exception");
      }
    }, 400); // 400ms typing debounce delay

    return () => clearTimeout(delayDebounce);
  }, [candidateCode, P_Code]);

  // 3. Process the transactional sequence on submit
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!studentName.startsWith("✅") || isDuplicate) {
      alert("Registration blocked due to invalid input data or duplicate validation.");
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

      // Step C: Increment registration count for the student in StudentsBox
      const { data: currentStudent } = await SupaBaseFunction
        .from("StudentsBox")
        .select("Registration_Count")
        .eq("AddNo", candidateCode.trim())
        .maybeSingle();

      await SupaBaseFunction
        .from("StudentsBox")
        .update({ Registration_Count: (currentStudent?.Registration_Count || 0) + 1 })
        .eq("AddNo", candidateCode.trim());

      setStatus({ type: "success", text: "🎉 Candidate successfully assigned to program!" });
      setCandidateCode("");
      setStudentName("");
    } catch (err) {
      console.error("Workflow Pipeline Failure:", err);
      setStatus({ type: "error", text: err.message || "Failed to commit registration operations." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Validating secure registration channel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 flex items-center justify-center font-sans selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 transition-all">
        
        {/* Header Title Section */}
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Candidate Entry Gate</h2>
          <p className="text-sm text-gray-500 mt-1">Assign records to active programs seamlessly.</p>
        </div>

        {/* Action Validation Alerts */}
        {status.text && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium border transition-all ${
            status.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {status.text}
          </div>
        )}

        {/* Dynamic Branching Content Workflow */}
        {status.type === "success" ? (
          <div className="space-y-4 py-4">
            <p className="text-gray-600 text-sm text-center font-medium">What structural route would you like to process next?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setStatus({ type: "", text: "" })}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition active:scale-95"
              >
                Register Another Candidate
              </button>
              <button
                onClick={() => navigate("/all-programmes-list")}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition active:scale-95"
              >
                Return to Program List
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Field 1: Program Meta Reference Box View */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Target Code && Name and Category
              </label>
              <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-500 font-mono text-sm cursor-not-allowed select-none flex flex-wrap gap-2 items-center">
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                  {P_Code}
                </span>
                <span className="text-gray-700 font-sans font-semibold">
                  {programDetails ? programDetails.Program_Title : "Loading title..."}
                </span>
                {programDetails?.Category && (
                  <span className="ml-auto text-xs font-sans font-medium bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full">
                    {programDetails.Category}
                  </span>
                )}
              </div>
            </div>

            {/* Field 2: Target Candidate Admission Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Candidate Admission No (AddNo) *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Student's AddNo (e.g. 4501)"
                value={candidateCode}
                onChange={(e) => setCandidateCode(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3.5 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"
              />
            </div>

            {/* Field 3: Dynamic Verification Feedback Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Resolved Student Name Verification
              </label>
              <input
                type="text"
                value={studentName}
                placeholder="Awaiting valid identifier code configuration entry..."
                readOnly
                className={`w-full rounded-xl border p-3.5 text-sm font-semibold transition-all focus:outline-none ${
                  studentName.startsWith("✅")
                    ? "bg-green-50/50 border-green-200 text-green-800"
                    : isDuplicate || studentName.startsWith("❌") || studentName.startsWith("⚠️")
                    ? "bg-red-50/50 border-red-200 text-red-800"
                    : "bg-gray-50 border-gray-200 text-gray-400 font-normal italic"
                }`}
              />
            </div>

            {/* Controls Button Layout Footer */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/all-programmes-list")}
                className="w-full sm:w-1/3 order-2 sm:order-1 py-3.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition active:scale-98"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !studentName.startsWith("✅") || isDuplicate}
                className={`w-full sm:w-2/3 order-1 sm:order-2 py-3.5 text-sm font-bold text-white rounded-xl transition shadow-lg ${
                  isSubmitting || !studentName.startsWith("✅") || isDuplicate
                    ? "bg-gray-300 cursor-not-allowed opacity-75 shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/10"
                }`}
              >
                {isSubmitting ? "Finalizing Credentials..." : "Complete Registration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}