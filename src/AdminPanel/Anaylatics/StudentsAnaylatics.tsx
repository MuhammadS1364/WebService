
// export default function StudentsAnaylaticsGeneral(){
//     return(

//     )
// }

// create table public."StudentsBox" (
//   "AddNo" character varying not null,
//   "StudentName" character varying null,
//   "StudentEmail" character varying null,
//   "FatherName" character varying null,
//   "CollegeName" character varying null,
//   "StnUserId" character varying null,
//   "Class" character varying null,
//   "Registration_Count" integer null default 0,
//   "Resluted_Count" integer null default 0,
//   "Total_Point_Anjuman" integer null default 0,
//   "OutReach_Count" integer null default 0,
//   "OutReach_Points" integer null default 0,
//   "Achievements_Counts" integer null default 0,
//   "Achievements_Points" integer null default 0,
//   "Grand_Total_Points" integer null default 0,
//   "IsActive" boolean null default true,
//   "Student_Photo_Urls" character varying null default 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRO1QLsyDIL5S8tTQ5ZKXjFe9wxiVZ7O9-lOnJgJO3-Bg&s=10'::character varying,
//   "StnState" character varying null default 'No Provided'::character varying,
//   "StnDistrict" character varying null default 'No Provided'::character varying,
//   constraint StudentsBox_pkey primary key ("AddNo")
// ) TABLESPACE pg_default;
// create table public."StudentsAchievements" (
//   "Achieve_Id" uuid not null default gen_random_uuid (),
//   "Achiever_Name" character varying null,
//   "Achievement_Title" character varying null,
//   "Achievement_Type" character varying null,
//   "Position_Achieved" character varying null,
//   "Achieve_Descriptin" text null,
//   "Point_Obtained" integer null default 0,
//   "StnAddNo" character varying null,
//   constraint StudentsAchievements_pkey primary key ("Achieve_Id")
// ) TABLESPACE pg_default;

// create table public."StudentsOutReach" (
//   "OutReach_Id" uuid not null default gen_random_uuid (),
//   created_at time without time zone not null,
//   "OutReach_Holder" character varying null,
//   "OutReach_Title" character varying null,
//   "OutReach_Type" character varying null,
//   "Position_Achieved" character varying null,
//   "OutReach_Descriptin" text null,
//   "Point_Obtained" integer null default 0,
//   "StnAddNo" character varying null,
//   constraint StudentsOutReach_pkey primary key ("OutReach_Id")
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

// create table public."CandidateRegistrationTable" (
//   "CandidateUUiD" uuid not null default gen_random_uuid (),
//   "Program_Code" character varying null,
//   "Candidate_Code" character varying null,
//   constraint CandidateRegistrationTable_pkey primary key ("CandidateUUiD")
// ) TABLESPACE pg_default;

// // these table for student data , 

// // creater filter for these coluns , 
// //  class, state, district, 
// // and that y feel need to filte in colun , data export featu , as in the abouve comont 


// import React, { useState, useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
//   PieChart, Pie, Cell,
//   AreaChart, Area
// } from "recharts";

// // Vibrant, modern color palette for data visualization
// const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

// export default function StudentsAnaylaticsGeneral() {
//   // State Management
//   const [students, setStudents] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [activeTab, setActiveTab] = useState("Analytics");
//   const [loading, setLoading] = useState(true);

//   // Filter States
//   const [filters, setFilters] = useState({
//     Class: "",
//     StnState: "",
//     StnDistrict: "",
//     IsActive: ""
//   });

//   // Unique values for filter dropdowns
//   const [filterOptions, setFilterOptions] = useState({
//     classes: [],
//     states: [],
//     districts: []
//   });

//   // 1. Fetch Data
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         // Fetch Students Main Data
//         const { data: stnData, error: stnError } = await SupaBaseFunction
//           .from("StudentsBox")
//           .select("*");

//         if (stnError) throw stnError;

//         setStudents(stnData || []);
        
//         // Extract unique values for filters
//         setFilterOptions({
//           classes: [...new Set(stnData.map(s => s.Class).filter(Boolean))],
//           states: [...new Set(stnData.map(s => s.StnState).filter(s => s && s !== 'No Provided'))],
//           districts: [...new Set(stnData.map(s => s.StnDistrict).filter(s => s && s !== 'No Provided'))]
//         });

//       } catch (error) {
//         console.error("Error fetching student data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // 2. Apply Filters
//   useEffect(() => {
//     let result = students;

//     if (filters.Class) result = result.filter(s => s.Class === filters.Class);
//     if (filters.StnState) result = result.filter(s => s.StnState === filters.StnState);
//     if (filters.StnDistrict) result = result.filter(s => s.StnDistrict === filters.StnDistrict);
//     if (filters.IsActive !== "") {
//       const isActiveBool = filters.IsActive === "true";
//       result = result.filter(s => s.IsActive === isActiveBool);
//     }

//     setFilteredData(result);
//   }, [filters, students]);

//   // 3. Export to CSV Logic
//   const handleExport = () => {
//     const isFiltered = Object.values(filters).some(val => val !== "");
    
//     const message = isFiltered 
//       ? `You have active filters. Do you want to export ONLY the ${filteredData.length} selected rows?`
//       : `No filters applied. Export ALL ${filteredData.length} rows?`;

//     if (window.confirm(message)) {
//       const headers = [
//         "Admission_No", "Student_Name", "Class", "College_Name", "State", 
//         "District", "Grand_Total_Points", "Registrations", "Achievements", "OutReach", "IsActive"
//       ];

//       const csvContent = [
//         headers.join(","),
//         ...filteredData.map(row => {
//           return [
//             `"${row.AddNo || ''}"`,
//             `"${row.StudentName || ''}"`,
//             `"${row.Class || ''}"`,
//             `"${row.CollegeName || ''}"`,
//             `"${row.StnState || ''}"`,
//             `"${row.StnDistrict || ''}"`,
//             row.Grand_Total_Points || 0,
//             row.Registration_Count || 0,
//             row.Achievements_Counts || 0,
//             row.OutReach_Count || 0,
//             row.IsActive ? "Yes" : "No"
//           ].join(",");
//         })
//       ].join("\n");

