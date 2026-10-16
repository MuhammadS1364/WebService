import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveWingProfile } from "../../lib/wingResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { Printer, Calendar, RotateCcw, Filter } from "lucide-react";

// --- INTERFACES ---
interface WingData {
  WingCode: string;
  WingTitle: string;
  WingEmail: string;
  Total_Registrations?: number;
  Total_Points?: number;
  Bonus_Points?: number;
}

interface Programme {
  Program_Code: string;
  Program_Title: string;
  Program_Poster: string;
  Description: string;
  Category: string;
  Group: string;
  Total_Registration: number;
  IsConducted: boolean;
  IsResultPublished: boolean;
  Date?: string;
  created_at?: string;
}

interface CategoryStat {
  name: string;
  totalReg: number;
}

// 1. Overview Clip Box Component
interface OverViewClipBoxProps {
  BoxTitle: string;
  BoxValue: string | number;
  BoxSvgLogo: React.ReactNode;
  color?: "indigo" | "emerald" | "amber" | "rose" | "blue";
}

const OverViewClipBox = ({ BoxTitle, BoxValue, BoxSvgLogo, color = "indigo" }: OverViewClipBoxProps) => {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600"
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500">{BoxTitle}</h3>
        <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
          {BoxSvgLogo}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-800">{BoxValue}</span>
      </div>
    </div>
  );
};

