import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { exportToExcel } from "../lib/excelService";
import formatResultDate from "./DateFormatConvertor";
import { Trophy, Search, Download, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import type { ResultBoxRecord } from "../lib/types";

interface StudentInfo {
  AddNo: string;
  StudentName: string;
  Class: string;
  CollegeName?: string;
  Student_Photo_Urls?: string;
}

interface EnrichedResult extends ResultBoxRecord {
  programme?: {
    Program_Title: string | null;
    Program_Code: string;
    Date: string | null;
    Venue: string | null;
    Category: string | null;
    WingCode: string | null;
    Group: string | null;
    is_group_program?: boolean;
    Program_Poster?: string | null;
  } | null;
  firstStudent?: StudentInfo | null;
  secondStudent?: StudentInfo | null;
  thirdStudent?: StudentInfo | null;
  aGradeStudent?: StudentInfo | null;
  bGradeStudent?: StudentInfo | null;
}

export default function AllResultsList() {
  const meta = useProgrammeMeta();
  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [wingFilter, setWingFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch from ResultBox
      const { data: resultRows, error: resultError } = await SupaBaseFunction
        .from("ResultBox")
        .select("*")
        .order("Result_id", { ascending: false });

      if (resultError) throw resultError;
      if (!resultRows || resultRows.length === 0) {
        setResults([]);
        return;
      }

      // 2. Fetch associated ProgrammesBox
      const progCodes = Array.from(new Set(resultRows.map((r: ResultBoxRecord) => r.Program_Id).filter(Boolean))) as string[];
      let progsMap: Record<string, any> = {};
      if (progCodes.length > 0) {
        const { data: progRows } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Date, Venue, Category, WingCode, Group, is_group_program, Program_Poster")
          .in("Program_Code", progCodes);

        (progRows || []).forEach((p: any) => {
          progsMap[p.Program_Code] = p;
        });
      }

      // 3. Fetch associated StudentsBox
      const studentAddNos = Array.from(
        new Set([
          ...resultRows.map((r: ResultBoxRecord) => r.First_Holder),
          ...resultRows.map((r: ResultBoxRecord) => r.Second_Holder),
          ...resultRows.map((r: ResultBoxRecord) => r.Third_Holder),
          ...resultRows.map((r: ResultBoxRecord) => r.AGrade),
          ...resultRows.map((r: ResultBoxRecord) => r.BGrade),
        ].filter(Boolean))
      ) as string[];

      let studentsMap: Record<string, StudentInfo> = {};
      if (studentAddNos.length > 0) {
        const { data: studentRows } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Class, CollegeName, Student_Photo_Urls")
          .in("AddNo", studentAddNos);

        (studentRows || []).forEach((s: any) => {
          studentsMap[s.AddNo] = s;
        });
      }

      // 4. Combine into EnrichedResult
      const combined: EnrichedResult[] = resultRows.map((r: ResultBoxRecord) => ({
        ...r,
        programme: r.Program_Id ? progsMap[r.Program_Id] || null : null,
        firstStudent: r.First_Holder ? studentsMap[r.First_Holder] || null : null,
        secondStudent: r.Second_Holder ? studentsMap[r.Second_Holder] || null : null,
        thirdStudent: r.Third_Holder ? studentsMap[r.Third_Holder] || null : null,
        aGradeStudent: r.AGrade && r.AGrade !== "No Grade" ? studentsMap[r.AGrade] || null : null,
        bGradeStudent: r.BGrade ? studentsMap[r.BGrade] || null : null,
      }));

      setResults(combined);
    } catch (err: any) {
      console.error("Error fetching results:", err);
      setError("Failed to load results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // Helper resolvers
  const getWingTitle = (code?: string | null) => {
    if (!code) return "General";
    return meta.wingMap[code] || code;
  };

  const getCategoryTitle = (cat?: string | null) => {
    if (!cat) return "General";
    return meta.categoryMap[cat] || cat;
  };

  const getVenueTitle = (ven?: string | null) => {
    if (!ven) return "Campus Venue";
    return meta.venueMap[ven] || ven;
  };

  // Filtered Results
  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return results.filter((res) => {
      const prog = res.programme;
      const title = (prog?.Program_Title || "").toLowerCase();
      const code = (res.Program_Id || "").toLowerCase();
      const first = (res.firstStudent?.StudentName || res.First_Holder || "").toLowerCase();
      const second = (res.secondStudent?.StudentName || res.Second_Holder || "").toLowerCase();
      const third = (res.thirdStudent?.StudentName || res.Third_Holder || "").toLowerCase();
      const wing = getWingTitle(prog?.WingCode).toLowerCase();
      const venue = getVenueTitle(prog?.Venue).toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        code.includes(query) ||
        first.includes(query) ||
        second.includes(query) ||
        third.includes(query) ||
        wing.includes(query) ||
        venue.includes(query);

      const matchesWing = wingFilter === "All" || prog?.WingCode === wingFilter;
      const matchesCategory = categoryFilter === "All" || prog?.Category === categoryFilter;

      return matchesSearch && matchesWing && matchesCategory;
    });
  }, [results, searchQuery, wingFilter, categoryFilter, meta.wingMap, meta.categoryMap, meta.venueMap]);

  // Export to Excel
  const handleExport = () => {
    if (filteredResults.length === 0) {
      alert("No results to export.");
      return;
    }

    const exportRows = filteredResults.map((r) => ({
      "Result ID": r.Result_id,
      "Program Code": r.Program_Id || "N/A",
      "Program Title": r.programme?.Program_Title || "Untitled",
      "Wing": getWingTitle(r.programme?.WingCode),
      "Date": r.programme?.Date || "TBA",
      "1st Place": r.firstStudent ? `${r.firstStudent.StudentName} (${r.First_Holder})` : r.First_Holder || "-",
      "2nd Place": r.secondStudent ? `${r.secondStudent.StudentName} (${r.Second_Holder})` : r.Second_Holder || "-",
      "3rd Place": r.thirdStudent ? `${r.thirdStudent.StudentName} (${r.Third_Holder})` : r.Third_Holder || "-",
      "A Grade": r.aGradeStudent ? `${r.aGradeStudent.StudentName} (${r.AGrade})` : r.AGrade || "-",
      "B Grade": r.bGradeStudent ? `${r.bGradeStudent.StudentName} (${r.BGrade})` : r.BGrade || "-",
    }));

    exportToExcel(exportRows, `Official_Results_${new Date().toISOString().split("T")[0]}.xlsx`, "Results");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-slate-700 animate-pulse">Loading Official Competition Results...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Trophy className="w-6 h-6 text-yellow-300" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-200">
                Official Hall of Fame
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Public Results Board</h1>
            <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-xl">
              Official standings, winners podium, and grade honors for conducted programmes and competitions.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={filteredResults.length === 0}
            className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <Download size={15} /> Export Results ({filteredResults.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by program, candidate name, or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={wingFilter}
            onChange={(e) => setWingFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Wings</option>
            {meta.wings.map((w) => (
              <option key={w.WingCode} value={w.WingCode}>
                {w.WingTitle || w.WingCode}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {meta.categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Cards Grid */}
      {filteredResults.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">No Results Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No published results match your current search query or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((res) => {
            const prog = res.programme;
            return (
              <div
                key={res.Result_id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Header Section */}
                <div className="p-5 pb-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {res.Program_Id}
                    </span>
                    {prog?.WingCode && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {getWingTitle(prog.WingCode)}
                      </span>
                    )}
                    {prog?.Category && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        {getCategoryTitle(prog.Category)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                    {prog?.Program_Title || res.Program_Id}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" />
                      {formatResultDate(prog?.Date)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={13} className="text-slate-400" />
                      {getVenueTitle(prog?.Venue)}
                    </span>
                  </div>
                </div>

                {/* Podium Winners */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-center">
                  {/* 1st Place */}
                  {res.First_Holder ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                      <div className="w-10 h-10 rounded-full bg-amber-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white">
                        🥇
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">1st Position</div>
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {res.firstStudent?.StudentName || res.First_Holder}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {res.First_Holder} {res.firstStudent?.Class ? `• ${res.firstStudent.Class}` : ""}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* 2nd Place */}
                  {res.Second_Holder ? (
                    <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-800 font-black text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white">
                        🥈
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">2nd Position</div>
                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                          {res.secondStudent?.StudentName || res.Second_Holder}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {res.Second_Holder} {res.secondStudent?.Class ? `• ${res.secondStudent.Class}` : ""}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* 3rd Place */}
                  {res.Third_Holder ? (
                    <div className="flex items-center gap-3 p-2 rounded-2xl bg-orange-50/60 border border-orange-200/60">
                      <div className="w-9 h-9 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white">
                        🥉
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800">3rd Position</div>
                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                          {res.thirdStudent?.StudentName || res.Third_Holder}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {res.Third_Holder} {res.thirdStudent?.Class ? `• ${res.thirdStudent.Class}` : ""}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Grades (A & B) */}
                  {(res.aGradeStudent || (res.AGrade && res.AGrade !== "No Grade") || res.BGrade) && (
                    <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100 mt-2">
                      {res.AGrade && res.AGrade !== "No Grade" && (
                        <div className="flex-1 min-w-[130px] p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                          <span className="font-extrabold text-[10px] uppercase text-emerald-700 block">Grade A Award</span>
                          <span className="font-bold truncate block">{res.aGradeStudent?.StudentName || res.AGrade}</span>
                        </div>
                      )}
                      {res.BGrade && (
                        <div className="flex-1 min-w-[130px] p-2 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs">
                          <span className="font-extrabold text-[10px] uppercase text-blue-700 block">Grade B Award</span>
                          <span className="font-bold truncate block">{res.bGradeStudent?.StudentName || res.BGrade}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer status */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Verified Result
                  </span>
                  {res.creaded_At && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Published {res.creaded_At}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
