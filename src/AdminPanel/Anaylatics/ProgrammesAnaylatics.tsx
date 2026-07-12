// // import { useState, useEffect } from "react";
// // import { SupaBaseFunction } from "../../lib/SupaBase";
// // import { useParams } from "react-router-dom";


// // // create table public."ProgrammesBox" (
// // //   "Program_Title" character varying null,
// // //   "Program_Code" character varying not null,
// // //   "WingCode" character varying null,
// // //   "Description" text null,
// // //   "OutComes" text null,
// // //   "Date" date null,
// // //   "Venue" character varying null,
// // //   "Category" character varying null,
// // //   "Group" character varying null,
// // //   "IsApproved" boolean null default false,
// // //   "IsResulted" boolean null default false,
// // //   "IsResultPublished" boolean null default false,
// // //   "Total_Registration" integer null default 0,
// // //   "IsOpenRegistration" boolean null default true,
// // //   "Program_Poster" character varying null default 'https://media.licdn.com/dms/image/v2/C5112AQH1xW5oeiHzvg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520148394987?e=2147483647&v=beta&t=vThHQ4hcg90pr_O3kI_FOE_Z4jULLSBg4L280dD6-DE'::character varying,
// // //   "IsConducted" boolean null default false,
// // //   "AccademicYear" character varying null,
// // //   created_at time without time zone null default now(),
// // //   "Expected_Time" character varying null default 'Not Provided'::character varying,
// // //   "Collaborator" character varying null default 'No Collaboration'::character varying,
// // //   constraint ProgrammesBox_pkey primary key ("Program_Code")
// // // ) TABLESPACE pg_default;


// // // create table public."Chs-WingS" (
// // //   "WingCode" character varying not null,
// // //   "WingTitle" character varying null,
// // //   "WingEmail" text null,
// // //   "WingManager" character varying null,
// // //   "WingConvener" character varying null,
// // //   "WingAssistant" character varying null,
// // //   "Total_Registrations" integer null default 0,
// // //   "Total_Resulted" integer null default 0,
// // //   "Total_Points" integer null default 0,
// // //   "Bonus_Points" integer null default 0,
// // //   "Description" text null,
// // //   "WingUserId" character varying null,
// // //   "IsActive" boolean null default true,
// // //   constraint Chs - WingS_pkey primary key ("WingCode")
// // // ) TABLESPACE pg_default;

// // export default function ProgrammesAnaylatics() {
// //     return (
// //         <div>
// //             <div className="header">
// //                 <div className="rightSide">
// //                     <h3>Admin Program Anaylatics</h3>
// //                     <p>Full control over programmes and schedules.</p>
// //                 </div>
// //                 <div className="leftSide">
// //                     <div className="actionBtn">
// //                         {/* <button>import</button> */}
// //                         {/* 
// // Import columns: Program_Title, Program_Code, WingCode, Date, Venue, Category, Group, AccademicYear, Program_Poster, Total_Registration, IsResulted
// // */}
// //                         <button>Export</button>(onClick) if any filter applyed then exprot only the selected data , if filter not appleyed then export whole table (ask confirmation befor)
// //                         {/* n rows will export ,  */}
// //                     </div>
// //                     <div className="tabBtn">
// //                         <button>List</button> show progrme in list wise
// //                         <button>Anaylatics</button> default it will active
// //                     </div>
// //                 </div>
// //                 <div className="filterOptions">
// //                     {/* these will columns will in filter option */}
// //                     <p>Academic Year</p>
// //                     <p>Group</p>
// //                     <p>Venu</p>
// //                     <p>Wing</p>
// //                     <p>Collaborate</p>
// //                 </div>
// //             </div>

// //             <div>

// // {/* display the data here  */}

// //             </div>
// //             {/* 
// //             for (Anaylatics) tab create best ui ux desing best anaylasis for the table 
// //             create bar-graph , pi-chart, line-graph, etch

// //             WingCode (fetch wing name ) => 
// //             Date
// //             Venue
// //             Category
// //             Group
// //             Total_Registration
// //             AccademicYear (it is for annaully duration )
// //             Expected_Time
// //             Collaborator
            
// //             */}
// // <div>
// //     {/* list display  */}
// // </div>
// //         </div>
// //     )
// // }
// // // act as great develpor and seinor ui ux desing and anylatics report create 
// // // create a comporont that were we can see all ayalitics in one page, attractive desing mindblowing colour ccollection , attaractive ui ux 
// // // best selection of representiaton (like , bargraph, line graph) as requreid of the colunm 



// // import React, { useState, useEffect } from "react";
// // // Assuming SupaBaseFunction is your configured Supabase client
// // import { SupaBaseFunction } from "../../lib/SupaBase"; 
// // import { useParams } from "react-router-dom";
// // import {
// //   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
// //   PieChart, Pie, Cell,
// //   LineChart, Line
// // } from "recharts";

// // // Modern Color Palette for Charts
// // const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

// // export default function ProgrammesAnalytics() {
// //   // State Management
// //   const [programmes, setProgrammes] = useState([]);
// //   const [wings, setWings] = useState([]);
// //   const [filteredData, setFilteredData] = useState([]);
// //   const [activeTab, setActiveTab] = useState("Analytics");
// //   const [loading, setLoading] = useState(true);

// //   // Filter States
// //   const [filters, setFilters] = useState({
// //     AccademicYear: "",
// //     Group: "",
// //     Venue: "",
// //     WingCode: "",
// //     Collaborator: ""
// //   });

// //   // Unique values for filter dropdowns
// //   const [filterOptions, setFilterOptions] = useState({
// //     years: [],
// //     groups: [],
// //     venues: [],
// //     collaborators: []
// //   });

// //   // 1. Fetch Data
// //   useEffect(() => {
// //     const fetchData = async () => {
// //       setLoading(true);
// //       try {
// //         // Fetch Programmes
// //         const { data: progData, error: progError } = await SupaBaseFunction
// //           .from("ProgrammesBox")
// //           .select("*");
          
// //         // Fetch Wings
// //         const { data: wingData, error: wingError } = await SupaBaseFunction
// //           .from("Chs-WingS")
// //           .select("WingCode, WingTitle");

// //         if (progError) throw progError;
// //         if (wingError) throw wingError;

