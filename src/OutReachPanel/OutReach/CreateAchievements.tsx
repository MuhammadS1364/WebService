import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";

const ACHIEVEMENT_TYPES = [
  "Essay",
  "Story",
  "NewsPaper",
  "Speech",
  "Teaching",
  "Poem",
  "Book Review",
  "Research Papper",
  "Magazine",
  "Other",
];

// Explicitly tell TypeScript this is an object with string keys and number values
const POSITION_POINTS: Record<string, number> = {
  "First": 7,
  "Second": 5,
  "Third": 3,
  "Accepted": 5,
  "Magazine": 7,
  "Research Papper": 10,
  "NewsPaper": 7,
  "Speech teaching": 5,
  "Book Review": 5,
  "Qualified": 3,
  "TillFinalRound": 3,
  "Other": 3,
};

// Define interfaces for your state
interface AchievementFormData {
  stnAddNo: string;
  studentName: string;
  title: string;
  type: string;
  position: string;
  description: string;
}

interface StatusState {
  loading: boolean;
  searching: boolean;
  error: string;
  success: string;
}

export default function CreateAchievements() {
  const [formData, setFormData] = useState<AchievementFormData>({
    stnAddNo: "",
    studentName: "",
    title: "",
    type: "Essay",
    position: "First",
    description: "",
  });

  const [status, setStatus] = useState<StatusState>({
    loading: false,
    searching: false,
    error: "",
    success: "",
  });

  // Handle Input Changes with strict event typing covering inputs, selects, and textareas
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatus((prev) => ({ ...prev, success: "", error: "" }));
  };

  // Auto-Search Effect (Runs whenever stnAddNo changes)
  useEffect(() => {
    const searchStudent = async () => {
      const addNo = formData.stnAddNo.trim();
      
      if (!addNo) {
        setFormData((prev) => ({ ...prev, studentName: "" }));
        setStatus((prev) => ({ ...prev, error: "", searching: false }));
        return;
      }

      setStatus((prev) => ({ ...prev, searching: true, error: "" }));

      try {
        const { data, error } = await SupaBaseFunction.from("StudentsBox")
          .select("StudentName")
          .eq("AddNo", addNo)
          .single();

        if (error || !data) {
          throw new Error("Student not found.");
        }

        setFormData((prev) => ({ ...prev, studentName: data.StudentName }));
        setStatus((prev) => ({ ...prev, searching: false, error: "" }));
      } catch (err) {
        const error = err as Error;
        setFormData((prev) => ({ ...prev, studentName: "" }));
        setStatus((prev) => ({ ...prev, searching: false, error: error.message }));
      }
    };

    // 500ms Debounce
    const timeoutId = setTimeout(() => {
      searchStudent();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.stnAddNo]);

  // Submit Form
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.studentName) {
      setStatus({ ...status, error: "Valid Admission Number required." });
      return;
    }

    setStatus({ ...status, loading: true, error: "", success: "" });
    const pointsGained = POSITION_POINTS[formData.position] || 0;

    try {
      // Prevent Duplicates
      const { data: existingData, error: searchError } = await SupaBaseFunction.from("StudentsAchievements")
        .select("Achieve_Id")
        .eq("StnAddNo", formData.stnAddNo)
        .ilike("Achievement_Title", formData.title);

      if (searchError) throw searchError;
      if (existingData && existingData.length > 0) {
        throw new Error(`Duplicate: A record for "${formData.title}" already exists.`);
      }

      // Insert Data
      const { error: insertError } = await SupaBaseFunction.from("StudentsAchievements").insert({
        Achiever_Name: formData.stnAddNo, 
        Achievement_Title: formData.title,
        Achievement_Type: formData.type,
        Position_Achieved: formData.position,
        Achieve_Descriptin: formData.description,
        Point_Obtained: pointsGained,
        StnAddNo: formData.stnAddNo,
      });

      if (insertError) throw insertError;

      // Fetch Current Stats
      const { data: studentStats, error: statError } = await SupaBaseFunction.from("StudentsBox")
        .select("Achievements_Counts, Achievements_Points, Grand_Total_Points")
        .eq("AddNo", formData.stnAddNo)
        .single();

      if (statError) throw statError;

      // Update Counters
      const { error: updateError } = await SupaBaseFunction.from("StudentsBox")
        .update({
          Achievements_Counts: (studentStats.Achievements_Counts || 0) + 1,
          Achievements_Points: (studentStats.Achievements_Points || 0) + pointsGained,
          Grand_Total_Points: (studentStats.Grand_Total_Points || 0) + pointsGained,
        })
        .eq("AddNo", formData.stnAddNo);

      if (updateError) throw updateError;

      // Success Reset
      setStatus({ ...status, loading: false, success: "Achievement recorded successfully! 🎉" });
      setFormData({
        ...formData,
        title: "",
        type: "Essay",
        position: "First",
        description: "",
      });

    } catch (err) {
      const error = err as Error;
      setStatus({ ...status, loading: false, error: error.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-purple-50">
      
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-white p-8 sm:p-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            Record Achievement
          </h2>
          <p className="text-gray-500 font-medium">Log a new milestone for the student.</p>
        </div>

        {/* Notifications */}
        {status.error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-semibold flex items-center shadow-sm">
            <span className="mr-2">⚠️</span> {status.error}
          </div>
        )}
        {status.success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm font-semibold flex items-center shadow-sm">
            <span className="mr-2">✨</span> {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Auto-Search Student Details */}
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Verification</h3>
              {status.searching && (
                <span className="text-xs font-semibold text-indigo-500 animate-pulse bg-indigo-50 px-3 py-1 rounded-full">
                  Searching database...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Admission Number</label>
                <input
                  type="text"
                  name="stnAddNo"
                  value={formData.stnAddNo}
                  onChange={handleChange}
                  placeholder="Enter AddNo..."
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Verified Name</label>
                <input
                  type="text"
                  value={formData.studentName}
                  readOnly
                  placeholder={status.error ? "Record not found" : "Auto-fills when verified"}
                  className={`w-full px-5 py-3.5 border rounded-xl outline-none font-semibold transition-all duration-300 shadow-sm
                    ${formData.studentName 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : status.error 
                        ? 'bg-rose-50 border-rose-200 text-rose-500'
                        : 'bg-slate-100/50 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Achievement Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Achievement Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="E.g., National Science Essay 2024"
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
              <div className="relative">
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 appearance-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all duration-200 shadow-sm cursor-pointer"
                >
                  {ACHIEVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Position / Points</label>
              <div className="relative">
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 appearance-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all duration-200 shadow-sm cursor-pointer"
                >
                  {Object.keys(POSITION_POINTS).map((pos) => (
                    <option key={pos} value={pos}>
                      {pos} ({POSITION_POINTS[pos]} pts)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Additional Details</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the event or accomplishment..."
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all duration-200 shadow-sm resize-none"
              ></textarea>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={status.loading || !formData.studentName || status.searching}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all duration-300 transform
                ${status.loading || !formData.studentName || status.searching
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-1 shadow-[0_10px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.4)]'
                }`}
            >
              {status.loading 
                ? "Saving Record..." 
                : formData.studentName 
                  ? `Log Achievement for ${formData.studentName.split(" ")[0]}` 
                  : "Awaiting Student Verification..."}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}