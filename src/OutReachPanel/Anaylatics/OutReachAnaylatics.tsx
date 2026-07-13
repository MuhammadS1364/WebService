// import { useState,useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import { useParams } from "react-router-dom";

// // create table public."StudentsAchievements" (
// //   "Achieve_Id" uuid not null default gen_random_uuid (),
// //   "Achiever_Name" character varying null,
// //   "Achievement_Title" character varying null,
// //   "Achievement_Type" character varying null,
// //   "Position_Achieved" character varying null,
// //   "Achieve_Descriptin" text null,
// //   "Point_Obtained" integer null default 0,
// //   "StnAddNo" character varying null,
// //   constraint StudentsAchievements_pkey primary key ("Achieve_Id")
// // ) TABLESPACE pg_default;

// // create table public."StudentsOutReach" (
// //   "OutReach_Id" uuid not null default gen_random_uuid (),
// //   created_at time without time zone not null,
// //   "OutReach_Holder" character varying null,
// //   "OutReach_Title" character varying null,
// //   "OutReach_Type" character varying null,
// //   "Position_Achieved" character varying null,
// //   "OutReach_Descriptin" text null,
// //   "Point_Obtained" integer null default 0,
// //   "StnAddNo" character varying null,
// //   constraint StudentsOutReach_pkey primary key ("OutReach_Id")
// // ) TABLESPACE pg_default;

// // create table public."StudentsBox" (
// //   "AddNo" character varying not null,
// //   "StudentName" character varying null,
// //   "StudentEmail" character varying null,
// //   "FatherName" character varying null,
// //   "CollegeName" character varying null,
// //   "StnUserId" character varying null,
// //   "Class" character varying null,
// //   "Registration_Count" integer null default 0,
// //   "Resluted_Count" integer null default 0,
// //   "Total_Point_Anjuman" integer null default 0,
// //   "OutReach_Count" integer null default 0,
// //   "OutReach_Points" integer null default 0,
// //   "Achievements_Counts" integer null default 0,
// //   "Achievements_Points" integer null default 0,
// //   "Grand_Total_Points" integer null default 0,
// //   "IsActive" boolean null default true,
// //   "Student_Photo_Urls" character varying null default 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRO1QLsyDIL5S8tTQ5ZKXjFe9wxiVZ7O9-lOnJgJO3-Bg&s=10'::character varying,
// //   constraint StudentsBox_pkey primary key ("AddNo")
// // ) TABLESPACE pg_default;

// export default function OutReachAnaylatics(){
//     return(

// // full filter featrur we can filter the data by these colums : "Achievement_Type","Achiever_Name(display will name for uniqe vale of th colmn)", "Position_Achieved" in acchievemetn table 
// //  in outreach tabel colum : "OutReach_Holder(unique value of colums )", "Position_Achieved",OutReach_Type"
// // can import and export data in these two table 

// // multiple selection futede and appaly action like delete export the selection rows from table (n row exported)
// // for import column order in both "StnAddNo" match the add no to student table and update the point  
// //  for outreach import "OutReach_Count" updat vie each matched entry wiht +1 and "OutReach_Points" update with the vale that obtainde in ourt reach table : "Point_Obtained" and at last update the 
// //  "Grand_Total_Points" in student 
// // for achievmetn impot: "Achievements_Counts" updat vie each matched entry wiht +1 and "Achievements_Points" update with the vale that obtainde in ourt reach table : "Point_Obtained" and at last update the 
// //  "Grand_Total_Points" in student 

// // ourt Reach tabel impoort column order : "StnAddNo","OutReach_Title","OutReach_Type","Position_Achieved","OutReach_Descriptin","Point_Obtained", show in small text in header
// // achievme tbale impot coumn order : "StnAddNo","Achievement_Title","Achievement_Type","Position_Achieved","Achieve_Descriptin","Point_Obtained", shwo in small text 
// // set a preview for the importing data befor saving ot data base 

//     )
// }


import React, { useState, useEffect } from "react";
// @ts-ignore - Assuming SupaBaseFunction is correctly configured in your lib
import { SupaBaseFunction } from "../../lib/SupaBase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

// --- TypeScript Interfaces ---

