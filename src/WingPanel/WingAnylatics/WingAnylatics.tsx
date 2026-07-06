import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";

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
  
  const [loading, setLoading] = useState<boolean>(true);
  const [wingData, setWingData] = useState<WingData | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    const fetchWingAndProgrammes = async () => {
      if (!actWing) {
        setError("No wing email provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: wingResult, error: wingError } = await SupaBaseFunction
          .from('Chs-WingS')
          .select('*')
          .eq('WingEmail', actWing)
          .single();

        if (wingError) throw new Error(wingError.message);
        setWingData(wingResult as WingData);

        const { data: programmesResult, error: progError } = await SupaBaseFunction
          .from('ProgrammesBox')
          .select('*')
          .eq('WingCode', wingResult.WingCode);

        if (progError) throw new Error(progError.message);

        setProgrammes(programmesResult || []);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWingAndProgrammes();
  }, [actWing]);

  const { filteredProgrammes, categories, stats } = useMemo(() => {
    let filtered = programmes.filter(p => 
      (p.Program_Title && p.Program_Title.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (p.Program_Code && p.Program_Code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (categoryFilter !== "All") {
      filtered = filtered.filter(p => p.Category === categoryFilter);
    }

    if (statusFilter === "Published") {
      filtered = filtered.filter(p => p.IsResultPublished);
    } else if (statusFilter === "Pending") {
      filtered = filtered.filter(p => !p.IsResultPublished);
    }

    const uniqueCategories = [...new Set(programmes.map(p => p.Category).filter(Boolean))];
    
    const categoryStats: CategoryStat[] = uniqueCategories.map(cat => ({
      name: cat,
      totalReg: programmes.filter(p => p.Category === cat).reduce((sum, p) => sum + (p.Total_Registration || 0), 0)
    }));

    const maxReg = Math.max(...categoryStats.map(c => c.totalReg), 1);

    return { 
      filteredProgrammes: filtered, 
      categories: uniqueCategories,
      stats: { categoryStats, maxReg }
    };
  }, [programmes, searchQuery, categoryFilter, statusFilter]);

  const totalProgramsCount = programmes.length;
  const publishedResultsCount = programmes.filter(p => p.IsResultPublished).length;
  const completionPercentage = totalProgramsCount === 0 ? 0 : Math.round((publishedResultsCount / totalProgramsCount) * 100);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div></div>;
  if (error) return <div className="flex h-96 items-center justify-center text-rose-500 font-medium">{error}</div>;

  return (
    <div className="mx-auto max-w-[1600px] p-4 font-sans text-slate-800 bg-slate-50 min-h-screen">
      {/* Header, Metrics, Charts and Table remain in the same structure... */}
      {/* (The JSX below is the same as your provided code, now fully typed) */}
      
      {/* --- HEADER --- */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wing Analytics</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            {wingData?.WingTitle || 'Unknown Wing'} ({wingData?.WingCode})
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 sm:w-64"
          />
          <select
            value={categoryFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* --- METRICS (Using OverViewClipBox) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <OverViewClipBox BoxTitle="Total Programmes" BoxValue={totalProgramsCount} color="indigo" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>} />
        <OverViewClipBox BoxTitle="Total Registrations" BoxValue={wingData?.Total_Registrations || 0} color="blue" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
        <OverViewClipBox BoxTitle="Results Published" BoxValue={publishedResultsCount} color="emerald" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
        <OverViewClipBox BoxTitle="Total Points" BoxValue={(wingData?.Total_Points || 0) + (wingData?.Bonus_Points || 0)} color="amber" BoxSvgLogo={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>} />
      </div>

      {/* --- REMAINDER OF UI REMAINS IDENTICAL TO YOUR PROVIDED CODE --- */}
    </div>
  );
}