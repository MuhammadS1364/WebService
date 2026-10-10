import React, { useState, useEffect, useMemo, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import * as XLSX from "xlsx"; 
import EditProgrammeModal from "./EditProgrammeModal";
import SafeImage from "../../lib/SafeImage";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import ExcelUuidReferenceModal from "../../components/ExcelUuidReferenceModal";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import {
  deleteProgrammeCascade,
  deleteProgrammesBulkCascade,
} from "../../lib/cascadeDeleteService";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import AdminTopicsManagerModal from "../../components/AdminTopicsManagerModal";
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
  Key,
  Printer,
  Trash2,
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
}

export interface Wing {
  WingCode: string;
  WingTitle: string | null;
  Total_Registrations: number;
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

export default function AdminProgrammesList() {
  const meta = useProgrammeMeta();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingProgram, setEditingProgram] = useState<Programme | null>(null);
  const [printSheetProgram, setPrintSheetProgram] = useState<Programme | null>(null);
  const [fullscreenPoster, setFullscreenPoster] = useState<{ url: string; title: string } | null>(null);
  const [isUuidModalOpen, setIsUuidModalOpen] = useState(false);
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
    AccademicYear: "", Category: "", Group: "", Venue: "", WingCode: "",
  });

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
      return (
        (!filters.AccademicYear || p.AccademicYear === filters.AccademicYear) &&
        (!filters.Category || p.Category === filters.Category) &&
        (!filters.Group || p.Group === filters.Group) &&
        (!filters.Venue || p.Venue === filters.Venue) &&
        (!filters.WingCode || p.WingCode === filters.WingCode)
      );
    });
  }, [programmes, filters]);

  // --- 1. SINGLE ACTION (Update One By One) ---
  const handleSingleAction = async (code: string, action: "ToggleApprove" | "ToggleReg") => {
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
      
      await fetchData();
      setSelectedPrograms(new Set());
    } catch (error: any) {
      showToast(error.message || "Bulk action failed.", "error");
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  // --- EXPORT (Full Columns) ---
  const handleExport = () => {
    setIsLoading(prev => ({ ...prev, export: true }));
    try {
      const dataToExport = selectedPrograms.size > 0 ? filteredProgrammes.filter(p => selectedPrograms.has(p.Program_Code)) : filteredProgrammes;
      if (dataToExport.length === 0) return showToast("No data to export.", "info");

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Programmes Data");
      XLSX.writeFile(workbook, `Programmes_Full_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
      showToast(`Exported ${dataToExport.length} rows.`, "success");
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

        const wingIncrements: Record<string, number> = {};
        validPayload.forEach(row => {
          if (row.WingCode) wingIncrements[row.WingCode] = (wingIncrements[row.WingCode] || 0) + 1;
        });

        const updatePromises = Object.entries(wingIncrements).map(async ([wCode, amount]) => {
           const wing = wings.find(w => w.WingCode === wCode);
           return SupaBaseFunction.from('Chs-WingS').update({ Total_Registrations: (wing?.Total_Registrations || 0) + amount }).eq('WingCode', wCode);
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Full control over programmes and schedules.</p>
        </div>
        
        <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-emerald-50/50 p-1 rounded-xl flex items-center mr-2 border border-emerald-100/50">
              <button onClick={() => setViewMode("cards")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-emerald-600'}`}>Cards</button>
              <button onClick={() => setViewMode("calendar")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-emerald-600'}`}>Calendar</button>
            </div>
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={processImportedFile} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading.import} className="flex items-center justify-center min-w-23 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-70 shadow-sm cursor-pointer">
              {isLoading.import ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : "Import Excel"}
            </button>
            <button onClick={() => setIsUuidModalOpen(true)} type="button" className="flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-purple-100 transition shadow-xs cursor-pointer" title="View copyable UUIDs for Classes & Categories for Excel import">
              <Key size={14} className="text-purple-600" />
              <span>Reference UUIDs</span>
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

        {/* BULK ACTION DROPDOWN */}
        {viewMode === "cards" && selectedPrograms.size > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm">
             <span className="text-sm font-bold text-emerald-800">{selectedPrograms.size} selected</span>
             <select 
                disabled={isLoading.action}
                className="text-sm font-bold border-none text-emerald-900 rounded-lg bg-white py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 shadow-sm"
                onChange={(e) => {
                  if(e.target.value) handleBulkAction(e.target.value);
                  e.target.value = ""; 
                }}
             >
                <option value="">Bulk Actions...</option>
                <option value="ToggleApprove">Toggle Approval</option>
                <option value="ToggleReg">Toggle Registration</option>
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
                  <div className="p-5 flex flex-col flex-grow bg-white space-y-3.5">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          #{prog.Program_Code}
                        </span>
                        {prog.IsResultPublished && (
                          <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Award size={11} /> Results Published
                          </span>
                        )}
                        {isContentReq && !prog.IsResultPublished && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FileText size={11} /> Content Req
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {prog.Program_Title || "Untitled Programme"}
                      </h3>
                    </div>

                    {/* Metadata Details */}
                    <div className="space-y-2 text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{getWingName(prog.WingCode)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{prog.Date || "TBA"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{getVenueName(prog.Venue)}</span>
                        </div>
                      </div>

                      {/* Registration Stats Counter */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                          <Users size={13} className="text-indigo-600" />
                          <span>{prog.Total_Registration || 0} Registered</span>
                        </div>
                        {prog.AccademicYear && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {getAcademicYearName(prog.AccademicYear)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* EDIT & STATUS ACTION BUTTONS */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-auto">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProgram(prog)}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Edit3 size={13} /> Edit Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintSheetProgram(prog)}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Print Official A4 Candidate Attendance & Evaluation Sheet"
                        >
                          <Printer size={13} /> Sheet (A4)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopicProg(prog);
                            setIsTopicsManagerOpen(true);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer ${
                            prog.is_topic_required
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                          }`}
                          title="View & Approve Registered Topics (Topics_Box)"
                        >
                          <FileText size={13} /> Topics
                        </button>
                        <button
                          type="button"
                          disabled={isLoading.action}
                          onClick={() => handleSingleDelete(prog.Program_Code, prog.Program_Title)}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition flex items-center justify-center shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Permanently Delete Programme"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          disabled={isLoading.action}
                          onClick={() => handleSingleAction(prog.Program_Code, "ToggleApprove")}
                          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold border transition disabled:opacity-50 cursor-pointer text-center ${
                            prog.IsApproved
                              ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          }`}
                        >
                          {prog.IsApproved ? "Mark Pending" : "Approve Now"}
                        </button>
                        <button
                          disabled={isLoading.action}
                          onClick={() => handleSingleAction(prog.Program_Code, "ToggleReg")}
                          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition disabled:opacity-50 cursor-pointer text-center ${
                            prog.IsOpenRegistration
                              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                              : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                          }`}
                        >
                          {prog.IsOpenRegistration ? "Close Reg" : "Open Reg"}
                        </button>
                      </div>
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
                      <div className="flex items-center gap-2 mt-2">
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
        {/* Excel UUID Reference Helper Modal */}
        <ExcelUuidReferenceModal
          isOpen={isUuidModalOpen}
          onClose={() => setIsUuidModalOpen(false)}
        />

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
