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

  // Filter States
  const [filters, setFilters] = useState<Filters>({
    SearchTerm: "",
    IsActive: "all"
  });

  // 1. Fetch Wings Data
  useEffect(() => {
    const fetchWings = async () => {
      setLoading(true);
      try {
        const { data, error } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("*");
          
        if (error) throw error;
        
        setWings(data || []);
      } catch (error) {
        console.error("Error fetching Wings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWings();
  }, []);

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
    <div className="min-h-screen bg-violet-50 p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 sm:p-6 rounded-2xl shadow-sm mb-6 gap-5">
        <div>
          <h2 className="m-0 text-xl sm:text-2xl font-bold text-violet-700">General Wings Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor departmental performance, point accumulation, and event metrics.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-stretch sm:items-center">
          
          <div className="flex bg-violet-50 rounded-lg p-1 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab("List")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === "List" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Directory
            </button>
            <button 
              onClick={() => setActiveTab("Analytics")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === "Analytics" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Analytics
            </button>
          </div>

          <button 
            onClick={handleExport} 
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 active:scale-95 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-violet-600/20 transition-all text-center"
          >
            Export CSV ({filteredData.length})
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH SECTION */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm">
        <input 
          type="text" 
          name="SearchTerm" 
          placeholder="Search by Wing Name, Code, or Manager..." 
          value={filters.SearchTerm} 
          onChange={handleFilterChange} 
          className="w-full flex-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
        />

        <select 
          name="IsActive" 
          value={filters.IsActive} 
          onChange={handleFilterChange} 
          className="w-full sm:w-1/3 flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
        >
          <option value="all">All Wings (Active & Inactive)</option>
          <option value="true">Active Wings Only</option>
          <option value="false">Inactive Wings Only</option>
        </select>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Registered Wings</div>
              <div className="text-2xl font-bold text-slate-800 mt-2">{filteredData.length}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Operating Wings</div>
              <div className="text-2xl font-bold text-emerald-500 mt-2">{activeWingsCount}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Global System Points</div>
              <div className="text-2xl font-bold text-violet-500 mt-2">{totalSystemPoints.toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Program Registrations</div>
              <div className="text-2xl font-bold text-amber-500 mt-2">{totalSystemRegistrations.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* STACKED BAR CHART: Points Breakdown */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-base font-bold text-slate-700 mb-5">Wing Points Breakdown (Top 8)</h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pointsBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#faf5ff'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                    <Legend wrapperStyle={{fontSize: '12px'}} />
                    <Bar dataKey="standard" name="Standard Points" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="bonus" name="Bonus Points" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE CHART: Registration Distribution */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-base font-bold text-slate-700 mb-5">Registration Volume by Wing</h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={registrationsByWing} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="55%" 
                      outerRadius="80%" 
                      paddingAngle={2} 
                      dataKey="value"
                    >
                      {/* FIX: Replaced 'entry' with '_' */}
                      {registrationsByWing.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                    <Legend 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', color: '#475569' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* COMPOSED CHART: Deep Engagement Profiling */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
              <h3 className="text-base font-bold text-slate-700 mb-5">Top Performing Wings: Engagement vs Conversions</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={engagementProfile} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                    <Legend wrapperStyle={{fontSize: '12px'}} />
                    <Area yAxisId="left" type="monotone" dataKey="registrations" name="Registrations" fill="#fef3c7" stroke="#f59e0b" />
                    <Bar yAxisId="left" dataKey="results" name="Resulted/Completed" barSize={30} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="points" name="Total Points Earned" stroke="#6d28d9" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-4 border-b border-slate-200">Wing Identity</th>
                  <th className="p-4 border-b border-slate-200">Leadership</th>
                  <th className="p-4 border-b border-slate-200">Performance Data</th>
                  <th className="p-4 border-b border-slate-200">Total Points</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.map((wing, idx) => {
                  const grandTotal = (wing.Total_Points || 0) + (wing.Bonus_Points || 0);
                  
                  return (
                    <tr key={wing.WingCode} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-base">{wing.WingTitle || 'Unnamed Wing'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">CODE: {wing.WingCode}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-700">Mgr: {wing.WingManager || 'Not Assigned'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Cvr: {wing.WingConvener || 'Not Assigned'}</div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="text-sm">Registrations: <span className="font-bold text-slate-800">{wing.Total_Registrations || 0}</span></div>
                        <div className="text-sm">Results Processed: <span className="font-bold text-slate-800">{wing.Total_Resulted || 0}</span></div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-100 text-violet-800 font-bold text-sm">
                            {grandTotal} pts
                          </span>
                          {(wing.Bonus_Points || 0) > 0 && (
                            <span className="text-xs font-semibold text-pink-500 ml-1">
                              (+{wing.Bonus_Points} Bonus)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {wing.IsActive ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No Wings match your current search/filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}