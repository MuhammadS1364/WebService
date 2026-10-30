import React, { useState, useEffect, useMemo } from "react";
import { X, Lock, Mail, Shield, CheckCircle2, XCircle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import type { User } from "./AllUserList";
import { COMMON_ROLES } from "./userConstants";

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
  existingRoles: string[];
}

export default function EditUserModal({
  isOpen,
  user,
  onClose,
  onUserUpdated,
  existingRoles,
}: EditUserModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [customRole, setCustomRole] = useState("");
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Merge common and existing roles into a unique list
  const allAvailableRoles = useMemo(
    () => Array.from(new Set([...COMMON_ROLES, ...existingRoles])).filter(Boolean),
    [existingRoles]
  );

  useEffect(() => {
    if (user && isOpen) {
      setEmail(user.UserEmail || "");
      const userRole = user.UserRole || "student";
      if (allAvailableRoles.includes(userRole)) {
        setRole(userRole);
        setIsCustomRole(false);
        setCustomRole("");
      } else {
        setRole("custom");
        setIsCustomRole(true);
        setCustomRole(userRole);
      }
      setPassword(user.UserPassword || "");
      setIsActive(user.IsActive !== false);
      setIsAuthenticated(Boolean(user.IsAuthenticated));
      setErrorMsg("");
      setShowPassword(false);
    }
  }, [user, isOpen, allAvailableRoles]);

  if (!isOpen || !user) return null;

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let generated = "";
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg("User email is required.");
      return;
    }

    const effectiveRole = isCustomRole ? customRole.trim() : role;
    if (!effectiveRole) {
      setErrorMsg("User role is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. If email changed, check if new email is already in use
      if (trimmedEmail !== user.UserEmail.toLowerCase()) {
        const { data: existing, error: checkErr } = await SupaBaseFunction
          .from("UserTable")
          .select("UserEmail, UserId")
          .eq("UserEmail", trimmedEmail)
          .maybeSingle();

        if (checkErr) throw checkErr;
        if (existing && existing.UserId !== user.UserId) {
          throw new Error(`The email "${trimmedEmail}" is already registered to another user.`);
        }
      }

      // 2. Prepare payload
      const updatePayload: Record<string, any> = {
        UserEmail: trimmedEmail,
        UserRole: effectiveRole,
        IsActive: isActive,
        IsAuthenticated: isAuthenticated,
      };

      if (password.trim()) {
        updatePayload.UserPassword = password.trim();
      }

      // 3. Update in Supabase
      let updateQuery = SupaBaseFunction.from("UserTable").update(updatePayload);

      if (user.UserId !== undefined && user.UserId !== null && user.UserId !== "") {
        updateQuery = updateQuery.eq("UserId", user.UserId);
      } else {
        updateQuery = updateQuery.eq("UserEmail", user.UserEmail);
      }

      const { error: updateError } = await updateQuery;
      if (updateError) throw updateError;

      const updatedUserRecord: User = {
        ...user,
        UserEmail: trimmedEmail,
        UserRole: effectiveRole,
        UserPassword: password.trim() || user.UserPassword,
        IsActive: isActive,
        IsAuthenticated: isAuthenticated,
      };

      onUserUpdated(updatedUserRecord);
      onClose();
    } catch (err: any) {
      console.error("Error updating user:", err);
      setErrorMsg(err.message || "Failed to update user record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative my-8 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Edit User Details</h3>
              <p className="text-xs text-slate-300 font-mono">
                ID: {String(user.UserId)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <XCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-2xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100 transition"
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* User Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              User Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={isCustomRole ? "custom" : role}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setIsCustomRole(true);
                  } else {
                    setIsCustomRole(false);
                    setRole(e.target.value);
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100 transition cursor-pointer"
              >
                {allAvailableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="custom">✏️ Custom Role...</option>
              </select>

              {isCustomRole && (
                <input
                  type="text"
                  required
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Enter custom role..."
                  className="w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100 transition"
                />
              )}
            </div>
          </div>

          {/* Password Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                User Password / Credentials
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                title="Generate secure random password"
              >
                <KeyRound size={12} /> Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or update password..."
                className="w-full rounded-2xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100 transition font-mono"
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Leave unchanged or enter a new value to update user login password.
            </p>
          </div>

          {/* Status Switches (Active & Authenticated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Active Status (Vice-Versa Toggle) */}
            <div className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
              isActive ? "bg-emerald-50/70 border-emerald-200" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="pr-2">
                <span className="block text-xs font-bold text-slate-900">
                  {isActive ? "Account Active" : "Account Inactive"}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isActive ? "User can sign in" : "Sign in is blocked"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isActive ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Authenticated / Verified Status */}
            <div className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
              isAuthenticated ? "bg-blue-50/70 border-blue-200" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="pr-2">
                <span className="block text-xs font-bold text-slate-900">
                  {isAuthenticated ? "Verified Auth" : "Unverified"}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isAuthenticated ? "Session verified" : "Pending verification"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isAuthenticated}
                onClick={() => setIsAuthenticated(!isAuthenticated)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isAuthenticated ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAuthenticated ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
