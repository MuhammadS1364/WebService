import React, { useState, useEffect, useMemo, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import * as XLSX from "xlsx"; 

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
  "Venue", "Category", "Group", "AccademicYear", "Program_Poster","Total_Registration","IsResulted"
];

const DEFAULT_POSTER = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";

export default function AdminProgrammesList() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  const [isLoading, setIsLoading] = useState({ fetch: true, import: false, export: false, action: false });
  const [toast, setToast] = useState<ToastState | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    AccademicYear: "", Group: "", Venue: "", WingCode: "",
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

  const getWingName = (wingCode: string | null): string => {
    if (!wingCode) return "Unknown Wing";
    const wing = wings.find((w) => w.WingCode === wingCode);
    return wing?.WingTitle || wingCode;
  };

  const uniqueValues = useMemo(() => {
    return {
      AccademicYear: Array.from(new Set(programmes.map((p) => p.AccademicYear).filter(Boolean))) as string[],
      Group: Array.from(new Set(programmes.map((p) => p.Group).filter(Boolean))) as string[],
      Venue: Array.from(new Set(programmes.map((p) => p.Venue).filter(Boolean))) as string[],
      WingCode: Array.from(new Set(programmes.map((p) => p.WingCode).filter(Boolean))) as string[],
    };
  }, [programmes]);

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      return (
        (!filters.AccademicYear || p.AccademicYear === filters.AccademicYear) &&
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

  // --- 2. BULK ACTION (Update Multiple) ---
  const handleBulkAction = async (action: string) => {
    if (selectedPrograms.size === 0) return;
    setIsLoading(prev => ({ ...prev, action: true }));
    
    try {
      if (action === "Delete" && window.confirm(`Permanently delete ${selectedPrograms.size} programs?`)) {
        const codes = Array.from(selectedPrograms);
        const { error } = await SupaBaseFunction.from('ProgrammesBox').delete().in('Program_Code', codes);
        if (error) throw error;
        showToast(`Successfully deleted programs.`, "success");
      } 
      else if (action === "ToggleApprove") {
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
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading.import} className="flex items-center justify-center min-w-[110px] px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-70 shadow-sm">
              {isLoading.import ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : "Import Excel"}
            </button>
            <button onClick={handleExport} disabled={isLoading.export} className="flex items-center justify-center min-w-[110px] px-4 py-2.5 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition disabled:opacity-70 shadow-sm">
              {isLoading.export ? <span className="animate-spin h-4 w-4 border-2 border-emerald-700 border-t-transparent rounded-full"></span> : "Export Excel (All)"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-medium"><span className="text-emerald-600 font-bold">Import columns:</span> {IMPORT_COLUMNS.join(", ")}</p>
        </div>
      </div>

      {/* FILTERS & BULK ACTIONS */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {(['AccademicYear', 'Group', 'Venue', 'WingCode'] as const).map((filterKey) => (
              <select 
                key={filterKey}
                className="text-sm font-medium text-gray-700 border border-emerald-200/60 rounded-xl bg-white py-2 px-3 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer hover:bg-emerald-50/30"
                value={filters[filterKey]}
                onChange={(e) => setFilters({...filters, [filterKey]: e.target.value})}
              >
                <option value="">All {filterKey.replace('Code', '')}s</option>
                {uniqueValues[filterKey].map(val => (
                  <option key={val} value={val}>{filterKey === 'WingCode' ? getWingName(val) : val}</option>
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
              return (
                <div key={prog.Program_Code} className={`relative flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-200 ${isSelected ? 'ring-2 ring-emerald-500 shadow-md' : 'border border-emerald-100 shadow-sm hover:shadow-md'}`}>
                  
                  {/* MULTIPLE SELECTION CHECKBOX */}
                  <div className="absolute top-3 left-3 z-10 bg-white/80 p-1.5 rounded-lg backdrop-blur-sm shadow-sm">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-emerald-600 cursor-pointer" checked={isSelected} onChange={() => {
                        const next = new Set(selectedPrograms);
                        if (next.has(prog.Program_Code)) next.delete(prog.Program_Code); else next.add(prog.Program_Code);
                        setSelectedPrograms(next);
                      }}
                    />
                  </div>

                  <div className="h-48 w-full bg-emerald-50 relative">
                    <img src={prog.Program_Poster || DEFAULT_POSTER} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_POSTER; }} />
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase shadow-sm ${prog.IsApproved ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-white'}`}>{prog.IsApproved ? "Approved" : "Pending"}</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase shadow-sm ${prog.IsOpenRegistration ? 'bg-white text-emerald-800' : 'bg-red-500 text-white'}`}>{prog.IsOpenRegistration ? 'Reg Open' : 'Reg Closed'}</span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{prog.Program_Title}</h3>
                    <p className="text-xs text-emerald-600 font-mono mt-1 mb-4 font-semibold">{prog.Program_Code}</p>
                    
                    <div className="mt-auto space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-700 font-semibold"><span className="truncate">{getWingName(prog.WingCode)}</span></div>
                      <div className="flex items-center gap-2 text-gray-600 font-medium"><span>{prog.Date || "TBA"}</span> | <span>{prog.Venue || "TBA"}</span></div>
                    </div>
                    
                    {/* ONE-BY-ONE STATUS UPDATE BUTTONS */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button 
                        disabled={isLoading.action}
                        onClick={() => handleSingleAction(prog.Program_Code, "ToggleApprove")}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50"
                      >
                        {prog.IsApproved ? "Mark Pending" : "Approve Now"}
                      </button>
                      <button 
                        disabled={isLoading.action}
                        onClick={() => handleSingleAction(prog.Program_Code, "ToggleReg")}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 ${prog.IsOpenRegistration ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                      >
                        {prog.IsOpenRegistration ? "Close Reg" : "Open Reg"}
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
                    <div key={dateString} onClick={() => setSelectedDate(dateString)} className={`min-h-[100px] p-3 rounded-2xl border-2 transition-all flex flex-col cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : hasEvents ? 'border-emerald-100 bg-white hover:border-emerald-300' : 'border-transparent bg-gray-50/50 hover:bg-gray-100'}`}>
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

            <div className="w-full lg:w-1/3 bg-white rounded-3xl shadow-sm border border-emerald-100 p-8 min-h-[500px]">
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
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 px-4 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-100"><p className="text-emerald-700/60 font-bold">No events scheduled on this day.</p></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}