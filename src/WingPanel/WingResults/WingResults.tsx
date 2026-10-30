import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveWingProfile, type LoggedInWingProfile } from "../../lib/wingResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import SafeImage from "../../lib/SafeImage";
import { hydrateResultRecords } from "../../lib/resultService";
import ResultExportModal from "../../components/ResultExportModal";
import type { PdfExportProgramItem, PdfExportWinnerItem } from "../../lib/pdfResultService";
import {
  Trophy,
  Search,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  LayoutGrid,
  List,
  Award,
  Lock,
  Download,
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
  IsOpenRegistration?: boolean;
  Program_Poster?: string | null;
  Expected_Time?: string | null;
  is_limitation?: boolean;
  individual_limit_count?: number;
  group_limit_count?: number;
  max_count_cadidate_group?: number | null;
  max_count_candidate_group?: number | null;
  is_freezed?: boolean | null;
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
  const meta = useProgrammeMeta();

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
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(new Set());
  const [loadingCands, setLoadingCands] = useState<Record<string, boolean>>({});
  const [resultFilter, setResultFilter] = useState<"all" | "published" | "pending">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [resultsMap, setResultsMap] = useState<Record<string, any>>({});
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({});
  const [squadsMap, setSquadsMap] = useState<Record<string, string>>({});
  const [togglingReg, setTogglingReg] = useState<Record<string, boolean>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchWingResults = async () => {
      try {
        const wing = await resolveWingProfile(actWing);
        if (!wing) throw new Error("Wing account not identified.");

        if (isMounted) {
          setWingData(wing);
        }

        // Fetch programmes for this wing including IsOpenRegistration and Program_Poster
        const { data: progData, error: progError } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, WingCode, Date, Venue, Category, Group, IsResulted, IsResultPublished, Total_Registration, is_group_program, IsOpenRegistration, Program_Poster, Expected_Time, is_limitation, individual_limit_count, group_limit_count, max_count_cadidate_group, is_freezed, points_template")
          .eq("WingCode", wing.WingCode)
          .order("Date", { ascending: false });

        if (progError) throw progError;
        if (isMounted) {
          setProgrammes((progData as Programme[]) || []);
        }

        // Fetch published results for this wing's programmes
        const progCodes = (progData || []).map((p: any) => p.Program_Code);
        if (progCodes.length > 0) {
          const { data: rawRData } = await SupaBaseFunction
            .from("ResultBox")
            .select("*")
            .in("Program_Id", progCodes);

          const rData = await hydrateResultRecords(rawRData || []);

          if (rData && isMounted) {
            const rMap: Record<string, any> = {};
            const winnerAddNos = new Set<string>();

            const addHolderCodes = (val?: string | null) => {
              if (!val || val === "No Grade" || val === "none") return;
              val.split(",").forEach((c) => {
                const trimmed = c.trim();
                if (trimmed) winnerAddNos.add(trimmed);
              });
            };

            rData.forEach((r: any) => {
              if (r.Program_Id) {
                rMap[r.Program_Id] = r;
                addHolderCodes(r.First_Holder);
                addHolderCodes(r.Second_Holder);
                addHolderCodes(r.Third_Holder);
                addHolderCodes(r.AGrade);
                addHolderCodes(r.BGrade);
              }
            });
            setResultsMap(rMap);

            if (winnerAddNos.size > 0) {
              const { data: sData } = await SupaBaseFunction
                .from("StudentsBox")
                .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
                .in("AddNo", Array.from(winnerAddNos));

              if (sData && isMounted) {
                const sMap: Record<string, any> = {};
                sData.forEach((s: any) => {
                  const matchedClass = meta.classes.find(
                    (c: any) =>
                      c.class_id === s.Stn_Class ||
                      c.standard_name === s.Stn_Class ||
                      c.class_nick_name === s.Stn_Class
                  );
                  sMap[s.AddNo] = {
                    ...s,
                    Class:
                      matchedClass?.class_nick_name ||
                      matchedClass?.standard_name ||
                      s.Stn_Class ||
                      "",
                  };
                });
                setStudentsMap(sMap);
              }

              // Also fetch squads to map group titles
              const { data: sqData } = await SupaBaseFunction
                .from("SquadMate")
                .select("squad_id, squad_title, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid");

              if (sqData && isMounted) {
                const sqMap: Record<string, string> = {};
                sqData.forEach((sq: any) => {
                  if (sq.squad_id) sqMap[sq.squad_id] = sq.squad_title;
                  [
                    sq.member1_uuid,
                    sq.member2_uuid,
                    sq.member3_uuid,
                    sq.member4_uuid,
                    sq.member5_uuid,
                    sq.member6_uuid,
                    sq.member7_uuid,
                  ]
                    .filter(Boolean)
                    .forEach((m) => {
                      sqMap[(m as string).trim()] = sq.squad_title;
                    });
                });
                setSquadsMap(sqMap);
              }
            }
          }
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

  // Toggle Registration ON / OFF directly with Supabase sync
  const toggleRegistration = async (programCode: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTogglingReg(prev => ({ ...prev, [programCode]: true }));

    // Optimistic UI update
    setProgrammes(prev =>
      prev.map(p =>
        p.Program_Code === programCode ? { ...p, IsOpenRegistration: newStatus } : p
      )
    );

    try {
      const { error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ IsOpenRegistration: newStatus })
        .eq("Program_Code", programCode);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to toggle registration:", err);
      // Revert optimistic update on failure
      setProgrammes(prev =>
        prev.map(p =>
          p.Program_Code === programCode ? { ...p, IsOpenRegistration: currentStatus } : p
        )
      );
    } finally {
      setTogglingReg(prev => ({ ...prev, [programCode]: false }));
    }
  };

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
            .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
            .in("AddNo", codes);

          const mapped: Candidate[] = (studentList || []).map((s: any) => {
            const matchedClass = meta.classes.find(
              (c: any) =>
                c.class_id === s.Stn_Class ||
                c.standard_name === s.Stn_Class ||
                c.class_nick_name === s.Stn_Class
            );
            return {
              ...s,
              Class:
                matchedClass?.class_nick_name ||
                matchedClass?.standard_name ||
                s.Stn_Class ||
                "-",
              Program_Code: code,
            };
          });

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

  // Filter programmes
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const catName = meta.getCategoryName(p.Category);
      const grpName = meta.getGroupName(p.Group);
      const venName = meta.getVenueName(p.Venue);

      const matchSearch =
        (p.Program_Title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Program_Code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grpName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (selectedCategory !== "All" && catName !== selectedCategory) {
        return false;
      }

      const isPub = p.IsResultPublished === true || p.IsResulted === true;
      if (resultFilter === "published") return isPub;
      if (resultFilter === "pending") return !isPub;
      return true;
    });
  }, [programmes, searchQuery, selectedCategory, resultFilter, meta]);

  // Extract unique category names for filtering
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    programmes.forEach(p => {
      const name = meta.getCategoryName(p.Category);
      if (name) set.add(name);
    });
    return ["All", ...Array.from(set)];
  }, [programmes, meta]);

  const publishedCount = useMemo(() => {
    return programmes.filter(p => p.IsResultPublished || p.IsResulted).length;
  }, [programmes]);

  const pendingCount = useMemo(() => {
    return programmes.filter(p => !p.IsResultPublished && !p.IsResulted).length;
  }, [programmes]);

  // Memoized Exportable Programmes for Wing Results
  const exportableWingProgrammes = useMemo((): PdfExportProgramItem[] => {
    return programmes
      .filter((p) => resultsMap[p.Program_Code])
      .map((p) => {
        const res = resultsMap[p.Program_Code];
        const template =
          meta.pointsTemplates.find((t) => t.p_template_id === (p as any)?.points_template) ||
          meta.pointsTemplates[0];

        const firstPts = template?.first_only ?? 10;
        const secondPts = template?.second_only ?? 7;
        const thirdPts = template?.third_only ?? 5;
        const aGradePts = template?.A_grade ?? 5;
        const bGradePts = template?.B_grade ?? 3;

        const resolveHolders = (
          val?: string | null,
          positionLabel = "",
          pts = 0,
          sqTitle?: string | null
        ): PdfExportWinnerItem[] => {
          if (!val || val === "No Grade" || val === "none") return [];
          return val.split(",").map((c) => {
            const clean = c.trim();
            const stn = studentsMap[clean];
            return {
              position: positionLabel,
              addNo: clean,
              name: stn?.StudentName || clean,
              classTitle: stn?.Class || "Standard Class",
              collegeName: stn?.CollegeName || "Campus",
              points: pts,
              squadTitle: sqTitle || null,
            };
          });
        };

        const firstPlace = resolveHolders(res?.First_Holder, "1st Prize", firstPts, res?.firstSquadTitle);
        const secondPlace = resolveHolders(res?.Second_Holder, "2nd Prize", secondPts, res?.secondSquadTitle);
        const thirdPlace = resolveHolders(res?.Third_Holder, "3rd Prize", thirdPts, res?.thirdSquadTitle);
        const aGrade = resolveHolders(res?.AGrade, "A Grade", aGradePts, res?.aGradeSquadTitle);
        const bGrade = resolveHolders(res?.BGrade, "B Grade", bGradePts, res?.bGradeSquadTitle);

        return {
          programCode: p.Program_Code,
          programTitle: p.Program_Title || "Untitled Programme",
          category: meta.getCategoryName(p.Category, "General"),
          wing: wingData?.WingTitle || p.WingCode || "Wing",
          date: p.Date || "TBA",
          venue: meta.getVenueName(p.Venue, "Campus"),
          eventType: p.is_group_program ? "Squad / Group Event" : "Individual Event",
          firstPlace,
          secondPlace,
          thirdPlace,
          aGrade,
          bGrade,
          totalPoints:
            firstPlace.length * firstPts +
            secondPlace.length * secondPts +
            thirdPlace.length * thirdPts +
            aGrade.length * aGradePts +
            bGrade.length * bGradePts,
        };
      });
  }, [programmes, resultsMap, studentsMap, meta, wingData]);

  const availableClassesList = useMemo(() => {
    const map = new Map<string, string>();
    (meta.classes || []).forEach((c) => {
      const label =
        c.standard_name && c.class_nick_name
          ? `${c.standard_name} (${c.class_nick_name})`
          : c.standard_name || c.class_nick_name;
      if (label) map.set(label, label);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [meta.classes]);

  const availableCategoriesList = useMemo(() => {
    return availableCategories.map((c) => ({ id: c, label: c }));
  }, [availableCategories]);

  if (loading && !wingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Hero Header Card */}
        <div className="relative bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <Trophy size={11} className="text-amber-600" />
                Official Results & Standing Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {wingData?.WingCode} • {wingData?.WingTitle}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Published Results & Standings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
              Monitor concluded events, toggle registration access live, and generate official position allocations.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              disabled={exportableWingProgrammes.length === 0}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Export results in PDF or Excel"
            >
              <Download size={16} className="text-indigo-600" />
              <span>Export Results (PDF / Excel)</span>
            </button>

            <Link
              to={`/wing-panel/${actWing || wingData?.WingEmail || ""}/create-result`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-200 transition-all cursor-pointer"
            >
              <Trophy size={16} />
              <span>Publish New Result</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, code, category, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>

            {/* Category Dropdown Filter */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setResultFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  resultFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({programmes.length})
              </button>
              <button
                type="button"
                onClick={() => setResultFilter("published")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  resultFilter === "published"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setResultFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  resultFilter === "pending"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-amber-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-amber-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredProgrammes.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200/90 shadow-xs">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
              <Trophy size={28} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No Matching Programmes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or filter options to discover programmes.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: MODERN CARD GRID VIEW (Default as requested)       */}
        {/* ========================================================= */}
        {viewMode === "cards" && filteredProgrammes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map((p) => {
              const isPub = p.IsResultPublished === true || p.IsResulted === true;
              const isExp = expandedProgrammes.has(p.Program_Code);
              const categoryName = meta.getCategoryName(p.Category);
              const groupName = meta.getGroupName(p.Group);
              const venueName = meta.getVenueName(p.Venue);

              return (
                <div
                  key={p.Program_Code}
                  className="bg-white border border-slate-200/90 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Card Content Top */}
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Header: Code + Squad Badge + Result Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                          #{p.Program_Code}
                        </span>
                        {p.is_group_program && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                            Squad
                          </span>
                        )}
                      </div>

                      {/* Result & Frozen Status Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {p.is_freezed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock size={11} className="text-rose-600" />
                            Frozen
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPub
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isPub ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {isPub ? "Published" : "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Programme Title */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2">
                        {p.Program_Title || "Untitled Programme"}
                      </h3>

                      {/* Category & Group Tags (Guaranteed Value, Never UUID) */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {categoryName && (
                          <span className="inline-flex items-center text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                            {categoryName}
                          </span>
                        )}
                        {groupName && (
                          <span className="inline-flex items-center text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                            {groupName}
                          </span>
                        )}
                        {p.is_group_program && (p.max_count_cadidate_group || p.max_count_candidate_group) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                            <Users size={10} className="text-purple-600" /> Max {p.max_count_cadidate_group || p.max_count_candidate_group}/group
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date, Venue & Registrations Matrix */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Calendar size={13} className="text-indigo-500 shrink-0" />
                          <span>Date:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {p.Date || "TBA"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <MapPin size={13} className="text-emerald-500 shrink-0" />
                          <span>Venue:</span>
                        </span>
                        <span className="font-semibold text-slate-800 truncate max-w-44 text-right" title={venueName}>
                          {venueName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/50">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Users size={13} className="text-blue-500 shrink-0" />
                          <span>Candidates:</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {p.Total_Registration || 0} Registered
                        </span>
                      </div>
                    </div>

                    {/* Concluded Podium Preview (if Result is already published) */}
                    {isPub && resultsMap[p.Program_Code] && (
                      <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-black text-amber-900 uppercase tracking-wide">
                          <span className="flex items-center gap-1">
                            <Trophy size={12} className="text-amber-500" /> Standings Preview
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Recorded
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 font-medium space-y-0.5">
                          {(() => {
                            const formatHolder = (val?: string | null) => {
                              if (!val || val === "No Grade" || val === "none") return null;
                              const codes = val.split(",").map((c) => c.trim()).filter(Boolean);
                              if (codes.length === 0) return null;
                              const groupTitle = codes.map((c) => squadsMap[c]).find(Boolean);
                              if (groupTitle) {
                                const names = codes.map((c) => studentsMap[c]?.StudentName || c).join(", ");
                                return `👥 ${groupTitle} (${names})`;
                              }
                              if (codes.length > 1) {
                                return codes.map((c) => studentsMap[c]?.StudentName || c).join(", ");
                              }
                              return studentsMap[codes[0]]?.StudentName || codes[0];
                            };

                            const firstText = formatHolder(resultsMap[p.Program_Code]?.First_Holder);
                            const secondText = formatHolder(resultsMap[p.Program_Code]?.Second_Holder);

                            return (
                              <>
                                {firstText && (
                                  <p className="truncate flex items-center gap-1 text-[11px]">
                                    <span>🥇</span>
                                    <span className="font-bold truncate">{firstText}</span>
                                  </p>
                                )}
                                {secondText && (
                                  <p className="truncate flex items-center gap-1 text-[11px] text-slate-600">
                                    <span>🥈</span>
                                    <span className="truncate">{secondText}</span>
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Action Buttons */}
                  <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {/* BUTTON 1: Registration Toggle (ON / OFF) */}
                      <button
                        type="button"
                        onClick={() => toggleRegistration(p.Program_Code, !!p.IsOpenRegistration)}
                        disabled={togglingReg[p.Program_Code]}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer shadow-2xs active:scale-95 inline-flex items-center gap-1.5 ${
                          p.IsOpenRegistration
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                        title={p.IsOpenRegistration ? "Click to Turn Registration OFF" : "Click to Turn Registration ON"}
                      >
                        {p.IsOpenRegistration ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Reg: ON</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>Reg: OFF</span>
                          </>
                        )}
                      </button>

                      {/* BUTTON 2: Publish / Edit Result Button ("btn to pulic") */}
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/wing-panel/${actWing || wingData?.WingEmail || ""}/create-result?program=${p.Program_Code}`}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                            isPub
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                          }`}
                          title={isPub ? "Edit / Re-publish Results" : "Publish Official Results"}
                        >
                          <Trophy size={13} />
                          <span>{isPub ? "Edit Result" : "Publish Result"}</span>
                        </Link>

                        {/* Details / Candidates Expand Button */}
                        <button
                          type="button"
                          onClick={() => toggleCandidates(p.Program_Code)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                          title={isExp ? "Hide Candidates & Full Details" : "Show Candidates & Full Details"}
                        >
                          {isExp ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Drawer inside Card */}
                    {isExp && (
                      <div className="pt-3 border-t border-slate-200/60 space-y-3">
                        {/* Position Holders Full Display */}
                        {resultsMap[p.Program_Code] && (
                          <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2">
                            <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                              <Award size={12} className="text-amber-500" />
                              Official Award Winners
                            </h4>

                            <div className="space-y-1.5">
                              {resultsMap[p.Program_Code].First_Holder && (
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-50 border border-amber-200/80">
                                  <span className="text-sm">🥇</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {studentsMap[resultsMap[p.Program_Code].First_Holder]?.StudentName || resultsMap[p.Program_Code].First_Holder}
                                    </p>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {resultsMap[p.Program_Code].First_Holder}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {resultsMap[p.Program_Code].Second_Holder && (
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                  <span className="text-sm">🥈</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {studentsMap[resultsMap[p.Program_Code].Second_Holder]?.StudentName || resultsMap[p.Program_Code].Second_Holder}
                                    </p>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {resultsMap[p.Program_Code].Second_Holder}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {resultsMap[p.Program_Code].Third_Holder && (
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-orange-50/60 border border-orange-200">
                                  <span className="text-sm">🥉</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {studentsMap[resultsMap[p.Program_Code].Third_Holder]?.StudentName || resultsMap[p.Program_Code].Third_Holder}
                                    </p>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {resultsMap[p.Program_Code].Third_Holder}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Registered Candidates List */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                            <Users size={12} className="text-blue-500" />
                            Registered Candidates ({candidates[p.Program_Code]?.length || p.Total_Registration || 0})
                          </h4>

                          {loadingCands[p.Program_Code] ? (
                            <div className="text-center py-2 text-[11px] text-slate-400 italic">
                              Loading candidates...
                            </div>
                          ) : candidates[p.Program_Code] && candidates[p.Program_Code].length > 0 ? (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                              {candidates[p.Program_Code].map((c) => (
                                <div
                                  key={c.AddNo}
                                  className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 text-xs"
                                >
                                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
                                    <SafeImage
                                      src={c.Student_Photo_Urls}
                                      alt={c.StudentName}
                                      fallbackCategory="student"
                                      fallbackText={c.StudentName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 text-[11px] truncate">
                                      {c.StudentName}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-mono truncate">
                                      {c.AddNo} • {meta.getClassName(c.Class)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-[11px] text-slate-400">
                              No candidates enrolled yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: TABLE LIST VIEW (Alternate view with full powers)   */}
        {/* ========================================================= */}
        {viewMode === "table" && filteredProgrammes.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Programme Details</th>
                    <th className="px-4 py-4">Category & Group</th>
                    <th className="px-4 py-4">Date & Venue</th>
                    <th className="px-4 py-4 text-center">Registrations</th>
                    <th className="px-4 py-4 text-center">Registration Control</th>
                    <th className="px-4 py-4 text-center">Result Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProgrammes.map((p) => {
                    const isPub = p.IsResultPublished || p.IsResulted;
                    const isExp = expandedProgrammes.has(p.Program_Code);
                    const categoryName = meta.getCategoryName(p.Category);
                    const groupName = meta.getGroupName(p.Group);
                    const venueName = meta.getVenueName(p.Venue);

                    return (
                      <React.Fragment key={p.Program_Code}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span>{p.Program_Title || "Untitled Programme"}</span>
                                {p.is_group_program && (
                                  <span className="text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                                    Squad
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                #{p.Program_Code}
                              </div>
                            </div>
                          </td>

                          {/* Category & Group (Human readable, never UUID) */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              {categoryName && (
                                <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                  {categoryName}
                                </span>
                              )}
                              {groupName && (
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {groupName}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Date & Venue (Human readable, never UUID) */}
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <Calendar size={13} className="text-indigo-500 shrink-0" />
                              <span>{p.Date || "Date TBD"}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin size={12} className="text-emerald-500 shrink-0" />
                              <span className="truncate max-w-40">{venueName}</span>
                            </div>
                          </td>

                          {/* Total Registrations */}
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <Users size={12} className="text-blue-600" />
                              {p.Total_Registration || 0}
                            </span>
                          </td>

                          {/* Registration Control (ON / OFF Toggle) */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRegistration(p.Program_Code, !!p.IsOpenRegistration)}
                              disabled={togglingReg[p.Program_Code]}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer shadow-2xs active:scale-95 inline-flex items-center gap-1.5 ${
                                p.IsOpenRegistration
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title={p.IsOpenRegistration ? "Click to Turn Registration OFF" : "Click to Turn Registration ON"}
                            >
                              {p.IsOpenRegistration ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Reg: ON</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                  <span>Reg: OFF</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Result Status */}
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
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
                              {p.is_freezed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                  <Lock size={9} /> Frozen
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions: Publish button & Toggle */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/wing-panel/${actWing || wingData?.WingEmail || ""}/create-result?program=${p.Program_Code}`}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                  isPub
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                                }`}
                              >
                                <Trophy size={13} />
                                <span>{isPub ? "Edit Result" : "Publish Result"}</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => toggleCandidates(p.Program_Code)}
                                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                                title="Toggle Candidates"
                              >
                                {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExp && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50/70 p-5 border-y border-slate-100 space-y-4">
                              {/* Official Results Showcase with Position Holder Photos */}
                              {resultsMap[p.Program_Code] && (
                                <div className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <Trophy size={14} className="text-amber-500" />
                                      Official Position Holders & Awards
                                    </h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      ✓ Result Concluded
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                    {/* 1st Position */}
                                    {resultsMap[p.Program_Code].First_Holder && (
                                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 border-amber-400 bg-amber-100 shadow-2xs">
                                          <SafeImage
                                            src={studentsMap[resultsMap[p.Program_Code].First_Holder]?.Student_Photo_Urls}
                                            alt="1st Position"
                                            fallbackCategory="student"
                                            fallbackText={studentsMap[resultsMap[p.Program_Code].First_Holder]?.StudentName || resultsMap[p.Program_Code].First_Holder}
                                            className="w-full h-full object-cover"
                                          />
                                          <span className="absolute -bottom-1 -right-1 text-[11px] leading-none bg-white rounded-full px-0.5 shadow-2xs">
                                            🥇
                                          </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[10px] font-extrabold uppercase text-amber-700 block">1st Position</span>
                                          <p className="font-bold text-slate-900 text-xs truncate">
                                            {studentsMap[resultsMap[p.Program_Code].First_Holder]?.StudentName || resultsMap[p.Program_Code].First_Holder}
                                          </p>
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {resultsMap[p.Program_Code].First_Holder}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 2nd Position */}
                                    {resultsMap[p.Program_Code].Second_Holder && (
                                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 border-slate-300 bg-slate-100 shadow-2xs">
                                          <SafeImage
                                            src={studentsMap[resultsMap[p.Program_Code].Second_Holder]?.Student_Photo_Urls}
                                            alt="2nd Position"
                                            fallbackCategory="student"
                                            fallbackText={studentsMap[resultsMap[p.Program_Code].Second_Holder]?.StudentName || resultsMap[p.Program_Code].Second_Holder}
                                            className="w-full h-full object-cover"
                                          />
                                          <span className="absolute -bottom-1 -right-1 text-[11px] leading-none bg-white rounded-full px-0.5 shadow-2xs">
                                            🥈
                                          </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[10px] font-extrabold uppercase text-slate-600 block">2nd Position</span>
                                          <p className="font-bold text-slate-900 text-xs truncate">
                                            {studentsMap[resultsMap[p.Program_Code].Second_Holder]?.StudentName || resultsMap[p.Program_Code].Second_Holder}
                                          </p>
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {resultsMap[p.Program_Code].Second_Holder}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3rd Position */}
                                    {resultsMap[p.Program_Code].Third_Holder && (
                                      <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200 flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 border-amber-600 bg-amber-100 shadow-2xs">
                                          <SafeImage
                                            src={studentsMap[resultsMap[p.Program_Code].Third_Holder]?.Student_Photo_Urls}
                                            alt="3rd Position"
                                            fallbackCategory="student"
                                            fallbackText={studentsMap[resultsMap[p.Program_Code].Third_Holder]?.StudentName || resultsMap[p.Program_Code].Third_Holder}
                                            className="w-full h-full object-cover"
                                          />
                                          <span className="absolute -bottom-1 -right-1 text-[11px] leading-none bg-white rounded-full px-0.5 shadow-2xs">
                                            🥉
                                          </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[10px] font-extrabold uppercase text-orange-800 block">3rd Position</span>
                                          <p className="font-bold text-slate-900 text-xs truncate">
                                            {studentsMap[resultsMap[p.Program_Code].Third_Holder]?.StudentName || resultsMap[p.Program_Code].Third_Holder}
                                          </p>
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {resultsMap[p.Program_Code].Third_Holder}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

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
                                    {candidates[p.Program_Code].map((c, cIdx) => (
                                      <div
                                        key={`${c.AddNo}_${p.Program_Code}_${cIdx}`}
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
                                            {c.AddNo} • {meta.getClassName(c.Class)}
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
          </div>
        )}

        {/* Official Results Export Hub Modal */}
        <ResultExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          programmes={exportableWingProgrammes}
          availableCategories={availableCategoriesList}
          availableClasses={availableClassesList}
          availableWings={[{ code: wingData?.WingCode || "WING", label: wingData?.WingTitle || "My Wing" }]}
          initialCategory={selectedCategory}
          initialWing={wingData?.WingTitle || "My Wing"}
        />

      </div>
    </div>
  );
}
