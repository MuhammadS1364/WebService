import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveWingProfile, type LoggedInWingProfile } from "../../lib/wingResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { exportToExcel } from "../../lib/excelService";
import SafeImage from "../../lib/SafeImage";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
import {
  UserCheck,
  Users,
  FileText,
  Send,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Check,
  X,
  AlertCircle,
  Shield,
  Crown,
  ExternalLink,
  RefreshCw,
  Eye,
} from "lucide-react";

interface ProgrammeItem {
  Program_Code: string;
  Program_Title: string | null;
  WingCode: string | null;
  Category: string | null;
  Date: string | null;
  Venue: string | null;
  Group: string | null;
  IsOpenRegistration: boolean;
  is_group_program?: boolean;
  isContentRequired?: boolean;
  is_topic_required?: boolean;
  Total_Registration?: number | null;
  Program_Poster?: string | null;
}

interface CandidateRegItem {
  CandidateUUiD: string;
  Program_Code: string;
  Candidate_Code: string;
  squad_uuid?: string | null;
  created_at?: string;
}

interface TopicItem {
  topic_id: string;
  program_code: string;
  student_addNo?: string | null;
  team_uuid?: string | null;
  topic_title: string;
  topic_content?: string | null;
  is_approved: boolean;
  created_at?: string;
}

interface ContentItem {
  content_id: string;
  programe_code: string;
  student_addNo?: string | null;
  content_title?: string | null;
  content_text?: string | null;
  content_file?: string | null;
  like_count?: number | null;
  created_at?: string;
}

interface SquadItem {
  squad_id: string;
  squad_title: string;
  member1_uuid?: string | null;
  member2_uuid?: string | null;
  member3_uuid?: string | null;
  member4_uuid?: string | null;
  member5_uuid?: string | null;
  member6_uuid?: string | null;
  member7_uuid?: string | null;
  total_particiations?: number;
  total_points?: number;
  is_active?: boolean;
}

interface StudentInfo {
  AddNo: string;
  StudentName: string;
  Class?: string;
  Stn_Class?: string | null;
  CollegeName?: string;
  Student_Photo_Urls?: string;
}

type TabType = "all" | "candidates" | "squads" | "topics" | "content";

