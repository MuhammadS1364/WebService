import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import dhiuLogo from "../../ImgBox/Dhiu.jpg";
import SafeImage from "../../lib/SafeImage";
import { resolveStudentProfile, type LoggedInStudentProfile } from "../../lib/accountResolver";
import {
  Trophy,
  Award,
  Medal,
  Sparkles,
  Zap,
  Filter,
  CheckCircle2
} from "lucide-react";

interface AchievementItem {
  Achieve_Id: string;
  Achievement_Title: string;
  Achievement_Type: string | null;
  Position_Achieved: string | null;
  Achieve_Descriptin: string | null;
  Point_Obtained: number;
}

export default function StudentsAchievements() {
  const { actStn } = useParams<{ actStn: string }>();

  const [student, setStudent] = useState<LoggedInStudentProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [achievements, setAchievements] = useState<AchievementItem[]>(() => {
    try {
      const cached = localStorage.getItem("cached_stn_achievements");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("cached_student_profile") && !localStorage.getItem("cached_stn_achievements");
    } catch {
      return true;
    }
  });

  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    let isMounted = true;

    const fetchAchievements = async (silent = false) => {
      // Only show full loading if we have zero cached student and zero cached achievements
      if (!silent && !student && achievements.length === 0) {
        setLoading(true);
      }
      try {
        // Resolve student profile reliably via email, AddNo, or storage
        const studentData = await resolveStudentProfile(actStn);
        if (studentData && isMounted) {
          setStudent(studentData);
        }

        if (studentData?.AddNo) {
          const { data: achievementsData, error: achieveError } = await SupaBaseFunction
            .from("StudentsAchievements")
            .select("*")
            .eq("StnAddNo", studentData.AddNo)
            .order("Point_Obtained", { ascending: false });

          if (achieveError) throw achieveError;
          if (isMounted) {
            const list = (achievementsData as AchievementItem[]) || [];
            setAchievements(list);
            try {
              localStorage.setItem("cached_stn_achievements", JSON.stringify(list));
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching student achievements:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAchievements(Boolean(student || achievements.length > 0));

    // Listen to real-time profile updates: update profile state silently without re-spinning
    const handleProfileSync = (e: Event) => {
      const customEvent = e as CustomEvent<LoggedInStudentProfile>;
      if (customEvent.detail && isMounted) {
        setStudent(prev => prev ? { ...prev, ...customEvent.detail } : customEvent.detail);
      } else {
        fetchAchievements(true);
      }
    };
    window.addEventListener("student-profile-synced", handleProfileSync);

    return () => {
      isMounted = false;
      window.removeEventListener("student-profile-synced", handleProfileSync);
    };
  }, [actStn]);

  const totalPoints = useMemo(
    () => achievements.reduce((sum, ach) => sum + (ach.Point_Obtained || 0), 0),
    [achievements]
  );

  const achievementTypes = useMemo(() => {
    const types = achievements
      .map((a) => a.Achievement_Type)
      .filter((t): t is string => Boolean(t));
    return ["All", ...Array.from(new Set(types))];
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    if (typeFilter === "All") return achievements;
    return achievements.filter((a) => a.Achievement_Type === typeFilter);
  }, [achievements, typeFilter]);

  // Clean Light Badge styles (No heavy dark overlays)
  const getPositionStyles = (posRaw: string | null) => {
    const pos = (posRaw || "").toLowerCase();
    if (pos.includes("1st") || pos.includes("first") || pos.includes("winner")) {
      return {
        badge: "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold",
        border: "border-amber-200 hover:border-amber-300",
        bg: "bg-white",
        icon: <Trophy className="w-4 h-4 text-amber-600 shrink-0" />,
        label: posRaw || "1st Winner",
      };
    }
    if (pos.includes("2nd") || pos.includes("second") || pos.includes("runner")) {
      return {
        badge: "bg-slate-100 text-slate-800 border border-slate-300 font-bold",
        border: "border-slate-200 hover:border-slate-300",
        bg: "bg-white",
        icon: <Medal className="w-4 h-4 text-slate-500 shrink-0" />,
        label: posRaw || "2nd Position",
      };
    }
    if (pos.includes("3rd") || pos.includes("third")) {
      return {
        badge: "bg-orange-100 text-orange-800 border border-orange-200 font-bold",
        border: "border-orange-200 hover:border-orange-300",
        bg: "bg-white",
        icon: <Award className="w-4 h-4 text-orange-500 shrink-0" />,
        label: posRaw || "3rd Position",
      };
    }
    return {
      badge: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold",
      border: "border-slate-200 hover:border-indigo-200",
      bg: "bg-white",
      icon: <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />,
      label: posRaw || "Award Winner",
    };
  };

  if (loading && !student && achievements.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-32 font-sans px-1 sm:px-2 pt-2">
        <div className="h-32 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-100 rounded-md" />
            <div className="h-6 w-56 bg-slate-200 rounded-md" />
          </div>
          <div className="h-16 w-16 bg-slate-100 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-32 font-sans px-1 sm:px-2">
      
      {/* HEADER HERO: PURE WHITE BACKGROUND, NO DARK / BLACK COLORS, COLLAPSES ON SMALL SCREENS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 md:p-7 shadow-xs relative overflow-hidden">
        
        {/* Subtle decorative background blur */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none" />

        {/* Collapsible Content: Stacks on mobile (< 640px), flex-row on tablet+ */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          
          <div className="flex flex-row items-center gap-3.5 sm:gap-5 min-w-0">
            {/* Real Logged In Student Account Photo */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 shadow-xs border border-slate-200 overflow-hidden flex items-center justify-center">
                {student?.Student_Photo_Urls ? (
                  <SafeImage
                    src={student.Student_Photo_Urls}
                    alt={student.StudentName || "Student Photo"}
                    fallbackCategory="student"
                    fallbackText={student.StudentName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xl flex items-center justify-center">
                    {(student?.StudentName || "S")[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* DHIU seal badge watermark */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white p-0.5 border border-slate-200 shadow-xs flex items-center justify-center">
                <img src={dhiuLogo} alt="Seal" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>

            {/* Student Info & Title */}
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block mb-1">
                🎖️ DHIU Talent Portfolio
              </span>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                Student Honors & Accolades
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">
                Accomplishments of{" "}
                <strong className="text-slate-900 font-bold">
                  {student?.StudentName || "Enrolled Student"}
                </strong>{" "}
                {student?.AddNo && <span className="font-mono text-slate-500">({student.AddNo})</span>}
              </p>
            </div>
          </div>

          {/* Points Counter Badge (Collapsible on mobile) */}
          <div className="w-full sm:w-auto bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-4 text-center shrink-0 shadow-xs flex sm:flex-col items-center justify-between sm:justify-center gap-2 min-w-[140px]">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Points Earned
            </p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 flex items-center gap-1">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              {totalPoints} <span className="text-xs font-bold text-slate-400">PTS</span>
            </p>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              {achievements.length} Awards
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & STATS BAR: COLLAPSES ON MOBILE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Honors Showcase ({filteredAchievements.length})
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              Verified by DHIU Examination & Talent Board
            </p>
          </div>
        </div>

        {/* Filter Pills (Scrollable horizontally on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Filter size={11} /> Filter:
          </span>
          {achievementTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 ${
                typeFilter === type
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ACHIEVEMENTS GRID: COLLAPSES FROM 3 COLS TO 1 COL ON SMALL SCREENS */}
      {filteredAchievements.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-300 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <Award size={24} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">No Achievements Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Participate in university events, symposiums, and wing programs to earn points and showcase your talent!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filteredAchievements.map((ach) => {
            const style = getPositionStyles(ach.Position_Achieved);

            return (
              <div
                key={ach.Achieve_Id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border ${style.border} ${style.bg} hover:shadow-lg transition-all duration-300 p-4 sm:p-5`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {style.icon}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full truncate ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>

                    <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg shrink-0">
                      +{ach.Point_Obtained} PTS
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                    {ach.Achievement_Type || "General Event"}
                  </span>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-1.5">
                    {ach.Achievement_Title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
                    {ach.Achieve_Descriptin ||
                      "Distinguished performance demonstrated in university competition."}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 size={13} />
                    Verified Award
                  </span>
                  <span className="font-mono text-slate-400">ID: #{ach.Achieve_Id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
