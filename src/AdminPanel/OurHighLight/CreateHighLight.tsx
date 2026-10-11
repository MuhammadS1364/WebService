import React, { useState, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { uploadImageToImgBB } from "../../lib/imgbbService";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Radio,
  Upload,
  FileUp,
  Link as LinkIcon,
} from "lucide-react";

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
    message: "",
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: string; text: string }>({ type: "", text: "" });

  // Direct file upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadSource, setUploadSource] = useState<"file" | "url">("file");

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsUploadingFile(true);
    setFeedback({ type: "", text: "" });

    try {
      if (file.type.startsWith("image/")) {
        const uploadRes = await uploadImageToImgBB(file, `highlight_${Date.now()}`);
        if (uploadRes && (uploadRes.displayUrl || uploadRes.url)) {
          const finalUrl = uploadRes.displayUrl || uploadRes.url;
          setFormData((prev) => ({
            ...prev,
            PhotoImg_Url: finalUrl,
            FileType: "Photo",
          }));
          setFeedback({
            type: "success",
            text: "✅ Photo file uploaded directly and attached successfully!",
          });
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setFormData((prev) => ({
              ...prev,
              PhotoImg_Url: result,
              FileType: file.type.startsWith("video/") ? "Video" : "Photo",
            }));
            setFeedback({
              type: "success",
              text: "✅ Media file processed and attached successfully!",
            });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error("Highlight upload failed:", err);
      setFeedback({
        type: "error",
        text: err?.message || "Failed to upload file. You can also paste an image URL directly.",
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const checkTitleUniqueness = async (title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleStatus({ checking: false, available: null, message: "" });
      return;
    }

    setTitleStatus({ checking: true, available: null, message: "Checking title availability..." });

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
          message: "This highlight title already exists. Please choose a distinctive title.",
        });
      } else {
        setTitleStatus({
          checking: false,
          available: true,
          message: "Title is available for broadcast!",
        });
      }
    } catch (err) {
      console.error(err);
      setTitleStatus({ checking: false, available: null, message: "" });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "HighLitght_Title") {
      setTitleStatus({ checking: false, available: null, message: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!titleStatus.available) {
      setFeedback({ type: "error", text: "Please verify and provide a unique title before publishing." });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await SupaBaseFunction.from("PublicHighLights").insert([
        {
          ...formData,
          Accademic_Year: parseInt(String(formData.Accademic_Year), 10),
        },
      ]);

      if (error) throw error;

      setFeedback({
        type: "success",
        text: "Broadcast Highlight successfully published to the campus public feed!",
      });

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
      setFeedback({ type: "error", text: err?.message || "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Form Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
              <Radio size={13} className="text-emerald-600 animate-pulse" />
              Public Highlights & Events
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              Add New Highlight
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Broadcast campus landmarks, cultural fests, academic awards, and sports moments onto the public dashboard.
            </p>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback.text && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Highlight Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Highlight Title <span className="text-rose-500">*</span>
              </label>
              {titleStatus.checking && (
                <span className="text-xs text-indigo-600 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Verifying...
                </span>
              )}
            </div>
            <input
              type="text"
              name="HighLitght_Title"
              required
              value={formData.HighLitght_Title}
              onChange={handleInputChange}
              onBlur={(e) => checkTitleUniqueness(e.target.value)}
              placeholder="e.g., Annual Grand Convocation 2026, National Literary Meet..."
              className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all ${
                titleStatus.available === true
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : titleStatus.available === false
                  ? "border-rose-500 ring-2 ring-rose-500/20"
                  : "border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              }`}
            />
            {titleStatus.message && (
              <p
                className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
                  titleStatus.available === true
                    ? "text-emerald-600"
                    : titleStatus.available === false
                    ? "text-rose-600"
                    : "text-slate-500"
                }`}
              >
                {titleStatus.available === true ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {titleStatus.message}
              </p>
            )}
          </div>

          {/* Category & Academic Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Event Category Type
              </label>
              <select
                name="HighLight_Type"
                value={formData.HighLight_Type}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="Event">🏫 Campus Event</option>
                <option value="Academic">📚 Academic Milestone</option>
                <option value="Sports">🏆 Sports & Athletics</option>
                <option value="Announcement">📢 Public Notice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Academic Year
              </label>
              <input
                type="number"
                name="Accademic_Year"
                required
                value={formData.Accademic_Year}
                onChange={handleInputChange}
                placeholder="2026"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Media Resource (Direct File Upload & URL Support) */}
          <div className="space-y-3 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Media File & Attachment <span className="text-rose-500">*</span>
              </label>

              {/* Toggle upload mode */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadSource("file")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    uploadSource === "file"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileUp size={13} /> Upload File Directly
                </button>
                <button
                  type="button"
                  onClick={() => setUploadSource("url")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    uploadSource === "url"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LinkIcon size={13} /> Paste Web URL
                </button>
              </div>
            </div>

            {/* Direct File Upload Area */}
            {uploadSource === "file" ? (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDirectFileUpload}
                  accept="image/*,video/*"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    formData.PhotoImg_Url
                      ? "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70"
                      : "border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50"
                  }`}
                >
                  {isUploadingFile ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 size={28} className="text-emerald-600 animate-spin mb-2" />
                      <p className="text-xs font-bold text-slate-700">Uploading and processing media file...</p>
                      <p className="text-[11px] text-slate-400 mt-1">Please wait a moment</p>
                    </div>
                  ) : formData.PhotoImg_Url ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 shadow-sm">
                        {formData.FileType === "Photo" ? (
                          <img
                            src={formData.PhotoImg_Url}
                            alt="Uploaded Highlight"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white">
                            <VideoIcon size={24} />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>File Uploaded: {selectedFileName || "Attached Media"}</span>
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          Ready to broadcast onto public dashboard
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline inline-block"
                        >
                          Click to Replace File
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
                        <Upload size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to browse and upload file directly
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Supports PNG, JPG, JPEG, WEBP, and MP4 video recordings
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* URL Input Option */
              <div className="space-y-2">
                <input
                  type="url"
                  name="PhotoImg_Url"
                  value={formData.PhotoImg_Url}
                  onChange={handleInputChange}
                  placeholder="https://i.ibb.co/... or https://example.com/photo.jpg or youtube embed"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  Paste any direct public image or video media URL
                </p>
              </div>
            )}

            {/* Media Resource Type Selector */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                Detected Type:
              </span>
              <div className="flex gap-2">
                {(["Photo", "Video"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, FileType: type }))}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer border ${
                      formData.FileType === type
                        ? "bg-white text-emerald-800 border-emerald-300 shadow-2xs"
                        : "bg-slate-100 text-slate-500 border-transparent hover:text-slate-800"
                    }`}
                  >
                    {type === "Photo" ? <ImageIcon size={12} /> : <VideoIcon size={12} />}
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Short Narrative / Summary Description
            </label>
            <textarea
              name="ShortDescpt"
              rows={4}
              value={formData.ShortDescpt}
              onChange={handleInputChange}
              placeholder="Provide a descriptive summary highlighting the significance, organizers, and key moments..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {titleStatus.available === true
                ? "✨ Ready to broadcast"
                : "Fill details and verify title"}
            </span>

            <button
              type="submit"
              disabled={submitting || titleStatus.available !== true}
              className={`px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md ${
                titleStatus.available === true
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
                  : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
              }`}
            >
              {submitting ? "Publishing Broadcast..." : "🚀 Publish Highlight"}
            </button>
          </div>
        </form>
      </div>

      {/* Live Feed Card Preview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Eye size={15} className="text-indigo-600" />
          Live Preview: Public Feed Card
        </div>

        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="h-44 bg-slate-200 relative flex items-center justify-center overflow-hidden">
            {formData.PhotoImg_Url ? (
              <img
                src={formData.PhotoImg_Url}
                alt="Highlight preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80";
                }}
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-1">
                <ImageIcon size={32} />
                <span className="text-xs font-medium">Cover Photo Preview</span>
              </div>
            )}
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-xs text-white text-[11px] font-bold">
              {formData.HighLight_Type}
            </span>
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/90 text-slate-800 text-[10px] font-bold">
              {formData.Accademic_Year}
            </span>
          </div>

          <div className="p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
              {formData.HighLitght_Title || "Highlight Title Display"}
            </h3>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {formData.ShortDescpt || "Summary description text will be shown here for public viewers."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
