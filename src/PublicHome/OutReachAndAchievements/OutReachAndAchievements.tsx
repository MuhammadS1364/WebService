import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import dhiuLogo from "../../ImgBox/Dhiu.jpg";
import SafeImage from "../../lib/SafeImage";
import {
  Trophy,
  Award,
  Medal,
  Sparkles,
  Search,
  Filter,
  Compass,
  Zap,
  Building,
  CheckCircle2
} from "lucide-react";

// 1. Data Schemas matching Supabase tables
interface AchievementItem {
  Achieve_Id: string;
  Achiever_Name: string | null;
  Achievement_Title: string | null;
  Achievement_Type: string | null;
  Position_Achieved: string | null;
  Achieve_Descriptin: string | null;
  Point_Obtained: number | null;
  StnAddNo: string | null;
  displayName?: string;
  collegeName?: string;
  photoUrl?: string;
}

interface OutreachItem {
  OutReach_Id: string;
  created_at: string;
  OutReach_Holder: string | null;
  OutReach_Title: string | null;
  OutReach_Type: string | null;
  Position_Achieved: string | null;
  OutReach_Descriptin: string | null;
  Point_Obtained: number | null;
  StnAddNo: string | null;
  displayName?: string;
  collegeName?: string;
  photoUrl?: string;
}

interface StudentBoxRow {
  AddNo: string;
  StudentName: string | null;
  CollegeName?: string | null;
  Student_Photo_Urls?: string | null;
}

