import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { uploadImageToImgBB, processImageToSquareDataUrl } from "../../lib/imgbbService";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import type { Programme } from "./AdminProgrammesList";
import { X, Upload, Save, Loader2 } from "lucide-react";

interface EditProgrammeModalProps {
  program: Programme | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wings?: { WingCode: string; WingTitle: string | null }[];
  lockedWingCode?: string;
}

export default function EditProgrammeModal({
  program,
  isOpen,
  onClose,
  onSuccess,
  wings,
  lockedWingCode,
}: EditProgrammeModalProps) {
  const meta = useProgrammeMeta();

  const [formData, setFormData] = useState<any>({});
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (program) {
      setFormData({
        Program_Title: program.Program_Title || "",
        Category: program.Category || "",
        Group: program.Group || "Assembly",
        WingCode: program.WingCode || "",
        Date: program.Date || "",
        Venue: program.Venue || "",
        Expected_Time: (program as any).Expected_Time || "",
        Collaborator: (program as any).Collaborator || "No Collaboration",
        AccademicYear: program.AccademicYear || meta.activeAcademicYearId || "",
        points_template: (program as any).points_template || meta.defaultTemplateId || "",
        Description: program.Description || "",
        OutComes: program.OutComes || "",
        Program_Poster: program.Program_Poster || "",
        IsApproved: Boolean(program.IsApproved),
        IsOpenRegistration: Boolean(program.IsOpenRegistration),
        IsConducted: Boolean(program.IsConducted),
        is_group_program: Boolean((program as any).is_group_program),
        IsResulted: Boolean(program.IsResulted),
        IsResultPublished: Boolean(program.IsResultPublished),
        isContentRequired: Boolean((program as any).isContentRequired),
        ContentSubmition_deadLine: (program as any).ContentSubmition_deadLine || "",
        is_topic_required: Boolean((program as any).is_topic_required),
        is_result_required: (program as any).is_result_required !== false,
        topic_title: (program as any).topic_title || "",
        is_topic: Boolean((program as any).is_topic),
        drive_link: (program as any).drive_link || "https://drive.google.com/drive/folders/1dXyDEtBW-0gcf1Q12JzFCS8V7L9bXIw4?usp=sharing",
        is_limitation: Boolean((program as any).is_limitation),
        individual_limit_count: (program as any).individual_limit_count ?? 15,
        group_limit_count: (program as any).group_limit_count ?? 7,
      });
      setErrorMsg("");
    }
  }, [program?.Program_Code, isOpen, meta.activeAcademicYearId, meta.defaultTemplateId]);

  if (!isOpen || !program) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPoster(true);
      setErrorMsg("");
      const squareDataUrl = await processImageToSquareDataUrl(file, 480, 0.88);
      let finalUrl = squareDataUrl;
      try {
        const res = await uploadImageToImgBB(file, `${program.Program_Code}_poster`);
        if (res.displayUrl) finalUrl = res.displayUrl;
      } catch {
        finalUrl = squareDataUrl;
      }
      setFormData((prev: any) => ({ ...prev, Program_Poster: finalUrl }));
    } catch (err: any) {
      setErrorMsg("Failed to upload poster image: " + err.message);
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const payload: Record<string, any> = {
        Program_Title: formData.Program_Title ? formData.Program_Title.trim() : null,
        Category: formData.Category || null,
        Group: formData.Group || null,
        WingCode: formData.WingCode || null,
        Date: formData.Date || null,
        Venue: formData.Venue || null,
        Expected_Time: formData.Expected_Time || null,
        Collaborator: formData.Collaborator || "No Collaboration",
        AccademicYear: formData.AccademicYear || null,
        points_template: formData.points_template || null,
        Description: formData.Description ? formData.Description.trim() : null,
        OutComes: formData.OutComes ? formData.OutComes.trim() : null,
        Program_Poster: formData.Program_Poster || null,
        IsApproved: Boolean(formData.IsApproved),
        IsOpenRegistration: Boolean(formData.IsOpenRegistration),
        IsConducted: Boolean(formData.IsConducted),
        is_group_program: Boolean(formData.is_group_program),
        IsResulted: Boolean(formData.IsResulted),
        IsResultPublished: Boolean(formData.IsResultPublished),
        isContentRequired: Boolean(formData.isContentRequired),
        ContentSubmition_deadLine:
          formData.isContentRequired && formData.ContentSubmition_deadLine
            ? formData.ContentSubmition_deadLine
            : null,
        is_topic_required: Boolean(formData.is_topic_required),
        is_result_required: Boolean(formData.is_result_required),
        topic_title: formData.is_topic ? (formData.topic_title || "").trim() || null : null,
        is_topic: Boolean(formData.is_topic),
        drive_link: (formData.drive_link || "").trim() || "https://drive.google.com/drive/folders/1dXyDEtBW-0gcf1Q12JzFCS8V7L9bXIw4?usp=sharing",
        is_limitation: Boolean(formData.is_limitation),
        individual_limit_count: Number(formData.individual_limit_count) || 15,
        group_limit_count: Number(formData.group_limit_count) || 7,
      };

      const wasResultRequired = (program as any).is_result_required !== false;
      const isResultRequired = Boolean(formData.is_result_required);
      const oldWing = program.WingCode;
      const newWing = formData.WingCode || null;

      const { error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .update(payload)
        .eq("Program_Code", program.Program_Code);

      if (error) throw error;

      // Handle Wing point calibrations if result requirement changed (+2 points for no-result-required events)
      try {
        if (wasResultRequired && !isResultRequired && newWing) {
          // Changed to NO result required -> Award +2 points to new wing
          const { data: wRow } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("Total_Points")
            .eq("WingCode", newWing)
            .maybeSingle();
          if (wRow) {
            await SupaBaseFunction
              .from("Chs-WingS")
              .update({ Total_Points: (Number(wRow.Total_Points) || 0) + 2 })
              .eq("WingCode", newWing);
          }
        } else if (!wasResultRequired && isResultRequired && oldWing) {
          // Changed from NO result required to result required -> Revoke the +2 points from old wing
          const { data: wRow } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("Total_Points")
            .eq("WingCode", oldWing)
            .maybeSingle();
          if (wRow) {
            await SupaBaseFunction
              .from("Chs-WingS")
              .update({ Total_Points: Math.max(0, (Number(wRow.Total_Points) || 0) - 2) })
              .eq("WingCode", oldWing);
          }
        } else if (!wasResultRequired && !isResultRequired && oldWing !== newWing) {
          // Wing changed on a no-result-required programme -> transfer 2 points
          if (oldWing) {
            const { data: wOld } = await SupaBaseFunction
              .from("Chs-WingS")
              .select("Total_Points")
              .eq("WingCode", oldWing)
              .maybeSingle();
            if (wOld) {
              await SupaBaseFunction
                .from("Chs-WingS")
                .update({ Total_Points: Math.max(0, (Number(wOld.Total_Points) || 0) - 2) })
                .eq("WingCode", oldWing);
            }
          }
          if (newWing) {
            const { data: wNew } = await SupaBaseFunction
              .from("Chs-WingS")
              .select("Total_Points")
              .eq("WingCode", newWing)
              .maybeSingle();
            if (wNew) {
              await SupaBaseFunction
                .from("Chs-WingS")
                .update({ Total_Points: (Number(wNew.Total_Points) || 0) + 2 })
                .eq("WingCode", newWing);
            }
          }
        }
      } catch (wingPointErr) {
        console.warn("Could not calibrate wing points on programme edit:", wingPointErr);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update programme details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Save size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">Edit Programme Details</h3>
            <p className="text-xs text-emerald-600 font-mono font-bold">{program.Program_Code}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs font-medium">
          {/* Title */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">Programme Title *</label>
            <input
              type="text"
              name="Program_Title"
              required
              value={formData.Program_Title || ""}
              onChange={handleChange}
              className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Grid Row 1: Wing and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Organizing Wing</label>
              {lockedWingCode ? (
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`${lockedWingCode} (Organizing Wing)`}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm bg-slate-100 text-slate-700 font-bold cursor-not-allowed"
                />
              ) : (
                <select
                  name="WingCode"
                  value={formData.WingCode || ""}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
                >
                  <option value="">Select Wing</option>
                  {(wings || meta.wings).map((w: any) => (
                    <option key={w.WingCode} value={w.WingCode}>
                      {w.WingTitle || w.WingCode} ({w.WingCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Category</label>
              <select
                name="Category"
                value={formData.Category || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">No Category (General / All Classes)</option>
                {meta.categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid Row 2: Group and Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Group (Our_Groups)</label>
              <select
                name="Group"
                value={formData.Group || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">No Group (Open / Individual)</option>
                {meta.groups.map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.group_title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Academic Year</label>
              <select
                name="AccademicYear"
                value={formData.AccademicYear || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">None / Unassigned</option>
                {meta.academicYears.map((a) => (
                  <option key={a.accademic_id} value={a.accademic_id}>
                    {a.accademic_year || a.accademic_title} {a.is_active ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid Row 3: Date, Venue, Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Event Date</label>
              <input
                type="date"
                name="Date"
                value={formData.Date || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Venue</label>
              <select
                name="Venue"
                value={formData.Venue || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">No Venue</option>
                {meta.venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.venue_title} {v.venue_capacity ? `(${v.venue_capacity} seats)` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Expected Time Slot</label>
              <select
                name="Expected_Time"
                value={formData.Expected_Time || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">No Time Slot / Flexible</option>
                {meta.expectedTimes.map((t) => (
                  <option key={t.excution_id} value={t.excution_id}>
                    {t.excution_title} {t.is_active ? "" : "(Inactive)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collaborator & Points Template */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Collaborator / Batch Partner (Our_Batches)</label>
              <select
                name="Collaborator"
                value={formData.Collaborator || "No Collaboration"}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="No Collaboration">No Collaboration</option>
                {meta.batches.map((b) => (
                  <option key={b.batch_id} value={b.batch_name}>
                    {b.batch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Points Scoring Template</label>
              <select
                name="points_template"
                value={formData.points_template || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">Default Scoring Template</option>
                {meta.pointsTemplates.map((t) => (
                  <option key={t.p_template_id} value={t.p_template_id}>
                    {t.point_template_title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Poster Section with Upload */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">Programme Poster Image</label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="url"
                name="Program_Poster"
                placeholder="Paste direct Image URL or upload new"
                value={formData.Program_Poster || ""}
                onChange={handleChange}
                className="flex-1 p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden"
              />
              <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition">
                {uploadingPoster ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Upload New Poster
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  disabled={uploadingPoster}
                  className="hidden"
                />
              </label>
            </div>
            {formData.Program_Poster && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={formData.Program_Poster}
                  alt="Poster preview"
                  className="h-16 w-28 object-cover rounded-lg border border-gray-200 shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-[11px] text-gray-500">Live Poster Preview</span>
              </div>
            )}
          </div>

          {/* Study Material / Drive Link */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Study Material / Google Drive Resources Link (drive_link)
            </label>
            <input
              type="url"
              name="drive_link"
              placeholder="https://drive.google.com/drive/folders/..."
              value={formData.drive_link || ""}
              onChange={handleChange}
              className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Provide study notes, syllabus reference, or Google Drive folder for candidates.
            </p>
          </div>

          {/* Description & Outcomes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Short Description</label>
              <textarea
                name="Description"
                rows={3}
                placeholder="Event agenda and brief synopsis..."
                value={formData.Description || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden resize-none"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">Expected Outcomes</label>
              <textarea
                name="OutComes"
                rows={3}
                placeholder="Skills gained, awards, certificates..."
                value={formData.OutComes || ""}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Status Switches */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="IsApproved"
                checked={Boolean(formData.IsApproved)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-gray-800">Approved for Public Display</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="IsOpenRegistration"
                checked={Boolean(formData.IsOpenRegistration)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-gray-800">Open for Registrations</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_group_program"
                checked={Boolean(formData.is_group_program)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-bold text-gray-800">Group / Squad Tournament</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="IsConducted"
                checked={Boolean(formData.IsConducted)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-gray-800">Mark as Conducted</span>
            </label>
          </div>

          {/* Registration Limitation Setting */}
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_limitation"
                checked={Boolean(formData.is_limitation)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="font-bold text-orange-950">
                Enforce Registration Limitation (is_limitation)
              </span>
            </label>
            <p className="text-[11px] text-orange-800 pl-6.5">
              If enabled, only a limited number of candidate registrations or squad entries will be permitted for this programme.
            </p>

            {formData.is_limitation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pl-6.5">
                <div>
                  <label className="block text-[11px] font-bold text-orange-900 mb-1 uppercase tracking-wide">
                    Individual Programme Limit (Candidates)
                  </label>
                  <input
                    type="number"
                    min={1}
                    name="individual_limit_count"
                    value={formData.individual_limit_count ?? 15}
                    onChange={handleChange}
                    className="w-full p-2 border border-orange-300 rounded-xl text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[10px] text-orange-700">Default: 15 candidates</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-orange-900 mb-1 uppercase tracking-wide">
                    Group Programme Limit (Squads)
                  </label>
                  <input
                    type="number"
                    min={1}
                    name="group_limit_count"
                    value={formData.group_limit_count ?? 7}
                    onChange={handleChange}
                    className="w-full p-2 border border-orange-300 rounded-xl text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[10px] text-orange-700">Default: 7 groups</span>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Content Submission Requirement */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="isContentRequired"
                checked={Boolean(formData.isContentRequired)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="font-bold text-amber-950">
                Candidate Content Submission Required (Content_Table)
              </span>
            </label>
            <p className="text-[11px] text-amber-800 pl-6.5">
              If enabled, students registered for this event must submit their speech or essay before the deadline date.
            </p>

            {formData.isContentRequired && (
              <div className="pt-2 pl-6.5">
                <label className="block text-[11px] font-bold text-amber-900 mb-1 uppercase tracking-wide">
                  Content Submission Deadline Date
                </label>
                <input
                  type="date"
                  name="ContentSubmition_deadLine"
                  value={formData.ContentSubmition_deadLine || ""}
                  onChange={handleChange}
                  className="p-2 border border-amber-300 rounded-xl text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Common Topic Provided by Wing Creator */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_topic"
                checked={Boolean(formData.is_topic)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-bold text-teal-950">
                Common Topic Provided by Organizer / Wing Creator (Essay, Story, etc.)
              </span>
            </label>
            <p className="text-[11px] text-teal-800 pl-6.5">
              If enabled, wing creators assign a common topic (e.g. for Essay, Story, Speech) which will be displayed for all candidates to prepare.
            </p>

            {formData.is_topic && (
              <div className="pt-2 pl-6.5">
                <label className="block text-[11px] font-bold text-teal-900 mb-1 uppercase tracking-wide">
                  Common Topic Title *
                </label>
                <input
                  type="text"
                  name="topic_title"
                  placeholder="e.g. The Legacy of Baghdad / Climate Responsibility in Islam"
                  value={formData.topic_title || ""}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-teal-300 rounded-xl text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          {/* Candidate Topic Registration Requirement (Topics_Box) */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_topic_required"
                checked={Boolean(formData.is_topic_required)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-bold text-indigo-950">
                Candidate Topic Registration Required (Topics_Box)
              </span>
            </label>
            <p className="text-[11px] text-indigo-800 pl-6.5">
              If enabled, candidates must register and get their unique topic title & content (naat lyrics, speech outline) approved before competing.
            </p>
          </div>

          {/* Competition Result Requirement Switch */}
          <div className={`p-4 rounded-2xl border space-y-2 transition-colors ${formData.is_result_required ? 'bg-emerald-50/70 border-emerald-200' : 'bg-purple-50/70 border-purple-200'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_result_required"
                checked={Boolean(formData.is_result_required)}
                onChange={handleChange}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <span>Competition Result Required (Official Result Declaration)</span>
                {!formData.is_result_required && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600 text-white">
                    +2 Wing Points Direct
                  </span>
                )}
              </span>
            </label>
            <p className="text-[11px] text-slate-700 pl-6.5">
              {formData.is_result_required
                ? "Standard competitive event. Points are awarded upon official competition result declaration."
                : "Non-competitive or direct event. No result declaration is required. 2 Points are awarded directly to the Wing."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
