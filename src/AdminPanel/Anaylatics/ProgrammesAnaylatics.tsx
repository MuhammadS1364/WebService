import React, { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { exportToExcel } from "../../lib/excelService";
import type { ProgrammeRecord } from "../../lib/types";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from "recharts";
import {
  Download,
  Filter
} from "lucide-react";

export interface WingSummary {
  WingCode: string;
  WingTitle: string | null;
}

interface FilterState {
  AccademicYear: string;
  Category: string;
  Group: string;
  Venue: string;
  WingCode: string;
  Collaborator: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981'];

interface VenueOption {
  venue_id: string;
  venue_title: string;
  venue_capacity?: number;
}

interface AcademicOption {
  accademic_id: string;
  accademic_year?: string;
  accademic_title?: string;
}

export default function ProgrammesAnalytics() {
  const meta = useProgrammeMeta();
  const [programmes, setProgrammes] = useState<ProgrammeRecord[]>([]);
  const [wings, setWings] = useState<WingSummary[]>([]);
  const [venuesList, setVenuesList] = useState<VenueOption[]>([]);
  const [academicYearsList, setAcademicYearsList] = useState<AcademicOption[]>([]);
  const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic Lookup Maps
  const venueMap = useMemo(() => {
    const map: Record<string, string> = { ...meta.venueMap };
    venuesList.forEach(v => {
      if (v.venue_id) map[v.venue_id] = v.venue_title;
    });
    return map;
  }, [meta.venueMap, venuesList]);

  const academicMap = useMemo(() => {
    const map: Record<string, string> = { ...meta.academicMap };
    academicYearsList.forEach(a => {
      if (a.accademic_id) {
        map[a.accademic_id] = a.accademic_year || a.accademic_title || "Academic Year";
      }
    });
    return map;
  }, [meta.academicMap, academicYearsList]);

  const getVenueName = (ven?: string | null) => {
    if (!ven) return "TBA (Campus)";
    return venueMap[ven] || ven;
  };

  const getCategoryName = (cat?: string | null) => {
    if (!cat) return "General";
    return meta.categoryMap[cat] || cat;
  };

  const getAcademicYearName = (year?: string | null) => {
    if (!year) return "Current Academic Cycle";
    return academicMap[year] || year;
  };

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    AccademicYear: "",
    Category: "",
    Group: "",
    Venue: "",
    WingCode: "",
    Collaborator: ""
  });

  // 1. Fetch Data Directly (ProgrammesBox, Chs-WingS, Our_Venues, Accademic_Info)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [progRes, wingRes, venRes, acadRes] = await Promise.all([
          SupaBaseFunction.from("ProgrammesBox").select("*").order("Date", { ascending: false }),
          SupaBaseFunction.from("Chs-WingS").select("WingCode, WingTitle"),
          SupaBaseFunction.from("Our_Venues").select("venue_id, venue_title, venue_capacity").order("venue_title"),
          SupaBaseFunction.from("Accademic_Info").select("accademic_id, accademic_year, accademic_title").order("created_at", { ascending: false }),
        ]);

        if (progRes.error) throw progRes.error;
        if (wingRes.error) throw wingRes.error;

        const typedProgs = (progRes.data as ProgrammeRecord[]) || [];
        const typedWings = (wingRes.data as WingSummary[]) || [];
        const typedVenues = (venRes.data as VenueOption[]) || [];
        const typedAcad = (acadRes.data as AcademicOption[]) || [];

        setProgrammes(typedProgs);
        setWings(typedWings);
        setVenuesList(typedVenues);
        setAcademicYearsList(typedAcad);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [meta.batches]);

  // Academic Year Options - ONLY from programmes in the table
  const availableAcademicYears = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();

    programmes.forEach(p => {
      if (p.AccademicYear && !seen.has(p.AccademicYear)) {
        seen.add(p.AccademicYear);
        const resolvedName = academicMap[p.AccademicYear] || p.AccademicYear;
        list.push({ id: p.AccademicYear, label: resolvedName });
      }
    });

    // Option for programmes without year
    const hasUnassigned = programmes.some(p => !p.AccademicYear);
    if (hasUnassigned && programmes.length > 0) {
      list.push({ id: "__unassigned__", label: "Unassigned / General Cycle" });
    }

    return list;
  }, [academicMap, programmes]);

  // Venue Options - ONLY from programmes in the table
  const availableVenues = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();

    programmes.forEach(p => {
      if (p.Venue && !seen.has(p.Venue)) {
        seen.add(p.Venue);
        const resolved = venueMap[p.Venue] || p.Venue;
        list.push({ id: p.Venue, label: resolved });
      }
    });

    // Option for programmes without venue
    const hasUnassigned = programmes.some(p => !p.Venue);
    if (hasUnassigned && programmes.length > 0) {
      list.push({ id: "__unassigned__", label: "TBA / Campus (No Venue Set)" });
    }

    return list;
  }, [venueMap, programmes]);

  // Category Options - ONLY from programmes in the table
  const availableCategories = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();

    programmes.forEach(p => {
      if (p.Category && !seen.has(p.Category)) {
        seen.add(p.Category);
        list.push({ id: p.Category, label: meta.categoryMap[p.Category] || p.Category });
      }
    });

    return list;
  }, [meta.categoryMap, programmes]);

  // Group Options - ONLY from programmes in the table
  const availableGroups = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();

    programmes.forEach(p => {
      if (p.Group && !seen.has(p.Group)) {
        seen.add(p.Group);
        list.push({ id: p.Group, label: meta.groupMap[p.Group] || p.Group });
      }
    });

    return list;
  }, [meta.groupMap, programmes]);

  // Wing Options - ONLY from programmes in the table
  const availableWings = useMemo(() => {
    const list: { WingCode: string; label: string }[] = [];
    const seen = new Set<string>();

    programmes.forEach(p => {
      if (p.WingCode && !seen.has(p.WingCode)) {
        seen.add(p.WingCode);
        const w = wings.find(item => item.WingCode === p.WingCode);
        list.push({ WingCode: p.WingCode, label: w?.WingTitle || p.WingCode });
      }
    });

    return list;
  }, [programmes, wings]);

  // Collaborator Options - ONLY from programmes in the table
  const availableCollaborators = useMemo(() => {
    const progCollabs = programmes.map(p => p.Collaborator).filter(Boolean) as string[];
    const all = Array.from(new Set(progCollabs)).filter(c => c && c !== "No Collaboration");
    return all.sort();
  }, [programmes]);

  // 2. Derive Filtered Data cleanly with useMemo
  const filteredData = useMemo(() => {
    let result = [...programmes];

    if (filters.AccademicYear) {
      if (filters.AccademicYear === "__unassigned__") {
        result = result.filter(p => !p.AccademicYear);
      } else {
        const selectedYearObj = availableAcademicYears.find(y => y.id === filters.AccademicYear);
        result = result.filter(p => {
          if (!p.AccademicYear) return false;
          if (p.AccademicYear === filters.AccademicYear) return true;
          if (academicMap[p.AccademicYear] === selectedYearObj?.label) return true;
          return false;
        });
      }
    }

    if (filters.Category) {
      result = result.filter(p => {
        if (!p.Category) return false;
        if (p.Category === filters.Category) return true;
        if (meta.categoryMap[p.Category] === filters.Category) return true;
        const catObj = meta.categories.find(c => c.category_id === filters.Category);
        if (catObj && (p.Category === catObj.category_title || meta.categoryMap[p.Category] === catObj.category_title)) return true;
        return false;
      });
    }

    if (filters.Group) {
      result = result.filter(p => {
        if (!p.Group) return false;
        if (p.Group === filters.Group) return true;
        if (meta.groupMap[p.Group] === filters.Group) return true;
        const grpObj = meta.groups.find(g => g.group_id === filters.Group);
        if (grpObj && (p.Group === grpObj.group_title || meta.groupMap[p.Group] === grpObj.group_title)) return true;
        return false;
      });
    }

    if (filters.Venue) {
      if (filters.Venue === "__unassigned__") {
        result = result.filter(p => !p.Venue);
      } else {
        const selectedVenueObj = venuesList.find(v => v.venue_id === filters.Venue) || meta.venues.find(v => v.venue_id === filters.Venue);
        result = result.filter(p => {
          if (!p.Venue) return false;
          if (p.Venue === filters.Venue) return true;
          if (selectedVenueObj && (p.Venue === selectedVenueObj.venue_title || venueMap[p.Venue] === selectedVenueObj.venue_title)) return true;
          return false;
        });
      }
    }

    if (filters.WingCode) {
      result = result.filter(p => p.WingCode === filters.WingCode);
    }

    if (filters.Collaborator) {
      result = result.filter(p => p.Collaborator === filters.Collaborator);
    }

    return result;
  }, [programmes, filters, availableAcademicYears, availableVenues, venuesList, meta.venues, venueMap, academicMap]);

  // Handle Export cleanly using the excel utility
  const handleExport = () => {
    try {
      const exportData = filteredData.map(p => ({
        "Program Code": p.Program_Code,
        "Program Title": p.Program_Title,
        "Wing": getWingName(p.WingCode),
        "Category": getCategoryName(p.Category),
        "Group": p.Group || "N/A",
        "Date": p.Date || "TBA",
        "Venue": getVenueName(p.Venue),
        "Total Registration": p.Total_Registration || 0,
        "Academic Year": getAcademicYearName(p.AccademicYear),
        "Conducted": p.IsConducted ? "Yes" : "No",
        "Approved": p.IsApproved ? "Yes" : "No",
        "Result Published": p.IsResultPublished ? "Yes" : "No"
      }));

      exportToExcel(exportData, "Programmes_Analytics_Report");
    } catch (err) {
      console.error("Failed to export data:", err);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetFilters = () => {
    setFilters({
      AccademicYear: "",
      Category: "",
      Group: "",
      Venue: "",
      WingCode: "",
      Collaborator: ""
    });
  };

  const getWingName = (code: string | null | undefined) => {
    if (!code) return "Unknown Wing";
    return wings.find(w => w.WingCode === code)?.WingTitle || code;
  };

  // --- Analytics Data Processing ---
  const registrationsByWing = useMemo(() => {
    const map = filteredData.reduce<Record<string, { name: string; registrations: number }>>((acc, curr) => {
      const name = getWingName(curr.WingCode);
      if (!acc[name]) acc[name] = { name, registrations: 0 };
      acc[name].registrations += (curr.Total_Registration || 0);
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.registrations - a.registrations).slice(0, 8);
  }, [filteredData, wings]);

  const categoryData = useMemo(() => {
    const map = filteredData.reduce<Record<string, { name: string; value: number }>>((acc, curr) => {
      const cat = curr.Category || "General";
      if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
      acc[cat].value += 1;
      return acc;
    }, {});
    return Object.values(map);
  }, [filteredData]);

  const timelineData = useMemo(() => {
    const map = filteredData.reduce<Record<string, { name: string; programs: number }>>((acc, curr) => {
      if (!curr.Date) return acc;
      const dateObj = new Date(curr.Date);
      if (isNaN(dateObj.getTime())) return acc;
      
      const month = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!acc[month]) acc[month] = { name: month, programs: 0 };
      acc[month].programs += 1;
      return acc;
    }, {});
    return Object.values(map);
  }, [filteredData]);

  // Derived KPI metrics
  const totalPrograms = filteredData.length;
  const totalRegistrations = filteredData.reduce((sum, p) => sum + (p.Total_Registration || 0), 0);
  const conductedPrograms = filteredData.filter(p => p.IsConducted).length;
  const upcomingPrograms = totalPrograms - conductedPrograms;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-sans">
        <div className="text-sm font-semibold text-slate-500 animate-pulse flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading Programme Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden font-sans space-y-5 sm:space-y-6">
      
      {/* HEADER SECTION (Fully Responsive on Mobile) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Admin Overview
            </span>
            <span className="text-xs text-slate-400 font-medium">Programmes Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Programmes & Events Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Monitor event volume, candidate participation, and timeline schedules across all wings.
          </p>
        </div>
        
        {/* Responsive Control Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full md:w-auto items-center">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab("Analytics")} 
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "Analytics"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab("List")} 
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "List"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Programme Directory
            </button>
          </div>

          <button
            onClick={handleExport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer shrink-0"
          >
            <Download size={14} />
            <span>Export Excel ({filteredData.length})</span>
          </button>
        </div>
      </div>

      {/* FILTER SECTION (Grid collapses from 6 columns on desktop down to 1 column on mobile) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={13} /> Filter Events
          </span>
          {(filters.AccademicYear || filters.Category || filters.Group || filters.Venue || filters.WingCode || filters.Collaborator) && (
            <button
              onClick={resetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select
            name="AccademicYear"
            value={filters.AccademicYear}
            onChange={handleFilterChange}
            className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
          >
            <option value="">All Academic Years</option>
            {availableAcademicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>

          <select
            name="Category"
            value={filters.Category}
            onChange={handleFilterChange}
            className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
          >
            <option value="">All Categories</option>
            {availableCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <select
            name="Group"
            value={filters.Group}
            onChange={handleFilterChange}
            className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
          >
            <option value="">All Groups</option>
            {availableGroups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>

          <select
            name="Venue"
            value={filters.Venue}
            onChange={handleFilterChange}
            className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
          >
            <option value="">All Venues</option>
            {availableVenues.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>

          <select
            name="WingCode"
            value={filters.WingCode}
            onChange={handleFilterChange}
            className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
          >
            <option value="">All Wings</option>
            {availableWings.map(w => <option key={w.WingCode} value={w.WingCode}>{w.label}</option>)}
          </select>

          <select
            name="Collaborator"
            value={filters.Collaborator}
            onChange={handleFilterChange}
            className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
          >
            <option value="">All Collaborators</option>
            {availableCollaborators.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <div className="space-y-6">

          {/* KPI CARDS (2 cols on mobile, 4 cols on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Total Events
              </span>
              <p className="text-xl sm:text-3xl font-black text-slate-900 mt-1">{totalPrograms}</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Total Registrations
              </span>
              <p className="text-xl sm:text-3xl font-black text-indigo-600 mt-1">{totalRegistrations}</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Conducted
              </span>
              <p className="text-xl sm:text-3xl font-black text-emerald-600 mt-1">{conductedPrograms}</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Upcoming
              </span>
              <p className="text-xl sm:text-3xl font-black text-amber-500 mt-1">{upcomingPrograms}</p>
            </div>
          </div>

          {/* CHARTS CONTAINER (Clean Responsive Grid, no fixed 400px minwidth) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Registrations by Wing */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Registrations by Wing (Top 8)
                </h3>
                <span className="text-xs text-slate-400 font-medium">Candidate Count</span>
              </div>
              <div className="h-[260px] sm:h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={registrationsByWing} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(val: string) => (val.length > 9 ? val.slice(0, 7) + "…" : val)}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="registrations" name="Registrations" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Programs by Category */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Events by Category
                </h3>
                <span className="text-xs text-slate-400 font-medium">Distribution</span>
              </div>
              <div className="h-[260px] sm:h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600 pt-2 max-h-16 overflow-y-auto">
                {categoryData.map((item, idx) => (
                  <span key={item.name} className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Program Frequency Timeline */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs min-w-0 overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Programme Timeline Trend
                </h3>
                <span className="text-xs text-slate-400 font-medium">Events Scheduled</span>
              </div>
              <div className="h-[260px] sm:h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="programs"
                      name="Programmes"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#14b8a6' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW (Responsive: Mobile Cards < 640px, Table >= 640px) */
        <div className="space-y-4">
          
          {/* MOBILE CARDS VIEW (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredData.map((prog) => (
              <div key={prog.Program_Code} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{prog.Program_Title}</h4>
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                      {prog.Program_Code}
                    </span>
                  </div>
                  {prog.IsConducted ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conducted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Upcoming
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Wing</span>
                    <span className="font-medium truncate block">{getWingName(prog.WingCode)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Category</span>
                    <span className="font-medium truncate block">{getCategoryName(prog.Category)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Date</span>
                    <span className="font-medium block">{prog.Date ? new Date(prog.Date).toLocaleDateString() : 'TBA'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Registrations</span>
                    <span className="font-bold text-indigo-600">{prog.Total_Registration || 0}</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No programmes match your current filter settings.
              </div>
            )}
          </div>

          {/* TABLE VIEW (>= 640px) */}
          <div className="hidden sm:block bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-4">Program Title</th>
                    <th className="p-4">Wing</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Venue</th>
                    <th className="p-4 text-center">Registrations</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredData.map((prog) => (
                    <tr key={prog.Program_Code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{prog.Program_Title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {prog.Program_Code} • {getCategoryName(prog.Category)}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{getWingName(prog.WingCode)}</td>
                      <td className="p-4 text-slate-600 font-medium">
                        {prog.Date ? new Date(prog.Date).toLocaleDateString() : 'TBA'}
                      </td>
                      <td className="p-4 text-slate-600">{getVenueName(prog.Venue)}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                          {prog.Total_Registration || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {prog.IsConducted ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conducted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Upcoming
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 text-sm">
                        No programmes match your current filter settings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