export default function OutReachAndAchievements() {
  const [activeTab, setActiveTab] = useState<"achievements" | "outreach">("achievements");
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [outreach, setOutreach] = useState<OutreachItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [achRes, outRes, studentRes] = await Promise.all([
          SupaBaseFunction.from("StudentsAchievements").select("*").order("Point_Obtained", { ascending: false }),
          SupaBaseFunction.from("StudentsOutReach").select("*").order("Point_Obtained", { ascending: false }),
          SupaBaseFunction.from("StudentsBox").select("AddNo, StudentName, CollegeName, Student_Photo_Urls"),
        ]);

        if (achRes.error) throw achRes.error;
        if (outRes.error) throw outRes.error;
        if (studentRes.error) throw studentRes.error;

        const studentMap: Record<string, { name: string; college: string; photo?: string }> = {};
        (studentRes.data as StudentBoxRow[] || []).forEach((student) => {
          if (student.AddNo) {
            studentMap[student.AddNo] = {
              name: student.StudentName || "Talented Scholar",
              college: student.CollegeName || "DHIU Institute",
              photo: student.Student_Photo_Urls || undefined,
            };
          }
        });

        const mappedAchievements = (achRes.data as AchievementItem[] || []).map((item) => {
          const studentInfo = item.StnAddNo ? studentMap[item.StnAddNo] : null;
          return {
            ...item,
            displayName: studentInfo?.name || item.Achiever_Name || "Verified Student",
            collegeName: studentInfo?.college || "DHIU University",
            photoUrl: studentInfo?.photo || undefined,
          };
        });

        const mappedOutreach = (outRes.data as OutreachItem[] || []).map((item) => {
          const studentInfo = item.StnAddNo ? studentMap[item.StnAddNo] : null;
          return {
            ...item,
            displayName: studentInfo?.name || item.OutReach_Holder || "Verified Participant",
            collegeName: studentInfo?.college || "DHIU University",
            photoUrl: studentInfo?.photo || undefined,
          };
        });

        setAchievements(mappedAchievements);
        setOutreach(mappedOutreach);
      } catch (error) {
        console.error("Error loading outreach & achievements:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalAchievementPoints = useMemo(
    () => achievements.reduce((acc, curr) => acc + (curr.Point_Obtained || 0), 0),
    [achievements]
  );

  const totalOutreachPoints = useMemo(
    () => outreach.reduce((acc, curr) => acc + (curr.Point_Obtained || 0), 0),
    [outreach]
  );

  // Dynamic Categories
  const categories = useMemo(() => {
    const list = activeTab === "achievements"
      ? achievements.map((a) => a.Achievement_Type)
      : outreach.map((o) => o.OutReach_Type);

    const unique = Array.from(new Set(list.filter(Boolean))) as string[];
    return ["All", ...unique];
  }, [activeTab, achievements, outreach]);

  // Filtered List
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (activeTab === "achievements") {
      return achievements.filter((item) => {
        const matchesCategory = selectedCategory === "All" || item.Achievement_Type === selectedCategory;
        const matchesQuery =
          !query ||
          (item.Achievement_Title?.toLowerCase().includes(query)) ||
          (item.displayName?.toLowerCase().includes(query)) ||
          (item.Position_Achieved?.toLowerCase().includes(query)) ||
          (item.collegeName?.toLowerCase().includes(query));
        return matchesCategory && matchesQuery;
      });
    } else {
      return outreach.filter((item) => {
        const matchesCategory = selectedCategory === "All" || item.OutReach_Type === selectedCategory;
        const matchesQuery =
          !query ||
          (item.OutReach_Title?.toLowerCase().includes(query)) ||
          (item.displayName?.toLowerCase().includes(query)) ||
          (item.Position_Achieved?.toLowerCase().includes(query)) ||
          (item.collegeName?.toLowerCase().includes(query));
        return matchesCategory && matchesQuery;
      });
    }
  }, [activeTab, achievements, outreach, selectedCategory, searchQuery]);

  // Helper for Position Styling (Optimized for Clean White / Light Background)
  const getBadgeStyle = (posRaw: string | null) => {
    const pos = (posRaw || "").toLowerCase();
    if (pos.includes("1st") || pos.includes("first") || pos.includes("gold") || pos.includes("winner")) {
      return {
        cardBorder: "border-amber-300 hover:border-amber-400 shadow-sm hover:shadow-lg",
        cardBg: "bg-gradient-to-br from-amber-50/40 via-white to-white",
        badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black",
        icon: <Trophy className="w-5 h-5 text-amber-500 shrink-0" />,
        label: posRaw || "1st Place Winner",
      };
    }
    if (pos.includes("2nd") || pos.includes("second") || pos.includes("silver") || pos.includes("runner")) {
      return {
        cardBorder: "border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-lg",
        cardBg: "bg-gradient-to-br from-slate-100/50 via-white to-white",
        badgeBg: "bg-gradient-to-r from-slate-600 to-slate-500 text-white font-bold",
        icon: <Medal className="w-5 h-5 text-slate-500 shrink-0" />,
        label: posRaw || "2nd Position",
      };
    }
    if (pos.includes("3rd") || pos.includes("third") || pos.includes("bronze")) {
      return {
        cardBorder: "border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-lg",
        cardBg: "bg-gradient-to-br from-orange-50/40 via-white to-white",
        badgeBg: "bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold",
        icon: <Award className="w-5 h-5 text-orange-500 shrink-0" />,
        label: posRaw || "3rd Position",
      };
    }
    return {
      cardBorder: "border-indigo-100 hover:border-indigo-300 shadow-sm hover:shadow-lg",
      cardBg: "bg-white",
      badgeBg: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold",
      icon: <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />,
      label: posRaw || "Distinction Award",
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 md:p-10 font-sans pb-28 overflow-x-hidden">
      
      {/* HERO SECTION WITH WHITE BACKGROUND & DHIU BRANDING */}
      <div className="max-w-7xl mx-auto mb-8 sm:mb-10 text-center">
        <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-xs mb-4">
          <div className="w-7 h-7 rounded-lg bg-slate-50 p-1 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
            <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
            Darul Huda Islamic University
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          Honors, Achievements & Outreach
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-500 max-w-2xl mx-auto mt-2 leading-relaxed">
          Celebrating student distinction, tournament victories, academic honors, and community impact initiatives across all off-campuses and national institutes.
        </p>
      </div>

      {/* QUICK STATS CARDS (COLLAPSIBLE ON SMALL SCREENS: 1 COL ON MOBILE, 3 ON TABLET+) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Accolades
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{achievements.length}</p>
            <p className="text-[11px] text-indigo-600 font-medium">Academic & Co-Curricular</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Outreach Initiatives
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{outreach.length}</p>
            <p className="text-[11px] text-cyan-600 font-medium">Community Engagements</p>
          </div>
          <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600 border border-cyan-100">
            <Compass className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Points Awarded
            </p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">
              {totalAchievementPoints + totalOutreachPoints} PTS
            </p>
            <p className="text-[11px] text-amber-600 font-medium">Accumulated Score</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & TAB BAR (RESPONSIVE STACK ON MOBILE) */}
      <div className="max-w-7xl mx-auto space-y-3.5 mb-8">
        
        {/* Main Category Tabs and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <button
              onClick={() => {
                setActiveTab("achievements");
                setSelectedCategory("All");
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "achievements"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Trophy size={15} />
              <span>Honors ({achievements.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("outreach");
                setSelectedCategory("All");
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "outreach"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Compass size={15} />
              <span>Outreach ({outreach.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search title, student, campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:border-indigo-500 focus:outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Category Pill Filters (Scrollable horizontally without breaking layout) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
            <Filter size={11} /> Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ACHIEVEMENT / OUTREACH CARDS GRID (COLLAPSES SMOOTHLY: 1 COL ON MOBILE, 2 ON TABLET, 3 ON DESKTOP) */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 text-sm">Loading verified records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-3xl p-6 sm:p-10 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Award size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No entries match "{searchQuery}" in category "{selectedCategory}". Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredItems.map((item: any) => {
              const id = item.Achieve_Id || item.OutReach_Id;
              const title = item.Achievement_Title || item.OutReach_Title || "Accolade";
              const type = item.Achievement_Type || item.OutReach_Type || "General";
              const desc = item.Achieve_Descriptin || item.OutReach_Descriptin || "Commendable participation and excellence demonstrated in this competition.";
              const points = item.Point_Obtained || 0;
              const badgeStyle = getBadgeStyle(item.Position_Achieved);

              return (
                <div
                  key={id}
                  className={`group relative rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between overflow-hidden border ${badgeStyle.cardBorder} ${badgeStyle.cardBg}`}
                >
                  <div className="space-y-3">
                    {/* Top row: Position badge + Points */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {badgeStyle.icon}
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full truncate ${badgeStyle.badgeBg}`}
                        >
                          {badgeStyle.label}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        +{points} PTS
                      </span>
                    </div>

                    {/* Category & Title */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-0.5">
                        {type}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                        {title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {desc}
                    </p>
                  </div>

                  {/* Student tag at bottom */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-indigo-50 shrink-0 flex items-center justify-center">
                        {item.photoUrl ? (
                          <SafeImage
                            src={item.photoUrl}
                            alt={item.displayName || "Student"}
                            fallbackCategory="student"
                            fallbackText={item.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-indigo-700 font-bold text-[10px]">
                            {(item.displayName || "S")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-800 truncate text-xs">{item.displayName}</p>
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <Building size={10} />
                          {item.collegeName}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={11} />
                      Verified
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
