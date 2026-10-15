import React, { useState, useEffect, useMemo, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { uploadImageToImgBB, processImageToSquareDataUrl } from "../../lib/imgbbService";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import type { CategoryControllerRecord, OurCategoryRecord } from "../../lib/types";
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Edit2,
  Trash2,
  Upload,
  Sparkles,
  Layers,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Mail,
  User,
  X,
  Loader2,
  Filter,
} from "lucide-react";

interface ControllerWithMeta extends CategoryControllerRecord {
  categoryTitle?: string;
  categoryDetails?: OurCategoryRecord;
}

export default function CategoryControllersList() {
  const meta = useProgrammeMeta();

  const [controllers, setControllers] = useState<ControllerWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create / Assign Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    controllerId: "",
    categoryUuid: "",
    photoUrl: "",
    isActive: true,
  });

  // Edit Modal State
  const [editingController, setEditingController] = useState<ControllerWithMeta | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    controllerId: "",
    categoryUuid: "",
    photoUrl: "",
    isActive: true,
  });

  // Delete State
  const [controllerToDelete, setControllerToDelete] = useState<ControllerWithMeta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch Category Controllers
  const fetchControllers = async () => {
    setLoading(true);
    try {
      const { data, error } = await SupaBaseFunction
        .from("Category_Controller")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const enriched: ControllerWithMeta[] = data.map((ctrl: CategoryControllerRecord) => {
          const cat = meta.categories.find((c) => c.category_id === ctrl.category_uuid);
          return {
            ...ctrl,
            categoryTitle: cat ? cat.category_title : ctrl.category_uuid ? "Unknown Category" : "Unassigned",
            categoryDetails: cat,
          };
        });
        setControllers(enriched);
      }
    } catch (err: any) {
      console.error("Error fetching category controllers:", err);
      showToast(err.message || "Failed to fetch controllers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControllers();
  }, [meta.categories]);

  // Set default category when categories load
  useEffect(() => {
    if (!formData.categoryUuid && meta.categories.length > 0) {
      setFormData((prev) => ({ ...prev, categoryUuid: meta.categories[0].category_id }));
    }
  }, [meta.categories]);

  // Auto-generate suggested Controller ID based on selected Category
  const generateSuggestedId = (catId: string) => {
    const selectedCat = meta.categories.find((c) => c.category_id === catId);
    let prefix = "CTRL";
    if (selectedCat) {
      const titleWords = selectedCat.category_title.trim().split(" ");
      const firstWord = titleWords[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
      prefix = firstWord.substring(0, 4) || "CTRL";
    }
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${randNum}`;
  };

  const handleOpenCreateModal = () => {
    const firstCat = meta.categories[0]?.category_id || "";
    const suggested = generateSuggestedId(firstCat);
    setFormData({
      fullName: "",
      email: "",
      controllerId: suggested,
      categoryUuid: firstCat,
      photoUrl: "",
      isActive: true,
    });
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  const handleCategoryChangeInForm = (catId: string) => {
    const suggested = generateSuggestedId(catId);
    setFormData((prev) => ({
      ...prev,
      categoryUuid: catId,
      controllerId: suggested,
    }));
  };

  // Image Upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Optimizing and uploading photo...", "success");
      const squareData = await processImageToSquareDataUrl(file, 400, 0.88);
      let finalUrl = squareData;
      try {
        const uploadRes = await uploadImageToImgBB(file, `controller_${Date.now()}`);
        if (uploadRes.displayUrl) {
          finalUrl = uploadRes.displayUrl;
        }
      } catch {
        finalUrl = squareData;
      }

      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, photoUrl: finalUrl }));
      } else {
        setFormData((prev) => ({ ...prev, photoUrl: finalUrl }));
      }
      showToast("Photo uploaded successfully!", "success");
    } catch (err: any) {
      showToast("Photo upload failed: " + err.message, "error");
    }
  };

  // 1. CREATE CONTROLLER FLOW
  // User Prompt: "first create new user using 'Email and controler-id', then create new record in rthe conterlloer table, loign for controller : its email and controler id, will password"
  const handleCreateController = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    const fullName = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();
    const controllerId = formData.controllerId.trim().toUpperCase();
    const categoryUuid = formData.categoryUuid;

    if (!fullName || !email || !controllerId || !categoryUuid) {
      setCreateError("Please fill in all required fields: Full Name, Email, Controller ID, and Category.");
      return;
    }

    if (!email.includes("@")) {
      setCreateError("Please enter a valid email address.");
      return;
    }

    setCreating(true);
    try {
      // Step A: Check if controller_id is already in use
      const { data: existingId } = await SupaBaseFunction
        .from("Category_Controller")
        .select("controller_id")
        .eq("controller_id", controllerId)
        .maybeSingle();

      if (existingId) {
        throw new Error(`Controller ID "${controllerId}" is already assigned to another controller. Please choose a different ID.`);
      }

      // Step B: Check if email is already in Category_Controller
      const { data: existingEmail } = await SupaBaseFunction
        .from("Category_Controller")
        .select("controller_email")
        .ilike("controller_email", email)
        .maybeSingle();

      if (existingEmail) {
        throw new Error(`A category controller with email "${email}" already exists.`);
      }

      // Step C: FIRST create new user in UserTable using "Email and controler-id"
      const { error: userError } = await SupaBaseFunction.from("UserTable").upsert(
        {
          UserEmail: email,
          UserPassword: controllerId, // Controller ID is the password
          UserRole: "CategoryController",
          IsActive: formData.isActive,
          IsAuthenticated: false,
        },
        { onConflict: "UserEmail" }
      );

      if (userError) {
        throw new Error(`Failed to create authentication account in UserTable: ${userError.message}`);
      }

      // Step D: THEN create new record in Category_Controller table
      const { error: ccError } = await SupaBaseFunction.from("Category_Controller").insert([
        {
          controller_fullName: fullName,
          controller_email: email,
          controller_id: controllerId,
          category_uuid: categoryUuid,
          controller_img: formData.photoUrl || null,
          is_active: formData.isActive,
          controller_user_id: email, // Foreign key to UserTable.UserEmail
        },
      ]);

      if (ccError) {
        throw new Error(`Failed to create record in Category_Controller table: ${ccError.message}`);
      }

      showToast(`Category Controller "${fullName}" successfully assigned!`, "success");
      setIsCreateModalOpen(false);
      fetchControllers();
    } catch (err: any) {
      console.error("Create controller error:", err);
      setCreateError(err.message || "An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

  // 2. EDIT CONTROLLER FLOW
  const handleOpenEditModal = (ctrl: ControllerWithMeta) => {
    setEditingController(ctrl);
    setEditFormData({
      fullName: ctrl.controller_fullName || "",
      email: ctrl.controller_email || "",
      controllerId: ctrl.controller_id || "",
      categoryUuid: ctrl.category_uuid || "",
      photoUrl: ctrl.controller_img || "",
      isActive: ctrl.is_active !== false,
    });
    setEditError("");
  };

  const handleUpdateController = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingController) return;

    setEditError("");
    const fullName = editFormData.fullName.trim();
    const controllerId = editFormData.controllerId.trim().toUpperCase();
    const categoryUuid = editFormData.categoryUuid;

    if (!fullName || !controllerId || !categoryUuid) {
      setEditError("Full Name, Controller ID, and Category cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      // If controller_id changed, check uniqueness
      if (controllerId !== editingController.controller_id) {
        const { data: existingId } = await SupaBaseFunction
          .from("Category_Controller")
          .select("controller_id")
          .eq("controller_id", controllerId)
          .maybeSingle();

        if (existingId) {
          throw new Error(`Controller ID "${controllerId}" is already taken.`);
        }
      }

      // 1. Update UserTable to keep password and active status synchronized
      const { error: userError } = await SupaBaseFunction
        .from("UserTable")
        .update({
          UserPassword: controllerId,
          IsActive: editFormData.isActive,
          UserRole: "CategoryController",
        })
        .ilike("UserEmail", editingController.controller_email);

      if (userError) {
        console.warn("UserTable update warning:", userError.message);
      }

      // 2. Update Category_Controller record
      const { error: ccError } = await SupaBaseFunction
        .from("Category_Controller")
        .update({
          controller_fullName: fullName,
          controller_id: controllerId,
          category_uuid: categoryUuid,
          controller_img: editFormData.photoUrl || null,
          is_active: editFormData.isActive,
        })
        .eq("controller_uuid", editingController.controller_uuid);

      if (ccError) throw ccError;

      showToast(`Controller "${fullName}" updated successfully!`, "success");
      setEditingController(null);
      fetchControllers();
    } catch (err: any) {
      console.error("Update controller error:", err);
      setEditError(err.message || "Failed to update controller.");
    } finally {
      setUpdating(false);
    }
  };

  // 3. TOGGLE ACTIVE STATUS
  const handleToggleActive = async (ctrl: ControllerWithMeta) => {
    const newStatus = !ctrl.is_active;
    try {
      // Update both Category_Controller and UserTable
      await SupaBaseFunction
        .from("Category_Controller")
        .update({ is_active: newStatus })
        .eq("controller_uuid", ctrl.controller_uuid);

      await SupaBaseFunction
        .from("UserTable")
        .update({ IsActive: newStatus })
        .ilike("UserEmail", ctrl.controller_email);

      setControllers((prev) =>
        prev.map((c) =>
          c.controller_uuid === ctrl.controller_uuid ? { ...c, is_active: newStatus } : c
        )
      );

      showToast(`Controller "${ctrl.controller_fullName}" is now ${newStatus ? "Active" : "Deactivated"}.`);
    } catch (err: any) {
      showToast("Failed to update status: " + err.message, "error");
    }
  };

  // 4. DELETE CONTROLLER
  const handleConfirmDelete = async () => {
    if (!controllerToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Delete from Category_Controller
      const { error: ccError } = await SupaBaseFunction
        .from("Category_Controller")
        .delete()
        .eq("controller_uuid", controllerToDelete.controller_uuid);

      if (ccError) throw ccError;

      // 2. Delete or deactivate in UserTable
      const { error: userError } = await SupaBaseFunction
        .from("UserTable")
        .delete()
        .ilike("UserEmail", controllerToDelete.controller_email);

      if (userError) {
        console.warn("UserTable deletion notice:", userError.message);
      }

      showToast(`Controller "${controllerToDelete.controller_fullName}" removed.`);
      setControllerToDelete(null);
      fetchControllers();
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Copy Credentials
  const handleCopyCredentials = (ctrl: ControllerWithMeta) => {
    const credText = `Category Controller Credentials\n--------------------------\nPortal: Controller Gateway\nName: ${ctrl.controller_fullName}\nCategory: ${ctrl.categoryTitle}\nLogin Email: ${ctrl.controller_email}\nController ID (Password): ${ctrl.controller_id}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(ctrl.controller_uuid);
    showToast("Credentials copied to clipboard! (Email & Controller ID as Password)");
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Filtered controllers
  const filteredControllers = useMemo(() => {
    return controllers.filter((ctrl) => {
      const matchSearch =
        searchQuery === "" ||
        ctrl.controller_fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ctrl.controller_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ctrl.controller_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ctrl.categoryTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategoryFilter === "all" || ctrl.category_uuid === selectedCategoryFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && ctrl.is_active !== false) ||
        (statusFilter === "inactive" && ctrl.is_active === false);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [controllers, searchQuery, selectedCategoryFilter, statusFilter]);

  // Statistics
  const totalControllers = controllers.length;
  const activeControllersCount = controllers.filter((c) => c.is_active !== false).length;
  const coveredCategoryIds = new Set(controllers.map((c) => c.category_uuid).filter(Boolean));
  const totalCategoriesCount = meta.categories.length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white transition-all transform animate-bounce ${
            toastMsg.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toastMsg.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
              <ShieldCheck size={14} />
              Administrative Governance
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Category Controllers
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Assign dedicated Category Controllers (e.g. Bidaya, Ula, Thanawiyya) who have full administrative
              power (create, edit, approve, delete, declare & publish results) scoped exclusively to their assigned category.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={fetchControllers}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Assign New Controller</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Total Controllers</span>
            <span className="text-2xl font-black text-white mt-1 block">{totalControllers}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Active Controllers</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{activeControllersCount}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Covered Categories</span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {coveredCategoryIds.size} / {totalCategoriesCount}
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Login Credential</span>
            <span className="text-xs font-bold text-amber-200 mt-1 block">Email & Controller-ID</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by controller name, email, controller ID, or category..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Layers size={13} className="text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold text-xs outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {meta.categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-700 font-semibold text-xs outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Controllers Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-bold text-slate-600">Loading Category Controllers...</p>
        </div>
      ) : filteredControllers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-800">No Category Controllers Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {controllers.length === 0
              ? "No category controllers have been assigned yet. Assign a controller to grant them full administrative control over an academic category."
              : "No controllers matched your current filter criteria."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Assign First Category Controller</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredControllers.map((ctrl) => {
            const isActive = ctrl.is_active !== false;
            return (
              <div
                key={ctrl.controller_uuid}
                className={`bg-white rounded-2xl border transition-all duration-300 hover:shadow-lg flex flex-col overflow-hidden ${
                  isActive ? "border-slate-200" : "border-slate-200 bg-slate-50/60 opacity-80"
                }`}
              >
                {/* Card Header with Category Pill & Status */}
                <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-indigo-100 p-0.5 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {ctrl.controller_img ? (
                        <img
                          src={ctrl.controller_img}
                          alt={ctrl.controller_fullName}
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center">
                          {(ctrl.controller_fullName || "C")[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900 truncate" title={ctrl.controller_fullName}>
                        {ctrl.controller_fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                        <Mail size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate font-medium">{ctrl.controller_email}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(ctrl)}
                    title={`Click to ${isActive ? "Deactivate" : "Activate"}`}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300"
                    }`}
                  >
                    {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    <span>{isActive ? "Active" : "Inactive"}</span>
                  </button>
                </div>

                {/* Card Body: Category and Controller ID */}
                <div className="p-5 space-y-3 flex-1">
                  {/* Assigned Category Badge */}
                  <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black text-indigo-600 tracking-wider block">
                        Assigned Category
                      </span>
                      <span className="text-xs font-black text-slate-900 truncate block mt-0.5">
                        {ctrl.categoryTitle}
                      </span>
                    </div>
                    <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0">
                      <Layers size={14} />
                    </span>
                  </div>

                  {/* Controller ID (Login Password) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                        Controller ID • Login Password
                      </span>
                      <span className="font-mono text-xs font-extrabold text-slate-800 tracking-wide block mt-0.5">
                        {ctrl.controller_id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(ctrl)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
                      title="Copy Login Credentials"
                    >
                      {copiedId === ctrl.controller_uuid ? (
                        <CheckCircle2 size={15} className="text-emerald-600" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(ctrl)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound size={13} />
                    <span>Copy Login</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(ctrl)}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200 cursor-pointer"
                      title="Edit Controller"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setControllerToDelete(ctrl)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer"
                      title="Remove Controller"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / ASSIGN CONTROLLER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                  New Administrative Assignment
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">Assign Category Controller</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateController} className="p-6 space-y-4">
              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                  <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. Master Sheikh Abdullah"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Controller Email <span className="text-rose-500">*</span>
                  <span className="text-[10px] font-normal text-slate-400 ml-1">(Used to log in)</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="controller.bidaya@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Category Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Category <span className="text-rose-500">*</span>
                  <span className="text-[10px] font-normal text-slate-400 ml-1">
                    (Controller gets full admin control for this category only)
                  </span>
                </label>
                <div className="relative">
                  <Layers size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    required
                    value={formData.categoryUuid}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {meta.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Controller ID (Login Password) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Controller ID • Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = generateSuggestedId(formData.categoryUuid);
                      setFormData((prev) => ({ ...prev, controllerId: newId }));
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.controllerId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, controllerId: e.target.value }))}
                    placeholder="e.g. BIDA-101"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This ID serves as their password to log in at the member gateway.
                </span>
              </div>

              {/* Photo Upload / URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Controller Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Upload size={13} />
                    <span>Upload Image</span>
                  </button>
                  <input
                    type="url"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, photoUrl: e.target.value }))}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {formData.photoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={formData.photoUrl}
                      alt="Preview"
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                    />
                    <span className="text-[10px] text-emerald-600 font-bold">Photo ready</span>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveNew"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="isActiveNew" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Activate account immediately upon creation
                </label>
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                <strong>System Notice:</strong> This action will automatically provision a new user in{" "}
                <code className="font-mono font-bold">UserTable</code> with role{" "}
                <code className="font-mono font-bold">CategoryController</code> and record their assignment in{" "}
                <code className="font-mono font-bold">Category_Controller</code>.
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{creating ? "Assigning..." : "Assign Controller"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTROLLER MODAL */}
      {editingController && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                  Modify Assignment
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">Edit Category Controller</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingController(null)}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateController} className="p-6 space-y-4">
              {editError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                  <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Email (Readonly to preserve UserTable foreign key) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Controller Email</label>
                <input
                  type="email"
                  disabled
                  value={editFormData.email}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Email cannot be changed (foreign key anchor).</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editFormData.categoryUuid}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, categoryUuid: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {meta.categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Controller ID (Login Password) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Controller ID • Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.controllerId}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, controllerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Updating this synchronizes the login password in UserTable.
                </span>
              </div>

              {/* Photo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Controller Photo</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, true)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Upload size={13} />
                    <span>Upload Image</span>
                  </button>
                  <input
                    type="url"
                    value={editFormData.photoUrl}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, photoUrl: e.target.value }))}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="isActiveEdit" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Active account status
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingController(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{updating ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {controllerToDelete && (
        <ConfirmDeleteModal
          isOpen={Boolean(controllerToDelete)}
          title={`Remove Category Controller: ${controllerToDelete.controller_fullName}`}
          description={`Are you sure you want to remove ${controllerToDelete.controller_fullName} as the controller for "${controllerToDelete.categoryTitle}"? This will delete their controller record and remove their login credentials from UserTable.`}
          confirmText="Yes, Remove Controller"
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setControllerToDelete(null)}
        />
      )}
    </div>
  );
}
