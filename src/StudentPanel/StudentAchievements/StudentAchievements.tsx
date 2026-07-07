import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";

// 1. Explicit Domain Models matching your Supabase Table Schemas
interface StudentProfile {
  AddNo: string;
  StudentName: string;
}

interface AchievementItem {
  Achieve_Id: string | number;
  StnAddNo: string;
  Achievement_Title: string;
  Achievement_Type: string | null;
  Position_Achieved: string | null;
  Achieve_Descriptin: string | null;
  Point_Obtained: number;
}

interface PositionStyleMap {
  border: string;
  bg: string;
  badge: string;
  icon: string;
}

export default function StudentsAchievements() {
  const { actStn } = useParams<{ actStn: string }>(); // Safely typed dynamic router link parameter
  
  const [loading, setLoading] = useState<boolean>(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!actStn) return;
      setLoading(true);
      try {
        // Step 1: Fetch Student Info securely via Route Parameter Email mapping
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .eq("StudentEmail", actStn)
          .single();

        if (studentError || !studentData) throw studentError;
        setStudent(studentData as StudentProfile);

        // Step 2: Extract verified child tracking information via Admission Reference Number
        const { data: achievementsData, error: achieveError } = await SupaBaseFunction
          .from("StudentsAchievements")
          .select("*")
          .eq("StnAddNo", studentData.AddNo)
          .order("Point_Obtained", { ascending: false });

        if (achieveError) throw achieveError;
        setAchievements((achievementsData as AchievementItem[]) || []);
        
      } catch (error) {
        console.error("Error fetching student achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [actStn]);

  // Derived Values Layer
  const totalPoints = achievements.reduce((sum, ach) => sum + (ach.Point_Obtained || 0), 0);
  const totalAchievements = achievements.length;
  
  // Extract unique validation keys safely removing null options
  const achievementTypes = [
    "All", 
    ...new Set(achievements.map(a => a.Achievement_Type).filter((type): type is string => Boolean(type)))
  ];

  // Structural Processing Filters
  const filteredAchievements = achievements.filter(ach => 
    typeFilter === "All" || ach.Achievement_Type === typeFilter
  );

  // Position processing helper mapping safely to styles interface
  const getPositionStyles = (position: string | null | undefined): PositionStyleMap => {
    const pos = (position || "").toLowerCase();
    if (pos.includes("1st") || pos.includes("first") || pos.includes("gold")) {
      return { border: "border-yellow-400", bg: "bg-yellow-50", badge: "bg-yellow-400 text-yellow-900", icon: "🏆" };
    }
    if (pos.includes("2nd") || pos.includes("second") || pos.includes("silver")) {
      return { border: "border-gray-400", bg: "bg-gray-50", badge: "bg-gray-300 text-gray-800", icon: "🥈" };
    }
    if (pos.includes("3rd") || pos.includes("third") || pos.includes("bronze")) {
      return { border: "border-orange-400", bg: "bg-orange-50", badge: "bg-orange-300 text-orange-900", icon: "🥉" };
    }
    return { border: "border-indigo-200", bg: "bg-white", badge: "bg-indigo-100 text-indigo-700", icon: "🏅" };
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-yellow-500"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center mt-20 text-gray-500">
        <h2 className="text-2xl font-bold text-gray-700">Student Not Found</h2>
        <p>We couldn't locate records for this profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-yellow-500 via-orange-400 to-red-500 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md">
              Hall of Fame
            </h1>
            <p className="text-yellow-50 mt-2 text-lg drop-shadow-sm">
              Celebrating the accomplishments of <span className="font-bold underline decoration-yellow-200 decoration-4 underline-offset-4">{student.StudentName}</span>
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center border border-white/40 shadow-inner">
            <p className="text-sm font-bold text-yellow-50 uppercase tracking-wider">Total Reward Points</p>
            <p className="text-4xl font-black text-white drop-shadow-lg flex items-center justify-center gap-2">
              <svg className="w-8 h-8 text-yellow-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {totalPoints}
            </p>
          </div>
        </div>

        {/* Summary Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OverviewClipBox
            BoxTitle="Total Awards Won"
            BoxValue={totalAchievements}
            variant="blue" // Fixed: Swapped "purple" to valid dashboard variation
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Top Placement"
            BoxValue={achievements.length > 0 ? (achievements[0]?.Position_Achieved || "Honored") : "N/A"}
            variant="orange"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          />
        </div>

        {/* Filter Management */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4 sm:mb-0">
            🎖️ Achievement Portfolio
          </h2>
          <div className="flex items-center gap-3">
            <label htmlFor="type-filter" className="text-sm font-semibold text-gray-500">Filter by Type:</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-yellow-500 outline-none font-medium"
            >
              {achievementTypes.map((type, idx) => (
                <option key={idx} value={type}>{type || "Uncategorized"}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic List Rendering */}
        {filteredAchievements.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
            <span className="text-6xl mb-4 block">🧗</span>
            <h3 className="text-2xl font-bold text-gray-700">The Journey Begins Here</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Every grandmaster was once a beginner. Participate in upcoming events to earn points, build your portfolio, and showcase your skills!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.map((ach) => {
              const style = getPositionStyles(ach.Position_Achieved);
              
              return (
                <div 
                  key={ach.Achieve_Id} 
                  className={`relative flex flex-col overflow-hidden rounded-2xl border-2 ${style.border} ${style.bg} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6`}
                >
                  <div className="absolute -right-6 -top-6 text-9xl opacity-5 select-none pointer-events-none">
                    {style.icon}
                  </div>

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="text-4xl">{style.icon}</span>
                    <div className="flex flex-col items-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${style.badge}`}>
                        {ach.Position_Achieved || "Participant"}
                      </span>
                      <span className="text-xs font-semibold text-gray-400 mt-2">
                        {ach.Achievement_Type || "General"}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10 leading-tight">
                    {ach.Achievement_Title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 flex-1 relative z-10 mb-6">
                    {ach.Achieve_Descriptin || "Outstanding performance and dedication shown in this achievement."}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-200/50 flex justify-between items-center relative z-10">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Points Earned</span>
                    <span className="text-xl font-black text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-indigo-100">
                      +{ach.Point_Obtained}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}