


// import { useState, useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";

// // a WingCode (Active Wing logged wing ) will provided and using the fillter all these tables and generate anylatics of wing 
// // create table public."Chs-WingS" (
// //   "WingCode" character varying not null,
// //   "WingTitle" character varying null,
// //   "WingEmail" text null,
// //   "WingManager" character varying null,
// //   "WingConvener" character varying null,
// //   "WingAssistant" character varying null,
// //   "Total_Registrations" integer null default 0,
// //   "Total_Resulted" integer null default 0,
// //   "Total_Points" integer null default 0,
// //   "Bonus_Points" integer null default 0,
// //   "Description" text null,
// //   "WingUserId" character varying null,
// //   constraint Chs - WingS_pkey primary key ("WingCode")
// // ) TABLESPACE pg_default;

// // create table public."ProgrammesBox" (
// //   "Program_Title" character varying null,
// //   "Program_Code" character varying not null,
// //   "WingCode" character varying null,
// //   "Description" text null,
// //   "OutComes" text null,
// //   "Date" date null,
// //   "Venue" character varying null,
// //   "Category" character varying null,
// //   "Group" character varying null,
// //   "IsApproved" boolean null default false,
// //   "IsResulted" boolean null default false,
// //   "IsResultPublished" boolean null default false,
// //   "Total_Registration" integer null default 0,
// //   "IsOpenRegistration" boolean null default true,
// //   "Program_Poster" character varying null default 'https://media.licdn.com/dms/image/v2/C5112AQH1xW5oeiHzvg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520148394987?e=2147483647&v=beta&t=vThHQ4hcg90pr_O3kI_FOE_Z4jULLSBg4L280dD6-DE'::character varying,
// //   constraint ProgrammesBox_pkey primary key ("Program_Code")
// // ) TABLESPACE pg_default;

// // create table public."ResultBox" (
// //   "Result_id" uuid not null default gen_random_uuid (),
// //   "creaded_At" timestamp without time zone null,
// //   "Program_Id" character varying null,
// //   "First_Holder" character varying null,
// //   "Second_Holder" character varying null,
// //   "Third_Holder" character varying null,
// //   "AGrade" character varying null default 'No Grade'::character varying,
// //   "BGrade" character varying null,
// //   constraint ResultBox_pkey primary key ("Result_id"),
// //   constraint ResultBox_Program_Id_fkey foreign KEY ("Program_Id") references "ProgrammesBox" ("Program_Code") on update CASCADE on delete CASCADE
// // ) TABLESPACE pg_default;
// export default function WingAnylatics() {
//     return (
//         <div className="mx-auto max-w-[1600px] p-4 font-sans text-gray-800">
//             {/* --- CONTROLS HEADER --- */}
//             <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between border border-gray-100">
//                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
//                     <h1 className="text-2xl font-bold text-gray-900">Wing Anylatics</h1>
//                     <p>Wing Name</p>
//                 </div>

//                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
//                     {/* Search Bar */}
//                     <div className="relative">
//                         <input
//                             type="text"
//                             placeholder="Search by email or ID..."
//                             // value={searchQuery}
//                             // onChange={(e) => setSearchQuery(e.target.value)}
//                             className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-64"
//                         />
//                         <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
//                         </svg>
//                     </div>

//                     {/* Role Filter (New) */}
//                     <select
//                         // value={roleFilter}
//                         // onChange={(e) => setRoleFilter(e.target.value)}
//                         className="rounded-xl border border-gray-300 py-2 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     >
//                         <option value="All">All Roles</option>
//                         {/* {uniqueRoles.map((role) => (
//                             <option key={role} value={role}>{role}</option>
//                         ))} */}
//                     </select>

//                     {/* Status Filter */}
//                     <select
//                         // value={statusFilter}
//                         // onChange={(e) => setStatusFilter(e.target.value)}
//                         className="rounded-xl border border-gray-300 py-2 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     >
//                         <option value="All">Category</option>
//                         <option value="Active">Group</option>
//                         <option value="Inactive">Tota_Registration</option>
//                     </select>
//                 </div>
//             </div>

//             {/* overview clipbox */}
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                 <OverViewClipBox
//                     BoxTitle={"Total Program"}
//                     BoxValue={10}
//                     BoxSvgLogo={
//                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
//                             <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
//                             <path d="M22 10v6"></path>
//                             <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
//                         </svg>
//                     }
//                 />
//                 <OverViewClipBox
//                     BoxTitle={"Total Result"}
//                     BoxValue={10}
//                     BoxSvgLogo={
//                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
//                             <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
//                             <path d="M22 10v6"></path>
//                             <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
//                         </svg>
//                     }
//                 />
//                 <OverViewClipBox
//                     BoxTitle={"Total Participations"}
//                     BoxValue={10}
//                     BoxSvgLogo={
//                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
//                             <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
//                             <path d="M22 10v6"></path>
//                             <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
//                         </svg>
//                     }
//                 />
//                 <OverViewClipBox
//                     BoxTitle={"Total Participations"}
//                     BoxValue={10}
//                     BoxSvgLogo={
//                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
//                             <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
//                             <path d="M22 10v6"></path>
//                             <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
//                         </svg>
//                     }
//                 />
//             </div >

//                 {/* bar chart , pie chart and filter own programes in better way  */}
//                 {/* best ui ux and easy to usnder stand beautiful resuut scholoye color to imporve then wing can grow next time */}

//         </div>
//     )

// }

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
// IMPORTANT: Replace this with the correct path to your Supabase client instance

// --- INLINED COMPONENTS FOR SINGLE-FILE EXECUTION ---

