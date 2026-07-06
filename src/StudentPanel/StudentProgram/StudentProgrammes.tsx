import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";

export default function StudentProgrammes() {
  const { actStn } = useParams(); // StudentEmail from the URL
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [programs, setPrograms] = useState([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");



  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        // 1. Fetch Student AddNo via Email
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, StudentEmail")
          .eq("StudentEmail", actStn)
          .single();

        if (studentError || !studentData) throw studentError;
        setStudent(studentData);

        // 2. Fetch all registered program codes for this student
        const { data: registrations } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", studentData.AddNo);

        const programCodes = registrations?.map((reg) => reg.Program_Code) || [];

        // 3. Fetch actual program details
        if (programCodes.length > 0) {
          const { data: programsData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .in("Program_Code", programCodes)
            .order("Date", { ascending: false }); // Show newest first
            
          setPrograms(programsData || []);
        }
      } catch (error) {
        console.error("Error fetching student programs:", error);
      } finally {
        setLoading(false);
      }
    };

    if (actStn) fetchPrograms();
  }, [actStn]);

  // Derived state for stats and filtering
  const conductedCount = programs.filter(p => p.IsConducted).length;
  const upcomingCount = programs.length - conductedCount;
  
  const categories = ["All", ...new Set(programs.map(p => p.Category).filter(Boolean))];

  // Apply filters
  const filteredPrograms = programs.filter(prog => {
    const matchesCategory = categoryFilter === "All" || prog.Category === categoryFilter;
    let matchesStatus = true;
    
    if (statusFilter === "Upcoming") matchesStatus = !prog.IsConducted;
    if (statusFilter === "Completed") matchesStatus = prog.IsConducted;
    if (statusFilter === "Result Out") matchesStatus = prog.IsResultPublished;

    return matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center mt-20 text-gray-500">
        <h2 className="text-2xl font-bold text-gray-700">Student Not Found</h2>
        <p>We couldn't find a profile for this email.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Event Portfolio</h1>
            <p className="text-gray-500 mt-2">
              Welcome back, <span className="font-semibold text-blue-600">{student.StudentName}</span>. Here is your activity track record.
            </p>
          </div>
        </div>

        {/* Top Summary Stats using OverviewClipBox */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OverviewClipBox
            BoxTitle="Total Enrolled"
            BoxValue={programs.length}
            variant="blue"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Events Completed"
            BoxValue={conductedCount}
            variant="emerald"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Upcoming Action"
            BoxValue={upcomingCount}
            variant="orange"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            }
          />
        </div>

        {/* Filters Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Status Pills */}
          <div className="flex space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            {["All", "Upcoming", "Completed", "Result Out"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  statusFilter === status 
                    ? "bg-white text-blue-700 shadow-sm border border-gray-200" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-500">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat || "Uncategorized"}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Program Cards Grid */}
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <h3 className="text-xl font-bold text-gray-700">No Programs Found</h3>
            <p className="text-gray-500 mt-2">Adjust your filters or register for new upcoming events to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((prog) => (
              <div 
                key={prog.Program_Code} 
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Poster Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={prog.Program_Poster} 
                    alt={prog.Program_Title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {prog.IsResultPublished && (
                      <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
                        🏆 Result Out
                      </span>
                    )}
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md ${
                      prog.IsConducted 
                        ? "bg-emerald-500/90 text-white" 
                        : "bg-amber-400/90 text-amber-950"
                    }`}>
                      {prog.IsConducted ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {prog.Category || "Event"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      CODE: {prog.Program_Code}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                    {prog.Program_Title}
                  </h3>
                  
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                    {prog.Description}
                  </p>

                  <div className="mt-auto border-t border-gray-50 pt-4 flex items-center justify-between text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {prog.Date ? new Date(prog.Date).toLocaleDateString() : "TBA"}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {prog.Venue || "TBA"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}