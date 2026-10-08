import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveStudentProfile } from "../../lib/accountResolver";
import {
  Trophy,
  Medal,
  Award,
  Search,
  Calendar,
  Sparkles,
  CheckCircle,
} from "lucide-react";

interface StudentResultEntry {
  Result_id: string;
  Program_Id: string;
  programTitle: string;
  wingCode: string;
  programDate: string | null;
  position: "1st Place" | "2nd Place" | "3rd Place" | "Grade A" | "Grade B";
  pointsAwarded: number;
}

export default function StudentResult() {
  const { actStn } = useParams<{ actStn: string }>();
  const [results, setResults] = useState<StudentResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPos, setFilterPos] = useState("all");
  const [studentInfo, setStudentInfo] = useState<{ AddNo: string; name: string } | null>(null);

  useEffect(() => {
    async function loadStudentResults() {
      if (!actStn) return;
      try {
        setLoading(true);
        const profile = await resolveStudentProfile(actStn);
        const addNo = profile?.AddNo || actStn;
        setStudentInfo({
          AddNo: addNo,
          name: profile?.StudentName || addNo,
        });

        // Query all results where this student is first, second, third, A Grade, or B Grade
        const { data: rawResults, error: resError } = await SupaBaseFunction
          .from("ResultBox")
          .select("Result_id, Program_Id, First_Holder, Second_Holder, Third_Holder, AGrade, BGrade, creaded_At")
          .or(`First_Holder.eq.${addNo},Second_Holder.eq.${addNo},Third_Holder.eq.${addNo},AGrade.eq.${addNo},BGrade.eq.${addNo}`);

        if (resError) throw resError;

        if (!rawResults || rawResults.length === 0) {
          setResults([]);
          return;
        }

        // Fetch Program details
        const progCodes = Array.from(new Set(rawResults.map((r) => r.Program_Id).filter(Boolean)));
        let progMap: Record<string, { title: string; wing: string; date: string | null }> = {};

        if (progCodes.length > 0) {
          const { data: pData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("Program_Code, Program_Title, WingCode, Date")
            .in("Program_Code", progCodes);

          (pData || []).forEach((p) => {
            progMap[p.Program_Code] = {
              title: p.Program_Title || p.Program_Code,
              wing: p.WingCode || "Wing",
              date: p.Date,
            };
          });
        }

        const formatted: StudentResultEntry[] = [];
        rawResults.forEach((r) => {
          const pInfo = progMap[r.Program_Id] || { title: r.Program_Id, wing: "", date: null };

          if (r.First_Holder === addNo) {
            formatted.push({
              Result_id: r.Result_id + "-1",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              position: "1st Place",
              pointsAwarded: 10,
            });
          }
          if (r.Second_Holder === addNo) {
            formatted.push({
              Result_id: r.Result_id + "-2",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              position: "2nd Place",
              pointsAwarded: 7,
            });
          }
          if (r.Third_Holder === addNo) {
            formatted.push({
              Result_id: r.Result_id + "-3",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              position: "3rd Place",
              pointsAwarded: 5,
            });
          }
          if (r.AGrade === addNo) {
            formatted.push({
              Result_id: r.Result_id + "-A",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              position: "Grade A",
              pointsAwarded: 5,
            });
          }
          if (r.BGrade === addNo) {
            formatted.push({
              Result_id: r.Result_id + "-B",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              position: "Grade B",
              pointsAwarded: 3,
            });
          }
        });

        setResults(formatted);
      } catch (err: any) {
        console.error("Error loading student results:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentResults();
  }, [actStn]);

  const filtered = results.filter((r) => {
    if (filterPos !== "all" && r.position !== filterPos) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.programTitle.toLowerCase().includes(q) ||
        r.Program_Id.toLowerCase().includes(q) ||
        r.wingCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPoints = results.reduce((acc, curr) => acc + curr.pointsAwarded, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-2">
            <Trophy size={14} className="text-amber-600" />
            <span>Academic Performance Record</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Competition Results
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Official declared results and merit honours for {studentInfo?.name || "Student"} (#{studentInfo?.AddNo || actStn})
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shrink-0">
          <div className="text-center px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Honours</span>
            <span className="text-xl font-black text-slate-900">{results.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Merit Points</span>
            <span className="text-xl font-black text-amber-600">{totalPoints} PTS</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by programme title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filterPos}
          onChange={(e) => setFilterPos(e.target.value)}
          className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Positions & Grades</option>
          <option value="1st Place">1st Place</option>
          <option value="2nd Place">2nd Place</option>
          <option value="3rd Place">3rd Place</option>
          <option value="Grade A">Grade A</option>
          <option value="Grade B">Grade B</option>
        </select>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Loading official results...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <Award size={36} className="text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No results found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? "No declared results match your search keywords."
              : "No competition results have been declared for your admission number yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const isFirst = r.position === "1st Place";
            const isSecond = r.position === "2nd Place";
            const isThird = r.position === "3rd Place";
            const isGrade = r.position.startsWith("Grade");

            return (
              <div
                key={r.Result_id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                        isFirst
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : isSecond
                          ? "bg-slate-200 text-slate-800 border border-slate-300"
                          : isThird
                          ? "bg-orange-100 text-orange-900 border border-orange-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isFirst && <Trophy size={13} className="text-amber-600" />}
                      {isSecond && <Medal size={13} className="text-slate-600" />}
                      {isThird && <Medal size={13} className="text-orange-600" />}
                      {isGrade && <CheckCircle size={13} className="text-emerald-600" />}
                      <span>{r.position}</span>
                    </span>

                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      +{r.pointsAwarded} PTS
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                    {r.programTitle}
                  </h3>

                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Code: {r.Program_Id} {r.wingCode ? `• Wing: ${r.wingCode}` : ""}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span>{r.programDate || "Scheduled Event"}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Sparkles size={12} /> Certified Result
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