// 1. Overview Clip Box Component
const OverViewClipBox = ({ BoxTitle, BoxValue, BoxSvgLogo, color = "indigo" }) => {
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
  // --- STATE ---
  // Extract actWing (WingEmail) from the URL parameters
  const { actWing } = useParams(); 
  
  const [loading, setLoading] = useState(true);
  const [wingData, setWingData] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // --- DATA FETCHING (SUPABASE LOGIC) ---
  useEffect(() => {
    const fetchWingAndProgrammes = async () => {
      if (!actWing) {
        setError("No wing email provided in the URL parameters.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Wing Data using the actWing (WingEmail)
        const { data: wingResult, error: wingError } = await SupaBaseFunction
          .from('Chs-WingS')
          .select('*')
          .eq('WingEmail', actWing)
          .single(); // Use single() because we expect exactly one matching wing

        if (wingError) throw new Error(wingError.message);
        if (!wingResult) throw new Error("Wing not found for this email address.");

        setWingData(wingResult);

        // 2. Fetch Programmes associated with that WingCode
        const { data: programmesResult, error: progError } = await SupaBaseFunction
          .from('ProgrammesBox')
          .select('*')
          .eq('WingCode', wingResult.WingCode);

        if (progError) throw new Error(progError.message);

        setProgrammes(programmesResult || []);

      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWingAndProgrammes();
  }, [actWing]);

  // --- DERIVED ANALYTICS ---
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

    // Filter out null/undefined categories just in case
    const validCategories = programmes.map(p => p.Category).filter(Boolean);
    const uniqueCategories = [...new Set(validCategories)];
    
    // Bar Chart Data (Registrations per Category)
    const categoryStats = uniqueCategories.map(cat => ({
      name: cat,
      totalReg: programmes.filter(p => p.Category === cat).reduce((sum, p) => sum + (p.Total_Registration || 0), 0)
    }));

    const maxReg = Math.max(...categoryStats.map(c => c.totalReg), 1); // Avoid div by 0

    return { 
      filteredProgrammes: filtered, 
      categories: uniqueCategories,
      stats: { categoryStats, maxReg }
    };
  }, [programmes, searchQuery, categoryFilter, statusFilter]);

  const totalProgramsCount = programmes.length;
  const publishedResultsCount = programmes.filter(p => p.IsResultPublished).length;
  const completionPercentage = totalProgramsCount === 0 ? 0 : Math.round((publishedResultsCount / totalProgramsCount) * 100);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <div className="text-rose-500 font-medium text-lg">Error loading dashboard</div>
        <div className="text-slate-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 font-sans text-slate-800 bg-slate-50 min-h-screen">
      
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
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 sm:w-64"
            />
            <svg className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-700 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Results Published</option>
            <option value="Pending">Results Pending</option>
          </select>
        </div>
      </div>

      {/* --- OVERVIEW METRICS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <OverViewClipBox
          BoxTitle="Total Programmes"
          BoxValue={totalProgramsCount}
          color="indigo"
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
          }
        />
        <OverViewClipBox
          BoxTitle="Total Registrations"
          BoxValue={wingData?.Total_Registrations || 0}
          color="blue"
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <OverViewClipBox
          BoxTitle="Results Published"
          BoxValue={publishedResultsCount}
          color="emerald"
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />
        <OverViewClipBox
          BoxTitle="Total Points"
          BoxValue={(wingData?.Total_Points || 0) + (wingData?.Bonus_Points || 0)}
          color="amber"
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          }
        />
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Bar Chart: Registrations by Category */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Registrations per Category
          </h2>
          
          <div className="flex-1 flex items-end gap-4 h-48 mt-auto border-b border-slate-200 pb-2">
            {stats.categoryStats.length > 0 ? (
              stats.categoryStats.map((stat) => (
                <div key={stat.name} className="flex-1 flex flex-col items-center justify-end gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded-md pointer-events-none z-10">
                    {stat.totalReg} Reg.
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full max-w-[3rem] bg-indigo-500 rounded-t-md transition-all duration-500 hover:bg-indigo-600"
                    style={{ height: `${(stat.totalReg / stats.maxReg) * 100}%`, minHeight: '4px' }}
                  ></div>
                  <span className="text-xs font-semibold text-slate-500 truncate w-full text-center">{stat.name}</span>
                </div>
              ))
            ) : (
              <div className="w-full text-center text-slate-400 text-sm pb-10">No data available</div>
            )}
          </div>
        </div>

        {/* Donut Chart: Result Publication Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center relative">
           <h2 className="text-lg font-bold text-slate-800 mb-2 w-full flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
             Result Status
           </h2>
           
           <div className="relative w-40 h-40 mt-4 flex items-center justify-center">
             {/* Background Circle */}
             <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                {/* Progress Circle */}
                <path
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${completionPercentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
             </svg>
             {/* Center Text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-3xl font-extrabold text-slate-800">{completionPercentage}%</span>
               <span className="text-xs text-slate-500 font-medium">Published</span>
             </div>
           </div>
           
           <div className="flex items-center gap-4 mt-6 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Published
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-slate-200"></span> Pending
              </div>
           </div>
        </div>

      </div>

      {/* --- PROGRAMMES TABLE --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
           <h2 className="text-lg font-bold text-slate-800">Wing Programmes</h2>
           <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
             {filteredProgrammes.length} found
           </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Registrations</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProgrammes.length > 0 ? (
                filteredProgrammes.map((prog) => (
                  <tr key={prog.Program_Code} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-500">{prog.Program_Code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{prog.Program_Title}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">
                        {prog.Category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {prog.Total_Registration || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {prog.IsResultPublished ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full text-xs">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                           </svg>
                           Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-full text-xs">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                           </svg>
                           Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       <p>No programmes match your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}