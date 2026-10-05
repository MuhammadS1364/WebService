import React, { useState, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { parseSpreadsheet, downloadSampleTemplate, exportToExcel } from "../../lib/excelService";
import { uploadImageToImgBB } from "../../lib/imgbbService";
import {
  Building2,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  KeyRound,
  Mail,
  User,
  ImageIcon,
  Sparkles,
} from "lucide-react";

interface WingFormData {
  wingCode: string;
  wingTitle: string;
  wingEmail: string;
  wingManager: string;
  wingConvener: string;
  wingAssistant: string;
  Description: string;
  wing_logo: string;
  IsActive: boolean;
  wingUserId?: string;
}

export default function CreateNewWing() {
  const [formData, setFormData] = useState<WingFormData>({
    wingCode: "",
    wingTitle: "",
    wingEmail: "",
    wingManager: "",
    wingConvener: "",
    wingAssistant: "",
    Description: "",
    wing_logo: "",
    IsActive: true,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" | "" }>({
    text: "",
    type: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      setMessage({ text: "", type: "" });
      const identifier = formData.wingCode.trim() || "wing";
      const res = await uploadImageToImgBB(file, `${identifier}_logo`);
      if (res.displayUrl) {
        setFormData((prev) => ({ ...prev, wing_logo: res.displayUrl }));
        setMessage({ text: "Logo uploaded successfully!", type: "success" });
      }
    } catch (err: any) {
      setMessage({ text: "Failed to upload logo image: " + err.message, type: "error" });
    } finally {
      setUploadingLogo(false);
    }
  };

  // 1. Core Logic to Create a Single User & Wing
  const createWingRecord = async (data: WingFormData) => {
    const cleanEmail = data.wingEmail.trim().toLowerCase();
    const cleanCode = data.wingCode.trim().toUpperCase();

    // A. Upsert User in UserTable
    const { error: userError } = await SupaBaseFunction.from("UserTable").upsert(
      [
        {
          UserEmail: cleanEmail,
          UserPassword: cleanCode, // Wing code acts as default initial password
          UserRole: "Wing",
        },
      ],
      { onConflict: "UserEmail", ignoreDuplicates: false }
    );

    if (userError) {
      throw new Error(`User Account Creation Failed: ${userError.message}`);
    }

    // B. Insert Wing into Chs-WingS
    const { error: wingError } = await SupaBaseFunction.from("Chs-WingS").insert([
      {
        WingCode: cleanCode,
        WingTitle: data.wingTitle.trim() || cleanCode,
        WingUserId: data.wingUserId || cleanEmail,
        WingEmail: cleanEmail,
        WingManager: data.wingManager.trim() || null,
        WingConvener: data.wingConvener.trim() || null,
        WingAssistant: data.wingAssistant.trim() || null,
        Description: data.Description.trim() || null,
        wing_logo: data.wing_logo.trim() || null,
        Total_Registrations: 0,
        Total_Resulted: 0,
        Total_Points: 0,
        Bonus_Points: 0,
        IsActive: Boolean(data.IsActive),
      },
    ]);

    if (wingError) throw new Error(`Wing Record Creation Failed: ${wingError.message}`);
  };

  // 2. Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.wingCode.trim() || !formData.wingEmail.trim()) {
      setMessage({ text: "Wing Code and Wing Email are mandatory.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await createWingRecord(formData);
      setMessage({
        text: `🎉 Wing "${formData.wingTitle || formData.wingCode}" created successfully with login access credentials!`,
        type: "success",
      });
      setFormData({
        wingCode: "",
        wingTitle: "",
        wingEmail: "",
        wingManager: "",
        wingConvener: "",
        wingAssistant: "",
        Description: "",
        wing_logo: "",
        IsActive: true,
      });
      if (logoInputRef.current) logoInputRef.current.value = "";
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to create wing record.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Excel Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage({ text: "Parsing spreadsheet and provisioning wing records...", type: "info" });

    try {
      const rows = await parseSpreadsheet(file);
      if (!rows || rows.length === 0) {
        throw new Error("Spreadsheet file is empty.");
      }

      let successCount = 0;
      const usersToCreate: any[] = [];
      const wingsToInsert: any[] = [];

      for (const row of rows) {
        const wingCode = String(row.WingCode || row.wingCode || "").trim().toUpperCase();
        const wingEmail = String(row.WingEmail || row.wingEmail || "").trim().toLowerCase();
        const wingTitle = String(row.WingTitle || row.wingTitle || wingCode).trim();
        const wingManager = String(row.WingManager || row.wingManager || "").trim();
        const wingConvener = String(row.WingConvener || row.wingConvener || "").trim();
        const wingAssistant = String(row.WingAssistant || row.wingAssistant || "").trim();
        const description = String(row.Description || row.description || "").trim();
        const wingLogo = String(row.wing_logo || row.WingLogo || "").trim();

        if (!wingCode || !wingEmail) continue;

        usersToCreate.push({
          UserEmail: wingEmail,
          UserPassword: wingCode,
          UserRole: "Wing",
        });

        wingsToInsert.push({
          WingCode: wingCode,
          WingTitle: wingTitle || wingCode,
          WingEmail: wingEmail,
          WingManager: wingManager || null,
          WingConvener: wingConvener || null,
          WingAssistant: wingAssistant || null,
          Description: description || null,
          wing_logo: wingLogo || null,
          WingUserId: wingEmail,
          Total_Registrations: 0,
          Total_Resulted: 0,
          Total_Points: 0,
          Bonus_Points: 0,
          IsActive: true,
        });

        successCount++;
      }

      if (wingsToInsert.length === 0) {
        throw new Error("No valid wings with both Wing Code and Wing Email were found.");
      }

      // Upsert users
      await SupaBaseFunction.from("UserTable").upsert(usersToCreate, {
        onConflict: "UserEmail",
        ignoreDuplicates: true,
      });

      // Upsert wings
      const { error: wingError } = await SupaBaseFunction.from("Chs-WingS").upsert(wingsToInsert, {
        onConflict: "WingCode",
        ignoreDuplicates: false,
      });
      if (wingError) throw wingError;

      setMessage({
        text: `✅ Successfully imported and synchronized ${successCount} wings with user access credentials!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to import wings from spreadsheet.", type: "error" });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 4. Handle Excel Export
  const handleExport = async () => {
    setLoading(true);
    try {
      const { data, error } = await SupaBaseFunction.from("Chs-WingS").select("*");
      if (error) throw error;
      exportToExcel(data || [], "Wings_Directory_Export.xlsx", "Wings");
      setMessage({ text: "Wings directory exported successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: `Export failed: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
            <Building2 size={14} className="text-emerald-600" />
            Wing Structure Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Create New Wing
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Provision organizational wing departments with leadership hierarchies, user authentication logins, and competition standings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} /> Import XLSX
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <Download size={14} /> Export XLSX
          </button>
          <button
            type="button"
            onClick={() => downloadSampleTemplate("wings")}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={14} /> Sample Template
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : message.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Registration Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          Manual Wing Registration Details
        </h2>

        <form onSubmit={handleManualSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Wing Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Wing Code (Initial Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="text"
                  name="wingCode"
                  value={formData.wingCode}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  placeholder="e.g. WING-01, AL-FAROOQ"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Acts as the default login password.</p>
            </div>

            {/* Wing Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Wing Email (Login Username) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  name="wingEmail"
                  value={formData.wingEmail}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  placeholder="wing@example.com"
                />
              </div>
            </div>

            {/* Wing Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Official Wing Title <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                name="wingTitle"
                value={formData.wingTitle}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                placeholder="e.g. Al Farooq Wing, Science & Tech Department"
              />
            </div>

            {/* Wing Logo Upload & URL */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Wing Emblem / Logo Image
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {formData.wing_logo ? (
                    <img
                      src={formData.wing_logo}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <ImageIcon size={24} className="text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="url"
                    name="wing_logo"
                    value={formData.wing_logo}
                    onChange={handleInputChange}
                    placeholder="https://i.ibb.co/... or enter direct image URL"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-emerald-600" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={13} /> Upload Logo File
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-slate-400">PNG, JPG, SVG square ratio recommended</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leadership Hierarchy */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Wing Manager Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="wingManager"
                  value={formData.wingManager}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  placeholder="Manager Full Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Wing Convener Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="wingConvener"
                  value={formData.wingConvener}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  placeholder="Convener Full Name"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Wing Assistant Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="wingAssistant"
                  value={formData.wingAssistant}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  placeholder="Assistant Full Name"
                />
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Wing Mission & Description
              </label>
              <textarea
                rows={3}
                name="Description"
                value={formData.Description}
                onChange={handleInputChange}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition resize-none"
                placeholder="Brief description about this wing's domain, cultural activities, and goals..."
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="wing_is_active"
              name="IsActive"
              checked={formData.IsActive}
              onChange={handleInputChange}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <label htmlFor="wing_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Mark this wing as Active and operational in the system
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {formData.wingCode && formData.wingEmail ? "✨ Ready to provision" : "Fill code and email"}
            </span>

            <button
              type="submit"
              disabled={loading || !formData.wingCode.trim() || !formData.wingEmail.trim()}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Provisioning Wing...
                </span>
              ) : (
                "Create New Wing"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Card Preview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Eye size={15} className="text-indigo-600" />
          Live Preview: Directory Card
        </div>

        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {formData.wing_logo ? (
                <img src={formData.wing_logo} alt="Preview" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="font-bold text-sm text-emerald-700">
                  {(formData.wingTitle || formData.wingCode || "W")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-base truncate">
                {formData.wingTitle || "Official Wing Title"}
              </h3>
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold mt-0.5">
                {formData.wingCode || "WING-CODE"}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
            <div><strong>Manager:</strong> {formData.wingManager || "Unassigned"}</div>
            <div><strong>Convener:</strong> {formData.wingConvener || "Unassigned"}</div>
            <div><strong>Assistant:</strong> {formData.wingAssistant || "Unassigned"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
