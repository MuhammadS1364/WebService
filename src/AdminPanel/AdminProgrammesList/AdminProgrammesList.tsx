import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import * as XLSX from "xlsx"; 
import { exportToExcel } from "../../lib/excelService";
import EditProgrammeModal from "./EditProgrammeModal";
import SafeImage from "../../lib/SafeImage";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import {
  deleteProgrammeCascade,
  deleteProgrammesBulkCascade,
} from "../../lib/cascadeDeleteService";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import AdminTopicsManagerModal from "../../components/AdminTopicsManagerModal";
import ProgrammeResultModal from "../../components/ProgrammeResultModal";
import { 
  Edit3, 
  Calendar, 
  MapPin, 
  Users, 
  Layers, 
  Maximize2, 
  FileText, 
  X,
  Award,
  Printer,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Trophy,
  UserPlus
} from "lucide-react"; 

export interface Programme {
  Program_Title: string | null;
  Program_Code: string;
  WingCode: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null;
  Venue: string | null;
  Category: string | null;
  Group: string | null;
  IsApproved: boolean;
  IsResulted: boolean;
  IsResultPublished: boolean;
  Total_Registration: number;
  IsOpenRegistration: boolean;
  Program_Poster: string | null;
  IsConducted: boolean;
  AccademicYear: string | null;
  is_topic_required?: boolean;
  is_result_required?: boolean | null;
}

export interface Wing {
  WingCode: string;
  WingTitle: string | null;
  Total_Registrations: number;
  Total_Points?: number;
}

type ViewMode = "cards" | "calendar";

