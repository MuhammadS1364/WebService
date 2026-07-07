import { useState, type ChangeEvent, type FormEvent } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase"; 

const OUTREACH_TYPES = [
  "PPT Presentation",
  "Debate",
  "Quiz",
  "Discussion",
  "WorkShop",
  "Seminar",
  "Speech",
  "Other",
] as const;

const POSITION_POINTS = {
  "First": 10,
  "Second": 7,
  "Third": 5,
  "Accepted": 5,
  "Qualified": 5,
  "TillFinalRound": 5,
  "Participant/Other": 0,
} as const;

type PositionKey = keyof typeof POSITION_POINTS;

export default function CreateOutReach() {
  const [formData, setFormData] = useState({
    stnAddNo: "",
    studentName: "",
    holder: "",
    title: "",
    type: "PPT Presentation" as typeof OUTREACH_TYPES[number],
    position: "First" as PositionKey,
    description: "",
  });

  const [status, setStatus] = useState({
    loading: false,
    searching: false,
    error: "",
    success: "",
  });

  // Handle Input Changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatus((prev) => ({ ...prev, error: "", success: "" })); // Clear alerts on type
  };

  // 1. Auto-Search for Student Name (Triggered on blur)
  const handleBlurSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const addNo = e.target.value;
    
    if (!addNo.trim()) {
      setFormData((prev) => ({ ...prev, studentName: "" }));
      return;
    }

    setStatus((prev) => ({ ...prev, searching: true, error: "", success: "" }));

    try {
      const { data, error } = await SupaBaseFunction.from("StudentsBox")
        .select("StudentName")
        .eq("AddNo", addNo)
        .single();

      if (error || !data) {
        throw new Error("Student not found. Please check the Admission Number.");
      }

      setFormData((prev) => ({ ...prev, studentName: data.StudentName }));
      setStatus((prev) => ({ ...prev, searching: false }));
    } catch (err) {
      setFormData((prev) => ({ ...prev, studentName: "" }));
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus((prev) => ({ ...prev, searching: false, error: message }));
    }
  };

  // 2. Submit Form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.studentName) {
      setStatus((prev) => ({ ...prev, error: "Please enter a valid Admission Number first." }));
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true, error: "", success: "" }));
    const pointsGained = POSITION_POINTS[formData.position] || 0;
    
    // Fixed: Use ISO string for database timestamp compatibility
    const currentTimestamp = new Date().toISOString(); 

    try {
      // Step A: Check for existing duplicate
      const { data: existingData, error: searchError } = await SupaBaseFunction.from("StudentsOutReach")
        .select("OutReach_Id")
        .eq("StnAddNo", formData.stnAddNo)
        .ilike("OutReach_Title", formData.title); 

      if (searchError) throw searchError;

      if (existingData && existingData.length > 0) {
        throw new Error(`Duplicate Entry: Student already has an outreach record titled "${formData.title}".`);
      }

      // Step B: Insert into StudentsOutReach
      const { error: insertError } = await SupaBaseFunction.from("StudentsOutReach").insert({
        created_at: currentTimestamp, 
        OutReach_Holder: formData.holder,
        OutReach_Title: formData.title,
        OutReach_Type: formData.type,
        Position_Achieved: formData.position,
        OutReach_Descriptin: formData.description, // Keeping your original spelling
        Point_Obtained: pointsGained,
        StnAddNo: formData.stnAddNo,
      });

      if (insertError) throw insertError;

      // Step C: Fetch Current StudentBox Stats
      const { data: studentStats, error: statError } = await SupaBaseFunction.from("StudentsBox")
        .select("OutReach_Count, OutReach_Points, Grand_Total_Points")
        .eq("AddNo", formData.stnAddNo)
        .single();

      if (statError) throw statError;

      // Step D: Update StudentsBox counters
      const { error: updateError } = await SupaBaseFunction.from("StudentsBox")
        .update({
          OutReach_Count: (studentStats.OutReach_Count || 0) + 1,
          OutReach_Points: (studentStats.OutReach_Points || 0) + pointsGained,
          Grand_Total_Points: (studentStats.Grand_Total_Points || 0) + pointsGained,
        })
        .eq("AddNo", formData.stnAddNo);

      if (updateError) throw updateError;

      // Success Reset
      setStatus({ loading: false, searching: false, error: "", success: "Outreach successfully recorded!" });
      setFormData({
        ...formData,
        holder: "",
        title: "",
        type: "PPT Presentation",
        position: "First",
        description: "",
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred while saving.";
      setStatus((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  // Shared Input Styles for consistent UI
  const inputClassName = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400";
  const labelClassName = "block text-sm font-semibold text-slate-700 mb-2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white p-8 md:p-10">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Record Student Outreach
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Add new achievements and participation details</p>
        </div>

        {/* Notifications */}
        {status.error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl shadow-sm animate-fade-in">
            <p className="font-medium">{status.error}</p>
          </div>
        )}
        {status.success && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r-xl shadow-sm animate-fade-in">
            <p className="font-medium">{status.success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Student Identity (Auto-Search) */}
          <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className={labelClassName}>Admission No</label>
                <input
                  type="text"
                  name="stnAddNo"
                  value={formData.stnAddNo}
                  onChange={handleChange}
                  onBlur={handleBlurSearch}
                  placeholder="Enter AddNo and click away..."
                  className={inputClassName}
                  required
                />
              </div>

              <div className="flex-1">
                <label className={labelClassName}>Student Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={status.searching ? "Searching database..." : formData.studentName}
                    readOnly
                    placeholder="Auto-filled on search..."
                    className={`w-full px-4 py-3 rounded-xl border ${
                      status.searching 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-500 animate-pulse" 
                        : formData.studentName 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium" 
                          : "bg-slate-100 border-slate-200 text-slate-500"
                    } cursor-not-allowed outline-none transition-colors`}
                  />
                  {/* Success Indicator Icon */}
                  {formData.studentName && !status.searching && !status.error && (
                    <div className="absolute right-4 top-3.5 text-emerald-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Outreach Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={labelClassName}>Outreach Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="E.g., National Science Seminar 2024"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label className={labelClassName}>Organized By (Holder)</label>
              <input
                type="text"
                name="holder"
                value={formData.holder}
                onChange={handleChange}
                placeholder="E.g., IIT Bombay"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label className={labelClassName}>Outreach Type</label>
              <div className="relative">
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                >
                  {OUTREACH_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClassName}>Position Achieved</label>
              <div className="relative">
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                >
                  {(Object.keys(POSITION_POINTS) as Array<PositionKey>).map((pos) => (
                    <option key={pos} value={pos}>
                      {pos} ({POSITION_POINTS[pos]} pts)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClassName}>Description <span className="text-slate-400 font-normal">(Optional)</span></label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3} 
                placeholder="Brief details about the participation or project..."
                className={`${inputClassName} resize-none`}
              ></textarea>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={status.loading || !formData.studentName}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all duration-300 transform 
                ${status.loading || !formData.studentName 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] shadow-lg'}`}
            >
              {status.loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Record...
                </span>
              ) : (
                "Submit Outreach Entry"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}