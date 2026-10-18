import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import SafeImage from "../../lib/SafeImage";
import { resolveWingProfile, type LoggedInWingProfile } from "../../lib/wingResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import AdminTopicsManagerModal from "../../components/AdminTopicsManagerModal";
import EditProgrammeModal from "../../AdminPanel/AdminProgrammesList/EditProgrammeModal";
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
  LayoutGrid,
  List,
  UserPlus,
  Edit3,
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
  is_topic_required?: boolean;
}

interface Student {
  AddNo: string;
  StudentName: string;
  Class: string;
  CollegeName: string;
  Student_Photo_Urls?: string;
  squad_uuid?: string | null;
  squad_title?: string | null;
}

interface TopicInfo {
  topic_id: string;
  topic_title: string;
  is_approved: boolean;
  student_addNo?: string | null;
  team_uuid?: string | null;
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
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [topicsMap, setTopicsMap] = useState<Record<string, Record<string, TopicInfo>>>({});
  const [candidates, setCandidates] = useState<Record<string, Student[]>>({});
  const [printCandidateCode, setPrintCandidateCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingCands, setLoadingCands] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "group">("all");
  const [selectedTopicProg, setSelectedTopicProg] = useState<string | null>(null);
  const [isTopicsModalOpen, setIsTopicsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [editingProgram, setEditingProgram] = useState<Programme | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const wing = await resolveWingProfile(actWing);
        if (!wing) throw new Error("Wing not found");

        if (isMounted) {
          setWingData(wing);
        }

        const [progsRes, contentsRes, topicsRes] = await Promise.all([
          SupaBaseFunction
            .from("ProgrammesBox")
            .select("*")
            .eq("WingCode", wing.WingCode)
            .order("Date", { ascending: false }),
          SupaBaseFunction
            .from("Content_Table")
            .select("programe_code, student_addNo, content_title"),
          SupaBaseFunction
            .from("Topics_Box")
            .select("topic_id, program_code, student_addNo, team_uuid, topic_title, is_approved")
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

          if (topicsRes.data) {
            const tCounts: Record<string, number> = {};
            const tMap: Record<string, Record<string, TopicInfo>> = {};
            topicsRes.data.forEach((t: any) => {
              if (t.program_code) {
                tCounts[t.program_code] = (tCounts[t.program_code] || 0) + 1;
                if (!tMap[t.program_code]) {
                  tMap[t.program_code] = {};
                }
                const info: TopicInfo = {
                  topic_id: t.topic_id,
                  topic_title: t.topic_title || "Untitled Topic",
                  is_approved: Boolean(t.is_approved),
                  student_addNo: t.student_addNo,
                  team_uuid: t.team_uuid,
                };
                if (t.student_addNo) {
                  const s = String(t.student_addNo).trim();
                  tMap[t.program_code][s] = info;
                  tMap[t.program_code][s.toUpperCase()] = info;
                }
                if (t.team_uuid) {
                  const team = String(t.team_uuid).trim();
                  tMap[t.program_code][team] = info;
                }
              }
            });
            setTopicCounts(tCounts);
            setTopicsMap(tMap);
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
  }, [actWing, refreshKey]);

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
      setProgrammes(prev =>
        prev.map(p => (p.Program_Code === code ? { ...p, isContentRequired: currentStatus } : p))
      );
    }
  };

