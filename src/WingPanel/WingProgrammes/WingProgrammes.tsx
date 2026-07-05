

// import { useState,useEffect } from "react";
// import { SupaBaseFunctionFunction } from "../../lib/SupaBaseFunction";

// import { useParams } from "react-router-dom";


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

// // create table public."CandidateRegistrationTable" (
// //   "CandidateUUiD" uuid not null default gen_random_uuid (),
// //   "Program_Code" character varying null,
// //   "Candidate_Code" character varying null,
// //   constraint CandidateRegistrationTable_pkey primary key ("CandidateUUiD")
// // ) TABLESPACE pg_default;

// export default function WingProgrammes(){
//     const {actWing} = useParams();
//     // fetch the wing code from Wingtable using this email 
//     // filter all programmes in the programes table 
//     // for each wing two action button 1. Registratio On/off 2. show all the candidate of praogames just belwo the progrme row by defult hide 
//     // cadidate display will his name class category and canpus name 
//     // using progrme code filter candidate in candaitae tbale 
//     return(
//         <div className="mx-auto max-w-[1600px] p-4 font-sans text-gray-800">
//             {/* --- CONTROLS HEADER --- */}
//             <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between border border-gray-100">
//                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
//                     <h1 className="text-2xl font-bold text-gray-900">All Users</h1>

//                 </div>

//                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
//                     {/* Search Bar */}
//                     <div className="relative">
//                         <input
//                             type="text"
//                             placeholder="Search by email or ID..."
//                             value={searchQuery}
//                             onChange={(e) => setSearchQuery(e.target.value)}
//                             className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-64"
//                         />
//                         <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
//                         </svg>
//                     </div>

//                     {/* Role Filter (New) */}
//                     <select
//                         value={roleFilter}
//                         onChange={(e) => setRoleFilter(e.target.value)}
//                         className="rounded-xl border border-gray-300 py-2 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     >
//                         <option value="All">All Roles</option>
//                         {uniqueRoles.map((role) => (
//                             <option key={role} value={role}>{role}</option>
//                         ))}
//                     </select>

//                     {/* Status Filter */}
//                     <select
//                         value={statusFilter}
//                         onChange={(e) => setStatusFilter(e.target.value)}
//                         className="rounded-xl border border-gray-300 py-2 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     >
//                         <option value="All">Groups</option>
//                         <option value="Active">Category</option>
//                         <option value="Inactive">IsResulted</option>
//                     </select>
//                 </div>
//             </div>
//         </div>
//     )
// }


import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
// Adjust this import based on how you export your SupaBaseFunction client
import { APPS_SCRIPT_URL, SupaBaseFunction } from "../../lib/SupaBase";