export default function WingRegistrations() {
  const { actWing } = useParams<{ actWing: string }>();
  const meta = useProgrammeMeta();

  // Wing Auth & State
  const [wingData, setWingData] = useState<LoggedInWingProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_wing_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data Stores (Strictly scoped to logged in wing)
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [candidateRegs, setCandidateRegs] = useState<CandidateRegItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [squadsMap, setSquadsMap] = useState<Record<string, SquadItem>>({});
  const [studentsMap, setStudentsMap] = useState<Record<string, StudentInfo>>({});

  // Filtering Controls
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedProgramCode, setSelectedProgramCode] = useState<string>("all");
  const [onlyWithRegistrations, setOnlyWithRegistrations] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");

  // Modals
  const [printModalProgram, setPrintModalProgram] = useState<{ code: string; title: string } | null>(null);
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null);
  const [previewTopic, setPreviewTopic] = useState<TopicItem | null>(null);

  // Action loading state for inline topic approvals
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);

  // 1. Fetch Wing and All Registration Data Strictly Scoped to this Wing
  const loadWingRegistrations = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Step A: Resolve logged in wing profile
      const wing = await resolveWingProfile(actWing);
      if (!wing || !wing.WingCode) {
        throw new Error("Wing portal identity could not be verified. Please re-login.");
      }
      setWingData(wing);

      // Step B: Fetch ONLY programmes belonging to this Wing (STRICT ISOLATION)
      const { data: progRows, error: progErr } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("*")
        .eq("WingCode", wing.WingCode)
        .order("Date", { ascending: false });

      if (progErr) throw progErr;

      const wingProgs = (progRows as ProgrammeItem[]) || [];
      setProgrammes(wingProgs);

      const wingProgCodes = wingProgs.map((p) => p.Program_Code).filter(Boolean);

      if (wingProgCodes.length === 0) {
        // No programmes for this wing
        setCandidateRegs([]);
        setTopics([]);
        setContents([]);
        setSquadsMap({});
        setStudentsMap({});
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Step C: Concurrent fetch of Candidate Registrations, Topics, and Content Submissions
      // All queries are strictly constrained to wingProgCodes
      const [candRes, topicRes, contentRes] = await Promise.all([
        SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("*")
          .in("Program_Code", wingProgCodes),
        SupaBaseFunction
          .from("Topics_Box")
          .select("*")
          .in("program_code", wingProgCodes),
        SupaBaseFunction
          .from("Content_Table")
          .select("*")
          .in("programe_code", wingProgCodes),
      ]);

      const candData = (candRes.data as CandidateRegItem[]) || [];
      const topicData = (topicRes.data as TopicItem[]) || [];
      const contentData = (contentRes.data as ContentItem[]) || [];

      setCandidateRegs(candData);
      setTopics(topicData);
      setContents(contentData);

      // Step D: Extract unique Squad IDs from Candidate Registrations
      const uniqueSquadIds = Array.from(
        new Set(candData.map((c) => c.squad_uuid).filter(Boolean))
      ) as string[];

      let loadedSquadsMap: Record<string, SquadItem> = {};
      if (uniqueSquadIds.length > 0) {
        const { data: squadRows } = await SupaBaseFunction
          .from("SquadMate")
          .select("*")
          .in("squad_id", uniqueSquadIds);

        if (squadRows) {
          squadRows.forEach((s: any) => {
            loadedSquadsMap[s.squad_id] = s as SquadItem;
          });
        }
      }
      setSquadsMap(loadedSquadsMap);

      // Step E: Extract all Student AddNos mentioned across candidate registrations, topics, contents, and squads
      const allStudentAddNos = new Set<string>();
      candData.forEach((c) => {
        if (c.Candidate_Code) allStudentAddNos.add(c.Candidate_Code.trim());
      });
      topicData.forEach((t) => {
        if (t.student_addNo) allStudentAddNos.add(t.student_addNo.trim());
      });
      contentData.forEach((ct) => {
        if (ct.student_addNo) allStudentAddNos.add(ct.student_addNo.trim());
      });
      Object.values(loadedSquadsMap).forEach((sq) => {
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
          .forEach((m) => allStudentAddNos.add((m as string).trim()));
      });

      // Batch query student profiles from StudentsBox
      const studentAddNosArray = Array.from(allStudentAddNos);
      let loadedStudentsMap: Record<string, StudentInfo> = {};
      if (studentAddNosArray.length > 0) {
        const { data: stnRows, error: stnError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
          .in("AddNo", studentAddNosArray);

        if (stnError) {
          console.warn("StudentsBox batch query issue:", stnError);
        }

        if (stnRows) {
          stnRows.forEach((stn: any) => {
            loadedStudentsMap[stn.AddNo] = stn as StudentInfo;
          });
        }
      }
      setStudentsMap(loadedStudentsMap);
    } catch (err: any) {
      console.error("Error loading wing registrations:", err);
      setError(err.message || "Failed to load wing registrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWingRegistrations();
  }, [actWing]);

  // Programme Lookup Map
  const progMap = useMemo(() => {
    const map: Record<string, ProgrammeItem> = {};
    programmes.forEach((p) => {
      map[p.Program_Code] = p;
    });
    return map;
  }, [programmes]);

  // Compute registration action counts per Programme
  const programmeActionCounts = useMemo(() => {
    const counts: Record<
      string,
      {
        candidates: number;
        squads: number;
        topics: number;
        content: number;
        total: number;
      }
    > = {};

    programmes.forEach((p) => {
      counts[p.Program_Code] = {
        candidates: 0,
        squads: 0,
        topics: 0,
        content: 0,
        total: 0,
      };
    });

    candidateRegs.forEach((c) => {
      if (counts[c.Program_Code]) {
        counts[c.Program_Code].candidates += 1;
        if (c.squad_uuid) {
          counts[c.Program_Code].squads += 1;
        }
      }
    });

    topics.forEach((t) => {
      if (counts[t.program_code]) {
        counts[t.program_code].topics += 1;
      }
    });

    contents.forEach((ct) => {
      if (counts[ct.programe_code]) {
        counts[ct.programe_code].content += 1;
      }
    });

    Object.keys(counts).forEach((code) => {
      const item = counts[code];
      item.total = item.candidates + item.topics + item.content;
    });

    return counts;
  }, [programmes, candidateRegs, topics, contents]);

  // Programmes that have at least 1 registration action
  const programmesWithActions = useMemo(() => {
    return programmes.filter((p) => {
      const count = programmeActionCounts[p.Program_Code];
      return count && count.total > 0;
    });
  }, [programmes, programmeActionCounts]);

  // Total summary metrics
  const totalMetrics = useMemo(() => {
    const uniqueCandidates = new Set(candidateRegs.map((c) => c.Candidate_Code)).size;
    const uniqueSquads = new Set(candidateRegs.map((c) => c.squad_uuid).filter(Boolean)).size;
    const approvedTopics = topics.filter((t) => t.is_approved).length;
    const pendingTopics = topics.filter((t) => !t.is_approved).length;

    return {
      totalCandidates: candidateRegs.length,
      uniqueCandidates,
      totalSquads: uniqueSquads,
      totalTopics: topics.length,
      approvedTopics,
      pendingTopics,
      totalContents: contents.length,
      activeProgrammesCount: programmesWithActions.length,
    };
  }, [candidateRegs, topics, contents, programmesWithActions]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidateRegs.filter((c) => {
      if (selectedProgramCode !== "all" && c.Program_Code !== selectedProgramCode) {
        return false;
      }
      if (onlyWithRegistrations) {
        const pCount = programmeActionCounts[c.Program_Code];
        if (!pCount || pCount.total === 0) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const student = studentsMap[c.Candidate_Code];
        const prog = progMap[c.Program_Code];
        const squad = c.squad_uuid ? squadsMap[c.squad_uuid] : null;

        const matchCode = c.Candidate_Code.toLowerCase().includes(q);
        const matchProgCode = c.Program_Code.toLowerCase().includes(q);
        const matchName = student?.StudentName?.toLowerCase().includes(q);
        const matchClass = student?.Class?.toLowerCase().includes(q);
        const matchProgTitle = prog?.Program_Title?.toLowerCase().includes(q);
        const matchSquad = squad?.squad_title?.toLowerCase().includes(q);

        return matchCode || matchProgCode || matchName || matchClass || matchProgTitle || matchSquad;
      }
      return true;
    });
  }, [candidateRegs, selectedProgramCode, onlyWithRegistrations, searchQuery, studentsMap, progMap, squadsMap, programmeActionCounts]);

  // Filtered Squads (grouped by squad_id + Program_Code)
  const filteredSquads = useMemo(() => {
    // Map squad registrations per programme
    const list: {
      squad: SquadItem;
      programCode: string;
      programTitle: string;
      memberAddNos: string[];
    }[] = [];

    const processedKey = new Set<string>();

    candidateRegs.forEach((c) => {
      if (c.squad_uuid && squadsMap[c.squad_uuid]) {
        const key = `${c.squad_uuid}_${c.Program_Code}`;
        if (!processedKey.has(key)) {
          processedKey.add(key);
          const sq = squadsMap[c.squad_uuid];
          const prog = progMap[c.Program_Code];

          // Collect squad member AddNos registered for this event
          const membersInThisProg = candidateRegs
            .filter((cr) => cr.squad_uuid === c.squad_uuid && cr.Program_Code === c.Program_Code)
            .map((cr) => cr.Candidate_Code);

          list.push({
            squad: sq,
            programCode: c.Program_Code,
            programTitle: prog?.Program_Title || c.Program_Code,
            memberAddNos: membersInThisProg.length > 0 ? membersInThisProg : [
              sq.member1_uuid, sq.member2_uuid, sq.member3_uuid, sq.member4_uuid, sq.member5_uuid, sq.member6_uuid, sq.member7_uuid
            ].filter(Boolean) as string[],
          });
        }
      }
    });

    return list.filter((item) => {
      if (selectedProgramCode !== "all" && item.programCode !== selectedProgramCode) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.squad.squad_title?.toLowerCase().includes(q);
        const matchProg = item.programTitle?.toLowerCase().includes(q) || item.programCode?.toLowerCase().includes(q);
        const matchMember = item.memberAddNos.some((m) => {
          const stn = studentsMap[m];
          return m.toLowerCase().includes(q) || stn?.StudentName?.toLowerCase().includes(q);
        });
        return matchTitle || matchProg || matchMember;
      }
      return true;
    });
  }, [candidateRegs, squadsMap, progMap, selectedProgramCode, searchQuery, studentsMap]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      if (selectedProgramCode !== "all" && t.program_code !== selectedProgramCode) {
        return false;
      }
      if (statusFilter === "approved" && !t.is_approved) return false;
      if (statusFilter === "pending" && t.is_approved) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prog = progMap[t.program_code];
        const student = t.student_addNo ? studentsMap[t.student_addNo] : null;

        const matchTitle = t.topic_title?.toLowerCase().includes(q);
        const matchDesc = t.topic_content?.toLowerCase().includes(q);
        const matchProg = prog?.Program_Title?.toLowerCase().includes(q) || t.program_code?.toLowerCase().includes(q);
        const matchStudent = t.student_addNo?.toLowerCase().includes(q) || student?.StudentName?.toLowerCase().includes(q);

        return matchTitle || matchDesc || matchProg || matchStudent;
      }
      return true;
    });
  }, [topics, selectedProgramCode, statusFilter, searchQuery, progMap, studentsMap]);

  // Filtered Contents
  const filteredContents = useMemo(() => {
    return contents.filter((ct) => {
      if (selectedProgramCode !== "all" && ct.programe_code !== selectedProgramCode) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prog = progMap[ct.programe_code];
        const student = ct.student_addNo ? studentsMap[ct.student_addNo] : null;

        const matchTitle = ct.content_title?.toLowerCase().includes(q);
        const matchText = ct.content_text?.toLowerCase().includes(q);
        const matchProg = prog?.Program_Title?.toLowerCase().includes(q) || ct.programe_code?.toLowerCase().includes(q);
        const matchStudent = ct.student_addNo?.toLowerCase().includes(q) || student?.StudentName?.toLowerCase().includes(q);

        return matchTitle || matchText || matchProg || matchStudent;
      }
      return true;
    });
  }, [contents, selectedProgramCode, searchQuery, progMap, studentsMap]);

  // Toggle Topic Approval Status
  const handleToggleTopicApproval = async (topic: TopicItem) => {
    try {
      setUpdatingTopicId(topic.topic_id);
      const newStatus = !topic.is_approved;

      const { error } = await SupaBaseFunction
        .from("Topics_Box")
        .update({ is_approved: newStatus })
        .eq("topic_id", topic.topic_id);

      if (error) throw error;

      // Update state locally
      setTopics((prev) =>
        prev.map((t) => (t.topic_id === topic.topic_id ? { ...t, is_approved: newStatus } : t))
      );
    } catch (err: any) {
      console.error("Error updating topic status:", err);
      alert("Failed to update topic status: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingTopicId(null);
    }
  };

  // Export current view to Excel
  const handleExportCurrentView = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    const wingPrefix = wingData?.WingCode || "Wing";

    if (activeTab === "candidates" || activeTab === "all") {
      const rows = filteredCandidates.map((c) => {
        const student = studentsMap[c.Candidate_Code];
        const prog = progMap[c.Program_Code];
        const squad = c.squad_uuid ? squadsMap[c.squad_uuid] : null;

        return {
          "Program Code": c.Program_Code,
          "Program Title": prog?.Program_Title || c.Program_Code,
          "Candidate AddNo": c.Candidate_Code,
          "Student Name": student?.StudentName || c.Candidate_Code,
          "Class": student?.Class || "N/A",
          "College": student?.CollegeName || "N/A",
          "Format": c.squad_uuid ? "Squad Member" : "Individual",
          "Squad Name": squad?.squad_title || "N/A",
        };
      });

      if (rows.length === 0) {
        alert("No candidate records to export.");
        return;
      }
      exportToExcel(rows, `${wingPrefix}_Candidates_${timestamp}.xlsx`, "Candidates");
    } else if (activeTab === "topics") {
      const rows = filteredTopics.map((t) => {
        const prog = progMap[t.program_code];
        const student = t.student_addNo ? studentsMap[t.student_addNo] : null;

        return {
          "Program Code": t.program_code,
          "Program Title": prog?.Program_Title || t.program_code,
          "Topic Title": t.topic_title,
          "Description": t.topic_content || "",
          "Student AddNo": t.student_addNo || "N/A",
          "Student Name": student?.StudentName || t.student_addNo || "N/A",
          "Approval Status": t.is_approved ? "Approved" : "Pending",
          "Submitted At": t.created_at || "N/A",
        };
      });

      if (rows.length === 0) {
        alert("No topic records to export.");
        return;
      }
      exportToExcel(rows, `${wingPrefix}_Topics_${timestamp}.xlsx`, "Topics");
    } else if (activeTab === "content") {
      const rows = filteredContents.map((ct) => {
        const prog = progMap[ct.programe_code];
        const student = ct.student_addNo ? studentsMap[ct.student_addNo] : null;

        return {
          "Program Code": ct.programe_code,
          "Program Title": prog?.Program_Title || ct.programe_code,
          "Content Title": ct.content_title || "Untitled",
          "Student AddNo": ct.student_addNo || "N/A",
          "Student Name": student?.StudentName || ct.student_addNo || "N/A",
          "Likes": ct.like_count || 0,
          "File URL": ct.content_file || "None",
          "Submitted At": ct.created_at || "N/A",
        };
      });

      if (rows.length === 0) {
        alert("No content submissions to export.");
        return;
      }
      exportToExcel(rows, `${wingPrefix}_Content_${timestamp}.xlsx`, "Content");
    } else if (activeTab === "squads") {
      const rows = filteredSquads.map((item) => {
        return {
          "Squad Title": item.squad.squad_title,
          "Program Code": item.programCode,
          "Program Title": item.programTitle,
          "Members Count": item.memberAddNos.length,
          "Member AddNos": item.memberAddNos.join(", "),
          "Member Names": item.memberAddNos.map((m) => studentsMap[m]?.StudentName || m).join(", "),
          "Total Points": item.squad.total_points || 0,
        };
      });

      if (rows.length === 0) {
        alert("No squad records to export.");
        return;
      }
      exportToExcel(rows, `${wingPrefix}_Squads_${timestamp}.xlsx`, "Squads");
    }
  };

  if (loading && !wingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-600 animate-pulse">
          Loading Wing Registration Hub...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-3xl p-6 text-center text-red-600 space-y-3">
        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
        <h3 className="font-extrabold text-base">Registration Access Error</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => loadWingRegistrations()}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-red-700 transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6 pb-28 font-sans">
      {/* 1. Header Banner */}
      <div className="relative bg-gradient-to-r from-teal-700 via-cyan-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-40 h-40 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <UserCheck className="w-6 h-6 text-teal-300" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                Wing Registrations & Submissions Hub
              </span>
              <span className="text-xs font-mono text-cyan-200 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-400/20">
                {wingData?.WingCode}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {wingData?.WingTitle || "Wing Space"} — Registrations Hub
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
              Consolidated registry of all event registrations, topic approvals, squad formations, and content submissions strictly for <strong>{wingData?.WingTitle} ({wingData?.WingCode})</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadWingRegistrations(true)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 backdrop-blur-sm"
              title="Refresh Records"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              onClick={handleExportCurrentView}
              className="px-4 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:bg-slate-100 cursor-pointer"
              title="Export Current View to Excel"
            >
              <Download size={14} />
              <span>Export {activeTab.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Candidates</span>
            <UserCheck size={16} className="text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalMetrics.totalCandidates}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            {totalMetrics.uniqueCandidates} unique students
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Squads</span>
            <Users size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalMetrics.totalSquads}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Registered teams</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Topics</span>
            <FileText size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalMetrics.totalTopics}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {totalMetrics.approvedTopics} approved • {totalMetrics.pendingTopics} pending
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Contents</span>
            <Send size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalMetrics.totalContents}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Files & texts</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Events</span>
            <Calendar size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalMetrics.activeProgrammesCount}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            of {programmes.length} total events
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Wing Code</span>
            <Shield size={16} className="text-slate-500" />
          </div>
          <p className="text-lg font-black text-slate-900 font-mono truncate">
            {wingData?.WingCode || "W"}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            ✓ Strictly Isolated
          </span>
        </div>
      </div>

      {/* 3. Filter Controls Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Programme Title Filter (Requested Feature) */}
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Filter size={13} className="text-teal-600" />
              <span>Filter by Programme Title</span>
              <span className="text-slate-400 font-normal">
                ({onlyWithRegistrations ? programmesWithActions.length : programmes.length} events)
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedProgramCode}
                onChange={(e) => setSelectedProgramCode(e.target.value)}
                className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:border-teal-500 focus:outline-hidden transition shadow-2xs appearance-none cursor-pointer"
              >
                <option value="all">
                  🌟 All Wing Programmes ({programmes.length})
                </option>
                {(onlyWithRegistrations ? programmesWithActions : programmes).map((p) => {
                  const counts = programmeActionCounts[p.Program_Code];
                  const hasActions = counts && counts.total > 0;
                  const catName = p.Category ? (meta.categoryMap[p.Category] || p.Category) : "General";
                  return (
                    <option key={p.Program_Code} value={p.Program_Code}>
                      {hasActions ? "🟢" : "⚪"} {p.Program_Title || "Untitled"}, Category({catName}) — (Cands: {counts?.candidates || 0}, Topics: {counts?.topics || 0}, Contents: {counts?.content || 0})
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Quick Toggle: Only programmes with registrations */}
          <div className="flex items-center gap-3 self-start lg:self-end pt-1">
            <button
              type="button"
              onClick={() => setOnlyWithRegistrations(!onlyWithRegistrations)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                onlyWithRegistrations
                  ? "bg-teal-50 text-teal-800 border-teal-300 shadow-2xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyWithRegistrations ? "bg-teal-600 animate-pulse" : "bg-slate-400"}`} />
              <span>Only Programmes with Actions ({programmesWithActions.length})</span>
            </button>

            {selectedProgramCode !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedProgramCode("all")}
                className="px-2.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
              >
                Clear Programme Filter
              </button>
            )}
          </div>
        </div>

        {/* Search Input & Action Tabs */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Action Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                activeTab === "all"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Actions ({filteredCandidates.length + filteredTopics.length + filteredContents.length})
            </button>

            <button
              onClick={() => setActiveTab("candidates")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "candidates"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <UserCheck size={13} />
              <span>Candidates ({filteredCandidates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("squads")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "squads"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users size={13} />
              <span>Squads ({filteredSquads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("topics")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "topics"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText size={13} />
              <span>Topics ({filteredTopics.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("content")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === "content"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Send size={13} />
              <span>Contents ({filteredContents.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate, AddNo, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-hidden bg-slate-50 hover:bg-white focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Selected Program Indicator Banner */}
        {selectedProgramCode !== "all" && progMap[selectedProgramCode] && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-600 text-white rounded-lg">
                <Calendar size={14} />
              </span>
              <div>
                <span className="font-extrabold text-teal-900">
                  {progMap[selectedProgramCode].Program_Title || selectedProgramCode}
                </span>
                <span className="text-[11px] text-teal-700 ml-2 font-mono">
                  [{selectedProgramCode}] • {formatResultDate(progMap[selectedProgramCode].Date)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setPrintModalProgram({
                    code: selectedProgramCode,
                    title: progMap[selectedProgramCode].Program_Title || selectedProgramCode,
                  })
                }
                className="px-3 py-1.5 bg-white border border-teal-300 text-teal-800 rounded-xl font-bold flex items-center gap-1.5 hover:bg-teal-100 transition cursor-pointer shadow-2xs"
              >
                <Printer size={13} />
                <span>Print Official Sheet</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Display Content Sections */}

      {/* TAB: CANDIDATES */}
      {(activeTab === "candidates" || activeTab === "all") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={16} className="text-teal-600" />
              <span>Registered Candidates ({filteredCandidates.length})</span>
            </h2>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs font-semibold">
              No candidate registrations found matching criteria.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Candidate Profile</th>
                      <th className="py-3 px-4">Class & College</th>
                      <th className="py-3 px-4">Programme</th>
                      <th className="py-3 px-4">Format / Squad</th>
                      <th className="py-3 px-4">Registered Topic</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCandidates.map((c, idx) => {
                      const student = studentsMap[c.Candidate_Code];
                      const prog = progMap[c.Program_Code];
                      const squad = c.squad_uuid ? squadsMap[c.squad_uuid] : null;

                      const candTopic = topics.find(
                        (t) =>
                          t.program_code === c.Program_Code &&
                          ((t.student_addNo &&
                            (t.student_addNo.trim() === c.Candidate_Code.trim() ||
                              t.student_addNo.trim().toUpperCase() === c.Candidate_Code.trim().toUpperCase())) ||
                            (c.squad_uuid && t.team_uuid && t.team_uuid.trim() === c.squad_uuid.trim()))
                      );
                      const isTopicReq = Boolean(prog?.is_topic_required);

                      const standardName =
                        (student?.Stn_Class && (meta.classStandardNameMap?.[student.Stn_Class] || meta.classMap[student.Stn_Class])) ||
                        (student?.Class && (meta.classStandardNameMap?.[student.Class] || meta.classMap[student.Class])) ||
                        student?.Class ||
                        "Standard N/A";
                      const campusName = student?.CollegeName || "DHIU Main Campus";
                      const categoryName =
                        (prog?.Category && meta.categoryMap[prog.Category]) ||
                        prog?.Category ||
                        "General / Open";

                      return (
                        <tr key={c.CandidateUUiD ? `${c.CandidateUUiD}_${idx}` : `${c.Program_Code}_${c.Candidate_Code}_${idx}`} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px] font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                <SafeImage
                                  src={student?.Student_Photo_Urls}
                                  alt={student?.StudentName || c.Candidate_Code}
                                  fallbackCategory="student"
                                  fallbackText={student?.StudentName || c.Candidate_Code}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 block truncate">
                                  {student?.StudentName || c.Candidate_Code}
                                </span>
                                <span className="text-[11px] font-mono text-teal-700 block">
                                  AddNo: {c.Candidate_Code}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 block text-xs">
                              {standardName}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[150px]" title={campusName}>
                              {campusName}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={prog?.Program_Title || c.Program_Code}>
                              {prog?.Program_Title || c.Program_Code}
                            </span>
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                              {categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {c.squad_uuid && squad ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                                  <Users size={11} /> {squad.squad_title}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                                Individual
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {candTopic ? (
                              <div className="space-y-1">
                                <div
                                  className="font-bold text-slate-900 truncate max-w-[200px]"
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
                            ) : isTopicReq ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock size={10} /> Topic Pending
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {prog && (
                              <button
                                onClick={() =>
                                  setPrintModalProgram({
                                    code: prog.Program_Code,
                                    title: prog.Program_Title || prog.Program_Code,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                                title="Print Candidate Sheet for this event"
                              >
                                <Printer size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SQUADS */}
      {(activeTab === "squads" || activeTab === "all") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-purple-600" />
              <span>Event Squad Registrations ({filteredSquads.length})</span>
            </h2>
          </div>

          {filteredSquads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs font-semibold">
              No squad registrations found for this wing's events.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSquads.map((item, idx) => {
                const leaderAddNo = item.squad.member1_uuid;
                const leader = leaderAddNo ? studentsMap[leaderAddNo] : null;

                return (
                  <div
                    key={`${item.squad.squad_id}_${item.programCode}_${idx}`}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-base">
                            {item.squad.squad_title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            Squad
                          </span>
                        </div>
                        <span className="text-xs text-teal-700 font-bold block mt-0.5">
                          Event: {item.programTitle} [{item.programCode}]
                        </span>
                        {leader && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Leader: {leader.StudentName} ({leader.AddNo})
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                        {item.squad.total_points || 0} pts
                      </span>
                    </div>

                    {/* Member Avatars & List */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                        Squad Roster ({item.memberAddNos.length} members)
                      </span>
                      <div className="space-y-1.5">
                        {item.memberAddNos.map((m, mIdx) => {
                          const isLeader = m === leaderAddNo;
                          const stn = studentsMap[m];
                          return (
                            <div
                              key={`${item.squad.squad_id}_${item.programCode}_${m}_${mIdx}`}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                                isLeader
                                  ? "bg-amber-50/70 border-amber-200 font-semibold"
                                  : "bg-slate-50 border-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isLeader ? (
                                  <Crown size={13} className="text-amber-500 shrink-0" />
                                ) : (
                                  <Users size={13} className="text-slate-400 shrink-0" />
                                )}
                                <span className="font-mono font-bold text-indigo-700 text-[11px]">
                                  {m}
                                </span>
                                <span className="text-slate-800 truncate">
                                  {stn?.StudentName || m}
                                </span>
                              </div>
                              {stn?.Class && (
                                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                  {stn.Class}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: TOPICS REGISTRY */}
      {(activeTab === "topics" || activeTab === "all") && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span>Registered Candidate Topics ({filteredTopics.length})</span>
            </h2>

            {/* Approval Filter Chips */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "approved"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                Approved ({totalMetrics.approvedTopics})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700"
                }`}
              >
                Pending ({totalMetrics.pendingTopics})
              </button>
            </div>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs font-semibold">
              No registered topics found for this wing's events.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => {
                const prog = progMap[topic.program_code];
                const student = topic.student_addNo ? studentsMap[topic.student_addNo] : null;
                const isUpdating = updatingTopicId === topic.topic_id;

                return (
                  <div
                    key={topic.topic_id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            topic.is_approved
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {topic.is_approved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          <span>{topic.is_approved ? "Approved" : "Pending Review"}</span>
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {topic.created_at ? formatResultDate(topic.created_at) : ""}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                        {topic.topic_title}
                      </h3>

                      {topic.topic_content && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {topic.topic_content}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">
                            {student?.StudentName || topic.student_addNo || "Candidate"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            AddNo: {topic.student_addNo}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                          {prog?.Program_Title || topic.program_code}
                        </span>
                      </div>
                    </div>

                    {/* Wing Admin Inline Actions */}
                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTopic(topic)}
                        className="text-xs text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} /> View Description
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleTopicApproval(topic)}
                        disabled={isUpdating}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          topic.is_approved
                            ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        }`}
                      >
                        {isUpdating ? (
                          <span>Updating...</span>
                        ) : topic.is_approved ? (
                          <>
                            <X size={12} /> Revoke Approval
                          </>
                        ) : (
                          <>
                            <Check size={12} /> Approve Topic
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: CONTENT SUBMISSIONS */}
      {(activeTab === "content" || activeTab === "all") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Send size={16} className="text-amber-500" />
              <span>Candidate Content Submissions ({filteredContents.length})</span>
            </h2>
          </div>

          {filteredContents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs font-semibold">
              No content submissions recorded for this wing's events.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContents.map((content) => {
                const prog = progMap[content.programe_code];
                const student = content.student_addNo ? studentsMap[content.student_addNo] : null;

                return (
                  <div
                    key={content.content_id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-mono text-[10px] truncate max-w-[200px]" title={prog?.Program_Title || content.programe_code}>
                          [{content.programe_code}] {prog?.Program_Title ? `• ${prog.Program_Title}` : ""}
                        </span>
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          ❤️ {content.like_count || 0}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm mb-1 line-clamp-1">
                        {content.content_title || "Untitled Submission"}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                        {content.content_text || "Submission file attachment provided below."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 text-xs block truncate">
                          {student?.StudentName || content.student_addNo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {content.student_addNo}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {content.content_file && (
                          <a
                            href={content.content_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                            title="Open / Download Attached Document"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewContent(content)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL DIALOGS */}

      {/* Topic Preview Modal */}
      {previewTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setPreviewTopic(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <FileText className="text-blue-600" size={20} />
              <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                Topic Proposal Details
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              {previewTopic.topic_title}
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs space-y-1">
              <div>
                <span className="text-slate-400 font-bold">Event: </span>
                <span className="text-slate-800 font-semibold">
                  {progMap[previewTopic.program_code]?.Program_Title || previewTopic.program_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">Candidate: </span>
                <span className="text-slate-800 font-semibold">
                  {studentsMap[previewTopic.student_addNo || ""]?.StudentName || previewTopic.student_addNo} ({previewTopic.student_addNo})
                </span>
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Full Description / Outline
              </span>
              <p className="text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 p-3 rounded-xl max-h-56 overflow-y-auto whitespace-pre-wrap">
                {previewTopic.topic_content || "No detailed outline provided."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewTopic(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleToggleTopicApproval(previewTopic);
                  setPreviewTopic((prev) => prev ? { ...prev, is_approved: !prev.is_approved } : null);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                  previewTopic.is_approved ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {previewTopic.is_approved ? "Revoke Approval" : "Approve Topic Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setPreviewContent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Send className="text-amber-500" size={20} />
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">
                Submitted Content Preview
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              {previewContent.content_title || "Untitled Content"}
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              Submitted by{" "}
              <strong>
                {studentsMap[previewContent.student_addNo || ""]?.StudentName || previewContent.student_addNo}
              </strong>{" "}
              for{" "}
              <strong>
                {progMap[previewContent.programe_code]?.Program_Title || previewContent.programe_code}
              </strong>
            </p>

            <div className="space-y-1 mb-6">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Content Body
              </span>
              <div className="text-xs text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 p-4 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap">
                {previewContent.content_text || "No plain text supplied."}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {previewContent.content_file ? (
                <a
                  href={previewContent.content_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  <Download size={13} />
                  <span>Download / View Attachment</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">No file attachment</span>
              )}

              <button
                type="button"
                onClick={() => setPreviewContent(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official A4 Print Candidate Sheet Modal */}
      {printModalProgram && (
        <PrintCandidateSheetModal
          isOpen={Boolean(printModalProgram)}
          programCode={printModalProgram.code}
          initialProgramTitle={printModalProgram.title}
          onClose={() => setPrintModalProgram(null)}
        />
      )}
    </div>
  );
}
