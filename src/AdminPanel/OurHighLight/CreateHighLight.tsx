import React, { useState } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";

// 1. Declare explicit TS Schema matching the Database layout structure
interface HighlightFormState {
  HighLitght_Title: string;
  HighLight_Type: string;
  PhotoImg_Url: string;
  ShortDescpt: string;
  Accademic_Year: number;
  FileType: "Photo" | "Video";
}

interface TitleStatusState {
  checking: boolean;
  available: boolean | null;
  message: string;
}

export default function CreateHighLight() {
  const [formData, setFormData] = useState<HighlightFormState>({
    HighLitght_Title: "",
    HighLight_Type: "Event",
    PhotoImg_Url: "",
    ShortDescpt: "",
    Accademic_Year: new Date().getFullYear(),
    FileType: "Photo",
  });

  const [titleStatus, setTitleStatus] = useState<TitleStatusState>({ 
    checking: false, 
    available: null, 
    message: "" 
  });
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: string; text: string }>({ type: "", text: "" });

  // Explicit type configuration for string argument
  const checkTitleUniqueness = async (title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleStatus({ checking: false, available: null, message: "" });
      return;
    }

    setTitleStatus({ checking: true, available: null, message: "Scanning global database..." });

    try {
      const { data, error } = await SupaBaseFunction
        .from("PublicHighLights")
        .select("HighLitght_Title")
        .eq("HighLitght_Title", trimmedTitle)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTitleStatus({
          checking: false,
          available: false,
          message: "❌ This exact title already exists. Please create a unique variation.",
        });
      } else {
        setTitleStatus({
          checking: false,
          available: true,
          message: "✨ Title is unique and available!",
        });
      }
    } catch (err) {
      console.error(err);
      setTitleStatus({ checking: false, available: null, message: "" });
    }
  };

  // Explicit React Event Typing for Select, Input, & Textareas
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "HighLitght_Title") {
      setTitleStatus({ checking: false, available: null, message: "" });
    }
  };

  // Explicit React Form Event type assignment
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!titleStatus.available) {
      setFeedback({ type: "error", text: "Please settle the unique title requirement first." });
      return;
    }

    try {
      setSubmitting(true);
      
      const { error } = await SupaBaseFunction
        .from("PublicHighLights")
        .insert([
          {
            ...formData,
            // Cast string input fallback variables safely to clean Base-10 integers
            Accademic_Year: parseInt(String(formData.Accademic_Year), 10),
          }
        ]);

      if (error) throw error;

      setFeedback({ type: "success", text: "🚀 Broadcast Highlight successfully deployed to public feeds!" });
      
      setFormData({
        HighLitght_Title: "",
        HighLight_Type: "Event",
        PhotoImg_Url: "",
        ShortDescpt: "",
        Accademic_Year: new Date().getFullYear(),
        FileType: "Photo",
      });
      setTitleStatus({ checking: false, available: null, message: "" });

    } catch (err: any) {
      // Catch type parameter safety evaluation block
      setFeedback({ type: "error", text: err?.message || "An unexpected error took place." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen rounded-4xl bg-slate-950 text-slate-100 p-6 md:p-12 font-sans flex items-center justify-center">
      <div className="w-full max-w-3xl bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 md:p-10 shadow-2xl relative">
        
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-emerald-500">✍️</span> Publish New Highlight
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Broadcast a new campus achievement, landmark moment, or event directly onto the public feed boards.
          </p>
        </div>

        {feedback.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm border font-medium ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Highlight Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="HighLitght_Title"
              required
              value={formData.HighLitght_Title}
              onChange={handleInputChange}
              onBlur={(e) => checkTitleUniqueness(e.target.value)}
              placeholder="e.g., Darul Huda National Excellence Award 2026"
              className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                titleStatus.available === true ? "border-emerald-500/50 focus:ring-1 focus:ring-emerald-500" :
                titleStatus.available === false ? "border-rose-500/50 focus:ring-1 focus:ring-rose-500" :
                "border-slate-800 focus:border-slate-700"
              }`}
            />
            {titleStatus.message && (
              <p className={`text-xs mt-2 font-medium ${
                titleStatus.available === true ? "text-emerald-400" :
                titleStatus.available === false ? "text-rose-400" : "text-slate-400"
              }`}>
                {titleStatus.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Highlight Category Type
              </label>
              <select
                name="HighLight_Type"
                value={formData.HighLight_Type}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-slate-700 transition-all"
              >
                <option value="Event">🏫 Campus Event</option>
                <option value="Academic">📚 Academic Milestone</option>
                <option value="Sports">🏆 Sports & Athletics</option>
                <option value="Announcement">📢 Public Notice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Academic Year
              </label>
              <input
                type="number"
                name="Accademic_Year"
                required
                value={formData.Accademic_Year}
                onChange={handleInputChange}
                placeholder="2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Media File Type
              </label>
              <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {(["Photo", "Video"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, FileType: type }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      formData.FileType === type 
                        ? "bg-slate-800 text-white border border-slate-700" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {type === "Photo" ? "🖼️ Photo" : "🎥 Video"}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Media Resource URL (`PhotoImg_Url`)
              </label>
              <input
                type="url"
                name="PhotoImg_Url"
                value={formData.PhotoImg_Url}
                onChange={handleInputChange}
                placeholder={formData.FileType === "Photo" ? "https://example.com/image.jpg" : "https://example.com/stream.mp4"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-slate-700 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Short Description / Summary Log
            </label>
            <textarea
              name="ShortDescpt"
              rows={4} // FIX: Changed string assignment "4" to number expression {4}
              value={formData.ShortDescpt}
              onChange={handleInputChange}
              placeholder="Provide a high-impact narrative summary describing this highlight item..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-slate-700 transition-all resize-none leading-relaxed"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting || titleStatus.available !== true}
              className={`px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide shadow-xl transition-all duration-300 ${
                titleStatus.available === true
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
              }`}
            >
              {submitting ? "Deploying Data Records..." : "🚀 Publish Broadcast"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}