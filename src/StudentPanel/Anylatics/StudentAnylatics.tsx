
// import { useState,useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import { useParams } from "react-router-dom";
// import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";
// export default function StudentAnylatics(){
//     // <OverviewClipBox
//     // BoxTitle: any;
//     // BoxValue: any;
//     // BoxSvgLogo: any;
//     // variant?: string;
//     // />
//     const {actStn} = useParams();
//     // an email wiht recived via actstn and serch the addNo in studnet and catch it
//     // filter in candidate table and mathc th candiate colun and filter all the programme code 
//     // filder all the progrma using the fonded progm code in programe table and dis palye it     
//     // check in result , outreach , achieve ment table and create a anylitcs compont for the student 
//     // filter feature for porgrmae as group , etc 
// }

// // best anylatic that icoureage studnet to import their ows status 
// // choose best colur ui ux desing for more impact on virews 

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
// Assuming SupaBaseFunction returns your initialized supabase client
import { SupaBaseFunction } from "../../lib/SupaBase"; 
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";

export default function StudentAnalytics() {
  const { actStn } = useParams(); // Expected to be the StudentEmail
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [achievements, setAchievements] = useState([]);
  
  // Filtering state for programs
  const [programFilter, setProgramFilter] = useState("All");


  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Student by Email
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .eq("StudentEmail", actStn)
          .single();

        if (studentError || !studentData) throw studentError;
        setStudent(studentData);

        const addNo = studentData.AddNo;

        // 2. Fetch Candidate Registrations using AddNo
        const { data: registrations } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", addNo);

        const programCodes = registrations?.map((reg) => reg.Program_Code) || [];

        // 3. Fetch Program Details if registered
        if (programCodes.length > 0) {
          const { data: programsData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .in("Program_Code", programCodes);
          setPrograms(programsData || []);
        }

        // 4. Fetch Outreach
        const { data: outreachData } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("StnAddNo", addNo);
        setOutreach(outreachData || []);

        // 5. Fetch Achievements
        const { data: achievementsData } = await SupaBaseFunction
          .from("StudentsAchievements")
          .select("*")
          .eq("StnAddNo", addNo);
        setAchievements(achievementsData || []);

      } catch (error) {
        console.error("Error fetching student analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (actStn) fetchStudentData();
  }, [actStn]);

  // Derive filter categories from registered programs
  const programGroups = ["All", ...new Set(programs.map(p => p.Group).filter(Boolean))];
  const filteredPrograms = programFilter === "All" 
    ? programs 
    : programs.filter(p => p.Group === programFilter);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center mt-20 text-gray-500">
        <h2 className="text-2xl font-bold text-gray-700">Student Not Found</h2>
        <p>No records attached to this email.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- Header / Hero Profile --- */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center gap-6">
          <img 
            src={student.Student_Photo_Urls} 
            alt={student.StudentName} 
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
          />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight">{student.StudentName}</h1>
            <p className="text-indigo-100 mt-2 text-lg">
              {student.Class} | {student.CollegeName}
            </p>
            <div className="mt-4 inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide border border-white/30">
              ID: {student.AddNo}
            </div>
          </div>
          <div className="bg-white text-indigo-900 rounded-2xl p-6 text-center shadow-lg transform transition hover:scale-105">
            <p className="text-sm font-bold text-gray-500 uppercase">Grand Total Points</p>
            <p className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              {student.Grand_Total_Points}
            </p>
          </div>
        </div>

        {/* --- Top Analytics Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <OverviewClipBox
            BoxTitle="Events Registered"
            BoxValue={student.Registration_Count}
            variant="blue"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Outreach Activities"
            BoxValue={student.OutReach_Count}
            variant="orange"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Total Achievements"
            BoxValue={student.Achievements_Counts}
            variant="emerald"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Anjuman Points"
            BoxValue={student.Total_Point_Anjuman}
            variant="purple"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- Registered Programs Section (Left Column, Span 2) --- */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Registered Programs</h2>
              
              {/* Filter Dropdown */}
              <select 
                value={programFilter} 
                onChange={(e) => setProgramFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {programGroups.map((group, idx) => (
                  <option key={idx} value={group}>{group || "Uncategorized"}</option>
                ))}
              </select>
            </div>

            {filteredPrograms.length === 0 ? (
              <p className="text-gray-400 italic">No programs registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrograms.map((prog) => (
                  <div key={prog.Program_Code} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-gray-50">
                    <img 
                      src={prog.Program_Poster} 
                      alt={prog.Program_Title} 
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-4">
                      <div className="text-xs font-bold text-indigo-600 mb-1 tracking-wider uppercase">
                        {prog.Category || "Event"}
                      </div>
                      <h3 className="font-bold text-gray-900 truncate">{prog.Program_Title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{prog.Description}</p>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          prog.IsConducted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {prog.IsConducted ? "Conducted" : "Upcoming"}
                        </span>
                        {prog.IsResultPublished && (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                            Result Out
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- Right Column: Achievements & Outreach --- */}
          <div className="space-y-8">
            
            {/* Achievements Card */}
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
              <h2 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                🏆 Top Achievements
              </h2>
              {achievements.length === 0 ? (
                <p className="text-emerald-700/60 text-sm">No achievements recorded yet. Keep pushing!</p>
              ) : (
                <div className="space-y-3">
                  {achievements.map((ach) => (
                    <div key={ach.Achieve_Id} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-800">{ach.Achievement_Title}</h4>
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">{ach.Position_Achieved}</p>
                      </div>
                      <div className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg text-sm">
                        +{ach.Point_Obtained} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outreach Card */}
            <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
              <h2 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                🌍 Outreach Impact
              </h2>
              {outreach.length === 0 ? (
                <p className="text-orange-700/60 text-sm">Start participating in outreach to earn points!</p>
              ) : (
                <div className="space-y-3">
                  {outreach.map((out) => (
                    <div key={out.OutReach_Id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-800">{out.OutReach_Title}</h4>
                        <p className="text-xs text-orange-600 font-medium mt-0.5">{out.OutReach_Type}</p>
                      </div>
                      <div className="bg-orange-100 text-orange-700 font-bold px-3 py-1.5 rounded-lg text-sm">
                        +{out.Point_Obtained} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}