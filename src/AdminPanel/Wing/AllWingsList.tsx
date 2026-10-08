import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams, Link, useLocation } from "react-router-dom";
import SafeImage from "../../lib/SafeImage";
import EditWingModal from "./EditWingModal";
import { exportToExcel } from "../../lib/excelService";
import {
  Edit2,
  Trash2,
  CheckCircle2,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Building2,
  Trophy,
  Plus,
  Download,
  Users,
  Search,
  ArrowUpDown,
  Filter,
  Sparkles,
} from "lucide-react";

interface WingData {
  WingTitle: string | null;
  WingCode: string;
  WingEmail?: string | null;
  WingManager?: string | null;
  WingConvener?: string | null;
  WingAssistant?: string | null;
  Total_Registrations?: number | null;
  Total_Resulted?: number | null;
  Total_Points?: number | null;
  Bonus_Points?: number | null;
  Description?: string | null;
  IsActive: boolean;
  wing_logo?: string | null;
}

export default function AllWingsList() {
  const { actUser } = useParams<{ actUser: string }>();
  const location = useLocation();
  const decodedEmail = actUser ? decodeURIComponent(actUser) : null;

  // Detect public view strictly: either on /public-panel or when not in an authenticated admin/wing route
  const isPublicView = useMemo(() => {
    if (location.pathname.includes("/public-panel")) return true;
    if (location.pathname.startsWith("/our-wing-list")) return true;
    if (!actUser) return true;
    return !location.pathname.startsWith("/admin-panel") && !location.pathname.startsWith("/wing-panel");
  }, [location.pathname, actUser]);

  // Determine current logged in user & role
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdmin = useMemo(() => {
    // In public unauthenticated view, NO administrative actions are permitted
    if (isPublicView) return false;
    return Boolean(currentUser && currentUser.UserRole === "Admin" && actUser);
  }, [currentUser, isPublicView, actUser]);

  const canEditWing = (wing: WingData) => {
    // In public unauthenticated view, visitors cannot edit or delete any wing
    if (isPublicView) return false;
    if (isAdmin) return true;
    if (currentUser && currentUser.UserRole === "Wing") {
      const email = (currentUser.UserEmail || "").toLowerCase().trim();
      const wingEmail = (wing.WingEmail || "").toLowerCase().trim();
      const userCode = (currentUser.WingCode || "").toLowerCase().trim();
      const wingCode = (wing.WingCode || "").toLowerCase().trim();
      return Boolean((email && wingEmail && email === wingEmail) || (userCode && wingCode && userCode === wingCode));
    }
    return false;
  };

  const [wings, setWings] = useState<WingData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"points" | "registrations" | "resulted" | "title" | "code">("points");

  // Modal & Toast States
  const [selectedWingForEdit, setSelectedWingForEdit] = useState<WingData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Credentials & Copy States
  const [wingPasswords, setWingPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (code: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const fetchWings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await SupaBaseFunction
        .from("Chs-WingS")
        .select("*")
        .order("WingTitle", { ascending: true });

      if (fetchError) throw fetchError;

      try {
        const { data: userAccounts } = await SupaBaseFunction
          .from("UserTable")
          .select("UserEmail, UserPassword")
          .eq("UserRole", "Wing");

        if (userAccounts) {
          const passMap: Record<string, string> = {};
          userAccounts.forEach((u: any) => {
            if (u.UserEmail) {
              passMap[u.UserEmail.toLowerCase().trim()] = u.UserPassword;
            }
          });
          setWingPasswords(passMap);
        }
      } catch (authErr) {
        console.warn("Could not query UserTable credentials:", authErr);
      }

      setWings(data || []);
    } catch (err: any) {
      console.error("Critical Fetch Exception Encountered:", err);
      setError(err.message || "Failed to load wings records securely from data-store layer.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWings();
  }, []);

  const handleEditWing = (wing: WingData) => {
    setSelectedWingForEdit(wing);
    setIsEditModalOpen(true);
  };

  const handleWingEditSuccess = () => {
    setActionFeedback({ message: "Wing details updated successfully!", type: "success" });
    fetchWings();
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleDeleteWing = async (wing: WingData) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${wing.WingTitle || wing.WingCode}"? This will remove the wing department record.`
    );
    if (!confirmed) return;

    try {
      const { error: delError } = await SupaBaseFunction
        .from("Chs-WingS")
        .delete()
        .eq("WingCode", wing.WingCode);

      if (delError) throw delError;

      setWings((prev) => prev.filter((w) => w.WingCode !== wing.WingCode));
      setActionFeedback({ message: `Wing "${wing.WingTitle || wing.WingCode}" deleted successfully.`, type: "success" });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      console.error("Failed to delete wing:", err);
      setActionFeedback({ message: `Error deleting wing: ${err.message}`, type: "error" });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Toggle active status
  const handleToggleActive = async (wing: WingData) => {
    const newStatus = !wing.IsActive;
    try {
      const { error: updateError } = await SupaBaseFunction
        .from("Chs-WingS")
        .update({ IsActive: newStatus })
        .eq("WingCode", wing.WingCode);

      if (updateError) throw updateError;

      setWings((prev) =>
        prev.map((w) => (w.WingCode === wing.WingCode ? { ...w, IsActive: newStatus } : w))
      );
      setActionFeedback({
        message: `Wing ${wing.WingTitle || wing.WingCode} marked as ${newStatus ? "Active" : "Inactive"}.`,
        type: "success",
      });
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (err: any) {
      setActionFeedback({ message: `Failed to update status: ${err.message}`, type: "error" });
    }
  };

  // KPI calculations
  const totalWings = wings.length;
  const activeWings = wings.filter((w) => w.IsActive).length;
  const totalPointsAll = wings.reduce((sum, w) => sum + (w.Total_Points || 0) + (w.Bonus_Points || 0), 0);
  const totalRegsAll = wings.reduce((sum, w) => sum + (w.Total_Registrations || 0), 0);
  const totalResultedAll = wings.reduce((sum, w) => sum + (w.Total_Resulted || 0), 0);

  // Filter and sort wings
  const filteredAndSortedWings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let result = wings.filter((w) => {
      const title = (w.WingTitle || "").toLowerCase();
      const code = (w.WingCode || "").toLowerCase();
      const manager = (w.WingManager || "").toLowerCase();

      const matchesSearch = !query || title.includes(query) || code.includes(query) || manager.includes(query);
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && w.IsActive) ||
        (statusFilter === "Inactive" && !w.IsActive);

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      const totalA = (a.Total_Points || 0) + (a.Bonus_Points || 0);
      const totalB = (b.Total_Points || 0) + (b.Bonus_Points || 0);

      if (sortBy === "points") return totalB - totalA;
      if (sortBy === "registrations") return (b.Total_Registrations || 0) - (a.Total_Registrations || 0);
      if (sortBy === "resulted") return (b.Total_Resulted || 0) - (a.Total_Resulted || 0);
      if (sortBy === "title") return (a.WingTitle || "").localeCompare(b.WingTitle || "");
      if (sortBy === "code") return a.WingCode.localeCompare(b.WingCode);
      return 0;
    });

    return result;
  }, [wings, searchQuery, statusFilter, sortBy]);

  // Handle Export
  const handleExport = () => {
    const exportRows = filteredAndSortedWings.map((w, idx) => ({
      Rank: idx + 1,
      "Wing Title": w.WingTitle || "Untitled",
      "Wing Code": w.WingCode,
      "Total Points": w.Total_Points || 0,
      "Bonus Points": w.Bonus_Points || 0,
      "Grand Total Points": (w.Total_Points || 0) + (w.Bonus_Points || 0),
      Registrations: w.Total_Registrations || 0,
      Resulted: w.Total_Resulted || 0,
      Manager: w.WingManager || "Unassigned",
      Convener: w.WingConvener || "Unassigned",
      Assistant: w.WingAssistant || "Unassigned",
      Email: w.WingEmail || "N/A",
      Status: w.IsActive ? "Active" : "Inactive",
    }));

    exportToExcel(exportRows, `Wings_Directory_${new Date().toISOString().split("T")[0]}.xlsx`, "Wings");
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8 bg-slate-50/50 min-h-screen font-sans space-y-6">
      {/* --- HEADER BANNER --- */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <Building2 size={12} className="text-amber-600" />
              Wings Directory & Standings
            </span>
            <span className="text-xs text-slate-400 font-medium">Administrative Department Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Wing Departments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 max-w-2xl">
            Monitor organizational performance, competition points leaderboard, credential logins, and department leadership.
          </p>
        </div>

        {/* Header Action Buttons (Admin Only) */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
            >
              <Download size={14} />
              <span>Export Excel ({filteredAndSortedWings.length})</span>
            </button>

            <Link
              to={actUser ? `/admin-panel/${actUser}/create-wing` : "#"}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-indigo-200 transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Create New Wing</span>
            </Link>
          </div>
        )}
      </div>

      {/* --- KPI SUMMARY METRICS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
            Total Wings
          </span>
          <p className="text-xl sm:text-3xl font-black text-slate-900 mt-1">{totalWings}</p>
          <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
            {activeWings} Active Departments
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Trophy size={13} className="text-amber-500" />
            Total Points
          </span>
          <p className="text-xl sm:text-3xl font-black text-amber-600 mt-1">{totalPointsAll}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">Across All Competitions</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
            Total Registrations
          </span>
          <p className="text-xl sm:text-3xl font-black text-indigo-600 mt-1">{totalRegsAll}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">Candidate Entries</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
            Total Resulted
          </span>
          <p className="text-xl sm:text-3xl font-black text-emerald-600 mt-1">{totalResultedAll}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">Published Results</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-50 to-amber-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-xs">
          <span className="text-[10px] sm:text-xs text-indigo-700 font-bold uppercase tracking-wider block flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            Top Leader
          </span>
          {wings.length > 0 ? (
            (() => {
              const topWing = [...wings].sort(
                (a, b) => (b.Total_Points || 0) + (b.Bonus_Points || 0) - ((a.Total_Points || 0) + (a.Bonus_Points || 0))
              )[0];
              const topPts = (topWing?.Total_Points || 0) + (topWing?.Bonus_Points || 0);
              return (
                <div className="mt-1">
                  <p className="text-sm sm:text-base font-black text-slate-900 truncate" title={topWing?.WingTitle || ""}>
                    {topWing?.WingTitle || topWing?.WingCode}
                  </p>
                  <span className="text-xs font-bold text-amber-700">{topPts} Total PTS</span>
                </div>
              );
            })()
          ) : (
            <p className="text-xs text-slate-500 mt-1">No data</p>
          )}
        </div>
      </div>

      {/* --- CONTROLS / FILTER BAR --- */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, code, or manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            disabled={isLoading || error !== null}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer py-1.5"
              disabled={isLoading || error !== null}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer py-1.5"
            >
              <option value="points">Sort: Total Points (High-Low)</option>
              <option value="registrations">Sort: Registrations</option>
              <option value="resulted">Sort: Resulted</option>
              <option value="title">Sort: Title (A-Z)</option>
              <option value="code">Sort: Wing Code</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- ACTION FEEDBACK BANNER --- */}
      {actionFeedback && (
        <div
          className={`rounded-2xl border p-4 text-xs sm:text-sm font-semibold flex items-center gap-3 transition-all ${
            actionFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* --- ERROR ALERT --- */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-center gap-3">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* --- LOADING VIEW --- */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-slate-700 animate-pulse">Syncing Wings Directory...</p>
        </div>
      ) : (
        /* --- WINGS GRID --- */
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAndSortedWings.map((wing: WingData, index: number) => {
            const grandPoints = (wing.Total_Points || 0) + (wing.Bonus_Points || 0);

            return (
              <div
                key={wing.WingCode}
                className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-indigo-200"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-2xl border border-slate-200 bg-slate-50 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                      {wing.wing_logo ? (
                        <SafeImage
                          src={wing.wing_logo}
                          alt={wing.WingTitle ?? "Wing Logo"}
                          fallbackCategory="wing"
                          fallbackText={wing.WingTitle || "W"}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="font-black text-sm text-indigo-700">
                          {(wing.WingTitle || "W")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {wing.WingCode}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                          Rank #{index + 1}
                        </span>
                      </div>
                      <h3
                        className="text-base font-bold text-slate-900 mt-1 line-clamp-1"
                        title={wing.WingTitle ?? ""}
                      >
                        {wing.WingTitle ?? "Untitled Wing"}
                      </h3>
                    </div>
                  </div>

                  {/* Actions Menu - Only for Admin or Active Wing User */}
                  {(isAdmin || canEditWing(wing)) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditWing(wing)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                        title="Edit Wing"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWing(wing)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete Wing"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* POINTS HIGHLIGHT BANNER */}
                <div className="mt-3.5 bg-gradient-to-r from-amber-50/80 via-amber-100/40 to-indigo-50/60 border border-amber-200/70 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Trophy size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                        Total Points
                      </span>
                      <p className="text-lg font-black text-slate-900 leading-none mt-0.5">
                        {grandPoints} <span className="text-xs font-semibold text-amber-700">PTS</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-bold text-slate-600">
                    <div>Standard: <span className="text-slate-900">{wing.Total_Points || 0}</span></div>
                    <div>Bonus: <span className="text-emerald-700">+{wing.Bonus_Points || 0}</span></div>
                  </div>
                </div>

                {/* CREDENTIALS SECTION (Admin Only) */}
                {isAdmin && decodedEmail && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-indigo-700 font-extrabold">
                        <KeyRound size={12} /> Login Credentials
                      </span>
                      <span className="text-[10px] text-slate-400">Admin Sync</span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] text-slate-800 truncate" title={wing.WingEmail || ""}>
                          {wing.WingEmail || <span className="text-slate-400 italic">No email</span>}
                        </span>
                      </div>
                      {wing.WingEmail && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(wing.WingEmail || "", `email-${wing.WingCode}`)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          {copiedKey === `email-${wing.WingCode}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>

                    {/* Password */}
                    {(() => {
                      const pass = (wing.WingEmail && wingPasswords[wing.WingEmail.toLowerCase().trim()]) || wing.WingCode;
                      const isVis = !!visiblePasswords[wing.WingCode];

                      return (
                        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Lock size={12} className="text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px] font-bold text-indigo-700 truncate">
                              {isVis ? pass : "••••••••"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(wing.WingCode)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={isVis ? "Hide" : "Show"}
                            >
                              {isVis ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(pass, `pass-${wing.WingCode}`)}
                              className="p-1 text-slate-400 hover:text-indigo-700 cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedKey === `pass-${wing.WingCode}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* LEADERSHIP HIERARCHY */}
                <div className="mt-3.5 space-y-1.5 flex-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">Manager:</span>
                    <span className="text-slate-800 truncate">{wing.WingManager ?? "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">Convener:</span>
                    <span className="text-slate-800 truncate">{wing.WingConvener ?? "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">Assistant:</span>
                    <span className="text-slate-800 truncate">{wing.WingAssistant ?? "Unassigned"}</span>
                  </div>
                </div>

                {/* METRICS & STATUS FOOTER */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      👥 {wing.Total_Registrations ?? 0} Reg
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      ✅ {wing.Total_Resulted ?? 0} Res
                    </span>
                  </div>

                  {/* Active Status: Toggle Switch for Admin, Read-Only Badge for Public */}
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(wing)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition cursor-pointer border ${
                        wing.IsActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}
                      title="Click to toggle status"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${wing.IsActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {wing.IsActive ? "Active" : "Inactive"}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        wing.IsActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${wing.IsActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {wing.IsActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAndSortedWings.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
              <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-900">No wings found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search or status filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Wing Modal */}
      <EditWingModal
        wing={selectedWingForEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWingForEdit(null);
        }}
        onSuccess={handleWingEditSuccess}
      />
    </div>
  );
}