// //         setProgrammes(progData || []);
// //         setWings(wingData || []);
        
// //         // Extract unique values for filters
// //         setFilterOptions({
// //           years: [...new Set(progData.map(p => p.AccademicYear).filter(Boolean))],
// //           groups: [...new Set(progData.map(p => p.Group).filter(Boolean))],
// //           venues: [...new Set(progData.map(p => p.Venue).filter(Boolean))],
// //           collaborators: [...new Set(progData.map(p => p.Collaborator).filter(Boolean))]
// //         });

// //       } catch (error) {
// //         console.error("Error fetching data:", error);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchData();
// //   }, []);

// //   // 2. Apply Filters
// //   useEffect(() => {
// //     let result = programmes;

// //     if (filters.AccademicYear) result = result.filter(p => p.AccademicYear === filters.AccademicYear);
// //     if (filters.Group) result = result.filter(p => p.Group === filters.Group);
// //     if (filters.Venue) result = result.filter(p => p.Venue === filters.Venue);
// //     if (filters.WingCode) result = result.filter(p => p.WingCode === filters.WingCode);
// //     if (filters.Collaborator) result = result.filter(p => p.Collaborator === filters.Collaborator);

// //     setFilteredData(result);
// //   }, [filters, programmes]);

// //   // 3. Export to CSV Logic
// //   const handleExport = () => {
// //     const isFiltered = Object.values(filters).some(val => val !== "");
// //     const message = isFiltered 
// //       ? `You have active filters. Export ${filteredData.length} filtered rows?`
// //       : `Export all ${filteredData.length} rows?`;

// //     if (window.confirm(message)) {
// //       const headers = [
// //         "Program_Title", "Program_Code", "Wing_Name", "Date", "Venue", 
// //         "Category", "Group", "Academic_Year", "Total_Registration", "IsResulted"
// //       ];

// //       const csvContent = [
// //         headers.join(","),
// //         ...filteredData.map(row => {
// //           const wingName = wings.find(w => w.WingCode === row.WingCode)?.WingTitle || row.WingCode;
// //           return [
// //             `"${row.Program_Title || ''}"`,
// //             `"${row.Program_Code || ''}"`,
// //             `"${wingName || ''}"`,
// //             `"${row.Date || ''}"`,
// //             `"${row.Venue || ''}"`,
// //             `"${row.Category || ''}"`,
// //             `"${row.Group || ''}"`,
// //             `"${row.AccademicYear || ''}"`,
// //             row.Total_Registration || 0,
// //             row.IsResulted || false
// //           ].join(",");
// //         })
// //       ].join("\n");

// //       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
// //       const link = document.createElement("a");
// //       const url = URL.createObjectURL(blob);
// //       link.setAttribute("href", url);
// //       link.setAttribute("download", `Program_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
// //       link.style.visibility = 'hidden';
// //       document.body.appendChild(link);
// //       link.click();
// //       document.body.removeChild(link);
// //     }
// //   };

// //   const handleFilterChange = (e) => {
// //     setFilters({ ...filters, [e.target.name]: e.target.value });
// //   };

// //   // --- Analytics Data Processing ---
// //   const getWingName = (code) => wings.find(w => w.WingCode === code)?.WingTitle || code || "Unknown";

// //   // 1. Bar Graph: Total Registrations per Wing
// //   const registrationsByWing = Object.values(filteredData.reduce((acc, curr) => {
// //     const name = getWingName(curr.WingCode);
// //     acc[name] = acc[name] || { name, registrations: 0 };
// //     acc[name].registrations += (curr.Total_Registration || 0);
// //     return acc;
// //   }, {}));

// //   // 2. Pie Chart: Programs by Category
// //   const categoryData = Object.values(filteredData.reduce((acc, curr) => {
// //     const cat = curr.Category || "Uncategorized";
// //     acc[cat] = acc[cat] || { name: cat, value: 0 };
// //     acc[cat].value += 1;
// //     return acc;
// //   }, {}));

// //   // 3. Line Graph: Programs over time (Months)
// //   const timelineData = Object.values(filteredData.reduce((acc, curr) => {
// //     if (!curr.Date) return acc;
// //     const month = new Date(curr.Date).toLocaleString('default', { month: 'short', year: '2-digit' });
// //     acc[month] = acc[month] || { name: month, programs: 0 };
// //     acc[month].programs += 1;
// //     return acc;
// //   }, {})).sort((a, b) => new Date("1 " + a.name) - new Date("1 " + b.name));


// //   if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Analytics...</div>;

// //   return (
// //     <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
// //       {/* HEADER SECTION */}
// //       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
// //         <div>
// //           <h2 style={{ margin: 0, fontSize: "24px", color: "#1e293b", fontWeight: "700" }}>Admin Program Analytics</h2>
// //           <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Full control over programmes and schedules.</p>
// //         </div>
        
// //         <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
// //           <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
// //             <button 
// //               onClick={() => setActiveTab("List")}
// //               style={{ padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s", backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f172a" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
// //             >
// //               List
// //             </button>
// //             <button 
// //               onClick={() => setActiveTab("Analytics")}
// //               style={{ padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s", backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f172a" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
// //             >
// //               Analytics
// //             </button>
// //           </div>

// //           <button 
// //             onClick={handleExport}
// //             style={{ backgroundColor: "#4f46e5", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)" }}
// //           >
// //             Export CSV ({filteredData.length})
// //           </button>
// //         </div>
// //       </div>

// //       {/* FILTER SECTION */}
// //       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
// //         <select name="AccademicYear" value={filters.AccademicYear} onChange={handleFilterChange} style={selectStyle}>
// //           <option value="">All Academic Years</option>
// //           {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
// //         </select>

// //         <select name="Group" value={filters.Group} onChange={handleFilterChange} style={selectStyle}>
// //           <option value="">All Groups</option>
// //           {filterOptions.groups.map(g => <option key={g} value={g}>{g}</option>)}
// //         </select>

// //         <select name="Venue" value={filters.Venue} onChange={handleFilterChange} style={selectStyle}>
// //           <option value="">All Venues</option>
// //           {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
// //         </select>

