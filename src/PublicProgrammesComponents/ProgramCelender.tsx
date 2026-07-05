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

// Interface strictly mapping your database: public."ProgrammesBox"
interface ProgrammeBoxItem {
  Program_Title: string | null;
  Program_Code: string; // Primary Key
  WingName: string | null;
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
// This prevents the classic off-by-one error caused by .toISOString() UTC shifts
const formatToLocalYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ProgrammesCalendar() {
  const [viewMode, setViewMode] = useState<"mini" | "full">("full");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default to today
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

      // 2. Extract unique WingCodes from the programmes we just fetched
      const wingCodes = [...new Set(programmesData.map(p => p.WingCode).filter(Boolean))];

      // 3. Fetch matching Wings (ONLY if there are WingCodes to search for)
      let wingsData = [];
      if (wingCodes.length > 0) {
        const { data: wData, error: wingError } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, WingTitle, WingEmail")
          .in("WingCode", wingCodes); // Use .in() to find multiple matching codes
          
        if (wingError) throw wingError;
        wingsData = wData || [];
      }

      // 4. Merge the two sets of data together
      const mergedData = programmesData.map(prog => {
        const matchedWing = wingsData.find(w => w.WingCode === prog.WingCode);
        return {
          ...prog,
          WingTitle: matchedWing ? matchedWing.WingTitle : null,
          WingEmail: matchedWing ? matchedWing.WingEmail : null
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
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", weekday: "long" });
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

    // Previous month padding
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

    // Current month days
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

    // Next month padding
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
    <div className=" max-w[1500] space-y-6 text-slate-900 antialiased mx-auto sm:p-6">

      {/* Top Controls Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">Programme Schedule</h3>
          <p className="text-xs text-slate-500 mt-0.5">Database Verified Execution Matrix</p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setViewMode("mini")}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${viewMode === "mini" ? "bg-emerald-700 text-white shadow-md" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
          >
            Mini Strip
          </button>
          <button
            onClick={() => setViewMode("full")}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${viewMode === "full" ? "bg-emerald-700 text-white shadow-md" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
          >
            Full Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* INTERACTION CALENDAR CONTROL SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-h-[340px] flex flex-col justify-between">

          {viewMode === "mini" && (
            <div className="space-y-5 my-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Timeline Strip</h4>
                <div className="flex items-center gap-1">
                  <button onClick={handlePrevDate} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-xs font-bold font-mono text-slate-800 px-2 min-w-[125px] text-center">
                    {getFormattedStripHeader(selectedDate)}
                  </span>
                  <button onClick={handleNextDate} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {timelineStripDays.map((item) => {
                  const isSelected = formatToLocalYMD(selectedDate) === item.fullDateString;
                  return (
                    <button
                      key={`strip-${item.fullDateString}`}
                      onClick={() => setSelectedDate(new Date(item.fullDateString + "T00:00:00"))} // Safe local creation
                      className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 ${isSelected
                          ? "bg-slate-900 border-slate-900 text-white font-bold shadow-md ring-2 ring-offset-2 ring-slate-900/10"
                          : item.isToday
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                    >
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {item.weekdayShort}
                      </span>
                      <span className="text-sm font-bold font-mono mt-1">{item.dayNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "full" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> Month Overview
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={handlePrevDate} className="text-slate-400 hover:text-slate-900 p-1 rounded-md">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-xs font-bold text-slate-900 font-mono px-1 min-w-[110px] text-center">
                    {getFormattedMonthYear(selectedDate)}
                  </span>
                  <button onClick={handleNextDate} className="text-slate-400 hover:text-slate-900 p-1 rounded-md">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={`label-${d}`} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center text-xs gap-y-1.5 gap-x-1">
                {dynamicGridDays.map((date, idx) => {
                  const isSelected = formatToLocalYMD(selectedDate) === date.fullDateString;
                  return (
                    <button
                      key={`grid-${date.fullDateString}-${idx}`}
                      onClick={() => {
                        if (date.currentMonth) {
                          setSelectedDate(new Date(date.fullDateString + "T00:00:00"));
                        }
                      }}
                      disabled={!date.currentMonth}
                      className={`mx-auto flex h-8 w-9 items-center justify-center rounded-lg font-semibold transition-all relative ${!date.currentMonth
                          ? "text-slate-200 cursor-not-allowed font-normal"
                          : isSelected
                            ? "bg-emerald-700 text-white font-bold shadow-sm scale-105"
                            : date.isToday
                              ? "border border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
                              : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                      {date.dayNumber}
                      {date.isToday && !isSelected && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* OUTPUT DYNAMIC SCHEDULER DATA SECTION */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-h-[340px]">

          <div className="flex flex-row items-start justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                {getFormattedDateLong(selectedDate)}
              </h4>
              <p className="text-xs text-slate-500 font-medium">Mapped from Database Collection</p>
            </div>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs font-mono">
              {isLoading ? "..." : programmes.length} Active
            </span>
          </div>

          {isLoading ? (
            <div className="my-auto space-y-3 py-6">
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse w-full" />
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse w-5/6" />
            </div>
          ) : programmes.length > 0 ? (
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 pb-2">
              {programmes.map((prog) => (
                <div
                  key={prog.Program_Code}
                  className="flex flex-col sm:flex-row p-4 rounded-xl border border-slate-100 bg-white shadow-xs hover:shadow-md transition-all duration-200 gap-4"
                >
                  {/* Visual Poster (from your DB schema) */}
                  <div className="w-full sm:w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    {prog.Program_Poster ? (
                      <img src={prog.Program_Poster} alt={prog.Program_Title || "Poster"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>

                  {/* Program Details */}
                  <div className="flex-1 space-y-2 flex flex-col justify-center">
                    <div className="flex items-start justify-between gap-2">
                      {/* Inside your program mapping output... */}
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">{prog.Program_Title || "Untitled Event"}</h5>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {/* Display the fetched WingTitle instead of the old WingName */}
                          {prog.WingTitle && <span className="mr-2">Wing: {prog.WingTitle}</span>}
                          {prog.Venue && <span>📍 {prog.Venue}</span>}
                        </p>
                      </div>

                      <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-bold border border-emerald-100 whitespace-nowrap">
                        {prog.Program_Code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {prog.Description || "No operational summary data provided."}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      Open for
                      {prog.Category && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 font-bold rounded uppercase tracking-wide">
                          {prog.Category}
                        </span>
                      )}
                      {prog.Total_Registration > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 font-semibold rounded">
                          {prog.Total_Registration} Registered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="rounded-full bg-white border border-slate-200 p-3 text-slate-400 mb-3 shadow-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h5 className="text-sm font-bold text-slate-900 tracking-tight">No programmes scheduled</h5>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                There are no current events registered in the system for this specific day. Select another date to view upcoming events.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}