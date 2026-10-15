import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveControllerProfile, type LoggedInControllerProfile } from "../../lib/controllerResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import EditProgrammeModal from "../../AdminPanel/AdminProgrammesList/EditProgrammeModal";
import ProgrammeResultModal from "../../components/ProgrammeResultModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { deleteProgrammeCascade } from "../../lib/cascadeDeleteService";
import type { Programme } from "../../AdminPanel/AdminProgrammesList/AdminProgrammesList";
import {
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Trophy,
  Users,
  Award,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

export default function ControllerDashboard() {
  const { actController } = useParams<{ actController: string }>();
  const meta = useProgrammeMeta();

  const [controller, setController] = useState<LoggedInControllerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "resulted">("all");

  // Modals
  const [editingProgram, setEditingProgram] = useState<Programme | null>(null);
  const [resultModalProgram, setResultModalProgram] = useState<Programme | null>(null);
  const [programToDelete, setProgramToDelete] = useState<Programme | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Resolve Controller Profile
  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const res = await resolveControllerProfile(actController);
        if (res) {
          setController(res);
        }
      } catch (err) {
        console.error("Error loading controller profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, [actController]);

  // 2. Fetch Programmes for this Category
  const fetchCategoryProgrammes = async () => {
    if (!controller?.category_uuid) return;
    setLoadingData(true);
    try {
      const { data, error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("*")
        .eq("Category", controller.category_uuid)
        .order("Date", { ascending: false });

      if (error) throw error;
      if (data) {
        setProgrammes(data as Programme[]);
      }
    } catch (err: any) {
      console.error("Error fetching category programmes:", err);
      showToast(err.message || "Failed to load category programmes", "error");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (controller?.category_uuid) {
      fetchCategoryProgrammes();
    }
  }, [controller?.category_uuid]);

  // Quick Action: Toggle Approval
  const handleToggleApprove = async (prog: Programme) => {
    const newStatus = !prog.IsApproved;
    try {
      const { error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ IsApproved: newStatus })
        .eq("Program_Code", prog.Program_Code);

      if (error) throw error;

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === prog.Program_Code ? { ...p, IsApproved: newStatus } : p))
      );
      showToast(`Programme "${prog.Program_Title}" marked as ${newStatus ? "Approved" : "Pending"}.`);
    } catch (err: any) {
      showToast("Approval update failed: " + err.message, "error");
    }
  };

  // Quick Action: Toggle Result Publication
  const handleTogglePublish = async (prog: Programme) => {
    const newStatus = !prog.IsResultPublished;
    try {
      const { error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .update({
          IsResultPublished: newStatus,
          IsResulted: newStatus ? true : prog.IsResulted,
        })
        .eq("Program_Code", prog.Program_Code);

      if (error) throw error;

      setProgrammes((prev) =>
        prev.map((p) =>
          p.Program_Code === prog.Program_Code
            ? { ...p, IsResultPublished: newStatus, IsResulted: newStatus ? true : p.IsResulted }
            : p
        )
      );
      showToast(`Result for "${prog.Program_Title}" ${newStatus ? "Published" : "Unpublished"}.`);
    } catch (err: any) {
      showToast("Publication update failed: " + err.message, "error");
    }
  };

  // Delete Programme
  const handleConfirmDelete = async () => {
    if (!programToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProgrammeCascade(programToDelete.Program_Code);
      setProgrammes((prev) => prev.filter((p) => p.Program_Code !== programToDelete.Program_Code));
      showToast(`Programme "${programToDelete.Program_Title}" deleted successfully.`);
      setProgramToDelete(null);
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Programmes
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.Program_Title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Program_Code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Venue?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        filterTab === "all" ||
        (filterTab === "pending" && !p.IsApproved) ||
        (filterTab === "approved" && p.IsApproved) ||
        (filterTab === "resulted" && p.IsResulted);

      return matchesSearch && matchesTab;
    });
  }, [programmes, searchQuery, filterTab]);

  // KPIs
  const totalPrograms = programmes.length;
  const approvedPrograms = programmes.filter((p) => p.IsApproved).length;
  const pendingPrograms = programmes.filter((p) => !p.IsApproved).length;
  const resultedPrograms = programmes.filter((p) => p.IsResulted).length;
  const publishedResults = programmes.filter((p) => p.IsResultPublished).length;
  const totalRegistrations = programmes.reduce((sum, p) => sum + (p.Total_Registration || 0), 0);

  const activeEmail = actController || controller?.controller_email || "";

  if (loadingProfile) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-bold text-slate-600">Loading Controller Profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white transition-all transform animate-bounce ${
            toastMsg.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toastMsg.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
              <Layers size={13} />
              <span>Assigned Jurisdiction: {controller?.category_title || "Academic Category"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              {controller?.controller_fullName || "Category Controller"} Portal
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              You have full administrative authority over the{" "}
              <strong className="text-white font-extrabold">{controller?.category_title}</strong> category.
              Create competitions, manage approvals, modify details, declare and publish official results.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={fetchCategoryProgrammes}
              disabled={loadingData}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
              <span>Sync Category</span>
            </button>
            <Link
              to={`/controller-panel/${activeEmail}/create-program`}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add {controller?.category_title || "Category"} Programme</span>
            </Link>
          </div>
        </div>

        {/* 6 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Total Events</span>
            <span className="text-2xl font-black text-white mt-1 block">{totalPrograms}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Approved</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{approvedPrograms}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Pending Approval</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingPrograms}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Resulted</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">{resultedPrograms}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-wider block">Published</span>
            <span className="text-2xl font-black text-yellow-300 mt-1 block">{publishedResults}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">Registrations</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">{totalRegistrations}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to={`/controller-panel/${activeEmail}/create-program`}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Plus size={20} />
            </span>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition">
              Create New Programme
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a competition automatically scoped to {controller?.category_title}.
            </p>
          </div>
        </Link>

        <Link
          to={`/controller-panel/${activeEmail}/create-result`}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition">
              <Award size={20} />
            </span>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition">
              Declare Results
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter 1st, 2nd, 3rd positions & grades for completed events.
            </p>
          </div>
        </Link>

        <Link
          to={`/controller-panel/${activeEmail}/programmes`}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-purple-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
              <Calendar size={20} />
            </span>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-purple-600 transition">
              All Category Programmes
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Full admin table with bulk publish, excel export & sheets.
            </p>
          </div>
        </Link>

        <Link
          to={`/controller-panel/${activeEmail}/registrations`}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Users size={20} />
            </span>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition">
              Candidate Registrations
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Review participants & print official A4 evaluation sheets.
            </p>
          </div>
        </Link>
      </div>

      {/* Category Programmes Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              <span>{controller?.category_title || "Category"} Events Directory</span>
              <span className="text-xs font-bold text-slate-500">({programmes.length} total)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, edit details, approve status, or enter results for programmes in your category.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "all" ? "bg-white text-indigo-700 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                All ({programmes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("pending")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "pending" ? "bg-white text-amber-700 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                Pending ({pendingPrograms})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("approved")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "approved" ? "bg-white text-emerald-700 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                Approved ({approvedPrograms})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("resulted")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "resulted" ? "bg-white text-purple-700 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                Resulted ({resultedPrograms})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search programmes..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* List / Table Body */}
        {loadingData ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-bold text-slate-500">Loading programmes...</span>
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="p-12 text-center">
            <Layers size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-black text-slate-700">No Programmes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {programmes.length === 0
                ? `No programmes have been scheduled under "${controller?.category_title}" yet.`
                : "No programmes matched the selected filters."}
            </p>
            <Link
              to={`/controller-panel/${activeEmail}/create-program`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create First Programme</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredProgrammes.map((prog) => {
              const isApproved = Boolean(prog.IsApproved);
              const isResulted = Boolean(prog.IsResulted);
              const isPublished = Boolean(prog.IsResultPublished);

              return (
                <div
                  key={prog.Program_Code}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {prog.Program_Code}
                      </span>
                      {prog.WingCode && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          Wing: {meta.wingMap[prog.WingCode] || prog.WingCode}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isApproved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isApproved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        <span>{isApproved ? "Approved" : "Pending Approval"}</span>
                      </span>

                      {isPublished ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Trophy size={10} />
                          <span>Result Published</span>
                        </span>
                      ) : isResulted ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Result Declared (Unpublished)
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-sm font-black text-slate-900 leading-snug truncate" title={prog.Program_Title || undefined}>
                      {prog.Program_Title}
                    </h4>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                      <span>Date: {prog.Date || "TBA"}</span>
                      <span>•</span>
                      <span>Venue: {meta.venueMap[prog.Venue || ""] || prog.Venue || "TBA"}</span>
                      <span>•</span>
                      <span className="font-bold text-slate-700">{prog.Total_Registration || 0} Registered</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                    {/* Declare / Edit Result Button */}
                    <Link
                      to={`/controller-panel/${activeEmail}/create-result?program=${prog.Program_Code}`}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1"
                      title="Declare or update competition results"
                    >
                      <Award size={13} />
                      <span>{isResulted ? "Edit Result" : "Declare Result"}</span>
                    </Link>

                    {/* Quick Toggle Result Publication if Resulted */}
                    {isResulted && (
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(prog)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                          isPublished
                            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                        title={isPublished ? "Unpublish Result" : "Publish Result to Public & Students"}
                      >
                        <Trophy size={13} />
                        <span>{isPublished ? "Unpublish" : "Publish"}</span>
                      </button>
                    )}

                    {/* View Result Modal if Published */}
                    {isPublished && (
                      <button
                        type="button"
                        onClick={() => setResultModalProgram(prog)}
                        className="px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Display official podium result"
                      >
                        <Trophy size={13} className="text-yellow-600" />
                        <span>Standings</span>
                      </button>
                    )}

                    {/* Quick Approve / Disapprove Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleApprove(prog)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isApproved
                          ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-2xs"
                      }`}
                      title={isApproved ? "Mark as Pending" : "Approve Programme"}
                    >
                      {isApproved ? "Revoke Approval" : "Approve"}
                    </button>

                    {/* Edit Details */}
                    <button
                      type="button"
                      onClick={() => setEditingProgram(prog)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
                      title="Edit Programme Details"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setProgramToDelete(prog)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="Delete Programme"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT PROGRAMME MODAL */}
      {editingProgram && (
        <EditProgrammeModal
          isOpen={Boolean(editingProgram)}
          program={editingProgram}
          wings={meta.wings}
          onClose={() => setEditingProgram(null)}
          onSuccess={() => {
            setEditingProgram(null);
            fetchCategoryProgrammes();
            showToast("Programme updated successfully!");
          }}
        />
      )}

      {/* PROGRAMME RESULT STANDINGS MODAL */}
      {resultModalProgram && (
        <ProgrammeResultModal
          isOpen={Boolean(resultModalProgram)}
          programCode={resultModalProgram.Program_Code}
          programTitle={resultModalProgram.Program_Title || undefined}
          onClose={() => setResultModalProgram(null)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {programToDelete && (
        <ConfirmDeleteModal
          isOpen={Boolean(programToDelete)}
          title={`Delete Programme: ${programToDelete.Program_Title}`}
          message={`Are you sure you want to delete programme "${programToDelete.Program_Title}" (${programToDelete.Program_Code}) from category "${controller?.category_title}"? This will delete registrations and related records.`}
          confirmText="Yes, Delete Programme"
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setProgramToDelete(null)}
        />
      )}
    </div>
  );
}