// //         <select name="WingCode" value={filters.WingCode} onChange={handleFilterChange} style={selectStyle}>
// //           <option value="">All Wings</option>
// //           {wings.map(w => <option key={w.WingCode} value={w.WingCode}>{w.WingTitle}</option>)}
// //         </select>

// //         <select name="Collaborator" value={filters.Collaborator} onChange={handleFilterChange} style={selectStyle}>
// //           <option value="">All Collaborators</option>
// //           {filterOptions.collaborators.map(c => <option key={c} value={c}>{c}</option>)}
// //         </select>
// //       </div>

// //       {/* DYNAMIC CONTENT AREA */}
// //       {activeTab === "Analytics" ? (
// //         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          
// //           {/* BAR CHART */}
// //           <div style={cardStyle}>
// //             <h3 style={chartTitleStyle}>Registrations by Wing</h3>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <BarChart data={registrationsByWing} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
// //                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
// //                 <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
// //                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
// //                 <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
// //                 <Bar dataKey="registrations" fill="#6366f1" radius={[4, 4, 0, 0]} />
// //               </BarChart>
// //             </ResponsiveContainer>
// //           </div>

// //           {/* PIE CHART */}
// //           <div style={cardStyle}>
// //             <h3 style={chartTitleStyle}>Programs by Category</h3>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <PieChart>
// //                 <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
// //                   {categoryData.map((entry, index) => (
// //                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
// //                   ))}
// //                 </Pie>
// //                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
// //                 <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
// //               </PieChart>
// //             </ResponsiveContainer>
// //           </div>

// //           {/* LINE CHART */}
// //           <div style={{...cardStyle, gridColumn: "1 / -1"}}>
// //             <h3 style={chartTitleStyle}>Program Frequency Timeline</h3>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
// //                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
// //                 <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
// //                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
// //                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
// //                 <Line type="monotone" dataKey="programs" stroke="#14b8a6" strokeWidth={3} activeDot={{ r: 8 }} />
// //               </LineChart>
// //             </ResponsiveContainer>
// //           </div>

// //         </div>
// //       ) : (
// //         <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
// //           <div style={{ overflowX: "auto" }}>
// //             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
// //               <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
// //                 <tr>
// //                   <th style={thStyle}>Program Title</th>
// //                   <th style={thStyle}>Wing</th>
// //                   <th style={thStyle}>Date</th>
// //                   <th style={thStyle}>Venue</th>
// //                   <th style={thStyle}>Registrations</th>
// //                   <th style={thStyle}>Status</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {filteredData.map((prog, idx) => (
// //                   <tr key={prog.Program_Code} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
// //                     <td style={tdStyle}>
// //                       <div style={{ fontWeight: "600", color: "#0f172a" }}>{prog.Program_Title}</div>
// //                       <div style={{ fontSize: "12px", color: "#64748b" }}>{prog.Category} • {prog.Group}</div>
// //                     </td>
// //                     <td style={tdStyle}>{getWingName(prog.WingCode)}</td>
// //                     <td style={tdStyle}>{prog.Date ? new Date(prog.Date).toLocaleDateString() : 'TBA'}</td>
// //                     <td style={tdStyle}>{prog.Venue || 'TBA'}</td>
// //                     <td style={tdStyle}>
// //                       <span style={{ backgroundColor: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: "999px", fontWeight: "600", fontSize: "12px" }}>
// //                         {prog.Total_Registration || 0}
// //                       </span>
// //                     </td>
// //                     <td style={tdStyle}>
// //                       {prog.IsConducted 
// //                         ? <span style={{ color: "#16a34a", fontWeight: "600", fontSize: "14px" }}>Conducted</span>
// //                         : <span style={{ color: "#d97706", fontWeight: "600", fontSize: "14px" }}>Upcoming</span>}
// //                     </td>
// //                   </tr>
// //                 ))}
// //                 {filteredData.length === 0 && (
// //                   <tr>
// //                     <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No programmes match your current filters.</td>
// //                   </tr>
// //                 )}
// //               </tbody>
// //             </table>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // // Inline Styles for clean rendering without external CSS dependencies
// // const selectStyle = {
// //   padding: "10px",
// //   borderRadius: "8px",
// //   border: "1px solid #e2e8f0",
// //   backgroundColor: "#f8fafc",
// //   color: "#334155",
// //   fontSize: "14px",
// //   outline: "none",
// //   cursor: "pointer"
// // };

// // const cardStyle = {
// //   backgroundColor: "#fff",
// //   padding: "24px",
// //   borderRadius: "16px",
// //   boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
// //   border: "1px solid #f1f5f9"
// // };

// // const chartTitleStyle = {
// //   margin: "0 0 20px 0",
// //   fontSize: "16px",
// //   color: "#334155",
// //   fontWeight: "600"
// // };

// // const thStyle = {
// //   padding: "16px",
// //   fontWeight: "600",
// //   borderBottom: "2px solid #e2e8f0"
// // };

// // const tdStyle = {
// //   padding: "16px",
// //   color: "#334155",
// //   fontSize: "14px"
// // };

// import React, { useState, useEffect } from "react";
// // Assuming SupaBaseFunction is your configured Supabase client
// import { SupaBaseFunction } from "../../lib/SupaBase"; 
// import { useParams } from "react-router-dom";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
//   PieChart, Pie, Cell,
//   LineChart, Line
// } from "recharts";

// // Modern Color Palette for Charts
// const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

// export default function ProgrammesAnalytics() {
//   // State Management
//   const [programmes, setProgrammes] = useState([]);
//   const [wings, setWings] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [activeTab, setActiveTab] = useState("Analytics");
//   const [loading, setLoading] = useState(true);

//   // Filter States - Added startDate and endDate
//   const [filters, setFilters] = useState({
//     AccademicYear: "",
//     Group: "",
//     Venue: "",
//     WingCode: "",
//     Collaborator: "",
//     startDate: "",
//     endDate: ""
//   });

//   // Unique values for filter dropdowns
//   const [filterOptions, setFilterOptions] = useState({
//     years: [],
//     groups: [],
//     venues: [],
//     collaborators: []
//   });

//   // 1. Fetch Data
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const { data: progData, error: progError } = await SupaBaseFunction
//           .from("ProgrammesBox")
//           .select("*");
          