//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);
//       link.setAttribute("href", url);
//       link.setAttribute("download", `Student_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     }
//   };

//   const handleFilterChange = (e) => {
//     setFilters({ ...filters, [e.target.name]: e.target.value });
//   };

//   // --- Analytics Data Processing ---

//   // 1. Pie Chart: Students by Class
//   const classDistribution = Object.values(filteredData.reduce((acc, curr) => {
//     const className = curr.Class || "Unassigned";
//     acc[className] = acc[className] || { name: className, value: 0 };
//     acc[className].value += 1;
//     return acc;
//   }, {}));

//   // 2. Bar Chart: Top Regions (States)
//   const stateDistribution = Object.values(filteredData.reduce((acc, curr) => {
//     const state = (curr.StnState && curr.StnState !== 'No Provided') ? curr.StnState : "Other";
//     acc[state] = acc[state] || { name: state, students: 0, avgPoints: 0, totalPoints: 0 };
//     acc[state].students += 1;
//     acc[state].totalPoints += (curr.Grand_Total_Points || 0);
//     return acc;
//   }, {})).map(s => ({ ...s, avgPoints: Math.round(s.totalPoints / s.students) }))
//     .sort((a, b) => b.students - a.students).slice(0, 7); // Top 7 states

//   // 3. Area Chart: Engagement Overview (Points vs Registrations across classes)
//   const engagementByClass = Object.values(filteredData.reduce((acc, curr) => {
//     const className = curr.Class || "Unassigned";
//     acc[className] = acc[className] || { name: className, points: 0, registrations: 0 };
//     acc[className].points += (curr.Grand_Total_Points || 0);
//     acc[className].registrations += (curr.Registration_Count || 0);
//     return acc;
//   }, {}));

//   // KPI Calculations
//   const totalPoints = filteredData.reduce((sum, s) => sum + (s.Grand_Total_Points || 0), 0);
//   const totalRegistrations = filteredData.reduce((sum, s) => sum + (s.Registration_Count || 0), 0);
//   const activeStudents = filteredData.filter(s => s.IsActive).length;

//   if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Crunching student data...</div>;

//   return (
//     <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
//       {/* HEADER SECTION */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//         <div>
//           <h2 style={{ margin: 0, fontSize: "24px", color: "#1e293b", fontWeight: "700" }}>Student General Analytics</h2>
//           <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Comprehensive view of student performance, engagement, and demographics.</p>
//         </div>
//         <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          
//           <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
//             <button 
//               onClick={() => setActiveTab("List")}
//               style={{ ...tabBtnStyle, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f172a" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
//             >
//               List View
//             </button>
//             <button 
//               onClick={() => setActiveTab("Analytics")}
//               style={{ ...tabBtnStyle, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f172a" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
//             >
//               Analytics
//             </button>
//           </div>

//           <button onClick={handleExport} style={exportBtnStyle}>
//             Export CSV ({filteredData.length})
//           </button>
//         </div>
//       </div>

//       {/* FILTER SECTION */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
        
//         <div style={filterGroupStyle}>
//           <label style={labelStyle}>Class / Grade</label>
//           <select name="Class" value={filters.Class} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Classes</option>
//             {filterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
//           </select>
//         </div>

//         <div style={filterGroupStyle}>
//           <label style={labelStyle}>State</label>
//           <select name="StnState" value={filters.StnState} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All States</option>
//             {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
//           </select>
//         </div>

//         <div style={filterGroupStyle}>
//           <label style={labelStyle}>District</label>
//           <select name="StnDistrict" value={filters.StnDistrict} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Districts</option>
//             {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
//           </select>
//         </div>

//         <div style={filterGroupStyle}>
//           <label style={labelStyle}>Status</label>
//           <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Students (Active & Inactive)</option>
//             <option value="true">Active Only</option>
//             <option value="false">Inactive Only</option>
//           </select>
//         </div>

//       </div>

//       {/* DYNAMIC CONTENT AREA */}
//       {activeTab === "Analytics" ? (
//         <>
//           {/* KPI CARDS */}
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
//             <div style={kpiCardStyle}>
//               <div style={kpiTitleStyle}>Total Students</div>
//               <div style={kpiValueStyle}>{filteredData.length}</div>
//             </div>
//             <div style={kpiCardStyle}>
//               <div style={kpiTitleStyle}>Active Students</div>
//               <div style={{...kpiValueStyle, color: "#10b981"}}>{activeStudents}</div>
//             </div>
//             <div style={kpiCardStyle}>
//               <div style={kpiTitleStyle}>Total Points Accumulated</div>
//               <div style={{...kpiValueStyle, color: "#8b5cf6"}}>{totalPoints.toLocaleString()}</div>
//             </div>
//             <div style={kpiCardStyle}>
//               <div style={kpiTitleStyle}>Total Program Registrations</div>
//               <div style={{...kpiValueStyle, color: "#3b82f6"}}>{totalRegistrations.toLocaleString()}</div>
//             </div>
//           </div>

//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px" }}>
            
//             {/* PIE CHART: Class Demographics */}
//             <div style={cardStyle}>
//               <h3 style={chartTitleStyle}>Student Distribution by Class</h3>
//               <ResponsiveContainer width="100%" height={300}>
//                 <PieChart>
//                   <Pie data={classDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" label>
//                     {classDistribution.map((entry, index) => (
//                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <RechartsTooltip contentStyle={tooltipStyle} />
//                   <Legend iconType="circle" />
//                 </PieChart>
//               </ResponsiveContainer>
//             </div>

//             {/* BAR CHART: Regional Stats */}
//             <div style={cardStyle}>
//               <h3 style={chartTitleStyle}>Top States by Student Count</h3>
//               <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={stateDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
//                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                   <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
//                   <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                   <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={tooltipStyle} />
//                   <Bar dataKey="students" name="Total Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>

