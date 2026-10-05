import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";
import SafeImage from "../../lib/SafeImage";
import { resolveStudentProfile, type LoggedInStudentProfile } from "../../lib/accountResolver";
import { GraduationCap, Award, Compass, Zap } from "lucide-react";

// --- Type Definitions ---
interface Student extends LoggedInStudentProfile {
  Grand_Total_Points?: number;
  Registration_Count?: number;
  OutReach_Count?: number;
  Achievements_Counts?: number;
  Total_Point_Anjuman?: number;
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
  
  const [student, setStudent] = useState<Student | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !localStorage.getItem("cached_student_profile"));
  const [programs, setPrograms] = useState<Program[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [programFilter, setProgramFilter] = useState<string>("All");

  useEffect(() => {
    let isMounted = true;

    const fetchStudentData = async (silent = false) => {
      if (!silent && !student) {
        setLoading(true);
      }
      try {
        const studentData = await resolveStudentProfile(actStn);
        if (!studentData) throw new Error("Student not found");

        if (isMounted) {
          setStudent(studentData as Student);
        }

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
          if (isMounted) setPrograms(programsData || []);
        }

        const { data: outreachData } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("StnAddNo", addNo);
        if (isMounted) setOutreach(outreachData || []);

        const { data: achievementsData } = await SupaBaseFunction
          .from("StudentsAchievements")
          .select("*")
          .eq("StnAddNo", addNo);
        if (isMounted) setAchievements(achievementsData || []);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error fetching student analytics:", errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudentData(Boolean(student));

    const handleProfileSync = () => {
      fetchStudentData(true);
    };
    window.addEventListener("student-profile-synced", handleProfileSync);

    return () => {
      isMounted = false;
      window.removeEventListener("student-profile-synced", handleProfileSync);
    };
  }, [actStn]);

  const programGroups = ["All", ...new Set(programs.map(p => p.Group).filter(Boolean))];
  const filteredPrograms = programFilter === "All" 
    ? programs 
    : programs.filter(p => p.Group === programFilter);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800">Student Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">Please ensure your account credentials are valid.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-28 font-sans px-1 sm:px-2">
      
      {/* HEADER HERO: CLEAN WHITE BACKGROUND, COLLAPSES ON SMALL SCREENS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left min-w-0">
          {/* Real Student Photo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
            {student.Student_Photo_Urls ? (
              <SafeImage
                src={student.Student_Photo_Urls} 
                alt={student.StudentName} 
                fallbackCategory="student"
                fallbackText={student.StudentName}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-2xl flex items-center justify-center">
                {(student.StudentName || "S")[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              {student.StudentName}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {student.Class || "Student"} | {student.CollegeName || "DHIU Institute"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-0.5 rounded-full text-xs font-semibold">
              <span>ID:</span>
              <span className="font-mono">{student.AddNo}</span>
            </div>
          </div>
        </div>

        {/* Grand Total Points Badge */}
        <div className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shrink-0 shadow-xs flex sm:flex-col items-center justify-between sm:justify-center gap-1 min-w-[150px]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</p>
          <p className="text-3xl sm:text-4xl font-black text-indigo-600 flex items-center gap-1">
            <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
            {student.Grand_Total_Points || 0}
          </p>
          <span className="text-[10px] font-bold text-slate-400">Total Points</span>
        </div>
      </div>

      {/* OVERVIEW STATS GRID (COLLAPSES: 2 COLUMNS ON MOBILE, 4 ON DESKTOP) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <OverviewClipBox 
          BoxTitle="Events Joined" 
          BoxValue={programs.length} 
          BoxSvgLogo={<GraduationCap className="w-5 h-5 text-indigo-600" />} 
        />
        <OverviewClipBox 
          BoxTitle="Achievements" 
          BoxValue={achievements.length} 
          BoxSvgLogo={<Award className="w-5 h-5 text-amber-500" />} 
        />
        <OverviewClipBox 
          BoxTitle="Outreach" 
          BoxValue={outreach.length} 
          BoxSvgLogo={<Compass className="w-5 h-5 text-cyan-600" />} 
        />
        <OverviewClipBox 
          BoxTitle="Anjuman Points" 
          BoxValue={student.Total_Point_Anjuman || 0} 
          BoxSvgLogo={<Zap className="w-5 h-5 text-emerald-600" />} 
        />
      </div>

      {/* FILTER & PROGRAMMES LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Enrolled Activities ({filteredPrograms.length})</h2>
          
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {programGroups.map(group => (
              <button
                key={group}
                onClick={() => setProgramFilter(group)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  programFilter === group
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No programs enrolled in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map(prog => (
              <div key={prog.Program_Code} className="border border-slate-200 rounded-2xl p-4 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      {prog.Group || "General"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">#{prog.Program_Code}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{prog.Program_Title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prog.Description}</p>
                </div>
                
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{prog.Category || "Standard"}</span>
                  <span className={prog.IsConducted ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                    {prog.IsConducted ? "Conducted" : "Upcoming"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
