import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase"; 
import formatResultDate from "./DateFormatConvertor";
import SafeImage from "../lib/SafeImage";
import SquadRegistrationModal from "./SquadRegistrationModal";
import SubmitContentModal from "./SubmitContentModal";
import PrintCandidateSheetModal from "../components/PrintCandidateSheetModal";
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
} from "lucide-react";

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

  // Dedicated Content Submission Modal State
  const [contentModalProgram, setContentModalProgram] = useState<ProgramData | null>(null);

  // Dedicated Print Candidate Sheet State
  const [printCandidateProgram, setPrintCandidateProgram] = useState<ProgramData | null>(null);

  // Fullscreen Image Preview & Download State
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);

  // Category Bonding Resolution for Active Student
  const studentCategory = useMemo(() => {
    if (!studentProfile || !actStn) return null;
    const classId = studentProfile.Stn_Class;
    const className = studentProfile.Class;

    // 1. Match class in meta.classes
    const matchedClass = meta.classes.find(
      (c) =>
        (classId && c.class_id === classId) ||
        (className && (c.standard_name === className || c.class_nick_name === className))
    );
    const resolvedClassId = matchedClass?.class_id || classId;
    const resolvedClassName = matchedClass?.standard_name || className || "Your Class";

    // 2. Find Category that binds to this class
    if (resolvedClassId) {
      const cat = meta.categories.find(
        (c) =>
          c.class_1 === resolvedClassId ||
          c.class_2 === resolvedClassId ||
          c.class_3 === resolvedClassId
      );
      if (cat) {
        return {
          id: cat.category_id,
          title: cat.category_title,
          className: resolvedClassName,
        };
      }
    }

    // 3. Fallback: match category title directly
    if (className) {
      const cat = meta.categories.find(
        (c) => c.category_title.toLowerCase().trim() === className.toLowerCase().trim()
      );
      if (cat) {
        return {
          id: cat.category_id,
          title: cat.category_title,
          className: resolvedClassName,
        };
      }
    }

    return null;
  }, [studentProfile, actStn, meta.classes, meta.categories]);

  const handleDownloadImage = async (url: string, title?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const sanitizedName = (title || "programme-poster").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.setAttribute("download", `${sanitizedName}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback
      window.open(url, "_blank");
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "individual" | "group">("all");
  const [selectedWing, setSelectedWing] = useState<string>("all");

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

      // If student is logged in, fetch student profile and existing submissions
      if (actStn) {
        const profile = await resolveStudentProfile(actStn);
        if (profile?.AddNo) {
          setStudentProfile(profile);
          setStudentAddNo(profile.AddNo);
          const { data: cData } = await SupaBaseFunction
            .from("Content_Table")
            .select("programe_code, content_title, like_count")
            .eq("student_addNo", profile.AddNo);

          if (cData) {
            const map: Record<string, { content_title: string; like_count?: number }> = {};
            cData.forEach((row: any) => {
              if (row.programe_code) {
                map[row.programe_code] = {
                  content_title: row.content_title,
                  like_count: row.like_count,
                };
              }
            });
            setSubmittedContents(map);
          }
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
    if (actStn && studentCategory && program.Category) {
      const progCatTitle = meta.categoryMap[program.Category] || program.Category;
      if (
        progCatTitle &&
        progCatTitle.toLowerCase() !== "general" &&
        progCatTitle.toLowerCase() !== "all"
      ) {
        const isMatch =
          program.Category === studentCategory.id ||
          progCatTitle.toLowerCase().trim() === studentCategory.title.toLowerCase().trim();

        if (!isMatch) {
          alert(
            `⚠️ Category Bonding Enforcement:\nThis programme is strictly for "${progCatTitle}" category students.\nYour current category is "${studentCategory.title}" (${studentCategory.className}).`
          );
          return;
        }
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

  // Filtered Programmes based on search query, format, and wing - ALWAYS LATEST FIRST
  const filteredProgrammes = useMemo(() => {
    const list = programmes.filter((p) => {
      // 1. Format filter
      if (selectedFormat === "individual" && p.is_group_program) return false;
      if (selectedFormat === "group" && !p.is_group_program) return false;

      // 2. Wing filter
      if (selectedWing !== "all" && p.WingCode !== selectedWing) return false;

      // 3. Category Bonding for Student Panel:
      // Display only programmes that match the category of the student
      if (actStn && studentCategory) {
        const progCatId = p.Category;
        const progCatTitle = meta.categoryMap[p.Category || ""] || p.Category;

        // If programme has a specific category (not General/All)
        if (progCatId && progCatTitle && progCatTitle.toLowerCase() !== "general" && progCatTitle.toLowerCase() !== "all") {
          const isMatch =
            progCatId === studentCategory.id ||
            progCatTitle.toLowerCase().trim() === studentCategory.title.toLowerCase().trim();
          if (!isMatch) return false;
        }
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
  }, [programmes, searchQuery, selectedFormat, selectedWing, meta]);

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
        {actStn && studentCategory && (
          <div className="mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 shadow-sm border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <GraduationCap className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-950/40 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400/20">
                    Category Bonding Active
                  </span>
                  <span className="text-xs font-black bg-white text-emerald-800 px-2.5 py-0.5 rounded-full shadow-xs">
                    {studentCategory.title} Category
                  </span>
                </div>
                <p className="text-sm font-bold text-white mt-1">
                  Exclusively displaying upcoming programmes tailored for your category ({studentCategory.className}).
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 bg-emerald-900/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-100 border border-emerald-300/20">
              <Layers size={14} className="text-emerald-300" />
              <span>Registration restricted to {studentCategory.title}</span>
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
              {searchQuery || selectedFormat !== "all" || selectedWing !== "all"
                ? "No matching programmes found for this search/filter criteria."
                : "No open programmes available for registration at the moment."}
            </p>
            {(searchQuery || selectedFormat !== "all" || selectedWing !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFormat("all");
                  setSelectedWing("all");
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
                    className="relative h-48 w-full bg-slate-900 overflow-hidden cursor-pointer group"
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
                    <SafeImage
                      src={program.Program_Poster}
                      alt={program.Program_Title || "Program Presentation Art"}
                      fallbackCategory="programme"
                      fallbackText={program.Program_Title || program.Program_Code}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Hover Hint Overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
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

                      {program.Group && (
                        <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs self-start">
                          {program.Group}
                        </span>
                      )}
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
                        {program.Category && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                            {meta.categoryMap[program.Category] || program.Category}
                          </span>
                        )}
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

                    <button
                      type="button"
                      onClick={() => setPrintCandidateProgram(program)}
                      className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 hover:border-violet-300 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="Print Official A4 Registered Candidate Sheet"
                    >
                      <Printer size={13} /> Print Candidate Sheet (A4)
                    </button>
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
