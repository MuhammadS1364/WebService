import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import { uploadImageToImgBB, processImageToSquareDataUrl } from "../../src/lib/imgbbService";
import { useProgrammeMeta } from "../../src/lib/programmeMeta";
import {
  Calendar,
  MapPin,
  Tag,
  Building2,
  Users,
  BookOpen,
  Camera,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  X,
  Sparkles,
} from "lucide-react";

export default function ProgrammeRegistration() {
  const navigate = useNavigate();
  const meta = useProgrammeMeta();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [posterUrl, setPosterUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Role Management States
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  // Success Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Inline Creation Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [newCategoryClass1, setNewCategoryClass1] = useState("");
  const [newCategoryClass2, setNewCategoryClass2] = useState("");
  const [newCategoryClass3, setNewCategoryClass3] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [newVenueTitle, setNewVenueTitle] = useState("");
  const [newVenueCapacity, setNewVenueCapacity] = useState<number>(50);
  const [addingVenue, setAddingVenue] = useState(false);

  // Extract user email/identifier from the URL
  const { actUser, actWing } = useParams<{ actUser?: string; actWing?: string }>();
  const loggedInEmail = actUser || actWing;

  const initialFormState = {
    Program_Code: "",
    Program_Title: "",
    Category: "", // uuid references Our_Category(category_id)
    WingCode: "", // references Chs-WingS(WingCode)
    Group: "Assembly",
    Description: "",
    OutComes: "",
    Date: new Date().toISOString().split("T")[0],
    Venue: "", // uuid references Our_Venues(venue_id)
    AccademicYear: "", // uuid references Accademic_Info(accademic_id)
    points_template: "", // uuid references Points_Templates(p_template_id)
    Expected_Time: "10:00AM-Till Zohar",
    Collaborator: "No Collaboration",
    is_group_program: false,
    IsOpenRegistration: true,
    IsApproved: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  const groupOptions = [
    "Assembly",
    "Pen Fight",
    "My-Opinion",
    "Shaping Future",
    "Tech-Nest",
    "ClassicalSpace",
    "Tell Me More",
    "Designing",
    "الاجتماع",
    "صاحب القرآن",
    "جليس الفقه",
    "صاحب الترجمان",
    "Cultural Fest",
    "Academic Forum",
    "Other",
  ];

  const expectedTimeOptions = [
    "After Fazar-7:00Am",
    "After 7:00Am-Befor Breakfast(9:00Am)",
    "Breakfast(9:15AM)-10:00Am",
    "10:00AM-Till Zohar",
    "After Zohar(1:45PM)-3:00PM",
    "Befor Asar(4:05PM)-4:30PM",
    "After Magirb-Ishaa",
    "After Ishaa-10:20PM",
    "Full Day Programme",
    "Custom Schedule",
  ];

  const collaboratorOptions = [
    "No Collaboration",
    "ShaadMate (24th Batch)",
    "Afnan Friends (23th Batch)",
    "Al Misbah Friends (25th Batch)",
    "Saba Friends (26th Batch)",
    "Sidra Friends (27th Batch)",
    "Wahda Friends (28th Batch)",
    "Falah Friends (28th Batch)",
    "Central Academic Council",
    "External Partner",
  ];

  // Populate default foreign key selections once metadata is loaded
  useEffect(() => {
    if (!formData.AccademicYear && meta.activeAcademicYearId) {
      setFormData((prev) => ({ ...prev, AccademicYear: meta.activeAcademicYearId }));
    }
    if (!formData.points_template && meta.defaultTemplateId) {
      setFormData((prev) => ({ ...prev, points_template: meta.defaultTemplateId }));
    }
    if (!formData.Category && meta.categories.length > 0) {
      setFormData((prev) => ({ ...prev, Category: meta.categories[0].category_id }));
    }
    if (!formData.Venue && meta.venues.length > 0) {
      setFormData((prev) => ({ ...prev, Venue: meta.venues[0].venue_id }));
    }
  }, [meta.activeAcademicYearId, meta.defaultTemplateId, meta.categories, meta.venues]);

  // Fetch current user details and auto-select wing
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        let cleanIdentifier = decodeURIComponent(loggedInEmail || "").trim();

        if (!cleanIdentifier) {
          const stored = localStorage.getItem("user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              cleanIdentifier = parsed.UserEmail || "";
            } catch (e) {
              console.error(e);
            }
          }
        }

        if (!cleanIdentifier) {
          setIsLoadingRole(false);
          return;
        }

        // 1. Check Admin status
        const { data: userData } = await SupaBaseFunction
          .from("UserTable")
          .select("UserRole")
          .ilike("UserEmail", cleanIdentifier)
          .maybeSingle();

        const isRoleAdmin = userData?.UserRole === "Admin";
        setIsAdmin(isRoleAdmin);

        // 2. Fetch Wing details
        let wingQuery = SupaBaseFunction
          .from("Chs-WingS")
          .select("WingTitle, WingCode, WingEmail");

        if (cleanIdentifier.includes("@")) {
          wingQuery = wingQuery.or(`WingEmail.ilike.${cleanIdentifier},WingUserId.ilike.${cleanIdentifier}`);
        } else {
          wingQuery = wingQuery.eq("WingCode", cleanIdentifier);
        }

        const { data: wingData } = await wingQuery.maybeSingle();

        if (wingData && wingData.WingCode) {
          setFormData((prev) => ({
            ...prev,
            WingCode: wingData.WingCode,
          }));
        } else if (meta.wings.length > 0 && !formData.WingCode) {
          setFormData((prev) => ({
            ...prev,
            WingCode: meta.wings[0].WingCode,
          }));
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setIsLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [loggedInEmail, meta.wings]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    try {
      const squareDataUrl = await processImageToSquareDataUrl(file, 480, 0.88);
      setImagePreview(squareDataUrl);
      setSelectedFile(file);
      setPosterUrl("");
    } catch {
      setUploadError("Could not process poster file. Please try another image.");
    }
  };

  const handleRemovePoster = () => {
    setImagePreview("");
    setSelectedFile(null);
    setPosterUrl("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Inline Quick Add Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;
    setAddingCategory(true);
    try {
      const created = await meta.addCategory(
        newCategoryTitle,
        newCategoryClass1 || null,
        newCategoryClass2 || null,
        newCategoryClass3 || null
      );
      if (created) {
        setFormData((prev) => ({ ...prev, Category: created.category_id }));
        setNewCategoryTitle("");
        setNewCategoryClass1("");
        setNewCategoryClass2("");
        setNewCategoryClass3("");
        setShowAddCategoryModal(false);
      }
    } catch (err: any) {
      alert("Failed to add category: " + err.message);
    } finally {
      setAddingCategory(false);
    }
  };

  // Inline Quick Add Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueTitle.trim()) return;
    setAddingVenue(true);
    try {
      const created = await meta.addVenue(newVenueTitle, newVenueCapacity);
      if (created) {
        setFormData((prev) => ({ ...prev, Venue: created.venue_id }));
        setNewVenueTitle("");
        setShowAddVenueModal(false);
      }
    } catch (err: any) {
      alert("Failed to add venue: " + err.message);
    } finally {
      setAddingVenue(false);
    }
  };

  // Main Submit Handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadError("");
    setStatusMessage(null);

    try {
      const cleanCode = formData.Program_Code.trim().toUpperCase();
      if (!cleanCode) throw new Error("Program Code is required.");
      if (!formData.Program_Title.trim()) throw new Error("Program Title is required.");
      if (!formData.WingCode) throw new Error("Please select an organizing Wing department.");

      // Check if Program Code already exists
      const { data: existingProg } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Program_Code")
        .eq("Program_Code", cleanCode)
        .maybeSingle();

      if (existingProg) {
        throw new Error(`A programme with code "${cleanCode}" already exists! Please use a unique Program Code.`);
      }

      // Handle Poster Upload
      let finalPosterUrl = imagePreview || "";
      if (!finalPosterUrl && posterUrl.trim()) {
        finalPosterUrl = posterUrl.trim();
      } else if (selectedFile) {
        try {
          const uploadRes = await uploadImageToImgBB(selectedFile, `${cleanCode}_poster`);
          if (uploadRes.displayUrl) finalPosterUrl = uploadRes.displayUrl;
        } catch {
          finalPosterUrl = imagePreview;
        }
      }

      const defaultPoster =
        "https://media.licdn.com/dms/image/v2/C5112AQH1xW5oeiHzvg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520148394987?e=2147483647&v=beta&t=vThHQ4hcg90pr_O3kI_FOE_Z4jULLSBg4L280dD6-DE";

      // Prepare payload matching ProgrammesBox schema exactly
      const payload: Record<string, any> = {
        Program_Code: cleanCode,
        Program_Title: formData.Program_Title.trim(),
        WingCode: formData.WingCode,
        Description: formData.Description.trim() || null,
        OutComes: formData.OutComes.trim() || null,
        Date: formData.Date || null,
        Group: formData.Group || "Assembly",
        IsApproved: isAdmin ? Boolean(formData.IsApproved) : false,
        IsResulted: false,
        IsResultPublished: false,
        Total_Registration: 0,
        IsOpenRegistration: Boolean(formData.IsOpenRegistration),
        Program_Poster: finalPosterUrl || defaultPoster,
        IsConducted: false,
        Expected_Time: formData.Expected_Time || "Not Provided",
        Collaborator: formData.Collaborator || "No Collaboration",
        is_group_program: Boolean(formData.is_group_program),
        Venue: formData.Venue || null,
        Category: formData.Category || null,
        AccademicYear: formData.AccademicYear || meta.activeAcademicYearId || null,
        points_template: formData.points_template || meta.defaultTemplateId || null,
        created_at: new Date().toTimeString().split(" ")[0],
      };

      const { error: insertError } = await SupaBaseFunction
        .from("ProgrammesBox")
        .insert([payload]);

      if (insertError) {
        console.error("Supabase Insert Error:", insertError);
        throw new Error(`Database Error: ${insertError.message}`);
      }

      // Update Registrations Count in Wing
      try {
        const { data: wingRecord } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("Total_Registrations, Total_Points")
          .eq("WingCode", formData.WingCode)
          .maybeSingle();

        if (wingRecord) {
          await SupaBaseFunction
            .from("Chs-WingS")
            .update({
              Total_Registrations: (wingRecord.Total_Registrations || 0) + 1,
              Total_Points: (wingRecord.Total_Points || 0) + 1,
            })
            .eq("WingCode", formData.WingCode);
        }
      } catch (wingUpdateErr) {
        console.warn("Wing metrics update notice:", wingUpdateErr);
      }

      // Update total_count_program in Accademic_Info
      if (payload.AccademicYear) {
        try {
          const { data: acadRecord } = await SupaBaseFunction
            .from("Accademic_Info")
            .select("total_count_program")
            .eq("accademic_id", payload.AccademicYear)
            .maybeSingle();

          if (acadRecord) {
            await SupaBaseFunction
              .from("Accademic_Info")
              .update({
                total_count_program: (acadRecord.total_count_program || 0) + 1,
              })
              .eq("accademic_id", payload.AccademicYear);
          }
        } catch (acadErr) {
          console.warn("Accademic_Info metrics update notice:", acadErr);
        }
      }

      setStatusMessage({
        type: "success",
        text: `🎉 Programme "${cleanCode} - ${formData.Program_Title}" created successfully!`,
      });

      // Reset form
      setFormData({
        ...initialFormState,
        WingCode: formData.WingCode,
        AccademicYear: meta.activeAcademicYearId,
        points_template: meta.defaultTemplateId,
        Category: meta.categories[0]?.category_id || "",
        Venue: meta.venues[0]?.venue_id || "",
      });
      setImagePreview("");
      setSelectedFile(null);
      setPosterUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to create programme record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRole || meta.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-slate-700 animate-pulse">Initializing Programme Registry & Foreign Key Lookups...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              {isAdmin ? "Admin Directorate" : "Wing Department Portal"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Create New Programme</h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Register academic competitions, assembly speeches, and squad tournaments with institutional categories, venues, and points templates.
          </p>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECTION 1: Core Identifiers */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              1. Basic Identification
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Program Code *
                </label>
                <input
                  type="text"
                  name="Program_Code"
                  required
                  value={formData.Program_Code}
                  onChange={handleChange}
                  placeholder="e.g. ANJ012, IT002, ENG005"
                  className="w-full uppercase font-mono font-bold rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Primary key. Unique across all programmes.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Program Title *
                </label>
                <input
                  type="text"
                  name="Program_Title"
                  required
                  value={formData.Program_Title}
                  onChange={handleChange}
                  placeholder="e.g. Annual Eloquence Championship"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Organization, Category & Venue */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-indigo-600" />
              2. Wing, Category, Venue & Academic Year
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Wing */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Organizing Wing *
                </label>
                <select
                  name="WingCode"
                  required
                  value={formData.WingCode}
                  onChange={handleChange}
                  disabled={!isAdmin && Boolean(loggedInEmail)}
                  className={`w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition ${
                    !isAdmin && loggedInEmail ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white text-slate-800"
                  }`}
                >
                  <option value="" disabled>Select Wing</option>
                  {meta.wings.map((w) => (
                    <option key={w.WingCode} value={w.WingCode}>
                      {w.WingTitle || w.WingCode}
                    </option>
                  ))}
                </select>
                {!isAdmin && formData.WingCode && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">Bound to your wing account</p>
                )}
              </div>

              {/* Category (UUID foreign key to Our_Category) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(true)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <select
                  name="Category"
                  value={formData.Category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="">No Category (General / All Classes)</option>
                  {meta.categories.map((c) => {
                    const classNames = [c.class_1, c.class_2, c.class_3]
                      .filter(Boolean)
                      .map((cid) => meta.classMap[cid!] || "")
                      .filter(Boolean);
                    const classLabel = classNames.length > 0 ? ` [Classes: ${classNames.join(", ")}]` : "";
                    return (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_title}{classLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Venue (UUID foreign key to Our_Venues) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Venue *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddVenueModal(true)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <select
                  name="Venue"
                  value={formData.Venue}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="">No Venue Specified</option>
                  {meta.venues.map((v) => (
                    <option key={v.venue_id} value={v.venue_id}>
                      {v.venue_title} {v.venue_capacity ? `(${v.venue_capacity} seats)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year (UUID foreign key to Accademic_Info) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Academic Year *
                </label>
                <select
                  name="AccademicYear"
                  value={formData.AccademicYear}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {meta.academicYears.map((a) => (
                    <option key={a.accademic_id} value={a.accademic_id}>
                      {a.accademic_year || a.accademic_title} {a.is_active ? "★ Active" : ""}
                    </option>
                  ))}
                  {meta.academicYears.length === 0 && <option value="">2026-27</option>}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Schedule, Group & Points Template */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-indigo-600" />
              3. Timing, Grouping & Points Template
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Programme Date *
                </label>
                <input
                  type="date"
                  name="Date"
                  required
                  value={formData.Date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
                />
              </div>

              {/* Expected Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Expected Time
                </label>
                <select
                  name="Expected_Time"
                  value={formData.Expected_Time}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {expectedTimeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Activity Group
                </label>
                <select
                  name="Group"
                  value={formData.Group}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {groupOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Points Template */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Points Template
                </label>
                <select
                  name="points_template"
                  value={formData.points_template}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="">Default Scoring</option>
                  {meta.pointsTemplates.map((t) => (
                    <option key={t.p_template_id} value={t.p_template_id}>
                      {t.point_template_title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collaborator */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Collaborator / Batch Partner
              </label>
              <select
                name="Collaborator"
                value={formData.Collaborator}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              >
                {collaboratorOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 4: Group Event & Registration Config */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-600" />
              4. Event Type & Permissions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* is_group_program */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="is_group_program"
                  name="is_group_program"
                  checked={Boolean(formData.is_group_program)}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="is_group_program" className="cursor-pointer">
                  <span className="block text-xs font-bold text-slate-800">
                    Group / Squad Event (SquadMate)
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Students participate in teams of up to 7 members. Squad tournament rules apply.
                  </span>
                </label>
              </div>

              {/* IsOpenRegistration */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="IsOpenRegistration"
                  name="IsOpenRegistration"
                  checked={Boolean(formData.IsOpenRegistration)}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="IsOpenRegistration" className="cursor-pointer">
                  <span className="block text-xs font-bold text-slate-800">
                    Open for Immediate Registration
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Students can immediately apply and register online.
                  </span>
                </label>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="IsApproved"
                  name="IsApproved"
                  checked={Boolean(formData.IsApproved)}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="IsApproved" className="cursor-pointer">
                  <span className="block text-xs font-bold text-amber-900">
                    Admin Approval Pre-Granted
                  </span>
                  <span className="block text-[11px] text-amber-700 mt-0.5">
                    Publish programme as officially approved by the directorate.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* SECTION 5: Poster & Media */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4 text-indigo-600" />
              5. Programme Poster
            </h3>

            <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-slate-50/80 space-y-3">
              {imagePreview ? (
                <div className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Poster Preview"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {selectedFile ? selectedFile.name : "Custom Poster URL Attached"}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        High resolution banner ready
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Change Poster
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePoster}
                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                >
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Click to upload programme banner/poster
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports PNG, JPG, WebP
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePosterFileChange}
                className="hidden"
              />

              <div>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 font-semibold cursor-pointer underline transition-colors"
                >
                  {showUrlInput ? "Hide image URL input" : "Or provide direct image URL instead"}
                </button>

                {showUrlInput && (
                  <input
                    type="url"
                    placeholder="https://example.com/poster.jpg"
                    value={posterUrl}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPosterUrl(v);
                      if (v.trim()) {
                        setImagePreview(v.trim());
                        setSelectedFile(null);
                      } else {
                        setImagePreview("");
                      }
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
                  />
                )}
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: Description & Outcomes */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              6. Details & Learning Outcomes
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Programme Description
              </label>
              <textarea
                name="Description"
                rows={3}
                value={formData.Description}
                onChange={handleChange}
                placeholder="Describe the objectives, instructions, and target participants..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Expected Outcomes
              </label>
              <textarea
                name="OutComes"
                rows={2}
                value={formData.OutComes}
                onChange={handleChange}
                placeholder="What skills, insights, or competencies will students gain?"
                className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                isSubmitting
                  ? "bg-indigo-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registering Programme...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Register & Publish Programme</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* QUICK ADD CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                Add New Programme Category
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Junior (Bidaya & Ula), Thanawiyya..."
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Class Foreign Key Selects */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Assign Classes (Our_Classes)
                </label>

                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                    Class 1 (class_1)
                  </label>
                  <select
                    value={newCategoryClass1}
                    onChange={(e) => setNewCategoryClass1(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">None / Open</option>
                    {meta.classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_title} (Batch #{cls.class_serial_number ?? 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                    Class 2 (class_2)
                  </label>
                  <select
                    value={newCategoryClass2}
                    onChange={(e) => setNewCategoryClass2(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">None / Open</option>
                    {meta.classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_title} (Batch #{cls.class_serial_number ?? 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                    Class 3 (class_3)
                  </label>
                  <select
                    value={newCategoryClass3}
                    onChange={(e) => setNewCategoryClass3(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">None / Open</option>
                    {meta.classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_title} (Batch #{cls.class_serial_number ?? 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCategory}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {addingCategory ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD VENUE MODAL */}
      {showAddVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Add New Campus Venue
              </h4>
              <button
                type="button"
                onClick={() => setShowAddVenueModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateVenue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Venue Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masjid Conference Hall, NIICS Amphitheatre"
                  value={newVenueTitle}
                  onChange={(e) => setNewVenueTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={newVenueCapacity}
                  onChange={(e) => setNewVenueCapacity(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVenueModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVenue}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {addingVenue ? "Adding..." : "Add Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
