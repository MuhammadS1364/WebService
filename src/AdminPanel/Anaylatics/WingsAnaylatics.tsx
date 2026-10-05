// export default function GeneralWingsAnaylatics(){
//     return(

//     )
// }

// create table public."Chs-WingS" (
//   "WingCode" character varying not null,
//   "WingTitle" character varying null,
//   "WingEmail" text null,
//   "WingManager" character varying null,
//   "WingConvener" character varying null,
//   "WingAssistant" character varying null,
//   "Total_Registrations" integer null default 0,
//   "Total_Resulted" integer null default 0,
//   "Total_Points" integer null default 0,
//   "Bonus_Points" integer null default 0,
//   "Description" text null,
//   "WingUserId" character varying null,
//   "IsActive" boolean null default true,
//   constraint Chs - WingS_pkey primary key ("WingCode")
// ) TABLESPACE pg_default;


// create table public."ProgrammesBox" (
//   "Program_Title" character varying null,
//   "Program_Code" character varying not null,
//   "WingCode" character varying null,
//   "Description" text null,
//   "OutComes" text null,
//   "Date" date null,
//   "Venue" character varying null,
//   "Category" character varying null,
//   "Group" character varying null,
//   "IsApproved" boolean null default false,
//   "IsResulted" boolean null default false,
//   "IsResultPublished" boolean null default false,
//   "Total_Registration" integer null default 0,
//   "IsOpenRegistration" boolean null default true,
//   "Program_Poster" character varying null default 'https://media.licdn.com/dms/image/v2/C5112AQH1xW5oeiHzvg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520148394987?e=2147483647&v=beta&t=vThHQ4hcg90pr_O3kI_FOE_Z4jULLSBg4L280dD6-DE'::character varying,
//   "IsConducted" boolean null default false,
//   "AccademicYear" character varying null,
//   created_at time without time zone null default now(),
//   "Expected_Time" character varying null default 'Not Provided'::character varying,
//   "Collaborator" character varying null default 'No Collaboration'::character varying,
//   constraint ProgrammesBox_pkey primary key ("Program_Code")
// ) TABLESPACE pg_default;

// create table public."ResultBox" (
//   "Result_id" uuid not null default gen_random_uuid (),
//   "creaded_At" time without time zone null,
//   "Program_Id" character varying null,
//   "First_Holder" character varying null,
//   "Second_Holder" character varying null,
//   "Third_Holder" character varying null,
//   "AGrade" character varying null default 'No Grade'::character varying,
//   "BGrade" character varying null,
//   constraint ResultBox_pkey primary key ("Result_id")
// ) TABLESPACE pg_default;


import React, { useState, useEffect } from "react";
// @ts-ignore - Assuming SupaBaseFunction is correctly configured in your lib
import { SupaBaseFunction } from "../../lib/SupaBase"; 
import EditWingModal, { type EditableWing } from "../Wing/EditWingModal";
import { Edit2, Building2, CheckCircle2, Search, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Line, Area
} from "recharts";

// --- TypeScript Interfaces ---

export interface Wing {
  WingCode: string;
  WingTitle: string | null;
  WingEmail: string | null;
  WingManager: string | null;
  WingConvener: string | null;
  WingAssistant: string | null;
  Total_Registrations: number | null;
  Total_Resulted: number | null;
  Total_Points: number | null;
  Bonus_Points: number | null;
  Description: string | null;
  WingUserId: string | null;
  IsActive: boolean | null;
  wing_logo?: string | null;
}

interface Filters {
  SearchTerm: string;
  IsActive: string;
}

// Vibrant Violet & Amber Theme for Wings Dashboard
const COLORS = ['#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#f43f5e', '#6366f1'];