//         const { data: wingData, error: wingError } = await SupaBaseFunction
//           .from("Chs-WingS")
//           .select("WingCode, WingTitle");

//         if (progError) throw progError;
//         if (wingError) throw wingError;

//         setProgrammes(progData || []);
//         setWings(wingData || []);
        
//         setFilterOptions({
//           years: [...new Set(progData.map(p => p.AccademicYear).filter(Boolean))],
//           groups: [...new Set(progData.map(p => p.Group).filter(Boolean))],
//           venues: [...new Set(progData.map(p => p.Venue).filter(Boolean))],
//           collaborators: [...new Set(progData.map(p => p.Collaborator).filter(Boolean))]
//         });

//       } catch (error) {
//         console.error("Error fetching data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // 2. Apply Filters (Including Date Range)
//   useEffect(() => {
//     let result = programmes;

//     if (filters.AccademicYear) result = result.filter(p => p.AccademicYear === filters.AccademicYear);
//     if (filters.Group) result = result.filter(p => p.Group === filters.Group);
//     if (filters.Venue) result = result.filter(p => p.Venue === filters.Venue);
//     if (filters.WingCode) result = result.filter(p => p.WingCode === filters.WingCode);
//     if (filters.Collaborator) result = result.filter(p => p.Collaborator === filters.Collaborator);
    
//     // Date Range Logic
//     if (filters.startDate) {
//       result = result.filter(p => p.Date && new Date(p.Date) >= new Date(filters.startDate));
//     }
//     if (filters.endDate) {
//       result = result.filter(p => p.Date && new Date(p.Date) <= new Date(filters.endDate));
//     }

//     setFilteredData(result);
//   }, [filters, programmes]);

//   // 3. Export to CSV Logic
//   const handleExport = () => {
//     const isFiltered = Object.values(filters).some(val => val !== "");
//     const message = isFiltered 
//       ? `You have active filters. Export ${filteredData.length} filtered rows?`
//       : `Export all ${filteredData.length} rows?`;

//     if (window.confirm(message)) {
//       const headers = [
//         "Program_Title", "Program_Code", "Wing_Name", "Date", "Venue", 
//         "Category", "Group", "Academic_Year", "Total_Registration", "IsResulted"
//       ];

//       const csvContent = [
//         headers.join(","),
//         ...filteredData.map(row => {
//           const wingName = wings.find(w => w.WingCode === row.WingCode)?.WingTitle || row.WingCode;
//           return [
//             `"${row.Program_Title || ''}"`,
//             `"${row.Program_Code || ''}"`,
//             `"${wingName || ''}"`,
//             `"${row.Date || ''}"`,
//             `"${row.Venue || ''}"`,
//             `"${row.Category || ''}"`,
//             `"${row.Group || ''}"`,
//             `"${row.AccademicYear || ''}"`,
//             row.Total_Registration || 0,
//             row.IsResulted || false
//           ].join(",");
//         })
//       ].join("\n");

//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);
//       link.setAttribute("href", url);
//       link.setAttribute("download", `Program_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
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
//   const getWingName = (code) => wings.find(w => w.WingCode === code)?.WingTitle || code || "Unknown";

//   const registrationsByWing = Object.values(filteredData.reduce((acc, curr) => {
//     const name = getWingName(curr.WingCode);
//     acc[name] = acc[name] || { name, registrations: 0 };
//     acc[name].registrations += (curr.Total_Registration || 0);
//     return acc;
//   }, {}));

//   const categoryData = Object.values(filteredData.reduce((acc, curr) => {
//     const cat = curr.Category || "Uncategorized";
//     acc[cat] = acc[cat] || { name: cat, value: 0 };
//     acc[cat].value += 1;
//     return acc;
//   }, {}));

//   const timelineData = Object.values(filteredData.reduce((acc, curr) => {
//     if (!curr.Date) return acc;
//     const month = new Date(curr.Date).toLocaleString('default', { month: 'short', year: '2-digit' });
//     acc[month] = acc[month] || { name: month, programs: 0 };
//     acc[month].programs += 1;
//     return acc;
//   }, {})).sort((a, b) => new Date("1 " + a.name) - new Date("1 " + b.name));


//   if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Analytics...</div>;

//   return (
//     <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
//       {/* HEADER SECTION */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//         <div>
//           <h2 style={{ margin: 0, fontSize: "24px", color: "#1e293b", fontWeight: "700" }}>Admin Program Analytics</h2>
//           <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Full control over programmes and schedules.</p>
//         </div>
        
//         <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
//           <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
//             <button 
//               onClick={() => setActiveTab("List")}
//               style={{ padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s", backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f172a" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
//             >
//               List
//             </button>
//             <button 
//               onClick={() => setActiveTab("Analytics")}
//               style={{ padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", transition: "all 0.2s", backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f172a" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
//             >
//               Analytics
//             </button>
//           </div>

//           <button 
//             onClick={handleExport}
//             style={{ backgroundColor: "#4f46e5", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)" }}
//           >
//             Export CSV ({filteredData.length})
//           </button>
//         </div>
//       </div>

//       {/* FILTER SECTION */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
        
//         {/* Date Range Group */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Start Date</label>
//           <input 
//             type="date" 
//             name="startDate" 
//             value={filters.startDate} 
//             onChange={handleFilterChange} 
//             style={inputStyle}
//           />
//         </div>
        
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>End Date</label>
//           <input 
//             type="date" 
//             name="endDate" 
//             value={filters.endDate} 
//             onChange={handleFilterChange} 
//             style={inputStyle}
//           />
//         </div>

//         {/* Dropdown Filters */}
//         <div style={{ display: "flex", flexDirection: "column", justifySelf: "end", width: "100%", gap: "8px" }}>
//           <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Year</label>
//           <select name="AccademicYear" value={filters.AccademicYear} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Years</option>
//             {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
//           </select>
//         </div>

//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Group</label>
//           <select name="Group" value={filters.Group} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Groups</option>
//             {filterOptions.groups.map(g => <option key={g} value={g}>{g}</option>)}
//           </select>
//         </div>

//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Venue</label>
//           <select name="Venue" value={filters.Venue} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Venues</option>
//             {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
//           </select>
//         </div>

