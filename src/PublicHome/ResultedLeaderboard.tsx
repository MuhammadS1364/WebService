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
} from "lucide-react";

interface StudentLeaderboardEntry {
  addNo: string;
  name: string;
  photoUrl: string;
  className: string;
  collegeName: string;
  state: string;
  district: string;
  resultedPoints: number;
  resultedCount: number;
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
}

interface ResultedLeaderboardProps {
  isAdmin?: boolean;
}

export default function ResultedLeaderboard({ isAdmin = false }: ResultedLeaderboardProps) {
  const meta = useProgrammeMeta();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<StudentLeaderboardEntry[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [minPointsFilter, setMinPointsFilter] = useState("all");
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentLeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, [meta.classMap]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Students
      const { data: studentsData, error: stnError } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName, Class, Stn_Class, CollegeName, Student_Photo_Urls, Total_Point_Anjuman, Resluted_Count, StnState, StnDistrict")
        .order("Total_Point_Anjuman", { ascending: false });

      if (stnError) throw stnError;

      // 2. Fetch ResultBox rows
      const { data: resultsData, error: resError } = await SupaBaseFunction
        .from("ResultBox")
        .select("*");

      if (resError) throw resError;

      // 3. Fetch Programmes
      const { data: progsData } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Program_Code, Program_Title, Date, IsResulted, IsResultPublished");

      const progMap: Record<string, { title: string; date?: string }> = {};
      (progsData || []).forEach((p: any) => {
        progMap[p.Program_Code] = {
          title: p.Program_Title || p.Program_Code,
          date: p.Date,
        };
      });

      // 4. Aggregate ResultBox positions per student
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

      const ensureStudent = (addNo: string) => {
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

      (resultsData || []).forEach((r: any) => {
        const progInfo = progMap[r.Program_Id] || { title: r.Program_Id || "Competition Event" };

        if (r.First_Holder) {
          const rec = ensureStudent(r.First_Holder);
          rec.firstCount += 1;
          rec.items.push({
            programCode: r.Program_Id,
            programTitle: progInfo.title,
            position: "1st Place",
            date: progInfo.date,
          });
        }
        if (r.Second_Holder) {
          const rec = ensureStudent(r.Second_Holder);
          rec.secondCount += 1;
          rec.items.push({
            programCode: r.Program_Id,
            programTitle: progInfo.title,
            position: "2nd Place",
            date: progInfo.date,
          });
        }
        if (r.Third_Holder) {
          const rec = ensureStudent(r.Third_Holder);
          rec.thirdCount += 1;
          rec.items.push({
            programCode: r.Program_Id,
            programTitle: progInfo.title,
            position: "3rd Place",
            date: progInfo.date,
          });
        }
        if (r.AGrade && r.AGrade !== "No Grade") {
          const rec = ensureStudent(r.AGrade);
          rec.aGradeCount += 1;
          rec.items.push({
            programCode: r.Program_Id,
            programTitle: progInfo.title,
            position: "A Grade",
            date: progInfo.date,
          });
        }
        if (r.BGrade && r.BGrade !== "No Grade") {
          const rec = ensureStudent(r.BGrade);
          rec.bGradeCount += 1;
          rec.items.push({
            programCode: r.Program_Id,
            programTitle: progInfo.title,
            position: "B Grade",
            date: progInfo.date,
          });
        }
      });

      // 5. Build Leaderboard Entries
      const entries: StudentLeaderboardEntry[] = (studentsData || []).map((s: any) => {
        const p = placementsMap[s.AddNo] || {
          firstCount: 0,
          secondCount: 0,
          thirdCount: 0,
          aGradeCount: 0,
          bGradeCount: 0,
          items: [],
        };

        const resolvedClass =
          (s.Stn_Class ? meta.classMap[s.Stn_Class] : null) ||
          s.Class ||
          "Unassigned Class";

        return {
          addNo: s.AddNo,
          name: s.StudentName || "Student Candidate",
          photoUrl: s.Student_Photo_Urls || "",
          className: resolvedClass,
          collegeName: s.CollegeName || "Darul Huda",
          state: s.StnState || "",
          district: s.StnDistrict || "",
          resultedPoints: Number(s.Total_Point_Anjuman || 0),
          resultedCount: Number(s.Resluted_Count || p.items.length || 0),
          firstCount: p.firstCount,
          secondCount: p.secondCount,
          thirdCount: p.thirdCount,
          aGradeCount: p.aGradeCount,
          bGradeCount: p.bGradeCount,
          placements: p.items,
        };
      });

      // Sort by resulted points descending, then by first count descending
      entries.sort((a, b) => {
        if (b.resultedPoints !== a.resultedPoints) {
          return b.resultedPoints - a.resultedPoints;
        }
        if (b.firstCount !== a.firstCount) {
          return b.firstCount - a.firstCount;
        }
        return b.resultedCount - a.resultedCount;
      });

      setLeaderboard(entries);
    } catch (err: any) {
      console.error("Error loading resulted leaderboard:", err);
      setError(err.message || "Failed to load resulted leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  // Extract filter options - ONLY from records available in leaderboard table
  const uniqueClasses = useMemo(() => {
    const list = Array.from(new Set(leaderboard.map((s) => s.className).filter(Boolean)));
    return list.sort();
  }, [leaderboard]);

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.addNo.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q);

      const matchesClass = classFilter === "All" || item.className === classFilter;

      const matchesPoints =
        minPointsFilter === "all"
          ? true
          : minPointsFilter === "has_points"
          ? item.resultedPoints > 0
          : minPointsFilter === "winners_only"
          ? item.resultedCount > 0
          : true;

      return matchesSearch && matchesClass && matchesPoints;
    });
  }, [leaderboard, searchQuery, classFilter, minPointsFilter]);

  const top3 = useMemo(() => {
    return filteredLeaderboard.slice(0, 3);
  }, [filteredLeaderboard]);

  const handleExport = () => {
    const exportData = filteredLeaderboard.map((item, index) => ({
      Rank: index + 1,
      "Admission No": item.addNo,
      "Student Name": item.name,
      Class: item.className,
      "Resulted Points": item.resultedPoints,
      "Resulted Events Count": item.resultedCount,
      "1st Place": item.firstCount,
      "2nd Place": item.secondCount,
      "3rd Place": item.thirdCount,
      "A Grade": item.aGradeCount,
      "B Grade": item.bGradeCount,
      Campus: item.collegeName,
    }));

    exportToExcel(
      exportData,
      `Resulted_Student_Leaderboard_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Resulted Leaderboard"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Crown size={14} className="text-amber-400" />
                <span>Official Competitions Standing</span>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Admin Analytics View
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Resulted Student Leaderboard
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Official standings calculated strictly from conducted competitions and published ResultBox achievements.
              Recognizing high-achieving student performers across all categories.
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

      {/* TOP 3 PODIUM (Visible if available) */}
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Resulted Score</span>
                <span className="text-2xl font-black text-slate-800">{top3[1].resultedPoints} pts</span>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] font-bold text-slate-600">
                  <span>1st: {top3[1].firstCount}</span>
                  <span>•</span>
                  <span>2nd: {top3[1].secondCount}</span>
                  <span>•</span>
                  <span>Events: {top3[1].resultedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50/80 to-white rounded-3xl p-6 border-2 border-amber-300 shadow-md flex flex-col items-center text-center relative overflow-hidden hover:shadow-lg transition -mt-1 md:-mt-3">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Crown size={14} className="text-amber-900" />
                  Rank #1 • Champion
                </span>
                <span className="text-xs font-bold text-amber-700 font-mono">#{top3[0].addNo}</span>
              </div>
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-lg my-2 relative">
                <SafeImage
                  src={top3[0].photoUrl}
                  alt={top3[0].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-black text-slate-900 text-lg mt-1 truncate max-w-full">{top3[0].name}</h3>
              <p className="text-xs font-bold text-amber-700 mb-3">{top3[0].className}</p>

              <div className="w-full bg-amber-100/60 rounded-2xl p-3.5 border border-amber-200 mt-auto">
                <span className="text-[10px] uppercase font-black text-amber-800 block tracking-wider">Total Resulted Score</span>
                <span className="text-3xl font-black text-amber-950">{top3[0].resultedPoints} pts</span>
                <div className="flex items-center justify-center gap-2 mt-2 text-xs font-black text-amber-900">
                  <span className="bg-amber-200/80 px-2 py-0.5 rounded-md">1st Place: {top3[0].firstCount}</span>
                  <span>•</span>
                  <span>Total Wins: {top3[0].resultedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {top3[2] && (
            <div className="order-3 md:order-3 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:shadow-md transition">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-700/10 text-amber-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Medal size={12} className="text-amber-700" />
                  Rank #3 • Bronze
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">#{top3[2].addNo}</span>
              </div>
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-700/30 shadow-md my-2 relative">
                <SafeImage
                  src={top3[2].photoUrl}
                  alt={top3[2].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-black text-slate-900 text-base mt-1 truncate max-w-full">{top3[2].name}</h3>
              <p className="text-xs font-semibold text-slate-500 mb-3">{top3[2].className}</p>

              <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-100 mt-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Resulted Score</span>
                <span className="text-2xl font-black text-slate-800">{top3[2].resultedPoints} pts</span>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] font-bold text-slate-600">
                  <span>1st: {top3[2].firstCount}</span>
                  <span>•</span>
                  <span>3rd: {top3[2].thirdCount}</span>
                  <span>•</span>
                  <span>Events: {top3[2].resultedCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Class Filter - ONLY options in the table! */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="All">All Classes ({uniqueClasses.length})</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                Class: {c}
              </option>
            ))}
          </select>

          {/* Points Filter */}
          <select
            value={minPointsFilter}
            onChange={(e) => setMinPointsFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="all">All Students</option>
            <option value="has_points">Scored &gt; 0 Points Only</option>
            <option value="winners_only">Awarded Candidates Only</option>
          </select>
        </div>
      </div>

      {/* FULL LEADERBOARD TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy size={18} className="text-indigo-600" />
              <span>Full Standings Ranking</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredLeaderboard.length} candidates ranked by officially resulted scores.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Calculating resulted leaderboard...</p>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="py-20 text-center p-6">
            <Trophy size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-800">No student records match your query.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the class or search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-100 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Student Candidate</th>
                  <th className="py-3.5 px-4">Class</th>
                  <th className="py-3.5 px-4 text-center">1st</th>
                  <th className="py-3.5 px-4 text-center">2nd</th>
                  <th className="py-3.5 px-4 text-center">3rd</th>
                  <th className="py-3.5 px-4 text-center">A / B</th>
                  <th className="py-3.5 px-4 text-right">Resulted Points</th>
                  <th className="py-3.5 px-4 text-center w-20">Details</th>
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
                      {/* Rank Column */}
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

                      {/* Candidate Column */}
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

                      {/* 1st Place */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {student.firstCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-black">
                            {student.firstCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 2nd Place */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {student.secondCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                            {student.secondCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 3rd Place */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {student.thirdCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold">
                            {student.thirdCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Grades */}
                      <td className="py-3.5 px-4 text-center font-bold text-xs text-slate-600">
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

                      {/* Resulted Points */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-indigo-700 text-base font-mono">
                          {student.resultedPoints}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">pts</span>
                      </td>

                      {/* Details Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForModal(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="View Resulted Events Breakdown"
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

      {/* DETAIL MODAL: Student Result Breakdown */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative space-y-4">
            <button
              type="button"
              onClick={() => setSelectedStudentForModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
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
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-black">
                  Resulted Points: {selectedStudentForModal.resultedPoints} pts
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Winning Events Placements ({selectedStudentForModal.placements.length})
              </h4>

              {selectedStudentForModal.placements.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
                  No individual event placements recorded in ResultBox for this candidate.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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

            <div className="pt-2 flex justify-end">
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
