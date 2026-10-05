import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import type { ProgrammeFeedbackRecord } from "../lib/types";
import { Star, MessageSquare, CheckCircle, AlertCircle, X, User, Globe } from "lucide-react";

interface ProgrammeFeedbackModalProps {
  programCode: string;
  programTitle: string;
  isOpen: boolean;
  onClose: () => void;
  studentAddNo?: string;
}

export default function ProgrammeFeedbackModal({
  programCode,
  programTitle,
  isOpen,
  onClose,
  studentAddNo,
}: ProgrammeFeedbackModalProps) {
  const [feederType, setFeederType] = useState<"student" | "public">(studentAddNo ? "student" : "public");
  const [studentId, setStudentId] = useState(studentAddNo || "");
  const [publicName, setPublicName] = useState("");
  const [feedText, setFeedText] = useState("");
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  useEffect(() => {
    if (studentAddNo) {
      setStudentId(studentAddNo);
      setFeederType("student");
    }
  }, [studentAddNo]);

  useEffect(() => {
    if (isOpen && programCode) {
      loadFeedbacks();
    }
  }, [isOpen, programCode]);

  const loadFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const { data, error } = await SupaBaseFunction
        .from("FeedBack")
        .select("*, StudentsBox(StudentName)")
        .eq("program_uuid", programCode)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err: any) {
      console.warn("Could not load feedbacks:", err.message);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    if (feedText.trim().length < 20) {
      setStatus({ type: "error", text: "Please provide constructive feedback (at least 20-30 words)." });
      return;
    }

    try {
      setSubmitting(true);

      let payload: ProgrammeFeedbackRecord;

      if (feederType === "student") {
        const trimmedId = studentId.trim();
        if (!trimmedId) {
          setStatus({ type: "error", text: "Please enter your Student Admission Number (AddNo)." });
          setSubmitting(false);
          return;
        }

        // 1. Verify student exists in StudentsBox
        const { data: student, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .eq("AddNo", trimmedId)
          .maybeSingle();

        if (studentError || !student) {
          throw new Error("Student Admission No not found in system registry.");
        }

        // 2. Verify that the student actually participated in this specific programme
        const { data: participation, error: partError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code")
          .eq("Program_Code", programCode)
          .eq("Candidate_Code", trimmedId)
          .maybeSingle();

        if (partError || !participation) {
          throw new Error(
            `Access Denied: Student ${trimmedId} (${student.StudentName}) did not participate in "${programTitle}". Feedback is strictly restricted to students who registered and participated in this programme.`
          );
        }

        payload = {
          student_uuid: trimmedId,
          program_uuid: programCode,
          feed_text: feedText.trim(),
          rating_stars: ratingStars,
          is_public_feedback: false,
          public_feeder_name: student.StudentName || trimmedId,
        };
      } else {
        const trimmedName = publicName.trim();
        if (!trimmedName) {
          setStatus({ type: "error", text: "Please enter your Name or Affiliation." });
          setSubmitting(false);
          return;
        }

        // External/public guest: student_uuid is null
        payload = {
          student_uuid: null,
          program_uuid: programCode,
          feed_text: feedText.trim(),
          rating_stars: ratingStars,
          is_public_feedback: true,
          public_feeder_name: trimmedName,
        };
      }

      const { error: insertError } = await SupaBaseFunction
        .from("FeedBack")
        .insert([payload]);

      if (insertError) throw insertError;

      setStatus({ type: "success", text: "🎉 Thank you! Your feedback has been recorded." });
      setFeedText("");
      if (feederType === "public") setPublicName("");
      await loadFeedbacks();
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "Failed to submit feedback." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="text-indigo-600" size={22} />
          <h3 className="text-lg font-bold text-slate-900">Programme Feedback & Reviews</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">{programTitle} ({programCode})</p>

        {status.text && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 border-b border-slate-100 pb-5 mb-5">
          {/* Identity Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Who is submitting this feedback?</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFeederType("public")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition ${
                  feederType === "public" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe size={14} /> Public / External Guest
              </button>
              <button
                type="button"
                onClick={() => setFeederType("student")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition ${
                  feederType === "student" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User size={14} /> Enrolled Student
              </button>
            </div>
          </div>

          {feederType === "student" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Admission No (AddNo) *</label>
              <input
                type="text"
                required
                placeholder="e.g. STN101"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">We verify your registration to link your student profile.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name & Designation *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Salman Qasmi / Visitor"
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">External visitors and guests do not need a student admission number.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    size={24}
                    className={star <= ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-500 self-center ml-2">{ratingStars} / 5 Stars</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Your Review & Feedback *</label>
            <textarea
              required
              rows={3}
              placeholder="Share your thoughts on the conduct, speakers, venue, or outcomes (> 20 words)..."
              value={feedText}
              onChange={(e) => setFeedText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-hidden resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>

        {/* Existing Feedbacks */}
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Participant & Guest Reviews ({feedbacks.length})</h4>
          {loadingFeedbacks ? (
            <p className="text-xs text-slate-400 py-3">Loading feedback records...</p>
          ) : feedbacks.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No reviews submitted yet for this programme.</p>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb, i) => {
                const displayName = fb.is_public_feedback
                  ? fb.public_feeder_name || "Public Guest"
                  : fb.StudentsBox?.StudentName || fb.public_feeder_name || `Student (${fb.student_uuid || ''})`;

                return (
                  <div key={fb.feedback_id || i} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{displayName}</span>
                        {fb.is_public_feedback ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Guest
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Student
                          </span>
                        )}
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: fb.rating_stars || 5 }).map((_, idx) => (
                          <Star key={idx} size={12} className="fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{fb.feed_text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
