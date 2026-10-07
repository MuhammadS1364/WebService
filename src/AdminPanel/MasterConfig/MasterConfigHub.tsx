import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import type {
  OurClassesRecord,
  OurBatchesRecord,
  OurCategoryRecord,
  OurVenuesRecord,
  PointsTemplateRecord,
} from "../../lib/types";
import {
  GraduationCap,
  Layers,
  MapPin,
  Trophy,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

export type MasterTab = "classes" | "batches" | "categories" | "venues" | "templates";

export default function MasterConfigHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as MasterTab) || "classes";
  const [activeTab, setActiveTab] = useState<MasterTab>(initialTab);

  const meta = useProgrammeMeta();

  // Sync state with URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab") as MasterTab;
    if (tabParam && ["classes", "batches", "categories", "venues", "templates"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: MasterTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
              <Sparkles size={13} />
              Academic Master Setup
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              System Master Configurations
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Define and manage core campus entities: Academic Classes, Batches (Collaborators), Programme Categories, Campus
              Venues, and Points Templates with foreign key relations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => meta.refetch()}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold border border-white/15 backdrop-blur-sm transition cursor-pointer"
          >
            <RefreshCw size={14} className={meta.loading ? "animate-spin" : ""} />
            Sync Database
          </button>
        </div>

        {/* 5 Tabs Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 border-t border-white/10 mt-6 scrollbar-none">
          <button
            type="button"
            onClick={() => handleTabChange("classes")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "classes"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <GraduationCap size={16} />
            Our Classes ({meta.classes.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("batches")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "batches"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users size={16} />
            Our Batches ({meta.batches.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("categories")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "categories"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Layers size={16} />
            Our Categories ({meta.categories.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("venues")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "venues"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <MapPin size={16} />
            Our Venues ({meta.venues.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("templates")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "templates"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Trophy size={16} />
            Points Templates ({meta.pointsTemplates.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "classes" && (
        <ClassesManager
          batches={meta.batches}
          batchMap={meta.batchMap}
          onDataChanged={meta.refetch}
        />
      )}
      {activeTab === "batches" && <BatchesManager onDataChanged={meta.refetch} />}
      {activeTab === "categories" && (
        <CategoriesManager
          classes={meta.classes}
          classMap={meta.classMap}
          onDataChanged={meta.refetch}
        />
      )}
      {activeTab === "venues" && <VenuesManager onDataChanged={meta.refetch} />}
      {activeTab === "templates" && <PointsTemplatesManager onDataChanged={meta.refetch} />}
    </div>
  );
}

/* =========================================================================
   1. OUR CLASSES MANAGER
   create table public."Our_Classes" (
     class_id uuid not null default gen_random_uuid (),
     created_at timestamp with time zone not null default now(),
     class_serial_number smallint null default '1'::smallint,
     total_student smallint null default '0'::smallint,
     is_active boolean null default true,
     class_title character varying null default 'class_title'::character varying,
     constraint Our_Classes_pkey primary key (class_id)
   )
   ========================================================================= */
function ClassesManager({
  batches,
  batchMap,
  onDataChanged,
}: {
  batches: OurBatchesRecord[];
  batchMap: Record<string, string>;
  onDataChanged: () => void;
}) {
  const [classes, setClasses] = useState<OurClassesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OurClassesRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    standard_name: "",
    class_nick_name: "",
    batch_uuid: "",
    class_serial_number: 1,
    total_student: 0,
    is_active: true,
  });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction
        .from("Our_Classes")
        .select("*")
        .order("class_serial_number", { ascending: true });

      if (error) throw error;
      setClasses((data as OurClassesRecord[]) || []);
    } catch (err: any) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      standard_name: "",
      class_nick_name: "",
      batch_uuid: batches[0]?.batch_id || "",
      class_serial_number: (classes.length ? Math.max(...classes.map(c => c.class_serial_number || 0)) + 1 : 1),
      total_student: 0,
      is_active: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: OurClassesRecord) => {
    setEditingItem(item);
    setFormData({
      standard_name: item.standard_name || item.class_title || "",
      class_nick_name: item.class_nick_name || "",
      batch_uuid: item.batch_uuid || "",
      class_serial_number: item.class_serial_number || 1,
      total_student: item.total_student || 0,
      is_active: item.is_active !== false,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.standard_name.trim()) {
      setFormError("Class standard name is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        standard_name: formData.standard_name.trim(),
        class_title: formData.standard_name.trim(),
        class_nick_name: formData.class_nick_name ? formData.class_nick_name.trim() : null,
        batch_uuid: formData.batch_uuid || null,
        class_serial_number: Number(formData.class_serial_number) || 1,
        total_student: Number(formData.total_student) || 0,
        is_active: Boolean(formData.is_active),
      };

      if (editingItem) {
        const { error } = await SupaBaseFunction
          .from("Our_Classes")
          .update(payload)
          .eq("class_id", editingItem.class_id);
        if (error) throw error;
      } else {
        const { error } = await SupaBaseFunction
          .from("Our_Classes")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchClasses();
      onDataChanged();
    } catch (err: any) {
      setFormError(err.message || "Failed to save class record.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: OurClassesRecord) => {
    try {
      const nextStatus = !item.is_active;
      const { error } = await SupaBaseFunction
        .from("Our_Classes")
        .update({ is_active: nextStatus })
        .eq("class_id", item.class_id);
      if (error) throw error;
      setClasses(prev => prev.map(c => c.class_id === item.class_id ? { ...c, is_active: nextStatus } : c));
      onDataChanged();
    } catch (err: any) {
      alert("Error toggling status: " + err.message);
    }
  };

  const handleDelete = async (item: OurClassesRecord) => {
    const title = item.standard_name || item.class_title || "this class";
    if (!window.confirm(`Are you sure you want to delete class "${title}"? Note: Deletion will fail if categories are referencing this class.`)) {
      return;
    }
    try {
      const { error } = await SupaBaseFunction
        .from("Our_Classes")
        .delete()
        .eq("class_id", item.class_id);
      if (error) throw error;
      setClasses(prev => prev.filter(c => c.class_id !== item.class_id));
      onDataChanged();
    } catch (err: any) {
      alert("Cannot delete this class: " + err.message);
    }
  };

  const filtered = useMemo(() => {
    return classes.filter(c => {
      const name = (c.standard_name || c.class_title || "").toLowerCase();
      const nick = (c.class_nick_name || "").toLowerCase();
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || nick.includes(q);
      const matchesStatus =
        statusFilter === "all" ? true :
        statusFilter === "active" ? c.is_active !== false :
        c.is_active === false;
      return matchesSearch && matchesStatus;
    });
  }, [classes, searchTerm, statusFilter]);

  const activeCount = classes.filter(c => c.is_active !== false).length;
  const totalStudents = classes.reduce((sum, c) => sum + (c.total_student || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metric summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Classes</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{classes.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <GraduationCap size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Batches</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalStudents}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search classes by standard name or nick..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Create New Class
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className="text-xs font-semibold">Loading class records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <GraduationCap className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-700">No classes found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click Create New Class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-16 text-center">#</th>
                  <th className="py-3.5 px-4">Standard & Nickname</th>
                  <th className="py-3.5 px-4">Associated Batch</th>
                  <th className="py-3.5 px-4 text-center">Total Students</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.class_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                        {item.class_serial_number ?? "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.standard_name || item.class_title}
                      </div>
                      {item.class_nick_name && (
                        <div className="text-xs text-indigo-600 font-medium mt-0.5">
                          Tag: {item.class_nick_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.batch_uuid && batchMap[item.batch_uuid] ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-200">
                          <Users size={12} /> {batchMap[item.batch_uuid]}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned Batch</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">
                        <Users size={12} className="text-slate-400" />
                        {item.total_student ?? 0} students
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                          item.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                        title="Click to toggle status"
                      >
                        {item.is_active !== false ? (
                          <>
                            <CheckCircle2 size={12} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Edit Class"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CLASS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="text-indigo-600" size={20} />
                {editingItem ? "Edit Class Record" : "Create New Class"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Standard Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Secondary First Year, Thanawiyya First Year..."
                  value={formData.standard_name}
                  onChange={(e) => setFormData({ ...formData, standard_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Class Nick Name / Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. U1 - M1, U2 - M2"
                  value={formData.class_nick_name}
                  onChange={(e) => setFormData({ ...formData, class_nick_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Associated Batch (Our_Batches)
                </label>
                <select
                  value={formData.batch_uuid}
                  onChange={(e) => setFormData({ ...formData, batch_uuid: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
                >
                  <option value="">None / Open Batch</option>
                  {batches.map((b) => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Serial Order Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.class_serial_number}
                    onChange={(e) => setFormData({ ...formData, class_serial_number: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Total Students
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.total_student}
                    onChange={(e) => setFormData({ ...formData, total_student: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="class_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="class_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mark this class as Active for category mapping & enrollment
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Class" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   1.5 OUR BATCHES MANAGER (Collaborators)
   create table public."Our_Batches" (
     batch_id uuid not null default gen_random_uuid (),
     created_at timestamp with time zone not null default now(),
     batch_name character varying null default 'batch_name'::character varying,
     batch_president character varying null default 'batch_president'::character varying,
     batch_secratery character varying null default 'batch_joint_secratery'::character varying,
     batch_joint_secratery character varying null default 'batch_joint_secratery'::character varying,
     batch_treasurer character varying null default 'batch_treasurer'::character varying,
     batch_logo text null,
     is_active boolean null default true,
     constraint Our_Batches_pkey primary key (batch_id)
   )
   ========================================================================= */
function BatchesManager({ onDataChanged }: { onDataChanged: () => void }) {
  const [batches, setBatches] = useState<OurBatchesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OurBatchesRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    batch_name: "",
    batch_president: "",
    batch_secratery: "",
    batch_joint_secratery: "",
    batch_treasurer: "",
    batch_logo: "",
    is_active: true,
  });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction
        .from("Our_Batches")
        .select("*")
        .order("batch_name", { ascending: true });

      if (error) throw error;
      setBatches((data as OurBatchesRecord[]) || []);
    } catch (err: any) {
      console.error("Error fetching batches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      batch_name: "",
      batch_president: "",
      batch_secratery: "",
      batch_joint_secratery: "",
      batch_treasurer: "",
      batch_logo: "",
      is_active: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: OurBatchesRecord) => {
    setEditingItem(item);
    setFormData({
      batch_name: item.batch_name || "",
      batch_president: item.batch_president || "",
      batch_secratery: item.batch_secratery || "",
      batch_joint_secratery: item.batch_joint_secratery || "",
      batch_treasurer: item.batch_treasurer || "",
      batch_logo: item.batch_logo || "",
      is_active: item.is_active !== false,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batch_name.trim()) {
      setFormError("Batch name is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        batch_name: formData.batch_name.trim(),
        batch_president: formData.batch_president.trim() || null,
        batch_secratery: formData.batch_secratery.trim() || null,
        batch_joint_secratery: formData.batch_joint_secratery.trim() || null,
        batch_treasurer: formData.batch_treasurer.trim() || null,
        batch_logo: formData.batch_logo.trim() || null,
        is_active: Boolean(formData.is_active),
      };

      if (editingItem) {
        const { error } = await SupaBaseFunction
          .from("Our_Batches")
          .update(payload)
          .eq("batch_id", editingItem.batch_id);
        if (error) throw error;
      } else {
        const { error } = await SupaBaseFunction
          .from("Our_Batches")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchBatches();
      onDataChanged();
    } catch (err: any) {
      setFormError(err.message || "Failed to save batch record.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: OurBatchesRecord) => {
    try {
      const nextStatus = !item.is_active;
      const { error } = await SupaBaseFunction
        .from("Our_Batches")
        .update({ is_active: nextStatus })
        .eq("batch_id", item.batch_id);
      if (error) throw error;
      setBatches(prev => prev.map(b => b.batch_id === item.batch_id ? { ...b, is_active: nextStatus } : b));
      onDataChanged();
    } catch (err: any) {
      alert("Error toggling batch status: " + err.message);
    }
  };

  const handleDelete = async (item: OurBatchesRecord) => {
    if (!window.confirm(`Are you sure you want to delete batch "${item.batch_name}"?`)) {
      return;
    }
    try {
      const { error } = await SupaBaseFunction
        .from("Our_Batches")
        .delete()
        .eq("batch_id", item.batch_id);
      if (error) throw error;
      setBatches(prev => prev.filter(b => b.batch_id !== item.batch_id));
      onDataChanged();
    } catch (err: any) {
      alert("Cannot delete batch: " + err.message);
    }
  };

  const filtered = useMemo(() => {
    return batches.filter(b => {
      const name = (b.batch_name || "").toLowerCase();
      const pres = (b.batch_president || "").toLowerCase();
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || pres.includes(q);
      const matchesStatus =
        statusFilter === "all" ? true :
        statusFilter === "active" ? b.is_active !== false :
        b.is_active === false;
      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  const activeCount = batches.filter(b => b.is_active !== false).length;

  return (
    <div className="space-y-6">
      {/* Metric summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Batches</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{batches.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Collaborator Batches</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search batches by name or president..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Create New Batch
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className="text-xs font-semibold">Loading batch records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-700">No batches found</p>
            <p className="text-xs text-slate-400 mt-1">Click Create New Batch to add your first batch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Batch Name</th>
                  <th className="py-3.5 px-4">President</th>
                  <th className="py-3.5 px-4">Secretary</th>
                  <th className="py-3.5 px-4">Treasurer</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.batch_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.batch_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        UUID: {item.batch_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {item.batch_president || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {item.batch_secratery || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {item.batch_treasurer || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                          item.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                        title="Click to toggle status"
                      >
                        {item.is_active !== false ? (
                          <>
                            <CheckCircle2 size={12} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Edit Batch"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Batch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT BATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-indigo-600" size={20} />
                {editingItem ? "Edit Batch Record" : "Create New Batch"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Batch Name (Collaborator Value) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ShaadMate (24th Batch), Afnan Friends (23rd Batch)..."
                  value={formData.batch_name}
                  onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    President
                  </label>
                  <input
                    type="text"
                    placeholder="Batch President"
                    value={formData.batch_president}
                    onChange={(e) => setFormData({ ...formData, batch_president: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Secretary
                  </label>
                  <input
                    type="text"
                    placeholder="Batch Secretary"
                    value={formData.batch_secratery}
                    onChange={(e) => setFormData({ ...formData, batch_secratery: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Joint Secretary
                  </label>
                  <input
                    type="text"
                    placeholder="Joint Secretary"
                    value={formData.batch_joint_secratery}
                    onChange={(e) => setFormData({ ...formData, batch_joint_secratery: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Treasurer
                  </label>
                  <input
                    type="text"
                    placeholder="Batch Treasurer"
                    value={formData.batch_treasurer}
                    onChange={(e) => setFormData({ ...formData, batch_treasurer: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Batch Logo / Monogram URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/batch-logo.png"
                  value={formData.batch_logo}
                  onChange={(e) => setFormData({ ...formData, batch_logo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="batch_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="batch_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mark this batch as Active for programme collaboration
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Batch" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. OUR CATEGORIES MANAGER
   create table public."Our_Category" (
     category_id uuid not null default gen_random_uuid (),
     created_at timestamp with time zone not null default now(),
     category_title character varying not null default 'category_title'::character varying,
     class_1 uuid null,
     class_2 uuid null,
     class_3 uuid null,
     is_active boolean null default true,
     constraint Our_Category_pkey primary key (category_id),
     constraint Our_Category_category_title_key unique (category_title),
     constraint Our_Category_class_1_fkey foreign KEY (class_1) references "Our_Classes" (class_id),
     constraint Our_Category_class_2_fkey foreign KEY (class_2) references "Our_Classes" (class_id),
     constraint Our_Category_class_3_fkey foreign KEY (class_3) references "Our_Classes" (class_id)
   )
   ========================================================================= */
function CategoriesManager({
  classes,
  classMap,
  onDataChanged,
}: {
  classes: OurClassesRecord[];
  classMap: Record<string, string>;
  onDataChanged: () => void;
}) {
  const [categories, setCategories] = useState<OurCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OurCategoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    category_title: "",
    class_1: "",
    class_2: "",
    class_3: "",
    is_active: true,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction
        .from("Our_Category")
        .select("*")
        .order("category_title", { ascending: true });

      if (error) throw error;
      setCategories((data as OurCategoryRecord[]) || []);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      category_title: "",
      class_1: "",
      class_2: "",
      class_3: "",
      is_active: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: OurCategoryRecord) => {
    setEditingItem(item);
    setFormData({
      category_title: item.category_title,
      class_1: item.class_1 || "",
      class_2: item.class_2 || "",
      class_3: item.class_3 || "",
      is_active: item.is_active !== false,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_title.trim()) {
      setFormError("Category title is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        category_title: formData.category_title.trim(),
        class_1: formData.class_1 || null,
        class_2: formData.class_2 || null,
        class_3: formData.class_3 || null,
        is_active: Boolean(formData.is_active),
      };

      if (editingItem) {
        const { error } = await SupaBaseFunction
          .from("Our_Category")
          .update(payload)
          .eq("category_id", editingItem.category_id);
        if (error) throw error;
      } else {
        const { error } = await SupaBaseFunction
          .from("Our_Category")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchCategories();
      onDataChanged();
    } catch (err: any) {
      setFormError(err.message || "Failed to save category record.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: OurCategoryRecord) => {
    try {
      const nextStatus = !item.is_active;
      const { error } = await SupaBaseFunction
        .from("Our_Category")
        .update({ is_active: nextStatus })
        .eq("category_id", item.category_id);
      if (error) throw error;
      setCategories(prev => prev.map(c => c.category_id === item.category_id ? { ...c, is_active: nextStatus } : c));
      onDataChanged();
    } catch (err: any) {
      alert("Error toggling status: " + err.message);
    }
  };

  const handleDelete = async (item: OurCategoryRecord) => {
    if (!window.confirm(`Delete category "${item.category_title}"? Note: Cannot be deleted if assigned to programmes.`)) {
      return;
    }
    try {
      const { error } = await SupaBaseFunction
        .from("Our_Category")
        .delete()
        .eq("category_id", item.category_id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.category_id !== item.category_id));
      onDataChanged();
    } catch (err: any) {
      alert("Cannot delete category: " + err.message);
    }
  };

  const filtered = useMemo(() => {
    return categories.filter(c => {
      const matchesSearch = !searchTerm.trim() ||
        c.category_title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass =
        selectedClassFilter === "all" ? true :
        c.class_1 === selectedClassFilter ||
        c.class_2 === selectedClassFilter ||
        c.class_3 === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [categories, searchTerm, selectedClassFilter]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search categories by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                Class: {cls.class_title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Create New Category
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className="text-xs font-semibold">Loading category records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Layers className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-700">No categories found</p>
            <p className="text-xs text-slate-400 mt-1">Click Create New Category to add one with associated classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Category Title</th>
                  <th className="py-3.5 px-4">Assigned Classes (Our_Classes)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const assignedClasses = [item.class_1, item.class_2, item.class_3].filter(Boolean);
                  return (
                    <tr key={item.category_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Layers size={15} className="text-indigo-600" />
                          {item.category_title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {item.category_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedClasses.length === 0 ? (
                            <span className="text-slate-400 text-xs italic">Open to all classes</span>
                          ) : (
                            assignedClasses.map((cId, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100"
                              >
                                <GraduationCap size={12} />
                                {classMap[cId!] || "Class: " + cId}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                            item.is_active !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle status"
                        >
                          {item.is_active !== false ? (
                            <>
                              <CheckCircle2 size={12} /> Active
                            </>
                          ) : (
                            <>
                              <XCircle size={12} /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="text-indigo-600" size={20} />
                {editingItem ? "Edit Programme Category" : "Create New Programme Category"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Category Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Junior (Bidaya & Ula), Senior (Thaniya & Above)..."
                  value={formData.category_title}
                  onChange={(e) => setFormData({ ...formData, category_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              {/* Class 1, Class 2, Class 3 FK Selects */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-indigo-600" />
                  Eligible Classes (Foreign Key References)
                </p>
                <p className="text-[11px] text-slate-500">
                  Select up to 3 classes from <strong>Our_Classes</strong> that belong to this category.
                </p>

                {/* Class 1 */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Class 1 (class_1)
                  </label>
                  <select
                    value={formData.class_1}
                    onChange={(e) => setFormData({ ...formData, class_1: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">None / Not Assigned</option>
                    {classes.map((c) => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.class_title} (Order: #{c.class_serial_number ?? 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class 2 */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Class 2 (class_2)
                  </label>
                  <select
                    value={formData.class_2}
                    onChange={(e) => setFormData({ ...formData, class_2: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">None / Not Assigned</option>
                    {classes.map((c) => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.class_title} (Order: #{c.class_serial_number ?? 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class 3 */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Class 3 (class_3)
                  </label>
                  <select
                    value={formData.class_3}
                    onChange={(e) => setFormData({ ...formData, class_3: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">None / Not Assigned</option>
                    {classes.map((c) => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.class_title} (Order: #{c.class_serial_number ?? 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="category_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="category_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Category is Active for programme registrations
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. OUR VENUES MANAGER
   create table public."Our_Venues" (
     venue_id uuid not null default gen_random_uuid (),
     created_at timestamp with time zone not null default now(),
     venue_title character varying not null default 'Venue Title'::character varying,
     venue_capacity integer null default 27,
     is_active boolean null default true,
     constraint Our_Venues_pkey primary key (venue_id),
     constraint Our_Venues_venue_title_key unique (venue_title)
   )
   ========================================================================= */
function VenuesManager({ onDataChanged }: { onDataChanged: () => void }) {
  const [venues, setVenues] = useState<OurVenuesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OurVenuesRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    venue_title: "",
    venue_capacity: 27,
    is_active: true,
  });

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction
        .from("Our_Venues")
        .select("*")
        .order("venue_title", { ascending: true });

      if (error) throw error;
      setVenues((data as OurVenuesRecord[]) || []);
    } catch (err: any) {
      console.error("Error fetching venues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      venue_title: "",
      venue_capacity: 27,
      is_active: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: OurVenuesRecord) => {
    setEditingItem(item);
    setFormData({
      venue_title: item.venue_title,
      venue_capacity: item.venue_capacity ?? 27,
      is_active: item.is_active !== false,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.venue_title.trim()) {
      setFormError("Venue title is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        venue_title: formData.venue_title.trim(),
        venue_capacity: Number(formData.venue_capacity) || 27,
        is_active: Boolean(formData.is_active),
      };

      if (editingItem) {
        const { error } = await SupaBaseFunction
          .from("Our_Venues")
          .update(payload)
          .eq("venue_id", editingItem.venue_id);
        if (error) throw error;
      } else {
        const { error } = await SupaBaseFunction
          .from("Our_Venues")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchVenues();
      onDataChanged();
    } catch (err: any) {
      setFormError(err.message || "Failed to save venue record.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: OurVenuesRecord) => {
    try {
      const nextStatus = !item.is_active;
      const { error } = await SupaBaseFunction
        .from("Our_Venues")
        .update({ is_active: nextStatus })
        .eq("venue_id", item.venue_id);
      if (error) throw error;
      setVenues(prev => prev.map(v => v.venue_id === item.venue_id ? { ...v, is_active: nextStatus } : v));
      onDataChanged();
    } catch (err: any) {
      alert("Error toggling status: " + err.message);
    }
  };

  const handleDelete = async (item: OurVenuesRecord) => {
    if (!window.confirm(`Delete venue "${item.venue_title}"? Note: Cannot be deleted if assigned to programmes.`)) {
      return;
    }
    try {
      const { error } = await SupaBaseFunction
        .from("Our_Venues")
        .delete()
        .eq("venue_id", item.venue_id);
      if (error) throw error;
      setVenues(prev => prev.filter(v => v.venue_id !== item.venue_id));
      onDataChanged();
    } catch (err: any) {
      alert("Cannot delete venue: " + err.message);
    }
  };

  const filtered = useMemo(() => {
    return venues.filter(v => {
      return !searchTerm.trim() || v.venue_title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [venues, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search venues by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Create New Venue
        </button>
      </div>

      {/* Grid of Venues */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className="text-xs font-semibold">Loading campus venues...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <MapPin className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-700">No venues found</p>
            <p className="text-xs text-slate-400 mt-1">Add campus halls, auditoriums, and grounds.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.venue_id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin size={20} />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(item)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition ${
                      item.is_active !== false
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {item.is_active !== false ? "Active" : "Inactive"}
                  </button>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-3 truncate" title={item.venue_title}>
                  {item.venue_title}
                </h4>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ID: {item.venue_id}
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold">Capacity:</span>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-lg font-bold font-mono">
                    {item.venue_capacity ?? 27} Seats
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT VENUE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="text-indigo-600" size={20} />
                {editingItem ? "Edit Venue" : "Create New Campus Venue"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Venue Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masjid Conference Hall, NIICS Amphitheatre"
                  value={formData.venue_title}
                  onChange={(e) => setFormData({ ...formData, venue_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Venue Capacity (Seating Limit)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.venue_capacity}
                  onChange={(e) => setFormData({ ...formData, venue_capacity: parseInt(e.target.value, 10) || 27 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default is 27 seats.</p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="venue_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="venue_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Venue is Active and open for scheduling
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Venue" : "Create Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. POINTS TEMPLATES MANAGER
   create table public."Points_Templates" (
     p_template_id uuid not null default gen_random_uuid (),
     created_at timestamp with time zone not null default now(),
     point_template_title character varying null default 'point_template_title'::character varying,
     first_only smallint null default '5'::smallint,
     second_only smallint null default '3'::smallint,
     third_only smallint null default '1'::smallint,
     "first_A_grade" smallint null default '10'::smallint,
     "first_B_grade" smallint null default '8'::smallint,
     "second_A_grade" smallint null default '8'::smallint,
     "second_B_grade" smallint null default '6'::smallint,
     "third_A_grade" smallint null default '6'::smallint,
     "third_B_grade" smallint null default '4'::smallint,
     "A_grade" smallint null default '5'::smallint,
     "B_grade" smallint null default '3'::smallint,
     constraint Points_Templates_pkey primary key (p_template_id)
   )
   ========================================================================= */
function PointsTemplatesManager({ onDataChanged }: { onDataChanged: () => void }) {
  const [templates, setTemplates] = useState<PointsTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PointsTemplateRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const initialForm = {
    point_template_title: "",
    first_only: 5,
    second_only: 3,
    third_only: 1,
    first_A_grade: 10,
    first_B_grade: 8,
    second_A_grade: 8,
    second_B_grade: 6,
    third_A_grade: 6,
    third_B_grade: 4,
    A_grade: 5,
    B_grade: 3,
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction
        .from("Points_Templates")
        .select("*")
        .order("point_template_title", { ascending: true });

      if (error) throw error;
      setTemplates((data as PointsTemplateRecord[]) || []);
    } catch (err: any) {
      console.error("Error fetching points templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: PointsTemplateRecord) => {
    setEditingItem(item);
    setFormData({
      point_template_title: item.point_template_title,
      first_only: item.first_only ?? 5,
      second_only: item.second_only ?? 3,
      third_only: item.third_only ?? 1,
      first_A_grade: item.first_A_grade ?? 10,
      first_B_grade: item.first_B_grade ?? 8,
      second_A_grade: item.second_A_grade ?? 8,
      second_B_grade: item.second_B_grade ?? 6,
      third_A_grade: item.third_A_grade ?? 6,
      third_B_grade: item.third_B_grade ?? 4,
      A_grade: item.A_grade ?? 5,
      B_grade: item.B_grade ?? 3,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.point_template_title.trim()) {
      setFormError("Template title is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        point_template_title: formData.point_template_title.trim(),
        first_only: Number(formData.first_only),
        second_only: Number(formData.second_only),
        third_only: Number(formData.third_only),
        first_A_grade: Number(formData.first_A_grade),
        first_B_grade: Number(formData.first_B_grade),
        second_A_grade: Number(formData.second_A_grade),
        second_B_grade: Number(formData.second_B_grade),
        third_A_grade: Number(formData.third_A_grade),
        third_B_grade: Number(formData.third_B_grade),
        A_grade: Number(formData.A_grade),
        B_grade: Number(formData.B_grade),
      };

      if (editingItem) {
        const { error } = await SupaBaseFunction
          .from("Points_Templates")
          .update(payload)
          .eq("p_template_id", editingItem.p_template_id);
        if (error) throw error;
      } else {
        const { error } = await SupaBaseFunction
          .from("Points_Templates")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchTemplates();
      onDataChanged();
    } catch (err: any) {
      setFormError(err.message || "Failed to save points template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PointsTemplateRecord) => {
    if (!window.confirm(`Delete points template "${item.point_template_title}"? Note: Deletion will fail if programmes reference it.`)) {
      return;
    }
    try {
      const { error } = await SupaBaseFunction
        .from("Points_Templates")
        .delete()
        .eq("p_template_id", item.p_template_id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.p_template_id !== item.p_template_id));
      onDataChanged();
    } catch (err: any) {
      alert("Cannot delete template: " + err.message);
    }
  };

  const filtered = useMemo(() => {
    return templates.filter(t => {
      return !searchTerm.trim() || t.point_template_title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [templates, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search templates by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Create Points Template
        </button>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className="text-xs font-semibold">Loading points templates...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Trophy className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-700">No points templates found</p>
            <p className="text-xs text-slate-400 mt-1">Create scoring templates for cultural fests and competitions.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.p_template_id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.point_template_title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {item.p_template_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Template"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Score Matrix Preview */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">1st Only</p>
                    <p className="text-base font-black text-amber-600 mt-0.5">{item.first_only ?? 5}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">2nd Only</p>
                    <p className="text-base font-black text-slate-700 mt-0.5">{item.second_only ?? 3}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">3rd Only</p>
                    <p className="text-base font-black text-amber-700 mt-0.5">{item.third_only ?? 1}</p>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-center text-[11px] border border-slate-100 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-500 font-bold">
                      <tr>
                        <th className="py-1 px-2 text-left">Grade Combinations</th>
                        <th className="py-1 px-2">1st Place</th>
                        <th className="py-1 px-2">2nd Place</th>
                        <th className="py-1 px-2">3rd Place</th>
                        <th className="py-1 px-2">Grade Only</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-1.5 px-2 text-left font-bold text-emerald-700">A Grade</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{item.first_A_grade ?? 10}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{item.second_A_grade ?? 8}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{item.third_A_grade ?? 6}</td>
                        <td className="py-1.5 px-2 font-bold text-emerald-600">{item.A_grade ?? 5}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2 text-left font-bold text-sky-700">B Grade</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{item.first_B_grade ?? 8}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{item.second_B_grade ?? 6}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{item.third_B_grade ?? 4}</td>
                        <td className="py-1.5 px-2 font-bold text-sky-600">{item.B_grade ?? 3}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT POINTS TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="text-indigo-600" size={20} />
                {editingItem ? "Edit Points Template" : "Create New Points Template"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Template Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Cultural Scoring (5/3/1)"
                  value={formData.point_template_title}
                  onChange={(e) => setFormData({ ...formData, point_template_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              {/* Position Points */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Position Points (Without Grade)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">1st Only</label>
                    <input
                      type="number"
                      value={formData.first_only}
                      onChange={(e) => setFormData({ ...formData, first_only: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">2nd Only</label>
                    <input
                      type="number"
                      value={formData.second_only}
                      onChange={(e) => setFormData({ ...formData, second_only: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">3rd Only</label>
                    <input
                      type="number"
                      value={formData.third_only}
                      onChange={(e) => setFormData({ ...formData, third_only: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Graded Position Points */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Position + Grade Combination Points
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">1st + A Grade</label>
                    <input
                      type="number"
                      value={formData.first_A_grade}
                      onChange={(e) => setFormData({ ...formData, first_A_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">2nd + A Grade</label>
                    <input
                      type="number"
                      value={formData.second_A_grade}
                      onChange={(e) => setFormData({ ...formData, second_A_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">3rd + A Grade</label>
                    <input
                      type="number"
                      value={formData.third_A_grade}
                      onChange={(e) => setFormData({ ...formData, third_A_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">1st + B Grade</label>
                    <input
                      type="number"
                      value={formData.first_B_grade}
                      onChange={(e) => setFormData({ ...formData, first_B_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-sky-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">2nd + B Grade</label>
                    <input
                      type="number"
                      value={formData.second_B_grade}
                      onChange={(e) => setFormData({ ...formData, second_B_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-sky-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">3rd + B Grade</label>
                    <input
                      type="number"
                      value={formData.third_B_grade}
                      onChange={(e) => setFormData({ ...formData, third_B_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-sky-700"
                    />
                  </div>
                </div>
              </div>

              {/* Standalone Grade Points */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Standalone Grade Points (Without Position)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">A Grade Points</label>
                    <input
                      type="number"
                      value={formData.A_grade}
                      onChange={(e) => setFormData({ ...formData, A_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">B Grade Points</label>
                    <input
                      type="number"
                      value={formData.B_grade}
                      onChange={(e) => setFormData({ ...formData, B_grade: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-sky-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Template" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
