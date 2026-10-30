import React, { useState, useRef, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { uploadImageToImgBB } from "../../lib/imgbbService";
import SafeImage from "../../lib/SafeImage";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
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
  Maximize2,
  Download,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";

interface PublicHighlightItem {
  id: number;
  created_at: string;
  HighLitght_Title: string | null;
  HighLight_Type: string | null;
  PhotoImg_Url: string | null;
  ShortDescpt: string | null;
  Accademic_Year?: number | null;
  Academic_Year?: number | null;
  FileType?: string | null;
}

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

  // Gallery of all existing highlights
  const [highlights, setHighlights] = useState<PublicHighlightItem[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState<boolean>(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("All");
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchHighlights = async () => {
    try {
      setLoadingHighlights(true);
      const { data, error } = await SupaBaseFunction
        .from("PublicHighLights")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setHighlights(data as PublicHighlightItem[]);
    } catch (err: any) {
      console.error("Failed to fetch highlights list:", err);
    } finally {
      setLoadingHighlights(false);
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  // Prevent background scroll when fullscreen media is open
  useEffect(() => {
    if (fullscreenMedia) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [fullscreenMedia]);

  const handleDeleteHighlight = async (id: number, title?: string | null) => {
    if (!window.confirm(`Are you sure you want to delete highlight "${title || 'this media highlight'}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(id);
      const { error } = await SupaBaseFunction
        .from("PublicHighLights")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setHighlights((prev) => prev.filter((item) => item.id !== id));
      setFeedback({
        type: "success",
        text: `Highlight "${title || 'Item'}" deleted successfully from campus broadcasts.`,
      });
    } catch (err: any) {
      console.error("Delete highlight failed:", err);
      setFeedback({
        type: "error",
        text: err?.message || "Failed to delete highlight.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadMedia = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename || "highlight-media");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed:", err);
      window.open(url, "_blank");
    }
  };

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

      // Reload highlights gallery immediately
      await fetchHighlights();

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
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Eye size={15} className="text-emerald-600" />
          Live Preview: Current Highlight Broadcast Card
        </div>

        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="aspect-[4/2] bg-slate-100 relative flex items-center justify-center overflow-hidden">
            {formData.PhotoImg_Url ? (
              formData.FileType === "Video" ? (
                <video
                  src={formData.PhotoImg_Url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <SafeImage
                  src={formData.PhotoImg_Url}
                  alt={formData.HighLitght_Title || "Highlight preview"}
                  fallbackCategory="highlight"
                  fallbackText={formData.HighLitght_Title || "Cover Preview"}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-1.5 p-4 text-center">
                <ImageIcon size={32} className="text-slate-300" />
                <span className="text-xs font-semibold">Media Cover Preview</span>
                <span className="text-[10px] text-slate-400">Upload a photo or paste a URL above</span>
              </div>
            )}
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs">
              {formData.HighLight_Type}
            </span>
            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 text-[10px] font-bold shadow-xs border border-slate-200/60">
              AY: {formData.Accademic_Year}
            </span>
          </div>

          <div className="p-5 space-y-2">
            <h3 className="font-bold text-slate-900 text-base line-clamp-1">
              {formData.HighLitght_Title || "Highlight Title Display"}
            </h3>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {formData.ShortDescpt || "Summary description text will be shown here for public viewers."}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALL BROADCASTED HIGHLIGHTS GALLERY (CARDS DISPLAY WITH SAFEIMAGE & MEDIA) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-200">
              <Sparkles size={13} className="text-indigo-600" />
              Broadcast Directory
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              All Highlights & Media Gallery
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Browse all published campus milestones, media cards, and images currently visible to visitors.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={fetchHighlights}
              disabled={loadingHighlights}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Refresh highlights list"
            >
              <RefreshCw size={13} className={loadingHighlights ? "animate-spin text-indigo-600" : "text-slate-500"} />
              <span>Refresh</span>
            </button>
            <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              {highlights.length} Published
            </span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        {(() => {
          const categories = [
            "All",
            ...Array.from(new Set(highlights.map((h) => h.HighLight_Type).filter(Boolean))),
          ];

          return categories.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedTypeFilter(cat as string)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer border ${
                    selectedTypeFilter === cat
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null;
        })()}

        {/* Highlight Cards Grid */}
        {loadingHighlights ? (
          <div className="text-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading campus highlights and media cards...</p>
          </div>
        ) : highlights.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50/50 space-y-2">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">No Highlights Published Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Use the form above to broadcast your first campus achievement, photo, or event spotlight.
            </p>
          </div>
        ) : (
          (() => {
            const filtered =
              selectedTypeFilter === "All"
                ? highlights
                : highlights.filter((h) => h.HighLight_Type === selectedTypeFilter);

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No highlights found under category "{selectedTypeFilter}".
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => (
                  <article
                    key={item.id}
                    className="group bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col hover:border-emerald-300"
                  >
                    {/* Media Container with SafeImage and Fullscreen Trigger */}
                    <div
                      className="aspect-[4/2] relative cursor-pointer overflow-hidden bg-slate-100"
                      onClick={() =>
                        item.PhotoImg_Url &&
                        setFullscreenMedia({
                          url: item.PhotoImg_Url,
                          type: item.FileType || "Photo",
                        })
                      }
                      title="Click to view fullscreen preview"
                    >
                      {item.FileType === "Video" ? (
                        <video
                          src={item.PhotoImg_Url || ""}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <SafeImage
                          src={item.PhotoImg_Url}
                          alt={item.HighLitght_Title || "Highlight"}
                          fallbackCategory="highlight"
                          fallbackText={item.HighLitght_Title || "Highlight Spotlight"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}

                      {/* Top Floating Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                        {item.HighLight_Type && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
                            {item.HighLight_Type}
                          </span>
                        )}
                        {item.FileType && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white text-[9px] font-bold uppercase shadow-xs">
                            {item.FileType}
                          </span>
                        )}
                      </div>

                      {(item.Accademic_Year || item.Academic_Year) && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/95 text-slate-800 text-[10px] font-bold shadow-xs border border-slate-200/80 z-10 flex items-center gap-1">
                          <Layers size={10} className="text-slate-500" />
                          AY: {item.Accademic_Year || item.Academic_Year}
                        </span>
                      )}

                      {/* Hover Overlay with Fullscreen Icon */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-bold shadow-lg">
                          <Maximize2 size={14} className="text-indigo-600" />
                          <span>View Media</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content & Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                          {item.HighLitght_Title || "Untitled Highlight"}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.ShortDescpt || "No summary description available."}
                        </p>
                      </div>

                      {/* Footer Info & Admin Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center text-[11px] font-medium text-slate-400">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {formatResultDate(item.created_at)}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.PhotoImg_Url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadMedia(item.PhotoImg_Url!, `${item.HighLitght_Title || 'highlight'}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Download Media File"
                            >
                              <Download size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHighlight(item.id, item.HighLitght_Title);
                            }}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                            title="Delete this Highlight"
                          >
                            {deletingId === item.id ? (
                              <Loader2 size={14} className="animate-spin text-rose-600" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Fullscreen Media Lightbox Modal */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 transition-opacity"
          onClick={() => setFullscreenMedia(null)}
        >
          {/* Action Header */}
          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex items-center gap-3 z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadMedia(fullscreenMedia.url);
              }}
              className="text-white/90 hover:text-white flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm transition-colors text-xs sm:text-sm font-semibold cursor-pointer"
              aria-label="Download Media"
            >
              <Download size={16} />
              <span>Download</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenMedia(null);
              }}
              className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
              aria-label="Close Fullscreen"
            >
              <X size={20} />
            </button>
          </div>

          {/* Media Container */}
          <div
            className="relative w-full h-full flex justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenMedia.type === "Video" ? (
              <video
                src={fullscreenMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain ring-1 ring-white/10"
              />
            ) : (
              <img
                src={fullscreenMedia.url}
                alt="Fullscreen highlight view"
                className="max-w-full max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain ring-1 ring-white/10"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

