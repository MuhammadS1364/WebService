import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams, useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react";

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

const POSITION_POINTS: Record<string, number> = {
  "First": 10,
  "Second": 7,
  "Third": 5,
  "Accepted": 5,
  "Qualified": 5,
  "TillFinalRound": 5,
  "Participant/Other": 0,
};

export default function EditeOutReach() {
  const { OutReach_Id } = useParams<{ OutReach_Id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    stnAddNo: "",
    holder: "",
    title: "",
    type: "PPT Presentation",
    position: "First",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchOutReach() {
      if (!OutReach_Id) return;
      try {
        setLoading(true);
        const { data, error } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("OutReach_Id", OutReach_Id)
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            stnAddNo: data.StnAddNo || "",
            holder: data.OutReach_Holder || "",
            title: data.OutReach_Title || "",
            type: data.OutReach_Type || "PPT Presentation",
            position: data.Position_Achieved || "First",
            description: data.OutReach_Descriptin || "",
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load outreach record.");
      } finally {
        setLoading(false);
      }
    }
    fetchOutReach();
  }, [OutReach_Id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Please provide an outreach title.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const pointsGained = POSITION_POINTS[formData.position] ?? 0;

      const { error: updateError } = await SupaBaseFunction
        .from("StudentsOutReach")
        .update({
          OutReach_Title: formData.title.trim(),
          OutReach_Type: formData.type,
          OutReach_Holder: formData.holder.trim() || null,
          Position_Achieved: formData.position,
          OutReach_Descriptin: formData.description.trim() || null,
          Point_Obtained: pointsGained,
        })
        .eq("OutReach_Id", OutReach_Id);

      if (updateError) throw updateError;

      setSuccess("Outreach record updated successfully!");
      setTimeout(() => {
        navigate(-1);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to update record.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading outreach details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white rounded-3xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
            <Compass size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Edit Outreach Record</h2>
            <p className="text-xs text-slate-500">Update external presentation or competition details</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Student Admission No
          </label>
          <input
            type="text"
            readOnly
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed font-mono"
            value={formData.stnAddNo}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Student Name / Holder
          </label>
          <input
            type="text"
            className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
            value={formData.holder}
            onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
            placeholder="Participant name"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Outreach Title *
          </label>
          <input
            type="text"
            required
            className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. National Seminar on AI in Education"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Event Type
            </label>
            <select
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-500 bg-white"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              {OUTREACH_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Position Achieved
            </label>
            <select
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-500 bg-white"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            >
              {Object.keys(POSITION_POINTS).map((pos) => (
                <option key={pos} value={pos}>
                  {pos} ({POSITION_POINTS[pos]} pts)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Description & Notes
          </label>
          <textarea
            rows={3}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Details about institution, topic, or achievements..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Save size={16} />
          {saving ? "Saving Changes..." : "Save Outreach Changes"}
        </button>
      </form>
    </div>
  );
}