  const toggleTopicReq = async (code: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setProgrammes(prev =>
      prev.map(p => (p.Program_Code === code ? { ...p, is_topic_required: nextStatus } : p))
    );

    try {
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ is_topic_required: nextStatus })
        .eq("Program_Code", code);
    } catch (e) {
      console.error("Failed to update topic registration requirement:", e);
      setProgrammes(prev =>
        prev.map(p => (p.Program_Code === code ? { ...p, is_topic_required: currentStatus } : p))
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
          .select("Candidate_Code, squad_uuid")
          .eq("Program_Code", code);

        if (regs && regs.length > 0) {
          const codes = regs.map(r => r.Candidate_Code).filter(Boolean);
          const squadUuids = Array.from(new Set(regs.map(r => r.squad_uuid).filter(Boolean))) as string[];

          let loadedSquadsMap: Record<string, string> = {};
          if (squadUuids.length > 0) {
            const { data: squadRows } = await SupaBaseFunction
              .from("SquadMate")
              .select("squad_id, squad_title")
              .in("squad_id", squadUuids);
            if (squadRows) {
              squadRows.forEach((sq: any) => {
                loadedSquadsMap[sq.squad_id] = sq.squad_title;
              });
            }
          }

          // Fetch student profiles
          const { data: students } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
            .in("AddNo", codes);

          // Fetch fresh topics for this program to ensure up-to-date registry
          const { data: progTopics } = await SupaBaseFunction
            .from("Topics_Box")
            .select("topic_id, program_code, student_addNo, team_uuid, topic_title, is_approved")
            .eq("program_code", code);

          if (progTopics) {
            setTopicsMap(prev => {
              const updated = { ...prev };
              if (!updated[code]) updated[code] = {};
              progTopics.forEach((t: any) => {
                const info: TopicInfo = {
                  topic_id: t.topic_id,
                  topic_title: t.topic_title || "Untitled Topic",
                  is_approved: Boolean(t.is_approved),
                  student_addNo: t.student_addNo,
                  team_uuid: t.team_uuid,
                };
                if (t.student_addNo) {
                  const s = String(t.student_addNo).trim();
                  updated[code][s] = info;
                  updated[code][s.toUpperCase()] = info;
                }
                if (t.team_uuid) {
                  updated[code][String(t.team_uuid).trim()] = info;
                }
              });
              return updated;
            });
          }

          const regMap = new Map(regs.map(r => [r.Candidate_Code, r]));

          const mappedStudents: Student[] = (students || []).map((s: any) => {
            const matchedClass = meta.classes.find(
              (c: any) =>
                c.class_id === s.Stn_Class ||
                c.standard_name === s.Stn_Class ||
                c.class_nick_name === s.Stn_Class
            );
            const reg = regMap.get(s.AddNo);
            return {
              ...s,
              Class:
                matchedClass?.class_nick_name ||
                matchedClass?.standard_name ||
                s.Stn_Class ||
                "-",
              squad_uuid: reg?.squad_uuid || null,
              squad_title: reg?.squad_uuid ? loadedSquadsMap[reg.squad_uuid] : null,
            };
          });

          setCandidates(p => ({ ...p, [code]: mappedStudents }));
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

  // Candidate Topic resolver helper
  const getCandidateTopic = (progCode: string, studentAddNo: string, squadUuid?: string | null): TopicInfo | undefined => {
    const pMap = topicsMap[progCode];
    if (!pMap) return undefined;
    const cleanAdd = studentAddNo.trim();
    return pMap[cleanAdd] || pMap[cleanAdd.toUpperCase()] || (squadUuid ? pMap[squadUuid.trim()] : undefined);
  };

  if (loading && !wingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Subcomponent: Candidates Roster with dedicated Topic column
  const renderCandidateRoster = (p: Programme) => {
    const isTopicReq = Boolean(p.is_topic_required);
    const isContentReq = Boolean(p.isContentRequired);
    const candidateList = candidates[p.Program_Code] || [];
    const isLoading = loadingCands[p.Program_Code];

    return (
      <div className="space-y-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} className="text-blue-600" />
            Registered Candidates for {p.Program_Title || p.Program_Code}
          </h4>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
              {candidateList.length} Enrolled
            </span>
            {isTopicReq && (
              <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                <FileText size={10} />
                Topics: {topicCounts[p.Program_Code] || 0} Registered
              </span>
            )}
            {isContentReq && (
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <FileText size={10} />
                Content: {contentCounts[p.Program_Code] || 0} Submitted
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

        {isLoading ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            Loading registered candidate roster...
          </div>
        ) : candidateList.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3">Candidate Profile</th>
                  <th className="py-2.5 px-3">Class & College</th>
                  {p.is_group_program && <th className="py-2.5 px-3">Squad Group</th>}
                  {/* Topic column if programme requires or has topics */}
                  {isTopicReq && (
                    <th className="py-2.5 px-3 min-w-[200px]">Registered Topic</th>
                  )}
                  {isContentReq && (
                    <th className="py-2.5 px-3 min-w-[160px]">Content Submission</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {candidateList.map((c, cIdx) => {
                  const candTopic = getCandidateTopic(p.Program_Code, c.AddNo, c.squad_uuid);
                  const stnContentTitle = contentMap[p.Program_Code]?.[c.AddNo];

                  return (
                    <tr
                      key={`${c.AddNo}_${p.Program_Code}_${cIdx}`}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] font-bold">
                        {cIdx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            <SafeImage
                              src={c.Student_Photo_Urls}
                              alt={c.StudentName}
                              fallbackCategory="student"
                              fallbackText={c.StudentName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {c.StudentName}
                            </span>
                            <span className="text-[10px] font-mono text-blue-700 block">
                              AddNo: #{c.AddNo}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800 block text-xs">
                          {c.Class}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                          {c.CollegeName || "DHIU Main Campus"}
                        </span>
                      </td>
                      {p.is_group_program && (
                        <td className="py-2.5 px-3">
                          {c.squad_title ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              <Users size={10} /> {c.squad_title}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      )}
                      {/* Topic Column Display */}
                      {isTopicReq && (
                        <td className="py-2.5 px-3">
                          {candTopic ? (
                            <div className="space-y-1">
                              <div
                                className="font-bold text-slate-900 truncate max-w-[220px]"
                                title={candTopic.topic_title}
                              >
                                {candTopic.topic_title}
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  candTopic.is_approved
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {candTopic.is_approved ? (
                                  <CheckCircle2 size={10} />
                                ) : (
                                  <Clock size={10} />
                                )}
                                {candTopic.is_approved ? "Approved" : "Pending Approval"}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock size={10} /> Topic Pending
                            </span>
                          )}
                        </td>
                      )}
                      {/* Content Column Display */}
                      {isContentReq && (
                        <td className="py-2.5 px-3">
                          {stnContentTitle ? (
                            <div
                              className="flex items-center gap-1 text-emerald-700 font-bold truncate max-w-[180px]"
                              title={stnContentTitle}
                            >
                              <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{stnContentTitle}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock size={10} /> Pending Submission
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
            No students have registered for this event yet.
          </div>
        )}
      </div>
    );
  };

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
              Manage your department's upcoming events, candidate registrations, topic proposals, and official evaluation records.
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

        {/* Filter, Search, and View Mode Bar */}
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

          <div className="flex items-center gap-3 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Filter size={12} /> Filter:
              </span>
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  typeFilter === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({programmes.length})
              </button>
              <button
                onClick={() => setTypeFilter("individual")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  typeFilter === "individual"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Individual ({programmes.filter(p => !p.is_group_program).length})
              </button>
              <button
                onClick={() => setTypeFilter("group")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  typeFilter === "group"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Group Squads ({programmes.filter(p => p.is_group_program).length})
              </button>
            </div>

            {/* View Mode Switcher: Card Grid vs Table List */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View (Standard)"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
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
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto">
              <Calendar size={28} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No Programmes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching programmes registered under this wing yet. Click "Create Programme" to publish a new event.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: MODERN CARD GRID VIEW (Default as for Published Results) */}
        {/* ========================================================= */}
        {viewMode === "cards" && filteredProgrammes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map((p) => {
              const isExp = expanded.has(p.Program_Code);
              const contentsSubmitted = contentCounts[p.Program_Code] || 0;
              const topicsSubmitted = topicCounts[p.Program_Code] || 0;
              const isContentReq = Boolean(p.isContentRequired);
              const isTopicReq = Boolean(p.is_topic_required);
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
                    {/* Header: Code + Squad Badge + Reg Status + Topic/Content Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                          #{p.Program_Code}
                        </span>
                        {p.is_group_program && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                            Squad
                          </span>
                        )}
                      </div>

                      {/* Registration & Feature Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p.IsOpenRegistration
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.IsOpenRegistration ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Reg: Open</span>
                            </>
                          ) : (
                            <span>Reg: Closed</span>
                          )}
                        </span>

                        {isTopicReq && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <FileText size={10} /> Topic
                          </span>
                        )}
                        {isContentReq && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <FileText size={10} /> Content
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Programme Poster & Title */}
                    <div className="flex gap-3 items-start">
                      {p.Program_Poster && (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <SafeImage
                            src={p.Program_Poster}
                            alt={p.Program_Title || "Poster"}
                            fallbackCategory="programme"
                            fallbackText={p.Program_Title || "Event"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {/* Category Name & Status Display */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md">
                            {categoryName || "General Category"}
                          </span>
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            p.IsResultPublished
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : p.IsResulted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.IsOpenRegistration
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {p.IsResultPublished ? "Result Published" : p.IsResulted ? "Result Declared" : p.IsOpenRegistration ? "Reg Open" : "Reg Closed"}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2">
                          {p.Program_Title || "Untitled Programme"}
                        </h3>
                        {/* Group Tag if available */}
                        {groupName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                              {groupName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date, Venue, Candidate Count & Submissions Matrix */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Calendar size={13} className="text-blue-500 shrink-0" />
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
                          <Users size={13} className="text-indigo-500 shrink-0" />
                          <span>Candidates:</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {p.Total_Registration || 0} Enrolled
                        </span>
                      </div>

                      {isTopicReq && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                            <FileText size={13} className="shrink-0" />
                            <span>Topics Submitted:</span>
                          </span>
                          <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            {topicsSubmitted} Registered
                          </span>
                        </div>
                      )}

                      {isContentReq && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                            <FileText size={13} className="shrink-0" />
                            <span>Contents Submitted:</span>
                          </span>
                          <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {contentsSubmitted} Files
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Toggles: Registration, Content, Topic */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleReg(p.Program_Code, p.IsOpenRegistration)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                          p.IsOpenRegistration
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                        title={p.IsOpenRegistration ? "Click to Turn Off Registration" : "Click to Turn On Registration"}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-70">Reg</span>
                        <span>{p.IsOpenRegistration ? "ON" : "OFF"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleContentReq(p.Program_Code, isContentReq)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                          isContentReq
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                        title={isContentReq ? "Click to Turn Off Content Requirement" : "Click to Turn On Content Requirement"}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-70">Content</span>
                        <span>{isContentReq ? "ON" : "OFF"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleTopicReq(p.Program_Code, isTopicReq)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                          isTopicReq
                            ? "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                        title={isTopicReq ? "Click to Turn Off Topic Registration" : "Click to Turn On Topic Registration"}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-70">Topic</span>
                        <span>{isTopicReq ? "ON" : "OFF"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom: Action Buttons & Expandable Candidate Details */}
                  <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isTopicReq && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTopicProg(p.Program_Code);
                              setIsTopicsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 inline-flex items-center gap-1 transition cursor-pointer"
                            title="Manage Registered Topics"
                          >
                            <FileText size={12} />
                            <span>Topics</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setPrintCandidateCode(p.Program_Code)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 inline-flex items-center gap-1 transition cursor-pointer"
                          title="Print Official A4 Candidate Evaluation Sheet"
                        >
                          <Printer size={12} />
                          <span>Print</span>
                        </button>

                        <Link
                          to={`/wing-panel/${actWing}/candidate-registration/${p.Program_Code}`}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 inline-flex items-center gap-1 transition shadow-2xs"
                          title="Assign other candidates by AddNo"
                        >
                          <UserPlus size={12} />
                          <span>Assign +</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setEditingProgram(p)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 inline-flex items-center gap-1 transition cursor-pointer"
                          title="Edit Programme Details"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Candidates Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleCandidates(p.Program_Code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                          isExp
                            ? "bg-slate-200 text-slate-800"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs shadow-blue-200"
                        }`}
                      >
                        <span>{isExp ? "Hide List" : "Candidates"}</span>
                        {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    {/* Candidate Expansion within Card */}
                    {isExp && renderCandidateRoster(p)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: TABLE LIST VIEW (Optional tabular mode)            */}
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
                    <th className="px-4 py-4 text-center">Content Submission</th>
                    <th className="px-4 py-4 text-center">Topic Registration</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProgrammes.map((p) => {
                    const isExp = expanded.has(p.Program_Code);
                    const contentsSubmitted = contentCounts[p.Program_Code] || 0;
                    const topicsSubmitted = topicCounts[p.Program_Code] || 0;
                    const isContentReq = Boolean(p.isContentRequired);
                    const isTopicReq = Boolean(p.is_topic_required);

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
                                  {meta.getCategoryName(p.Category)}
                                </span>
                              )}
                              {p.Group && meta.getGroupName(p.Group) && (
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {meta.getGroupName(p.Group)}
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
                                  <span className="truncate">{meta.getVenueName(p.Venue)}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Registrations & Submissions Count */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs" title="Total Registered Candidates">
                                <Users size={12} className="text-blue-600" />
                                {p.Total_Registration || 0} Reg
                              </span>
                              {isTopicReq && (
                                <span className="inline-flex items-center gap-1 font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px]" title="Registered Topics">
                                  <FileText size={10} className="text-indigo-600" />
                                  {topicsSubmitted} Topics
                                </span>
                              )}
                              {isContentReq && (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px]" title="Content Submissions Received">
                                  <FileText size={10} className="text-amber-600" />
                                  {contentsSubmitted} Files
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

                          {/* BUTTON 3: Topic Registration Toggle (ON / OFF) */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleTopicReq(p.Program_Code, Boolean(p.is_topic_required))}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer shadow-2xs active:scale-95 inline-flex items-center gap-1.5 ${
                                p.is_topic_required
                                  ? "bg-indigo-50 text-indigo-800 border border-indigo-300 hover:bg-indigo-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title={p.is_topic_required ? "Click to Turn Topic Registration OFF" : "Click to Turn Topic Registration ON"}
                            >
                              {p.is_topic_required ? (
                                <>
                                  <FileText size={12} className="text-indigo-600" />
                                  <span>Topic: ON</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                  <span>Topic: OFF</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingProgram(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer shadow-2xs"
                                title="Edit Programme Details"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>
                              {p.is_topic_required && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTopicProg(p.Program_Code);
                                    setIsTopicsModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                                  title="View & Manage Candidate Topics"
                                >
                                  <FileText size={12} />
                                  <span>Topics</span>
                                </button>
                              )}
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
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Candidate Details */}
                        {isExp && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50/70 p-5 border-y border-slate-100">
                              {renderCandidateRoster(p)}
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

        {/* Print Candidate Sheet Modal (A4) */}
        {printCandidateCode && (
          <PrintCandidateSheetModal
            isOpen={Boolean(printCandidateCode)}
            programCode={printCandidateCode}
            onClose={() => setPrintCandidateCode(null)}
          />
        )}

        {/* Admin Topics Manager Modal (Topics_Box) */}
        {isTopicsModalOpen && (
          <AdminTopicsManagerModal
            isOpen={isTopicsModalOpen}
            onClose={() => setIsTopicsModalOpen(false)}
            programCode={selectedTopicProg || undefined}
          />
        )}

        {/* Edit Programme Modal (Wing Scoped - Only their own programmes) */}
        {editingProgram && (
          <EditProgrammeModal
            isOpen={Boolean(editingProgram)}
            program={editingProgram as any}
            lockedWingCode={wingData?.WingCode}
            onClose={() => setEditingProgram(null)}
            onSuccess={() => {
              setEditingProgram(null);
              setRefreshKey((k) => k + 1);
            }}
          />
        )}

      </div>
    </div>
  );
}
