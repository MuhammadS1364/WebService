import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import SafeImage from "../lib/SafeImage";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { exportToExcel } from "../lib/excelService";
import {
  Trophy,
  Medal,
  Search,
  Download,
  Eye,
  X,
  Crown,
  AlertCircle,
  Globe,
  Layers,
} from "lucide-react";

export type PointStreamType = "overall" | "programmes" | "outreach_achievements";

export interface StudentLeaderboardEntry {
  addNo: string;
  name: string;
  photoUrl: string;
  className: string;
  collegeName: string;
  state: string;
  district: string;
  // Specific Point Streams
  programmesPoints: number;
  outreachPoints: number;
  achievementPoints: number;
  outreachAchievementsPoints: number;
  grandTotalPoints: number;
  // Active Dynamic Display Points based on selected filter
  displayPoints: number;
  // Placements & Counts
  resultedCount: number;
  outreachCount: number;
  achievementCount: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  aGradeCount: number;
  bGradeCount: number;
  placements: {
    programCode: string;
    programTitle: string;
    position: "1st Place" | "2nd Place" | "3rd Place" | "A Grade" | "B Grade";
    date?: string;
  }[];
  outreachList: {
    id: string;
    title: string;
    type?: string;
    points: number;
    date?: string;
  }[];
  achievementsList: {
    id: string;
    title: string;
    position?: string;
    points: number;
    date?: string;
  }[];
}

interface ResultedLeaderboardProps {
  isAdmin?: boolean;
}

