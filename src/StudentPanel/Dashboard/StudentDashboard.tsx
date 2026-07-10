import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Components
import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";

// Libs
import { SupaBaseFunction } from "../../lib/SupaBase";

// --- TypeScript Interfaces ---
export interface Student {
  AddNo: string;
  StudentEmail: string;
  Name?: string;
  StudentName: string;
  Grand_Total_Points: number;
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

export default function StudentDashboard() {
  const { actStn } = useParams<{ actStn: string }>();

  // State Management
  const [loading, setLoading] = useState<boolean>(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!actStn) return;
      setLoading(true);

      try {
        // 1. Fetch Student Details
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .eq("StudentEmail", actStn)
          .single();

        if (studentError || !studentData) throw studentError;
        setStudent(studentData);

        // FIX: Log studentData instead of student
        console.log(studentData.StudentEmail);

        const addNo = studentData.AddNo;
        // 2. Fetch Program Registrations
        const { data: registrations } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", addNo);

        const programCodes = registrations?.map((reg: { Program_Code: string }) => reg.Program_Code) || [];

        // 3. Fetch Program Details (if registered)
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

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error fetching student analytics:", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [actStn]);

  // --- UI Rendering ---

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error / Not Found State
  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 font-medium">Student data not found.</p>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="mx-auto px-4 overflow-hidden">
      {/* Banner Section */}
      <ActiveUserCard
        Panel="Student Dashboard"
        UserName={student.StudentName || "Student"}
      />

      {/* Analytics Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverViewClipBox
          BoxTitle="Total Registrations"
          BoxValue={programs.length}
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
          BoxValue={achievements.length}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-award w-5 h-5 text-yellow-500">
              <circle cx="12" cy="8" r="6"></circle>
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
            </svg>
          }
        />

        <OverViewClipBox
          BoxTitle="Total OutReach"
          BoxValue={outreach.length}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-5 h-5 text-green-500">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
            </svg>
          }
        />
        <OverViewClipBox
          BoxTitle="Total Point"
          BoxValue={student.Grand_Total_Points}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-5 h-5 text-green-500">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
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