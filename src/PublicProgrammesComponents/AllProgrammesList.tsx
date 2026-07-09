

import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";

export interface Programme {
  Program_Title: string | null;
  Program_Code: string;
  WingCode: string | null;
  Date: string | null;
  Venue: string | null;
  Group: string | null;
  IsApproved: boolean;
  IsOpenRegistration: boolean;
  Program_Poster: string | null;
  AccademicYear: string | null;
}

export interface Wing {
  WingCode: string;
  WingTitle: string | null;
}

type ViewMode = "cards" | "calendar";

const DEFAULT_POSTER = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";

export default function PublicProgrammesList() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({
    AccademicYear: "", Group: "", Venue: "", WingCode: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // For the public side, only fetch Approved programmes
      const { data: progData } = await SupaBaseFunction.from("ProgrammesBox").select("*").eq('IsApproved', true).order("Date", { ascending: false });
      const { data: wingData } = await SupaBaseFunction.from("Chs-WingS").select("WingCode, WingTitle");

      if (progData) setProgrammes(progData as Programme[]);
      if (wingData) setWings(wingData as Wing[]);
    } catch (error) {
      console.error("Failed to load public data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWingName = (wingCode: string | null): string => {
    const wing = wings.find((w) => w.WingCode === wingCode);
    return wing?.WingTitle || wingCode || "Unknown Wing";
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

  const programsForSelectedDate = filteredProgrammes.filter((p) => p.Date === selectedDate);
  const today = new Date();
  const calendarDays = Array.from({ length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split("T")[0];
  });

  return (
    <div className="min-h-screen bg-[#f8fcf9] text-gray-800 p-4 md:p-8 font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="mx-auto mb-6 bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
          <p className="text-sm text-gray-500 mt-1">Explore upcoming association activities and programmes.</p>
        </div>
        
        <div className="bg-emerald-50/50 p-1 rounded-xl flex items-center border border-emerald-100/50">
          <button onClick={() => setViewMode("cards")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-emerald-600'}`}>Cards</button>
          <button onClick={() => setViewMode("calendar")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-emerald-600'}`}>Calendar</button>
        </div>
      </div>

      {/* PUBLIC FILTERS */}
      <div className="mx-auto mb-8 flex flex-wrap gap-3 items-center">
        {(['AccademicYear', 'Group', 'Venue', 'WingCode'] as const).map((filterKey) => (
          <select 
            key={filterKey}
            className="text-sm font-medium text-gray-700 border border-emerald-200/60 rounded-xl bg-white py-2 px-4 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none hover:bg-emerald-50/30 cursor-pointer"
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

      {/* MAIN CONTENT AREA */}
      <div className="mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
        ) : viewMode === "cards" ? (
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProgrammes.map((prog) => (
              <div key={prog.Program_Code} className="relative flex flex-col bg-white rounded-2xl overflow-hidden border border-emerald-100 shadow-sm hover:shadow-md transition-all">
                <div className="h-48 w-full bg-emerald-50 relative">
                  <img src={prog.Program_Poster || DEFAULT_POSTER} className="w-full h-full object-cover" alt="Poster" />
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                    {/* <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase shadow-sm ${prog.IsOpenRegistration ? 'bg-white/90 text-emerald-800' : 'bg-red-500/90 text-white'}`}>
                      {prog.IsOpenRegistration ? 'Reg Open' : 'Closed'}
                    </span> */}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{prog.Program_Title}</h3>
                  <div className="mt-auto space-y-2 text-sm pt-4">
                    <div className="text-gray-700 font-semibold truncate">{getWingName(prog.WingCode)}</div>
                    <div className="text-gray-500 font-medium">{prog.Date || "TBA"} • {prog.Venue || "TBA"}</div>
                  </div>
                </div>
              </div>
            ))}
            {filteredProgrammes.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-emerald-100"><p className="text-gray-400 font-semibold text-lg">No events match your criteria.</p></div>
            )}
          </div>

        ) : (
          
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
                    <div key={dateString} onClick={() => setSelectedDate(dateString)} className={`min-h-25 p-3 rounded-2xl border-2 transition-all flex flex-col cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : hasEvents ? 'border-emerald-100 bg-white hover:border-emerald-300' : 'border-transparent bg-gray-50/50 hover:bg-gray-100'}`}>
                      <span className={`text-sm font-black ${isSelected ? 'text-emerald-700' : hasEvents ? 'text-gray-900' : 'text-gray-400'}`}>{new Date(dateString).getDate()}</span>
                      {hasEvents && (
                        <div className="mt-auto flex flex-col gap-1">
                          <span className="inline-flex w-full justify-center px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold truncate">
                            {dayPrograms.length} Event{dayPrograms.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="max-w-95 lg:w-1/3 bg-white rounded-3xl shadow-sm border border-emerald-100 p-5 min-h-125">
              <h3 className="text-xl font-black text-gray-900 pb-4 border-b-2 border-emerald-50 mb-6">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <div className="space-y-4">
                {programsForSelectedDate.length > 0 ? (
                  programsForSelectedDate.map((prog) => (
                    <div key={prog.Program_Code} className="p-5 w-80 h-65 rounded-2xl border-2 border-emerald-50 bg-white hover:border-emerald-200 transition-all flex flex-col gap-3">
                      <div className="h-40 w-full bg-gray-100 rounded-lg overflow-hidden"><img src={prog.Program_Poster || DEFAULT_POSTER} className="w-full h-full object-cover" alt="Poster"/></div>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900">{prog.Program_Title}</h4>
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${prog.IsOpenRegistration ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{prog.IsOpenRegistration ? 'Open' : 'Closed'}</span>
                        </div>
                        <div className="text-xs text-gray-600 font-semibold">{getWingName(prog.WingCode)} | {prog.Venue || 'TBA'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 px-4 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-100"><p className="text-emerald-700/60 font-bold">No events today.</p></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}