export default function ResultedLeaderboard({ isAdmin = false }: ResultedLeaderboardProps) {
  const meta = useProgrammeMeta();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawStudents, setRawStudents] = useState<any[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [programmesData, setProgrammesData] = useState<any[]>([]);
  const [outreachData, setOutreachData] = useState<any[]>([]);
  const [achievementsData, setAchievementsData] = useState<any[]>([]);

  // Three primary filter states
  const [pointStream, setPointStream] = useState<PointStreamType>("overall");
  const [classFilter, setClassFilter] = useState("All");
  const [minPointsFilter, setMinPointsFilter] = useState<"all" | "has_points" | "winners_only">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal inspection state
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentLeaderboardEntry | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<"programmes" | "outreach" | "achievements">("programmes");

  useEffect(() => {
    fetchLeaderboardData();
  }, [meta.classMap]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Safe multi-table fetch:
      // Select "*" from StudentsBox to avoid "column StudentsBox.Class does not exist"
      const [stnRes, resRes, progRes, outRes, achRes] = await Promise.all([
        SupaBaseFunction.from("StudentsBox").select("*"),
        SupaBaseFunction.from("ResultBox").select("*"),
        SupaBaseFunction.from("ProgrammesBox").select("Program_Code, Program_Title, Date, IsResulted, IsResultPublished"),
        SupaBaseFunction.from("StudentsOutReach").select("*"),
        SupaBaseFunction.from("StudentsAchievements").select("*"),
      ]);

      if (stnRes.error) throw stnRes.error;
      if (resRes.error) console.warn("ResultBox notice:", resRes.error);
      if (progRes.error) console.warn("ProgrammesBox notice:", progRes.error);
      if (outRes.error) console.warn("StudentsOutReach notice:", outRes.error);
      if (achRes.error) console.warn("StudentsAchievements notice:", achRes.error);

      setRawStudents(stnRes.data || []);
      setResultsData(resRes.data || []);
      setProgrammesData(progRes.data || []);
      setOutreachData(outRes.data || []);
      setAchievementsData(achRes.data || []);
    } catch (err: any) {
      console.error("Error loading leaderboard data:", err);
      setError(err.message || "Failed to load leaderboard records.");
    } finally {
      setLoading(false);
    }
  };

  // Build structured leaderboard entries
  const allEntries = useMemo(() => {
    if (!rawStudents.length) return [];

    // 1. Program Map
    const progMap: Record<string, { title: string; date?: string }> = {};
    programmesData.forEach((p: any) => {
      progMap[p.Program_Code] = {
        title: p.Program_Title || p.Program_Code,
        date: p.Date,
      };
    });

    // 2. Aggregate ResultBox positions per student
    const placementsMap: Record<
      string,
      {
        firstCount: number;
        secondCount: number;
        thirdCount: number;
        aGradeCount: number;
        bGradeCount: number;
        items: StudentLeaderboardEntry["placements"];
      }
    > = {};

    const ensurePlacements = (addNo: string) => {
      if (!placementsMap[addNo]) {
        placementsMap[addNo] = {
          firstCount: 0,
          secondCount: 0,
          thirdCount: 0,
          aGradeCount: 0,
          bGradeCount: 0,
          items: [],
        };
      }
      return placementsMap[addNo];
    };

    resultsData.forEach((r: any) => {
      const progInfo = progMap[r.Program_Id] || { title: r.Program_Id || "Competition Event" };

      if (r.First_Holder) {
        const rec = ensurePlacements(r.First_Holder);
        rec.firstCount += 1;
        rec.items.push({
          programCode: r.Program_Id,
          programTitle: progInfo.title,
          position: "1st Place",
          date: progInfo.date,
        });
      }
      if (r.Second_Holder) {
        const rec = ensurePlacements(r.Second_Holder);
        rec.secondCount += 1;
        rec.items.push({
          programCode: r.Program_Id,
          programTitle: progInfo.title,
          position: "2nd Place",
          date: progInfo.date,
        });
      }
      if (r.Third_Holder) {
        const rec = ensurePlacements(r.Third_Holder);
        rec.thirdCount += 1;
        rec.items.push({
          programCode: r.Program_Id,
          programTitle: progInfo.title,
          position: "3rd Place",
          date: progInfo.date,
        });
      }
      if (r.AGrade && r.AGrade !== "No Grade") {
        const rec = ensurePlacements(r.AGrade);
        rec.aGradeCount += 1;
        rec.items.push({
          programCode: r.Program_Id,
          programTitle: progInfo.title,
          position: "A Grade",
          date: progInfo.date,
        });
      }
      if (r.BGrade && r.BGrade !== "No Grade") {
        const rec = ensurePlacements(r.BGrade);
        rec.bGradeCount += 1;
        rec.items.push({
          programCode: r.Program_Id,
          programTitle: progInfo.title,
          position: "B Grade",
          date: progInfo.date,
        });
      }
    });

    // 3. Aggregate Outreach items and points per student
    const outreachMap: Record<
      string,
      { points: number; items: StudentLeaderboardEntry["outreachList"] }
    > = {};

    outreachData.forEach((item: any) => {
      const addNo = item.StnAddNo;
      if (!addNo) return;
      if (!outreachMap[addNo]) {
        outreachMap[addNo] = { points: 0, items: [] };
      }
      const pts = Number(item.Point_Obtained || 0);
      outreachMap[addNo].points += pts;
      outreachMap[addNo].items.push({
        id: item.OutReach_id || item.id || Math.random().toString(),
        title: item.OutReach_Holder || item.Details || "Outreach Event",
        type: item.OutReach_Type || "Community",
        points: pts,
        date: item.Date || item.created_at,
      });
    });

    // 4. Aggregate Achievements items and points per student
    const achievementsMap: Record<
      string,
      { points: number; items: StudentLeaderboardEntry["achievementsList"] }
    > = {};

    achievementsData.forEach((item: any) => {
      const addNo = item.StnAddNo;
      if (!addNo) return;
      if (!achievementsMap[addNo]) {
        achievementsMap[addNo] = { points: 0, items: [] };
      }
      const pts = Number(item.Point_Obtained || 0);
      achievementsMap[addNo].points += pts;
      achievementsMap[addNo].items.push({
        id: item.Achieve_id || item.id || Math.random().toString(),
        title: item.Event_Title || item.Achiever_Name || "Official Achievement",
        position: item.Position_Achieved || "Awardee",
        points: pts,
        date: item.Date || item.created_at,
      });
    });

    // 5. Build Final Entries
    return rawStudents.map((s: any) => {
      const p = placementsMap[s.AddNo] || {
        firstCount: 0,
        secondCount: 0,
        thirdCount: 0,
        aGradeCount: 0,
        bGradeCount: 0,
        items: [],
      };

      const out = outreachMap[s.AddNo] || { points: 0, items: [] };
      const ach = achievementsMap[s.AddNo] || { points: 0, items: [] };

      // Resolve class name safely without depending on a missing column
      const resolvedClass =
        (s.Stn_Class ? meta.classMap[s.Stn_Class] : null) ||
        s.Class ||
        s.className ||
        "Unassigned Class";

      // Program Points (Resulted Competitions)
      const programmesPoints = Number(s.Total_Point_Anjuman || 0);

      // Outreach Points: fallback to cached column in StudentsBox if direct table rows not present
      const outreachPoints = out.points > 0 ? out.points : Number(s.OutReach_Points || 0);

      // Achievements Points: fallback to cached column in StudentsBox if direct table rows not present
      const achievementPoints = ach.points > 0 ? ach.points : Number(s.Achievements_Points || 0);

      const outreachAchievementsPoints = outreachPoints + achievementPoints;

      // Grand Total: sum of all three streams
      const grandTotalPoints =
        Number(s.Grand_Total_Points || 0) || (programmesPoints + outreachPoints + achievementPoints);

      // Calculate displayPoints according to active pointStream filter
      let displayPoints = grandTotalPoints;
      if (pointStream === "programmes") {
        displayPoints = programmesPoints;
      } else if (pointStream === "outreach_achievements") {
        displayPoints = outreachAchievementsPoints;
      }

      return {
        addNo: s.AddNo,
        name: s.StudentName || "Student Candidate",
        photoUrl: s.Student_Photo_Urls || "",
        className: resolvedClass,
        collegeName: s.CollegeName || "Darul Huda Islamic University",
        state: s.StnState || "",
        district: s.StnDistrict || "",
        programmesPoints,
        outreachPoints,
        achievementPoints,
        outreachAchievementsPoints,
        grandTotalPoints,
        displayPoints,
        resultedCount: Number(s.Resluted_Count || p.items.length || 0),
        outreachCount: out.items.length || Number(s.OutReach_Count || 0),
        achievementCount: ach.items.length || Number(s.Achievements_Counts || 0),
        firstCount: p.firstCount,
        secondCount: p.secondCount,
        thirdCount: p.thirdCount,
        aGradeCount: p.aGradeCount,
        bGradeCount: p.bGradeCount,
        placements: p.items,
        outreachList: out.items,
        achievementsList: ach.items,
      };
    });
  }, [rawStudents, resultsData, programmesData, outreachData, achievementsData, pointStream, meta.classMap]);

  // Extract unique classes ONLY from available student records in the loaded table
  const uniqueClasses = useMemo(() => {
    const list = Array.from(new Set(allEntries.map((s) => s.className).filter(Boolean)));
    return list.sort();
  }, [allEntries]);

  // Apply filters and sort by active point stream descending
  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = allEntries.filter((item) => {
      // 1. Search Query
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.addNo.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q);

      // 2. Class Filter
      const matchesClass = classFilter === "All" || item.className === classFilter;

      // 3. Performance / Points Filter
      let matchesPoints = true;
      if (minPointsFilter === "has_points") {
        matchesPoints = item.displayPoints > 0;
      } else if (minPointsFilter === "winners_only") {
        if (pointStream === "programmes") {
          matchesPoints = item.firstCount + item.secondCount + item.thirdCount > 0;
        } else if (pointStream === "outreach_achievements") {
          matchesPoints = item.achievementCount > 0 || item.outreachCount > 0;
        } else {
          matchesPoints =
            item.firstCount + item.secondCount + item.thirdCount > 0 ||
            item.achievementCount > 0 ||
            item.displayPoints > 0;
        }
      }

      return matchesSearch && matchesClass && matchesPoints;
    });

    // Sort by active displayPoints descending, secondary by top placements/events
    filtered.sort((a, b) => {
      if (b.displayPoints !== a.displayPoints) {
        return b.displayPoints - a.displayPoints;
      }
      if (pointStream === "programmes") {
        if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
        return b.resultedCount - a.resultedCount;
      }
      if (pointStream === "outreach_achievements") {
        return b.achievementCount + b.outreachCount - (a.achievementCount + a.outreachCount);
      }
      return b.grandTotalPoints - a.grandTotalPoints;
    });

    return filtered;
  }, [allEntries, searchQuery, classFilter, minPointsFilter, pointStream]);

  // Top 3 Podium
  const top3 = useMemo(() => {
    return filteredLeaderboard.slice(0, 3);
  }, [filteredLeaderboard]);

  const handleExport = () => {
    const exportRows = filteredLeaderboard.map((item, index) => ({
      Rank: index + 1,
      "Admission No": item.addNo,
      "Student Name": item.name,
      Class: item.className,
      "Active Filter Points": item.displayPoints,
      "Grand Total Points": item.grandTotalPoints,
      "Our Programmes Points": item.programmesPoints,
      "Outreach Points": item.outreachPoints,
      "Achievements Points": item.achievementPoints,
      "1st Place": item.firstCount,
      "2nd Place": item.secondCount,
      "3rd Place": item.thirdCount,
      "A Grade": item.aGradeCount,
      "B Grade": item.bGradeCount,
      "Outreach Count": item.outreachCount,
      "Achievements Count": item.achievementCount,
      Campus: item.collegeName,
    }));

    exportToExcel(
      exportRows,
      `Student_Leaderboard_${pointStream}_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Leaderboard"
    );
  };

  const getStreamTitle = () => {
    switch (pointStream) {
      case "programmes":
        return "Our Programmes Points (Resulted Competitions Only)";
      case "outreach_achievements":
        return "Outreach & Achievements Points";
      case "overall":
      default:
        return "Overall Points (All Types / Grand Total)";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-3 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Crown size={14} className="text-amber-400" />
                <span>Student Merit Standings</span>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Admin Analytics View
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Student Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Official standings calculated transparently across three categories: Our Programmes, Outreach &amp; Achievements, and Overall Grand Totals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredLeaderboard.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-bold backdrop-blur-xs border border-white/10 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download size={15} />
              <span>Export Leaderboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0 text-red-500" />
          <p className="flex-1 font-medium">{error}</p>
        </div>
      )}

      {/* THREE STREAM QUICK SWITCH PILLS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPointStream("overall")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            pointStream === "overall"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Layers size={14} />
          <span>Overall (All Types)</span>
        </button>

        <button
          type="button"
          onClick={() => setPointStream("programmes")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            pointStream === "programmes"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Trophy size={14} />
          <span>Our Programmes Points</span>
        </button>

        <button
          type="button"
          onClick={() => setPointStream("outreach_achievements")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            pointStream === "outreach_achievements"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Globe size={14} />
          <span>Outreach &amp; Achievements</span>
        </button>
      </div>

      {/* TOP 3 PODIUM */}
      {!loading && top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place (Silver) */}
          {top3[1] && (
            <div className="order-2 md:order-1 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:shadow-md transition">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Medal size={12} className="text-slate-500" />
                  Rank #2 • Silver
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">#{top3[1].addNo}</span>
              </div>
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md my-2 relative">
                <SafeImage
                  src={top3[1].photoUrl}
                  alt={top3[1].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-black text-slate-900 text-base mt-1 truncate max-w-full">{top3[1].name}</h3>
              <p className="text-xs font-semibold text-slate-500 mb-3">{top3[1].className}</p>

              <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-100 mt-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {pointStream === "programmes"
                    ? "Programmes Score"
                    : pointStream === "outreach_achievements"
                    ? "Outreach & Achieve"
                    : "Grand Total Score"}
                </span>
                <span className="text-2xl font-black text-slate-800">{top3[1].displayPoints} pts</span>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500 flex-wrap">
                  <span>PRG: {top3[1].programmesPoints}</span>
                  <span>•</span>
                  <span>OUT: {top3[1].outreachPoints}</span>
                  <span>•</span>
                  <span>ACH: {top3[1].achievementPoints}</span>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white rounded-3xl p-6 border-2 border-amber-300 shadow-lg flex flex-col items-center text-center relative overflow-hidden -mt-2">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
              <div className="w-full flex justify-between items-center mb-2">
                <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Crown size={13} className="text-amber-950" />
                  Rank #1 • Champion
                </span>
                <span className="text-xs font-bold text-amber-700 font-mono">#{top3[0].addNo}</span>
              </div>
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-xl my-2 relative">
                <SafeImage
                  src={top3[0].photoUrl}
                  alt={top3[0].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-black text-slate-900 text-lg mt-1 truncate max-w-full">{top3[0].name}</h3>
              <p className="text-xs font-bold text-amber-700 mb-4">{top3[0].className}</p>

              <div className="w-full bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs mt-auto">
                <span className="text-[10px] uppercase font-bold text-amber-800 block tracking-wider">
                  {pointStream === "programmes"
                    ? "Programmes Score"
                    : pointStream === "outreach_achievements"
                    ? "Outreach & Achieve"
                    : "Grand Total Score"}
                </span>
                <span className="text-3xl font-black text-amber-900">{top3[0].displayPoints} pts</span>
                <div className="flex items-center justify-center gap-2 mt-2 text-xs font-bold text-amber-800 flex-wrap">
                  <span className="px-2 py-0.5 bg-amber-50 rounded-md">PRG: {top3[0].programmesPoints}</span>
                  <span className="px-2 py-0.5 bg-amber-50 rounded-md">OUT: {top3[0].outreachPoints}</span>
                  <span className="px-2 py-0.5 bg-amber-50 rounded-md">ACH: {top3[0].achievementPoints}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {top3[2] && (
            <div className="order-3 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:shadow-md transition">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-800/10 text-amber-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Medal size={12} className="text-amber-800" />
                  Rank #3 • Bronze
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">#{top3[2].addNo}</span>
              </div>
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-800/30 shadow-md my-2 relative">
                <SafeImage
                  src={top3[2].photoUrl}
                  alt={top3[2].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-black text-slate-900 text-base mt-1 truncate max-w-full">{top3[2].name}</h3>
              <p className="text-xs font-semibold text-slate-500 mb-3">{top3[2].className}</p>

              <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-100 mt-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {pointStream === "programmes"
                    ? "Programmes Score"
                    : pointStream === "outreach_achievements"
                    ? "Outreach & Achieve"
                    : "Grand Total Score"}
                </span>
                <span className="text-2xl font-black text-slate-800">{top3[2].displayPoints} pts</span>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500 flex-wrap">
                  <span>PRG: {top3[2].programmesPoints}</span>
                  <span>•</span>
                  <span>OUT: {top3[2].outreachPoints}</span>
                  <span>•</span>
                  <span>ACH: {top3[2].achievementPoints}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* THREE FILTER OPTIONS TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name or admission no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* 3 FILTER DROPDOWNS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full lg:w-auto">
          {/* Filter 1: Point Stream / Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Point Category
            </label>
            <select
              value={pointStream}
              onChange={(e) => setPointStream(e.target.value as PointStreamType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
            >
              <option value="overall">Overall (Grand Total Points)</option>
              <option value="programmes">Our Programmes Points</option>
              <option value="outreach_achievements">Outreach &amp; Achievements</option>
            </select>
          </div>

          {/* Filter 2: Class Filter (Only options in the loaded table!) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Class Roster
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
            >
              <option value="All">All Classes ({uniqueClasses.length})</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Standing / Performance Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Standing Filter
            </label>
            <select
              value={minPointsFilter}
              onChange={(e) => setMinPointsFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
            >
              <option value="all">All Candidates</option>
              <option value="has_points">Scored &gt; 0 Points Only</option>
              <option value="winners_only">Awarded / Medalists Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* FULL LEADERBOARD TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy size={18} className="text-indigo-600" />
              <span>{getStreamTitle()}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredLeaderboard.length} candidates ranked by {pointStream === "programmes" ? "competition scores" : pointStream === "outreach_achievements" ? "outreach & achievements" : "overall grand total points"}.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Calculating student leaderboard rankings...</p>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="py-20 text-center p-6">
            <Trophy size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-800">No student records match your query.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the class or points filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-100 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Student Candidate</th>
                  <th className="py-3.5 px-4">Class</th>
                  {pointStream === "programmes" ? (
                    <>
                      <th className="py-3.5 px-3 text-center">1st</th>
                      <th className="py-3.5 px-3 text-center">2nd</th>
                      <th className="py-3.5 px-3 text-center">3rd</th>
                      <th className="py-3.5 px-3 text-center">Grades</th>
                    </>
                  ) : pointStream === "outreach_achievements" ? (
                    <>
                      <th className="py-3.5 px-4 text-center">Outreach Pts</th>
                      <th className="py-3.5 px-4 text-center">Achievements Pts</th>
                      <th className="py-3.5 px-4 text-center">Total Events</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-3 text-center">PRG Pts</th>
                      <th className="py-3.5 px-3 text-center">OUT Pts</th>
                      <th className="py-3.5 px-3 text-center">ACH Pts</th>
                      <th className="py-3.5 px-3 text-center">Medals</th>
                    </>
                  )}
                  <th className="py-3.5 px-4 text-right">
                    {pointStream === "programmes"
                      ? "Programmes Score"
                      : pointStream === "outreach_achievements"
                      ? "Outreach & Achieve"
                      : "Grand Total"}
                  </th>
                  <th className="py-3.5 px-4 text-center w-20">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaderboard.map((student, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  return (
                    <tr
                      key={student.addNo}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTop1 ? "bg-amber-50/30" : isTop2 ? "bg-slate-50/50" : isTop3 ? "bg-amber-700/5" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-black">
                        {isTop1 ? (
                          <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-900 inline-flex items-center justify-center text-xs font-black shadow-xs">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-7 h-7 rounded-xl bg-slate-300 text-slate-800 inline-flex items-center justify-center text-xs font-black shadow-xs">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-7 h-7 rounded-xl bg-amber-700 text-white inline-flex items-center justify-center text-xs font-black shadow-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-xs">#{rank}</span>
                        )}
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <SafeImage
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{student.name}</span>
                              {isTop1 && <Crown size={13} className="text-amber-500 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Add No: {student.addNo}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 text-xs">
                        {student.className}
                      </td>

                      {/* Dynamic Columns based on pointStream */}
                      {pointStream === "programmes" ? (
                        <>
                          <td className="py-3.5 px-3 text-center font-bold">
                            {student.firstCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-black">
                                {student.firstCount}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold">
                            {student.secondCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                                {student.secondCount}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold">
                            {student.thirdCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold">
                                {student.thirdCount}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-xs text-slate-600">
                            {student.aGradeCount + student.bGradeCount > 0 ? (
                              <span>
                                {student.aGradeCount > 0 && <span className="text-emerald-700 font-bold">A:{student.aGradeCount}</span>}
                                {student.aGradeCount > 0 && student.bGradeCount > 0 && <span> / </span>}
                                {student.bGradeCount > 0 && <span className="text-sky-700 font-bold">B:{student.bGradeCount}</span>}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </>
                      ) : pointStream === "outreach_achievements" ? (
                        <>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">
                            {student.outreachPoints} pts
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-purple-700 font-mono">
                            {student.achievementPoints} pts
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-600 text-xs">
                            {student.outreachCount + student.achievementCount} events
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                            {student.programmesPoints}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700">
                            {student.outreachPoints}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-purple-700">
                            {student.achievementPoints}
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-xs text-slate-600">
                            {student.firstCount + student.secondCount + student.thirdCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold">
                                {student.firstCount + student.secondCount + student.thirdCount} medals
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Display Score */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-indigo-700 text-base font-mono">
                          {student.displayPoints}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">pts</span>
                      </td>

                      {/* Inspect Breakdown Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForModal(student);
                            setModalActiveTab(pointStream === "outreach_achievements" ? "outreach" : "programmes");
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="View Complete Point Breakdown"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE DETAIL MODAL */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative space-y-4 max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSelectedStudentForModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100 shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-indigo-100 shrink-0">
                <SafeImage
                  src={selectedStudentForModal.photoUrl}
                  alt={selectedStudentForModal.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedStudentForModal.name}</h3>
                <p className="text-xs font-semibold text-slate-500">
                  {selectedStudentForModal.className} • Add No: {selectedStudentForModal.addNo}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-black">
                    Grand Total: {selectedStudentForModal.grandTotalPoints} pts
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    PRG: {selectedStudentForModal.programmesPoints} | OUT: {selectedStudentForModal.outreachPoints} | ACH: {selectedStudentForModal.achievementPoints}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalActiveTab("programmes")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalActiveTab === "programmes"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Programmes ({selectedStudentForModal.placements.length})
              </button>
              <button
                type="button"
                onClick={() => setModalActiveTab("outreach")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalActiveTab === "outreach"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Outreach ({selectedStudentForModal.outreachList.length})
              </button>
              <button
                type="button"
                onClick={() => setModalActiveTab("achievements")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalActiveTab === "achievements"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Achievements ({selectedStudentForModal.achievementsList.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {modalActiveTab === "programmes" && (
                <div>
                  {selectedStudentForModal.placements.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
                      No individual competition placements recorded in ResultBox for this candidate.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudentForModal.placements.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 truncate">{p.programTitle}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {p.programCode}</p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                              p.position === "1st Place"
                                ? "bg-amber-100 text-amber-900"
                                : p.position === "2nd Place"
                                ? "bg-slate-200 text-slate-800"
                                : p.position === "3rd Place"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-indigo-50 text-indigo-700"
                            }`}
                          >
                            {p.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalActiveTab === "outreach" && (
                <div>
                  {selectedStudentForModal.outreachList.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
                      No registered outreach initiatives recorded in StudentsOutReach.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudentForModal.outreachList.map((o) => (
                        <div
                          key={o.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 truncate">{o.title}</p>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase">{o.type}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            +{o.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalActiveTab === "achievements" && (
                <div>
                  {selectedStudentForModal.achievementsList.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
                      No external awards or honors recorded in StudentsAchievements.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudentForModal.achievementsList.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 truncate">{a.title}</p>
                            <span className="text-[10px] text-purple-700 font-bold">{a.position}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                            +{a.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end shrink-0 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
