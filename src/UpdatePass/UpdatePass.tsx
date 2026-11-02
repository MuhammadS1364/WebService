import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import dhiuLogo from "../ImgBox/Dhiu.jpg";
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Shield,
} from "lucide-react";

interface ControllerInfo {
  fullName: string;
  controllerId: string;
  categoryTitle?: string;
  categoryUuid?: string;
}

export default function UpdatePassword() {
  // Capture all possible route parameters across all panels
  const {
    actController,
    actWing,
    actTreasurer,
    actStn,
    actOutReach,
    actUser,
  } = useParams<{
    actController?: string;
    actWing?: string;
    actTreasurer?: string;
    actStn?: string;
    actOutReach?: string;
    actUser?: string;
  }>();

  // State management
  const [resolvedEmail, setResolvedEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [controllerInfo, setControllerInfo] = useState<ControllerInfo | null>(null);

  const [currentPassword, setCurrentPassword] = useState<string>("••••••••");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });

  // Determine active identifier from route params or fallback to localStorage
  const rawIdentifier =
    actController ||
    actWing ||
    actTreasurer ||
    actStn ||
    actOutReach ||
    actUser ||
    "";

  useEffect(() => {
    let isMounted = true;

    const resolveAndFetchUser = async () => {
      setLoading(true);
      setMessage({ type: "", text: "" });

      try {
        let identifierToUse = rawIdentifier ? decodeURIComponent(rawIdentifier).trim() : "";

        // Fallback: If no route param, check localStorage
        if (!identifierToUse) {
          try {
            const cachedUser = localStorage.getItem("user");
            if (cachedUser) {
              const parsed = JSON.parse(cachedUser);
              if (parsed?.UserEmail) {
                identifierToUse = parsed.UserEmail;
              }
            }
          } catch (e) {
            console.warn("Could not read user from localStorage:", e);
          }
        }

        if (!identifierToUse) {
          if (isMounted) {
            setResolvedEmail("");
            setMessage({ type: "error", text: "No active user account found in URL or session." });
            setLoading(false);
          }
          return;
        }

        let targetEmail = "";
        let foundRole = "";
        let ctrlData: ControllerInfo | null = null;
        let nameFound = "";

        // 1. If identifier is NOT an email (e.g. Controller ID like SPY-007, Student AddNo, WingCode)
        if (!identifierToUse.includes("@")) {
          // A. Check Category_Controller by controller_id or uuid
          const { data: catCtrl } = await SupaBaseFunction
            .from("Category_Controller")
            .select("controller_email, controller_fullName, controller_id, category_uuid")
            .or(`controller_id.ilike.${identifierToUse},controller_uuid.eq.${identifierToUse}`)
            .maybeSingle();

          if (catCtrl?.controller_email) {
            targetEmail = catCtrl.controller_email;
            nameFound = catCtrl.controller_fullName || "";
            ctrlData = {
              fullName: catCtrl.controller_fullName,
              controllerId: catCtrl.controller_id,
              categoryUuid: catCtrl.category_uuid,
            };
          }

          // B. Check StudentsBox by AddNo
          if (!targetEmail) {
            const { data: stn } = await SupaBaseFunction
              .from("StudentsBox")
              .select("StudentEmail, StnUserId, StudentName")
              .ilike("AddNo", identifierToUse)
              .maybeSingle();

            if (stn?.StudentEmail || stn?.StnUserId) {
              targetEmail = stn.StudentEmail || stn.StnUserId || "";
              nameFound = stn.StudentName || "";
            }
          }

          // C. Check Chs-WingS by WingCode
          if (!targetEmail) {
            const { data: wing } = await SupaBaseFunction
              .from("Chs-WingS")
              .select("WingEmail, WingUserId, WingTitle")
              .ilike("WingCode", identifierToUse)
              .maybeSingle();

            if (wing?.WingEmail || wing?.WingUserId) {
              targetEmail = wing.WingEmail || wing.WingUserId || "";
              nameFound = wing.WingTitle || "";
            }
          }

          // D. Check TreasurerVolt by Treasurer_id
          if (!targetEmail) {
            const { data: tsr } = await SupaBaseFunction
              .from("TreasurerVolt")
              .select("Treasurer_Email, Treasurer_UserId, Treasurer_Name")
              .ilike("Treasurer_id", identifierToUse)
              .maybeSingle();

            if (tsr?.Treasurer_Email || tsr?.Treasurer_UserId) {
              targetEmail = tsr.Treasurer_Email || tsr.Treasurer_UserId || "";
              nameFound = tsr.Treasurer_Name || "";
            }
          }
        }

        // If not resolved from non-email tables, assume identifier is the email itself
        if (!targetEmail) {
          targetEmail = identifierToUse;
        }

        // 2. Fetch User Record from UserTable
        const { data: initialUserRow, error: userError } = await SupaBaseFunction
          .from("UserTable")
          .select("UserEmail, UserPassword, UserRole, IsActive")
          .ilike("UserEmail", targetEmail)
          .maybeSingle();

        if (userError) throw userError;
        let userRow = initialUserRow;

        if (!userRow) {
          // If still not found, check if it's a category controller registered under controller_email
          const { data: fallbackCtrl } = await SupaBaseFunction
            .from("Category_Controller")
            .select("controller_email, controller_fullName, controller_id, category_uuid")
            .ilike("controller_email", targetEmail)
            .maybeSingle();

          if (fallbackCtrl?.controller_email) {
            targetEmail = fallbackCtrl.controller_email;
            nameFound = fallbackCtrl.controller_fullName || "";
            ctrlData = {
              fullName: fallbackCtrl.controller_fullName,
              controllerId: fallbackCtrl.controller_id,
              categoryUuid: fallbackCtrl.category_uuid,
            };

            // Re-query UserTable with exact email
            const { data: secondTry } = await SupaBaseFunction
              .from("UserTable")
              .select("UserEmail, UserPassword, UserRole, IsActive")
              .ilike("UserEmail", targetEmail)
              .maybeSingle();

            if (secondTry) {
              userRow = secondTry;
            }
          }
        }

        if (!userRow) {
          throw new Error(`User account "${targetEmail}" was not found in the authentication registry.`);
        }

        foundRole = userRow.UserRole || "Member";

        // 3. If role is CategoryController or was mapped from Category_Controller, load category title
        if (
          !ctrlData &&
          (foundRole.toLowerCase() === "categorycontroller" || foundRole.toLowerCase() === "controller" || actController)
        ) {
          const { data: cc } = await SupaBaseFunction
            .from("Category_Controller")
            .select("controller_fullName, controller_id, category_uuid")
            .or(`controller_email.ilike.${targetEmail},controller_user_id.ilike.${targetEmail}`)
            .maybeSingle();

          if (cc) {
            nameFound = cc.controller_fullName || nameFound;
            ctrlData = {
              fullName: cc.controller_fullName,
              controllerId: cc.controller_id,
              categoryUuid: cc.category_uuid,
            };
          }
        }

        // Resolve Category Title if Category UUID is present
        if (ctrlData?.categoryUuid) {
          const { data: catRow } = await SupaBaseFunction
            .from("Our_Categories")
            .select("category_title")
            .eq("category_id", ctrlData.categoryUuid)
            .maybeSingle();

          if (catRow?.category_title) {
            ctrlData.categoryTitle = catRow.category_title;
          }
        }

        if (isMounted) {
          setResolvedEmail(userRow.UserEmail);
          setUserRole(foundRole);
          setCurrentPassword(userRow.UserPassword || "");
          setDisplayName(nameFound);
          setControllerInfo(ctrlData);
        }
      } catch (err: any) {
        console.error("Failed to load user credentials:", err);
        if (isMounted) {
          setMessage({
            type: "error",
            text: err.message || "Failed to load account details. Please check your connection.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    resolveAndFetchUser();

    return () => {
      isMounted = false;
    };
  }, [rawIdentifier, actController]);

  // Handle Password Update Submission
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setMessage({ type: "error", text: "New password cannot be empty." });
      return;
    }

    if (trimmedNew.length < 3) {
      setMessage({ type: "error", text: "New password must be at least 3 characters long." });
      return;
    }

    if (confirmPassword && trimmedNew !== trimmedConfirm) {
      setMessage({ type: "error", text: "New password and confirmation password do not match." });
      return;
    }

    if (!resolvedEmail) {
      setMessage({ type: "error", text: "No verified email found for this account." });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Update UserTable password
      const { error: userError } = await SupaBaseFunction
        .from("UserTable")
        .update({ UserPassword: trimmedNew })
        .ilike("UserEmail", resolvedEmail);

      if (userError) throw userError;

      // 2. If this is a Category Controller, also keep Category_Controller.controller_id synchronized
      // (because Controller ID serves as their gateway password)
      const isCategoryController =
        userRole.toLowerCase() === "categorycontroller" ||
        userRole.toLowerCase() === "controller" ||
        Boolean(controllerInfo);

      if (isCategoryController) {
        const { error: ctrlError } = await SupaBaseFunction
          .from("Category_Controller")
          .update({ controller_id: trimmedNew.toUpperCase() })
          .or(`controller_email.ilike.${resolvedEmail},controller_user_id.ilike.${resolvedEmail}`);

        if (ctrlError) {
          console.warn("Notice: Could not sync controller_id column in Category_Controller:", ctrlError.message);
        } else if (controllerInfo) {
          setControllerInfo((prev) => (prev ? { ...prev, controllerId: trimmedNew.toUpperCase() } : prev));
        }
      }

      // 3. Update localStorage session cache so active session remains valid
      try {
        const cached = localStorage.getItem("user");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.UserEmail?.toLowerCase() === resolvedEmail.toLowerCase()) {
            parsed.UserPassword = trimmedNew;
            localStorage.setItem("user", JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.warn("Could not sync localStorage user:", e);
      }

      setCurrentPassword(trimmedNew);
      setNewPassword("");
      setConfirmPassword("");
      setMessage({
        type: "success",
        text: isCategoryController
          ? "Password updated! Your Category Controller login credentials have been synchronized successfully."
          : "Password updated successfully!",
      });
    } catch (err: any) {
      console.error("Update password error:", err);
      setMessage({
        type: "error",
        text: err.message || "Failed to update password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all">
        {/* Header Section */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-2 flex items-center justify-center shrink-0 shadow-inner">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-900/60 border border-indigo-700/50 px-2.5 py-0.5 rounded-full">
                  Account Security
                </span>
                {userRole && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full">
                    {userRole}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight truncate">
                {displayName ? `${displayName}` : "Credentials & Password"}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage your gateway access password and verified account details
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status Message Banner */}
          {message.text && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 border animate-in fade-in duration-200 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{message.text}</div>
            </div>
          )}

          {/* Current Account Information Card */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shield size={13} className="text-indigo-600" />
                Verified Account Details
              </span>
              {loading && <Loader2 size={13} className="animate-spin text-slate-400" />}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Account Email (Login Identifier)
              </label>
              <div className="flex items-center gap-2.5 text-slate-800 font-semibold bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm shadow-2xs">
                <Mail size={15} className="text-slate-400 shrink-0" />
                <span className="truncate">{resolvedEmail || (loading ? "Resolving account..." : "No email found")}</span>
              </div>
            </div>

            {/* Category Controller Specific Details */}
            {controllerInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {controllerInfo.categoryTitle && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Assigned Jurisdiction
                    </label>
                    <div className="flex items-center gap-2 text-indigo-700 font-bold bg-indigo-50/70 px-3 py-2 rounded-xl border border-indigo-100 text-xs">
                      <Layers size={13} className="shrink-0 text-indigo-600" />
                      <span className="truncate">{controllerInfo.categoryTitle}</span>
                    </div>
                  </div>
                )}
                {controllerInfo.controllerId && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Controller ID
                    </label>
                    <div className="flex items-center gap-2 text-slate-800 font-mono font-bold bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                      <KeyRound size={13} className="shrink-0 text-amber-500" />
                      <span className="truncate">{controllerInfo.controllerId}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Password Field with View Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Current Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-1"
                >
                  {showCurrentPassword ? (
                    <>
                      <EyeOff size={12} /> Hide
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> Show
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono shadow-2xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Lock size={15} className="text-slate-400 shrink-0" />
                  <span>
                    {showCurrentPassword
                      ? currentPassword || "Not Set"
                      : currentPassword
                      ? "•".repeat(Math.max(6, Math.min(12, currentPassword.length)))
                      : "••••••••"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Update Password Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="new-password" className="block text-xs font-bold text-slate-700">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-1"
                >
                  {showNewPassword ? (
                    <>
                      <EyeOff size={12} /> Hide
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> Show
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
              {controllerInfo && (
                <span className="text-[11px] text-indigo-600 mt-1 block">
                  Note: Updating your password will also update your Controller ID for seamless Member Gateway access.
                </span>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="confirm-password"
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password to confirm"
                  minLength={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Action Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || loading || !resolvedEmail}
                className="w-full py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Synchronizing Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}