export default function GeneralWingsAnaylatics() {
  // State Management
  const [wings, setWings] = useState<Wing[]>([]);
  const [filteredData, setFilteredData] = useState<Wing[]>([]);
  const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
  const [loading, setLoading] = useState<boolean>(true);

  // Edit Modal & Notification State
  const [selectedWingForEdit, setSelectedWingForEdit] = useState<EditableWing | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filter States
  const [filters, setFilters] = useState<Filters>({
    SearchTerm: "",
    IsActive: "all"
  });

  // 1. Fetch Wings Data
  const fetchWings = async () => {
    setLoading(true);
    try {
      const { data, error } = await SupaBaseFunction
        .from("Chs-WingS")
        .select("*")
        .order("WingTitle", { ascending: true });
        
      if (error) throw error;
      
      setWings(data || []);
    } catch (error) {
      console.error("Error fetching Wings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWings();
  }, []);

  const handleEditWing = (wing: Wing) => {
    setSelectedWingForEdit({
      WingTitle: wing.WingTitle,
      WingCode: wing.WingCode,
      WingEmail: wing.WingEmail,
      WingManager: wing.WingManager,
      WingConvener: wing.WingConvener,
      WingAssistant: wing.WingAssistant,
      Total_Points: wing.Total_Points,
      Bonus_Points: wing.Bonus_Points,
      Description: wing.Description,
      wing_logo: wing.wing_logo,
      IsActive: wing.IsActive !== false,
    });
    setIsEditModalOpen(true);
  };

  const handleWingEditSuccess = () => {
    setFeedback("Wing details updated successfully!");
    fetchWings();
    setTimeout(() => setFeedback(null), 3500);
  };

  // 2. Apply Filters
  useEffect(() => {
    let result = wings;

    if (filters.SearchTerm) {
      const lowerCaseSearch = filters.SearchTerm.toLowerCase();
      result = result.filter(w => 
        (w.WingTitle && w.WingTitle.toLowerCase().includes(lowerCaseSearch)) ||
        (w.WingCode.toLowerCase().includes(lowerCaseSearch)) ||
        (w.WingManager && w.WingManager.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    if (filters.IsActive !== "all") {
      const isActiveBool = filters.IsActive === "true";
      result = result.filter(w => w.IsActive === isActiveBool);
    }

    setFilteredData(result);
  }, [filters, wings]);

  // 3. CSV Export Logic
  const handleExport = () => {
    const isFiltered = filters.SearchTerm !== "" || filters.IsActive !== "all";
    
    const message = isFiltered 
      ? `You have active filters. Export ${filteredData.length} filtered Wings?`
      : `Export all ${filteredData.length} Wings?`;

    if (window.confirm(message)) {
      const headers = [
        "Wing_Code", "Wing_Title", "Manager", "Convener", 
        "Total_Registrations", "Total_Resulted", "Standard_Points", 
        "Bonus_Points", "Grand_Total_Points", "IsActive"
      ];

      const csvContent = [
        headers.join(","),
        ...filteredData.map(row => {
          const standardPoints = row.Total_Points || 0;
          const bonusPoints = row.Bonus_Points || 0;
          return [
            `"${row.WingCode || ''}"`,
            `"${row.WingTitle || ''}"`,
            `"${row.WingManager || ''}"`,
            `"${row.WingConvener || ''}"`,
            row.Total_Registrations || 0,
            row.Total_Resulted || 0,
            standardPoints,
            bonusPoints,
            standardPoints + bonusPoints,
            row.IsActive ? "Yes" : "No"
          ].join(",");
        })
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Wings_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- Analytics Data Processing ---

  // 1. Stacked Bar Chart: Points Breakdown (Standard vs Bonus)
  const pointsBreakdown = [...filteredData]
    .map(w => ({
      name: w.WingTitle || w.WingCode,
      standard: w.Total_Points || 0,
      bonus: w.Bonus_Points || 0,
      total: (w.Total_Points || 0) + (w.Bonus_Points || 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8); // Top 8 Wings by total points

  // 2. Pie Chart: Registration Distribution
  const registrationsByWing = [...filteredData]
    .map(w => ({
      name: w.WingTitle || w.WingCode,
      value: w.Total_Registrations || 0
    }))
    .filter(w => w.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 3. Composed Chart: Wing Engagement Profiling
  const engagementProfile = [...filteredData]
    .sort((a, b) => (b.Total_Registrations || 0) - (a.Total_Registrations || 0))
    .slice(0, 6)
    .map(w => ({
      name: w.WingTitle || w.WingCode,
      registrations: w.Total_Registrations || 0,
      results: w.Total_Resulted || 0,
      points: (w.Total_Points || 0) + (w.Bonus_Points || 0)
    }));

  // KPI Math
  const totalSystemPoints = filteredData.reduce((sum, w) => sum + (w.Total_Points || 0) + (w.Bonus_Points || 0), 0);
  const totalSystemRegistrations = filteredData.reduce((sum, w) => sum + (w.Total_Registrations || 0), 0);
  const activeWingsCount = filteredData.filter(w => w.IsActive).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-lg font-semibold text-slate-500 animate-pulse">Loading Wings Analytics...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden font-sans space-y-5">
      
      {/* FEEDBACK TOAST BANNER */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs transition-all animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
              <Building2 size={20} />
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">Wings Analytics & Management</h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Monitor departmental performance, points distribution, and manage wing profiles.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto items-stretch sm:items-center">
          <div className="flex bg-slate-100 rounded-xl p-1 w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => setActiveTab("Analytics")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === "Analytics" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Analytics
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab("List")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === "List" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Directory ({filteredData.length})
            </button>
          </div>

          <button 
            type="button"
            onClick={handleExport} 
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="relative sm:col-span-2">
          <input 
            type="text" 
            name="SearchTerm" 
            placeholder="Search by Wing Name, Code, or Manager..." 
            value={filters.SearchTerm} 
            onChange={handleFilterChange} 
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
        </div>

        <div>
          <select 
            name="IsActive" 
            value={filters.IsActive} 
            onChange={handleFilterChange} 
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl p-2.5 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer font-medium"
          >
            <option value="all">All Statuses (Active & Inactive)</option>
            <option value="true">Active Operating Wings Only</option>
            <option value="false">Inactive Wings Only</option>
          </select>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <div className="space-y-5">
          {/* KPI CARDS (2 cols on small mobile, 4 cols on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">Registered Wings</span>
              <div className="text-xl sm:text-3xl font-black text-slate-900 mt-1">{filteredData.length}</div>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Operating</span>
              <div className="text-xl sm:text-3xl font-black text-emerald-600 mt-1">{activeWingsCount}</div>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">Global Points</span>
              <div className="text-xl sm:text-3xl font-black text-violet-600 mt-1">{totalSystemPoints.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Registrations</span>
              <div className="text-xl sm:text-3xl font-black text-amber-500 mt-1">{totalSystemRegistrations.toLocaleString()}</div>
            </div>
          </div>

          {/* CHARTS GRID (min-w-0 on every card prevents flex/grid blowout & collapse) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* STACKED BAR CHART: Points Breakdown */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Wing Points Breakdown (Top 8)</h3>
                <span className="text-[11px] text-slate-400 font-medium">Standard + Bonus</span>
              </div>
              <div className="h-[260px] sm:h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pointsBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      axisLine={false} 
                      tickLine={false}
                      interval={0}
                      tickFormatter={(val: string) => (val.length > 8 ? val.slice(0, 6) + "…" : val)}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#faf5ff' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="standard" name="Standard" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="bonus" name="Bonus" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE CHART: Registration Distribution */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Registration Volume by Wing</h3>
                <span className="text-[11px] text-slate-400 font-medium">Candidate Share</span>
              </div>
              <div className="h-[260px] sm:h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={registrationsByWing} 
                      cx="50%" 
                      cy="45%" 
                      innerRadius="45%" 
                      outerRadius="72%" 
                      paddingAngle={2} 
                      dataKey="value"
                    >
                      {registrationsByWing.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                    <Legend 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', color: '#475569', paddingTop: '6px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* COMPOSED CHART: Deep Engagement Profiling */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs min-w-0 overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Top Performing Wings: Engagement vs Conversions</h3>
                <span className="text-[11px] text-slate-400 font-medium">Registrations & Points</span>
              </div>
              <div className="h-[280px] sm:h-[320px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={engagementProfile} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      axisLine={false} 
                      tickLine={false} 
                      interval={0}
                      tickFormatter={(val: string) => (val.length > 9 ? val.slice(0, 7) + "…" : val)}
                    />
                    <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="registrations" name="Registrations" fill="#fef3c7" stroke="#f59e0b" />
                    <Bar yAxisId="left" dataKey="results" name="Results" barSize={26} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="points" name="Total Points" stroke="#6d28d9" strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* DIRECTORY VIEW: RESPONSIVE (Cards for small screens, Table for desktop) */
        <div className="space-y-4">
          
          {/* MOBILE CARDS VIEW (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredData.map((wing) => {
              const grandTotal = (wing.Total_Points || 0) + (wing.Bonus_Points || 0);
              return (
                <div key={wing.WingCode} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{wing.WingTitle || "Unnamed Wing"}</h4>
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                        {wing.WingCode}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${wing.IsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wing.IsActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {wing.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Manager</span>
                      <span className="font-medium truncate block">{wing.WingManager || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Convener</span>
                      <span className="font-medium truncate block">{wing.WingConvener || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Registrations</span>
                      <span className="font-bold text-slate-800">{wing.Total_Registrations || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Points</span>
                      <span className="font-bold text-violet-700">{grandTotal} pts</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditWing(wing)}
                    className="w-full py-2 px-3 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-violet-200 transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit Wing Info</span>
                  </button>
                </div>
              );
            })}
            {filteredData.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No wings match your filter.
              </div>
            )}
          </div>

          {/* TABLE VIEW (>= 640px) */}
          <div className="hidden sm:block bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Wing Identity</th>
                    <th className="p-4">Leadership</th>
                    <th className="p-4">Performance</th>
                    <th className="p-4">Total Points</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredData.map((wing) => {
                    const grandTotal = (wing.Total_Points || 0) + (wing.Bonus_Points || 0);
                    
                    return (
                      <tr key={wing.WingCode} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">{wing.WingTitle || 'Unnamed Wing'}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">CODE: {wing.WingCode}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700">Mgr: {wing.WingManager || 'Not Assigned'}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Cvr: {wing.WingConvener || 'Not Assigned'}</div>
                        </td>
                        <td className="p-4 text-slate-600">
                          <div>Registrations: <span className="font-bold text-slate-800">{wing.Total_Registrations || 0}</span></div>
                          <div className="text-[11px] text-slate-400">Results: {wing.Total_Resulted || 0}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold text-xs">
                              {grandTotal} pts
                            </span>
                            {(wing.Bonus_Points || 0) > 0 && (
                              <span className="text-[10px] font-semibold text-pink-500 ml-1">
                                (+{wing.Bonus_Points} Bonus)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {wing.IsActive ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleEditWing(wing)}
                            className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-xl inline-flex items-center gap-1 border border-violet-200 transition-colors cursor-pointer"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No Wings match your current search/filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT WING MODAL */}
      <EditWingModal
        wing={selectedWingForEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWingForEdit(null);
        }}
        onSuccess={handleWingEditSuccess}
      />
    </div>
  );
}