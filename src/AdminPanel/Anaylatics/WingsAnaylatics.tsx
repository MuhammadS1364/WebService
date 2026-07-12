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

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>Loading Wings Analytics...</div>;

  return (
    <div style={{ padding: "24px", backgroundColor: "#faf5ff", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#6d28d9", fontWeight: "700" }}>General Wings Analytics</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Monitor departmental performance, point accumulation, and event metrics.</p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          
          <div style={{ display: "flex", backgroundColor: "#f3e8ff", borderRadius: "8px", padding: "4px" }}>
            <button 
              onClick={() => setActiveTab("List")}
              style={{ ...tabStyle, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#6d28d9" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
            >
              Directory
            </button>
            <button 
              onClick={() => setActiveTab("Analytics")}
              style={{ ...tabStyle, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#6d28d9" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
            >
              Analytics
            </button>
          </div>

          <button onClick={handleExport} style={exportBtnStyle}>
            Export CSV ({filteredData.length})
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH SECTION */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
        <input 
          type="text" 
          name="SearchTerm" 
          placeholder="Search by Wing Name, Code, or Manager..." 
          value={filters.SearchTerm} 
          onChange={handleFilterChange} 
          style={{ ...inputStyle, flex: 2 }}
        />

        <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} style={{ ...inputStyle, flex: 1 }}>
          <option value="all">All Wings (Active & Inactive)</option>
          <option value="true">Active Wings Only</option>
          <option value="false">Inactive Wings Only</option>
        </select>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <>
          {/* KPI CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={kpiCardStyle}>
              <div style={kpiTitleStyle}>Total Registered Wings</div>
              <div style={kpiValueStyle}>{filteredData.length}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={kpiTitleStyle}>Active Operating Wings</div>
              <div style={{...kpiValueStyle, color: "#10b981"}}>{activeWingsCount}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={kpiTitleStyle}>Global System Points</div>
              <div style={{...kpiValueStyle, color: "#8b5cf6"}}>{totalSystemPoints.toLocaleString()}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={kpiTitleStyle}>Total Program Registrations</div>
              <div style={{...kpiValueStyle, color: "#f59e0b"}}>{totalSystemRegistrations.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
            
            {/* STACKED BAR CHART: Points Breakdown */}
            <div style={cardStyle}>
              <h3 style={chartTitleStyle}>Wing Points Breakdown (Top 8)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={pointsBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#faf5ff'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                  <Legend />
                  <Bar dataKey="standard" name="Standard Points" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="bonus" name="Bonus Points" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PIE CHART: Registration Distribution */}
            <div style={cardStyle}>
              <h3 style={chartTitleStyle}>Registration Volume by Wing</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie 
                    data={registrationsByWing} 
                    cx="40%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={110} 
                    paddingAngle={3} 
                    dataKey="value"
                  >
                    {registrationsByWing.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '13px', lineHeight: '24px', color: '#475569' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* COMPOSED CHART: Deep Engagement Profiling */}
            <div style={{...cardStyle, gridColumn: "1 / -1"}}>
              <h3 style={chartTitleStyle}>Top Performing Wings: Engagement vs Conversions</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={engagementProfile} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="registrations" name="Registrations" fill="#fef3c7" stroke="#f59e0b" />
                  <Bar yAxisId="left" dataKey="results" name="Resulted/Completed" barSize={40} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="points" name="Total Points Earned" stroke="#6d28d9" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      ) : (
        /* TABLE LIST VIEW */
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
                <tr>
                  <th style={thStyle}>Wing Identity</th>
                  <th style={thStyle}>Leadership</th>
                  <th style={thStyle}>Performance Data</th>
                  <th style={thStyle}>Total Points</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((wing, idx) => {
                  const grandTotal = (wing.Total_Points || 0) + (wing.Bonus_Points || 0);
                  
                  return (
                    <tr key={wing.WingCode} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "15px" }}>{wing.WingTitle || 'Unnamed Wing'}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>CODE: {wing.WingCode}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "500", color: "#334155" }}>Mgr: {wing.WingManager || 'Not Assigned'}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>Cvr: {wing.WingConvener || 'Not Assigned'}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: "13px", color: "#475569" }}>Registrations: <b style={{color: "#0f172a"}}>{wing.Total_Registrations || 0}</b></div>
                        <div style={{ fontSize: "13px", color: "#475569" }}>Results Processed: <b style={{color: "#0f172a"}}>{wing.Total_Resulted || 0}</b></div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                          <span style={{ backgroundColor: "#ede9fe", color: "#6d28d9", padding: "4px 12px", borderRadius: "999px", fontWeight: "700", fontSize: "14px" }}>
                            {grandTotal} pts
                          </span>
                          {(wing.Bonus_Points || 0) > 0 && (
                            <span style={{ fontSize: "11px", color: "#ec4899", fontWeight: "600", marginLeft: "4px" }}>
                              (+{wing.Bonus_Points} Bonus)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {wing.IsActive 
                          ? <span style={{ color: "#10b981", fontWeight: "600", fontSize: "14px", display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#10b981'}}></div> Active</span>
                          : <span style={{ color: "#ef4444", fontWeight: "600", fontSize: "14px", display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#ef4444'}}></div> Inactive</span>
                        }
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No Wings match your current search/filters.</td>
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

// --- Inline Styles typed as React.CSSProperties ---

const inputStyle: React.CSSProperties = { padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#334155", fontSize: "14px", outline: "none" };
const tabStyle: React.CSSProperties = { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" };
const exportBtnStyle: React.CSSProperties = { backgroundColor: "#8b5cf6", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(139, 92, 246, 0.3)" };
const cardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" };
const chartTitleStyle: React.CSSProperties = { margin: "0 0 20px 0", fontSize: "16px", color: "#334155", fontWeight: "600" };
const kpiCardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
const kpiTitleStyle: React.CSSProperties = { fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" };
const kpiValueStyle: React.CSSProperties = { fontSize: "28px", color: "#0f172a", fontWeight: "700", marginTop: "8px" };
const thStyle: React.CSSProperties = { padding: "16px", fontWeight: "600", borderBottom: "2px solid #e2e8f0" };
const tdStyle: React.CSSProperties = { padding: "16px", color: "#334155", fontSize: "14px", verticalAlign: "middle" };