import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import dhiuLogo from "../ImgBox/Dhiu.jpg";
import SafeImage from "../lib/SafeImage";
import { broadcastProfileUpdate } from "../lib/accountResolver";
import {
  User,
  Mail,
  Lock,
  Building2,
  GraduationCap,
  MapPin,
  Camera,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  BadgeCheck,
  ChevronLeft,
  ImageIcon,
  Upload,
  Loader2,
  Trash2
} from "lucide-react";
import { uploadImageToImgBB, processImageToSquareDataUrl } from "../lib/imgbbService";

export type RoleType = "student" | "wing" | "treasurer" | "outreach";

export default function UpdateProfile() {
  const navigate = useNavigate();
  const { actStn, actWing, actTreasurer, actOutReach } = useParams<{
    actStn?: string;
    actWing?: string;
    actTreasurer?: string;
    actOutReach?: string;
  }>();

  // Determine user identifier and role
  const activeEmail = actStn || actWing || actTreasurer || actOutReach || "";
  const role: RoleType = actStn
    ? "student"
    : actWing
    ? "wing"
    : actTreasurer
    ? "treasurer"
    : actOutReach
    ? "outreach"
    : "student";

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  // Common User Password State
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Student specific profile state
  const [studentData, setStudentData] = useState({
    AddNo: "",
    StudentName: "",
    FatherName: "",
    CollegeName: "",
    Class: "",
    StnState: "",
    StnDistrict: "",
    Student_Photo_Urls: "",
  });

  // Wing specific profile state (Including wing_logo as requested by user)
  const [wingData, setWingData] = useState({
    WingCode: "",
    WingTitle: "",
    WingManager: "",
    WingConvener: "",
    WingAssistant: "",
    Description: "",
    wing_logo: "",
  });

  // Treasurer specific profile state
  const [treasurerData, setTreasurerData] = useState({
    Treasurer_id: "",
    Treasurer_Name: "",
    AccountingFor: "",
    Treasurer_UserId: "",
  });

  // Outreach profile state
  const [outreachData, setOutreachData] = useState({
    OfficerName: "",
    Domain: "Public Outreach & Community Engagements",
    ContactNumber: "",
    Notes: "",
  });

  // Upload states
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [uploadingWingLogo, setUploadingWingLogo] = useState<boolean>(false);

  // Handle direct file upload for Student Photo
  const handleStudentPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setStatusMessage({ type: "", text: "" });

    try {
      // 1. Instantly process to 1:1 perfect square data URL
      const squareDataUrl = await processImageToSquareDataUrl(file, 360, 0.86);
      let newPhotoUrl = squareDataUrl;

      // 2. Try external host, keep crisp square data URL on fail
      try {
        const res = await uploadImageToImgBB(file, `std_${studentData.AddNo || "profile"}`);
        if (res.displayUrl) newPhotoUrl = res.displayUrl;
      } catch (uploadErr) {
        console.warn("Using local 1:1 square photo:", uploadErr);
      }
      
      setStudentData((prev) => ({
        ...prev,
        Student_Photo_Urls: newPhotoUrl,
      }));

      // 3. Immediately persist to database if student AddNo exists
      if (studentData.AddNo) {
        await SupaBaseFunction.from("StudentsBox")
          .update({ Student_Photo_Urls: newPhotoUrl })
          .eq("AddNo", studentData.AddNo);

        broadcastProfileUpdate({
          ...studentData,
          Student_Photo_Urls: newPhotoUrl,
        });
      }

      setStatusMessage({
        type: "success",
        text: "Student photo updated & saved successfully!",
      });
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to process photo. Please try a different image.",
      });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // Handle direct file upload for Wing Logo
  const handleWingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingWingLogo(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const res = await uploadImageToImgBB(file, `wing_${wingData.WingCode || "logo"}`);
      const newLogoUrl = res.displayUrl || res.url;
      
      setWingData((prev) => ({
        ...prev,
        wing_logo: newLogoUrl,
      }));

      setStatusMessage({
        type: "success",
        text: "Wing logo uploaded successfully! Click 'Save Changes' to update.",
      });
    } catch (err: any) {
      console.error("Wing logo upload error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to process logo. Please try a different image.",
      });
    } finally {
      setUploadingWingLogo(false);
      e.target.value = "";
    }
  };

  // Fetch Profile and User Password on mount
  useEffect(() => {
    async function loadProfile() {
      if (!activeEmail) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatusMessage({ type: "", text: "" });

      try {
        // 1. Fetch User Record from UserTable for Password
        const { data: userRec } = await SupaBaseFunction
          .from("UserTable")
          .select("UserEmail, UserPassword")
          .eq("UserEmail", activeEmail)
          .maybeSingle();

        if (userRec) {
          setCurrentPassword(userRec.UserPassword || "");
        }

        // 2. Fetch specific role record
        if (role === "student") {
          const { data, error } = await SupaBaseFunction
            .from("StudentsBox")
            .select("*")
            .eq("StudentEmail", activeEmail)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setStudentData({
              AddNo: data.AddNo || "",
              StudentName: data.StudentName || "",
              FatherName: data.FatherName || "",
              CollegeName: data.CollegeName || "",
              Class: data.Class || "",
              StnState: data.StnState || "",
              StnDistrict: data.StnDistrict || "",
              Student_Photo_Urls: data.Student_Photo_Urls || "",
            });
          }
        } else if (role === "wing") {
          const { data, error } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("*")
            .eq("WingEmail", activeEmail)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setWingData({
              WingCode: data.WingCode || "",
              WingTitle: data.WingTitle || "",
              WingManager: data.WingManager || "",
              WingConvener: data.WingConvener || "",
              WingAssistant: data.WingAssistant || "",
              Description: data.Description || "",
              wing_logo: data.wing_logo || data.Wing_Logo || "",
            });
          }
        } else if (role === "treasurer") {
          const { data, error } = await SupaBaseFunction
            .from("TreasurerVolt")
            .select("*")
            .eq("Treasurer_Email", activeEmail)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setTreasurerData({
              Treasurer_id: data.Treasurer_id || "",
              Treasurer_Name: data.Treasurer_Name || "",
              AccountingFor: data.AccountingFor || "",
              Treasurer_UserId: data.Treasurer_UserId || "",
            });
          }
        } else if (role === "outreach") {
          const storedProfile = localStorage.getItem(`outreach_profile_${activeEmail}`);
          if (storedProfile) {
            try {
              setOutreachData(JSON.parse(storedProfile));
            } catch (e) {
              console.error(e);
            }
          } else {
            setOutreachData({
              OfficerName: activeEmail.split("@")[0].toUpperCase(),
              Domain: "Public Outreach, Inter-Collegiate Competitions & Media",
              ContactNumber: "+91 98460 00000",
              Notes: "Managing all outreach programs and external talent participation.",
            });
          }
        }
      } catch (err: any) {
        console.error("Error loading profile:", err);
        setStatusMessage({
          type: "error",
          text: err.message || "Failed to load profile details.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [activeEmail, role]);

  // Handle Form Submission - STRICT RULE: UserEmail is never altered!
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage({ type: "", text: "" });

    try {
      // 1. If new password provided, update UserTable
      if (newPassword.trim()) {
        const { error: passErr } = await SupaBaseFunction
          .from("UserTable")
          .update({ UserPassword: newPassword.trim() })
          .eq("UserEmail", activeEmail);

        if (passErr) throw passErr;
        setCurrentPassword(newPassword.trim());
        setNewPassword("");
      }

      // 2. Update Role Specific Database Table
      if (role === "student") {
        if (!studentData.AddNo) throw new Error("Student Admission Number not found.");

        const { error } = await SupaBaseFunction
          .from("StudentsBox")
          .update({
            StudentName: studentData.StudentName,
            FatherName: studentData.FatherName,
            CollegeName: studentData.CollegeName,
            Class: studentData.Class,
            StnState: studentData.StnState,
            StnDistrict: studentData.StnDistrict,
            Student_Photo_Urls: studentData.Student_Photo_Urls,
            // StudentEmail is NEVER altered!
          })
          .eq("AddNo", studentData.AddNo);

        if (error) throw error;

        // Sync updated profile to cache and trigger real-time app update
        broadcastProfileUpdate({
          ...studentData,
          StudentEmail: activeEmail,
        });
      } else if (role === "wing") {
        if (!wingData.WingCode) throw new Error("Wing Code not found.");

        // Update with wing_logo
        const updatePayload: Record<string, any> = {
          WingTitle: wingData.WingTitle,
          WingManager: wingData.WingManager,
          WingConvener: wingData.WingConvener,
          WingAssistant: wingData.WingAssistant,
          Description: wingData.Description,
          wing_logo: wingData.wing_logo,
          // WingEmail is NEVER altered!
        };

        const { error } = await SupaBaseFunction
          .from("Chs-WingS")
          .update(updatePayload)
          .eq("WingCode", wingData.WingCode);

        if (error) throw error;
        window.dispatchEvent(new CustomEvent("wing-profile-synced", { detail: updatePayload }));
      } else if (role === "treasurer") {
        if (!treasurerData.Treasurer_id) throw new Error("Treasurer ID not found.");

        const { error } = await SupaBaseFunction
          .from("TreasurerVolt")
          .update({
            Treasurer_Name: treasurerData.Treasurer_Name,
            AccountingFor: treasurerData.AccountingFor,
            Treasurer_UserId: treasurerData.Treasurer_UserId,
            // Treasurer_Email is NEVER altered!
          })
          .eq("Treasurer_id", treasurerData.Treasurer_id);

        if (error) throw error;
      } else if (role === "outreach") {
        localStorage.setItem(`outreach_profile_${activeEmail}`, JSON.stringify(outreachData));
      }

      setStatusMessage({
        type: "success",
        text: "Profile updated successfully! All changes have been saved.",
      });

      setTimeout(() => {
        setStatusMessage({ type: "", text: "" });
      }, 5000);
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case "student":
        return {
          title: "Student Portal",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <GraduationCap className="w-4 h-4 text-emerald-600" />,
        };
      case "wing":
        return {
          title: "Wing Department",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <Building2 className="w-4 h-4 text-blue-600" />,
        };
      case "treasurer":
        return {
          title: "Treasurer Vault",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <Shield className="w-4 h-4 text-amber-600" />,
        };
      case "outreach":
        return {
          title: "Outreach & Engagements",
          color: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <Sparkles className="w-4 h-4 text-purple-600" />,
        };
    }
  };

  const badgeInfo = getRoleBadge();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium text-sm">Loading your profile record...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-4 sm:py-6 px-3 sm:px-6 space-y-6 pb-28">
      
      {/* INSTITUTIONAL BRANDING HEADER WITH WHITE BACKGROUND */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* University Official Logo */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-50 p-2 shadow-xs border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src={dhiuLogo}
                alt="Darul Huda Islamic University Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  DHIU Official
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeInfo.color}`}
                >
                  {badgeInfo.icon}
                  {badgeInfo.title}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Account & Profile Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Darul Huda Islamic University — Manage your credentials, profile details, and assets.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer shrink-0"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        </div>
      </div>

      {/* FEEDBACK STATUS ALERT */}
      {statusMessage.text && (
        <div className="max-w-4xl mx-auto">
          <div
            className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-semibold transition-all shadow-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* MAIN PROFILE FORM */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        
        {/* SECTION 1: IDENTITY & STRICTLY LOCKED USER EMAIL */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-indigo-600" />
              Verified Account Credentials
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authentication identity permanently registered in the university system.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LOCKED USER EMAIL FIELD (EXPLICIT USER REQUIREMENT: CANNOT BE EDITED) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Primary User Email Address
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Immutable / Non-Editable
                </span>
              </div>

              <div className="relative">
                <input
                  type="email"
                  value={activeEmail}
                  readOnly
                  disabled
                  className="w-full bg-slate-100 border border-slate-300 text-slate-700 font-mono text-xs sm:text-sm rounded-xl px-4 py-2.5 pl-10 shadow-inner cursor-not-allowed select-none opacity-90 focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <Lock className="w-4 h-4 text-amber-600 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                🔒 Security Protocol: <span className="font-medium text-slate-600">userEmail is permanently bound to your account and cannot be modified.</span>
              </p>
            </div>

            {/* Read-only ID reference */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {role === "student"
                  ? "Admission Number (AddNo)"
                  : role === "wing"
                  ? "Wing Code"
                  : role === "treasurer"
                  ? "Treasurer ID"
                  : "Outreach Identifier"}
              </label>
              <input
                type="text"
                value={
                  role === "student"
                    ? studentData.AddNo
                    : role === "wing"
                    ? wingData.WingCode
                    : role === "treasurer"
                    ? treasurerData.Treasurer_id
                    : activeEmail.split("@")[0].toUpperCase()
                }
                readOnly
                disabled
                className="w-full bg-slate-100 border border-slate-300 text-slate-700 font-mono text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-inner cursor-not-allowed select-none opacity-85"
              />
            </div>

            {/* Assigned Role */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Authorized Role
              </label>
              <input
                type="text"
                value={role.toUpperCase()}
                readOnly
                disabled
                className="w-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-inner cursor-not-allowed select-none opacity-85"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: ROLE SPECIFIC EDITABLE FIELDS */}
        
        {/* STUDENT ROLE FORM */}
        {role === "student" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                Student Academic Identity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your personal information and student avatar.
              </p>
            </div>

            {/* Photo & Upload Section (Preset avatars removed, upload enabled) */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-md ring-4 ring-emerald-500/20 bg-white border border-slate-200 shrink-0 flex items-center justify-center group">
                <SafeImage
                  src={studentData.Student_Photo_Urls}
                  alt={studentData.StudentName || "Student Photo"}
                  fallbackCategory="student"
                  fallbackText={studentData.StudentName || "S"}
                  className="w-full h-full object-cover object-center aspect-square"
                />

                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 text-white z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-[10px] font-bold">Cropping...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      Student Profile Photo
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload from phone or device • Auto-cropped to 1:1 square
                    </p>
                  </div>

                  {studentData.Student_Photo_Urls && (
                    <button
                      type="button"
                      onClick={() => setStudentData(prev => ({ ...prev, Student_Photo_Urls: "" }))}
                      className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
                      title="Clear photo"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Upload Action Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-emerald-600/20 cursor-pointer transition-all">
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingPhoto ? "Optimizing & Saving..." : "Upload New Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStudentPhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-400 font-medium">or paste URL:</span>
                </div>

                {/* Image Link Fallback Input */}
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={studentData.Student_Photo_Urls}
                  onChange={(e) =>
                    setStudentData({ ...studentData, Student_Photo_Urls: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Student Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentData.StudentName}
                    onChange={(e) =>
                      setStudentData({ ...studentData, StudentName: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium"
                    placeholder="Student Name"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Father's Name
                </label>
                <input
                  type="text"
                  value={studentData.FatherName}
                  onChange={(e) =>
                    setStudentData({ ...studentData, FatherName: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium"
                  placeholder="Father's Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  College / National Institute
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentData.CollegeName}
                    onChange={(e) =>
                      setStudentData({ ...studentData, CollegeName: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium"
                    placeholder="College Name"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Class / Academic Standard
                </label>
                <input
                  type="text"
                  value={studentData.Class}
                  onChange={(e) =>
                    setStudentData({ ...studentData, Class: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium"
                  placeholder="e.g. Degree 3rd Year"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  State
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentData.StnState}
                    onChange={(e) =>
                      setStudentData({ ...studentData, StnState: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium"
                    placeholder="State"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  District
                </label>
                <input
                  type="text"
                  value={studentData.StnDistrict}
                  onChange={(e) =>
                    setStudentData({ ...studentData, StnDistrict: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium"
                  placeholder="District"
                />
              </div>
            </div>
          </div>
        )}

        {/* WING ROLE FORM (WITH wing_logo SUPPORT) */}
        {role === "wing" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Wing Department & Logo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your Wing's leadership, description, and official wing logo.
              </p>
            </div>

            {/* WING LOGO SECTION (wing_logo column) */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-md ring-4 ring-blue-500/20 bg-white border border-slate-200 shrink-0 flex items-center justify-center p-2">
                <SafeImage
                  src={wingData.wing_logo}
                  alt={wingData.WingTitle || "Wing Logo"}
                  fallbackCategory="general"
                  fallbackText={wingData.WingTitle || "W"}
                  className="w-full h-full object-contain"
                />

                {uploadingWingLogo && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span className="text-[10px] font-bold">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 w-full min-w-0">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    Official Wing Logo
                  </label>
                  {wingData.wing_logo && (
                    <button
                      type="button"
                      onClick={() => setWingData(prev => ({ ...prev, wing_logo: "" }))}
                      className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clear logo"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer transition-all">
                    {uploadingWingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingWingLogo ? "Uploading..." : "Upload Wing Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWingLogoUpload}
                      disabled={uploadingWingLogo}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-400 font-medium">or paste link:</span>
                </div>

                <input
                  type="url"
                  placeholder="https://example.com/wing-logo.png"
                  value={wingData.wing_logo}
                  onChange={(e) =>
                    setWingData({ ...wingData, wing_logo: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Wing Title / Department Name
                </label>
                <input
                  type="text"
                  required
                  value={wingData.WingTitle}
                  onChange={(e) => setWingData({ ...wingData, WingTitle: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                  placeholder="Wing Title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Wing Manager
                </label>
                <input
                  type="text"
                  value={wingData.WingManager}
                  onChange={(e) => setWingData({ ...wingData, WingManager: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                  placeholder="Manager Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Wing Convener
                </label>
                <input
                  type="text"
                  value={wingData.WingConvener}
                  onChange={(e) => setWingData({ ...wingData, WingConvener: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                  placeholder="Convener Name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assistant / Coordinator
                </label>
                <input
                  type="text"
                  value={wingData.WingAssistant}
                  onChange={(e) => setWingData({ ...wingData, WingAssistant: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                  placeholder="Assistant Coordinator Name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Wing Objectives & Scope
                </label>
                <textarea
                  rows={3}
                  value={wingData.Description}
                  onChange={(e) => setWingData({ ...wingData, Description: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Describe your wing's responsibilities, event categories, and focus areas..."
                />
              </div>
            </div>
          </div>
        )}

        {/* TREASURER ROLE FORM */}
        {role === "treasurer" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Treasurer & Fiscal Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update account officer details and assigned expenditure oversight.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Treasurer Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={treasurerData.Treasurer_Name}
                  onChange={(e) =>
                    setTreasurerData({ ...treasurerData, Treasurer_Name: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition font-medium"
                  placeholder="Treasurer Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Accounting For / Portfolio
                </label>
                <input
                  type="text"
                  value={treasurerData.AccountingFor}
                  onChange={(e) =>
                    setTreasurerData({ ...treasurerData, AccountingFor: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition font-medium"
                  placeholder="e.g. Fest & Sports Accounts"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Officer Contact / Reference ID
                </label>
                <input
                  type="text"
                  value={treasurerData.Treasurer_UserId}
                  onChange={(e) =>
                    setTreasurerData({ ...treasurerData, Treasurer_UserId: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition font-medium"
                  placeholder="e.g. TR-2026-01"
                />
              </div>
            </div>
          </div>
        )}

        {/* OUTREACH ROLE FORM */}
        {role === "outreach" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Outreach Officer Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update representative credentials and community engagement scope.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Coordinator Name
                </label>
                <input
                  type="text"
                  required
                  value={outreachData.OfficerName}
                  onChange={(e) =>
                    setOutreachData({ ...outreachData, OfficerName: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition font-medium"
                  placeholder="Coordinator Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Phone / Contact
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={outreachData.ContactNumber}
                    onChange={(e) =>
                      setOutreachData({ ...outreachData, ContactNumber: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-purple-500 outline-none transition font-medium"
                    placeholder="+91 ..."
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Focus Domain & External Linkages
                </label>
                <input
                  type="text"
                  value={outreachData.Domain}
                  onChange={(e) =>
                    setOutreachData({ ...outreachData, Domain: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition font-medium"
                  placeholder="e.g. National Competitions, Seminars, Outreach"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Operational Scope / Bio
                </label>
                <textarea
                  rows={3}
                  value={outreachData.Notes}
                  onChange={(e) =>
                    setOutreachData({ ...outreachData, Notes: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl p-3.5 focus:ring-2 focus:ring-purple-500 outline-none transition"
                  placeholder="Summary of external colleges and institutions coordinated..."
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: INTEGRATED ACCOUNT SECURITY / PASSWORD UPDATE */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Security & Password Update
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Leave blank if you wish to keep your existing password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Current Active Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                readOnly
                disabled
                className="w-full bg-slate-100 border border-slate-300 text-slate-700 font-mono text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-inner cursor-not-allowed select-none opacity-80"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Set New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* SAVE CHANGES ACTION BAR (Non-sticky on mobile to prevent blocking fields) */}
        <div className="relative sm:sticky sm:bottom-4 z-20 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md mt-6">
          <div className="text-xs text-slate-600 flex items-center gap-2 text-center sm:text-left">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All profile edits are encrypted and securely verified against DHIU university protocols.
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
