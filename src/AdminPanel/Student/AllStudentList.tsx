import React, { useState, useEffect, useMemo, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useNavigate, useParams } from "react-router-dom";
import { exportToExcel, parseSpreadsheet } from "../../lib/excelService";
import { importStudentsBatch } from "./ImportStudent";
import SafeImage from "../../lib/SafeImage";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import {
  Download,
  Upload,
  PlusCircle,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Edit,
  CheckSquare,
  X,
  Copy,
  Check,
  Users,
  GraduationCap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface StudentRecord {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
  Student_Photo_Urls: string;
  FatherName: string;
  CollegeName: string;
  Class: string;
  Stn_Class?: string;
  Total_Point_Anjuman: number;
  Achievements_Counts: number;
  Grand_Total_Points: number;
  IsActive?: boolean;
  StnState: string;
  StnDistrict: string;
}

export default function OurStudentsList() {
  const { actUser } = useParams();
  const navigate = useNavigate();
  const meta = useProgrammeMeta();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // View Mode: "table" or "cards"
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    try {
      const saved = localStorage.getItem("student_directory_view_mode");
      return saved === "cards" ? "cards" : "table";
    } catch {
      return "table";
    }
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState("All");
  const [filterDistrict, setFilterDistrict] = useState("All");
  const [filterClass, setFilterClass] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Modals & Feedback
  const [deletingStudent, setDeletingStudent] = useState<{ addNo: string; name: string } | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isBatchClassModalOpen, setIsBatchClassModalOpen] = useState(false);
  const [batchTargetClass, setBatchTargetClass] = useState("");
  const [isAssigningClass, setIsAssigningClass] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction.from("StudentsBox")
        .select("*")
        .order("StudentName", { ascending: true });
      if (error) throw error;

      const mapped = (data || []).map((s: any) => {
        const matchedClass = meta.classes?.find(
          (c) =>
            c.class_id === s.Stn_Class ||
            c.standard_name === s.Stn_Class ||
            c.class_nick_name === s.Stn_Class
        );
        return {
          ...s,
          Class:
            matchedClass?.standard_name ||
            matchedClass?.class_nick_name ||
            s.Class ||
            (s.Stn_Class ? meta.classMap[s.Stn_Class] : "") ||
            "Class Not Assigned",
        };
      });
      setStudents(mapped);
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.classes]);

  // Persist View Mode
  const handleViewModeChange = (mode: "table" | "cards") => {
    setViewMode(mode);
    try {
      localStorage.setItem("student_directory_view_mode", mode);
    } catch {
      // ignore
    }
  };

  // Toast Auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((stn) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        stn.StudentName.toLowerCase().includes(query) ||
        stn.AddNo.toLowerCase().includes(query) ||
        (stn.CollegeName || "").toLowerCase().includes(query) ||
        (stn.FatherName || "").toLowerCase().includes(query);

      const matchesState = filterState === "All" || stn.StnState === filterState;
      const matchesDistrict = filterDistrict === "All" || stn.StnDistrict === filterDistrict;

      const isUnassigned =
        !stn.Class ||
        stn.Class.trim() === "" ||
        stn.Class.toLowerCase() === "unassigned" ||
        stn.Class.toLowerCase().includes("not assigned");

      const matchesClass =
        filterClass === "All"
          ? true
          : filterClass === "__unassigned__"
          ? isUnassigned
          : stn.Class === filterClass;

      return matchesSearch && matchesState && matchesDistrict && matchesClass;
    });
  }, [students, searchQuery, filterState, filterDistrict, filterClass]);

  // Reset pagination when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterState, filterDistrict, filterClass, itemsPerPage]);

  const unassignedCount = useMemo(() => {
    return students.filter(
      (s) =>
        !s.Class ||
        s.Class.trim() === "" ||
        s.Class.toLowerCase() === "unassigned" ||
        s.Class.toLowerCase().includes("not assigned")
    ).length;
  }, [students]);

  const { uniqueStates, uniqueDistricts, uniqueClasses } = useMemo(() => {
    const studentClasses = students.map((s) => s.Class).filter(Boolean);
    const registryClasses = (meta.classes || []).map((c) => c.standard_name).filter(Boolean);
    const allKnownClasses = Array.from(new Set([...studentClasses, ...registryClasses])).filter(
      (c) => c !== "Class Not Assigned" && c !== "Unassigned"
    );

    return {
      uniqueStates: Array.from(new Set(students.map((s) => s.StnState).filter(Boolean))),
      uniqueDistricts: Array.from(
        new Set(
          students
            .filter((s) => filterState === "All" || s.StnState === filterState)
            .map((s) => s.StnDistrict)
            .filter(Boolean)
        )
      ),
      uniqueClasses: allKnownClasses,
    };
  }, [students, meta.classes, filterState]);

  // Paginated Students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredStudents;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Multi-Selection Logic
  const isAllVisibleSelected = useMemo(() => {
    if (paginatedStudents.length === 0) return false;
    return paginatedStudents.every((s) => selectedStudents.includes(s.AddNo));
  }, [paginatedStudents, selectedStudents]);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s) => selectedStudents.includes(s.AddNo));
  }, [filteredStudents, selectedStudents]);

  const toggleStudentSelection = (addNo: string) => {
    setSelectedStudents((prev) =>
      prev.includes(addNo) ? prev.filter((id) => id !== addNo) : [...prev, addNo]
    );
  };

  const handleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(paginatedStudents.map((s) => s.AddNo));
      setSelectedStudents((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedStudents, ...paginatedStudents.map((s) => s.AddNo)]);
      setSelectedStudents(Array.from(newIds));
    }
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.AddNo));
    }
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
  };

  // Single Delete
  const confirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeletingSingle(true);
    try {
      setActionLoading(deletingStudent.addNo);
      // Clean up linked registrations safely
      await SupaBaseFunction.from("CandidateRegistrationTable").delete().eq("Candidate_Code", deletingStudent.addNo);
      await SupaBaseFunction.from("Content_Table").delete().eq("student_addNo", deletingStudent.addNo);
      await SupaBaseFunction.from("Topics_Box").delete().eq("student_addNo", deletingStudent.addNo);

      const { error } = await SupaBaseFunction.from("StudentsBox").delete().eq("AddNo", deletingStudent.addNo);
      if (error) throw error;

      setStudents((prev) => prev.filter((stn) => stn.AddNo !== deletingStudent.addNo));
      setSelectedStudents((prev) => prev.filter((id) => id !== deletingStudent.addNo));
      setDeletingStudent(null);
      setToastMessage(`Student profile #${deletingStudent.addNo} has been deleted.`);
    } catch (err: any) {
      console.error("Error deleting student:", err);
      alert(`Error deleting student: ${err.message}`);
    } finally {
      setActionLoading(null);
      setIsDeletingSingle(false);
    }
  };

  // Batch Delete
  const confirmDeleteBatch = async () => {
    if (selectedStudents.length === 0) return;
    setIsDeletingBatch(true);
    try {
      // 1. Clean up linked tables in batch
      await SupaBaseFunction.from("CandidateRegistrationTable").delete().in("Candidate_Code", selectedStudents);
      await SupaBaseFunction.from("Content_Table").delete().in("student_addNo", selectedStudents);
      await SupaBaseFunction.from("Topics_Box").delete().in("student_addNo", selectedStudents);

      // 2. Delete from StudentsBox
      const { error } = await SupaBaseFunction.from("StudentsBox").delete().in("AddNo", selectedStudents);
      if (error) throw error;

      setStudents((prev) => prev.filter((stn) => !selectedStudents.includes(stn.AddNo)));
      const count = selectedStudents.length;
      setSelectedStudents([]);
      setIsBatchDeleteModalOpen(false);
      setToastMessage(`Permanently deleted ${count} student profiles.`);
    } catch (err: any) {
      console.error("Error bulk deleting students:", err);
      alert(`Bulk Delete Error: ${err.message}`);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Batch Assign Class
  const handleBatchAssignClass = async () => {
    if (!batchTargetClass || selectedStudents.length === 0) return;
    setIsAssigningClass(true);
    try {
      const matched = meta.classes?.find(
        (c) => c.standard_name === batchTargetClass || c.class_id === batchTargetClass
      );
      const classId = matched?.class_id || batchTargetClass;
      const className = matched?.standard_name || batchTargetClass;

      const { error } = await SupaBaseFunction.from("StudentsBox")
        .update({
          Stn_Class: classId,
          Class: className,
        })
        .in("AddNo", selectedStudents);

      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) =>
          selectedStudents.includes(s.AddNo)
            ? { ...s, Stn_Class: classId, Class: className }
            : s
        )
      );

      setToastMessage(`Assigned ${selectedStudents.length} students to class "${className}".`);
      setIsBatchClassModalOpen(false);
      setBatchTargetClass("");
    } catch (err: any) {
      console.error("Error assigning class:", err);
      alert(`Error updating class: ${err.message}`);
    } finally {
      setIsAssigningClass(false);
    }
  };

  // Export Functions
  const handleExportAll = () => {
    const formatted = students.map((s, idx) => ({
      "Sl No": idx + 1,
      "Admission No": s.AddNo,
      "Student Name": s.StudentName,
      "Class": s.Class,
      "Study Center": s.CollegeName || "",
      "Father Name": s.FatherName || "",
      "Email": s.StudentEmail || "",
      "District": s.StnDistrict || "",
      "State": s.StnState || "",
      "Anjuman Points": s.Total_Point_Anjuman || 0,
      "Achievements": s.Achievements_Counts || 0,
      "Grand Total Points": s.Grand_Total_Points || 0,
      "Status": s.IsActive !== false ? "Active" : "Inactive",
    }));
    exportToExcel(formatted, "Full_Students_Directory.xlsx", "All Students");
  };

  const handleExportSelected = () => {
    const selected = students.filter((s) => selectedStudents.includes(s.AddNo));
    if (selected.length === 0) {
      alert("Please select at least one student.");
      return;
    }
    const formatted = selected.map((s, idx) => ({
      "Sl No": idx + 1,
      "Admission No": s.AddNo,
      "Student Name": s.StudentName,
      "Class": s.Class,
      "Study Center": s.CollegeName || "",
      "Father Name": s.FatherName || "",
      "Email": s.StudentEmail || "",
      "District": s.StnDistrict || "",
      "State": s.StnState || "",
      "Anjuman Points": s.Total_Point_Anjuman || 0,
      "Achievements": s.Achievements_Counts || 0,
      "Grand Total Points": s.Grand_Total_Points || 0,
      "Status": s.IsActive !== false ? "Active" : "Inactive",
    }));
    exportToExcel(formatted, `Students_Selected_${selected.length}.xlsx`, "Selected Students");
    setToastMessage(`Exported ${selected.length} student records.`);
  };

  // Copy Admission Numbers to Clipboard
  const handleCopyAddNos = () => {
    if (selectedStudents.length === 0) return;
    const text = selectedStudents.join(", ");
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const rows = await parseSpreadsheet(file);
      const res = await importStudentsBatch(rows);
      alert(`✅ Batch import result: ${res.successCount} added/updated, ${res.duplicatesSkipped} duplicates skipped.`);
      await fetchStudents();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterState("All");
    setFilterDistrict("All");
    setFilterClass("All");
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-sm font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading student directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 p-1 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2Icon className="text-emerald-400 w-4 h-4" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Students Directory
            </h2>
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Total {students.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Browse, search, edit, and bulk-manage student profiles, classes, and performance records.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 shadow-2xs transition cursor-pointer"
            title="Export full directory to Excel"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Export All ({students.length})</span>
          </button>

          <button
            onClick={() => navigate(`/admin-panel/${actUser}/new-student`)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 transition cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search, Filter, View-Mode Switcher Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, admission number, father, college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Table View vs Card View */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              View:
            </span>
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleViewModeChange("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table List View"
              >
                <List size={15} />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={15} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Class Category
            </label>
            <select
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              onChange={(e) => setFilterClass(e.target.value)}
              value={filterClass}
            >
              <option value="All">All Classes ({students.length})</option>
              {unassignedCount > 0 && (
                <option value="__unassigned__">⚠️ Unassigned Students ({unassignedCount})</option>
              )}
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              State
            </label>
            <select
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              onChange={(e) => setFilterState(e.target.value)}
              value={filterState}
            >
              <option value="All">All States ({uniqueStates.length})</option>
              {uniqueStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              District
            </label>
            <select
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              onChange={(e) => setFilterDistrict(e.target.value)}
              value={filterDistrict}
            >
              <option value="All">All Districts</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Items Per Page / Reset */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Show Per Page
              </label>
              {(searchQuery || filterClass !== "All" || filterState !== "All" || filterDistrict !== "All") && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              )}
            </div>
            <select
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={15}>15 Per Page</option>
              <option value={25}>25 Per Page</option>
              <option value={50}>50 Per Page</option>
              <option value={100}>100 Per Page</option>
              <option value={9999}>Show All ({filteredStudents.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Multi-Selection Action Bar */}
      {selectedStudents.length > 0 && (
        <div className="bg-emerald-900 text-white rounded-2xl p-3 sm:p-4 shadow-xl border border-emerald-700 flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 sticky top-4 z-30">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 border border-emerald-600 flex items-center justify-center shrink-0">
              <CheckSquare size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-white">
                {selectedStudents.length} {selectedStudents.length === 1 ? "Student" : "Students"} Selected
              </p>
              <p className="text-[11px] text-emerald-300 font-medium">
                {isAllFilteredSelected ? (
                  "All filtered students selected"
                ) : (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="underline hover:text-white cursor-pointer"
                  >
                    Click to select all {filteredStudents.length} matching students
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Batch Export */}
            <button
              type="button"
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 transition shadow-xs cursor-pointer"
              title="Export selected students to Excel"
            >
              <Download size={13} />
              <span>Export Selected</span>
            </button>

            {/* Batch Assign Class */}
            <button
              type="button"
              onClick={() => setIsBatchClassModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 transition shadow-xs cursor-pointer"
              title="Assign or change class for selected students"
            >
              <GraduationCap size={13} />
              <span>Assign Class</span>
            </button>

            {/* Copy Admission Numbers */}
            <button
              type="button"
              onClick={handleCopyAddNos}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 transition shadow-xs cursor-pointer"
              title="Copy admission numbers to clipboard"
            >
              {copiedNotification ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
              <span>{copiedNotification ? "Copied!" : "Copy IDs"}</span>
            </button>

            {/* Batch Delete */}
            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              title="Delete all selected students"
            >
              <Trash2 size={13} />
              <span>Delete ({selectedStudents.length})</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1.5 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800 transition cursor-pointer ml-1"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Students Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No students match your active filters or search terms. Try searching another name or reset filters.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* ========================================================= */
        /* VIEW 1: ADVANCED TABLE VIEW                               */
        /* Columns: Selection, AddNo, Name, ClassName, College, Location, Points, Actions */
        /* ========================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      title={isAllVisibleSelected ? "Deselect all visible" : "Select all visible"}
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-4 font-mono">AddNo</th>
                  <th className="py-3 px-4 min-w-[220px]">Candidate / Name</th>
                  <th className="py-3 px-4 min-w-[150px]">ClassName</th>
                  <th className="py-3 px-4 min-w-[170px]">Study Center / College</th>
                  <th className="py-3 px-4 min-w-[130px]">District & State</th>
                  <th className="py-3 px-4 text-center">Points</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedStudents.map((student, idx) => {
                  const isSelected = selectedStudents.includes(student.AddNo);
                  const isUnassigned =
                    !student.Class ||
                    student.Class.trim() === "" ||
                    student.Class.toLowerCase() === "unassigned" ||
                    student.Class.toLowerCase().includes("not assigned");

                  const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={`${student.AddNo}_${idx}`}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-emerald-50/70 hover:bg-emerald-50"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(student.AddNo)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Serial Index */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px] font-bold">
                        {serialNo}
                      </td>

                      {/* AddNo */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] inline-block">
                          #{student.AddNo}
                        </span>
                      </td>

                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                            <SafeImage
                              src={student.Student_Photo_Urls}
                              alt={student.StudentName}
                              fallbackCategory="student"
                              fallbackText={student.StudentName}
                              className="w-full h-full object-cover"
                            />
                            {student.IsActive !== undefined && (
                              <div
                                className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                                  student.IsActive ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-900 block truncate text-xs sm:text-sm">
                              {student.StudentName}
                            </span>
                            {student.FatherName ? (
                              <span className="text-[10px] text-slate-500 block truncate">
                                Father: <span className="font-semibold text-slate-700">{student.FatherName}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                {student.StudentEmail || "No Email"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ClassName */}
                      <td className="py-3 px-4">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 font-bold text-[10px] text-amber-800">
                            <AlertCircle size={10} /> Unassigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-[11px] text-slate-800">
                            {student.Class}
                          </span>
                        )}
                      </td>

                      {/* College / Study Center */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[200px]" title={student.CollegeName || "DHIU"}>
                          {student.CollegeName || "DHIU Main Campus"}
                        </span>
                      </td>

                      {/* District & State */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          {student.StnDistrict || "District N/A"}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {student.StnState || "State N/A"}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]" title="Grand Total Points">
                            {student.Grand_Total_Points || 0} pts
                          </span>
                          {student.Total_Point_Anjuman > 0 && (
                            <span className="text-[10px] text-slate-400" title="Anjuman Points">
                              ({student.Total_Point_Anjuman})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin-panel/${actUser}/edite-student/${student.AddNo}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === student.AddNo}
                            onClick={() => setDeletingStudent({ addNo: student.AddNo, name: student.StudentName })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                            title="Delete Student"
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
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW 2: ENHANCED CARD GRID VIEW                           */
        /* ========================================================= */
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {paginatedStudents.map((student, idx) => {
            const isSelected = selectedStudents.includes(student.AddNo);
            const isUnassigned =
              !student.Class ||
              student.Class.trim() === "" ||
              student.Class.toLowerCase() === "unassigned" ||
              student.Class.toLowerCase().includes("not assigned");

            return (
              <div
                key={`${student.AddNo}_${idx}`}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-md"
                    : "border-slate-200 hover:shadow-md"
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-4 right-4 z-10">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={isSelected}
                    onChange={() => toggleStudentSelection(student.AddNo)}
                  />
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3.5 pr-8">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center relative shadow-2xs">
                      <SafeImage
                        src={student.Student_Photo_Urls}
                        alt={student.StudentName}
                        fallbackCategory="student"
                        fallbackText={student.StudentName}
                        className="h-full w-full object-cover"
                      />
                      {student.IsActive !== undefined && (
                        <div
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            student.IsActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                          #{student.AddNo}
                        </span>
                      </div>
                      <h3 className="truncate text-sm font-black text-slate-900 tracking-tight">
                        {student.StudentName}
                      </h3>
                      {student.FatherName ? (
                        <p className="truncate text-[11px] text-slate-500 font-semibold">
                          Father: <span className="text-slate-800 font-bold">{student.FatherName}</span>
                        </p>
                      ) : (
                        <p className="truncate text-xs text-slate-500 font-medium">
                          {student.StudentEmail || "No Email"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-slate-500">ClassName:</span>
                      {isUnassigned ? (
                        <span className="rounded bg-amber-50 border border-amber-300 px-2 py-0.5 font-bold text-[10px] text-amber-800 flex items-center gap-1">
                          <AlertCircle size={10} /> Unassigned
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-[11px] text-slate-800">
                          {student.Class}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 truncate">
                      <span className="font-semibold text-slate-500">Study Center:</span>
                      <span className="truncate font-medium text-slate-900 max-w-[180px]">
                        {student.CollegeName || "DHIU Main Campus"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-slate-500">Location:</span>
                      <span className="font-medium text-slate-800 text-[11px]">
                        {student.StnDistrict || "N/A"}, {student.StnState || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Points Matrix */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                        Anjuman
                      </p>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">
                        {student.Total_Point_Anjuman || 0}
                      </p>
                    </div>
                    <div className="border-x border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                        Achieve
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {student.Achievements_Counts || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                        Grand Total
                      </p>
                      <p className="text-sm font-bold text-blue-600 mt-0.5">
                        {student.Grand_Total_Points || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex border-t border-slate-100 bg-slate-50/80 p-2.5 gap-2">
                  <button
                    type="button"
                    disabled={actionLoading === student.AddNo}
                    onClick={() => setDeletingStudent({ addNo: student.AddNo, name: student.StudentName })}
                    className="flex-1 rounded-xl border border-red-200 bg-white py-2 text-center text-xs font-bold text-red-600 shadow-2xs hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin-panel/${actUser}/edite-student/${student.AddNo}`)}
                    className="flex-1 rounded-xl bg-emerald-600 py-2 text-center text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Update Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredStudents.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-600">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of{" "}
            {filteredStudents.length} Students
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingStudent)}
        title="Delete Student Profile?"
        message={`Are you sure you want to permanently delete profile for "${deletingStudent?.name}"?`}
        itemDescription={`Admission No: #${deletingStudent?.addNo || ""}`}
        isDeleting={isDeletingSingle}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setDeletingStudent(null)}
      />

      {/* Batch Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isBatchDeleteModalOpen}
        title={`Delete ${selectedStudents.length} Selected Students?`}
        message={`Are you sure you want to permanently delete all ${selectedStudents.length} selected student profiles? This will remove their records, registrations, and points.`}
        itemDescription={`Selected student IDs: ${selectedStudents.slice(0, 5).join(", ")}${selectedStudents.length > 5 ? ` and ${selectedStudents.length - 5} more...` : ""}`}
        confirmText={`Yes, Delete ${selectedStudents.length} Students`}
        isDeleting={isDeletingBatch}
        onConfirm={confirmDeleteBatch}
        onCancel={() => setIsBatchDeleteModalOpen(false)}
      />

      {/* Batch Assign Class Modal */}
      {isBatchClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Batch Assign Class
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Applying to {selectedStudents.length} selected students
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchClassModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Select Destination Class
              </label>
              <select
                value={batchTargetClass}
                onChange={(e) => setBatchTargetClass(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">-- Choose a standard class --</option>
                {(meta.classes || []).map((c) => (
                  <option key={c.class_id} value={c.standard_name}>
                    {c.standard_name} {c.class_nick_name ? `(${c.class_nick_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchClassModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!batchTargetClass || isAssigningClass}
                onClick={handleBatchAssignClass}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isAssigningClass ? "Assigning..." : `Assign to ${selectedStudents.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}