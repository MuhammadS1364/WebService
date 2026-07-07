import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";

// --- Type Definitions based on your Database Schema ---
interface Student {
  AddNo: string;
  StudentName: string;
  Student_Photo_Urls: string;
  Class: string;
  CollegeName: string;
  Grand_Total_Points: number;
  Registration_Count: number;
  OutReach_Count: number;
  Achievements_Counts: number;
  Total_Point_Anjuman: number;
}

interface Program {
  Program_Code: string;
  Program_Title: string;
  Program_Poster: string;
  Description: string;
  Category: string;
  Group: string;
  IsConducted: boolean;
  IsResultPublished: boolean;
}

interface Achievement {
  Achieve_Id: string;
  Achievement_Title: string;
  Position_Achieved: string;
  Point_Obtained: number;
}

interface Outreach {
  OutReach_Id: string;
  OutReach_Title: string;
  OutReach_Type: string;
  Point_Obtained: number;
}

export default function StudentAnalytics() {
  const { actStn } = useParams<{ actStn: string }>();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [programFilter, setProgramFilter] = useState<string>("All");

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!actStn) return;
      setLoading(true);
      try {
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .eq("StudentEmail", actStn)
          .single();

        if (studentError || !studentData) throw studentError;
        setStudent(studentData);

        const addNo = studentData.AddNo;

        const { data: registrations } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", addNo);

        const programCodes = registrations?.map((reg: { Program_Code: string }) => reg.Program_Code) || [];

        if (programCodes.length > 0) {
          const { data: programsData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .in("Program_Code", programCodes);
          setPrograms(programsData || []);
        }

        const { data: outreachData } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("StnAddNo", addNo);
        setOutreach(outreachData || []);

        const { data: achievementsData } = await SupaBaseFunction
          .from("StudentsAchievements")
          .select("*")
          .eq("StnAddNo", addNo);
        setAchievements(achievementsData || []);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error fetching student analytics:", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [actStn]);

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className=" mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center gap-6">
          <img 
            src={student.Student_Photo_Urls} 
            alt={student.StudentName} 
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
          />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight">{student.StudentName}</h1>
            <p className="text-indigo-100 mt-2 text-lg">{student.Class} | {student.CollegeName}</p>
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

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <OverviewClipBox BoxTitle="Events Registered" BoxValue={student.Registration_Count} variant="blue" BoxSvgLogo={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          <OverviewClipBox BoxTitle="Outreach Activities" BoxValue={student.OutReach_Count} variant="orange" BoxSvgLogo={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <OverviewClipBox BoxTitle="Total Achievements" BoxValue={student.Achievements_Counts} variant="emerald" BoxSvgLogo={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>} />
          
          {/* METHOD FIX: Changed invalid 'purple' variant to allowed 'rose' variant */}
          <OverviewClipBox BoxTitle="Anjuman Points" BoxValue={student.Total_Point_Anjuman} variant="rose" BoxSvgLogo={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Registered Programs</h2>
              <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-2">
                {programGroups.map((group) => <option key={group} value={group}>{group || "Uncategorized"}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrograms.map((prog) => (
                <div key={prog.Program_Code} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50">
                  <img src={prog.Program_Poster} alt={prog.Program_Title} className="w-full max-h-125 object-cover" />
                  <div className="p-4">
                    <div className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-wider">{prog.Category || "Event"}</div>
                    <h3 className="font-bold text-gray-900 truncate">{prog.Program_Title}</h3>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${prog.IsConducted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {prog.IsConducted ? "Conducted" : "Upcoming"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
              <h2 className="text-xl font-bold text-emerald-900 mb-4">🏆 Top Achievements</h2>
              {achievements.map((ach) => (
                <div key={ach.Achieve_Id} className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-emerald-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{ach.Achievement_Title}</h4>
                    <p className="text-xs text-emerald-600 font-medium">{ach.Position_Achieved}</p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg text-sm">+{ach.Point_Obtained} pts</div>
                </div>
              ))}
            </div>

            <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
              <h2 className="text-xl font-bold text-orange-900 mb-4">🌍 Outreach Impact</h2>
              {outreach.map((out) => (
                <div key={out.OutReach_Id} className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-orange-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{out.OutReach_Title}</h4>
                    <p className="text-xs text-orange-600 font-medium">{out.OutReach_Type}</p>
                  </div>
                  <div className="bg-orange-100 text-orange-700 font-bold px-3 py-1.5 rounded-lg text-sm">+{out.Point_Obtained} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}