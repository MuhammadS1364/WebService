import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import type { ProgrammeFeedbackRecord } from "../lib/types";
import { Star, MessageSquare, CheckCircle, AlertCircle, X, User } from "lucide-react";

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
  const [studentId, setStudentId] = useState(studentAddNo ? studentAddNo.trim().toUpperCase() : "");
  const [feedText, setFeedText] = useState("");
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  useEffect(() => {
    if (studentAddNo) {
      setStudentId(studentAddNo.trim().toUpperCase());
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

    const trimmedId = studentId.trim().toUpperCase();
    if (!trimmedId) {
      setStatus({ type: "error", text: "Please provide your Student Admission Number (AddNo)." });
      return;
    }

    if (feedText.trim().length < 15) {
      setStatus({ type: "error", text: "Please provide constructive feedback (at least 15-20 characters)." });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Verify student exists in StudentsBox (by AddNo or StudentName)
      let student: any = null;
      const { data: stnByAddNo } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName")
        .ilike("AddNo", trimmedId)
        .maybeSingle();

      if (stnByAddNo) {
        student = stnByAddNo;
      } else {
        const { data: stnByName } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .ilike("StudentName", `%${trimmedId}%`)
          .limit(1)
          .maybeSingle();
        if (stnByName) student = stnByName;
      }

      if (!student) {
        throw new Error(`Student record not found in system registry for "${trimmedId}".`);
      }

      const verifiedAddNo = String(student.AddNo).trim().toUpperCase();

      // 2. Strict Check: Verify that the student actually registered/participated in this specific programme (individual or squad candidate)
      let isRegistered = false;
      const { data: participation, error: partError } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("Candidate_Code")
        .eq("Program_Code", programCode.trim().toUpperCase())
        .ilike("Candidate_Code", verifiedAddNo)
        .maybeSingle();

      if (partError && partError.code !== "PGRST116") throw partError;
      if (participation) {
        isRegistered = true;
      } else {
        // Check if student was registered under a group squad
        const { data: squadCandidates } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("squad_uuid")
          .eq("Program_Code", programCode.trim().toUpperCase())
          .not("squad_uuid", "is", null);

        if (squadCandidates && squadCandidates.length > 0) {
          const squadIds = Array.from(new Set(squadCandidates.map((s: any) => s.squad_uuid).filter(Boolean)));
          const { data: squadRows } = await SupaBaseFunction
            .from("SquadMate")
            .select("member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
            .in("squad_id", squadIds);

          if (squadRows) {
            isRegistered = squadRows.some((sq: any) =>
              [sq.member1_uuid, sq.member2_uuid, sq.member3_uuid, sq.member4_uuid, sq.member5_uuid, sq.member6_uuid, sq.member7_uuid]
                .some((m) => m && String(m).trim().toUpperCase() === verifiedAddNo)
            );
          }
        }
      }

      if (!isRegistered) {
        throw new Error(
          `Access Denied: Student ${student.StudentName} (#${verifiedAddNo}) is not a registered participant of "${programTitle}". Feedback is strictly restricted to students who registered and participated in this programme.`
        );
      }

      const payload: ProgrammeFeedbackRecord = {
        student_uuid: verifiedAddNo,
        program_uuid: programCode.trim().toUpperCase(),
        feed_text: feedText.trim(),
        rating_stars: ratingStars,
        is_public_feedback: false,
        public_feeder_name: student.StudentName ? student.StudentName.toUpperCase() : verifiedAddNo,
      };

      const { error: insertError } = await SupaBaseFunction
        .from("FeedBack")
        .insert([payload]);

      if (insertError) throw insertError;

      setStatus({ type: "success", text: `🎉 Thank you ${student.StudentName}! Your participant review has been submitted.` });
      setFeedText("");
      await loadFeedbacks();
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "Failed to submit feedback." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Participant Programme Feedback</h3>
            <p className="text-xs text-slate-500">{programTitle} ({programCode})</p>
          </div>
        </div>

        {/* Access Notice */}
        <div className="p-3 my-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900">
          <span className="font-bold">Participant Restriction:</span> Only students who registered and participated in this event are permitted to submit reviews.
        </div>

        {status.text && (
          <div className={`p-3.5 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            {status.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle size={16} className="shrink-0" />}
            <span className="leading-snug">{status.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Participant Admission No (AddNo) or Student Name *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. U1476, or Student Name"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none uppercase font-mono"
              />
              <div className="absolute right-3 top-2.5 text-slate-400">
                <User size={16} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Your registered candidate code will be verified against the official attendance registry.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Rating
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRatingStars(star)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      size={22}
                      className={star <= ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-extrabold text-slate-600 ml-2">{ratingStars} / 5 Stars</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Participant Review & Feedback *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Share your experience regarding time management, topic, judging, or competition setup..."
              value={feedText}
              onChange={(e) => setFeedText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            {submitting ? "Verifying Participation & Submitting..." : "Submit Verified Feedback"}
          </button>
        </form>

        {/* Existing Feedbacks */}
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Verified Participant Reviews ({feedbacks.length})
          </h4>
          {loadingFeedbacks ? (
            <p className="text-xs text-slate-400 py-3">Loading feedback records...</p>
          ) : feedbacks.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No participant reviews recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {feedbacks.map((fb, i) => {
                const displayName = fb.StudentsBox?.StudentName || fb.public_feeder_name || `Candidate #${fb.student_uuid || ''}`;

                return (
                  <div key={fb.feedback_id || i} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800">{displayName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Participant
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: fb.rating_stars || 5 }).map((_, idx) => (
                          <Star key={idx} size={11} className="fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{fb.feed_text}</p>
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
