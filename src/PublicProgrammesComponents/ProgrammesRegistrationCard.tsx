import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase"; 
import formatResultDate from "./DateFormatConvertor";
import SafeImage from "../lib/SafeImage";
import SquadRegistrationModal from "./SquadRegistrationModal";
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
  AlertTriangle,
  Loader2
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

  // Content Submission Modal State
  const [contentModal, setContentModal] = useState<{
    isOpen: boolean;
    program: ProgramData | null;
    contentTitle: string;
    submitting: boolean;
    error: string | null;
    success: string | null;
  }>({
    isOpen: false,
    program: null,
    contentTitle: "",
    submitting: false,
    error: null,
    success: null,
  });

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
        const studentProfile = await resolveStudentProfile(actStn);
        if (studentProfile?.AddNo) {
          setStudentAddNo(studentProfile.AddNo);
          const { data: cData } = await SupaBaseFunction
            .from("Content_Table")
            .select("programe_code, content_title, like_count")
            .eq("student_addNo", studentProfile.AddNo);

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
    setContentModal({
      isOpen: true,
      program,
      contentTitle: "",
      submitting: false,
      error: null,
      success: null,
    });
  };

  // Submit Content
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentModal.program) return;
    if (!studentAddNo) {
      setContentModal(prev => ({ ...prev, error: "Please log in to submit your content." }));
      return;
    }
    if (!contentModal.contentTitle.trim()) {
      setContentModal(prev => ({ ...prev, error: "Please provide your content / essay title." }));
      return;
    }

    // Check deadline
    if (contentModal.program.ContentSubmition_deadLine) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (todayStr > contentModal.program.ContentSubmition_deadLine) {
        setContentModal(prev => ({
          ...prev,
          error: "The deadline for content submission has expired.",
        }));
        return;
      }
    }

    try {
      setContentModal(prev => ({ ...prev, submitting: true, error: null }));
      const payload = {
        content_title: contentModal.contentTitle.trim(),
        programe_code: contentModal.program.Program_Code,
        student_addNo: studentAddNo,
        like_count: 0,
      };

      const { error: insertError } = await SupaBaseFunction
        .from("Content_Table")
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;

      setSubmittedContents(prev => ({
        ...prev,
        [contentModal.program!.Program_Code]: {
          content_title: contentModal.contentTitle.trim(),
          like_count: 0,
        },
      }));

      setContentModal(prev => ({
        ...prev,
        submitting: false,
        success: "Content submitted successfully!",
      }));

      setTimeout(() => {
        setContentModal({
          isOpen: false,
          program: null,
          contentTitle: "",
          submitting: false,
          error: null,
          success: null,
        });
      }, 1500);
    } catch (err: any) {
      setContentModal(prev => ({
        ...prev,
        submitting: false,
        error: err.message || "Failed submitting content.",
      }));
    }
  };

  // Filtered Programmes based on search query, format, and wing - ALWAYS LATEST FIRST
  const filteredProgrammes = useMemo(() => {
    const list = programmes.filter((p) => {
      // 1. Format filter
      if (selectedFormat === "individual" && p.is_group_program) return false;
      if (selectedFormat === "group" && !p.is_group_program) return false;

      // 2. Wing filter
      if (selectedWing !== "all" && p.WingCode !== selectedWing) return false;

      // 3. Search query matching
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
                  {/* --- Image Section with SafeImage Dual-Layer Fallback --- */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    <SafeImage
                      src={program.Program_Poster}
                      alt={program.Program_Title || "Program Presentation Art"}
                      fallbackCategory="programme"
                      fallbackText={program.Program_Title || program.Program_Code}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />

                    {/* Format Badge: Group vs Individual Event */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
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
                    <div className="absolute top-3 right-3 z-10">
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

                  {/* --- Footer Action Button --- */}
                  <div className="px-5 pb-5 pt-1">
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

        {/* Modal: Submit Content for Required Programmes */}
        {contentModal.isOpen && contentModal.program && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Submit Event Content</h3>
                    <span className="text-[11px] font-mono font-bold text-indigo-600">
                      #{contentModal.program.Program_Code}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContentModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium">Programme:</p>
                <p className="text-sm font-bold text-slate-900">{contentModal.program.Program_Title}</p>
                {contentModal.program.ContentSubmition_deadLine && (
                  <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                    <Clock size={12} /> Deadline: {contentModal.program.ContentSubmition_deadLine}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmitContent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Content Title / Topic / Submission Abstract
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter your essay title, poem name, speech topic, or submission headline..."
                    value={contentModal.contentTitle}
                    onChange={e => setContentModal(prev => ({ ...prev, contentTitle: e.target.value }))}
                    className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white resize-none"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This work will be registered under your Admission Number and featured in the Public Student Showcase.
                  </p>
                </div>

                {contentModal.error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                    <span>{contentModal.error}</span>
                  </div>
                )}

                {contentModal.success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                    <span>{contentModal.success}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setContentModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={contentModal.submitting}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50"
                  >
                    {contentModal.submitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Submit Content</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
