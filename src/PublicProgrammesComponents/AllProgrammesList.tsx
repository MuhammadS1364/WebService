
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import formatResultDate from "./DateFormatConvertor";
import { exportToExcel } from "../lib/excelService";
import SafeImage from "../lib/SafeImage";
import SquadRegistrationModal from "./SquadRegistrationModal";
import ProgrammeResultModal from "../components/ProgrammeResultModal";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { resolveStudentProfile } from "../lib/accountResolver";
import { Download, Shield, Users, Search, X, Maximize2, Trophy, CheckCircle2, User, BookOpen, ExternalLink, Clock } from "lucide-react";

// 1. Production-grade Schema Type Declarations matching your Supabase row fields
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
  IsResultPublished?: boolean;
  IsOpenRegistration: boolean;
  IsConducted?: boolean;
  is_group_program?: boolean;
  topic_title?: string | null;
  is_topic?: boolean | null;
  drive_link?: string | null;
  Expected_Time?: string | null;
  is_limitation?: boolean | null;
  individual_limit_count?: number | null;
  group_limit_count?: number | null;
}

export default function PublicProgrammesList() {
  const meta = useProgrammeMeta();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [programmes, setProgrammes] = useState<ProgramData[]>([]);
  const [registeredMap, setRegisteredMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Lookup helpers
  const getWingName = (code: string | null) => {
    if (!code) return "General";
    return meta.wingMap[code] || code;
  };

  const getCategoryName = (cat: string | null) => {
    if (!cat) return "";
    return meta.categoryMap[cat] || cat;
  };

  const getVenueName = (ven: string | null) => {
    if (!ven) return "TBA";
    return meta.venueMap[ven] || ven;
  };

  const getAcademicYearName = (year: string | null) => {
    if (!year) return "";
    return meta.academicMap[year] || year;
  };

  // Modal States
  const [squadModal, setSquadModal] = useState<{ isOpen: boolean; code: string; title: string }>({
    isOpen: false,
    code: "",
    title: "",
  });

  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    program: ProgramData | null;
  }>({
    isOpen: false,
    program: null,
  });

  // Fullscreen Image Preview & Download State
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);

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
      window.open(url, "_blank");
    }
  };

  // Fetch and Filter Data Layer - Ensures ALL programmes appear in public view
  useEffect(() => {
    const fetchProgrammes = async () => {
      try {
        setIsLoading(true);
        const { data, error: fetchError } = await SupaBaseFunction
          .from('ProgrammesBox')
          .select('*')
          .order('Date', { ascending: false });

        if (fetchError) throw fetchError;
        setProgrammes((data as ProgramData[]) || []);

        const student = await resolveStudentProfile();
        if (student?.AddNo) {
          setCurrentUser(student);
          const userAddNo = student.AddNo.trim().toUpperCase();
          const [candRegs, userSquadsRes] = await Promise.all([
            SupaBaseFunction
              .from("CandidateRegistrationTable")
              .select("Program_Code")
              .in("Candidate_Code", [student.AddNo, userAddNo, student.AddNo.trim().toLowerCase()]),
            SupaBaseFunction
              .from("SquadMate")
              .select("squad_id, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
              .eq("is_active", true),
          ]);

          const map: Record<string, boolean> = {};
          (candRegs.data || []).forEach((row: any) => {
            if (row.Program_Code) map[row.Program_Code] = true;
          });

          const mySquads = (userSquadsRes.data || []).filter((sq: any) => {
            return [
              sq.member1_uuid, sq.member2_uuid, sq.member3_uuid,
              sq.member4_uuid, sq.member5_uuid, sq.member6_uuid, sq.member7_uuid,
            ].some((m) => m && m.trim().toUpperCase() === userAddNo);
          });

          if (mySquads.length > 0) {
            const squadIds = mySquads.map((s: any) => s.squad_id);
            const { data: squadRegs } = await SupaBaseFunction
              .from("CandidateRegistrationTable")
              .select("Program_Code")
              .in("squad_uuid", squadIds);

            (squadRegs || []).forEach((r: any) => {
              if (r.Program_Code) map[r.Program_Code] = true;
            });
          }

          setRegisteredMap(map);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected data fetching anomaly occurred.";
        console.error("Fetch Error:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgrammes();
  }, []);

  // Filter programmes dynamically
  const displayedProgrammes = useMemo(() => {
    return programmes.filter((prog) => {
      // Search text filter
      const wingText = getWingName(prog.WingCode).toLowerCase();
      const venueText = getVenueName(prog.Venue).toLowerCase();
      const catText = getCategoryName(prog.Category).toLowerCase();
      const acadText = getAcademicYearName(prog.AccademicYear).toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        (prog.Program_Title && prog.Program_Title.toLowerCase().includes(query)) ||
        (prog.Program_Code && prog.Program_Code.toLowerCase().includes(query)) ||
        wingText.includes(query) ||
        venueText.includes(query) ||
        catText.includes(query) ||
        acadText.includes(query) ||
        (prog.Group && prog.Group.toLowerCase().includes(query));

      // Category filter
      const matchesCategory =
        categoryFilter === "All" ||
        prog.Category === categoryFilter ||
        (prog.Category && categoryFilter && meta.categoryMap[prog.Category] === (meta.categoryMap[categoryFilter] || categoryFilter));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "Upcoming") matchesStatus = !prog.IsConducted;
      else if (statusFilter === "Conducted") matchesStatus = Boolean(prog.IsConducted);
      else if (statusFilter === "Squad") matchesStatus = Boolean(prog.is_group_program);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [programmes, searchQuery, categoryFilter, statusFilter, meta.categoryMap, meta.venueMap, meta.wingMap, meta.academicMap]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    programmes.forEach((p) => {
      if (p.Category) set.add(p.Category);
    });
    return Array.from(set);
  }, [programmes]);

  // Export exact data currently displayed
  const handleExportDisplayed = () => {
    if (displayedProgrammes.length === 0) {
      alert("No programmes are currently displayed to export.");
      return;
    }

    const exportRows = displayedProgrammes.map((p) => ({
      "Program Code": p.Program_Code,
      "Program Title": p.Program_Title || "Untitled",
      "Wing": getWingName(p.WingCode),
      "Category": meta.getCategoryName(p.Category, "General Category"),
      "Group": meta.getGroupName(p.Group, "General"),
      "Date": p.Date || "TBA",
      "Venue": meta.getVenueName(p.Venue, "Campus Venue"),
      "Academic Year": p.AccademicYear ? (meta.academicMap[p.AccademicYear] || "Current Cycle") : "Current Cycle",
      "Format": p.is_group_program ? "Squad / Group Event" : "Individual Event",
      "Status": p.IsConducted ? "Conducted" : "Upcoming",
      "Registration": p.IsOpenRegistration ? "Open" : "Closed",
      "Description": p.Description || ""
    }));

    exportToExcel(exportRows, `Programmes_Catalog_${new Date().toISOString().split("T")[0]}.xlsx`, "Programmes");
  };

  // UI States Handling Exception Blockers
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg className="h-10 w-10 animate-spin text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-medium animate-pulse">Programmes are loading...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500 font-bold">Error: {error}</div>;
  }

  return (
    <div className="md:p-5 bg-gray-50 min-h-screen">
      <div className="max-w-300 mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Facilitated Programmes
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Explore all active, scheduled, and conducted events ({displayedProgrammes.length} displayed).
            </p>
          </div>
          <button
            onClick={handleExportDisplayed}
            disabled={displayedProgrammes.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs text-sm font-semibold transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            <Download size={16} /> Export Displayed ({displayedProgrammes.length})
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs mb-8 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search programmes by title, code, wing, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{getCategoryName(c) || c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Formats & Statuses</option>
              <option value="Upcoming">Upcoming Events</option>
              <option value="Conducted">Conducted Events</option>
              <option value="Squad">Squad / Group Events</option>
            </select>
          </div>
        </div>

        {displayedProgrammes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">No programmes match your current filters or search terms.</p>
            <button
              onClick={() => { setSearchQuery(""); setCategoryFilter("All"); setStatusFilter("All"); }}
              className="mt-3 text-sm font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Loop structurally over safe records */}
            {displayedProgrammes.map((program, index) => (

              <div
                key={program.Program_Code || index}
                className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* --- Image Section with Click-to-Preview and Download --- */}
                <div 
                  className="relative h-52 w-full bg-slate-950 overflow-hidden cursor-pointer group"
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
                    <div className="bg-black/75 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs shadow-lg">
                      <Maximize2 size={13} />
                      <span>View & Download</span>
                    </div>
                  </div>

                  {/* Result Published Badge */}
                  {(program.IsResulted || program.IsResultPublished) && (
                    <div 
                      className="absolute top-3 left-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-10 cursor-pointer transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResultModal({ isOpen: true, program });
                      }}
                      title="Official results published. Click to view."
                    >
                      <Trophy size={12} className="text-yellow-200" /> Result Published
                    </div>
                  )}

                  {(() => {
                    const isUuid = (val: string | null | undefined): boolean => {
                      if (!val) return false;
                      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
                    };
                    const grpName = program.Group ? (meta.groupMap[program.Group] || (!isUuid(program.Group) ? program.Group : "")) : "";
                    const hasResultBadge = Boolean(program.IsResulted || program.IsResultPublished);
                    return grpName && !isUuid(grpName) ? (
                      <div 
                        className={`absolute ${hasResultBadge ? "top-11" : "top-3"} left-3 bg-blue-700 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {grpName}
                      </div>
                    ) : null;
                  })()}

                  {program.is_group_program && (
                    <div 
                      className="absolute top-3 right-3 bg-purple-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Users size={12} /> Squad Event
                    </div>
                  )}
                </div>

                {/* --- Body Section --- */}
                <div className="p-5 flex flex-col gap-3.5 grow">
                  {/* Category, Wing & Academic Year Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {program.WingCode && (
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold rounded-lg">
                        {getWingName(program.WingCode)}
                      </span>
                    )}
                    {program.Category && (
                      <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200/80 text-[11px] font-bold rounded-lg">
                        {getCategoryName(program.Category)}
                      </span>
                    )}
                    {program.AccademicYear && (
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200/80 text-[11px] font-bold rounded-lg">
                        {getAcademicYearName(program.AccademicYear)}
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[11px] font-bold text-slate-400">
                      {program.Program_Code}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-snug line-clamp-2">
                      {program.Program_Title || "Untitled Program"}
                    </h2>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {program.Description || "Official tournament and competitive event details."}
                  </p>

                  {/* Common Assigned Topic (if organizer provided) */}
                  {program.is_topic && program.topic_title && (
                    <div className="p-2.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-teal-800 font-extrabold text-[10px] uppercase">
                        <BookOpen size={12} className="text-teal-600 shrink-0" />
                        <span>Official Assigned Topic:</span>
                      </div>
                      <p className="font-extrabold text-teal-950 truncate pl-4">
                        "{program.topic_title}"
                      </p>
                    </div>
                  )}

                  {/* Date, Venue & Expected Time Box */}
                  <div className="space-y-2 mt-auto pt-2">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
                      <div className="flex flex-col border-r border-slate-200 pr-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date</span>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {formatResultDate(program.Date)}
                        </span>
                      </div>
                      <div className="flex flex-col pl-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Venue</span>
                        <span className="text-xs font-black text-slate-900 truncate" title={getVenueName(program.Venue)}>
                          {getVenueName(program.Venue)}
                        </span>
                      </div>
                    </div>

                    {/* Time Slot & Drive Link Pill Grid */}
                    <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                      {program.Expected_Time && meta.expectedTimeMap[program.Expected_Time] ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl">
                          <Clock size={11} className="text-indigo-600" />
                          <span>{meta.expectedTimeMap[program.Expected_Time]}</span>
                        </span>
                      ) : <span />}

                      {program.drive_link && (
                        <a
                          href={program.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl transition shadow-2xs"
                          title="Open syllabus and study materials"
                        >
                          <ExternalLink size={11} /> Study Material
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- Footer Buttons --- */}
                <div className="p-5 pt-0 mt-auto flex flex-col gap-2">
                  {/* If result is published, show the requested Show Result button */}
                  {(program.IsResulted || program.IsResultPublished) && (
                    <button
                      type="button"
                      onClick={() => setResultModal({ isOpen: true, program })}
                      className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.99]"
                    >
                      <Trophy size={14} className="text-yellow-200" /> Show Result
                    </button>
                  )}

                  {registeredMap[program.Program_Code] ? (
                    <div className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Already Registered</span>
                    </div>
                  ) : program.IsOpenRegistration ? (
                    program.is_group_program ? (
                      <button
                        type="button"
                        onClick={() => setSquadModal({ isOpen: true, code: program.Program_Code, title: program.Program_Title || "Program" })}
                        className="w-full py-2.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Shield size={14} /> Join / Form Squad
                      </button>
                    ) : (
                      <Link
                        to={currentUser ? `/student-panel/${currentUser.AddNo}/candidate-registration/${program.Program_Code}` : `/login`}
                        className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center"
                      >
                        <User size={14} /> Register Candidate
                      </Link>
                    )
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold text-center border border-slate-200">
                      Registration Closed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Dialogs */}
        <SquadRegistrationModal
          isOpen={squadModal.isOpen}
          programCode={squadModal.code}
          programTitle={squadModal.title}
          onClose={() => setSquadModal({ isOpen: false, code: "", title: "" })}
        />

        {/* Programme Result Modal (Shows published results & winners podium) */}
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

        {/* Fullscreen Image Preview & Download Modal */}
        {fullscreenImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }} 
              className="absolute top-6 right-6 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer z-10"
              title="Close Preview"
            >
              <X size={24} />
            </button>

            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownloadImage(fullscreenImage.url, fullscreenImage.title); }} 
              className="absolute top-6 right-20 text-white flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer z-10"
              title="Download Poster"
            >
              <Download size={18} /> 
              <span>Download Poster</span>
            </button>

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
      </div>
    </div>
  );
} 
