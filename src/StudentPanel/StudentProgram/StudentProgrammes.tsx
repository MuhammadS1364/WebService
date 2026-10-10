import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
import SafeImage from "../../lib/SafeImage";
import ProgrammeFeedbackModal from "../../PublicProgrammesComponents/ProgrammeFeedbackModal";
import SubmitContentModal from "../../PublicProgrammesComponents/SubmitContentModal";
import TopicRegistrationModal from "../../components/TopicRegistrationModal";
import { resolveStudentProfile } from "../../lib/accountResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import {
  MessageSquare,
  Search,
  X,
  Maximize2,
  Download,
  FileText,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

// 1. Define explicit structures matching your Supabase Database Schemas
interface StudentProfile {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
}

interface CandidateRegistration {
  Program_Code: string;
}

interface ProgramItem {
  Program_Code: string;
  Program_Title: string;
  Program_Poster?: string;
  Description?: string;
  Category: string | null;
  IsConducted: boolean;
  IsResultPublished: boolean;
  Date?: string | null;
  Venue?: string;
  isContentRequired?: boolean;
  ContentSubmition_deadLine?: string | null;
  is_topic_required?: boolean;
}

export default function StudentProgrammes() {
  // Explicitly type dynamic route parameters
  const { actStn } = useParams<{ actStn: string }>(); 
  const meta = useProgrammeMeta();
  
  // 2. Attach clean explicit generics to hooks to wipe out 'never' type-casting bugs
  const [student, setStudent] = useState<StudentProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !localStorage.getItem("cached_student_profile"));
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [submittedContents, setSubmittedContents] = useState<Record<string, { content_title: string }>>({});
  const [submittedTopics, setSubmittedTopics] = useState<Record<string, { topic_title: string; is_approved: boolean }>>({});
  
  // Fullscreen image state
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);

  // Content Submission Modal State
  const [contentModalProgram, setContentModalProgram] = useState<ProgramItem | null>(null);
  // Topic Registration Modal State
  const [topicModalProgram, setTopicModalProgram] = useState<ProgramItem | null>(null);

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
  
  // Filters Layout Context State
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Feedback Modal State for participated programmes
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; code: string; title: string }>({
    isOpen: false,
    code: "",
    title: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchPrograms = async (silent = false) => {
      if (!silent && !student) {
        setLoading(true);
      }
      try {
        // Step 1: Fetch Student profile via robust resolver
        const studentData = await resolveStudentProfile(actStn);
        if (!studentData) throw new Error("Student record not found");
        if (isMounted) {
          setStudent(studentData as StudentProfile);
        }

        // Step 2: Fetch all registered program codes for this student
        const { data: registrations, error: regError } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Program_Code")
          .eq("Candidate_Code", studentData.AddNo);

        if (regError) throw regError;

        const programCodes = (registrations as CandidateRegistration[])?.map((reg) => reg.Program_Code) || [];

        // Step 3: Fetch actual program details
        if (programCodes.length > 0) {
          const { data: programsData, error: progError } = await SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .in("Program_Code", programCodes)
            .order("Date", { ascending: false });
            
          if (progError) throw progError;
          if (isMounted) {
            setPrograms((programsData as ProgramItem[]) || []);
          }

          // Fetch existing content submissions for this student
          const { data: cData } = await SupaBaseFunction
            .from("Content_Table")
            .select("programe_code, content_title")
            .eq("student_addNo", studentData.AddNo);

          if (cData && isMounted) {
            const map: Record<string, { content_title: string }> = {};
            cData.forEach((row: any) => {
              if (row.programe_code) {
                map[row.programe_code] = { content_title: row.content_title || "Submitted Content" };
              }
            });
            setSubmittedContents(map);
          }

          // Fetch existing registered topics for this student (Topics_Box)
          const { data: tData } = await SupaBaseFunction
            .from("Topics_Box")
            .select("program_code, topic_title, is_approved")
            .eq("student_addNo", studentData.AddNo);

          if (tData && isMounted) {
            const topicMap: Record<string, { topic_title: string; is_approved: boolean }> = {};
            tData.forEach((row: any) => {
              if (row.program_code) {
                topicMap[row.program_code] = {
                  topic_title: row.topic_title || "Registered Topic",
                  is_approved: Boolean(row.is_approved),
                };
              }
            });
            setSubmittedTopics(topicMap);
          }
        }
      } catch (error) {
        console.error("Error fetching student programs:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPrograms(Boolean(student));
    return () => {
      isMounted = false;
    };
  }, [actStn]);

  const handleOpenContentModal = (prog: ProgramItem) => {
    setContentModalProgram(prog);
  };

  // Derived tracking calculations
  const conductedCount = programs.filter(p => p.IsConducted).length;
  const upcomingCount = programs.length - conductedCount;
  
  // Prevent run-time assignment crashes by safely matching array conditions
  const categories = ["All", ...new Set(programs.map(p => p.Category).filter((cat): cat is string => Boolean(cat)))];

  // Structural Processing Filters
  const filteredPrograms = useMemo(() => {
    return programs.filter(prog => {
      const matchesCategory = categoryFilter === "All" || prog.Category === categoryFilter;
      let matchesStatus = true;
      
      if (statusFilter === "Upcoming") matchesStatus = !prog.IsConducted;
      if (statusFilter === "Completed") matchesStatus = prog.IsConducted;
      if (statusFilter === "Result Out") matchesStatus = prog.IsResultPublished;

      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (prog.Program_Code || "").toLowerCase();
        const title = (prog.Program_Title || "").toLowerCase();
        const desc = (prog.Description || "").toLowerCase();
        const venue = (meta.venueMap[prog.Venue || ""] || prog.Venue || "").toLowerCase();
        matchesSearch = code.includes(q) || title.includes(q) || desc.includes(q) || venue.includes(q);
      }

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [programs, categoryFilter, statusFilter, searchQuery, meta]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center mt-20 text-gray-500">
        <h2 className="text-2xl font-bold text-gray-700">Student Not Found</h2>
        <p>We couldn't find a profile for this email.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Layout */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Event Portfolio</h1>
            <p className="text-gray-500 mt-2">
              Welcome back, <span className="font-semibold text-blue-600">{student.StudentName}</span>. Here is your activity track record.
            </p>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OverviewClipBox
            BoxTitle="Total Enrolled"
            BoxValue={programs.length}
            variant="blue"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Events Completed"
            BoxValue={conductedCount}
            variant="emerald"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Upcoming Action"
            BoxValue={upcomingCount}
            variant="orange"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            }
          />
        </div>

        {/* Filters Action Control Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
          {/* Real-time Search Box */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search your programmes by title, code (#PRG), description or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-gray-50 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-1">
            <div className="flex space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 overflow-x-auto w-full md:w-auto">
              {["All", "Upcoming", "Completed", "Result Out"].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === status 
                      ? "bg-white text-blue-700 shadow-sm border border-gray-200" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <label htmlFor="category-select" className="text-sm font-medium text-gray-500 whitespace-nowrap">Category:</label>
              <select
                id="category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium cursor-pointer"
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat || "Uncategorized"}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Program Cards Grid Output */}
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
            <h3 className="text-xl font-bold text-gray-700">No Programs Found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((prog) => (
              <div 
                key={prog.Program_Code} 
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div 
                  className="relative h-48 overflow-hidden bg-slate-900 cursor-pointer group/poster"
                  onClick={() => {
                    if (prog.Program_Poster) {
                      setFullscreenImage({
                        url: prog.Program_Poster,
                        title: prog.Program_Title || prog.Program_Code,
                      });
                    }
                  }}
                  title="Click to view full poster & download"
                >
                  <SafeImage 
                    src={prog.Program_Poster} 
                    alt={prog.Program_Title}
                    fallbackCategory="programme"
                    fallbackText={prog.Program_Title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/poster:scale-105" 
                  />
                  {/* Hover Hint Overlay */}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="bg-black/75 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs shadow-lg">
                      <Maximize2 size={13} />
                      <span>View & Download</span>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    {prog.IsResultPublished && <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">🏆 Result Out</span>}
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-lg ${prog.IsConducted ? "bg-emerald-500/90 text-white" : "bg-amber-400/90 text-amber-950"}`}>
                      {prog.IsConducted ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {meta.categoryMap[prog.Category || ""] || prog.Category || "Event"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {prog.Program_Code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">{prog.Program_Title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{prog.Description || "Registered participant."}</p>

                  {/* Content Submission Required Section */}
                  {prog.isContentRequired && (
                    <div className="mb-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <FileText size={13} className="text-amber-600 shrink-0" />
                          Content Submission Required
                        </span>
                        {prog.ContentSubmition_deadLine && (
                          <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                            <Clock size={11} /> Due: {prog.ContentSubmition_deadLine}
                          </span>
                        )}
                      </div>

                      {submittedContents[prog.Program_Code] ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white p-2 rounded-lg border border-emerald-200">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Submitted: {submittedContents[prog.Program_Code].content_title}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenContentModal(prog)}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <Send size={13} />
                          <span>Submit Your Content</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Topic Registration Required Section (Topics_Box) */}
                  {prog.is_topic_required && (
                    <div className="mb-3 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-indigo-600 shrink-0" />
                          Topic Registration Required
                        </span>
                        <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">
                          Topics_Box
                        </span>
                      </div>

                      {submittedTopics[prog.Program_Code] ? (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-indigo-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {submittedTopics[prog.Program_Code].is_approved ? (
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                              <Clock size={14} className="text-amber-500 shrink-0" />
                            )}
                            <span className="font-bold text-slate-800 truncate">
                              {submittedTopics[prog.Program_Code].topic_title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTopicModalProgram(prog)}
                            className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTopicModalProgram(prog)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <FileText size={13} />
                          <span>Register Topic & Lyrics</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs font-medium text-gray-500 mb-3">
                    <div>
                      {formatResultDate(prog.Date)}
                    </div>
                    <div>
                      {meta.venueMap[prog.Venue || ""] || prog.Venue || "TBA"}
                    </div>
                  </div>

                  {/* Feedback action: Permitted because this student officially registered/participated in this programme */}
                  <button
                    type="button"
                    onClick={() =>
                      setFeedbackModal({
                        isOpen: true,
                        code: prog.Program_Code,
                        title: prog.Program_Title || prog.Program_Code,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <MessageSquare size={14} /> Submit Programme Feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Submit Content for Required Programmes */}
        {contentModalProgram && (
          <SubmitContentModal
            isOpen={Boolean(contentModalProgram)}
            onClose={() => setContentModalProgram(null)}
            onSuccess={(submission) => {
              setSubmittedContents((prev) => ({
                ...prev,
                [submission.programe_code]: {
                  content_title: submission.content_title,
                },
              }));
            }}
            program={contentModalProgram}
            studentAddNo={student?.AddNo || ""}
          />
        )}

        {/* Modal: Register Topic for Programmes with is_topic_required */}
        {topicModalProgram && (
          <TopicRegistrationModal
            isOpen={Boolean(topicModalProgram)}
            onClose={() => setTopicModalProgram(null)}
            programCode={topicModalProgram.Program_Code}
            programTitle={topicModalProgram.Program_Title}
            studentAddNo={student?.AddNo || null}
            onSuccess={() => {
              // Refresh topic state
              if (student?.AddNo && topicModalProgram) {
                SupaBaseFunction.from("Topics_Box")
                  .select("program_code, topic_title, is_approved")
                  .eq("student_addNo", student.AddNo)
                  .eq("program_code", topicModalProgram.Program_Code)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data) {
                      setSubmittedTopics((prev) => ({
                        ...prev,
                        [data.program_code]: {
                          topic_title: data.topic_title || "Registered Topic",
                          is_approved: Boolean(data.is_approved),
                        },
                      }));
                    }
                  });
              }
            }}
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

        {/* Feedback Modal for Participated Programme */}
        {feedbackModal.isOpen && (
          <ProgrammeFeedbackModal
            isOpen={feedbackModal.isOpen}
            programCode={feedbackModal.code}
            programTitle={feedbackModal.title}
            studentAddNo={student?.AddNo}
            onClose={() => setFeedbackModal({ isOpen: false, code: "", title: "" })}
          />
        )}
      </div>
    </div>
  );
}