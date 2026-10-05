import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { uploadImageToImgBB } from "../../lib/imgbbService";
import SafeImage from "../../lib/SafeImage";
import { cacheWingProfile } from "../../lib/wingResolver";
import { X, Upload, Save, Loader2, Building2, Check, AlertCircle } from "lucide-react";

export interface EditableWing {
  WingTitle: string | null;
  WingCode: string;
  WingEmail?: string | null;
  WingManager?: string | null;
  WingConvener?: string | null;
  WingAssistant?: string | null;
  Total_Points?: number | null;
  Bonus_Points?: number | null;
  Description?: string | null;
  wing_logo?: string | null;
  IsActive: boolean;
}

interface EditWingModalProps {
  wing: EditableWing | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditWingModal({
  wing,
  isOpen,
  onClose,
  onSuccess,
}: EditWingModalProps) {
  const [formData, setFormData] = useState({
    WingTitle: "",
    WingCode: "",
    WingEmail: "",
    newPassword: "",
    WingManager: "",
    WingConvener: "",
    WingAssistant: "",
    Total_Points: 0,
    Bonus_Points: 0,
    Description: "",
    wing_logo: "",
    IsActive: true,
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (wing) {
      setFormData({
        WingTitle: wing.WingTitle || "",
        WingCode: wing.WingCode || "",
        WingEmail: wing.WingEmail || "",
        newPassword: "",
        WingManager: wing.WingManager || "",
        WingConvener: wing.WingConvener || "",
        WingAssistant: wing.WingAssistant || "",
        Total_Points: Number(wing.Total_Points ?? 0),
        Bonus_Points: Number(wing.Bonus_Points ?? 0),
        Description: wing.Description || "",
        wing_logo: wing.wing_logo || "",
        IsActive: wing.IsActive !== false,
      });
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [wing, isOpen]);

  if (!isOpen || !wing) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      setErrorMsg("");
      const res = await uploadImageToImgBB(file, `${wing.WingCode}_logo`);
      setFormData((prev) => ({ ...prev, wing_logo: res.displayUrl }));
      setSuccessMsg("Wing logo uploaded successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload logo image.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updatedPayload: Record<string, any> = {
        WingTitle: formData.WingTitle.trim(),
        WingEmail: formData.WingEmail ? formData.WingEmail.trim() : null,
        WingUserId: formData.WingEmail ? formData.WingEmail.trim() : (wing.WingEmail || wing.WingCode),
        WingManager: formData.WingManager ? formData.WingManager.trim() : null,
        WingConvener: formData.WingConvener ? formData.WingConvener.trim() : null,
        WingAssistant: formData.WingAssistant ? formData.WingAssistant.trim() : null,
        Total_Points: Number(formData.Total_Points) || 0,
        Bonus_Points: Number(formData.Bonus_Points) || 0,
        Description: formData.Description ? formData.Description.trim() : null,
        wing_logo: formData.wing_logo ? formData.wing_logo.trim() : null,
        IsActive: Boolean(formData.IsActive),
      };

      // 1. Update Chs-WingS table
      const { error: wingError } = await SupaBaseFunction
        .from("Chs-WingS")
        .update(updatedPayload)
        .eq("WingCode", wing.WingCode);

      if (wingError) throw wingError;

      // 2. If WingEmail or password changed, keep UserTable in sync
      const oldEmail = wing.WingEmail?.trim();
      const newEmail = formData.WingEmail?.trim();
      const newPassword = formData.newPassword?.trim();

      const userTableUpdate: Record<string, any> = {};
      if (newEmail && oldEmail && oldEmail !== newEmail) {
        userTableUpdate.UserEmail = newEmail;
      }
      if (newPassword) {
        userTableUpdate.UserPassword = newPassword;
      }

      if (Object.keys(userTableUpdate).length > 0) {
        // Try matching by oldEmail first, or by newEmail, or by WingCode
        if (oldEmail) {
          await SupaBaseFunction
            .from("UserTable")
            .update(userTableUpdate)
            .ilike("UserEmail", oldEmail);
        } else {
          await SupaBaseFunction
            .from("UserTable")
            .update(userTableUpdate)
            .eq("UserPassword", wing.WingCode);
        }
      }

      // 3. Cache & Broadcast Sync
      cacheWingProfile({ ...updatedPayload, WingCode: wing.WingCode }, true);

      setSuccessMsg("Wing information updated successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save wing updates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto border border-slate-100 font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Edit Wing Information</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {wing.WingCode}
              </span>
              <span className="text-xs text-slate-400">• Department Profile & Leadership</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Logo & Wing Title Grid */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            {/* Logo Preview */}
            <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white p-1 shrink-0 overflow-hidden shadow-xs flex items-center justify-center">
              {formData.wing_logo ? (
                <SafeImage
                  src={formData.wing_logo}
                  alt={formData.WingTitle || "Logo"}
                  fallbackCategory="wing"
                  fallbackText={formData.WingTitle || "W"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xl font-bold text-indigo-600">
                  {(formData.WingTitle || "W")[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Wing Logo (URL or Direct Upload)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="wing_logo"
                  value={formData.wing_logo}
                  onChange={handleChange}
                  placeholder="https://... (image link)"
                  className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0">
                  {uploadingLogo ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  <span>{uploadingLogo ? "Uploading..." : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Wing Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wing Title *
              </label>
              <input
                type="text"
                name="WingTitle"
                value={formData.WingTitle}
                onChange={handleChange}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
              />
            </div>

            {/* Wing Code (Readonly) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Wing Code (Primary Key)
              </label>
              <input
                type="text"
                value={formData.WingCode}
                disabled
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono font-bold cursor-not-allowed"
              />
            </div>

            {/* Login Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wing Login Email *
              </label>
              <input
                type="email"
                name="WingEmail"
                value={formData.WingEmail}
                onChange={handleChange}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
              />
            </div>

            {/* Login Password (Optional Change) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reset Login Password (Optional)
              </label>
              <input
                type="text"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Leave blank to keep current"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700"
              />
            </div>

            {/* Standard Points */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Standard Points
              </label>
              <input
                type="number"
                name="Total_Points"
                value={formData.Total_Points}
                onChange={handleChange}
                min={0}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono font-bold text-violet-700"
              />
            </div>

            {/* Bonus Points */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bonus Points
              </label>
              <input
                type="number"
                name="Bonus_Points"
                value={formData.Bonus_Points}
                onChange={handleChange}
                min={0}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono font-bold text-pink-600"
              />
            </div>

            {/* Leadership: Manager */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wing Manager
              </label>
              <input
                type="text"
                name="WingManager"
                value={formData.WingManager}
                onChange={handleChange}
                placeholder="Manager Name"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Leadership: Convener */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wing Convener
              </label>
              <input
                type="text"
                name="WingConvener"
                value={formData.WingConvener}
                onChange={handleChange}
                placeholder="Convener Name"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Leadership: Assistant */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wing Assistant
              </label>
              <input
                type="text"
                name="WingAssistant"
                value={formData.WingAssistant}
                onChange={handleChange}
                placeholder="Assistant Name"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wing Description / Objectives
              </label>
              <textarea
                name="Description"
                value={formData.Description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe the wing purpose and operational scope..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Active Status Checkbox */}
            <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Operational Status</p>
                <p className="text-[11px] text-slate-500">Allow this wing to manage programmes and publish results.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="IsActive"
                  checked={formData.IsActive}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingLogo}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{saving ? "Saving Changes..." : "Save Wing Info"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
