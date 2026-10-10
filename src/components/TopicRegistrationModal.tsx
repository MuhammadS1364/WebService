import { useState, useEffect, type FormEvent } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import {
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";

export interface TopicRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  programCode: string;
  programTitle?: string;
  studentAddNo?: string | null;
  teamUuid?: string | null;
  onSuccess?: () => void;
}

export default function TopicRegistrationModal({
  isOpen,
  onClose,
  programCode,
  programTitle = "",
  studentAddNo,
  teamUuid,
  onSuccess,
}: TopicRegistrationModalProps) {
  if (!isOpen) return null;

  const [topicTitle, setTopicTitle] = useState("");
  const [topicContent, setTopicContent] = useState("");
  const [existingTopic, setExistingTopic] = useState<{
    topic_id: string;
    topic_title: string;
    topic_content: string;
    is_approved: boolean;
    created_at: string;
  } | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingTitle, setCheckingTitle] = useState(false);
  const [titleAvailability, setTitleAvailability] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check if student or team already registered a topic for this program
  useEffect(() => {
    let isMounted = true;
    const fetchExisting = async () => {
      try {
        setLoadingInitial(true);
        setStatusMessage(null);

        let query = SupaBaseFunction.from("Topics_Box")
          .select("topic_id, topic_title, topic_content, is_approved, created_at")
          .eq("program_code", programCode);

        if (studentAddNo) {
          query = query.eq("student_addNo", studentAddNo);
        } else if (teamUuid) {
          query = query.eq("team_uuid", teamUuid);
        }

        const { data, error } = await query.maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.warn("Could not query existing topic:", error);
        }

        if (isMounted && data) {
          setExistingTopic(data);
          setTopicTitle(data.topic_title || "");
          setTopicContent(data.topic_content || "");
        }
      } catch (err) {
        console.error("Error fetching existing topic:", err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    fetchExisting();
    return () => {
      isMounted = false;
    };
  }, [programCode, studentAddNo, teamUuid]);

  // Real-time Title uniqueness check
  useEffect(() => {
    if (!topicTitle.trim() || (existingTopic && topicTitle.trim() === existingTopic.topic_title)) {
      setTitleAvailability(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingTitle(true);
        const { data, error } = await SupaBaseFunction.from("Topics_Box")
          .select("topic_id, topic_title, program_code")
          .ilike("topic_title", topicTitle.trim())
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (data && (!existingTopic || data.topic_id !== existingTopic.topic_id)) {
          setTitleAvailability({
            available: false,
            message: `⚠️ This topic title is already registered by another participant! Topics must be unique.`,
          });
        } else {
          setTitleAvailability({
            available: true,
            message: `✅ Unique topic title! Available for registration.`,
          });
        }
      } catch (err) {
        console.warn("Title check error:", err);
      } finally {
        setCheckingTitle(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [topicTitle, existingTopic]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a valid topic title." });
      return;
    }

    if (titleAvailability && !titleAvailability.available) {
      setStatusMessage({
        type: "error",
        text: "Cannot submit: this topic title is already taken. Please choose a unique title.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (existingTopic) {
        // Update
        const { error } = await SupaBaseFunction.from("Topics_Box")
          .update({
            topic_title: topicTitle.trim(),
            topic_content: topicContent.trim() || "topic_content for i.e : naat lyrics etc",
            is_approved: false, // Re-submitting resets approval for review
          })
          .eq("topic_id", existingTopic.topic_id);

        if (error) throw error;

        setStatusMessage({
          type: "success",
          text: "Topic updated successfully! Pending admin/judge review.",
        });
        setExistingTopic((prev) =>
          prev
            ? {
                ...prev,
                topic_title: topicTitle.trim(),
                topic_content: topicContent.trim(),
                is_approved: false,
              }
            : null
        );
      } else {
        // Insert new
        const payload: Record<string, any> = {
          topic_title: topicTitle.trim(),
          program_code: programCode,
          topic_content: topicContent.trim() || "topic_content for i.e : naat lyrics etc",
          is_approved: false,
        };

        if (studentAddNo) payload.student_addNo = studentAddNo;
        if (teamUuid) payload.team_uuid = teamUuid;

        const { data, error } = await SupaBaseFunction.from("Topics_Box")
          .insert([payload])
          .select()
          .single();

        if (error) {
          if (error.code === "23505" || error.message.includes("unique")) {
            throw new Error("This topic title is already registered by another participant. Please choose a different title.");
          }
          throw error;
        }

        setStatusMessage({
          type: "success",
          text: "🎉 Topic registered successfully! Pending judge approval.",
        });
        if (data) setExistingTopic(data);
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Topic registration error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save topic registration.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Official Topic Registration</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Register Programme Topic
            </h2>
            <p className="text-xs text-indigo-200 font-medium">
              Event: <span className="text-white font-bold">{programTitle || programCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Status Banner */}
        {existingTopic && (
          <div
            className={`p-4 border-b flex items-center gap-3 text-xs font-semibold ${
              existingTopic.is_approved
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {existingTopic.is_approved ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={18} className="text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {existingTopic.is_approved
                  ? "Topic Officially Approved by Review Board"
                  : "Topic Submitted — Awaiting Approval"}
              </p>
              <p className="text-[11px] opacity-80">
                Registered on {new Date(existingTopic.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        {loadingInitial ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading topic registry...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Status alerts */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Candidate / Team attribution info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Participant Attribution:</span>
              <span className="font-bold font-mono text-slate-800">
                {studentAddNo ? `Student #${studentAddNo}` : teamUuid ? `Squad Team #${teamUuid.slice(0, 8)}` : "Registered Candidate"}
              </span>
            </div>

            {/* Topic Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Topic Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Madh Song: Ya Sayyidi, Speech: Environmental Ethics in Islam..."
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
              {checkingTitle && (
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Verifying title uniqueness...
                </p>
              )}
              {titleAvailability && !checkingTitle && (
                <p
                  className={`text-[11px] font-semibold mt-1 ${
                    titleAvailability.available ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {titleAvailability.message}
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                Notice: Competition rules enforce unique topic titles across participants to prevent duplicate presentations.
              </p>
            </div>

            {/* Topic Content / Lyrics / Outline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Topic Content / Lyrics / Synopsis</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional / As Required</span>
              </label>
              <textarea
                rows={5}
                placeholder="Paste song lyrics, speech key points, summary, or reference sources for review..."
                value={topicContent}
                onChange={(e) => setTopicContent(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none font-mono"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (titleAvailability !== null && !titleAvailability.available)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    <span>{existingTopic ? "Update Topic" : "Submit Topic Registration"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
