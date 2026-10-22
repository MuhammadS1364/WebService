import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase"; 
import formatResultDate from "./DateFormatConvertor";
import SafeImage from "../lib/SafeImage";
import SquadRegistrationModal from "./SquadRegistrationModal";
import SubmitContentModal from "./SubmitContentModal";
import PrintCandidateSheetModal from "../components/PrintCandidateSheetModal";
import ProgrammeResultModal from "../components/ProgrammeResultModal";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { resolveStudentProfile } from "../lib/accountResolver";
import {
  Users,
  User,
  Calendar,
  MapPin,
  Search,
  X,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  Maximize2,
  Download,
  GraduationCap,
  Layers,
  Printer,
  Trophy,
} from "lucide-react";
import { downloadImageFullQuality } from "../lib/imgbbService";

interface ProgramData {
  Program_Code: string;
  Program_Title: string | null;
  Program_Poster: string | null;
  Group: string | null;
  WingCode: string | null;
  Category: string | null;
  AccademicYear: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null;
  Venue: string | null;
  IsApproved: boolean;
  IsResulted: boolean;
  IsOpenRegistration: boolean;
  is_group_program?: boolean;
  isContentRequired?: boolean;
  ContentSubmition_deadLine?: string | null;
}

const isUuid = (val: string | null | undefined): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

