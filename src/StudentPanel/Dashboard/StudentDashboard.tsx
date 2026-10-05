import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Components
import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";

// Libs
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveStudentProfile } from "../../lib/accountResolver";

// --- TypeScript Interfaces ---
export interface Student {
  AddNo: string;
  StudentEmail: string;
  Name?: string;
  StudentName: string;
  Grand_Total_Points: number;
  Student_Photo_Urls?: string;
}

export interface Program {
  Program_Code: string;
  Program_Name?: string;
}

export interface Outreach {
  id?: string;
  StnAddNo: string;
}

export interface Achievement {
  id?: string;
  StnAddNo: string;
}

interface StnStats {
  programsCount: number;
  outreachCount: number;
  achievementsCount: number;
  totalPoints: number;
}

export default function StudentDashboard() {
  const { actStn } = useParams<{ actStn: string }>();

  // State Management with Instant Cache Loading
  const [student, setStudent] = useState<Student | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [cachedStats, setCachedStats] = useState<StnStats>(() => {
    try {
      const cached = localStorage.getItem("cached_stn_stats");
      return cached ? JSON.parse(cached) : { programsCount: 0, outreachCount: 0, achievementsCount: 0, totalPoints: 0 };
    } catch {
      return { programsCount: 0, outreachCount: 0, achievementsCount: 0, totalPoints: 0 };
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("cached_student_profile");
    } catch {
      return true;
    }
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchStudentData = async (silent = false) => {
      // Only set loading if we have zero cached student data
      if (!silent && !student) {
        setLoading(true);
      }

      try {
        // 1. Fetch Student Details via robust resolver (checks email, AddNo, and localStorage)
        const studentData = await resolveStudentProfile(actStn);

        if (!studentData) {
          throw new Error("Student record could not be found");
        }

        if (isMounted) {
          setStudent(studentData as Student);
        }

        const addNo = studentData.AddNo;

        // 2, 3, 4, 5. Parallel Fetch to prevent waterfall delays
        const [regResult, outreachResult, achieveResult] = await Promise.all([
          SupaBaseFunction
            .from("CandidateRegistrationTable")
            .select("Program_Code")
            .eq("Candidate_Code", addNo),
          SupaBaseFunction
            .from("StudentsOutReach")
            .select("*")
            .eq("StnAddNo", addNo),
          SupaBaseFunction
            .from("StudentsAchievements")
            .select("*")
            .eq("StnAddNo", addNo)
        ]);

        const registrations = regResult.data || [];
        const outreachData = outreachResult.data || [];
        const achievementsData = achieveResult.data || [];

        if (isMounted) {
          setOutreach(outreachData);
          setAchievements(achievementsData);
        }

        let programsData: Program[] = [];
        const programCodes = registrations.map((reg: { Program_Code: string }) => reg.Program_Code).filter(Boolean);
        if (programCodes.length > 0) {
          const { data: pData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .in("Program_Code", programCodes);
          programsData = (pData as Program[]) || [];
          if (isMounted) {
            setPrograms(programsData);
          }
        }

        const updatedStats: StnStats = {
          programsCount: programsData.length || registrations.length,
          outreachCount: outreachData.length,
          achievementsCount: achievementsData.length,
          totalPoints: studentData.Grand_Total_Points || 0,
        };

        if (isMounted) {
          setCachedStats(updatedStats);
          try {
            localStorage.setItem("cached_stn_stats", JSON.stringify(updatedStats));
          } catch (e) {
            console.error(e);
          }
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error fetching student dashboard data:", errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStudentData(Boolean(student));

    // Real-time listener for profile updates: syncs silently without blinking
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && isMounted) {
        setStudent(prev => prev ? { ...prev, ...customEvent.detail } : customEvent.detail);
      } else {
        fetchStudentData(true);
      }
    };
    window.addEventListener("student-profile-synced", handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("student-profile-synced", handleProfileUpdate);
    };
  }, [actStn]);

  // Display values prioritizing real-time, falling back to cached
  const totalRegistrationsVal = programs.length > 0 ? programs.length : cachedStats.programsCount;
  const totalAchievementsVal = achievements.length > 0 ? achievements.length : cachedStats.achievementsCount;
  const totalOutreachVal = outreach.length > 0 ? outreach.length : cachedStats.outreachCount;
  const totalPointsVal = (student?.Grand_Total_Points !== undefined) ? student.Grand_Total_Points : cachedStats.totalPoints;

  // --- UI Rendering ---

  // Sleek placeholder skeleton only if absolutely no data exists on first ever load
  if (loading && !student) {
    return (
      <div className="mx-auto px-4 overflow-hidden space-y-6 pt-4">
        <div className="h-32 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-100 rounded-md" />
            <div className="h-6 w-48 bg-slate-200 rounded-md" />
          </div>
          <div className="h-16 w-16 bg-slate-100 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" />
          ))}
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500 font-medium text-sm">Student profile could not be loaded.</p>
      </div>
    );
  }

  // Main Dashboard (Steady rendering, no blinking or sudden layout tearing)
  return (
    <div className="mx-auto px-4 overflow-hidden space-y-6">
      {/* Banner Section */}
      <ActiveUserCard
        Panel="Student Dashboard"
        UserName={student.StudentName || "Student"}
        userPhoto={student.Student_Photo_Urls}
      />

      {/* Analytics Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverViewClipBox
          BoxTitle="Total Registrations"
          BoxValue={totalRegistrationsVal}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5 text-blue-600">
              <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
              <path d="M22 10v6"></path>
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
            </svg>
          }
        />

        <OverViewClipBox
          BoxTitle="Achievements"
          BoxValue={totalAchievementsVal}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-award w-5 h-5 text-amber-500">
              <circle cx="12" cy="8" r="6"></circle>
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
            </svg>
          }
        />

        <OverViewClipBox
          BoxTitle="Total OutReach"
          BoxValue={totalOutreachVal}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-5 h-5 text-emerald-500">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
            </svg>
          }
        />

        <OverViewClipBox
          BoxTitle="Total Points"
          BoxValue={totalPointsVal}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap w-5 h-5 text-indigo-500">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          }
        />
      </div>

      <div className="mx-auto">
        <ProgrammesCalendar />
      </div>
    </div>



    // Main Wrapper
    // <div className="mx-auto px-4 overflow-hidden">
    //   {/* Banner Section */}
    //   <ActiveUserCard
    //     Panel={"Admin"}
    //     UserName={"Admin"}
    //   />

    //   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    //     <OverViewClipBox
    //       BoxTitle={"Total Students"}
    //       BoxValue={20}
    //       BoxSvgLogo={
    //         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
    //           <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
    //           <path d="M22 10v6"></path>
    //           <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
    //         </svg>
    //       }
    //     />
    //   </div>
    //   <div className="mx-auto">
    //     <ProgrammesCalendar />
    //   </div>
    // </div>
  );
}