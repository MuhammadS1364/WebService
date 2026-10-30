import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import EditUserModal from "./EditUserModal";
import CreateUserModal from "./CreateUserModal";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Edit2,
  Trash2,
  KeyRound,
  RefreshCw,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Check,
  ArrowUpDown,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";

export interface User {
  UserId: string | number;
  UserEmail: string;
  UserRole: string;
  UserPassword?: string;
  IsActive: boolean;
  IsAuthenticated: boolean;
  created_at?: string;
  [key: string]: any;
}

export default function AllUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [authFilter, setAuthFilter] = useState<"All" | "Verified" | "Unverified">("All");
  const [sortBy, setSortBy] = useState<"recent" | "email-asc" | "email-desc" | "role" | "status">("recent");

  // Selection state (storing user emails as unique keys)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Modals state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Copied email state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((prev) => (prev.text === text ? { type: "", text: "" } : prev));
    }, 4500);
  };

  // 1. Fetch Users from Supabase
  const fetchUsers = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const { data, error } = await SupaBaseFunction
        .from("UserTable")
        .select("*")
        .order("UserId", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setUsers((data as User[]) || []);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error fetching users:", msg);
      setFetchError("Failed to load registered users. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Extract unique roles for dropdown
  const uniqueRoles = useMemo(() => {
    const roles = users
      .map((u) => u.UserRole)
      .filter((role): role is string => Boolean(role));
    return Array.from(new Set(roles)).sort();
  }, [users]);

  // 3. Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const email = user.UserEmail?.toLowerCase() || "";
        const role = user.UserRole?.toLowerCase() || "";
        const id = user.UserId ? String(user.UserId).toLowerCase() : "";
        const query = searchQuery.toLowerCase().trim();

        const matchesSearch = !query || email.includes(query) || role.includes(query) || id.includes(query);

        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Active" && user.IsActive) ||
          (statusFilter === "Inactive" && !user.IsActive);

        const matchesRole = roleFilter === "All" || user.UserRole === roleFilter;

        const matchesAuth =
          authFilter === "All" ||
          (authFilter === "Verified" && user.IsAuthenticated) ||
          (authFilter === "Unverified" && !user.IsAuthenticated);

        return matchesSearch && matchesStatus && matchesRole && matchesAuth;
      })
      .sort((a, b) => {
        if (sortBy === "email-asc") return a.UserEmail.localeCompare(b.UserEmail);
        if (sortBy === "email-desc") return b.UserEmail.localeCompare(a.UserEmail);
        if (sortBy === "role") return (a.UserRole || "").localeCompare(b.UserRole || "");
        if (sortBy === "status") return Number(b.IsActive) - Number(a.IsActive);
        // Default: recent / by ID
        return String(b.UserId).localeCompare(String(a.UserId));
      });
  }, [users, searchQuery, statusFilter, roleFilter, authFilter, sortBy]);

  // 4. Multi-selection helpers
  const filteredEmails = useMemo(() => filteredUsers.map((u) => u.UserEmail), [filteredUsers]);

  const isAllSelected = useMemo(() => {
    if (filteredEmails.length === 0) return false;
    return filteredEmails.every((email) => selectedEmails.has(email));
  }, [filteredEmails, selectedEmails]);

  const isIndeterminate = useMemo(() => {
    const count = filteredEmails.filter((email) => selectedEmails.has(email)).length;
    return count > 0 && count < filteredEmails.length;
  }, [filteredEmails, selectedEmails]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all currently filtered
      setSelectedEmails((prev) => {
        const next = new Set(prev);
        filteredEmails.forEach((email) => next.delete(email));
        return next;
      });
    } else {
      // Select all currently filtered
      setSelectedEmails((prev) => {
        const next = new Set(prev);
        filteredEmails.forEach((email) => next.add(email));
        return next;
      });
    }
  };

  const handleToggleSelect = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedEmails(new Set());
  };

  // 5. Toggle Active Status for a single user (Vice-Versa)
  const handleToggleActive = async (targetUser: User) => {
    const newStatus = !targetUser.IsActive;

    // Optimistic update
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.UserEmail === targetUser.UserEmail ? { ...u, IsActive: newStatus } : u
      )
    );

    try {
      let query = SupaBaseFunction.from("UserTable").update({ IsActive: newStatus });
      if (targetUser.UserId !== undefined && targetUser.UserId !== null && targetUser.UserId !== "") {
        query = query.eq("UserId", targetUser.UserId);
      } else {
        query = query.eq("UserEmail", targetUser.UserEmail);
      }

      const { error } = await query;
      if (error) throw error;

      showNotification(
        "success",
        `User "${targetUser.UserEmail}" is now ${newStatus ? "Active" : "Deactivated"}.`
      );
    } catch (err: any) {
      console.error("Failed to update status:", err);
      // Revert
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.UserEmail === targetUser.UserEmail ? { ...u, IsActive: targetUser.IsActive } : u
        )
      );
      showNotification("error", "Failed to update user status. Please try again.");
    }
  };

  // 6. Delete a single user
  const confirmDeleteSingleUser = async () => {
    if (!deletingUser) return;
    setIsDeletingSingle(true);

    try {
      let query = SupaBaseFunction.from("UserTable").delete();
      if (deletingUser.UserId !== undefined && deletingUser.UserId !== null && deletingUser.UserId !== "") {
        query = query.eq("UserId", deletingUser.UserId);
      } else {
        query = query.eq("UserEmail", deletingUser.UserEmail);
      }

      const { error } = await query;
      if (error) throw error;

      // Remove from local state
      setUsers((prev) => prev.filter((u) => u.UserEmail !== deletingUser.UserEmail));
      setSelectedEmails((prev) => {
        const next = new Set(prev);
        next.delete(deletingUser.UserEmail);
        return next;
      });

      showNotification("success", `User "${deletingUser.UserEmail}" was permanently deleted.`);
      setDeletingUser(null);
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      showNotification("error", err.message || "Failed to delete user. Please try again.");
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // 7. Bulk Action: Set Active / Deactive for all selected users
  const handleBulkSetStatus = async (setActiveTo: boolean) => {
    const emailsToUpdate = Array.from(selectedEmails);
    if (emailsToUpdate.length === 0) return;

    setIsProcessingBulk(true);

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (selectedEmails.has(u.UserEmail) ? { ...u, IsActive: setActiveTo } : u))
    );

    try {
      const { error } = await SupaBaseFunction
        .from("UserTable")
        .update({ IsActive: setActiveTo })
        .in("UserEmail", emailsToUpdate);

      if (error) throw error;

      showNotification(
        "success",
        `Successfully ${setActiveTo ? "activated" : "deactivated"} ${emailsToUpdate.length} user(s).`
      );
    } catch (err: any) {
      console.error("Bulk status update failed:", err);
      showNotification("error", "Failed to update selected users. Re-fetching data...");
      fetchUsers();
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // 8. Bulk Action: Delete all selected users
  const handleConfirmBulkDelete = async () => {
    const emailsToDelete = Array.from(selectedEmails);
    if (emailsToDelete.length === 0) return;

    setIsProcessingBulk(true);

    try {
      const { error } = await SupaBaseFunction
        .from("UserTable")
        .delete()
        .in("UserEmail", emailsToDelete);

      if (error) throw error;

      // Remove from state
      setUsers((prev) => prev.filter((u) => !selectedEmails.has(u.UserEmail)));
      setSelectedEmails(new Set());
      setIsBulkDeleteModalOpen(false);

      showNotification("success", `Permanently deleted ${emailsToDelete.length} selected user(s).`);
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      showNotification("error", err.message || "Failed to delete selected users.");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // User update from modal
  const handleUserUpdated = (updated: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.UserId === updated.UserId || u.UserEmail === updated.UserEmail ? updated : u))
    );
    showNotification("success", `Updated details for "${updated.UserEmail}".`);
  };

  // User created from modal
  const handleUserCreated = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    showNotification("success", `User "${newUser.UserEmail}" registered successfully.`);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.IsActive).length;
    const inactive = total - active;
    const verified = users.filter((u) => u.IsAuthenticated).length;
    return { total, active, inactive, verified };
  }, [users]);

  // Role Badge Color Utility
  const getRoleBadgeStyle = (roleName: string) => {
    const r = (roleName || "").toLowerCase();
    if (r.includes("admin")) return "bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/10";
    if (r.includes("controller")) return "bg-amber-50 text-amber-800 border-amber-200 ring-amber-600/10";
    if (r.includes("wing")) return "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/10";
    if (r.includes("student")) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10";
    if (r.includes("treasurer")) return "bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/10";
    if (r.includes("judge")) return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10";
    return "bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/10";
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 font-sans text-slate-800 space-y-6">
      {/* --- TOP NOTIFICATION BANNER --- */}
      {notification.text && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <XCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification({ type: "", text: "" })}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- HEADER BANNER --- */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Access Control & Authentication
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Registered Users
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Manage system authentication accounts, roles, login credentials, and user active/inactive permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh user records from database"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-indigo-600" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition cursor-pointer active:scale-95"
            title="Register a new user credential"
          >
            <Plus size={16} />
            <span>Register New User</span>
          </button>
        </div>
      </div>

      {/* --- STATS KPI CARDS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <span className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <Users size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.total}</div>
          <p className="text-[11px] text-slate-400 mt-1">Platform registered credentials</p>
        </div>

        {/* Active Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Active</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{metrics.active}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.total > 0 ? `${Math.round((metrics.active / metrics.total) * 100)}% active accounts` : "0% active"}
          </p>
        </div>

        {/* Inactive Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Inactive</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <UserX size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{metrics.inactive}</div>
          <p className="text-[11px] text-slate-400 mt-1">Sign-in restricted / blocked</p>
        </div>

        {/* Verified Auth */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Verified Auth</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Shield size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{metrics.verified}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active session authenticated</p>
        </div>
      </div>

      {/* --- SEARCH & FILTERS BAR --- */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by email, role, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters Group */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 py-2 px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="All">All Roles ({uniqueRoles.length})</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 py-2 px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>

            {/* Auth Filter */}
            <select
              value={authFilter}
              onChange={(e) => setAuthFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 py-2 px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="All">All Auth</option>
              <option value="Verified">Verified Auth</option>
              <option value="Unverified">Unverified</option>
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
              <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="recent">Recent / ID</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
                <option value="role">Role</option>
                <option value="status">Status (Active first)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || statusFilter !== "All" || roleFilter !== "All" || authFilter !== "All" || sortBy !== "recent") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setRoleFilter("All");
                  setAuthFilter("All");
                  setSortBy("recent");
                }}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- MULTIPLE SELECTION BULK ACTIONS TOOLBAR --- */}
      {selectedEmails.size > 0 && (
        <div className="sticky top-4 z-20 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-150">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <CheckSquare size={18} />
            </span>
            <div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>{selectedEmails.size} user{selectedEmails.size > 1 ? "s" : ""} selected</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (of {filteredUsers.length} shown)
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Choose a bulk action to apply across all selected accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Bulk Activate Button */}
            <button
              type="button"
              onClick={() => handleBulkSetStatus(true)}
              disabled={isProcessingBulk}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Activate all selected users (Vice-Versa)"
            >
              <UserCheck size={14} />
              <span>Activate</span>
            </button>

            {/* Bulk Deactivate Button */}
            <button
              type="button"
              onClick={() => handleBulkSetStatus(false)}
              disabled={isProcessingBulk}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Deactivate all selected users (Vice-Versa)"
            >
              <UserX size={14} />
              <span>Deactivate</span>
            </button>

            {/* Bulk Delete Button */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              disabled={isProcessingBulk}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Permanently delete all selected users"
            >
              <Trash2 size={14} />
              <span>Delete Selected</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={isProcessingBulk}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN USERS CONTENT --- */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 text-slate-400 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="animate-spin w-10 h-10 text-indigo-600 mb-3" />
          <p className="font-bold text-slate-700 text-sm">Loading Registered Users...</p>
        </div>
      ) : fetchError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-base">Error Loading Users</h3>
          <p className="text-xs text-rose-600 max-w-md mx-auto">{fetchError}</p>
          <button
            type="button"
            onClick={fetchUsers}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Users Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No registered users match your search or filter settings.
          </p>
          {(searchQuery || statusFilter !== "All" || roleFilter !== "All" || authFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setRoleFilter("All");
                setAuthFilter("All");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* --- DESKTOP TABLE VIEW --- */}
          <div className="hidden md:block overflow-x-auto rounded-3xl shadow-xs border border-slate-200/90 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="py-4 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-500 hover:text-indigo-600 transition cursor-pointer inline-flex items-center justify-center"
                      title={isAllSelected ? "Deselect all" : "Select all visible"}
                    >
                      {isAllSelected ? (
                        <CheckSquare size={17} className="text-indigo-600" />
                      ) : isIndeterminate ? (
                        <MinusSquare size={17} className="text-indigo-600" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-4 min-w-[120px]">User ID</th>
                  <th className="py-4 px-4 min-w-[240px]">User Email & Credentials</th>
                  <th className="py-4 px-4 min-w-[140px]">Assigned Role</th>
                  <th className="py-4 px-4 min-w-[120px]">Auth Status</th>
                  <th className="py-4 px-4 min-w-[140px] text-center">Active (Vice-Versa)</th>
                  <th className="py-4 px-4 min-w-[120px] text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((user) => {
                  const isSelected = selectedEmails.has(user.UserEmail);

                  return (
                    <tr
                      key={String(user.UserId || user.UserEmail)}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(user.UserEmail)}
                          className="text-slate-400 hover:text-indigo-600 transition cursor-pointer inline-flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare size={17} className="text-indigo-600" />
                          ) : (
                            <Square size={17} />
                          )}
                        </button>
                      </td>

                      {/* User ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-slate-500 text-[11px] font-bold truncate max-w-[130px] block"
                            title={String(user.UserId)}
                          >
                            {user.UserId || "—"}
                          </span>
                          {user.UserId && (
                            <button
                              type="button"
                              onClick={() => handleCopy(String(user.UserId), `id-${user.UserId}`)}
                              className="text-slate-300 hover:text-slate-600 transition cursor-pointer"
                              title="Copy User ID"
                            >
                              {copiedKey === `id-${user.UserId}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* User Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[280px]"
                              title={user.UserEmail}
                            >
                              {user.UserEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(user.UserEmail, `em-${user.UserEmail}`)}
                              className="text-slate-300 hover:text-slate-600 transition cursor-pointer"
                              title="Copy Email"
                            >
                              {copiedKey === `em-${user.UserEmail}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          {user.UserPassword && (
                            <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <KeyRound size={10} className="text-slate-400" />
                              <span className="truncate max-w-[200px]">Password configured</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ring-1 ring-inset ${getRoleBadgeStyle(
                            user.UserRole
                          )}`}
                        >
                          <Shield size={11} className="shrink-0" />
                          <span>{user.UserRole || "GeneralUser"}</span>
                        </span>
                      </td>

                      {/* Auth Status */}
                      <td className="py-3.5 px-4">
                        {user.IsAuthenticated ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Active Status (Vice-Versa Toggle Switch) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={user.IsActive}
                            onClick={() => handleToggleActive(user)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              user.IsActive ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                            title={`Click to ${user.IsActive ? "Deactivate" : "Activate"} this account`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                user.IsActive ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[11px] font-bold w-14 text-left ${
                              user.IsActive ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {user.IsActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                            title="Edit User Details (Role, Password, Active, Auth)"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* --- MOBILE CARDS VIEW --- */}
          <div className="flex flex-col gap-3.5 md:hidden">
            {filteredUsers.map((user) => {
              const isSelected = selectedEmails.has(user.UserEmail);

              return (
                <div
                  key={String(user.UserId || user.UserEmail)}
                  className={`rounded-2xl border p-4 shadow-2xs transition bg-white flex flex-col gap-3 ${
                    isSelected ? "border-indigo-300 bg-indigo-50/20" : "border-slate-200/90"
                  }`}
                >
                  {/* Card Header with Checkbox and Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(user.UserEmail)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-indigo-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 break-all">
                          {user.UserEmail}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                          ID: {user.UserId || "—"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${getRoleBadgeStyle(
                        user.UserRole
                      )}`}
                    >
                      <Shield size={10} />
                      {user.UserRole || "GeneralUser"}
                    </span>
                  </div>

                  {/* Card Footer with Active Toggle & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    {/* Active Toggle (Vice-Versa) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={user.IsActive}
                        onClick={() => handleToggleActive(user)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          user.IsActive ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            user.IsActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-xs font-bold ${
                          user.IsActive ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {user.IsActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUser(user)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* --- MODAL 1: EDIT USER MODAL --- */}
      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={handleUserUpdated}
        existingRoles={uniqueRoles}
      />

      {/* --- MODAL 2: REGISTER / CREATE NEW USER MODAL --- */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
        existingRoles={uniqueRoles}
      />

      {/* --- MODAL 3: SINGLE USER DELETE CONFIRMATION --- */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Delete User Account
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this user account? The user will no longer be able to log in or access their dashboard.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5 space-y-1 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">Email: </span>
                <span className="font-bold text-slate-900">{deletingUser.UserEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Role: </span>
                <span className="font-bold text-slate-900">{deletingUser.UserRole}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">User ID: </span>
                <span className="font-mono text-slate-700">{String(deletingUser.UserId)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingleUser}
                disabled={isDeletingSingle}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-200 transition cursor-pointer flex items-center gap-2"
              >
                {isDeletingSingle ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: BULK DELETE CONFIRMATION --- */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Delete {selectedEmails.size} Selected Users?
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Permanent deletion of multiple user accounts.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              You are about to permanently delete <strong className="text-slate-900 font-bold">{selectedEmails.size}</strong> user account(s) from the system. This cannot be undone.
            </p>

            <div className="max-h-36 overflow-y-auto p-3 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5 space-y-1">
              {Array.from(selectedEmails).map((em) => (
                <div key={em} className="text-xs font-mono text-slate-700 truncate">
                  • {em}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isProcessingBulk}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isProcessingBulk}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-200 transition cursor-pointer flex items-center gap-2"
              >
                {isProcessingBulk ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting {selectedEmails.size} Users...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete {selectedEmails.size} Users</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}