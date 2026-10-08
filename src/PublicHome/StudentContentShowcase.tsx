import { useState, useEffect, useMemo, useRef } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { uploadImageToImgBB } from "../lib/imgbbService";
import SafeImage from "../lib/SafeImage";
import {
  Heart,
  BookOpen,
  User,
  Search,
  Sparkles,
  Share2,
  Check,
  ThumbsUp,
  FileText,
  Plus,
  X,
  Upload,
  Link as LinkIcon,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileType,
} from "lucide-react";

export interface StudentContentItem {
  content_id: string;
  created_at: string;
  content_title: string;
  programe_code: string | null;
  student_addNo: string | null;
  like_count: number;
  content_text?: string | null;
  content_file?: string | null;
}

interface EnrichedContentItem extends StudentContentItem {
  studentName?: string;
  studentPhoto?: string | null;
  studentClass?: string | null;
  studentCollege?: string | null;
  programTitle?: string;
  programWing?: string | null;
  programGroup?: string | null;
}

export default function StudentContentShowcase() {
  const meta = useProgrammeMeta();
  const [items, setItems] = useState<EnrichedContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedWing, setSelectedWing] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItemForRead, setSelectedItemForRead] = useState<EnrichedContentItem | null>(null);

  // Track liked IDs in local storage to prevent double-liking
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("liked_content_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchContents = async () => {
    try {
      setLoading(true);

      // 1. Fetch from Content_Table
      const { data: contentData, error: contentError } = await SupaBaseFunction
        .from("Content_Table")
        .select("*")
        .order("created_at", { ascending: false });

      if (contentError) throw contentError;

      const rawContents = (contentData as StudentContentItem[]) || [];

      if (rawContents.length === 0) {
        setItems([]);
        return;
      }

      // Collect foreign keys to hydrate details in bulk
      const addNos = Array.from(new Set(rawContents.map(c => c.student_addNo).filter(Boolean))) as string[];
      const progCodes = Array.from(new Set(rawContents.map(c => c.programe_code).filter(Boolean))) as string[];

      // 2. Fetch Students details
      const studentsMap: Record<string, { name: string; photo?: string | null; class?: string | null; college?: string | null }> = {};
      if (addNos.length > 0) {
        const { data: stnData } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Student_Photo_Urls, Class, CollegeName")
          .in("AddNo", addNos);

        (stnData || []).forEach((stn: any) => {
          studentsMap[stn.AddNo] = {
            name: stn.StudentName || `Student #${stn.AddNo}`,
            photo: stn.Student_Photo_Urls,
            class: stn.Class,
            college: stn.CollegeName,
          };
        });
      }

      // 3. Fetch Programmes details
      const progMap: Record<string, { title: string; wing?: string | null; group?: string | null }> = {};
      if (progCodes.length > 0) {
        const { data: progData } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, WingCode, Group")
          .in("Program_Code", progCodes);

        (progData || []).forEach((p: any) => {
          progMap[p.Program_Code] = {
            title: p.Program_Title || p.Program_Code,
            wing: p.WingCode,
            group: p.Group,
          };
        });
      }

      // Combine enriched items
      const enriched: EnrichedContentItem[] = rawContents.map(c => {
        const stn = c.student_addNo ? studentsMap[c.student_addNo] : undefined;
        const prg = c.programe_code ? progMap[c.programe_code] : undefined;

        return {
          ...c,
          studentName: stn?.name || (c.student_addNo ? `Student #${c.student_addNo}` : "Anonymous Contributor"),
          studentPhoto: stn?.photo,
          studentClass: stn?.class,
          studentCollege: stn?.college,
          programTitle: prg?.title || (c.programe_code ? `Programme #${c.programe_code}` : "General Submission"),
          programWing: prg?.wing,
          programGroup: prg?.group,
        };
      });

      setItems(enriched);
    } catch (err) {
      console.error("Failed fetching student contents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  // Handle Like Button Click with real-time optimistic update and Supabase increment
  const handleLike = async (item: EnrichedContentItem) => {
    const isAlreadyLiked = likedIds.has(item.content_id);
    const newCount = isAlreadyLiked ? Math.max(0, (item.like_count || 0) - 1) : (item.like_count || 0) + 1;

    // Optimistic UI update
    setItems(prev =>
      prev.map(i => (i.content_id === item.content_id ? { ...i, like_count: newCount } : i))
    );

    const nextLiked = new Set(likedIds);
    if (isAlreadyLiked) {
      nextLiked.delete(item.content_id);
    } else {
      nextLiked.add(item.content_id);
    }
    setLikedIds(nextLiked);
    try {
      localStorage.setItem("liked_content_ids", JSON.stringify(Array.from(nextLiked)));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }

    try {
      await SupaBaseFunction
        .from("Content_Table")
        .update({ like_count: newCount })
        .eq("content_id", item.content_id);
    } catch (err) {
      console.error("Failed updating like count:", err);
    }
  };

  // Copy share link
  const handleShare = (item: EnrichedContentItem) => {
    const textToCopy = `"${item.content_title}" by ${item.studentName} for ${item.programTitle} - Anjuman-e-Huda (CHS)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(item.content_id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filtered and Sorted Contents
  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      // Wing filter
      if (selectedWing !== "all" && item.programWing !== selectedWing) return false;

      // Search matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const title = (item.content_title || "").toLowerCase();
      const text = (item.content_text || "").toLowerCase();
      const author = (item.studentName || "").toLowerCase();
      const prgTitle = (item.programTitle || "").toLowerCase();
      const addNo = (item.student_addNo || "").toLowerCase();
      const code = (item.programe_code || "").toLowerCase();

      return (
        title.includes(q) ||
        text.includes(q) ||
        author.includes(q) ||
        prgTitle.includes(q) ||
        addNo.includes(q) ||
        code.includes(q)
      );
    });

    // Sorting
    if (sortBy === "popular") {
      result.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [items, searchQuery, selectedWing, sortBy]);

  const uniqueWings = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.programWing).filter(Boolean))) as string[];
    return list.sort();
  }, [items]);

  // Check if string is an image URL
  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    if (url.startsWith("data:image/")) return true;
    return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <Sparkles size={13} className="text-emerald-600" />
            <span>Public Student Creative & Literary Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Student Content & Literary Showcase
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
            Explore articles, essays, speeches, and creative submissions created by registered students of Anjuman-e-Huda (CHS) for university programmes.
          </p>
        </div>

        {/* Action Button: Create New Content Form Modal */}
        <div className="shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-emerald-700/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus size={16} />
            <span>Submit New Content</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search by student name, title, keywords, or programme..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Wing Filter */}
        {uniqueWings.length > 0 && (
          <div className="shrink-0">
            <select
              value={selectedWing}
              onChange={e => setSelectedWing(e.target.value)}
              className="w-full md:w-auto px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Wings</option>
              {uniqueWings.map(w => (
                <option key={w} value={w}>
                  {meta.wingMap[w] || w}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Tab */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSortBy("latest")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              sortBy === "latest" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortBy("popular")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              sortBy === "popular" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ThumbsUp size={12} /> Most Liked
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
                </div>
              </div>
              <div className="h-14 bg-slate-100 rounded-xl" />
              <div className="h-8 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <BookOpen size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Student Content Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No student submission matches your current search keywords."
              : "Be the first to share! Click 'Submit New Content' to add a student submission."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 transition"
          >
            <Plus size={14} /> Submit First Submission
          </button>
        </div>
      ) : (
        /* Content Cards Grid: Upgraded Context Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => {
            const isLiked = likedIds.has(item.content_id);
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })
              : "Recently";

            const hasImageFile = isImageUrl(item.content_file);

            return (
              <div
                key={item.content_id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden p-5 group"
              >
                {/* Author Info Bar */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-0.5 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {item.studentPhoto ? (
                        <SafeImage
                          src={item.studentPhoto}
                          alt={item.studentName || "Author"}
                          fallbackCategory="student"
                          fallbackText={item.studentName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-sm flex items-center justify-center">
                          {(item.studentName || "S")[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5" title={item.studentName}>
                        <User size={12} className="text-emerald-600 shrink-0" />
                        <span className="truncate">{item.studentName}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {item.studentClass || "Student"} {item.student_addNo ? `• #${item.student_addNo}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-150">
                    {dateStr}
                  </span>
                </div>

                {/* Content Details & Body Snippet */}
                <div className="py-3.5 space-y-3 grow flex flex-col">
                  {/* Title */}
                  <div className="flex items-start gap-2">
                    <FileText size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <h3
                      onClick={() => setSelectedItemForRead(item)}
                      className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 hover:text-emerald-700 transition cursor-pointer"
                      title={item.content_title}
                    >
                      {item.content_title}
                    </h3>
                  </div>

                  {/* Content Text Snippet (If Present) */}
                  {item.content_text && item.content_text !== "content_text" && (
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 text-xs text-slate-700 leading-relaxed font-normal">
                      <p className="line-clamp-3 italic">
                        "{item.content_text}"
                      </p>
                      {item.content_text.length > 130 && (
                        <button
                          type="button"
                          onClick={() => setSelectedItemForRead(item)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline mt-1 block cursor-pointer"
                        >
                          Read full content →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Attached File Preview (If Image or File Link) */}
                  {item.content_file && (
                    <div className="mt-auto pt-1">
                      {hasImageFile ? (
                        <div
                          onClick={() => setSelectedItemForRead(item)}
                          className="relative h-28 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group/img"
                        >
                          <img
                            src={item.content_file}
                            alt={item.content_title}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Eye size={14} /> View Visual
                          </div>
                        </div>
                      ) : (
                        <a
                          href={item.content_file}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-between w-full p-2.5 bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/80 rounded-2xl text-[11px] font-bold text-emerald-800 transition group/doc"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <FileType size={14} className="text-emerald-700 shrink-0" />
                            <span className="truncate">Attached Submission Document</span>
                          </span>
                          <Download size={13} className="text-emerald-600 shrink-0 group-hover/doc:translate-y-0.5 transition-transform" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Associated Programme Badge */}
                  <div className="pt-1">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-700 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-mono font-bold text-emerald-700 block">
                          Programme Entry
                        </span>
                        <p className="font-bold text-slate-900 truncate" title={item.programTitle}>
                          {item.programTitle}
                        </p>
                      </div>
                      {item.programWing && (
                        <span className="shrink-0 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                          {item.programWing}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar with Interactive Like Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => handleLike(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      isLiked
                        ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Heart
                      size={14}
                      className={isLiked ? "fill-rose-500 text-rose-500" : "text-slate-500"}
                    />
                    <span>{item.like_count || 0}</span>
                    <span className="font-normal text-[11px]">
                      {isLiked ? "Liked" : "Like"}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Read Full Content Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => setSelectedItemForRead(item)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center gap-1"
                      title="Read Full Content"
                    >
                      <Eye size={14} />
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => handleShare(item)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                      title="Share Showcase"
                    >
                      {copiedId === item.content_id ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Share2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE NEW CONTENT INFO FORM (Content_Table)
          ========================================================================= */}
      {isCreateModalOpen && (
        <CreateContentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchContents();
          }}
        />
      )}

      {/* =========================================================================
          MODAL 2: FULL CONTENT READER MODAL
          ========================================================================= */}
      {selectedItemForRead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <FileText size={11} /> Student Submission
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                  {selectedItemForRead.content_title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForRead(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Author Profile Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedItemForRead.studentPhoto ? (
                    <SafeImage
                      src={selectedItemForRead.studentPhoto}
                      alt={selectedItemForRead.studentName || "Author"}
                      fallbackCategory="student"
                      fallbackText={selectedItemForRead.studentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-emerald-800 text-lg">
                      {(selectedItemForRead.studentName || "S")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedItemForRead.studentName}</h4>
                  <p className="text-xs text-slate-500">
                    {selectedItemForRead.studentClass || "Student"} {selectedItemForRead.studentCollege ? `• ${selectedItemForRead.studentCollege}` : ""}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Admission ID: {selectedItemForRead.student_addNo || "N/A"}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="font-bold text-slate-600 block">Programme</span>
                <span className="font-semibold text-emerald-700 truncate block max-w-[140px]" title={selectedItemForRead.programTitle}>
                  {selectedItemForRead.programTitle}
                </span>
              </div>
            </div>

            {/* Full Content Text */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Content Body</h4>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedItemForRead.content_text && selectedItemForRead.content_text !== "content_text"
                  ? selectedItemForRead.content_text
                  : "No written text provided for this submission. Check attached document below."}
              </div>
            </div>

            {/* Attached File (Image or Document) */}
            {selectedItemForRead.content_file && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attachment</h4>
                {isImageUrl(selectedItemForRead.content_file) ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-80 flex items-center justify-center">
                    <img
                      src={selectedItemForRead.content_file}
                      alt="Attachment Preview"
                      className="w-full h-auto max-h-80 object-contain"
                    />
                  </div>
                ) : (
                  <a
                    href={selectedItemForRead.content_file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 transition"
                  >
                    <span className="flex items-center gap-2">
                      <FileType size={16} />
                      <span>Download Attached Submission File</span>
                    </span>
                    <Download size={15} />
                  </a>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleLike(selectedItemForRead)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition"
              >
                <Heart size={14} className={likedIds.has(selectedItemForRead.content_id) ? "fill-rose-500" : ""} />
                <span>{selectedItemForRead.like_count || 0} Likes</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedItemForRead(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// CREATE NEW CONTENT MODAL COMPONENT (Content_Table)
// =========================================================================
interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateContentModal({ isOpen, onClose, onSuccess }: CreateContentModalProps) {
  const [contentTitle, setContentTitle] = useState("");
  const [programeCode, setProgrameCode] = useState("");
  const [studentAddNo, setStudentAddNo] = useState("");
  const [contentText, setContentText] = useState("");
  const [fileMode, setFileMode] = useState<"upload" | "url">("upload");
  const [contentFileUrl, setContentFileUrl] = useState("");
  const [filePreview, setFilePreview] = useState<string>("");

  const [availableProgrammes, setAvailableProgrammes] = useState<any[]>([]);
  const [verifiedStudent, setVerifiedStudent] = useState<any | null>(null);
  const [verifyingStudent, setVerifyingStudent] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available programmes for dropdown
  useEffect(() => {
    const fetchProgrammes = async () => {
      try {
        const { data } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, WingCode")
          .order("Program_Title");
        setAvailableProgrammes(data || []);
      } catch (e) {
        console.warn("Could not load programmes list", e);
      }
    };
    fetchProgrammes();
  }, []);

  // Verify Student AddNo live against StudentsBox
  useEffect(() => {
    const verifyStudent = async () => {
      const trimmed = studentAddNo.trim();
      if (!trimmed) {
        setVerifiedStudent(null);
        return;
      }
      try {
        setVerifyingStudent(true);
        const { data } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Class, CollegeName, Student_Photo_Urls")
          .eq("AddNo", trimmed)
          .maybeSingle();

        setVerifiedStudent(data || null);
      } catch {
        setVerifiedStudent(null);
      } finally {
        setVerifyingStudent(false);
      }
    };

    const timer = setTimeout(verifyStudent, 350);
    return () => clearTimeout(timer);
  }, [studentAddNo]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setErrorMsg("");

    try {
      if (file.type.startsWith("image/")) {
        const res = await uploadImageToImgBB(file, `content_${Date.now()}`);
        const url = res.displayUrl || res.url;
        setContentFileUrl(url);
        setFilePreview(url);
      } else {
        // Read as base64 Data URL so docs or text files are preserved directly
        const reader = new FileReader();
        const readPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File reading failed"));
        });
        reader.readAsDataURL(file);
        const dataUrl = await readPromise;
        setContentFileUrl(dataUrl);
        setFilePreview(file.name);
      }
    } catch (err: any) {
      setErrorMsg("Failed to upload/read file: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim()) {
      setErrorMsg("Please enter a Content Title.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = {
        content_title: contentTitle.trim(),
        programe_code: programeCode.trim() || null,
        student_addNo: studentAddNo.trim() || null,
        like_count: 0,
        content_text: contentText.trim() || null,
        content_file: contentFileUrl.trim() || null,
      };

      const { error } = await SupaBaseFunction
        .from("Content_Table")
        .insert([payload]);

      if (error) throw error;

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit content to Content_Table.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="text-emerald-600" size={20} />
              Submit New Student Content
            </h3>
            <p className="text-xs text-slate-500">Record submission into Content_Table</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Content Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Modern Perspectives in Islamic Jurisprudence..."
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Programme Code Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Associated Programme (ProgrammesBox)
            </label>
            <select
              value={programeCode}
              onChange={(e) => setProgrameCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              <option value="">-- General Submission / Select Programme --</option>
              {availableProgrammes.map((p) => (
                <option key={p.Program_Code} value={p.Program_Code}>
                  {p.Program_Title || p.Program_Code} ({p.Program_Code})
                </option>
              ))}
            </select>
          </div>

          {/* Student Admission Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Student Admission No (StudentsBox)
              </label>
              {verifyingStudent && (
                <span className="text-[10px] text-slate-400 font-semibold animate-pulse">
                  Checking AddNo...
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. U1364 or Admission Number"
              value={studentAddNo}
              onChange={(e) => setStudentAddNo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition font-mono"
            />

            {/* Verified Student Feedback Card */}
            {verifiedStudent && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">{verifiedStudent.StudentName}</p>
                  <p className="text-[10px] text-emerald-700 truncate">
                    {verifiedStudent.Class || "Class Assigned"} • {verifiedStudent.CollegeName || "DHIU"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Content Text (Essay, Speech, Article) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Content Text (Article / Essay / Thoughts)
            </label>
            <textarea
              rows={4}
              placeholder="Write or paste your article, literary reflections, poem, or speech here..."
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition resize-y font-sans leading-relaxed"
            />
          </div>

          {/* Attachment Mode: Upload or URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Attached File / Visual (content_file)
              </label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFileMode("upload")}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    fileMode === "upload" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <Upload size={11} /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setFileMode("url")}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    fileMode === "url" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <LinkIcon size={11} /> File URL
                </button>
              </div>
            </div>

            {fileMode === "upload" ? (
              <div>
                {contentFileUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      📎 Attached: {filePreview || "Document"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setContentFileUrl("");
                        setFilePreview("");
                      }}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-4 text-center cursor-pointer transition"
                  >
                    <Upload size={20} className="mx-auto text-emerald-600 mb-1" />
                    <p className="text-xs font-bold text-slate-800">
                      {uploadingFile ? "Uploading..." : "Click to attach document or photo"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Images, PDF, Docx, TSX, Markdown</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <input
                type="url"
                placeholder="https://example.com/document.pdf or Google Drive link"
                value={contentFileUrl}
                onChange={(e) => setContentFileUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={14} /> Submit Content
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