//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Wing</label>
//           <select name="WingCode" value={filters.WingCode} onChange={handleFilterChange} style={inputStyle}>
//             <option value="">All Wings</option>
//             {wings.map(w => <option key={w.WingCode} value={w.WingCode}>{w.WingTitle}</option>)}
//           </select>
//         </div>
//       </div>

//       {/* DYNAMIC CONTENT AREA */}
//       {activeTab === "Analytics" ? (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          
//           {/* BAR CHART */}
//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Registrations by Wing</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={registrationsByWing} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Bar dataKey="registrations" fill="#6366f1" radius={[4, 4, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* PIE CHART */}
//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Programs by Category</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
//                   {categoryData.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           {/* LINE CHART */}
//           <div style={{...cardStyle, gridColumn: "1 / -1"}}>
//             <h3 style={chartTitleStyle}>Program Frequency Timeline</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Line type="monotone" dataKey="programs" stroke="#14b8a6" strokeWidth={3} activeDot={{ r: 8 }} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>

//         </div>
//       ) : (
//         <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
//               <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
//                 <tr>
//                   <th style={thStyle}>Program Title</th>
//                   <th style={thStyle}>Wing</th>
//                   <th style={thStyle}>Date</th>
//                   <th style={thStyle}>Venue</th>
//                   <th style={thStyle}>Registrations</th>
//                   <th style={thStyle}>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.map((prog, idx) => (
//                   <tr key={prog.Program_Code} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
//                     <td style={tdStyle}>
//                       <div style={{ fontWeight: "600", color: "#0f172a" }}>{prog.Program_Title}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{prog.Category} • {prog.Group}</div>
//                     </td>
//                     <td style={tdStyle}>{getWingName(prog.WingCode)}</td>
//                     <td style={tdStyle}>{prog.Date ? new Date(prog.Date).toLocaleDateString() : 'TBA'}</td>
//                     <td style={tdStyle}>{prog.Venue || 'TBA'}</td>
//                     <td style={tdStyle}>
//                       <span style={{ backgroundColor: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: "999px", fontWeight: "600", fontSize: "12px" }}>
//                         {prog.Total_Registration || 0}
//                       </span>
//                     </td>
//                     <td style={tdStyle}>
//                       {prog.IsConducted 
//                         ? <span style={{ color: "#16a34a", fontWeight: "600", fontSize: "14px" }}>Conducted</span>
//                         : <span style={{ color: "#d97706", fontWeight: "600", fontSize: "14px" }}>Upcoming</span>}
//                     </td>
//                   </tr>
//                 ))}
//                 {filteredData.length === 0 && (
//                   <tr>
//                     <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No programmes match your current filters.</td>
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

// // Inline Styles for clean rendering
// const inputStyle = {
//   padding: "10px",
//   borderRadius: "8px",
//   border: "1px solid #e2e8f0",
//   backgroundColor: "#f8fafc",
//   color: "#334155",
//   fontSize: "14px",
//   outline: "none",
//   cursor: "pointer",
//   boxSizing: "border-box",
//   height: "42px" // Ensures dropdowns and dates match height
// };

// const cardStyle = {
//   backgroundColor: "#fff",
//   padding: "24px",
//   borderRadius: "16px",
//   boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
//   border: "1px solid #f1f5f9"
// };

// const chartTitleStyle = {
//   margin: "0 0 20px 0",
//   fontSize: "16px",
//   color: "#334155",
//   fontWeight: "600"
// };

// const thStyle = {
//   padding: "16px",
//   fontWeight: "600",
//   borderBottom: "2px solid #e2e8f0"
// };

// const tdStyle = {
//   padding: "16px",
//   color: "#334155",
//   fontSize: "14px"
// };

// checking first gemini 

// import React, { useState, useEffect } from "react";
// // @ts-ignore - Adjust the import path and type based on your actual Supabase client setup
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
//   PieChart, Pie, Cell,
//   LineChart, Line
// } from "recharts";

// // --- Types & Interfaces ---
// export interface Programme {
//   Program_Title: string | null;
//   Program_Code: string;
//   WingCode: string | null;
//   Description: string | null;
//   OutComes: string | null;
//   Date: string | null;
//   Venue: string | null;
//   Category: string | null;
//   Group: string | null;
//   IsApproved: boolean | null;
//   IsResulted: boolean | null;
//   IsResultPublished: boolean | null;
//   Total_Registration: number | null;
//   IsOpenRegistration: boolean | null;
//   Program_Poster: string | null;
//   IsConducted: boolean | null;
//   AccademicYear: string | null;
//   Expected_Time: string | null;
//   Collaborator: string | null;
// }

// export interface WingSummary {
//   WingCode: string;
//   WingTitle: string | null;
// }

// interface FilterState {
//   AccademicYear: string;
//   Group: string;
//   Venue: string;
//   WingCode: string;
//   Collaborator: string;
// }

// interface FilterOptions {
//   years: string[];
//   groups: string[];
//   venues: string[];
//   collaborators: string[];
// }

// const COLORS: string[] = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

// export default function ProgrammesAnalytics() {
//   const [programmes, setProgrammes] = useState<Programme[]>([]);
//   const [wings, setWings] = useState<WingSummary[]>([]);
//   const [filteredData, setFilteredData] = useState<Programme[]>([]);
//   const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
//   const [loading, setLoading] = useState<boolean>(true);

//   const [filters, setFilters] = useState<FilterState>({
//     AccademicYear: "",
//     Group: "",
//     Venue: "",
//     WingCode: "",
//     Collaborator: ""
//   });

//   const [filterOptions, setFilterOptions] = useState<FilterOptions>({
//     years: [],
//     groups: [],
//     venues: [],
//     collaborators: []
//   });

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const { data: progData, error: progError } = await SupaBaseFunction
//           .from("ProgrammesBox")
//           .select("*");

//         const { data: wingData, error: wingError } = await SupaBaseFunction
//           .from("Chs-WingS")
//           .select("WingCode, WingTitle");

//         if (progError) throw progError;
//         if (wingError) throw wingError;

//         const typedProgs = (progData as Programme[]) || [];
//         const typedWings = (wingData as WingSummary[]) || [];

//         setProgrammes(typedProgs);
//         setWings(typedWings);

