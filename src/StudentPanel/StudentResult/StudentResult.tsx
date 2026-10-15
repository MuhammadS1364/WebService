import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveStudentProfile } from "../../lib/accountResolver";
import ProgrammeResultModal from "../../components/ProgrammeResultModal";
import {
  Trophy,
  Medal,
  Award,
  Search,
  Calendar,
  Sparkles,
  CheckCircle,
  CheckCircle2,
} from "lucide-react";

interface StudentResultEntry {
  Result_id: string;
  Program_Id: string;
  programTitle: string;
  wingCode: string;
  programDate: string | null;
  venue?: string | null;
  poster?: string | null;
  position: "1st Place" | "2nd Place" | "3rd Place" | "Grade A" | "Grade B" | "Participant";
  pointsAwarded: number;
  isWinner: boolean;
  resultRow?: any;
}

export default function StudentResult() {
  const { actStn } = useParams<{ actStn: string }>();
  const [results, setResults] = useState<StudentResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPos, setFilterPos] = useState("all");
  const [studentInfo, setStudentInfo] = useState<{ AddNo: string; name: string } | null>(null);
  const [selectedResultForModal, setSelectedResultForModal] = useState<StudentResultEntry | null>(null);

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

        // 1. Fetch registered programs for this student
        const { data: regRows } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", addNo);

        const regCodes = Array.from(new Set((regRows || []).map((r: any) => r.Program_Code).filter(Boolean))) as string[];

        // 2. Query ResultBox where student is winner OR where Program_Id is in registered codes
        let rawResults: any[] = [];
        if (regCodes.length > 0) {
          const { data: resData, error: resError } = await SupaBaseFunction
            .from("ResultBox")
            .select("*")
            .or(`First_Holder.eq.${addNo},Second_Holder.eq.${addNo},Third_Holder.eq.${addNo},AGrade.eq.${addNo},BGrade.eq.${addNo},Program_Id.in.(${regCodes.map((c: string) => `"${c}"`).join(",")})`);
          if (resError) throw resError;
          rawResults = resData || [];
        } else {
          const { data: resData, error: resError } = await SupaBaseFunction
            .from("ResultBox")
            .select("*")
            .or(`First_Holder.eq.${addNo},Second_Holder.eq.${addNo},Third_Holder.eq.${addNo},AGrade.eq.${addNo},BGrade.eq.${addNo}`);
          if (resError) throw resError;
          rawResults = resData || [];
        }

        // 3. Fetch Program details for all relevant codes
        const allProgCodes = Array.from(new Set([...rawResults.map((r) => r.Program_Id), ...regCodes].filter(Boolean)));
        let progMap: Record<string, { title: string; wing: string; date: string | null; venue: string | null; poster: string | null; isPublished: boolean }> = {};

        if (allProgCodes.length > 0) {
          const { data: pData } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("Program_Code, Program_Title, WingCode, Date, Venue, Program_Poster, IsResultPublished, IsResulted")
            .in("Program_Code", allProgCodes);

          (pData || []).forEach((p: any) => {
            progMap[p.Program_Code] = {
              title: p.Program_Title || p.Program_Code,
              wing: p.WingCode || "Wing",
              date: p.Date,
              venue: p.Venue,
              poster: p.Program_Poster,
              isPublished: Boolean(p.IsResultPublished || p.IsResulted),
            };
          });
        }

        const formatted: StudentResultEntry[] = [];
        const seenProgramCodes = new Set<string>();

        const cleanAddNo = (addNo || "").trim().toUpperCase();
        const matchesHolder = (holderStr?: string | null) => {
          if (!holderStr || !cleanAddNo) return false;
          const tokens = holderStr.split(",").map((s) => s.trim().toUpperCase());
          return tokens.includes(cleanAddNo);
        };

        rawResults.forEach((r) => {
          const pInfo = progMap[r.Program_Id] || { title: r.Program_Id, wing: "", date: null, venue: null, poster: null, isPublished: true };
          let matchedWin = false;

          if (matchesHolder(r.First_Holder)) {
            matchedWin = true;
            seenProgramCodes.add(r.Program_Id);
            formatted.push({
              Result_id: r.Result_id + "-1",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              venue: pInfo.venue,
              poster: pInfo.poster,
              position: "1st Place",
              pointsAwarded: 10,
              isWinner: true,
              resultRow: r,
            });
          }
          if (matchesHolder(r.Second_Holder)) {
            matchedWin = true;
            seenProgramCodes.add(r.Program_Id);
            formatted.push({
              Result_id: r.Result_id + "-2",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              venue: pInfo.venue,
              poster: pInfo.poster,
              position: "2nd Place",
              pointsAwarded: 7,
              isWinner: true,
              resultRow: r,
            });
          }
          if (matchesHolder(r.Third_Holder)) {
            matchedWin = true;
            seenProgramCodes.add(r.Program_Id);
            formatted.push({
              Result_id: r.Result_id + "-3",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              venue: pInfo.venue,
              poster: pInfo.poster,
              position: "3rd Place",
              pointsAwarded: 5,
              isWinner: true,
              resultRow: r,
            });
          }
          if (matchesHolder(r.AGrade)) {
            matchedWin = true;
            seenProgramCodes.add(r.Program_Id);
            formatted.push({
              Result_id: r.Result_id + "-A",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              venue: pInfo.venue,
              poster: pInfo.poster,
              position: "Grade A",
              pointsAwarded: 5,
              isWinner: true,
              resultRow: r,
            });
          }
          if (matchesHolder(r.BGrade)) {
            matchedWin = true;
            seenProgramCodes.add(r.Program_Id);
            formatted.push({
              Result_id: r.Result_id + "-B",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              venue: pInfo.venue,
              poster: pInfo.poster,
              position: "Grade B",
              pointsAwarded: 3,
              isWinner: true,
              resultRow: r,
            });
          }

          // If the student registered in this program and results are declared/published, but student wasn't on podium:
          if (!matchedWin && regCodes.includes(r.Program_Id) && pInfo.isPublished && !seenProgramCodes.has(r.Program_Id)) {
            seenProgramCodes.add(r.Program_Id);
            formatted.push({
              Result_id: r.Result_id + "-part",
              Program_Id: r.Program_Id,
              programTitle: pInfo.title,
              wingCode: pInfo.wing,
              programDate: pInfo.date,
              venue: pInfo.venue,
              poster: pInfo.poster,
              position: "Participant",
              pointsAwarded: 0,
              isWinner: false,
              resultRow: r,
            });
          }
        });

        // Also check if any registered program has IsResultPublished === true but was not in rawResults
        regCodes.forEach((code) => {
          if (!seenProgramCodes.has(code)) {
            const pInfo = progMap[code];
            if (pInfo && pInfo.isPublished) {
              seenProgramCodes.add(code);
              formatted.push({
                Result_id: `prog-${code}`,
                Program_Id: code,
                programTitle: pInfo.title,
                wingCode: pInfo.wing,
                programDate: pInfo.date,
                venue: pInfo.venue,
                poster: pInfo.poster,
                position: "Participant",
                pointsAwarded: 0,
                isWinner: false,
              });
            }
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
    if (filterPos === "winners" && !r.isWinner) return false;
    if (filterPos !== "all" && filterPos !== "winners" && r.position !== filterPos) return false;
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
          <option value="all">All Declared Results ({results.length})</option>
          <option value="winners">🏆 Honours & Winners ({results.filter(r => r.isWinner).length})</option>
          <option value="1st Place">🥇 1st Place ({results.filter(r => r.position === "1st Place").length})</option>
          <option value="2nd Place">🥈 2nd Place ({results.filter(r => r.position === "2nd Place").length})</option>
          <option value="3rd Place">🥉 3rd Place ({results.filter(r => r.position === "3rd Place").length})</option>
          <option value="Grade A">⭐ Grade A ({results.filter(r => r.position === "Grade A").length})</option>
          <option value="Grade B">⭐ Grade B ({results.filter(r => r.position === "Grade B").length})</option>
          <option value="Participant">🎯 Participations ({results.filter(r => r.position === "Participant").length})</option>
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
              : "No competition results have been declared for your registered events yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const isFirst = r.position === "1st Place";
            const isSecond = r.position === "2nd Place";
            const isThird = r.position === "3rd Place";
            const isGrade = r.position.startsWith("Grade");
            const isParticipant = r.position === "Participant";

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
                          : isGrade
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {isFirst && <Trophy size={13} className="text-amber-600" />}
                      {isSecond && <Medal size={13} className="text-slate-600" />}
                      {isThird && <Medal size={13} className="text-orange-600" />}
                      {isGrade && <CheckCircle size={13} className="text-emerald-600" />}
                      {isParticipant && <CheckCircle2 size={13} className="text-blue-600" />}
                      <span>{r.position === "Participant" ? "Participated • Result Declared" : r.position}</span>
                    </span>

                    {r.pointsAwarded > 0 ? (
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        +{r.pointsAwarded} PTS
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Standing Declared
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                    {r.programTitle}
                  </h3>

                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Code: #{r.Program_Id} {r.wingCode ? `• Wing: ${r.wingCode}` : ""}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} />
                      <span>{r.programDate || "Scheduled Event"}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Sparkles size={12} /> Certified Result
                    </span>
                  </div>

                  {/* DISPLAY RESULT BUTTON TO OPEN MODAL */}
                  <button
                    type="button"
                    onClick={() => setSelectedResultForModal(r)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] cursor-pointer"
                    title="View official declared standings & podium"
                  >
                    <Trophy size={13} className="text-yellow-200" />
                    <span>Display Official Result</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Programme Result Display Modal */}
      {selectedResultForModal && (
        <ProgrammeResultModal
          isOpen={Boolean(selectedResultForModal)}
          onClose={() => setSelectedResultForModal(null)}
          programCode={selectedResultForModal.Program_Id}
          programTitle={selectedResultForModal.programTitle}
          programDate={selectedResultForModal.programDate}
          programVenue={selectedResultForModal.venue}
          programPoster={selectedResultForModal.poster}
          wingCode={selectedResultForModal.wingCode}
        />
      )}
    </div>
  );
}