export default function ProgrammesRegistrationCard() {
  const { actStn } = useParams<{ actStn: string }>();
  const navigate = useNavigate();
  const meta = useProgrammeMeta();
  
  const [programmes, setProgrammes] = useState<ProgramData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [studentAddNo, setStudentAddNo] = useState<string | null>(null);
  const [submittedContents, setSubmittedContents] = useState<Record<string, { content_title: string; like_count?: number }>>({});
  const [registeredPrograms, setRegisteredPrograms] = useState<Record<string, { isRegistered: boolean; squadTitle?: string }>>({});

  // Group squad modal state
  const [squadModal, setSquadModal] = useState<{
    isOpen: boolean;
    programCode: string;
    programTitle: string;
  }>({
    isOpen: false,
    programCode: "",
    programTitle: "",
  });

  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    program: ProgramData | null;
  }>({
    isOpen: false,
    program: null,
  });

  // Dedicated Content Submission Modal State
  const [contentModalProgram, setContentModalProgram] = useState<ProgramData | null>(null);

  // Dedicated Print Candidate Sheet State (Only Admin and Wing programme manager authorized)
  const [printCandidateProgram, setPrintCandidateProgram] = useState<ProgramData | null>(null);
  const [canPrintSheet, setCanPrintSheet] = useState<boolean>(false);

  useEffect(() => {
    const checkRole = async () => {
      if (actStn) {
        setCanPrintSheet(false);
        return;
      }
      try {
        const cachedWing = localStorage.getItem("cached_wing_profile");
        if (cachedWing) {
          setCanPrintSheet(true);
          return;
        }
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const role = (parsed.role || parsed.UserRole || "").toLowerCase();
          if (role === "admin" || role === "wing" || role === "manager" || role === "program manager") {
            setCanPrintSheet(true);
            return;
          }
          if (parsed.UserEmail) {
            const { data: u } = await SupaBaseFunction
              .from("UserTable")
              .select("UserRole")
              .ilike("UserEmail", parsed.UserEmail)
              .maybeSingle();
            if (u?.UserRole === "Admin" || u?.UserRole === "Wing") {
              setCanPrintSheet(true);
              return;
            }
          }
        }
        setCanPrintSheet(false);
      } catch {
        setCanPrintSheet(false);
      }
    };
    checkRole();
  }, [actStn]);

  // Fullscreen Image Preview & Download State
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);

  // Category Bonding Resolution for Active Student (maps student class to ALL matching categories)
  const studentClassInfo = useMemo(() => {
    if (!studentProfile || !actStn) return null;
    const rawClassId = (studentProfile as any).Stn_Class || studentProfile.Class;
    const rawClassName = studentProfile.Class;

    // 1. Match class in meta.classes
    const matchedClass = meta.classes.find(
      (c) =>
        (rawClassId && (c.class_id === rawClassId || c.standard_name === rawClassId || c.class_nick_name === rawClassId)) ||
        (rawClassName && (c.standard_name === rawClassName || c.class_nick_name === rawClassName))
    );

    const resolvedClassId = matchedClass?.class_id || (rawClassId && isUuid(rawClassId) ? rawClassId : "");
    const standardName = matchedClass?.standard_name || rawClassName || "Your Class";
    const nickName = matchedClass?.class_nick_name || "";
    const displayName = nickName && standardName ? `${standardName} (${nickName})` : (standardName || nickName);

    // 2. Find ALL Categories in Our_Category where class_1, class_2, or class_3 is this class
    const matchingCategories = meta.categories.filter((cat) => {
      if (cat.is_active === false) return false;
      if (!resolvedClassId) return false;
      return (
        cat.class_1 === resolvedClassId ||
        cat.class_2 === resolvedClassId ||
        cat.class_3 === resolvedClassId
      );
    });

    // 3. Collect General Categories (no class restriction or title contains General / All)
    const generalCategories = meta.categories.filter((cat) => {
      const title = (cat.category_title || "").toLowerCase();
      const hasNoClassRestrictions = !cat.class_1 && !cat.class_2 && !cat.class_3;
      return hasNoClassRestrictions || title.includes("general") || title.includes("all classes") || title === "all";
    });

    const matchingCategoryIds = new Set(matchingCategories.map((c) => c.category_id));
    const generalCategoryIds = new Set(generalCategories.map((c) => c.category_id));

    return {
      resolvedClassId,
      standardName,
      nickName,
      displayName,
      matchingCategories,
      generalCategories,
      matchingCategoryIds,
      generalCategoryIds,
    };
  }, [studentProfile, actStn, meta.classes, meta.categories]);

  // Helper to determine if a programme is eligible for the logged-in student
  const isProgrammeEligible = useCallback(
    (progCatIdOrTitle?: string | null): boolean => {
      if (!actStn || !studentClassInfo) return true;

      // 1. No category assigned -> Open to all classes
      if (!progCatIdOrTitle) return true;
      const cleanProgCat = progCatIdOrTitle.trim();
      if (!cleanProgCat) return true;

      // 2. General / Open categories
      const catTitle = (meta.categoryMap[cleanProgCat] || cleanProgCat).toLowerCase();
      if (
        studentClassInfo.generalCategoryIds.has(cleanProgCat) ||
        catTitle.includes("general") ||
        catTitle === "all" ||
        catTitle.includes("all classes") ||
        catTitle.includes("open")
      ) {
        return true;
      }

      // 3. Matches one of student's bound category IDs
      if (studentClassInfo.matchingCategoryIds.has(cleanProgCat)) {
        return true;
      }

      // 4. By category title matching
      for (const cat of studentClassInfo.matchingCategories) {
        const cTitle = (cat.category_title || "").toLowerCase().trim();
        if (
          cat.category_id === cleanProgCat ||
          cTitle === cleanProgCat.toLowerCase() ||
          cTitle === catTitle
        ) {
          return true;
        }
      }

      // 5. Look up target category directly in meta.categories
      const targetCat = meta.categories.find(
        (c) =>
          c.category_id === cleanProgCat ||
          (c.category_title && c.category_title.toLowerCase().trim() === catTitle)
      );
      if (targetCat) {
        if (!targetCat.class_1 && !targetCat.class_2 && !targetCat.class_3) return true;
        if (
          studentClassInfo.resolvedClassId &&
          (targetCat.class_1 === studentClassInfo.resolvedClassId ||
            targetCat.class_2 === studentClassInfo.resolvedClassId ||
            targetCat.class_3 === studentClassInfo.resolvedClassId)
        ) {
          return true;
        }
      }

      return false;
    },
    [actStn, studentClassInfo, meta.categoryMap, meta.categories]
  );

  const handleDownloadImage = async (url: string, title?: string) => {
    await downloadImageFullQuality(url, title);
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "individual" | "group">("all");
  const [selectedWing, setSelectedWing] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const fetchProgrammes = async () => {
    try {
      setIsLoading(true);
      // Fetch programmes ordered by Date descending (most latest at top)
      const { data, error: fetchError } = await SupaBaseFunction
        .from('ProgrammesBox')
        .select('*')
        .eq('IsConducted', false)
        .eq("IsApproved", true)
        .order('Date', { ascending: false }); 

      if (fetchError) throw fetchError;
      setProgrammes((data as ProgramData[]) || []);

      // If student is logged in, fetch student profile, registered events, and existing submissions
      if (actStn) {
        const profile = await resolveStudentProfile(actStn);
        if (profile?.AddNo) {
          setStudentProfile(profile);
          setStudentAddNo(profile.AddNo);

          // 1. Check which programmes this student is directly registered for
          const [cData, candRegs, userSquadsRes] = await Promise.all([
            SupaBaseFunction
              .from("Content_Table")
              .select("programe_code, content_title, like_count")
              .eq("student_addNo", profile.AddNo),
            SupaBaseFunction
              .from("CandidateRegistrationTable")
              .select("Program_Code, squad_uuid")
              .in("Candidate_Code", [profile.AddNo, profile.AddNo.trim().toUpperCase(), profile.AddNo.trim().toLowerCase()]),
            SupaBaseFunction
              .from("SquadMate")
              .select("squad_id, squad_title, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
              .eq("is_active", true),
          ]);

          if (cData.data) {
            const map: Record<string, { content_title: string; like_count?: number }> = {};
            cData.data.forEach((row: any) => {
              if (row.programe_code) {
                map[row.programe_code] = {
                  content_title: row.content_title,
                  like_count: row.like_count,
                };
              }
            });
            setSubmittedContents(map);
          }

          const regMap: Record<string, { isRegistered: boolean; squadTitle?: string }> = {};
          (candRegs.data || []).forEach((row: any) => {
            if (row.Program_Code) {
              regMap[row.Program_Code] = { isRegistered: true };
            }
          });

          // 2. Check if any squads belonging to this student are registered
          const userAddNoUpper = profile.AddNo.trim().toUpperCase();
          const mySquads = (userSquadsRes.data || []).filter((sq: any) => {
            return [
              sq.member1_uuid,
              sq.member2_uuid,
              sq.member3_uuid,
              sq.member4_uuid,
              sq.member5_uuid,
              sq.member6_uuid,
              sq.member7_uuid,
            ].some((m) => m && m.trim().toUpperCase() === userAddNoUpper);
          });

          if (mySquads.length > 0) {
            const squadIds = mySquads.map((s: any) => s.squad_id);
            const squadTitleById: Record<string, string> = {};
            mySquads.forEach((s: any) => {
              squadTitleById[s.squad_id] = s.squad_title;
            });

            const { data: squadRegRows } = await SupaBaseFunction
              .from("CandidateRegistrationTable")
              .select("Program_Code, squad_uuid")
              .in("squad_uuid", squadIds);

            (squadRegRows || []).forEach((row: any) => {
              if (row.Program_Code && row.squad_uuid) {
                regMap[row.Program_Code] = {
                  isRegistered: true,
                  squadTitle: squadTitleById[row.squad_uuid] || "Squad Team",
                };
              }
            });
          }

          setRegisteredPrograms(regMap);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected data fetching anomaly occurred.";
      console.error("Fetch Error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammes();
  }, [actStn]);

  const handleRegisterClick = (program: ProgramData) => {
    if (!program.IsOpenRegistration) return;

    // Strict Category Bonding Enforcement
    if (actStn && studentClassInfo && program.Category) {
      if (!isProgrammeEligible(program.Category)) {
        const progCatTitle = meta.categoryMap[program.Category] || program.Category;
        const eligibleCatTitles = studentClassInfo.matchingCategories
          .map((c) => c.category_title)
          .join(", ");
        alert(
          `⚠️ Category Restriction:\nThis programme is designated for "${progCatTitle}".\nYour class (${studentClassInfo.displayName}) is eligible for: ${
            eligibleCatTitles || "General (All Classes)"
          }.`
        );
        return;
      }
    }

    if (program.is_group_program) {
      // Group Programme: Suggest forming a group and open squad registration
      setSquadModal({
        isOpen: true,
        programCode: program.Program_Code,
        programTitle: program.Program_Title || program.Program_Code,
      });
    } else {
      // Individual Programme: Navigate to candidate registration
      if (actStn) {
        navigate(`/student-panel/${actStn}/candidate-registration/${program.Program_Code}`);
      } else {
        navigate(`/login`);
      }
    }
  };

  // Open Content Submission Modal
  const handleOpenContentModal = (program: ProgramData) => {
    if (!actStn) {
      navigate("/login");
      return;
    }
    setContentModalProgram(program);
  };

  // Categories available for filtering in the dropdown
  const availableCategories = useMemo(() => {
    if (actStn && studentClassInfo) {
      const list = [...studentClassInfo.matchingCategories];
      studentClassInfo.generalCategories.forEach((g) => {
        if (!list.some((c) => c.category_id === g.category_id)) {
          list.push(g);
        }
      });
      return list;
    }
    return meta.categories.filter((c) => c.is_active !== false);
  }, [actStn, studentClassInfo, meta.categories]);

  // Filtered Programmes based on search query, format, wing, and category
  const filteredProgrammes = useMemo(() => {
    const list = programmes.filter((p) => {
      // 1. Format filter
      if (selectedFormat === "individual" && p.is_group_program) return false;
      if (selectedFormat === "group" && !p.is_group_program) return false;

      // 2. Wing filter
      if (selectedWing !== "all" && p.WingCode !== selectedWing) return false;

      // 3. Category Bonding for Student Panel:
      // Display all programmes where the student's class is mapped to the category or is open/general
      if (actStn && studentClassInfo) {
        if (!isProgrammeEligible(p.Category)) return false;
      }

      // 3b. Category Dropdown Filter:
      if (selectedCategory !== "all") {
        const pCat = (p.Category || "").trim();
        const pTitle = (meta.categoryMap[pCat] || pCat).toLowerCase().trim();
        const selObj = meta.categories.find((c) => c.category_id === selectedCategory);
        const selTitle = selObj ? selObj.category_title.toLowerCase().trim() : selectedCategory.toLowerCase().trim();

        const matches = pCat === selectedCategory || pTitle === selTitle;
        if (!matches) return false;
      }

      // 4. Search query matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const code = (p.Program_Code || "").toLowerCase();
      const title = (p.Program_Title || "").toLowerCase();
      const desc = (p.Description || "").toLowerCase();
      const group = (p.Group || "").toLowerCase();
      const wing = (p.WingCode || "").toLowerCase();
      const wingName = (meta.wingMap[p.WingCode || ""] || "").toLowerCase();
      const venue = (meta.venueMap[p.Venue || ""] || p.Venue || "").toLowerCase();

      return (
        code.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        group.includes(q) ||
        wing.includes(q) ||
        wingName.includes(q) ||
        venue.includes(q)
      );
    });

    // Sort: Latest events first (most latest date at the top, down to oldest)
    return list.sort((a, b) => {
      if (!a.Date && !b.Date) return 0;
      if (!a.Date) return 1;
      if (!b.Date) return -1;
      return new Date(b.Date).getTime() - new Date(a.Date).getTime();
    });
  }, [programmes, searchQuery, selectedFormat, selectedWing, selectedCategory, isProgrammeEligible, actStn, studentClassInfo, meta]);

  const uniqueWings = useMemo(() => {
    const list = Array.from(new Set(programmes.map((p) => p.WingCode).filter(Boolean))) as string[];
    return list.sort();
  }, [programmes]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500 font-bold">Error: {error}</div>;
  }

  return (
    <div className="md:p-5 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Upcoming Programmes
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Explore individual events and group competitions open for candidate registration (ordered latest first).
            </p>
          </div>

          {actStn && (
            <button
              onClick={() => navigate(`/student-panel/${actStn}/create-group`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer self-start"
            >
              <Users size={15} /> Form / Manage Squad
            </button>
          )}
        </div>

        {/* CATEGORY BONDING ACTIVE BANNER (FOR LOGGED-IN STUDENTS) */}
        {actStn && studentClassInfo && (
          <div className="mb-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white rounded-3xl p-5 shadow-sm border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20 mt-0.5">
                <GraduationCap className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-950/40 text-emerald-200 px-2.5 py-0.5 rounded-md border border-emerald-400/20">
                    Category Bonding Active
                  </span>
                  <span className="text-xs font-black bg-white text-emerald-900 px-3 py-0.5 rounded-full shadow-xs">
                    Class: {studentClassInfo.displayName}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mt-1">
                  Displaying all programmes tailored for {studentClassInfo.displayName}, covering all matching institutional categories & general events.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] font-bold text-emerald-200">Your Categories:</span>
                  {studentClassInfo.matchingCategories.map((c) => (
                    <span
                      key={c.category_id}
                      className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px] border border-white/20 backdrop-blur-xs"
                    >
                      {c.category_title}
                    </span>
                  ))}
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-100 font-semibold text-[11px] border border-white/10">
                    + General (All Classes)
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 bg-emerald-950/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-100 border border-emerald-300/20 self-start md:self-center">
              <Layers size={14} className="text-emerald-300" />
              <span>{studentClassInfo.matchingCategories.length} Categories Mapped</span>
            </div>
          </div>
        )}

        {/* --- SEARCH & QUICK FILTER BAR --- */}
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Real-time Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search by programme code, title, wing, group or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Format Tabs (All / Individual / Group) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedFormat("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedFormat === "all" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({programmes.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("individual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                selectedFormat === "individual" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User size={12} /> Individual
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("group")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                selectedFormat === "group" ? "bg-white text-purple-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={12} /> Group
            </button>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div className="shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-auto px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">
                  {actStn && studentClassInfo ? "All My Eligible Categories" : "All Categories"}
                </option>
                {availableCategories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Wing Filter */}
          {uniqueWings.length > 0 && (
            <div className="shrink-0">
              <select
                value={selectedWing}
                onChange={(e) => setSelectedWing(e.target.value)}
                className="w-full md:w-auto px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Wings</option>
                {uniqueWings.map((w) => (
                  <option key={w} value={w}>
                    {meta.wingMap[w] || w}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {filteredProgrammes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-500 font-semibold">
              {searchQuery || selectedFormat !== "all" || selectedWing !== "all" || selectedCategory !== "all"
                ? "No matching programmes found for this search/filter criteria."
                : "No open programmes available for registration at the moment."}
            </p>
            {(searchQuery || selectedFormat !== "all" || selectedWing !== "all" || selectedCategory !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFormat("all");
                  setSelectedWing("all");
                  setSelectedCategory("all");
                }}
                className="mt-3 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map((program) => {
              const isGroup = Boolean(program.is_group_program);
              const isContentReq = Boolean(program.isContentRequired);
              const submission = submittedContents[program.Program_Code];
              const todayStr = new Date().toISOString().split("T")[0];
              const isDeadlinePassed = program.ContentSubmition_deadLine
                ? todayStr > program.ContentSubmition_deadLine
                : false;

              return (
                <div 
                  key={program.Program_Code} 
                  className="bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* --- Image Section with Click-to-Preview and Download --- */}
                  <div 
                    className="relative h-48 w-full bg-slate-950 overflow-hidden cursor-pointer group flex items-center justify-center"
                    onClick={() => {
                      if (program.Program_Poster) {
                        setFullscreenImage({
                          url: program.Program_Poster,
                          title: program.Program_Title || program.Program_Code,
                        });
                      }
                    }}
                    title="Click to view full poster & download"
                  >
                    {program.Program_Poster && (
                      <img
                        src={program.Program_Poster}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover filter blur-md scale-110 opacity-30 select-none pointer-events-none"
                      />
                    )}
                    <SafeImage
                      src={program.Program_Poster}
                      alt={program.Program_Title || "Program Presentation Art"}
                      fallbackCategory="programme"
                      fallbackText={program.Program_Title || program.Program_Code}
                      className="relative z-1 max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    />

                    {/* Hover Hint Overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-2">
                      <div className="bg-black/70 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs shadow-lg">
                        <Maximize2 size={13} />
                        <span>View & Download</span>
                      </div>
                    </div>

                    {/* Format Badge: Group vs Individual Event */}
                    <div 
                      className="absolute top-3 left-3 z-10 flex flex-col gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-md backdrop-blur-md ${
                        isGroup 
                          ? "bg-purple-600/90 text-white border border-purple-400/30"
                          : "bg-blue-600/90 text-white border border-blue-400/30"
                      }`}>
                        {isGroup ? <Users size={12} /> : <User size={12} />}
                        {isGroup ? "Group / Squad Event" : "Individual Event"}
                      </span>

                      {(() => {
                        const grpName = program.Group ? (meta.groupMap[program.Group] || (!isUuid(program.Group) ? program.Group : "")) : "";
                        return grpName && !isUuid(grpName) ? (
                          <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs self-start">
                            {grpName}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Registration Status Pill */}
                    <div 
                      className="absolute top-3 right-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-md ${
                        program.IsOpenRegistration 
                          ? "bg-emerald-500 text-white" 
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {program.IsOpenRegistration ? "Reg Open" : "Closed"}
                      </span>
                    </div>
                  </div>

                  {/* --- Body Section --- */}
                  <div className="p-5 flex flex-col gap-3 grow">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-indigo-600">
                          {program.Program_Code}
                        </span>
                        {program.WingCode && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                            {meta.wingMap[program.WingCode] || program.WingCode}
                          </span>
                        )}
                        {(() => {
                          const catName = program.Category ? (meta.categoryMap[program.Category] || (!isUuid(program.Category) ? program.Category : "")) : "";
                          return catName && !isUuid(catName) ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                              {catName}
                            </span>
                          ) : null;
                        })()}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                        {program.Program_Title || "Untitled Program"}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {program.Description || "No detailed registration description supplied."}
                    </p>

                    {/* Content Registration Required Notification & Action */}
                    {isContentReq && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <FileText size={13} className="text-amber-600 shrink-0" />
                            Content Submission Required
                          </span>
                          {program.ContentSubmition_deadLine && (
                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                              <Clock size={11} /> Due: {program.ContentSubmition_deadLine}
                            </span>
                          )}
                        </div>

                        {submission ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white p-2 rounded-xl border border-emerald-200">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            <span className="truncate">Submitted: {submission.content_title}</span>
                          </div>
                        ) : isDeadlinePassed ? (
                          <p className="text-[11px] text-amber-800 bg-white/70 p-1.5 rounded-lg border border-amber-200 text-center font-medium">
                            Submission deadline passed
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenContentModal(program)}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <Send size={13} />
                            <span>Submit Your Content</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Date & Venue Box */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs mt-auto">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar size={14} className="text-indigo-500 shrink-0" />
                        <span className="font-semibold truncate">{formatResultDate(program.Date) || "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin size={14} className="text-rose-500 shrink-0" />
                        <span className="font-semibold truncate" title={meta.venueMap[program.Venue || ""] || program.Venue || "To Be Announced"}>
                          {meta.venueMap[program.Venue || ""] || program.Venue || "TBA"}
                        </span>
                      </div>
                    </div>

                    {/* Format Suggestion Banner if Group */}
                    {isGroup && (
                      <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-[11px] text-purple-900 flex items-center gap-2">
                        <Users size={14} className="text-purple-600 shrink-0" />
                        <span>Form or select a group squad to register all team members together.</span>
                      </div>
                    )}
                  </div>

                  {/* --- Footer Action Buttons --- */}
                  <div className="px-5 pb-5 pt-1 flex flex-col gap-2">
                    {registeredPrograms[program.Program_Code]?.isRegistered ? (
                      <div className="w-full py-3 px-3 rounded-2xl font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200/90 flex items-center justify-center gap-2 shadow-2xs">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>
                          Already Registered{" "}
                          {registeredPrograms[program.Program_Code]?.squadTitle
                            ? `(${registeredPrograms[program.Program_Code]?.squadTitle})`
                            : isGroup
                            ? "(Squad)"
                            : ""}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegisterClick(program)}
                        disabled={!program.IsOpenRegistration}
                        className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                          !program.IsOpenRegistration
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : isGroup
                            ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 active:scale-[0.98]"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                        }`}
                      >
                        {isGroup ? (
                          <>
                            <Users size={15} />
                            {program.IsOpenRegistration ? "Register Group / Squad" : "Registration Closed"}
                          </>
                        ) : (
                          <>
                            <User size={15} />
                            {program.IsOpenRegistration ? "Register Candidate" : "Registration Closed"}
                          </>
                        )}
                      </button>
                    )}

                    {/* Show Result Button if result is published */}
                    {(program.IsResulted || (program as any).IsResultPublished) && (
                      <button
                        type="button"
                        onClick={() => setResultModal({ isOpen: true, program })}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-[0.99]"
                      >
                        <Trophy size={14} className="text-yellow-200" /> Show Result
                      </button>
                    )}

                    {canPrintSheet && (
                      <button
                        type="button"
                        onClick={() => setPrintCandidateProgram(program)}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 hover:border-violet-300 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                        title="Print Official A4 Registered Candidate Sheet"
                      >
                        <Printer size={13} /> Print Candidate Sheet (A4)
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Squad Registration Modal for Group Events */}
        {squadModal.isOpen && (
          <SquadRegistrationModal
            isOpen={squadModal.isOpen}
            programCode={squadModal.programCode}
            programTitle={squadModal.programTitle}
            onClose={() => setSquadModal({ isOpen: false, programCode: "", programTitle: "" })}
            onSuccess={() => {
              fetchProgrammes();
            }}
          />
        )}

        {/* Programme Result Modal */}
        {resultModal.isOpen && resultModal.program && (
          <ProgrammeResultModal
            isOpen={resultModal.isOpen}
            onClose={() => setResultModal({ isOpen: false, program: null })}
            programCode={resultModal.program.Program_Code}
            programTitle={resultModal.program.Program_Title}
            programDate={resultModal.program.Date}
            programVenue={resultModal.program.Venue}
            programPoster={resultModal.program.Program_Poster}
            wingCode={resultModal.program.WingCode}
          />
        )}

        {/* Modal: Submit Content for Required Programmes (Content_Table with docx/pdf/tsx upload & paste fallback) */}
        {contentModalProgram && (
          <SubmitContentModal
            isOpen={Boolean(contentModalProgram)}
            onClose={() => setContentModalProgram(null)}
            onSuccess={(submission) => {
              setSubmittedContents((prev) => ({
                ...prev,
                [submission.programe_code]: {
                  content_title: submission.content_title,
                  like_count: 0,
                },
              }));
            }}
            program={contentModalProgram}
            studentAddNo={studentAddNo || ""}
          />
        )}
        {/* Fullscreen Image Preview & Download Modal */}
        {fullscreenImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            {/* Close Button */}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }} 
              className="absolute top-6 right-6 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer z-10"
              title="Close Preview"
            >
              <X size={24} />
            </button>

            {/* Download Button */}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownloadImage(fullscreenImage.url, fullscreenImage.title); }} 
              className="absolute top-6 right-20 text-white flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer z-10"
              title="Download Poster"
            >
              <Download size={18} /> 
              <span>Download Poster</span>
            </button>

            {/* Image Container */}
            <div 
              className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={fullscreenImage.url} 
                alt={fullscreenImage.title} 
                className="max-h-[80vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-white/10" 
              />
              {fullscreenImage.title && (
                <p className="text-white text-xs sm:text-sm font-semibold mt-3 text-center truncate max-w-xl">
                  {fullscreenImage.title}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Print Candidate Sheet Modal (A4) */}
        <PrintCandidateSheetModal
          isOpen={Boolean(printCandidateProgram)}
          programCode={printCandidateProgram?.Program_Code || ""}
          initialProgramTitle={printCandidateProgram?.Program_Title || ""}
          onClose={() => setPrintCandidateProgram(null)}
        />
      </div>
    </div>
  );
}
