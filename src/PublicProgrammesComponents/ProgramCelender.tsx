import { useState, useEffect, useMemo } from "react";
// Ensure this is your properly initialized Supabase client:
// export const supabase = createClient(URL, KEY);
import { SupaBaseFunction } from "../lib/SupaBase";

interface DateItem {
  dayNumber: number;
  weekdayShort: string;
  fullDateString: string; // YYYY-MM-DD
  currentMonth: boolean;
  isToday?: boolean;
}

interface ProgrammeBoxItem {
  Program_Title: string | null;
  Program_Code: string; // Primary Key
  WingName: string | null;
  WingTitle?: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null; // YYYY-MM-DD format
  Venue: string | null;
  Category: string | null;
  Group: string | null;
  IsApproved: boolean;
  IsResulted: boolean;
  IsResultPublished: boolean;
  Total_Registration: number;
  IsOpenRegistration: boolean;
  Program_Poster: string;
}

// --- HELPER: TIMEZONE-SAFE DATE FORMATTER ---
const formatToLocalYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ProgrammesCalendar() {
  const [viewMode, setViewMode] = useState<"mini" | "full">("full");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [programmes, setProgrammes] = useState<ProgrammeBoxItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const todayString = useMemo(() => formatToLocalYMD(new Date()), []);

  // --- SUPABASE DATA PIPELINE ---
  useEffect(() => {
    async function fetchProgrammes() {
      setIsLoading(true);
      try {
        const targetDateStr = formatToLocalYMD(selectedDate);

        // 1. Fetch Programmes
        const { data: programmesData, error: progError } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*")
          .eq("Date", targetDateStr);

        if (progError) throw progError;
        if (!programmesData || programmesData.length === 0) {
          setProgrammes([]);
          return;
        }

        // 2. Extract unique WingCodes
        const wingCodes = [...new Set(programmesData.map((p: any) => p.WingCode).filter(Boolean))];

        // 3. Fetch matching Wings
        let wingsData: any[] = [];
        if (wingCodes.length > 0) {
          const { data: wData, error: wingError } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("WingCode, WingTitle, WingEmail")
            .in("WingCode", wingCodes);

          if (wingError) throw wingError;
          wingsData = wData || [];
        }

        // 4. Merge data
        const mergedData = programmesData.map((prog: any) => {
          const matchedWing = wingsData.find(w => w.WingCode === prog.WingCode);
          return {
            ...prog,
            WingTitle: matchedWing ? matchedWing.WingTitle : null,
          };
        });

        setProgrammes(mergedData);
      } catch (err) {
        console.error("Supabase engine error fetching programmes:", err);
        setProgrammes([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgrammes();
  }, [selectedDate]);

  // --- TIMELINE CONTROLLER FORMATTERS ---
  const getFormattedMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getFormattedDateLong = (date: Date) => {
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
  };

  const getFormattedStripHeader = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  };

  const handlePrevDate = () => {
    const prev = new Date(selectedDate);
    if (viewMode === "mini") {
      prev.setDate(prev.getDate() - 1);
    } else {
      prev.setMonth(prev.getMonth() - 1);
    }
    setSelectedDate(prev);
  };

  const handleNextDate = () => {
    const next = new Date(selectedDate);
    if (viewMode === "mini") {
      next.setDate(next.getDate() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setSelectedDate(next);
  };

  // --- DYNAMIC GRID & STRIP MATRICES ---
  const timelineStripDays = useMemo((): DateItem[] => {
    const days: DateItem[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      const fullDateString = formatToLocalYMD(d);
      days.push({
        dayNumber: d.getDate(),
        weekdayShort: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        fullDateString,
        currentMonth: true,
        isToday: fullDateString === todayString
      });
    }
    return days;
  }, [selectedDate, todayString]);

  const dynamicGridDays = useMemo((): DateItem[] => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const matrix: DateItem[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = totalDaysInPrevMonth - i;
      const d = new Date(year, month - 1, prevDay);
      matrix.push({
        dayNumber: prevDay,
        weekdayShort: "",
        currentMonth: false,
        fullDateString: formatToLocalYMD(d),
      });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const fullDateString = formatToLocalYMD(d);
      matrix.push({
        dayNumber: day,
        weekdayShort: "",
        currentMonth: true,
        fullDateString,
        isToday: fullDateString === todayString,
      });
    }

    const remainingCells = 42 - matrix.length;
    for (let day = 1; day <= remainingCells; day++) {
      const d = new Date(year, month + 1, day);
      matrix.push({
        dayNumber: day,
        weekdayShort: "",
        currentMonth: false,
        fullDateString: formatToLocalYMD(d),
      });
    }

    return matrix;
  }, [selectedDate, todayString]);

  return (
    <div className="mx-auto space-y-8 text-slate-800 antialiased sm:p-8 font-sans">
      
      {/* Top Controls Layout */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div className="space-y-1">
          <h3 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
            Programme Schedule
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Discover and manage upcoming events
          </p>
        </div>

        <div className="flex rounded-full bg-slate-100/80 p-1.5 self-start sm:self-auto shadow-sm border border-slate-200/50">
          <button
            onClick={() => setViewMode("mini")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 ${
              viewMode === "mini" 
                ? "bg-white text-indigo-600 shadow-md ring-1 ring-black/5" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            Timeline View
          </button>
          <button
            onClick={() => setViewMode("full")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 ${
              viewMode === "full" 
                ? "bg-white text-indigo-600 shadow-md ring-1 ring-black/5" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            Month Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* INTERACTION CALENDAR CONTROL SECTION */}
        <div className="lg:col-span-4 rounded-3xl border border-white/40 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl min-h-[380px] flex flex-col justify-between">
          
          {viewMode === "mini" && (
            <div className="space-y-6 my-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Date Selector</h4>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevDate} className="p-2 rounded-xl border border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-bold text-slate-800 px-1 min-w-[130px] text-center">
                    {getFormattedStripHeader(selectedDate)}
                  </span>
                  <button onClick={handleNextDate} className="p-2 rounded-xl border border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {timelineStripDays.map((item) => {
                  const isSelected = formatToLocalYMD(selectedDate) === item.fullDateString;
                  return (
                    <button
                      key={`strip-${item.fullDateString}`}
                      onClick={() => setSelectedDate(new Date(item.fullDateString + "T00:00:00"))}
                      className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all duration-300 ${
                        isSelected
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 scale-105"
                          : item.isToday
                            ? "bg-indigo-50/50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100/50"
                            : "bg-transparent border border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                        {item.weekdayShort}
                      </span>
                      <span className="text-base font-bold">{item.dayNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "full" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800">
                  {getFormattedMonthYear(selectedDate)}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevDate} className="text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 p-2 rounded-xl transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={handleNextDate} className="text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 p-2 rounded-xl transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={`label-${d}`} className="py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center gap-y-3 gap-x-1">
                {dynamicGridDays.map((date, idx) => {
                  const isSelected = formatToLocalYMD(selectedDate) === date.fullDateString;
                  return (
                    <button
                      key={`grid-${date.fullDateString}-${idx}`}
                      onClick={() => {
                        if (date.currentMonth) setSelectedDate(new Date(date.fullDateString + "T00:00:00"));
                      }}
                      disabled={!date.currentMonth}
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all relative ${
                        !date.currentMonth
                          ? "text-slate-300 cursor-not-allowed font-medium"
                          : isSelected
                            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 scale-110"
                            : date.isToday
                              ? "text-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {date.dayNumber}
                      {date.isToday && !isSelected && (
                        <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* OUTPUT DYNAMIC SCHEDULER DATA SECTION */}
        <div className="lg:col-span-8 rounded-3xl border border-white/40 bg-white/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl flex flex-col min-h-[450px]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
            <div className="space-y-1.5">
              <h4 className="text-xl font-bold text-slate-800 tracking-tight">
                {getFormattedDateLong(selectedDate)}
              </h4>
              <p className="text-sm text-slate-500 font-medium">Daily Event Itinerary</p>
            </div>

            <div className="rounded-full border border-indigo-100 bg-indigo-50/50 px-4 py-1.5 text-sm font-bold text-indigo-700 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              {isLoading ? "Loading..." : `${programmes.length} Events`}
            </div>
          </div>

          {isLoading ? (
            <div className="my-auto space-y-4 py-8">
              <div className="h-28 bg-slate-100/80 rounded-2xl animate-pulse w-full" />
              <div className="h-28 bg-slate-100/80 rounded-2xl animate-pulse w-full delay-75" />
            </div>
          ) : programmes.length > 0 ? (
            <div className="space-y-5 overflow-y-auto pr-2 pb-4 custom-scrollbar">
              {programmes.map((prog) => (
                <div
                  key={prog.Program_Code}
                  className="group flex flex-col sm:flex-row p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-indigo-100 transition-all duration-300 gap-5"
                >
                  {/* Visual Poster */}
                  <div className="w-full sm:w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group-hover:shadow-md transition-shadow duration-300">
                    {prog.Program_Poster ? (
                      <img src={prog.Program_Poster} alt={prog.Program_Title || "Poster"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>

                  {/* Program Details */}
                  <div className="flex-1 space-y-3 flex flex-col justify-center">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h5 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {prog.Program_Title || "Untitled Event"}
                        </h5>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold mt-1.5">
                          {prog.WingTitle && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              {prog.WingTitle}
                            </span>
                          )}
                          {prog.Venue && (
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {prog.Venue}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-bold whitespace-nowrap border border-slate-200">
                        {prog.Program_Code}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {prog.Description || "No detailed summary provided for this event."}
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      {prog.Category && (
                        <span className="text-[10px] bg-violet-50 text-violet-700 px-2.5 py-1 font-bold rounded-lg uppercase tracking-wider border border-violet-100">
                          {prog.Category}
                        </span>
                      )}
                      {prog.Total_Registration > 0 && (
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          {prog.Total_Registration} Registered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="rounded-full bg-indigo-50 border border-indigo-100 p-4 text-indigo-400 mb-4 shadow-inner">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h5 className="text-lg font-bold text-slate-800 tracking-tight">No Events Scheduled</h5>
              <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
                Your calendar is clear for this day. Select a different date to explore upcoming activities and programmes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}