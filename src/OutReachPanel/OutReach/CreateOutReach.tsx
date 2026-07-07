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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatus((prev) => ({ ...prev, error: "", success: "" }));
  };

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

      if (error || !data) throw new Error("Student not found.");

      setFormData((prev) => ({ ...prev, studentName: data.StudentName }));
      setStatus((prev) => ({ ...prev, searching: false }));
    } catch (err) {
      setFormData((prev) => ({ ...prev, studentName: "" }));
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus((prev) => ({ ...prev, searching: false, error: message }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.studentName) {
      setStatus((prev) => ({ ...prev, error: "Please enter a valid Admission Number first." }));
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true, error: "", success: "" }));
    const pointsGained = POSITION_POINTS[formData.position] || 0;
    const currentTimestamp = new Date().toISOString();

    try {
      const { data: existingData, error: searchError } = await SupaBaseFunction.from("StudentsOutReach")
        .select("OutReach_Id")
        .eq("StnAddNo", formData.stnAddNo)
        .ilike("OutReach_Title", formData.title);

      if (searchError) throw searchError;
      if (existingData && existingData.length > 0) throw new Error("Duplicate Entry found.");

      const { error: insertError } = await SupaBaseFunction.from("StudentsOutReach").insert({
        created_at: currentTimestamp,
        OutReach_Holder: formData.holder,
        OutReach_Title: formData.title,
        OutReach_Type: formData.type,
        Position_Achieved: formData.position,
        OutReach_Descriptin: formData.description,
        Point_Obtained: pointsGained,
        StnAddNo: formData.stnAddNo,
      });

      if (insertError) throw insertError;

      const { data: studentStats, error: statError } = await SupaBaseFunction.from("StudentsBox")
        .select("OutReach_Count, OutReach_Points, Grand_Total_Points")
        .eq("AddNo", formData.stnAddNo)
        .single();

      if (statError) throw statError;

      const { error: updateError } = await SupaBaseFunction.from("StudentsBox")
        .update({
          OutReach_Count: (studentStats.OutReach_Count || 0) + 1,
          OutReach_Points: (studentStats.OutReach_Points || 0) + pointsGained,
          Grand_Total_Points: (studentStats.Grand_Total_Points || 0) + pointsGained,
        })
        .eq("AddNo", formData.stnAddNo);

      if (updateError) throw updateError;

      setStatus({ loading: false, searching: false, error: "", success: "Outreach recorded!" });
      setFormData((prev) => ({ ...prev, holder: "", title: "", description: "" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error saving record";
      setStatus((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  const inputClassName = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";
  const labelClassName = "block text-sm font-semibold text-slate-700 mb-2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
           {/* Form content remains same as your original, just ensure fields match the new types */}
           {/* ... Input fields as before ... */}
        </form>
      </div>
    </div>
  );
}