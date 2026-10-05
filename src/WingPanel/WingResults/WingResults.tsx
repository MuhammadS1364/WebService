import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveWingProfile, type LoggedInWingProfile } from "../../lib/wingResolver";
import SafeImage from "../../lib/SafeImage";
import {
  Trophy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface Programme {
  Program_Code: string;
  Program_Title: string | null;
  WingCode: string | null;
  Date: string | null;
  Venue: string | null;
  Category: string | null;
  Group: string | null;
  IsResulted: boolean;
  IsResultPublished: boolean;
  Total_Registration: number;
  is_group_program: boolean;
}

interface Candidate {
  AddNo: string;
  StudentName: string;
  Class: string;
  CollegeName: string;
  Student_Photo_Urls?: string;
  Program_Code: string;
}

export default function WingResults() {
  const { actWing } = useParams<{ actWing: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [wingData, setWingData] = useState<LoggedInWingProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_wing_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(new Set());
  const [loadingCands, setLoadingCands] = useState<Record<string, boolean>>({});
  const [resultFilter, setResultFilter] = useState<"all" | "published" | "pending">("all");

  useEffect(() => {
    let isMounted = true;

    const fetchWingResults = async () => {
      try {
        const wing = await resolveWingProfile(actWing);
        if (!wing) throw new Error("Wing account not identified.");

        if (isMounted) {
          setWingData(wing);
        }

        // Fetch programmes for this wing
        const { data: progData, error: progError } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, WingCode, Date, Venue, Category, Group, IsResulted, IsResultPublished, Total_Registration, is_group_program")
          .eq("WingCode", wing.WingCode)
          .order("Date", { ascending: false });

        if (progError) throw progError;
        if (isMounted) {
          setProgrammes((progData as Programme[]) || []);
        }
      } catch (err: unknown) {
        console.error("Error fetching wing result records:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWingResults();
  }, [actWing]);

  const toggleCandidates = async (code: string) => {
    const newExpanded = new Set(expandedProgrammes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedProgrammes(newExpanded);

    if (!candidates[code]) {
      setLoadingCands(prev => ({ ...prev, [code]: true }));
      try {
        const { data: regs } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code")
          .eq("Program_Code", code);

        if (regs && regs.length > 0) {
          const codes = regs.map(r => r.Candidate_Code).filter(Boolean);
          const { data: studentList } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Class, CollegeName, Student_Photo_Urls")
            .in("AddNo", codes);

          const mapped: Candidate[] = (studentList || []).map((s: any) => ({
            ...s,
            Program_Code: code,
          }));

          setCandidates(prev => ({ ...prev, [code]: mapped }));
        } else {
          setCandidates(prev => ({ ...prev, [code]: [] }));
        }
      } catch (e) {
        console.error("Failed to load candidates:", e);
      } finally {
        setLoadingCands(prev => ({ ...prev, [code]: false }));
      }
    }
  };

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const matchSearch =
        (p.Program_Title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Program_Code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.Category || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      const isPub = p.IsResultPublished === true || p.IsResulted === true;
      if (resultFilter === "published") return isPub;
      if (resultFilter === "pending") return !isPub;
      return true;
    });
  }, [programmes, searchQuery, resultFilter]);

  if (loading && !wingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Clean Light Hero Card */}
        <div className="relative bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Official Results Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {wingData?.WingCode} • Examination & Standing Records
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {wingData?.WingTitle || "Wing Space"} — Results
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
              Publish and monitor official performance results, rank standings, and score allocations for your wing's programmes.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to={`/wing-panel/${actWing || wingData?.WingEmail || ""}/create-result`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-200 transition-all cursor-pointer"
            >
              <Trophy size={16} />
              <span>Publish Result</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search results by programme title or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter size={12} /> Status:
            </span>
            <button
              onClick={() => setResultFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                resultFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({programmes.length})
            </button>
            <button
              onClick={() => setResultFilter("published")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                resultFilter === "published"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Published ({programmes.filter(p => p.IsResultPublished || p.IsResulted).length})
            </button>
            <button
              onClick={() => setResultFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                resultFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pending ({programmes.filter(p => !p.IsResultPublished && !p.IsResulted).length})
            </button>
          </div>
        </div>

        {/* Results / Programmes Table */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden">
          {filteredProgrammes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Trophy size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No Result Records Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No programmes match your current filter. Choose "Publish Result" to announce standings for completed events.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Programme</th>
                    <th className="px-4 py-4">Date & Venue</th>
                    <th className="px-4 py-4 text-center">Registrations</th>
                    <th className="px-4 py-4 text-center">Result Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProgrammes.map((p) => {
                    const isPub = p.IsResultPublished || p.IsResulted;
                    const isExp = expandedProgrammes.has(p.Program_Code);

                    return (
                      <React.Fragment key={p.Program_Code}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                {p.Program_Title || "Untitled Programme"}
                                {p.is_group_program && (
                                  <span className="text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                                    Squad
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {p.Program_Code} {p.Category ? `• ${p.Category}` : ""}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800">
                              {p.Date || "Date TBD"}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {p.Venue || "Venue not provided"}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <Users size={12} className="text-blue-600" />
                              {p.Total_Registration || 0}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPub
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {isPub ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              {isPub ? "Published" : "Pending Results"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isPub ? (
                                <Link
                                  to={`/wing-panel/${actWing || wingData?.WingEmail || ""}/create-result`}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all"
                                >
                                  Publish Result
                                </Link>
                              ) : (
                                <span className="text-xs font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg">
                                  ✓ Concluded
                                </span>
                              )}
                              <button
                                onClick={() => toggleCandidates(p.Program_Code)}
                                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                                title="Toggle Candidates"
                              >
                                {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExp && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50/70 p-5 border-y border-slate-100">
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <Users size={14} className="text-blue-600" />
                                  Candidates in {p.Program_Title}
                                </h4>

                                {loadingCands[p.Program_Code] ? (
                                  <div className="text-center py-4 text-xs text-slate-400 italic">
                                    Loading candidates...
                                  </div>
                                ) : candidates[p.Program_Code] && candidates[p.Program_Code].length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {candidates[p.Program_Code].map((c) => (
                                      <div
                                        key={c.AddNo}
                                        className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3"
                                      >
                                        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
                                          <SafeImage
                                            src={c.Student_Photo_Urls}
                                            alt={c.StudentName}
                                            fallbackCategory="student"
                                            fallbackText={c.StudentName}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-slate-900 text-xs truncate">
                                            {c.StudentName}
                                          </p>
                                          <p className="text-[10px] text-slate-500 font-mono truncate">
                                            {c.AddNo} • {c.Class}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-xs text-slate-400">
                                    No registered candidates found for this programme.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