//         setFilterOptions({
//           years: Array.from(new Set(typedProgs.map(p => p.AccademicYear).filter(Boolean))) as string[],
//           groups: Array.from(new Set(typedProgs.map(p => p.Group).filter(Boolean))) as string[],
//           venues: Array.from(new Set(typedProgs.map(p => p.Venue).filter(Boolean))) as string[],
//           collaborators: Array.from(new Set(typedProgs.map(p => p.Collaborator).filter(Boolean))) as string[]
//         });
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   useEffect(() => {
//     let result = [...programmes];
//     if (filters.AccademicYear) result = result.filter(p => p.AccademicYear === filters.AccademicYear);
//     if (filters.Group) result = result.filter(p => p.Group === filters.Group);
//     if (filters.Venue) result = result.filter(p => p.Venue === filters.Venue);
//     if (filters.WingCode) result = result.filter(p => p.WingCode === filters.WingCode);
//     if (filters.Collaborator) result = result.filter(p => p.Collaborator === filters.Collaborator);
//     setFilteredData(result);
//   }, [filters, programmes]);

//   const handleExport = () => {
//     const isFiltered = Object.values(filters).some(val => val !== "");
//     const message = isFiltered 
//       ? `You have active filters. Export ${filteredData.length} filtered rows?`
//       : `Export all ${filteredData.length} rows?`;

//     if (window.confirm(message)) {
//       const headers = [
//         "Program_Title", "Program_Code", "Wing_Name", "Date", "Venue", 
//         "Category", "Group", "Academic_Year", "Total_Registration", "IsResulted"
//       ];

//       const csvContent = [
//         headers.join(","),
//         ...filteredData.map(row => {
//           const wingName = wings.find(w => w.WingCode === row.WingCode)?.WingTitle || row.WingCode;
//           return [
//             `"${row.Program_Title || ''}"`,
//             `"${row.Program_Code || ''}"`,
//             `"${wingName || ''}"`,
//             `"${row.Date || ''}"`,
//             `"${row.Venue || ''}"`,
//             `"${row.Category || ''}"`,
//             `"${row.Group || ''}"`,
//             `"${row.AccademicYear || ''}"`,
//             row.Total_Registration || 0,
//             row.IsResulted || false
//           ].join(",");
//         })
//       ].join("\n");

//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement("a");
//       link.href = URL.createObjectURL(blob);
//       link.download = `Program_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     }
//   };

//   const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setFilters({ ...filters, [e.target.name]: e.target.value });
//   };

//   const getWingName = (code: string | null) => {
//     if (!code) return "Unknown";
//     return wings.find(w => w.WingCode === code)?.WingTitle || code;
//   };

//   // Aggregations
//   const registrationsByWing = Object.values(filteredData.reduce<Record<string, {name: string; registrations: number}>>((acc, curr) => {
//     const name = getWingName(curr.WingCode);
//     acc[name] = acc[name] || { name, registrations: 0 };
//     acc[name].registrations += (curr.Total_Registration || 0);
//     return acc;
//   }, {}));

//   const categoryData = Object.values(filteredData.reduce<Record<string, {name: string; value: number}>>((acc, curr) => {
//     const cat = curr.Category || "Uncategorized";
//     acc[cat] = acc[cat] || { name: cat, value: 0 };
//     acc[cat].value += 1;
//     return acc;
//   }, {}));

//   const timelineData = Object.values(filteredData.reduce<Record<string, {name: string; programs: number}>>((acc, curr) => {
//     if (!curr.Date) return acc;
//     const month = new Date(curr.Date).toLocaleString('default', { month: 'short', year: '2-digit' });
//     acc[month] = acc[month] || { name: month, programs: 0 };
//     acc[month].programs += 1;
//     return acc;
//   }, {})).sort((a, b) => new Date(`1 ${a.name}`).getTime() - new Date(`1 ${b.name}`).getTime());


//   if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Analytics...</div>;

//   return (
//     <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//         <div>
//           <h2 style={{ margin: 0, fontSize: "24px", color: "#1e293b", fontWeight: 700 }}>Admin Program Analytics</h2>
//           <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Full control over programmes and schedules.</p>
//         </div>
        
//         <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
//           <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
//             <button onClick={() => setActiveTab("List")} style={{...tabStyleBase, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f172a" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>List</button>
//             <button onClick={() => setActiveTab("Analytics")} style={{...tabStyleBase, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f172a" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}>Analytics</button>
//           </div>
//           <button onClick={handleExport} style={exportBtnStyle}>Export CSV ({filteredData.length})</button>
//         </div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
//         <select name="AccademicYear" value={filters.AccademicYear} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Academic Years</option>
//           {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
//         </select>
//         <select name="Group" value={filters.Group} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Groups</option>
//           {filterOptions.groups.map(g => <option key={g} value={g}>{g}</option>)}
//         </select>
//         <select name="Venue" value={filters.Venue} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Venues</option>
//           {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
//         </select>
//         <select name="WingCode" value={filters.WingCode} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Wings</option>
//           {wings.map(w => <option key={w.WingCode} value={w.WingCode}>{w.WingTitle}</option>)}
//         </select>
//         <select name="Collaborator" value={filters.Collaborator} onChange={handleFilterChange} style={selectStyle}>
//           <option value="">All Collaborators</option>
//           {filterOptions.collaborators.map(c => <option key={c} value={c}>{c}</option>)}
//         </select>
//       </div>

//       {activeTab === "Analytics" ? (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Registrations by Wing</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={registrationsByWing} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Bar dataKey="registrations" fill="#6366f1" radius={[4, 4, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           <div style={cardStyle}>
//             <h3 style={chartTitleStyle}>Programs by Category</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
//                   {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
//                 </Pie>
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           <div style={{...cardStyle, gridColumn: "1 / -1"}}>
//             <h3 style={chartTitleStyle}>Program Frequency Timeline</h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
//                 <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
//                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
//                 <Line type="monotone" dataKey="programs" stroke="#14b8a6" strokeWidth={3} activeDot={{ r: 8 }} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       ) : (
//         <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
//               <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
//                 <tr>
//                   <th style={thStyle}>Program Title</th>
//                   <th style={thStyle}>Wing</th>
//                   <th style={thStyle}>Date</th>
//                   <th style={thStyle}>Venue</th>
//                   <th style={thStyle}>Registrations</th>
//                   <th style={thStyle}>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.map((prog, idx) => (
//                   <tr key={prog.Program_Code} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
//                     <td style={tdStyle}>
//                       <div style={{ fontWeight: 600, color: "#0f172a" }}>{prog.Program_Title}</div>
//                       <div style={{ fontSize: "12px", color: "#64748b" }}>{prog.Category} • {prog.Group}</div>
//                     </td>
//                     <td style={tdStyle}>{getWingName(prog.WingCode)}</td>
//                     <td style={tdStyle}>{prog.Date ? new Date(prog.Date).toLocaleDateString() : 'TBA'}</td>
//                     <td style={tdStyle}>{prog.Venue || 'TBA'}</td>
//                     <td style={tdStyle}>
//                       <span style={{ backgroundColor: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: "999px", fontWeight: 600, fontSize: "12px" }}>
//                         {prog.Total_Registration || 0}
//                       </span>
//                     </td>
//                     <td style={tdStyle}>
//                       {prog.IsConducted 
//                         ? <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "14px" }}>Conducted</span>
//                         : <span style={{ color: "#d97706", fontWeight: 600, fontSize: "14px" }}>Upcoming</span>}
//                     </td>
//                   </tr>
//                 ))}
//                 {filteredData.length === 0 && (
//                   <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No programmes match your current filters.</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// const tabStyleBase: React.CSSProperties = {
//   padding: "8px 16px",
//   borderRadius: "6px",
//   border: "none",
//   cursor: "pointer",
//   fontWeight: 600,
//   transition: "all 0.2s"
// };

// const selectStyle: React.CSSProperties = {
//   padding: "10px",
//   borderRadius: "8px",
//   border: "1px solid #e2e8f0",
//   backgroundColor: "#f8fafc",
//   color: "#334155",
//   fontSize: "14px",
//   outline: "none",
//   cursor: "pointer"
// };

// const exportBtnStyle: React.CSSProperties = {
//   backgroundColor: "#4f46e5", color: "#fff", border: "none", padding: "10px 20px", 
//   borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", 
//   alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)"
// };

// const cardStyle: React.CSSProperties = {
//   backgroundColor: "#fff", padding: "24px", borderRadius: "16px",
//   boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9"
// };

// const chartTitleStyle: React.CSSProperties = {
//   margin: "0 0 20px 0", fontSize: "16px", color: "#334155", fontWeight: 600
// };

// const thStyle: React.CSSProperties = {
//   padding: "16px", fontWeight: 600, borderBottom: "2px solid #e2e8f0"
// };

// const tdStyle: React.CSSProperties = {
//   padding: "16px", color: "#334155", fontSize: "14px"
// };


import React, { useState, useEffect } from "react";
// @ts-ignore - Assuming SupaBaseFunction is correctly configured in your lib
import { SupaBaseFunction } from "../../lib/SupaBase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from "recharts";

// --- TypeScript Interfaces ---

export interface Programme {
  Program_Title: string | null;
  Program_Code: string;
  WingCode: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null;
  Venue: string | null;
  Category: string | null;
  Group: string | null;
  IsApproved: boolean | null;
  IsResulted: boolean | null;
  IsResultPublished: boolean | null;
  Total_Registration: number | null;
  IsOpenRegistration: boolean | null;
  Program_Poster: string | null;
  IsConducted: boolean | null;
  AccademicYear: string | null;
  Expected_Time: string | null;
  Collaborator: string | null;
}

export interface WingSummary {
  WingCode: string;
  WingTitle: string | null;
}

interface FilterState {
  AccademicYear: string;
  Group: string;
  Venue: string;
  WingCode: string;
  Collaborator: string;
}

interface FilterOptions {
  years: string[];
  groups: string[];
  venues: string[];
  collaborators: string[];
}

// Professional Indigo Theme for Programs
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

export default function ProgrammesAnalytics() {
  // State Management
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [wings, setWings] = useState<WingSummary[]>([]);
  const [filteredData, setFilteredData] = useState<Programme[]>([]);
  const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
  const [loading, setLoading] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    AccademicYear: "",
    Group: "",
    Venue: "",
    WingCode: "",
    Collaborator: ""
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    years: [],
    groups: [],
    venues: [],
    collaborators: []
  });

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: progData, error: progError } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*");

        const { data: wingData, error: wingError } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, WingTitle");

        if (progError) throw progError;
        if (wingError) throw wingError;

        const typedProgs = (progData as Programme[]) || [];
        const typedWings = (wingData as WingSummary[]) || [];

        setProgrammes(typedProgs);
        setWings(typedWings);

        // Extract unique, non-null filter options
        setFilterOptions({
          years: Array.from(new Set(typedProgs.map(p => p.AccademicYear).filter(Boolean))) as string[],
          groups: Array.from(new Set(typedProgs.map(p => p.Group).filter(Boolean))) as string[],
          venues: Array.from(new Set(typedProgs.map(p => p.Venue).filter(Boolean))) as string[],
          collaborators: Array.from(new Set(typedProgs.map(p => p.Collaborator).filter(Boolean))) as string[]
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Apply Filters
  useEffect(() => {
    let result = [...programmes];
    if (filters.AccademicYear) result = result.filter(p => p.AccademicYear === filters.AccademicYear);
    if (filters.Group) result = result.filter(p => p.Group === filters.Group);
    if (filters.Venue) result = result.filter(p => p.Venue === filters.Venue);
    if (filters.WingCode) result = result.filter(p => p.WingCode === filters.WingCode);
    if (filters.Collaborator) result = result.filter(p => p.Collaborator === filters.Collaborator);
    
    setFilteredData(result);
  }, [filters, programmes]);

  // 3. Export Logic
  const handleExport = () => {
    const isFiltered = Object.values(filters).some(val => val !== "");
    const message = isFiltered 
      ? `You have active filters. Export ${filteredData.length} filtered rows?`
      : `Export all ${filteredData.length} rows?`;

    if (window.confirm(message)) {
      const headers = [
        "Program_Title", "Program_Code", "Wing_Name", "Date", "Venue", 
        "Category", "Group", "Academic_Year", "Total_Registration", "IsResulted"
      ];

      const csvContent = [
        headers.join(","),
        ...filteredData.map(row => {
          const wingName = wings.find(w => w.WingCode === row.WingCode)?.WingTitle || row.WingCode;
          return [
            `"${row.Program_Title || ''}"`,
            `"${row.Program_Code || ''}"`,
            `"${wingName || ''}"`,
            `"${row.Date || ''}"`,
            `"${row.Venue || ''}"`,
            `"${row.Category || ''}"`,
            `"${row.Group || ''}"`,
            `"${row.AccademicYear || ''}"`,
            row.Total_Registration || 0,
            row.IsResulted ? "Yes" : "No"
          ].join(",");
        })
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Program_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getWingName = (code: string | null) => {
    if (!code) return "Unknown";
    return wings.find(w => w.WingCode === code)?.WingTitle || code;
  };

  // --- Analytics Data Processing ---

  const registrationsByWing = Object.values(
    filteredData.reduce<Record<string, { name: string; registrations: number }>>((acc, curr) => {
      const name = getWingName(curr.WingCode);
      if (!acc[name]) acc[name] = { name, registrations: 0 };
      acc[name].registrations += (curr.Total_Registration || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.registrations - a.registrations).slice(0, 8);

  const categoryData = Object.values(
    filteredData.reduce<Record<string, { name: string; value: number }>>((acc, curr) => {
      const cat = curr.Category || "Uncategorized";
      if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
      acc[cat].value += 1;
      return acc;
    }, {})
  );

  const timelineData = Object.values(
    filteredData.reduce<Record<string, { name: string; programs: number }>>((acc, curr) => {
      if (!curr.Date) return acc;
      const dateObj = new Date(curr.Date);
      // Skip invalid dates
      if (isNaN(dateObj.getTime())) return acc;
      
      const month = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!acc[month]) acc[month] = { name: month, programs: 0 };
      acc[month].programs += 1;
      return acc;
    }, {})
  ).sort((a, b) => new Date(`1 ${a.name}`).getTime() - new Date(`1 ${b.name}`).getTime());


  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>Loading Analytics...</div>;

  return (
    <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#1e293b", fontWeight: 700 }}>Admin Program Analytics</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Full control over programmes and schedules.</p>
        </div>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
            <button 
              onClick={() => setActiveTab("List")} 
              style={{...tabStyleBase, backgroundColor: activeTab === "List" ? "#fff" : "transparent", color: activeTab === "List" ? "#0f172a" : "#64748b", boxShadow: activeTab === "List" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}
            >
              List
            </button>
            <button 
              onClick={() => setActiveTab("Analytics")} 
              style={{...tabStyleBase, backgroundColor: activeTab === "Analytics" ? "#fff" : "transparent", color: activeTab === "Analytics" ? "#0f172a" : "#64748b", boxShadow: activeTab === "Analytics" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"}}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)" }}>
        <select name="AccademicYear" value={filters.AccademicYear} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Academic Years</option>
          {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select name="Group" value={filters.Group} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Groups</option>
          {filterOptions.groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select name="Venue" value={filters.Venue} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Venues</option>
          {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select name="WingCode" value={filters.WingCode} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Wings</option>
          {wings.map(w => <option key={w.WingCode} value={w.WingCode}>{w.WingTitle}</option>)}
        </select>
        <select name="Collaborator" value={filters.Collaborator} onChange={handleFilterChange} style={selectStyle}>
          <option value="">All Collaborators</option>
          {filterOptions.collaborators.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      {activeTab === "Analytics" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          
          <div style={cardStyle}>
            <h3 style={chartTitleStyle}>Registrations by Wing (Top 8)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={registrationsByWing} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="registrations" name="Registrations" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h3 style={chartTitleStyle}>Programs by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="40%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '13px', lineHeight: '24px', color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{...cardStyle, gridColumn: "1 / -1"}}>
            <h3 style={chartTitleStyle}>Program Frequency Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Legend />
                <Line type="monotone" dataKey="programs" name="Programs Conducted" stroke="#14b8a6" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "14px", textTransform: "uppercase" }}>
                <tr>
                  <th style={thStyle}>Program Title</th>
                  <th style={thStyle}>Wing</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Venue</th>
                  <th style={thStyle}>Registrations</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((prog, idx) => (
                  <tr key={prog.Program_Code} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{prog.Program_Title}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{prog.Category} • {prog.Group}</div>
                    </td>
                    <td style={tdStyle}>{getWingName(prog.WingCode)}</td>
                    <td style={tdStyle}>{prog.Date ? new Date(prog.Date).toLocaleDateString() : 'TBA'}</td>
                    <td style={tdStyle}>{prog.Venue || 'TBA'}</td>
                    <td style={tdStyle}>
                      <span style={{ backgroundColor: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: "999px", fontWeight: 600, fontSize: "12px" }}>
                        {prog.Total_Registration || 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {prog.IsConducted 
                        ? <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#16a34a'}}></div> Conducted</span>
                        : <span style={{ color: "#d97706", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}><div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#d97706'}}></div> Upcoming</span>}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                      No programmes match your current filters.
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

// --- Inline Styles typed as React.CSSProperties ---

const tabStyleBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  transition: "all 0.2s"
};

const selectStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: "14px",
  outline: "none",
  cursor: "pointer"
};

const exportBtnStyle: React.CSSProperties = {
  backgroundColor: "#4f46e5", 
  color: "#fff", 
  border: "none", 
  padding: "10px 20px", 
  borderRadius: "8px", 
  fontWeight: 600, 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  gap: "8px", 
  boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.3)"
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff", 
  padding: "24px", 
  borderRadius: "16px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", 
  border: "1px solid #f1f5f9"
};

const chartTitleStyle: React.CSSProperties = {
  margin: "0 0 20px 0", 
  fontSize: "16px", 
  color: "#334155", 
  fontWeight: 600
};

const thStyle: React.CSSProperties = {
  padding: "16px", 
  fontWeight: 600, 
  borderBottom: "2px solid #e2e8f0"
};

const tdStyle: React.CSSProperties = {
  padding: "16px", 
  color: "#334155", 
  fontSize: "14px",
  verticalAlign: "middle"
};