//             {/* AREA CHART: Engagement Overview */}
//             <div style={{...cardStyle, gridColumn: "1 / -1"}}>
//               <h3 style={chartTitleStyle}>Class Engagement (Points vs Registrations)</h3>
//               <ResponsiveContainer width="100%" height={300}>
//                 <AreaChart data={engagementByClass} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
//                   <defs>
//                     <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
//                       <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
//                     </linearGradient>
//                     <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
//                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
//                     </linearGradient>
//                   </defs>
//                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                   <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                   <YAxis yAxisId="left" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                   <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                   <RechartsTooltip contentStyle={tooltipStyle} />
//                   <Legend />
//                   <Area yAxisId="left" type="monotone" dataKey="points" name="Total Points" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPoints)" />
//                   <Area yAxisId="right" type="monotone" dataKey="registrations" name="Registrations" stroke="#10b981" fillOpacity={1} fill="url(#colorReg)" />
//                 </AreaChart>
//               </ResponsiveContainer>
//             </div>

//           </div>
//         </>
//       ) : (
//         /* TABLE LIST VIEW */
//         <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
//               <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
//                 <tr>
//                   <th style={thStyle}>Student Info</th>
//                   <th style={thStyle}>Class</th>
//                   <th style={thStyle}>Location</th>
//                   <th style={thStyle}>Total Points</th>
//                   <th style={thStyle}>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.map((stn, idx) => (
//                   <tr key={stn.AddNo} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
//                     <td style={tdStyle}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                         <img src={stn.Student_Photo_Urls} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
//                         <div>
//                           <div style={{ fontWeight: "600", color: "#0f172a" }}>{stn.StudentName}</div>
//                           <div style={{ fontSize: "12px", color: "#64748b" }}>{stn.AddNo}</div>
//                         </div>
//                       </div>
//                     </td>
//                     <td style={tdStyle}>{stn.Class || 'N/A'}</td>
//                     <td style={tdStyle}>
//                       <div style={{ color: "#0f172a" }}>{stn.StnDistrict === 'No Provided' ? 'Unknown' : stn.StnDistrict}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{stn.StnState === 'No Provided' ? 'Unknown' : stn.StnState}</div>
//                     </td>
//                     <td style={tdStyle}>
//                       <span style={{ backgroundColor: "#f3e8ff", color: "#7e22ce", padding: "4px 10px", borderRadius: "999px", fontWeight: "600", fontSize: "12px" }}>
//                         {stn.Grand_Total_Points || 0} pts
//                       </span>
//                     </td>
//                     <td style={tdStyle}>
//                       {stn.IsActive 
//                         ? <span style={{ color: "#10b981", fontWeight: "600", fontSize: "14px", display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#10b981'}}></div> Active</span>
//                         : <span style={{ color: "#ef4444", fontWeight: "600", fontSize: "14px", display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#ef4444'}}></div> Inactive</span>
//                       }
//                     </td>
//                   </tr>
//                 ))}
//                 {filteredData.length === 0 && (
//                   <tr>
//                     <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No students match your current filters.</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // --- Inline UI/UX Styles ---

// const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer", width: "100%", boxSizing: "border-box", height: "42px" };
// const labelStyle = { fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px" };
// const filterGroupStyle = { display: "flex", flexDirection: "column" };
// const tabBtnStyle = { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" };
// const exportBtnStyle = { backgroundColor: "#8b5cf6", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(139, 92, 246, 0.3)" };
// const cardStyle = { backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" };
// const chartTitleStyle = { margin: "0 0 20px 0", fontSize: "16px", color: "#334155", fontWeight: "600" };
// const kpiCardStyle = { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
// const kpiTitleStyle = { fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" };
// const kpiValueStyle = { fontSize: "28px", color: "#0f172a", fontWeight: "700", marginTop: "8px" };
// const tooltipStyle = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: '#fff', padding: '12px' };
// const thStyle = { padding: "16px", fontWeight: "600", borderBottom: "2px solid #e2e8f0" };
// const tdStyle = { padding: "16px", color: "#334155", fontSize: "14px", verticalAlign: "middle" };

// mindblowing compontent



import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Adjust path as needed
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Line, Area
} from "recharts";

// Vibrant Teal/Emerald Theme for Students Dashboard
const COLORS = ['#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4'];

