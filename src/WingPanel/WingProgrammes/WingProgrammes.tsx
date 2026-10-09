import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import SafeImage from "../../lib/SafeImage";
import { resolveWingProfile, type LoggedInWingProfile } from "../../lib/wingResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import {
  Calendar,
  Users,
  PlusCircle,
  Search,
  Filter,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  CheckCircle2,
  Printer,
} from "lucide-react";

// --- INTERFACES MATCHING UPDATED PROGRAMMESBOX TABLE ---
interface Programme {
  Program_Code: string;
  Program_Title: string | null;
  WingCode: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null;
  Venue: string | null;
  Category: string | null;
  Group: string | null;
  IsApproved: boolean;
  IsResulted: boolean;
  IsResultPublished: boolean;
  Total_Registration: number;
  IsOpenRegistration: boolean;
  Program_Poster?: string | null;
  IsConducted: boolean;
  AccademicYear: string | null;
  Expected_Time: string | null;
  Collaborator: string | null;
  is_group_program: boolean;
  isContentRequired?: boolean;
  ContentSubmition_deadLine?: string | null;
}

interface Student {
  AddNo: string;
  StudentName: string;
  Class: string;
  CollegeName: string;
  Student_Photo_Urls?: string;
}

export default function WingProgrammes() {
  const { actWing } = useParams<{ actWing: string }>();
  const meta = useProgrammeMeta();
  const [loading, setLoading] = useState(true);
  const [wingData, setWingData] = useState<LoggedInWingProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_wing_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [contentCounts, setContentCounts] = useState<Record<string, number>>({});
  const [contentMap, setContentMap] = useState<Record<string, Record<string, string>>>({});
  const [candidates, setCandidates] = useState<Record<string, Student[]>>({});
  const [printCandidateCode, setPrintCandidateCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingCands, setLoadingCands] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "group">("all");

  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const wing = await resolveWingProfile(actWing);
        if (!wing) throw new Error("Wing not found");

        if (isMounted) {
          setWingData(wing);
        }

        const [progsRes, contentsRes] = await Promise.all([
          SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .eq("WingCode", wing.WingCode)
            .order("Date", { ascending: false }),
          SupaBaseFunction
            .from("Content_Table")
            .select("programe_code, student_addNo, content_title")
        ]);

        if (progsRes.error) throw progsRes.error;

        if (isMounted) {
          setProgrammes((progsRes.data as Programme[]) || []);

          if (contentsRes.data) {
            const counts: Record<string, number> = {};
            const stnContents: Record<string, Record<string, string>> = {};
            contentsRes.data.forEach((c: any) => {
              if (c.programe_code) {
                counts[c.programe_code] = (counts[c.programe_code] || 0) + 1;
                if (c.student_addNo) {
                  if (!stnContents[c.programe_code]) {
                    stnContents[c.programe_code] = {};
                  }
                  stnContents[c.programe_code][c.student_addNo] = c.content_title || "Submitted";
                }
              }
            });
            setContentCounts(counts);
            setContentMap(stnContents);
          }
        }
      } catch (err) {
        console.error("Error loading wing programmes:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAll();
  }, [actWing]);

  const toggleReg = async (code: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setProgrammes(prev =>
      prev.map(p => (p.Program_Code === code ? { ...p, IsOpenRegistration: nextStatus } : p))
    );

    try {
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ IsOpenRegistration: nextStatus })
        .eq("Program_Code", code);
    } catch (e) {
      console.error("Failed to update registration status:", e);
      // Revert on error
      setProgrammes(prev =>
        prev.map(p => (p.Program_Code === code ? { ...p, IsOpenRegistration: currentStatus } : p))
      );
    }
  };

  const toggleContentReq = async (code: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setProgrammes(prev =>
      prev.map(p => (p.Program_Code === code ? { ...p, isContentRequired: nextStatus } : p))
    );

    try {
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ isContentRequired: nextStatus })
        .eq("Program_Code", code);
    } catch (e) {
      console.error("Failed to update content submission requirement:", e);
      // Revert on error
      setProgrammes(prev =>
        prev.map(p => (p.Program_Code === code ? { ...p, isContentRequired: currentStatus } : p))
      );
    }
  };

  const toggleCandidates = async (code: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpanded(newExpanded);

    if (!candidates[code]) {
      setLoadingCands(p => ({ ...p, [code]: true }));
      try {
        const { data: regs } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code")
          .eq("Program_Code", code);

        if (regs && regs.length > 0) {
          const codes = regs.map(r => r.Candidate_Code).filter(Boolean);
          const { data: students } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Class, CollegeName, Student_Photo_Urls")
            .in("AddNo", codes);

          setCandidates(p => ({ ...p, [code]: (students as Student[]) || [] }));
        } else {
          setCandidates(p => ({ ...p, [code]: [] }));
        }
      } catch (e) {
        console.error("Failed to load candidates:", e);
      } finally {
        setLoadingCands(p => ({ ...p, [code]: false }));
      }
    }
  };

  const filteredProgrammes = useMemo(() => {
    return programmes.filter(p => {
      const titleMatch = (p.Program_Title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.Program_Code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.Category || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!titleMatch) return false;

      if (typeFilter === "individual") return !p.is_group_program;
      if (typeFilter === "group") return p.is_group_program;
      return true;
    });
  }, [programmes, searchQuery, typeFilter]);

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
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {wingData?.WingCode || "Wing Portal"}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Academic Year 2026-27
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {wingData?.WingTitle || "Wing Space"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
              Manage your department's upcoming events, candidate registrations, and result records according to university standards.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to={`/wing-panel/${actWing || wingData?.WingEmail || ""}/create-program`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>Create Programme</span>
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search programmes by title or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter size={12} /> Filter:
            </span>
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                typeFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({programmes.length})
            </button>
            <button
              onClick={() => setTypeFilter("individual")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                typeFilter === "individual"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Individual ({programmes.filter(p => !p.is_group_program).length})
            </button>
            <button
              onClick={() => setTypeFilter("group")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                typeFilter === "group"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Group Squads ({programmes.filter(p => p.is_group_program).length})
            </button>
          </div>
        </div>

        {/* Programmes Table / Cards Container */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden">
          {filteredProgrammes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Calendar size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No Programmes Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No matching programmes registered under this wing yet. Click "Create Programme" to publish a new event.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Programme Details</th>
                    <th className="px-4 py-4">Category & Group</th>
                    <th className="px-4 py-4">Date & Venue</th>
                    <th className="px-4 py-4 text-center">Registrations & Content</th>
                    <th className="px-4 py-4 text-center">Registration Control</th>
                    <th className="px-4 py-4 text-center">Content Submission</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProgrammes.map((p) => {
                    const isExp = expanded.has(p.Program_Code);
                    const contentsSubmitted = contentCounts[p.Program_Code] || 0;
                    const isContentReq = Boolean(p.isContentRequired);

                    return (
                      <React.Fragment key={p.Program_Code}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          {/* Programme Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 shadow-2xs">
                                <SafeImage
                                  src={p.Program_Poster}
                                  alt={p.Program_Title || "Poster"}
                                  fallbackCategory="programme"
                                  fallbackText={p.Program_Title || "Event"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                  <span className="truncate max-w-xs">{p.Program_Title || "Untitled Programme"}</span>
                                  {p.is_group_program && (
                                    <span className="text-[10px] font-extrabold uppercase tracking-wide bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
                                      Squad Group
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                  <span className="text-indigo-600 font-bold">#{p.Program_Code}</span>
                                  <span>•</span>
                                  <span className={p.IsApproved ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                                    {p.IsApproved ? "Approved" : "Pending Approval"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category & Group */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              {p.Category && (
                                <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                  {meta.categoryMap[p.Category] || p.Category}
                                </span>
                              )}
                              {p.Group && (
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {p.Group}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Date & Venue */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Calendar size={13} className="text-indigo-500 shrink-0" />
                                <span>{p.Date || "Date TBD"}</span>
                              </div>
                              {p.Venue && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <MapPin size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{meta.venueMap[p.Venue] || p.Venue}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Registrations & Content Count */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs" title="Total Registered Candidates">
                                <Users size={12} className="text-blue-600" />
                                {p.Total_Registration || 0} Reg
                              </span>
                              {isContentReq && (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px]" title="Content Submissions Received">
                                  <FileText size={10} className="text-amber-600" />
                                  {contentsSubmitted} Submitted
                                </span>
                              )}
                            </div>
                          </td>

                          {/* BUTTON 1: Registration Toggle (ON / OFF) */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleReg(p.Program_Code, p.IsOpenRegistration)}
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

                          {/* BUTTON 2: Content Submission Toggle (ON / OFF) */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleContentReq(p.Program_Code, isContentReq)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer shadow-2xs active:scale-95 inline-flex items-center gap-1.5 ${
                                isContentReq
                                  ? "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title={isContentReq ? "Click to Turn Content Submission OFF" : "Click to Turn Content Submission ON"}
                            >
                              {isContentReq ? (
                                <>
                                  <FileText size={12} className="text-amber-600" />
                                  <span>Content: ON</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                  <span>Content: OFF</span>
                                </>
                              )}
                            </button>
                            {isContentReq && p.ContentSubmition_deadLine && (
                              <div className="text-[10px] text-amber-700 font-medium mt-1">
                                Due: {p.ContentSubmition_deadLine}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleCandidates(p.Program_Code)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                isExp
                                  ? "bg-slate-200 text-slate-800"
                                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              }`}
                            >
                              <span>{isExp ? "Hide List" : "Candidates"}</span>
                              {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Candidate Details */}
                        {isExp && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50/70 p-5 border-y border-slate-100">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={14} className="text-blue-600" />
                                    Registered Candidates for {p.Program_Title}
                                  </h4>
                                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                                    <span>{candidates[p.Program_Code]?.length || 0} Enrolled</span>
                                    {isContentReq && (
                                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                        Content Req: {contentsSubmitted}/{candidates[p.Program_Code]?.length || 0} Submitted
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setPrintCandidateCode(p.Program_Code)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                      title="Print Official A4 Candidate Attendance & Evaluation Sheet"
                                    >
                                      <Printer size={12} /> Print Sheet (A4)
                                    </button>
                                  </div>
                                </div>

                                {loadingCands[p.Program_Code] ? (
                                  <div className="text-center py-6 text-xs text-slate-400 italic">
                                    Loading registered candidate roster...
                                  </div>
                                ) : candidates[p.Program_Code] && candidates[p.Program_Code].length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {candidates[p.Program_Code].map((c) => {
                                      const stnContentTitle = contentMap[p.Program_Code]?.[c.AddNo];

                                      return (
                                        <div
                                          key={c.AddNo}
                                          className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
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
                                                #{c.AddNo} • {c.Class || "Student"}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Candidate Content Submission Status */}
                                          {isContentReq && (
                                            <div className="pt-1.5 border-t border-slate-100 text-[10px]">
                                              {stnContentTitle ? (
                                                <div className="flex items-center gap-1 text-emerald-700 font-bold truncate" title={stnContentTitle}>
                                                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                                  <span className="truncate">{stnContentTitle}</span>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-1 text-slate-400 font-medium">
                                                  <Clock size={11} className="shrink-0" />
                                                  <span>Pending Content</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
                                    No students have registered for this event yet.
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

        {/* Print Candidate Sheet Modal (A4) */}
        {printCandidateCode && (
          <PrintCandidateSheetModal
            isOpen={Boolean(printCandidateCode)}
            programCode={printCandidateCode}
            onClose={() => setPrintCandidateCode(null)}
          />
        )}

      </div>
    </div>
  );
}
