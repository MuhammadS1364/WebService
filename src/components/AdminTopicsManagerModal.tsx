import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { exportToExcel } from "../lib/excelService";
import {
  FileText,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";

interface TopicItem {
  topic_id: string;
  topic_title: string;
  program_code: string;
  student_addNo?: string | null;
  team_uuid?: string | null;
  topic_content?: string | null;
  is_approved: boolean;
  created_at: string;
  studentName?: string;
  programTitle?: string;
}

interface AdminTopicsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  programCode?: string; // If provided, filters for that specific program
  programTitle?: string;
}

export default function AdminTopicsManagerModal({
  isOpen,
  onClose,
  programCode,
  programTitle,
}: AdminTopicsManagerModalProps) {
  if (!isOpen) return null;

  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedTopicForPreview, setSelectedTopicForPreview] = useState<TopicItem | null>(null);

  useEffect(() => {
    fetchTopics();
  }, [programCode]);

  const fetchTopics = async () => {
    try {
      setLoading(true);

      let query = SupaBaseFunction.from("Topics_Box")
        .select("*")
        .order("created_at", { ascending: false });

      if (programCode) {
        query = query.eq("program_code", programCode);
      }

      const { data: topicsData, error: topicsError } = await query;
      if (topicsError) throw topicsError;

      // Also fetch Students for name resolution
      const studentAddNos = Array.from(
        new Set((topicsData || []).map((t: any) => t.student_addNo).filter(Boolean))
      );

      let studentMap: Record<string, string> = {};
      if (studentAddNos.length > 0) {
        const { data: stnData } = await SupaBaseFunction.from("StudentsBox")
          .select("AddNo, StudentName")
          .in("AddNo", studentAddNos);

        (stnData || []).forEach((s: any) => {
          studentMap[s.AddNo] = s.StudentName;
        });
      }

      // Also fetch Programmes for title resolution if no specific programCode passed
      let progMap: Record<string, string> = {};
      if (!programCode) {
        const progCodes = Array.from(
          new Set((topicsData || []).map((t: any) => t.program_code).filter(Boolean))
        );
        if (progCodes.length > 0) {
          const { data: progData } = await SupaBaseFunction.from("ProgrammesBox")
            .select("Program_Code, Program_Title")
            .in("Program_Code", progCodes);
          (progData || []).forEach((p: any) => {
            progMap[p.Program_Code] = p.Program_Title || p.Program_Code;
          });
        }
      }

      const enriched: TopicItem[] = (topicsData || []).map((t: any) => ({
        ...t,
        studentName: t.student_addNo ? studentMap[t.student_addNo] || `Student #${t.student_addNo}` : "Team Entry",
        programTitle: programCode ? programTitle : progMap[t.program_code] || t.program_code,
      }));

      setTopics(enriched);
    } catch (err) {
      console.error("Error loading topics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (topic: TopicItem) => {
    try {
      setActionLoadingId(topic.topic_id);
      const newStatus = !topic.is_approved;

      const { error } = await SupaBaseFunction.from("Topics_Box")
        .update({ is_approved: newStatus })
        .eq("topic_id", topic.topic_id);

      if (error) throw error;

      setTopics((prev) =>
        prev.map((t) => (t.topic_id === topic.topic_id ? { ...t, is_approved: newStatus } : t))
      );
    } catch (err: any) {
      alert("Failed to update topic status: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!window.confirm("Are you sure you want to delete this registered topic? This action cannot be undone.")) {
      return;
    }

    try {
      setActionLoadingId(topicId);
      const { error } = await SupaBaseFunction.from("Topics_Box")
        .delete()
        .eq("topic_id", topicId);

      if (error) throw error;

      setTopics((prev) => prev.filter((t) => t.topic_id !== topicId));
      if (selectedTopicForPreview?.topic_id === topicId) setSelectedTopicForPreview(null);
    } catch (err: any) {
      alert("Failed to delete topic: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExport = () => {
    if (filteredTopics.length === 0) return alert("No topics to export.");

    const rows = filteredTopics.map((t, index) => ({
      "#": index + 1,
      "Topic Title": t.topic_title,
      "Program Code": t.program_code,
      "Program Title": t.programTitle || t.program_code,
      "Student / Participant": t.studentName,
      "Admission No": t.student_addNo || "N/A",
      "Status": t.is_approved ? "Approved" : "Pending",
      "Submitted On": new Date(t.created_at).toLocaleDateString(),
      "Topic Content / Lyrics": t.topic_content || "",
    }));

    exportToExcel(
      rows,
      `Registered_Topics_${programCode || "All"}_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Topics"
    );
  };

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.topic_title.toLowerCase().includes(q) ||
        (t.studentName && t.studentName.toLowerCase().includes(q)) ||
        (t.student_addNo && t.student_addNo.toLowerCase().includes(q)) ||
        t.program_code.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "approved"
          ? t.is_approved
          : !t.is_approved;

      return matchesSearch && matchesStatus;
    });
  }, [topics, searchQuery, statusFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 sm:p-6 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Topics Registry (Topics_Box)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Registered Programme Topics
            </h2>
            <p className="text-xs text-slate-300">
              {programCode
                ? `Showing candidate topics for ${programTitle || programCode}`
                : "Manage and approve competition topics across all programmes"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search topic title, candidate name, or add no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Statuses ({topics.length})</option>
              <option value="pending">
                Pending ({topics.filter((t) => !t.is_approved).length})
              </option>
              <option value="approved">
                Approved ({topics.filter((t) => t.is_approved).length})
              </option>
            </select>

            <button
              type="button"
              onClick={handleExport}
              disabled={filteredTopics.length === 0}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Fetching registered topics...</span>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
              <FileText size={32} className="text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Registered Topics Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "No topics match the search criteria."
                  : "No participants have submitted a topic for this event yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTopics.map((item) => (
                <div
                  key={item.topic_id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-2xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.is_approved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.is_approved ? (
                          <>
                            <CheckCircle2 size={11} /> Approved
                          </>
                        ) : (
                          <>
                            <Clock size={11} /> Pending Review
                          </>
                        )}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.program_code}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                      {item.topic_title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{item.studentName}</span>
                      {item.student_addNo && (
                        <span className="font-mono text-slate-400 text-[11px]">
                          (#{item.student_addNo})
                        </span>
                      )}
                    </div>

                    {item.topic_content && (
                      <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-xl font-mono border border-slate-100">
                        {item.topic_content}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      disabled={actionLoadingId === item.topic_id}
                      onClick={() => handleToggleApproval(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        item.is_approved
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      }`}
                    >
                      {actionLoadingId === item.topic_id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : item.is_approved ? (
                        <>
                          <XCircle size={13} /> Unapprove
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} /> Approve
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoadingId === item.topic_id}
                      onClick={() => handleDeleteTopic(item.topic_id)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                      title="Delete topic registration"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>Total registered topics: {filteredTopics.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