export interface Achievement {
  Achieve_Id: string;
  Achiever_Name: string | null;
  Achievement_Title: string | null;
  Achievement_Type: string | null;
  Position_Achieved: string | null;
  Achieve_Descriptin: string | null;
  Point_Obtained: number | null;
  StnAddNo: string | null;
}

export interface Outreach {
  OutReach_Id: string;
  created_at: string;
  OutReach_Holder: string | null;
  OutReach_Title: string | null;
  OutReach_Type: string | null;
  Position_Achieved: string | null;
  OutReach_Descriptin: string | null;
  Point_Obtained: number | null;
  StnAddNo: string | null;
}

export interface Student {
  AddNo: string;
  OutReach_Count: number;
  OutReach_Points: number;
  Achievements_Counts: number;
  Achievements_Points: number;
  Grand_Total_Points: number;
}

type TabState = "Analytics" | "Outreach" | "Achievements";
type ImportType = "Outreach" | "Achievement" | null;

// Vibrant Cyan & Rose Theme for Engagement Dashboard
const COLORS = ['#06b6d4', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

export default function OutReachAnaylatics() {
  // State Management
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [activeTab, setActiveTab] = useState<TabState>("Analytics");
  const [loading, setLoading] = useState<boolean>(true);
  
  // Selection & Filtering
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ Type: "", Name: "", Position: "" });
  
  // Import Modal State
  const [importType, setImportType] = useState<ImportType>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState<boolean>(false);

  // Filter Options extractors
  const getUnique = (arr: any[], key: string) => Array.from(new Set(arr.map(item => item[key]).filter(Boolean))).sort();

  // 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: achData, error: achError } = await SupaBaseFunction.from("StudentsAchievements").select("*");
      const { data: outData, error: outError } = await SupaBaseFunction.from("StudentsOutReach").select("*");

      if (achError) throw achError;
      if (outError) throw outError;

      setAchievements(achData || []);
      setOutreach(outData || []);
    } catch (error) {
      console.error("Error fetching engagement data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset selection and filters when changing tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setFilters({ Type: "", Name: "", Position: "" });
  }, [activeTab]);

  // 2. Filter Application
  const getFilteredData = () => {
    if (activeTab === "Achievements") {
      return achievements.filter(a => 
        (!filters.Type || a.Achievement_Type === filters.Type) &&
        (!filters.Name || a.Achiever_Name === filters.Name) &&
        (!filters.Position || a.Position_Achieved === filters.Position)
      );
    }
    if (activeTab === "Outreach") {
      return outreach.filter(o => 
        (!filters.Type || o.OutReach_Type === filters.Type) &&
        (!filters.Name || o.OutReach_Holder === filters.Name) &&
        (!filters.Position || o.Position_Achieved === filters.Position)
      );
    }
    return [];
  };

  const filteredData = getFilteredData();

  // 3. Multi-Select Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const ids = filteredData.map(item => 'Achieve_Id' in item ? item.Achieve_Id : item.OutReach_Id);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // 4. Export Logic (Selected or Filtered)
  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 
      ? filteredData.filter(item => selectedIds.has('Achieve_Id' in item ? item.Achieve_Id : item.OutReach_Id))
      : filteredData;

    if (dataToExport.length === 0) return alert("No data to export.");
    if (!window.confirm(`Export ${dataToExport.length} rows?`)) return;

    let headers: string[] = [];
    if (activeTab === "Achievements") {
      headers = ["StnAddNo", "Achievement_Title", "Achievement_Type", "Position_Achieved", "Achieve_Descriptin", "Point_Obtained"];
    } else {
      headers = ["StnAddNo", "OutReach_Title", "OutReach_Type", "Position_Achieved", "OutReach_Descriptin", "Point_Obtained"];
    }

    const csvContent = [
      headers.join(","),
      ...dataToExport.map((row: any) => {
        return headers.map(h => {
          const val = row[h] || row[h.replace("Title", "Title")] || 0; // Quick mapping safeguard
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}_Data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 5. Delete Logic
  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} records?`)) return;

    const table = activeTab === "Achievements" ? "StudentsAchievements" : "StudentsOutReach";
    const idColumn = activeTab === "Achievements" ? "Achieve_Id" : "OutReach_Id";

    try {
      const { error } = await SupaBaseFunction
        .from(table)
        .delete()
        .in(idColumn, Array.from(selectedIds));

      if (error) throw error;
      
      alert(`Successfully deleted ${selectedIds.size} records.`);
      setSelectedIds(new Set());
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to delete records.");
    }
  };

  // 6. Import CSV Parsing Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").filter(row => row.trim() !== "");
      // Skip header row
      const dataRows = rows.slice(1).map(row => {
        const values = row.split(",").map(v => v.replace(/^"|"$/g, '').trim());
        if (importType === "Achievement") {
          return {
            StnAddNo: values[0], Achievement_Title: values[1], Achievement_Type: values[2],
            Position_Achieved: values[3], Achieve_Descriptin: values[4], Point_Obtained: parseInt(values[5]) || 0
          };
        } else {
          return {
            StnAddNo: values[0], OutReach_Title: values[1], OutReach_Type: values[2],
            Position_Achieved: values[3], OutReach_Descriptin: values[4], Point_Obtained: parseInt(values[5]) || 0
          };
        }
      });
      setImportPreview(dataRows);
    };
    reader.readAsText(file);
  };

  // 7. Core Database Update Logic (Complex)
  const confirmImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);

    try {
      // Step 1: Group points and counts by Student ID for the StudentsBox update
      const studentUpdates = new Map<string, { points: number, count: number }>();
      
      importPreview.forEach(row => {
        if (!row.StnAddNo) return;
        const current = studentUpdates.get(row.StnAddNo) || { points: 0, count: 0 };
        studentUpdates.set(row.StnAddNo, {
          points: current.points + row.Point_Obtained,
          count: current.count + 1
        });
      });

      // Step 2: Insert into respective child table
      const table = importType === "Achievement" ? "StudentsAchievements" : "StudentsOutReach";
      const { error: insertError } = await SupaBaseFunction.from(table).insert(importPreview);
      if (insertError) throw insertError;

      // Step 3: Fetch existing students to calculate new totals accurately
      const studentIds = Array.from(studentUpdates.keys());
      const { data: students, error: studentError } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, OutReach_Count, OutReach_Points, Achievements_Counts, Achievements_Points, Grand_Total_Points")
        .in("AddNo", studentIds);

      if (studentError) throw studentError;

      // Step 4: Prepare and execute updates for StudentsBox
      const updates = (students as Student[]).map(stn => {
        const incoming = studentUpdates.get(stn.AddNo)!;
        
        if (importType === "Outreach") {
          const newPoints = (stn.OutReach_Points || 0) + incoming.points;
          return {
            AddNo: stn.AddNo,
            OutReach_Count: (stn.OutReach_Count || 0) + incoming.count,
            OutReach_Points: newPoints,
            Grand_Total_Points: (stn.Grand_Total_Points || 0) + incoming.points
          };
        } else {
          const newPoints = (stn.Achievements_Points || 0) + incoming.points;
          return {
            AddNo: stn.AddNo,
            Achievements_Counts: (stn.Achievements_Counts || 0) + incoming.count,
            Achievements_Points: newPoints,
            Grand_Total_Points: (stn.Grand_Total_Points || 0) + incoming.points
          };
        }
      });

      // Upsert the updated student data
      const { error: updateError } = await SupaBaseFunction.from("StudentsBox").upsert(updates);
      if (updateError) throw updateError;

      alert(`Successfully imported ${importPreview.length} records and updated student points!`);
      setImportType(null);
      setImportPreview([]);
      fetchData(); // Refresh all data

    } catch (error) {
      console.error("Import Error:", error);
      alert("An error occurred during import. Check console.");
    } finally {
      setImporting(false);
    }
  };


  // --- Analytics Processing ---
  const kpiTotalAchPts = achievements.reduce((sum, a) => sum + (a.Point_Obtained || 0), 0);
  const kpiTotalOutPts = outreach.reduce((sum, o) => sum + (o.Point_Obtained || 0), 0);

  const achieveTypeData = getUnique(achievements, "Achievement_Type").map(type => ({
    name: type,
    value: achievements.filter(a => a.Achievement_Type === type).length
  }));

  const outReachTypeData = getUnique(outreach, "OutReach_Type").map(type => ({
    name: type,
    points: outreach.filter(o => o.OutReach_Type === type).reduce((sum, o) => sum + (o.Point_Obtained || 0), 0)
  })).sort((a, b) => b.points - a.points).slice(0, 6);

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading Engagement Data...</div>;

  return (
    <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
      {/* IMPORT MODAL PREVIEW */}
      {importType && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "24px" }}>
          <div style={{ backgroundColor: "#fff", padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>Import {importType} Data</h2>
            <p style={{ color: "#64748b", fontSize: "14px", backgroundColor: "#f1f5f9", padding: "12px", borderRadius: "8px", fontFamily: "monospace" }}>
              <b>Required CSV Columns (in exact order):</b><br/>
              {importType === "Achievement" 
                ? "StnAddNo, Achievement_Title, Achievement_Type, Position_Achieved, Achieve_Descriptin, Point_Obtained"
                : "StnAddNo, OutReach_Title, OutReach_Type, Position_Achieved, OutReach_Descriptin, Point_Obtained"}
            </p>
            
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ marginBottom: "20px" }} />
            
            {importPreview.length > 0 && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "auto", maxHeight: "300px", marginBottom: "20px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead style={{ backgroundColor: "#f8fafc", position: "sticky", top: 0 }}>
                    <tr>{Object.keys(importPreview[0]).map(k => <th key={k} style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}><td colSpan={100} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{row.StnAddNo} - {row.Point_Obtained} pts...</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => { setImportType(null); setImportPreview([]); }} style={{ ...actionBtnStyle, backgroundColor: "#e2e8f0", color: "#334155" }}>Cancel</button>
              <button onClick={confirmImport} disabled={importing || importPreview.length === 0} style={{ ...actionBtnStyle, backgroundColor: "#10b981", color: "#fff" }}>
                {importing ? "Saving & Updating Students..." : `Save ${importPreview.length} Records to DB`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#0f172a", fontWeight: 700 }}>Student External Engagement</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
            <b>CSV Import Formats:</b><br/>
            Outreach: <span style={{fontFamily: "monospace"}}>StnAddNo, Title, Type, Position, Description, Points</span><br/>
            Achievements: <span style={{fontFamily: "monospace"}}>StnAddNo, Title, Type, Position, Description, Points</span>
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
            <button onClick={() => setActiveTab("Analytics")} style={{...tabStyleBase, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f172a" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>Analytics</button>
            <button onClick={() => setActiveTab("Outreach")} style={{...tabStyleBase, backgroundColor: activeTab === "Outreach" ? "#fff" : "transparent", color: activeTab === "Outreach" ? "#0ea5e9" : "#64748b", boxShadow: activeTab === "Outreach" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>Outreach Directory</button>
            <button onClick={() => setActiveTab("Achievements")} style={{...tabStyleBase, backgroundColor: activeTab === "Achievements" ? "#fff" : "transparent", color: activeTab === "Achievements" ? "#ec4899" : "#64748b", boxShadow: activeTab === "Achievements" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>Achievements Directory</button>
          </div>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={kpiCardStyle}><div style={kpiTitleStyle}>Total Outreach Entries</div><div style={kpiValueStyle}>{outreach.length}</div></div>
            <div style={kpiCardStyle}><div style={kpiTitleStyle}>Total Achievement Entries</div><div style={kpiValueStyle}>{achievements.length}</div></div>
            <div style={kpiCardStyle}><div style={kpiTitleStyle}>Total Outreach Points</div><div style={{...kpiValueStyle, color: "#0ea5e9"}}>{kpiTotalOutPts}</div></div>
            <div style={kpiCardStyle}><div style={kpiTitleStyle}>Total Achievement Points</div><div style={{...kpiValueStyle, color: "#ec4899"}}>{kpiTotalAchPts}</div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
            <div style={cardStyle}>
              <h3 style={chartTitleStyle}>Achievement Distribution by Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={achieveTypeData} cx="40%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                    {achieveTypeData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <h3 style={chartTitleStyle}>Top Outreach Types by Points Awarded</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={outReachTypeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="points" name="Total Points" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        /* DIRECTORY VIEWS (Outreach & Achievements) */
        <>
          {/* Action & Filter Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "20px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "12px", flex: 1 }}>
              <select name="Type" value={filters.Type} onChange={(e) => setFilters({...filters, Type: e.target.value})} style={selectStyle}>
                <option value="">All Types</option>
                {getUnique(activeTab === "Achievements" ? achievements : outreach, activeTab === "Achievements" ? "Achievement_Type" : "OutReach_Type").map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select name="Name" value={filters.Name} onChange={(e) => setFilters({...filters, Name: e.target.value})} style={selectStyle}>
                <option value="">All Names / Holders</option>
                {getUnique(activeTab === "Achievements" ? achievements : outreach, activeTab === "Achievements" ? "Achiever_Name" : "OutReach_Holder").map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select name="Position" value={filters.Position} onChange={(e) => setFilters({...filters, Position: e.target.value})} style={selectStyle}>
                <option value="">All Positions</option>
                {getUnique(activeTab === "Achievements" ? achievements : outreach, "Position_Achieved").map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b", alignSelf: "center" }}>{selectedIds.size} Selected</span>
                  <button onClick={handleDelete} style={{ ...actionBtnStyle, backgroundColor: "#ef4444", color: "#fff" }}>Delete Selected</button>
                  <button onClick={handleExport} style={{ ...actionBtnStyle, backgroundColor: "#4f46e5", color: "#fff" }}>Export Selected</button>
                </>
              )}
              {selectedIds.size === 0 && (
                <>
                  <button onClick={() => setImportType(activeTab === "Achievements" ? "Achievement" : "Outreach")} style={{ ...actionBtnStyle, backgroundColor: "#10b981", color: "#fff" }}>
                    + Import CSV
                  </button>
                  <button onClick={handleExport} style={{ ...actionBtnStyle, backgroundColor: "#4f46e5", color: "#fff" }}>Export All (Filtered)</button>
                </>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
                  <tr>
                    <th style={{ ...thStyle, width: "50px" }}>
                      <input 
                        type="checkbox" 
                        checked={filteredData.length > 0 && selectedIds.size === filteredData.length} 
                        onChange={handleSelectAll} 
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </th>
                    <th style={thStyle}>Identity (AddNo / Name)</th>
                    <th style={thStyle}>Title & Type</th>
                    <th style={thStyle}>Position</th>
                    <th style={thStyle}>Points Awarded</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => {
                    const isAchievement = 'Achieve_Id' in row;
                    const id = isAchievement ? row.Achieve_Id : row.OutReach_Id;
                    const title = isAchievement ? row.Achievement_Title : row.OutReach_Title;
                    const type = isAchievement ? row.Achievement_Type : row.OutReach_Type;
                    const name = isAchievement ? row.Achiever_Name : row.OutReach_Holder;

                    return (
                      <tr key={id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: selectedIds.has(id) ? "#f0fdfa" : (idx % 2 === 0 ? "#fff" : "#f8fafc") }}>
                        <td style={tdStyle}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(id)} 
                            onChange={() => handleSelect(id)} 
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{name || 'Unknown'}</div>
                          <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>#{row.StnAddNo}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500, color: "#334155" }}>{title}</div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{type}</div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ backgroundColor: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "13px", color: "#475569" }}>
                            {row.Position_Achieved || 'N/A'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ backgroundColor: isAchievement ? "#fce7f3" : "#e0f2fe", color: isAchievement ? "#be185d" : "#0369a1", padding: "6px 12px", borderRadius: "999px", fontWeight: 700, fontSize: "14px" }}>
                            +{row.Point_Obtained || 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No records match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Inline Styles typed as React.CSSProperties ---

const tabStyleBase: React.CSSProperties = { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.2s" };
const selectStyle: React.CSSProperties = { padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer", minWidth: "160px" };
const actionBtnStyle: React.CSSProperties = { border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" };
const cardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" };
const chartTitleStyle: React.CSSProperties = { margin: "0 0 20px 0", fontSize: "16px", color: "#334155", fontWeight: 600 };
const kpiCardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
const kpiTitleStyle: React.CSSProperties = { fontSize: "13px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" };
const kpiValueStyle: React.CSSProperties = { fontSize: "28px", color: "#0f172a", fontWeight: 700, marginTop: "8px" };
const thStyle: React.CSSProperties = { padding: "16px", fontWeight: 600, borderBottom: "2px solid #e2e8f0" };
const tdStyle: React.CSSProperties = { padding: "16px", color: "#334155", fontSize: "14px", verticalAlign: "middle" };