export default function StudentsAnalyticsGeneral() {
  // State Management
  const [students, setStudents] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [activeTab, setActiveTab] = useState("Analytics");
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filters, setFilters] = useState({
    Class: "",
    StnState: "",
    StnDistrict: "",
    CollegeName: "",
    IsActive: "true"
  });

  // Unique Options for Dropdowns
  const [filterOptions, setFilterOptions] = useState({
    classes: [],
    states: [],
    districts: [],
    colleges: []
  });

  // 1. Fetch Student Data
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // Fetching from StudentsBox - it already contains aggregated counts/points!
        const { data, error } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*");

        if (error) throw error;

        const studentData = data || [];
        setStudents(studentData);
        
        // Extract unique options, filtering out nulls/Not Provided
        const extractUnique = (key) => [...new Set(studentData.map(s => s[key]).filter(v => v && v !== 'No Provided'))].sort();
        
        setFilterOptions({
          classes: extractUnique("Class"),
          states: extractUnique("StnState"),
          districts: extractUnique("StnDistrict"),
          colleges: extractUnique("CollegeName")
        });

      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // 2. Apply Filters
  useEffect(() => {
    let result = students;

    if (filters.Class) result = result.filter(s => s.Class === filters.Class);
    if (filters.StnState) result = result.filter(s => s.StnState === filters.StnState);
    if (filters.StnDistrict) result = result.filter(s => s.StnDistrict === filters.StnDistrict);
    if (filters.CollegeName) result = result.filter(s => s.CollegeName === filters.CollegeName);
    
    if (filters.IsActive !== "all") {
      const isActiveBool = filters.IsActive === "true";
      result = result.filter(s => s.IsActive === isActiveBool);
    }

    setFilteredData(result);
  }, [filters, students]);

  // 3. CSV Export Logic
  const handleExport = () => {
    const isFiltered = Object.values(filters).some(val => val !== "" && val !== "all");
    const message = isFiltered 
      ? `You have active filters. Export ${filteredData.length} filtered students?`
      : `Export all ${filteredData.length} students?`;

    if (window.confirm(message)) {
      const headers = [
        "AddNo", "StudentName", "StudentEmail", "CollegeName", "Class", 
        "State", "District", "Registrations", "Total_Anjuman_Points", 
        "OutReach_Points", "Achievement_Points", "Grand_Total_Points", "IsActive"
      ];

      const csvContent = [
        headers.join(","),
        ...filteredData.map(row => [
          `"${row.AddNo || ''}"`,
          `"${row.StudentName || ''}"`,
          `"${row.StudentEmail || ''}"`,
          `"${row.CollegeName || ''}"`,
          `"${row.Class || ''}"`,
          `"${row.StnState || ''}"`,
          `"${row.StnDistrict || ''}"`,
          row.Registration_Count || 0,
          row.Total_Point_Anjuman || 0,
          row.OutReach_Points || 0,
          row.Achievements_Points || 0,
          row.Grand_Total_Points || 0,
          row.IsActive || false
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Students_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // --- Analytics Data Processing ---
  
  // 1. Points by Class (Bar Chart)
  const pointsByClass = Object.values(filteredData.reduce((acc, curr) => {
    const className = curr.Class || "Unassigned";
    acc[className] = acc[className] || { name: className, totalPoints: 0, studentCount: 0 };
    acc[className].totalPoints += (curr.Grand_Total_Points || 0);
    acc[className].studentCount += 1;
    return acc;
  }, {})).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10); // Top 10 classes

  // 2. Geographic Distribution by District (Pie Chart)
  const studentsByDistrict = Object.values(filteredData.reduce((acc, curr) => {
    const district = curr.StnDistrict && curr.StnDistrict !== 'No Provided' ? curr.StnDistrict : "Unknown";
    acc[district] = acc[district] || { name: district, value: 0 };
    acc[district].value += 1;
    return acc;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 6); // Top 6 districts for cleaner pie

  // 3. Top 5 Performing Students (Composed Chart)
  const topStudents = [...filteredData]
    .sort((a, b) => (b.Grand_Total_Points || 0) - (a.Grand_Total_Points || 0))
    .slice(0, 5)
    .map(s => ({
      name: s.StudentName || s.AddNo,
      total: s.Grand_Total_Points || 0,
      achievements: s.Achievements_Points || 0,
      outreach: s.OutReach_Points || 0
    }));

  if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Student Analytics...</div>;

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0fdfa", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#0f766e", fontWeight: "700" }}>Student Performance Analytics</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Monitor achievements, outreach, and engagement across all students.</p>
        </div>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
            <button 
              onClick={() => setActiveTab("List")}
              style={{ ...tabStyle, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f766e" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
            >
              Directory
            </button>
            <button 
              onClick={() => setActiveTab("Analytics")}
              style={{ ...tabStyle, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f766e" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
            >
              Analytics
            </button>
          </div>

          <button onClick={handleExport} style={exportBtnStyle}>
            Export CSV ({filteredData.length})
          </button>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
        <select name="Class" value={filters.Class} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Classes</option>
          {filterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select name="CollegeName" value={filters.CollegeName} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Colleges</option>
          {filterOptions.colleges.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select name="StnState" value={filters.StnState} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All States</option>
          {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select name="StnDistrict" value={filters.StnDistrict} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Districts</option>
          {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} style={selectStyle}>
          <option value="all">Status: All</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          
          {/* BAR CHART: Points by Class */}
          <div style={cardStyle}>
            <h3 style={chartTitleStyle}>Total Points by Class (Top 10)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pointsByClass} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f0fdfa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="totalPoints" name="Total Points" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PIE CHART: Geographic Spread */}
          <div style={cardStyle}>
            <h3 style={chartTitleStyle}>Student Distribution by District</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={studentsByDistrict} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {studentsByDistrict.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* COMPOSED CHART: Top 5 Performers Profile */}
          <div style={{...cardStyle, gridColumn: "1 / -1"}}>
            <h3 style={chartTitleStyle}>Top 5 Outstanding Students (Point Breakdown)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Legend />
                <Area type="monotone" dataKey="total" name="Grand Total" fill="#cffafe" stroke="#0ea5e9" />
                <Bar dataKey="achievements" name="Achievement Pts" barSize={40} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="outreach" name="Outreach Pts" stroke="#8b5cf6" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
                <tr>
                  <th style={thStyle}>Student Info</th>
                  <th style={thStyle}>Class / College</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Engagement</th>
                  <th style={thStyle}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((student, idx) => (
                  <tr key={student.AddNo} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={student.Student_Photo_Urls} 
                          alt={student.StudentName} 
                          style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/40' }}
                        />
                        <div>
                          <div style={{ fontWeight: "600", color: "#0f172a" }}>{student.StudentName}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>#{student.AddNo}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: "500", color: "#334155" }}>{student.Class || 'N/A'}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{student.CollegeName || 'N/A'}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: "500" }}>{student.StnDistrict === 'No Provided' ? 'N/A' : student.StnDistrict}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{student.StnState === 'No Provided' ? '' : student.StnState}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: "13px" }}>Reg: <b>{student.Registration_Count}</b></div>
                      <div style={{ fontSize: "13px" }}>Outreach: <b>{student.OutReach_Count}</b></div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ backgroundColor: "#d1fae5", color: "#047857", padding: "6px 12px", borderRadius: "999px", fontWeight: "700", fontSize: "14px" }}>
                        {student.Grand_Total_Points || 0}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No students match your current filters.</td>
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

// --- Inline Styles ---
const selectStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: "14px",
  outline: "none",
  cursor: "pointer"
};

const tabStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.2s"
};

const exportBtnStyle = {
  backgroundColor: "#0d9488", 
  color: "#fff", 
  border: "none", 
  padding: "10px 20px", 
  borderRadius: "8px", 
  fontWeight: "600", 
  cursor: "pointer",
  boxShadow: "0 4px 6px -1px rgba(13, 148, 136, 0.2)"
};

const cardStyle = {
  backgroundColor: "#fff",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  border: "1px solid #f1f5f9"
};

const chartTitleStyle = {
  margin: "0 0 20px 0",
  fontSize: "16px",
  color: "#334155",
  fontWeight: "600"
};

const thStyle = {
  padding: "16px",
  fontWeight: "600",
  borderBottom: "2px solid #e2e8f0"
};

const tdStyle = {
  padding: "16px",
  color: "#334155",
  fontSize: "14px",
  verticalAlign: "middle"
};

// selected alos




// import React, { useState, useEffect } from "react";
// // @ts-ignore - Assuming SupaBaseFunction is correctly configured in your lib
// import { SupaBaseFunction } from "../../lib/SupaBase"; 
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
//   PieChart, Pie, Cell,
//   ComposedChart, Line, Area
// } from "recharts";

// // --- TypeScript Interfaces ---

// export interface Student {
//   AddNo: string;
//   StudentName: string | null;
//   StudentEmail: string | null;
//   FatherName: string | null;
//   CollegeName: string | null;
//   StnUserId: string | null;
//   Class: string | null;
//   Registration_Count: number | null;
//   Resluted_Count: number | null;
//   Total_Point_Anjuman: number | null;
//   OutReach_Count: number | null;
//   OutReach_Points: number | null;
//   Achievements_Counts: number | null;
//   Achievements_Points: number | null;
//   Grand_Total_Points: number | null;
//   IsActive: boolean | null;
//   Student_Photo_Urls: string | null;
//   StnState: string | null;
//   StnDistrict: string | null;
// }

// interface Filters {
//   Class: string;
//   StnState: string;
//   StnDistrict: string;
//   CollegeName: string;
//   IsActive: string;
// }

// interface FilterOptions {
//   classes: string[];
//   states: string[];
//   districts: string[];
//   colleges: string[];
// }

// // Vibrant Teal/Emerald Theme for Students Dashboard
// const COLORS = ['#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4'];

// export default function StudentsAnalyticsGeneral() {
//   // State Management with Types
//   const [students, setStudents] = useState<Student[]>([]);
//   const [filteredData, setFilteredData] = useState<Student[]>([]);
//   const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
//   const [loading, setLoading] = useState<boolean>(true);

//   // Filter States
//   const [filters, setFilters] = useState<Filters>({
//     Class: "",
//     StnState: "",
//     StnDistrict: "",
//     CollegeName: "",
//     IsActive: "true"
//   });

//   // Unique Options for Dropdowns
//   const [filterOptions, setFilterOptions] = useState<FilterOptions>({
//     classes: [],
//     states: [],
//     districts: [],
//     colleges: []
//   });

//   // 1. Fetch Student Data
//   useEffect(() => {
//     const fetchStudents = async () => {
//       setLoading(true);
//       try {
//         const { data, error } = await SupaBaseFunction
//           .from("StudentsBox")
//           .select("*");
          
//         if (error) throw error;
        
//         const studentData: Student[] = data || [];
//         setStudents(studentData);

//         // Helper to extract unique strings, filtering out nulls/'No Provided'
//         const extractUnique = (key: keyof Student): string[] => {
//           return Array.from(
//             new Set(
//               studentData
//                 .map((s) => s[key])
//                 .filter((v): v is string => typeof v === "string" && v !== "No Provided")
//             )
//           ).sort();
//         };
        
//         setFilterOptions({
//           classes: extractUnique("Class"),
//           states: extractUnique("StnState"),
//           districts: extractUnique("StnDistrict"),
//           colleges: extractUnique("CollegeName")
//         });

//       } catch (error) {
//         console.error("Error fetching students:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchStudents();
//   }, []);

//   // 2. Apply Filters
//   useEffect(() => {
//     let result = students;

//     if (filters.Class) result = result.filter(s => s.Class === filters.Class);
//     if (filters.StnState) result = result.filter(s => s.StnState === filters.StnState);
//     if (filters.StnDistrict) result = result.filter(s => s.StnDistrict === filters.StnDistrict);
//     if (filters.CollegeName) result = result.filter(s => s.CollegeName === filters.CollegeName);
    
//     if (filters.IsActive !== "all") {
//       const isActiveBool = filters.IsActive === "true";
//       result = result.filter(s => s.IsActive === isActiveBool);
//     }

//     setFilteredData(result);
//   }, [filters, students]);

//   // 3. CSV Export Logic
//   const handleExport = () => {
//     const isFiltered = Object.values(filters).some(val => val !== "" && val !== "all");
    
//     const message = isFiltered 
//       ? `You have active filters. Export ${filteredData.length} filtered students?`
//       : `Export all ${filteredData.length} students?`;

//     if (window.confirm(message)) {
//       const headers = [
//         "AddNo", "StudentName", "StudentEmail", "CollegeName", "Class", 
//         "State", "District", "Registrations", "Total_Anjuman_Points", 
//         "OutReach_Points", "Achievement_Points", "Grand_Total_Points", "IsActive"
//       ];

//       const csvContent = [
//         headers.join(","),
//         ...filteredData.map(row => [
//           `"${row.AddNo || ''}"`,
//           `"${row.StudentName || ''}"`,
//           `"${row.StudentEmail || ''}"`,
//           `"${row.CollegeName || ''}"`,
//           `"${row.Class || ''}"`,
//           `"${row.StnState || ''}"`,
//           `"${row.StnDistrict || ''}"`,
//           row.Registration_Count || 0,
//           row.Total_Point_Anjuman || 0,
//           row.OutReach_Points || 0,
//           row.Achievements_Points || 0,
//           row.Grand_Total_Points || 0,
//           row.IsActive ? "Yes" : "No"
//         ].join(","))
//       ].join("\n");

//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);
//       link.setAttribute("href", url);
//       link.setAttribute("download", `Students_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     }
//   };

//   // Typed Event Handler for Select Inputs
//   const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   // --- Analytics Data Processing ---

//   // 1. Points by Class (Bar Chart)
//   const pointsByClass = Object.values(
//     filteredData.reduce<Record<string, { name: string; totalPoints: number; studentCount: number }>>((acc, curr) => {
//       const className = curr.Class || "Unassigned";
//       if (!acc[className]) {
//         acc[className] = { name: className, totalPoints: 0, studentCount: 0 };
//       }
//       acc[className].totalPoints += (curr.Grand_Total_Points || 0);
//       acc[className].studentCount += 1;
//       return acc;
//     }, {})
//   ).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

//   // 2. Geographic Distribution by District (Pie Chart)
//   const studentsByDistrict = Object.values(
//     filteredData.reduce<Record<string, { name: string; value: number }>>((acc, curr) => {
//       const district = curr.StnDistrict && curr.StnDistrict !== 'No Provided' ? curr.StnDistrict : "Unknown";
//       if (!acc[district]) {
//         acc[district] = { name: district, value: 0 };
//       }
//       acc[district].value += 1;
//       return acc;
//     }, {})
//   ).sort((a, b) => b.value - a.value).slice(0, 6);

//   // 3. Top 5 Performing Students (Composed Chart)
//   const topStudents = [...filteredData]
//     .sort((a, b) => (b.Grand_Total_Points || 0) - (a.Grand_Total_Points || 0))
//     .slice(0, 5)
//     .map(s => ({
//       name: s.StudentName || s.AddNo,
//       total: s.Grand_Total_Points || 0,
//       achievements: s.Achievements_Points || 0,
//       outreach: s.OutReach_Points || 0
//     }));

//   if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>Loading Student Analytics...</div>;

//   return (
//     <div style={{ padding: "24px", backgroundColor: "#f0fdfa", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
//       {/* HEADER SECTION */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//         <div>
//           <h2 style={{ margin: 0, fontSize: "24px", color: "#0f766e", fontWeight: "700" }}>Student Performance Analytics</h2>
//           <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Monitor achievements, outreach, and engagement across all students.</p>
//         </div>
//         <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          
//           <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
//             <button 
//               onClick={() => setActiveTab("List")}
//               style={{ ...tabStyle, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f766e" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
//             >
//               Directory
//             </button>
//             <button 
//               onClick={() => setActiveTab("Analytics")}
//               style={{ ...tabStyle, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f766e" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
//             >
//               Analytics
//             </button>
//           </div>

//           <button onClick={handleExport} style={exportBtnStyle}>
//             Export CSV ({filteredData.length})
//           </button>
//         </div>
//       </div>

//       {/* FILTER SECTION */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
//         <select name="Class" value={filters.Class} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Classes</option>
//           {filterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
//         </select>

//         <select name="CollegeName" value={filters.CollegeName} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Colleges</option>
//           {filterOptions.colleges.map(c => <option key={c} value={c}>{c}</option>)}
//         </select>

//         <select name="StnState" value={filters.StnState} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All States</option>
//           {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
//         </select>

//         <select name="StnDistrict" value={filters.StnDistrict} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Districts</option>
//           {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
//         </select>

//         <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} style={selectStyle}>
//           <option value="all">Status: All</option>
//           <option value="true">Active Only</option>
//           <option value="false">Inactive Only</option>
//         </select>
//       </div>

//       {/* DYNAMIC CONTENT AREA */}
//       {activeTab === "Analytics" ? (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          
//           {/* BAR CHART: Points by Class */}
//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Total Points by Class (Top 10)</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={pointsByClass} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <RechartsTooltip cursor={{fill: '#f0fdfa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Bar dataKey="totalPoints" name="Total Points" fill="#10b981" radius={[4, 4, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* PIE CHART: Geographic Spread */}
//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Student Distribution by District</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie data={studentsByDistrict} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
//                   {studentsByDistrict.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Legend iconType="circle" />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           {/* COMPOSED CHART: Top 5 Performers Profile */}
//           <div style={{...cardStyle, gridColumn: "1 / -1"}}>
//             <h3 style={chartTitleStyle}>Top 5 Outstanding Students (Point Breakdown)</h3>
//             <ResponsiveContainer width="100%" height={320}>
//               <ComposedChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Legend />
//                 <Area type="monotone" dataKey="total" name="Grand Total" fill="#cffafe" stroke="#0ea5e9" />
//                 <Bar dataKey="achievements" name="Achievement Pts" barSize={40} fill="#f43f5e" radius={[4, 4, 0, 0]} />
//                 <Line type="monotone" dataKey="outreach" name="Outreach Pts" stroke="#8b5cf6" strokeWidth={3} />
//               </ComposedChart>
//             </ResponsiveContainer>
//           </div>

//         </div>
//       ) : (
//         <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
//               <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
//                 <tr>
//                   <th style={thStyle}>Student Info</th>
//                   <th style={thStyle}>Class / College</th>
//                   <th style={thStyle}>Location</th>
//                   <th style={thStyle}>Engagement</th>
//                   <th style={thStyle}>Total Points</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.map((student, idx) => (
//                   <tr key={student.AddNo} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
//                     <td style={tdStyle}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                         <img 
//                           src={student.Student_Photo_Urls || 'https://via.placeholder.com/40'} 
//                           alt={student.StudentName || 'Student'} 
//                           style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} 
//                           onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { 
//                             (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
//                           }}
//                         />
//                         <div>
//                           <div style={{ fontWeight: "600", color: "#0f172a" }}>{student.StudentName}</div>
//                           <div style={{ fontSize: "12px", color: "#64748b" }}>#{student.AddNo}</div>
//                         </div>
//                       </div>
//                     </td>
//                     <td style={tdStyle}>
//                       <div style={{ fontWeight: "500", color: "#334155" }}>{student.Class || 'N/A'}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{student.CollegeName || 'N/A'}</div>
//                     </td>
//                     <td style={tdStyle}>
//                       <div style={{ fontWeight: "500" }}>{student.StnDistrict === 'No Provided' ? 'N/A' : student.StnDistrict}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{student.StnState === 'No Provided' ? '' : student.StnState}</div>
//                     </td>
//                     <td style={tdStyle}>
//                       <div style={{ fontSize: "13px" }}>Reg: <b>{student.Registration_Count}</b></div>
//                       <div style={{ fontSize: "13px" }}>Outreach: <b>{student.OutReach_Count}</b></div>
//                     </td>
//                     <td style={tdStyle}>
//                       <span style={{ backgroundColor: "#d1fae5", color: "#047857", padding: "6px 12px", borderRadius: "999px", fontWeight: "700", fontSize: "14px" }}>
//                         {student.Grand_Total_Points || 0}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//                 {filteredData.length === 0 && (
//                   <tr>
//                     <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No students match your current filters.</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // --- Inline Styles typed as React.CSSProperties ---

// const selectStyle: React.CSSProperties = { padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer" };
// const tabStyle: React.CSSProperties = { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" };
// const exportBtnStyle: React.CSSProperties = { backgroundColor: "#0d9488", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(13, 148, 136, 0.2)" };
// const cardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" };
// const chartTitleStyle: React.CSSProperties = { margin: "0 0 20px 0", fontSize: "16px", color: "#334155", fontWeight: "600" };
// const thStyle: React.CSSProperties = { padding: "16px", fontWeight: "600", borderBottom: "2px solid #e2e8f0" };
// const tdStyle: React.CSSProperties = { padding: "16px", color: "#334155", fontSize: "14px", verticalAlign: "middle" };


// check geminin

// import React, { useState, useEffect } from "react";
// // @ts-ignore
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
//   PieChart, Pie, Cell,
//   ComposedChart, Line, Area
// } from "recharts";

// // --- Types & Interfaces ---
// export interface Student {
//   AddNo: string;
//   StudentName: string | null;
//   StudentEmail: string | null;
//   FatherName: string | null;
//   CollegeName: string | null;
//   StnUserId: string | null;
//   Class: string | null;
//   Registration_Count: number | null;
//   Resluted_Count: number | null;
//   Total_Point_Anjuman: number | null;
//   OutReach_Count: number | null;
//   OutReach_Points: number | null;
//   Achievements_Counts: number | null;
//   Achievements_Points: number | null;
//   Grand_Total_Points: number | null;
//   IsActive: boolean | null;
//   Student_Photo_Urls: string;
//   StnState: string | null;
//   StnDistrict: string | null;
// }

// interface FilterState {
//   Class: string;
//   StnState: string;
//   StnDistrict: string;
//   CollegeName: string;
//   IsActive: string;
// }

// interface FilterOptions {
//   classes: string[];
//   states: string[];
//   districts: string[];
//   colleges: string[];
// }

// const COLORS: string[] = ['#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4'];

// export default function StudentsAnalyticsGeneral() {
//   const [students, setStudents] = useState<Student[]>([]);
//   const [filteredData, setFilteredData] = useState<Student[]>([]);
//   const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
//   const [loading, setLoading] = useState<boolean>(true);

//   const [filters, setFilters] = useState<FilterState>({
//     Class: "",
//     StnState: "",
//     StnDistrict: "",
//     CollegeName: "",
//     IsActive: "true"
//   });

//   const [filterOptions, setFilterOptions] = useState<FilterOptions>({
//     classes: [],
//     states: [],
//     districts: [],
//     colleges: []
//   });

//   useEffect(() => {
//     const fetchStudents = async () => {
//       setLoading(true);
//       try {
//         const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
//         if (error) throw error;

//         const studentData = (data as Student[]) || [];
//         setStudents(studentData);
        
//         const extractUnique = (key: keyof Student) => {
//           const values = studentData.map(s => s[key]).filter(v => typeof v === 'string' && v !== 'No Provided') as string[];
//           return Array.from(new Set(values)).sort();
//         };
        
//         setFilterOptions({
//           classes: extractUnique("Class"),
//           states: extractUnique("StnState"),
//           districts: extractUnique("StnDistrict"),
//           colleges: extractUnique("CollegeName")
//         });
//       } catch (error) {
//         console.error("Error fetching students:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchStudents();
//   }, []);

//   useEffect(() => {
//     let result = [...students];
//     if (filters.Class) result = result.filter(s => s.Class === filters.Class);
//     if (filters.StnState) result = result.filter(s => s.StnState === filters.StnState);
//     if (filters.StnDistrict) result = result.filter(s => s.StnDistrict === filters.StnDistrict);
//     if (filters.CollegeName) result = result.filter(s => s.CollegeName === filters.CollegeName);
//     if (filters.IsActive !== "all") {
//       const isActiveBool = filters.IsActive === "true";
//       result = result.filter(s => s.IsActive === isActiveBool);
//     }
//     setFilteredData(result);
//   }, [filters, students]);

//   const handleExport = () => {
//     const isFiltered = Object.values(filters).some(val => val !== "" && val !== "all");
//     const message = isFiltered 
//       ? `You have active filters. Export ${filteredData.length} filtered students?`
//       : `Export all ${filteredData.length} students?`;

//     if (window.confirm(message)) {
//       const headers = [
//         "AddNo", "StudentName", "StudentEmail", "CollegeName", "Class", 
//         "State", "District", "Registrations", "Total_Anjuman_Points", 
//         "OutReach_Points", "Achievement_Points", "Grand_Total_Points", "IsActive"
//       ];
//       const csvContent = [
//         headers.join(","),
//         ...filteredData.map(row => [
//           `"${row.AddNo || ''}"`,
//           `"${row.StudentName || ''}"`,
//           `"${row.StudentEmail || ''}"`,
//           `"${row.CollegeName || ''}"`,
//           `"${row.Class || ''}"`,
//           `"${row.StnState || ''}"`,
//           `"${row.StnDistrict || ''}"`,
//           row.Registration_Count || 0,
//           row.Total_Point_Anjuman || 0,
//           row.OutReach_Points || 0,
//           row.Achievements_Points || 0,
//           row.Grand_Total_Points || 0,
//           row.IsActive || false
//         ].join(","))
//       ].join("\n");

//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement("a");
//       link.href = URL.createObjectURL(blob);
//       link.download = `Students_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     }
//   };

//   const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setFilters({ ...filters, [e.target.name]: e.target.value });
//   };

//   // Aggregations
//   const pointsByClass = Object.values(filteredData.reduce<Record<string, {name: string; totalPoints: number; studentCount: number}>>((acc, curr) => {
//     const className = curr.Class || "Unassigned";
//     acc[className] = acc[className] || { name: className, totalPoints: 0, studentCount: 0 };
//     acc[className].totalPoints += (curr.Grand_Total_Points || 0);
//     acc[className].studentCount += 1;
//     return acc;
//   }, {})).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

//   const studentsByDistrict = Object.values(filteredData.reduce<Record<string, {name: string; value: number}>>((acc, curr) => {
//     const district = curr.StnDistrict && curr.StnDistrict !== 'No Provided' ? curr.StnDistrict : "Unknown";
//     acc[district] = acc[district] || { name: district, value: 0 };
//     acc[district].value += 1;
//     return acc;
//   }, {})).sort((a, b) => b.value - a.value).slice(0, 6);

//   const topStudents = [...filteredData]
//     .sort((a, b) => (b.Grand_Total_Points || 0) - (a.Grand_Total_Points || 0))
//     .slice(0, 5)
//     .map(s => ({
//       name: s.StudentName || s.AddNo,
//       total: s.Grand_Total_Points || 0,
//       achievements: s.Achievements_Points || 0,
//       outreach: s.OutReach_Points || 0
//     }));

//   if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Student Analytics...</div>;

//   return (
//     <div style={{ padding: "24px", backgroundColor: "#f0fdfa", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//         <div>
//           <h2 style={{ margin: 0, fontSize: "24px", color: "#0f766e", fontWeight: 700 }}>Student Performance Analytics</h2>
//           <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Monitor achievements, outreach, and engagement across all students.</p>
//         </div>
        
//         <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
//           <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
//             <button onClick={() => setActiveTab("List")} style={{ ...tabStyle, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f766e" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Directory</button>
//             <button onClick={() => setActiveTab("Analytics")} style={{ ...tabStyle, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f766e" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Analytics</button>
//           </div>
//           <button onClick={handleExport} style={exportBtnStyleTeal}>Export CSV ({filteredData.length})</button>
//         </div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
//         <select name="Class" value={filters.Class} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Classes</option>
//           {filterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
//         </select>
//         <select name="CollegeName" value={filters.CollegeName} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Colleges</option>
//           {filterOptions.colleges.map(c => <option key={c} value={c}>{c}</option>)}
//         </select>
//         <select name="StnState" value={filters.StnState} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All States</option>
//           {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
//         </select>
//         <select name="StnDistrict" value={filters.StnDistrict} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Districts</option>
//           {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
//         </select>
//         <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} style={selectStyle}>
//           <option value="all">Status: All</option>
//           <option value="true">Active Only</option>
//           <option value="false">Inactive Only</option>
//         </select>
//       </div>

//       {activeTab === "Analytics" ? (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Total Points by Class (Top 10)</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={pointsByClass} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <RechartsTooltip cursor={{fill: '#f0fdfa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Bar dataKey="totalPoints" name="Total Points" fill="#10b981" radius={[4, 4, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Student Distribution by District</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie data={studentsByDistrict} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
//                   {studentsByDistrict.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
//                 </Pie>
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Legend iconType="circle" />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           <div style={{...cardStyle, gridColumn: "1 / -1"}}>
//             <h3 style={chartTitleStyle}>Top 5 Outstanding Students (Point Breakdown)</h3>
//             <ResponsiveContainer width="100%" height={320}>
//               <ComposedChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Legend />
//                 <Area type="monotone" dataKey="total" name="Grand Total" fill="#cffafe" stroke="#0ea5e9" />
//                 <Bar dataKey="achievements" name="Achievement Pts" barSize={40} fill="#f43f5e" radius={[4, 4, 0, 0]} />
//                 <Line type="monotone" dataKey="outreach" name="Outreach Pts" stroke="#8b5cf6" strokeWidth={3} />
//               </ComposedChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       ) : (
//         <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
//               <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
//                 <tr>
//                   <th style={thStyle}>Student Info</th>
//                   <th style={thStyle}>Class / College</th>
//                   <th style={thStyle}>Location</th>
//                   <th style={thStyle}>Engagement</th>
//                   <th style={thStyle}>Total Points</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.map((student, idx) => (
//                   <tr key={student.AddNo} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
//                     <td style={tdStyle}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                         <img 
//                           src={student.Student_Photo_Urls} 
//                           alt={student.StudentName || "Student"} 
//                           style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
//                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40' }}
//                         />
//                         <div>
//                           <div style={{ fontWeight: 600, color: "#0f172a" }}>{student.StudentName}</div>
//                           <div style={{ fontSize: "12px", color: "#64748b" }}>#{student.AddNo}</div>
//                         </div>
//                       </div>
//                     </td>
//                     <td style={tdStyle}>
//                       <div style={{ fontWeight: 500, color: "#334155" }}>{student.Class || 'N/A'}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{student.CollegeName || 'N/A'}</div>
//                     </td>
//                     <td style={tdStyle}>
//                       <div style={{ fontWeight: 500 }}>{student.StnDistrict === 'No Provided' ? 'N/A' : student.StnDistrict}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{student.StnState === 'No Provided' ? '' : student.StnState}</div>
//                     </td>
//                     <td style={tdStyle}>
//                       <div style={{ fontSize: "13px" }}>Reg: <b>{student.Registration_Count}</b></div>
//                       <div style={{ fontSize: "13px" }}>Outreach: <b>{student.OutReach_Count}</b></div>
//                     </td>
//                     <td style={tdStyle}>
//                       <span style={{ backgroundColor: "#d1fae5", color: "#047857", padding: "6px 12px", borderRadius: "999px", fontWeight: 700, fontSize: "14px" }}>
//                         {student.Grand_Total_Points || 0}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//                 {filteredData.length === 0 && (
//                   <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No students match your current filters.</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// const selectStyle: React.CSSProperties = {
//   padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer"
// };
// const tabStyle: React.CSSProperties = {
//   padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.2s"
// };
// const exportBtnStyleTeal: React.CSSProperties = {
//   backgroundColor: "#0d9488", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(13, 148, 136, 0.2)"
// };
// const cardStyle: React.CSSProperties = {
//   backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9"
// };
// const chartTitleStyle: React.CSSProperties = { margin: "0 0 20px 0", fontSize: "16px", color: "#334155", fontWeight: 600 };
// const thStyle: React.CSSProperties = { padding: "16px", fontWeight: 600, borderBottom: "2px solid #e2e8f0" };
// const tdStyle: React.CSSProperties = { padding: "16px", color: "#334155", fontSize: "14px", verticalAlign: "middle" };