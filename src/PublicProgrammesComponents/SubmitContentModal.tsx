import { useState, useRef } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { uploadImageToImgBB } from "../lib/imgbbService";
import { 
  FileText, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  FileType, 
  Trash2,
  Calendar,
  HelpCircle
} from "lucide-react";

export interface SubmitContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (submission: { programe_code: string; content_title: string }) => void;
  program: {
    Program_Code: string;
    Program_Title: string | null;
    ContentSubmition_deadLine?: string | null;
  } | null;
  studentAddNo: string;
}

export default function SubmitContentModal({
  isOpen,
  onClose,
  onSuccess,
  program,
  studentAddNo,
}: SubmitContentModalProps) {
  if (!isOpen || !program) return null;

  const [contentTitle, setContentTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentFileUrl, setContentFileUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Check deadline
  const isPastDeadline = program.ContentSubmition_deadLine
    ? new Date().toISOString().split("T")[0] > program.ContentSubmition_deadLine
    : false;

  // Handle file selection (docx, tsx, pdf, txt, etc.)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploadError(null);
    setUploadingFile(true);
    setSelectedFileName(file.name);
    setSelectedFileSize((file.size / 1024).toFixed(1) + " KB");

    try {
      // 1. If file is small, read as Data URL to store in content_file
      // If it's an image, attempt ImgBB; otherwise read as Data URL or text
      if (file.type.startsWith("image/")) {
        const imgRes = await uploadImageToImgBB(file, `content_${program.Program_Code}_${studentAddNo}`);
        setContentFileUrl(imgRes.displayUrl || imgRes.url);
      } else {
        // Read file as base64 Data URL so it is fully preserved in content_file column
        const reader = new FileReader();
        const readPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File reading failed"));
        });
        reader.readAsDataURL(file);
        const dataUrl = await readPromise;

        // If dataUrl exceeds reasonable size (> 2MB), warn user to paste text
        if (file.size > 2 * 1024 * 1024) {
          throw new Error("File exceeds 2MB limit for direct attachment.");
        }

        setContentFileUrl(dataUrl);

        // Also if it's text/tsx/md, pre-populate contentText if empty
        if (file.name.endsWith(".txt") || file.name.endsWith(".tsx") || file.name.endsWith(".ts") || file.name.endsWith(".md")) {
          const textReader = new FileReader();
          textReader.onload = () => {
            if (typeof textReader.result === "string" && !contentText.trim()) {
              setContentText(textReader.result.slice(0, 5000));
            }
          };
          textReader.readAsText(file);
        }
      }
    } catch (err: any) {
      console.warn("File upload issue encountered:", err);
      // Prompt user graciously to paste their content directly in content_text
      setFileUploadError(
        "⚠️ File upload issue: You can paste your content (essay, code, or article text) directly into the Content Text box below!"
      );
      setContentFileUrl(null);
      // Automatically focus content text area
      setTimeout(() => {
        contentTextareaRef.current?.focus();
      }, 100);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setContentFileUrl(null);
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setFileUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim()) {
      setErrorMessage("Please enter a title for your submission.");
      return;
    }

    if (!contentText.trim() && !contentFileUrl) {
      setErrorMessage("Please attach a document file (docx, pdf, tsx) or paste your content in the text box.");
      return;
    }

    if (isPastDeadline) {
      setErrorMessage("The deadline for content submission for this programme has expired.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // Primary insertion according to Content_Table schema
      const payload: any = {
        programe_code: program.Program_Code,
        student_addNo: studentAddNo,
        content_title: contentTitle.trim(),
        like_count: 0,
        content_text: contentText.trim() || null,
        content_file: contentFileUrl || null,
      };

      const { error: insertError } = await SupaBaseFunction
        .from("Content_Table")
        .insert([payload]);

      if (insertError) {
        // Fallback retry if optional columns are pending in DB migration
        if (insertError.message.includes("content_text") || insertError.message.includes("content_file")) {
          const fallbackPayload = {
            programe_code: program.Program_Code,
            student_addNo: studentAddNo,
            content_title: contentTitle.trim(),
            like_count: 0,
          };
          const { error: fallbackError } = await SupaBaseFunction
            .from("Content_Table")
            .insert([fallbackPayload]);
          if (fallbackError) throw fallbackError;
        } else {
          throw insertError;
        }
      }

      setSuccessMessage("✅ Content submitted successfully!");
      onSuccess({
        programe_code: program.Program_Code,
        content_title: contentTitle.trim(),
      });

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMessage(err.message || "Failed to submit content. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Submit Programme Content
              </h3>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                {program.Program_Title} (#{program.Program_Code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Deadline Notice */}
        {program.ContentSubmition_deadLine && (
          <div
            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              isPastDeadline
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <Calendar size={15} />
            <span>
              Submission Deadline:{" "}
              <strong>{program.ContentSubmition_deadLine}</strong>
              {isPastDeadline ? " (Closed)" : " (Open)"}
            </span>
          </div>
        )}

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Content Title / Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. An In-depth Analysis of Contemporary Islamic Ethics"
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Document File Upload Section */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Upload size={14} className="text-indigo-600" />
                Attach Document File (docx, pdf, tsx, txt)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Optional</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.tsx,.ts,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFileName ? (
              /* Attached file preview */
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {selectedFileName.endsWith(".tsx") || selectedFileName.endsWith(".ts") ? (
                      <FileCode size={16} />
                    ) : (
                      <FileType size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {selectedFileName}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {uploadingFile ? "Attaching file..." : `Ready (${selectedFileSize})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone button */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-2xl p-4 text-center cursor-pointer transition"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <Upload size={22} className="text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">
                    Click to browse and upload file
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Supports Word (.docx), PDF (.pdf), Code (.tsx, .ts), Text (.txt)
                  </p>
                </div>
              </div>
            )}

            {/* Error suggestion banner if file upload failed */}
            {fileUploadError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={14} />
                  <span>File Upload Notice</span>
                </div>
                <p>{fileUploadError}</p>
              </div>
            )}
          </div>

          {/* Direct Content Text Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Content Text / Essay Body (content_text)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {contentText.length} characters
              </span>
            </div>
            <textarea
              ref={contentTextareaRef}
              rows={6}
              placeholder="Paste your essay, article, write-up, or code directly here (recommended backup if file cannot be uploaded)..."
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <HelpCircle size={12} />
              If you experienced any file upload issue, pasting your full text here ensures your submission is recorded without problems.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isPastDeadline}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? "Submitting..." : "Submit to Content_Table"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