interface FilterState {
  AccademicYear: string;
  Group: string;
  Venue: string;
  WingCode: string;
  [key: string]: string;
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

const IMPORT_COLUMNS = [
  "Program_Title", "Program_Code", "WingCode", "Date", 
  "Venue", "Category", "Group", "AccademicYear", "Program_Poster","Total_Registration","IsResulted","IsConducted","Description","OutComes"
];

export interface AdminProgrammesListProps {
  controllerCategoryUuid?: string;
  controllerCategoryName?: string;
  isControllerMode?: boolean;
}

export default function AdminProgrammesList({
  controllerCategoryUuid,
  controllerCategoryName,
  isControllerMode = false,
}: AdminProgrammesListProps = {}) {
  const { actUser, actController } = useParams<{ actUser?: string; actController?: string }>();
  const activeUser = actController || actUser || "";
  const meta = useProgrammeMeta();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingProgram, setEditingProgram] = useState<Programme | null>(null);
  const [printSheetProgram, setPrintSheetProgram] = useState<Programme | null>(null);
  const [fullscreenPoster, setFullscreenPoster] = useState<{ url: string; title: string } | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: "single" | "bulk";
    code?: string;
    title?: string;
    codes?: string[];
  }>({
    isOpen: false,
    type: "single",
  });
  const [isExecutingDelete, setIsExecutingDelete] = useState(false);
  const [isTopicsManagerOpen, setIsTopicsManagerOpen] = useState(false);
  const [selectedTopicProg, setSelectedTopicProg] = useState<Programme | null>(null);
  
  const [isLoading, setIsLoading] = useState({ fetch: true, import: false, export: false, action: false });
  const [toast, setToast] = useState<ToastState | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    AccademicYear: "", Category: controllerCategoryUuid || "", Group: "", Venue: "", WingCode: "",
  });
  const [approvalFilter, setApprovalFilter] = useState<"all" | "approved" | "pending">("all");
  const [resultFilter, setResultFilter] = useState<"all" | "resulted" | "published" | "pending" | "unpublished" | "no-result-required">("all");
  const [resultModalProgram, setResultModalProgram] = useState<Programme | null>(null);
  const [openMenuProgCode, setOpenMenuProgCode] = useState<string | null>(null);

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(prev => ({ ...prev, fetch: true }));
    try {
      const { data: progData, error: progError } = await SupaBaseFunction.from("ProgrammesBox").select("*").order("Date", { ascending: false });
      const { data: wingData, error: wingError } = await SupaBaseFunction.from("Chs-WingS").select("WingCode, WingTitle, Total_Registrations");

      if (progError) throw progError;
      if (wingError) throw wingError;

      if (progData) setProgrammes(progData as Programme[]);
      if (wingData) setWings(wingData as Wing[]);
    } catch (error: any) {
      showToast(error.message || "Failed to load data.", "error");
    } finally {
      setIsLoading(prev => ({ ...prev, fetch: false }));
    }
  };

  const getWingName = (WingCode: string | null): string => {
    if (!WingCode) return "Unknown Wing";
    return meta.wingMap[WingCode] || wings.find((w) => w.WingCode === WingCode)?.WingTitle || WingCode;
  };

  const getVenueName = (venueId: string | null): string => {
    if (!venueId) return "TBA";
    return meta.venueMap[venueId] || venueId;
  };

  const getAcademicYearName = (yearId: string | null): string => {
    if (!yearId) return "";
    return meta.academicMap[yearId] || yearId;
  };

  const getCategoryName = (catId: string | null): string => {
    if (!catId) return "General";
    return meta.categoryMap[catId] || catId;
  };

  const getGroupName = (grpId: string | null): string => {
    if (!grpId) return "General Group";
    return meta.groupMap[grpId] || grpId;
  };

  const uniqueValues = useMemo(() => {
    return {
      AccademicYear: Array.from(new Set(programmes.map((p) => p.AccademicYear).filter(Boolean) as string[])),
      Category: Array.from(new Set(programmes.map((p) => p.Category).filter(Boolean) as string[])),
      Group: Array.from(new Set(programmes.map((p) => p.Group).filter(Boolean) as string[])),
      Venue: Array.from(new Set(programmes.map((p) => p.Venue).filter(Boolean) as string[])),
      WingCode: Array.from(new Set(programmes.map((p) => p.WingCode).filter(Boolean) as string[])),
    };
  }, [programmes]);

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      if (approvalFilter === "approved" && !p.IsApproved) return false;
      if (approvalFilter === "pending" && p.IsApproved) return false;
      if (resultFilter === "resulted" && !p.IsResulted) return false;
      if (resultFilter === "published" && !p.IsResultPublished) return false;
      if (resultFilter === "pending" && (p.IsResulted || p.is_result_required === false)) return false;
      if (resultFilter === "unpublished" && (!p.IsResulted || p.IsResultPublished)) return false;
      if (resultFilter === "no-result-required" && p.is_result_required !== false) return false;
      if (controllerCategoryUuid && p.Category !== controllerCategoryUuid) return false;
      return (
        (!filters.AccademicYear || p.AccademicYear === filters.AccademicYear) &&
        (!filters.Category || p.Category === filters.Category) &&
        (!filters.Group || p.Group === filters.Group) &&
        (!filters.Venue || p.Venue === filters.Venue) &&
        (!filters.WingCode || p.WingCode === filters.WingCode)
      );
    });
  }, [programmes, filters, approvalFilter, resultFilter, controllerCategoryUuid]);

  // --- 1. SINGLE ACTION (Update One By One) ---
  const handleSingleAction = async (
    code: string,
    action: "ToggleApprove" | "ToggleReg" | "ToggleContent" | "ToggleTopic" | "TogglePublish"
  ) => {
    setIsLoading(prev => ({ ...prev, action: true }));
    try {
      const prog = programmes.find(p => p.Program_Code === code);
      if (!prog) return;

      if (action === "ToggleApprove") {
        const newStatus = !prog.IsApproved;
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({ IsApproved: newStatus }).eq('Program_Code', code);
        if (error) throw error;
        showToast(`Programme ${newStatus ? 'Approved' : 'Unapproved'}.`, "success");
      } else if (action === "ToggleReg") {
        const newStatus = !prog.IsOpenRegistration;
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({ IsOpenRegistration: newStatus }).eq('Program_Code', code);
        if (error) throw error;
        showToast(`Registration ${newStatus ? 'Opened' : 'Closed'}.`, "success");
      } else if (action === "ToggleContent") {
        const newStatus = !(prog as any).isContentRequired;
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({ isContentRequired: newStatus }).eq('Program_Code', code);
        if (error) throw error;
        showToast(`Content submission ${newStatus ? 'Activated' : 'Deactivated'}.`, "success");
      } else if (action === "ToggleTopic") {
        const newStatus = !prog.is_topic_required;
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({ is_topic_required: newStatus }).eq('Program_Code', code);
        if (error) throw error;
        showToast(`Topic registration ${newStatus ? 'Activated' : 'Deactivated'}.`, "success");
      } else if (action === "TogglePublish") {
        const newStatus = !prog.IsResultPublished;
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({
          IsResultPublished: newStatus,
          IsResulted: newStatus ? true : prog.IsResulted
        }).eq('Program_Code', code);
        if (error) throw error;
        showToast(`Programme result ${newStatus ? 'Published to Public' : 'Unpublished'}.`, "success");
      }
      await fetchData(); // Refresh data to show updated state
    } catch (error: any) {
      showToast(error.message || "Action failed.", "error");
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  // --- 1.5 SINGLE DELETE PROGRAMME (triggers in-app modal) ---
  const handleSingleDelete = (code: string, title?: string | null) => {
    setDeleteModalState({
      isOpen: true,
      type: "single",
      code,
      title: title || code,
    });
  };

  const handleConfirmDelete = async () => {
    setIsExecutingDelete(true);
    try {
      if (deleteModalState.type === "single" && deleteModalState.code) {
        const code = deleteModalState.code;
        const displayTitle = deleteModalState.title || code;
        await deleteProgrammeCascade(code);
        showToast(`Programme "${displayTitle}" deleted successfully.`, "success");
        setSelectedPrograms(prev => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      } else if (deleteModalState.type === "bulk" && deleteModalState.codes?.length) {
        const codes = deleteModalState.codes;
        await deleteProgrammesBulkCascade(codes);
        showToast(`Successfully deleted ${codes.length} programmes.`, "success");
        setSelectedPrograms(new Set());
      }
      setDeleteModalState({ isOpen: false, type: "single" });
      await fetchData();
    } catch (error: any) {
      showToast(error.message || "Failed to delete programme.", "error");
    } finally {
      setIsExecutingDelete(false);
    }
  };

  // --- 2. BULK ACTION (Update Multiple) ---
  const handleBulkAction = async (action: string) => {
    if (selectedPrograms.size === 0) return;
    
    if (action === "Delete") {
      setDeleteModalState({
        isOpen: true,
        type: "bulk",
        codes: Array.from(selectedPrograms),
      });
      return;
    }

    setIsLoading(prev => ({ ...prev, action: true }));
    try {
      if (action === "ToggleApprove") {
        const toApprove = Array.from(selectedPrograms).filter(code => !programmes.find(p => p.Program_Code === code)?.IsApproved);
        const toUnapprove = Array.from(selectedPrograms).filter(code => programmes.find(p => p.Program_Code === code)?.IsApproved);
        
        const promises = [];
        if (toApprove.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ IsApproved: true }).in('Program_Code', toApprove));
        if (toUnapprove.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ IsApproved: false }).in('Program_Code', toUnapprove));
        
        await Promise.all(promises);
        showToast(`Approval status toggled successfully.`, "success");
      } 
      else if (action === "ToggleReg") {
        const toOpen = Array.from(selectedPrograms).filter(code => !programmes.find(p => p.Program_Code === code)?.IsOpenRegistration);
        const toClose = Array.from(selectedPrograms).filter(code => programmes.find(p => p.Program_Code === code)?.IsOpenRegistration);
        
        const promises = [];
        if (toOpen.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ IsOpenRegistration: true }).in('Program_Code', toOpen));
        if (toClose.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ IsOpenRegistration: false }).in('Program_Code', toClose));
        
        await Promise.all(promises);
        showToast(`Registration status toggled successfully.`, "success");
      }
      else if (action === "ToggleContent") {
        const toEnable = Array.from(selectedPrograms).filter(code => !(programmes.find(p => p.Program_Code === code) as any)?.isContentRequired);
        const toDisable = Array.from(selectedPrograms).filter(code => (programmes.find(p => p.Program_Code === code) as any)?.isContentRequired);
        
        const promises = [];
        if (toEnable.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ isContentRequired: true }).in('Program_Code', toEnable));
        if (toDisable.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ isContentRequired: false }).in('Program_Code', toDisable));
        
        await Promise.all(promises);
        showToast(`Content submission requirement toggled successfully.`, "success");
      }
      else if (action === "ToggleTopic") {
        const toEnable = Array.from(selectedPrograms).filter(code => !programmes.find(p => p.Program_Code === code)?.is_topic_required);
        const toDisable = Array.from(selectedPrograms).filter(code => programmes.find(p => p.Program_Code === code)?.is_topic_required);
        
        const promises = [];
        if (toEnable.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ is_topic_required: true }).in('Program_Code', toEnable));
        if (toDisable.length > 0) promises.push(SupaBaseFunction.from('ProgrammesBox').update({ is_topic_required: false }).in('Program_Code', toDisable));
        
        await Promise.all(promises);
        showToast(`Topic registration requirement toggled successfully.`, "success");
      }
      else if (action === "PublishResults") {
        const toPublish = Array.from(selectedPrograms);
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({
          IsResultPublished: true,
          IsResulted: true
        }).in('Program_Code', toPublish);
        if (error) throw error;
        showToast(`Published results for ${toPublish.length} programmes in one click!`, "success");
      }
      else if (action === "UnpublishResults") {
        const toUnpublish = Array.from(selectedPrograms);
        const { error } = await SupaBaseFunction.from('ProgrammesBox').update({
          IsResultPublished: false
        }).in('Program_Code', toUnpublish);
        if (error) throw error;
        showToast(`Unpublished results for ${toUnpublish.length} programmes.`, "info");
      }
      
      await fetchData();
      setSelectedPrograms(new Set());
    } catch (error: any) {
      showToast(error.message || "Bulk action failed.", "error");
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  // --- EXPORT (Formatted & Resolved Columns - Never Raw UUIDs) ---
  const handleExport = () => {
    setIsLoading(prev => ({ ...prev, export: true }));
    try {
      const dataToExport = selectedPrograms.size > 0 ? filteredProgrammes.filter(p => selectedPrograms.has(p.Program_Code)) : filteredProgrammes;
      if (dataToExport.length === 0) return showToast("No data to export.", "info");

      const exportRows = dataToExport.map((p, idx) => ({
        "Sl No": idx + 1,
        "Program Code": p.Program_Code,
        "Program Title": p.Program_Title || "Untitled",
        "Wing": p.WingCode ? (meta.wingMap[p.WingCode] || p.WingCode) : "General Wing",
        "Category": meta.getCategoryName(p.Category, "General"),
        "Group": meta.getGroupName(p.Group, "Standard"),
        "Venue": meta.getVenueName(p.Venue, "Campus Venue"),
        "Academic Year": p.AccademicYear ? (meta.academicMap[p.AccademicYear] || "Current Cycle") : "Current Cycle",
        "Date": p.Date || "TBA",
        "Format": p.Group ? "Group / Squad" : "Individual",
        "Registrations": p.Total_Registration || 0,
        "Registration Open": p.IsOpenRegistration ? "Open" : "Closed",
        "Conducted": p.IsConducted ? "Yes" : "No",
        "Approved": p.IsApproved ? "Approved" : "Pending",
        "Resulted": p.IsResulted ? "Declared" : "Pending (Points on Hold)",
        "Result Published": p.IsResultPublished ? "Published" : "Unpublished",
        "Description": p.Description || "",
        "Outcomes": p.OutComes || "",
      }));

      exportToExcel(
        exportRows,
        `Programmes_Full_Export_${new Date().toISOString().slice(0, 10)}.xlsx`,
        "Programmes Data"
      );
      showToast(`Exported ${dataToExport.length} rows with resolved facilities.`, "success");
    } catch (error) {
      showToast("Failed to generate Excel export.", "error");
    } finally {
      setIsLoading(prev => ({ ...prev, export: false }));
    }
  };

  // --- IMPORT ---
  const processImportedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(prev => ({ ...prev, import: true }));
    showToast("Reading Excel file...", "info");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawPayload = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rawPayload.length === 0) throw new Error("Excel file is empty.");

        const { data: existingData } = await SupaBaseFunction.from('ProgrammesBox').select('Program_Code');
        const existingCodes = new Set(existingData?.map(d => d.Program_Code) || []);

        const validPayload = rawPayload.filter(row => row.Program_Code && !existingCodes.has(row.Program_Code));
        if (validPayload.length === 0) throw new Error("No new programs to import (all codes exist or are missing).");

        const { error: insertError } = await SupaBaseFunction.from('ProgrammesBox').insert(validPayload);
        if (insertError) throw insertError;

        const wingIncrements: Record<string, { regs: number; points: number }> = {};
        validPayload.forEach(row => {
          if (row.WingCode) {
            if (!wingIncrements[row.WingCode]) {
              wingIncrements[row.WingCode] = { regs: 0, points: 0 };
            }
            wingIncrements[row.WingCode].regs += 1;
            const isNoResult = row.is_result_required === false || row.is_result_required === 'false' || row.is_result_required === 'No';
            if (isNoResult) {
              wingIncrements[row.WingCode].points += 1;
            }
          }
        });

        const updatePromises = Object.entries(wingIncrements).map(async ([wCode, data]) => {
           const wing = wings.find(w => w.WingCode === wCode);
           return SupaBaseFunction.from('Chs-WingS').update({
             Total_Registrations: (wing?.Total_Registrations || 0) + data.regs,
             Total_Points: (Number(wing?.Total_Points) || 0) + data.points,
           }).eq('WingCode', wCode);
        });
        await Promise.all(updatePromises);

        showToast(`Imported ${validPayload.length} new programmes!`, "success");
        await fetchData(); 
      } catch (error: any) {
        showToast(error.message || "Failed to process imported file.", "error");
      } finally {
        setIsLoading(prev => ({ ...prev, import: false }));
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Calendar Math ---
  const programsForSelectedDate = filteredProgrammes.filter((p) => p.Date === selectedDate);
  const today = new Date();
  const calendarDays = Array.from({ length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split("T")[0];
  });

  return (
    <div className="min-h-screen bg-[#f8fcf9] text-gray-800 p-4 md:p-8 font-sans relative">
      
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 transition-all duration-300 font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-900 text-white'}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER & TOP CONTROLS */}
      <div className="max-w-7xl mx-auto mb-4 bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-emerald-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          {isControllerMode && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider mb-1 border border-indigo-200">
              <Layers size={12} />
              <span>Category Jurisdiction</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isControllerMode
              ? `${controllerCategoryName || "Category"} Programmes`
              : "Admin Programmes Directory"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isControllerMode
              ? `Full control over ${controllerCategoryName || "assigned"} category: edit, approve, delete, declare and publish results.`
              : "Full control over programmes and schedules across all academic categories."}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={isControllerMode ? `/controller-panel/${activeUser}/create-program` : `/admin-panel/${activeUser}/create-program`}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
            >
              <span>+ New Programme</span>
            </Link>
            <div className="bg-emerald-50/50 p-1 rounded-xl flex items-center mr-2 border border-emerald-100/50">
              <button onClick={() => setViewMode("cards")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-emerald-600'}`}>Cards</button>
              <button onClick={() => setViewMode("calendar")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-emerald-600'}`}>Calendar</button>
            </div>
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={processImportedFile} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading.import} className="flex items-center justify-center min-w-23 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-70 shadow-sm cursor-pointer">
              {isLoading.import ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : "Import Excel"}
            </button>
            <button
              onClick={() => {
                setSelectedTopicProg(null);
                setIsTopicsManagerOpen(true);
              }}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-100 transition shadow-xs cursor-pointer"
              title="Manage and approve candidate registered topics in Topics_Box"
            >
              <FileText size={14} className="text-indigo-600" />
              <span>Topics Registry</span>
            </button>
            <button onClick={handleExport} disabled={isLoading.export} className="flex items-center justify-center min-w-23 px-4 py-2.5 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition disabled:opacity-70 shadow-sm cursor-pointer">
              {isLoading.export ? <span className="animate-spin h-4 w-4 border-2 border-emerald-700 border-t-transparent rounded-full"></span> : "Export Excel (All)"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-medium"><span className="text-emerald-600 font-bold">Import columns:</span> {IMPORT_COLUMNS.join(", ")}</p>
        </div>
      </div>

      {/* FILTERS & BULK ACTIONS */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {/* Approval Status Filter */}
            <select
              className="text-sm font-bold text-slate-800 border border-emerald-300 rounded-xl bg-white py-2 px-3 shadow-xs focus:ring-2 focus:ring-emerald-500 outline-none transition cursor-pointer hover:bg-emerald-50/50"
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value as any)}
            >
              <option value="all">All Programmes ({programmes.length})</option>
              <option value="approved">✅ Approved ({programmes.filter(p => p.IsApproved).length})</option>
              <option value="pending">⏳ Pending ({programmes.filter(p => !p.IsApproved).length})</option>
            </select>

            {/* Result & Publication Status Filter (Resulted, Published) */}
            <select
              className="text-sm font-bold text-slate-800 border border-purple-300 rounded-xl bg-white py-2 px-3 shadow-xs focus:ring-2 focus:ring-purple-500 outline-none transition cursor-pointer hover:bg-purple-50/50"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as any)}
            >
              <option value="all">All Results Status ({programmes.length})</option>
              <option value="published">📢 Published ({programmes.filter(p => p.IsResultPublished).length})</option>
              <option value="resulted">🏆 Resulted ({programmes.filter(p => p.IsResulted).length})</option>
              <option value="unpublished">🔒 Resulted (Unpublished) ({programmes.filter(p => p.IsResulted && !p.IsResultPublished).length})</option>
              <option value="pending">⏳ Awaiting Result ({programmes.filter(p => !p.IsResulted && p.is_result_required !== false).length})</option>
              <option value="no-result-required">🎯 Direct Wing Pt / No Result Req ({programmes.filter(p => p.is_result_required === false).length})</option>
            </select>

            {(['AccademicYear', 'Category', 'Group', 'Venue', 'WingCode'] as const).map((filterKey) => (
              <select 
                key={filterKey}
                className="text-sm font-medium text-gray-700 border border-emerald-200/60 rounded-xl bg-white py-2 px-3 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer hover:bg-emerald-50/30"
                value={filters[filterKey] || ""}
                onChange={(e) => setFilters({...filters, [filterKey]: e.target.value})}
              >
                <option value="">All {filterKey === 'AccademicYear' ? 'Academic Years' : filterKey === 'Category' ? 'Categories' : filterKey.replace('Code', '') + 's'}</option>
                {uniqueValues[filterKey]?.map(val => (
                  <option key={val} value={val}>
                    {filterKey === 'WingCode' 
                      ? getWingName(val) 
                      : filterKey === 'Venue' 
                        ? getVenueName(val) 
                        : filterKey === 'AccademicYear' 
                          ? getAcademicYearName(val) 
                          : filterKey === 'Category'
                            ? getCategoryName(val)
                            : filterKey === 'Group'
                              ? getGroupName(val)
                              : val}
                  </option>
                ))}
              </select>
            ))}
        </div>

        {/* BULK ACTION DROPDOWN & ONE-CLICK PUBLISH */}
        {viewMode === "cards" && selectedPrograms.size > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm">
             <span className="text-sm font-bold text-emerald-800">{selectedPrograms.size} selected</span>
             
             {/* One Click Publish Button */}
             <button
               type="button"
               disabled={isLoading.action}
               onClick={() => handleBulkAction("PublishResults")}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition"
               title="Publish results for all selected programmes in one click"
             >
               <Award size={14} className="text-yellow-200" />
               <span>Publish in One Click</span>
             </button>

             <select 
                disabled={isLoading.action}
                className="text-sm font-bold border-none text-emerald-900 rounded-lg bg-white py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 shadow-sm"
                onChange={(e) => {
                  if(e.target.value) handleBulkAction(e.target.value);
                  e.target.value = ""; 
                }}
             >
                <option value="">More Bulk Actions...</option>
                <option value="PublishResults">📢 Publish Results (One Click)</option>
                <option value="UnpublishResults">🔒 Unpublish Results</option>
                <option value="ToggleApprove">Toggle Approval</option>
                <option value="ToggleReg">Toggle Registration</option>
                <option value="ToggleContent">Toggle Content Submission</option>
                <option value="ToggleTopic">Toggle Topic Registration</option>
                <option value="Delete">Delete Selected</option>
             </select>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto">
        {isLoading.fetch ? (
          <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProgrammes.map((prog) => {
              const isSelected = selectedPrograms.has(prog.Program_Code);
              const catTitle = getCategoryName(prog.Category);
              const isGroup = Boolean((prog as any).is_group_program);
              const isContentReq = Boolean((prog as any).isContentRequired);

              return (
                <div
                  key={prog.Program_Code}
                  className={`relative flex flex-col bg-white rounded-3xl overflow-hidden transition-all duration-300 group ${
                    isSelected
                      ? "ring-2 ring-emerald-500 shadow-xl border-transparent"
                      : "border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300"
                  }`}
                >
                  {/* MULTIPLE SELECTION CHECKBOX */}
                  <div className="absolute top-3 left-3 z-20 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-md">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer block"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selectedPrograms);
                        if (next.has(prog.Program_Code)) next.delete(prog.Program_Code);
                        else next.add(prog.Program_Code);
                        setSelectedPrograms(next);
                      }}
                    />
                  </div>

                  {/* POSTER BANNER */}
                  <div className="h-52 w-full bg-slate-950 relative overflow-hidden group/img">
                    <SafeImage
                      src={prog.Program_Poster}
                      alt={prog.Program_Title || "Program"}
                      fallbackCategory="programme"
                      fallbackText={prog.Program_Title || prog.Program_Code}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Gradient Overlay for badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

                    {/* Top-Right Status Pills */}
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                          prog.IsApproved
                            ? "bg-emerald-500/90 text-white border-emerald-400/30"
                            : "bg-amber-500/90 text-slate-950 border-amber-300/30"
                        }`}
                      >
                        {prog.IsApproved ? "Approved" : "Pending"}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                          prog.IsOpenRegistration
                            ? "bg-teal-500/90 text-white border-teal-300/30 animate-pulse"
                            : "bg-rose-500/90 text-white border-rose-300/30"
                        }`}
                      >
                        {prog.IsOpenRegistration ? "Reg Open" : "Reg Closed"}
                      </span>
                    </div>

                    {/* Bottom Badges on Image */}
                    <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category Badge */}
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-slate-900/80 text-emerald-300 backdrop-blur-md border border-emerald-500/30 shadow-xs flex items-center gap-1">
                          <Layers size={11} className="text-emerald-400" />
                          {catTitle || "General"}
                        </span>
                        {/* Group Badge */}
                        {prog.Group && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-900/80 text-indigo-200 backdrop-blur-md border border-indigo-400/30 shadow-xs flex items-center gap-1">
                            <Users size={10} className="text-indigo-300" />
                            {getGroupName(prog.Group)}
                          </span>
                        )}
                        {/* Group/Individual format */}
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-xs">
                          {isGroup ? "Squad" : "Individual"}
                        </span>
                      </div>

                      {/* Poster Expand Button */}
                      {prog.Program_Poster && (
                        <button
                          type="button"
                          onClick={() =>
                            setFullscreenPoster({
                              url: prog.Program_Poster!,
                              title: prog.Program_Title || prog.Program_Code,
                            })
                          }
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition shadow-xs cursor-pointer"
                          title="Preview Full Poster"
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CARD BODY */}
                  <div className="p-5 flex flex-col flex-grow bg-white space-y-3.5 relative">
                    {/* Header with Code & Action (...) Dropdown Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          #{prog.Program_Code}
                        </span>
                        {prog.IsResultPublished && (
                          <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Award size={11} /> Results
                          </span>
                        )}
                        {prog.is_result_required === false && (
                          <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1" title="Non-competitive / direct event. +1 Point awarded to Wing on creation.">
                            <CheckCircle2 size={11} /> +1 Wing Pt
                          </span>
                        )}
                        {isContentReq && !prog.IsResultPublished && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FileText size={11} /> Content
                          </span>
                        )}
                      </div>

                      {/* (...) Consolidated Actions Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuProgCode(openMenuProgCode === prog.Program_Code ? null : prog.Program_Code)}
                          className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 hover:border-slate-300 transition cursor-pointer shadow-2xs flex items-center gap-1 text-xs"
                          title="Actions menu"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {/* Dropdown Menu Popup */}
                        {openMenuProgCode === prog.Program_Code && (
                          <div className="absolute right-0 top-9 z-30 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => { setEditingProgram(prog); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-slate-800 transition cursor-pointer"
                            >
                              <Edit3 size={14} className="text-indigo-600" /> Edit Details
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPrintSheetProgram(prog); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-violet-700 transition cursor-pointer"
                            >
                              <Printer size={14} className="text-violet-600" /> Candidate Sheet (A4)
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSelectedTopicProg(prog); setIsTopicsManagerOpen(true); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-indigo-700 transition cursor-pointer"
                            >
                              <FileText size={14} className="text-indigo-600" /> Topics Registry
                            </button>

                            {/* Declare or Edit Result Link */}
                            <Link
                              to={isControllerMode ? `/controller-panel/${activeUser}/create-result?program=${prog.Program_Code}` : `/admin-panel/${activeUser}/create-result?program=${prog.Program_Code}`}
                              onClick={() => setOpenMenuProgCode(null)}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-amber-50 flex items-center gap-2 text-amber-800 transition cursor-pointer font-bold"
                            >
                              <Trophy size={14} className="text-amber-600" />
                              <span>{prog.IsResulted ? "Edit Official Result" : "Declare Official Result"}</span>
                            </Link>

                            {/* Display Result in Dropdown */}
                            {prog.IsResultPublished && (
                              <button
                                type="button"
                                onClick={() => { setResultModalProgram(prog); setOpenMenuProgCode(null); }}
                                className="w-full px-3 py-2 rounded-xl text-left hover:bg-purple-50 flex items-center gap-2 text-purple-800 transition cursor-pointer font-bold"
                              >
                                <Award size={14} className="text-purple-600" /> Display Published Result
                              </button>
                            )}

                            {/* Toggle Result Publication */}
                            <button
                              type="button"
                              disabled={isLoading.action}
                              onClick={() => { handleSingleAction(prog.Program_Code, "TogglePublish"); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-purple-50 flex items-center gap-2 text-purple-800 transition cursor-pointer font-semibold"
                            >
                              <Award size={14} className="text-purple-600" />
                              {prog.IsResultPublished ? "Unpublish Result" : "Publish Result"}
                            </button>

                            {/* Direct Result Editor / Declaration (Admin & Wing Only) */}
                            <Link
                              to={`../create-result?code=${prog.Program_Code}`}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-amber-50 flex items-center gap-2 text-amber-900 transition cursor-pointer font-semibold"
                            >
                              <Trophy size={14} className="text-amber-600" />
                              <span>{prog.IsResulted ? "Edit Result & Points" : "Declare Result"}</span>
                            </Link>

                            {/* Manage Groups / Candidates */}
                            <Link
                              to={`../group-programme-manager`}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-indigo-50 flex items-center gap-2 text-indigo-900 transition cursor-pointer font-semibold"
                            >
                              <Users size={14} className="text-indigo-600" />
                              <span>Group & Candidate Hub</span>
                            </Link>
                            
                            <div className="h-px bg-slate-100 my-1" />
                            
                            <button
                              type="button"
                              disabled={isLoading.action}
                              onClick={() => { handleSingleAction(prog.Program_Code, "ToggleApprove"); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-emerald-800 transition cursor-pointer"
                            >
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              {prog.IsApproved ? "Mark as Pending" : "Approve Programme"}
                            </button>
                            <button
                              type="button"
                              disabled={isLoading.action}
                              onClick={() => { handleSingleAction(prog.Program_Code, "ToggleReg"); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-teal-800 transition cursor-pointer"
                            >
                              <Clock size={14} className="text-teal-600" />
                              {prog.IsOpenRegistration ? "Close Registration" : "Open Registration"}
                            </button>
                            <button
                              type="button"
                              disabled={isLoading.action}
                              onClick={() => { handleSingleAction(prog.Program_Code, "ToggleContent"); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-amber-800 transition cursor-pointer"
                            >
                              <FileText size={14} className="text-amber-600" />
                              Content: {(prog as any).isContentRequired ? "Disable (ON)" : "Enable (OFF)"}
                            </button>
                            <button
                              type="button"
                              disabled={isLoading.action}
                              onClick={() => { handleSingleAction(prog.Program_Code, "ToggleTopic"); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 flex items-center gap-2 text-indigo-800 transition cursor-pointer"
                            >
                              <Layers size={14} className="text-indigo-600" />
                              Topic: {prog.is_topic_required ? "Disable (ON)" : "Enable (OFF)"}
                            </button>
                            
                            <div className="h-px bg-slate-100 my-1" />
                            
                            <button
                              type="button"
                              disabled={isLoading.action}
                              onClick={() => { handleSingleDelete(prog.Program_Code, prog.Program_Title); setOpenMenuProgCode(null); }}
                              className="w-full px-3 py-2 rounded-xl text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 size={14} /> Delete Programme
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Programme Title */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {prog.Program_Title || "Untitled Programme"}
                      </h3>
                    </div>

                    {/* Programme Details Card: WingName, Date, Venue */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {/* Wing Name */}
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs text-slate-500 font-bold shrink-0">Wing:</span>
                        <span className="text-xs font-bold text-slate-800 truncate">{getWingName(prog.WingCode)}</span>
                      </div>

                      {/* Date & Venue Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60 truncate" title={prog.Date || "TBA"}>
                          <Calendar size={13} className="text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Date</span>
                            <span className="font-bold text-slate-700 truncate">{prog.Date || "TBA"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60 truncate" title={getVenueName(prog.Venue)}>
                          <MapPin size={13} className="text-rose-500 shrink-0" />
                          <div className="truncate">
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Venue</span>
                            <span className="font-bold text-slate-700 truncate">{getVenueName(prog.Venue)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Registration Stats & Year Counter */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <Link
                          to={`../candidate-registration/${prog.Program_Code}`}
                          className="flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 font-extrabold hover:underline"
                          title="Manage registered candidates & assign other candidates"
                        >
                          <Users size={13} className="text-indigo-600" />
                          <span>{prog.Total_Registration || 0} Registered</span>
                          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Manage
                          </span>
                        </Link>
                        {prog.AccademicYear && (
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                            {getAcademicYearName(prog.AccademicYear)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* IF RESULT PUBLISHED, PROMINENT BUTTON TO DISPLAY THE RESULT */}
                    {prog.IsResultPublished && (
                      <button
                        type="button"
                        onClick={() => setResultModalProgram(prog)}
                        className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
                        title="Display official published competition result with podium, winners, and grades"
                      >
                        <Trophy size={15} className="text-yellow-200" />
                        <span>Display Result</span>
                      </button>
                    )}

                    {/* ACTION BUTTONS (CANDIDATES, EDIT & SHEET) */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-auto">
                      <Link
                        to={`../candidate-registration/${prog.Program_Code}`}
                        className="py-2 px-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition flex items-center justify-center gap-1 shadow-2xs"
                        title="Assign and manage candidates"
                      >
                        <UserPlus size={13} /> Candidates
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingProgram(prog)}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintSheetProgram(prog)}
                        className="py-2 px-2.5 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Print Official A4 Candidate Attendance & Evaluation Sheet"
                      >
                        <Printer size={13} /> Sheet
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* CALENDAR VIEW */
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-2/3 bg-white rounded-3xl shadow-sm border border-emerald-100 p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-8">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <div className="grid grid-cols-7 gap-3 lg:gap-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-black uppercase tracking-widest text-emerald-400 pb-2">{day}</div>
                ))}
                
                {calendarDays.map((dateString) => {
                  const dayPrograms = filteredProgrammes.filter(p => p.Date === dateString);
                  const isSelected = selectedDate === dateString;
                  const hasEvents = dayPrograms.length > 0;
                  
                  return (
                    <div key={dateString} onClick={() => setSelectedDate(dateString)} className={`min-h-25 p-3 rounded-2xl border-2 transition-all flex flex-col cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : hasEvents ? 'border-emerald-100 bg-white hover:border-emerald-300' : 'border-transparent bg-gray-50/50 hover:bg-gray-100'}`}>
                      <span className={`text-sm font-black ${isSelected ? 'text-emerald-700' : hasEvents ? 'text-gray-900' : 'text-gray-400'}`}>{new Date(dateString).getDate()}</span>
                      {hasEvents && (
                        <div className="mt-auto flex flex-col gap-1">
                          <span className="inline-flex w-full justify-center px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold truncate shadow-sm">
                            {dayPrograms.length} Event{dayPrograms.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full lg:w-1/3 bg-white rounded-3xl shadow-sm border border-emerald-100 p-8 min-h-125">
              <h3 className="text-xl font-black text-gray-900 pb-4 border-b-2 border-emerald-50 mb-6">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <div className="space-y-4">
                {programsForSelectedDate.length > 0 ? (
                  programsForSelectedDate.map((prog) => (
                    <div key={prog.Program_Code} className="p-5 rounded-2xl border-2 border-emerald-50 bg-white shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-bold text-gray-900 leading-tight">{prog.Program_Title}</h4>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-3"><span className="w-12 font-bold text-emerald-400 text-[10px] uppercase tracking-widest">Wing</span><span className="font-semibold text-gray-800 text-xs">{getWingName(prog.WingCode)}</span></div>
                        <div className="flex items-center gap-3"><span className="w-12 font-bold text-emerald-400 text-[10px] uppercase tracking-widest">Venue</span><span className="font-semibold text-gray-800 text-xs">{prog.Venue || 'TBA'}</span></div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {prog.IsResultPublished && (
                          <button
                            type="button"
                            onClick={() => setResultModalProgram(prog)}
                            className="py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            title="Display published result"
                          >
                            <Trophy size={12} className="text-yellow-200" /> Display Result
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingProgram(prog)}
                          className="py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={12} /> Edit Info
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintSheetProgram(prog)}
                          className="py-1.5 px-3 rounded-lg text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Print Candidate Sheet"
                        >
                          <Printer size={12} /> Sheet (A4)
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 px-4 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-100"><p className="text-emerald-700/60 font-bold">No events scheduled on this day.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Print Candidate Sheet Modal (A4) */}
        <PrintCandidateSheetModal
          isOpen={Boolean(printSheetProgram)}
          programCode={printSheetProgram?.Program_Code || ""}
          initialProgramTitle={printSheetProgram?.Program_Title || ""}
          onClose={() => setPrintSheetProgram(null)}
        />

        {/* Programme Result Display Modal */}
        {resultModalProgram && (
          <ProgrammeResultModal
            isOpen={Boolean(resultModalProgram)}
            onClose={() => setResultModalProgram(null)}
            programCode={resultModalProgram.Program_Code}
            programTitle={resultModalProgram.Program_Title}
            programDate={resultModalProgram.Date}
            programVenue={resultModalProgram.Venue}
            programPoster={resultModalProgram.Program_Poster}
            wingCode={resultModalProgram.WingCode}
          />
        )}

        {/* Edit Programme Modal */}
        <EditProgrammeModal
          isOpen={Boolean(editingProgram)}
          program={editingProgram}
          wings={wings}
          onClose={() => setEditingProgram(null)}
          onSuccess={() => {
            showToast("Programme details updated successfully!", "success");
            fetchData();
          }}
        />

        {/* Fullscreen Poster Modal */}
        {fullscreenPoster && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setFullscreenPoster(null)}
          >
            <button
              type="button"
              onClick={() => setFullscreenPoster(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="max-w-2xl max-h-[85vh] p-2 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <img
                src={fullscreenPoster.url}
                alt={fullscreenPoster.title}
                className="w-full h-auto max-h-[75vh] object-contain rounded-2xl"
              />
              <div className="p-3 text-center">
                <p className="font-bold text-slate-800 text-sm truncate">{fullscreenPoster.title}</p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Topics Registry Manager Modal (Topics_Box) */}
        <AdminTopicsManagerModal
          isOpen={isTopicsManagerOpen}
          onClose={() => setIsTopicsManagerOpen(false)}
          programCode={selectedTopicProg?.Program_Code}
          programTitle={selectedTopicProg?.Program_Title || undefined}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={deleteModalState.isOpen}
          title={deleteModalState.type === "bulk" ? `Delete ${deleteModalState.codes?.length || 0} Programmes?` : "Delete Programme?"}
          message={
            deleteModalState.type === "bulk"
              ? `Are you sure you want to permanently remove all ${deleteModalState.codes?.length || 0} selected programmes? This will remove the events along with all candidate registrations, results, feedback, and student submissions.`
              : `Are you sure you want to permanently delete programme "${deleteModalState.title}" (${deleteModalState.code})? All associated candidate registrations, results, and submissions will also be removed.`
          }
          itemDescription={
            deleteModalState.type === "bulk"
              ? `Selected: ${(deleteModalState.codes || []).slice(0, 4).join(", ")}${(deleteModalState.codes?.length || 0) > 4 ? ` (+${(deleteModalState.codes?.length || 0) - 4} more)` : ""}`
              : `Code: ${deleteModalState.code || ""}`
          }
          confirmText="Yes, Permanently Delete"
          isDeleting={isExecutingDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteModalState({ isOpen: false, type: "single" })}
        />
      </div>
    </div>
  );
}

// checking start here 