export default function WingProgrammes() {
  const { actWing } = useParams();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [wingData, setWingData] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  
  // Candidates State mapping: { [Program_Code]: Student[] }
  const [candidates, setCandidates] = useState({});
  const [expandedProgrammes, setExpandedProgrammes] = useState(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!actWing) {
        setError("No wing email provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Fetch Wing by Email
        const { data: wingResult, error: wingError } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("*")
          .eq("WingEmail", actWing)
          .single();

        if (wingError) throw wingError;
        if (!wingResult) throw new Error("Wing not found for this email.");
        setWingData(wingResult);

        // 2. Fetch Programmes for this Wing
        const { data: progResult, error: progError } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*")
          .eq("WingCode", wingResult.WingCode)
          .order("Date", { ascending: false });

        if (progError) throw progError;
        setProgrammes(progResult || []);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [actWing]);

  // --- HANDLERS ---
  
  // Toggle Registration Status
  const handleToggleRegistration = async (progCode, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setProgrammes((prev) =>
      prev.map((p) =>
        p.Program_Code === progCode ? { ...p, IsOpenRegistration: newStatus } : p
      )
    );

    // Update SupaBaseFunction
    const { error } = await SupaBaseFunction
      .from("ProgrammesBox")
      .update({ IsOpenRegistration: newStatus })
      .eq("Program_Code", progCode);

    if (error) {
      console.error("Failed to update registration status:", error);
      // Revert on failure
      setProgrammes((prev) =>
        prev.map((p) =>
          p.Program_Code === progCode ? { ...p, IsOpenRegistration: currentStatus } : p
        )
      );
    }
  };

  // Toggle Accordion and Fetch Candidates on Demand
  const handleToggleCandidates = async (progCode) => {
    const newExpanded = new Set(expandedProgrammes);
    
    if (newExpanded.has(progCode)) {
      newExpanded.delete(progCode);
      setExpandedProgrammes(newExpanded);
      return; // If closing, just update state and return
    }

    // Expanding
    newExpanded.add(progCode);
    setExpandedProgrammes(newExpanded);

    // Fetch candidates only if we haven't already fetched them
    if (!candidates[progCode]) {
      setLoadingCandidates((prev) => ({ ...prev, [progCode]: true }));
      try {
        // Step A: Get Candidate Codes for this programme
        const { data: registrations, error: regError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code")
          .eq("Program_Code", progCode);

        if (regError) throw regError;

        if (registrations && registrations.length > 0) {
          const candidateCodes = registrations.map((r) => r.Candidate_Code);
          
          // Step B: Get Student Details using those codes
          const { data: students, error: studentError } = await SupaBaseFunction
            .from("StudentsBox")
            .select("*")
            .in("AddNo", candidateCodes);

          if (studentError) throw studentError;
          setCandidates((prev) => ({ ...prev, [progCode]: students || [] }));
        } else {
          setCandidates((prev) => ({ ...prev, [progCode]: [] })); // No candidates found
        }
      } catch (err) {
        console.error("Error fetching candidates:", err);
        setCandidates((prev) => ({ ...prev, [progCode]: [] }));
      } finally {
        setLoadingCandidates((prev) => ({ ...prev, [progCode]: false }));
      }
    }
  };

  // --- DERIVED DATA & FILTERS ---
  const { filteredProgrammes, uniqueGroups, uniqueCategories } = useMemo(() => {
    const groups = [...new Set(programmes.map((p) => p.Group).filter(Boolean))];
    const categories = [...new Set(programmes.map((p) => p.Category).filter(Boolean))];

    let filtered = programmes.filter((p) =>
      (p.Program_Title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.Program_Code?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (groupFilter !== "All") filtered = filtered.filter((p) => p.Group === groupFilter);
    if (categoryFilter !== "All") filtered = filtered.filter((p) => p.Category === categoryFilter);

    return { filteredProgrammes: filtered, uniqueGroups: groups, uniqueCategories: categories };
  }, [programmes, searchQuery, groupFilter, categoryFilter]);

  // --- RENDER HELPERS ---
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-rose-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h2 className="text-xl font-bold text-slate-800">Unable to load Wing</h2>
          <p className="mt-2 text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 font-sans text-slate-800 bg-slate-50 min-h-screen">
      
      {/* --- HEADER --- */}
      <div className="mb-8 flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm border border-slate-100 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wing Programmes</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Managing <span className="font-semibold text-indigo-600">{wingData?.WingTitle}</span> ({wingData?.WingCode})
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 sm:w-64"
            />
            <svg className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
          >
            <option value="All">All Groups</option>
            {uniqueGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- PROGRAMMES LIST --- */}
      <div className="flex flex-col gap-4">
        {filteredProgrammes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm border border-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-slate-500 font-medium">No programmes found matching your filters.</p>
          </div>
        ) : (
          filteredProgrammes.map((prog) => {
            const isExpanded = expandedProgrammes.has(prog.Program_Code);
            const isLoadingCands = loadingCandidates[prog.Program_Code];
            const progCandidates = candidates[prog.Program_Code] || [];

            return (
              <div key={prog.Program_Code} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden transition-all">
                {/* PROGRAMME HEADER ROW */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 gap-4">
                  {/* Info Section */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
                        {prog.Program_Code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800">{prog.Program_Title}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                      {prog.Date && (
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {new Date(prog.Date).toLocaleDateString()}
                        </div>
                      )}
                      {prog.Category && (
                        <div className="flex items-center gap-1.5">
                           <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                           {prog.Category}
                        </div>
                      )}
                      {prog.Group && (
                        <div className="flex items-center gap-1.5">
                           <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                           {prog.Group}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex flex-wrap items-center gap-4 lg:gap-8 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                    
                    {/* Toggle Registration */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">Registration</span>
                      <button
                        onClick={() => handleToggleRegistration(prog.Program_Code, prog.IsOpenRegistration)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          prog.IsOpenRegistration ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            prog.IsOpenRegistration ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-bold ${prog.IsOpenRegistration ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {prog.IsOpenRegistration ? "ON" : "OFF"}
                      </span>
                    </div>

                    {/* Show Candidates Button */}
                    <button
                      onClick={() => handleToggleCandidates(prog.Program_Code)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isExpanded 
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {isExpanded ? "Hide Candidates" : "Show Candidates"}
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                  </div>
                </div>

                {/* EXPANDED CANDIDATES SECTION */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                    {isLoadingCands ? (
                      <div className="flex justify-center items-center py-8">
                         <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
                         <span className="ml-3 text-sm text-slate-500 font-medium">Loading candidates...</span>
                      </div>
                    ) : progCandidates.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-500 font-medium">
                        No candidates have registered for this programme yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Candidate</th>
                              <th className="px-6 py-3">Class</th>
                              <th className="px-6 py-3">Campus / College</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {progCandidates.map((student) => (
                              <tr key={student.AddNo} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={student.Student_Photo_Urls} 
                                      alt={student.StudentName} 
                                      className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                      onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.StudentName || 'S'); }}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-900">{student.StudentName}</span>
                                      <span className="text-xs text-slate-500 font-mono">{student.AddNo}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  {student.Class || "N/A"}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                  {student.CollegeName || "N/A"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}