// 2. Main Analytics Component
export default function WingAnalytics() {
  const { actWing } = useParams<{ actWing: string }>();
  const meta = useProgrammeMeta();

  const [loading, setLoading] = useState<boolean>(true);
  const [wingData, setWingData] = useState<WingData | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  /**
   * Flexible Date Parser for YYYY-MM-DD or DD-MM-YYYY (e.g. "20-07-2026")
   */
  const parseFlexibleDate = (val?: string | null): Date | null => {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;

    const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
      const d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
      if (!isNaN(d.getTime())) return d;
    }

    const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
      const d = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
      if (!isNaN(d.getTime())) return d;
    }

    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchWingAndProgrammes = async () => {
      setLoading(true);
      try {
        const wingResult = await resolveWingProfile(actWing);
        if (!wingResult) throw new Error("Wing configuration could not be loaded.");

        if (isMounted) {
          setWingData(wingResult as WingData);
        }

        const { data: programmesResult, error: progError } = await SupaBaseFunction
          .from('ProgrammesBox')
          .select('*')
          .eq('WingCode', wingResult.WingCode);

        if (progError) throw new Error(progError.message);

        if (isMounted) {
          setProgrammes(programmesResult || []);
        }
      } catch (err) {
        const error = err as Error;
        if (isMounted) {
          setError(error.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWingAndProgrammes();
    return () => {
      isMounted = false;
    };
  }, [actWing]);

  // Derived state processing block using useMemo
  const { filteredProgrammes, categories, stats } = useMemo(() => {
    let filtered = programmes.filter(p =>
      (p.Program_Title && p.Program_Title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.Program_Code && p.Program_Code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (categoryFilter !== "All") {
      filtered = filtered.filter(p => meta.getCategoryName(p.Category) === categoryFilter);
    }

    if (statusFilter === "Published") {
      filtered = filtered.filter(p => p.IsResultPublished);
    } else if (statusFilter === "Pending") {
      filtered = filtered.filter(p => !p.IsResultPublished);
    }

    // Time bounded date filter ("From Date" to "To Date", e.g. "20-07-2026" to "10-10-2026")
    if (startDate) {
      const start = parseFlexibleDate(startDate);
      if (start) {
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(p => {
          const d = parseFlexibleDate(p.Date || p.created_at);
          return d ? d >= start : false;
        });
      }
    }

    if (endDate) {
      const end = parseFlexibleDate(endDate);
      if (end) {
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(p => {
          const d = parseFlexibleDate(p.Date || p.created_at);
          return d ? d <= end : false;
        });
      }
    }

    // Build category stats by resolving readable category names from filtered programmes
    const catMapStats = new Map<string, number>();
    filtered.forEach(p => {
      const catName = meta.getCategoryName(p.Category);
      catMapStats.set(catName, (catMapStats.get(catName) || 0) + (p.Total_Registration || 0));
    });

    const categoryStats: CategoryStat[] = Array.from(catMapStats.entries()).map(([name, totalReg]) => ({
      name,
      totalReg
    }));

    const maxReg = Math.max(...categoryStats.map(c => c.totalReg), 1);
    const uniqueCategoryNames = Array.from(catMapStats.keys());

    return {
      filteredProgrammes: filtered,
      categories: uniqueCategoryNames,
      stats: { categoryStats, maxReg }
    };
  }, [programmes, searchQuery, categoryFilter, statusFilter, startDate, endDate, meta]);

  const totalProgramsCount = filteredProgrammes.length;
  const publishedResultsCount = filteredProgrammes.filter(p => p.IsResultPublished).length;
  const totalRegistrations = filteredProgrammes.reduce((sum, p) => sum + (p.Total_Registration || 0), 0);
  const completionPercentage = totalProgramsCount === 0 ? 0 : Math.round((publishedResultsCount / totalProgramsCount) * 100);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div></div>;
  if (error) return <div className="flex h-96 items-center justify-center text-rose-500 font-medium">{error}</div>;

  return (
    <div className="mx-auto max-w-[1600px] p-4 font-sans text-slate-800 bg-slate-50 min-h-screen">
      {/* PRINT-ONLY CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-block { display: block !important; }
        }
      `}</style>

      {/* PRINT-ONLY BRANDED REPORT HEADER */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Anjuman e Huda</h1>
            <p className="text-sm font-bold text-slate-700">
              Wing Analytics & Performance Report — {wingData?.WingTitle || 'Wing'} ({wingData?.WingCode})
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 font-mono">
            <p>Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p className="font-bold text-indigo-800">
              {startDate || endDate
                ? `Period: ${startDate || "Beginning"} to ${endDate || "Present"}`
                : "Period: Complete Records"}
            </p>
            <p>Total Programmes: {totalProgramsCount} | Registrations: {totalRegistrations}</p>
          </div>
        </div>
      </div>

      {/* --- HEADER --- */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 xl:flex-row xl:items-center xl:justify-between no-print">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wing Analytics</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            {wingData?.WingTitle || 'Unknown Wing'} ({wingData?.WingCode})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
            title="Print Visual Analytics"
          >
            <Printer size={15} className="text-emerald-400" />
            <span>Print Visual</span>
          </button>
        </div>
      </div>

      {/* --- FILTERS & SEARCH CONTROLS --- */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 no-print space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Controls</span>
            {(startDate || endDate || categoryFilter !== "All" || statusFilter !== "All" || searchQuery) && (
              <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                Filtered: {filteredProgrammes.length} programmes
              </span>
            )}
          </div>
          {(startDate || endDate || categoryFilter !== "All" || statusFilter !== "All" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("All");
                setStatusFilter("All");
                setStartDate("");
                setEndDate("");
              }}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center flex-wrap">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(["All", "Published", "Pending"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === status
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Time bounded filter: From Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar size={13} className="text-indigo-600 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase font-bold text-slate-600">From Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Time bounded filter: To Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar size={13} className="text-indigo-600 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase font-bold text-slate-600">To Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-medium text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* --- POINTS POLICY NOTIFICATION --- */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
            Points Policy: Held Until Resulted
          </span>
          <h3 className="text-sm sm:text-base font-black text-white mt-1">
            Points for this wing are strictly held on pending programmes and awarded only upon official result publication.
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-amber-300 border border-white/15">
            {Math.max(0, totalProgramsCount - publishedResultsCount)} Pending Programmes (Points on Hold)
          </span>
        </div>
      </div>

      {/* --- METRICS LAYER --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <OverViewClipBox BoxTitle="Total Programmes" BoxValue={totalProgramsCount} color="indigo" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>} />
        <OverViewClipBox BoxTitle="Total Registrations" BoxValue={totalRegistrations} color="blue" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
        <OverViewClipBox BoxTitle="Results Published" BoxValue={publishedResultsCount} color="emerald" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
        <OverViewClipBox BoxTitle="Total Points" BoxValue={(wingData?.Total_Points || 0) + (wingData?.Bonus_Points || 0)} color="amber" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
      </div>

      {/* --- VISUAL ANALYTICS: CHARTS & TABLES DATA LAYER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Category breakdown visual representation block using state properties */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-900 text-base">Category Distribution</h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md">{completionPercentage}% Published</span>
          </div>
          <div className="space-y-4">
            {stats.categoryStats.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 truncate max-w-45">{item.name}</span>
                  <span className="text-slate-500">{item.totalReg} Regs</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${(item.totalReg / stats.maxReg) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.categoryStats.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No data matrix found</p>
            )}
          </div>
        </div>

        {/* Program Tracking Grid Output */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Programs Registry Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Code / Title</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Group</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProgrammes.map((prog) => (
                  <tr key={prog.Program_Code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{prog.Program_Title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{prog.Program_Code}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-semibold">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                        {meta.getCategoryName(prog.Category)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      {meta.getGroupName(prog.Group) || <span className="text-slate-400 text-xs italic">Unassigned</span>}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${prog.IsResultPublished
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                        {prog.IsResultPublished ? "Published" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredProgrammes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-slate-400 font-medium">
                      No matching records found in this view context.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}