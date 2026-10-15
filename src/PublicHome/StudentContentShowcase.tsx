import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import SafeImage from "../lib/SafeImage";
import {
  Heart,
  BookOpen,
  Search,
  Sparkles,
  Share2,
  Check,
  FileText,
  X,
  Download,
  Eye,
  FileType,
  Calendar,
  ArrowRight,
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
          .select("AddNo, StudentName, Student_Photo_Urls, Stn_Class, CollegeName")
          .in("AddNo", addNos);

        (stnData || []).forEach((stn: any) => {
          const matchedClass = meta.classes.find(
            (c: any) =>
              c.class_id === stn.Stn_Class ||
              c.standard_name === stn.Stn_Class ||
              c.class_nick_name === stn.Stn_Class
          );
          studentsMap[stn.AddNo] = {
            name: stn.StudentName || `Student #${stn.AddNo}`,
            photo: stn.Student_Photo_Urls,
            class:
              matchedClass?.class_nick_name ||
              matchedClass?.standard_name ||
              stn.Stn_Class ||
              null,
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

        {/* Showcase Stats & Info Pill */}
        <div className="shrink-0 relative z-10 flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs">
            <BookOpen size={16} className="text-emerald-600" />
            <span>{filteredItems.length} Published Articles & Creative Works</span>
          </div>
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
            <Heart size={12} className="fill-rose-500 text-rose-500" /> Most Liked
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
            {searchQuery || selectedWing !== "all"
              ? "No student submission matches your current search keywords or filters."
              : "No student literature or creative articles published yet."}
          </p>
          {(searchQuery || selectedWing !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedWing("all");
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      ) : (
        /* Content Cards Grid: Upgraded Context Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Top Accent Gradient Header with Wing & Entry Tag */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 truncate">
                      {item.programWing ? meta.wingMap[item.programWing] || item.programWing : "Literary Submission"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/80">
                    <Calendar size={11} className="text-slate-400" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="p-5 flex flex-col grow space-y-4">
                  {/* Author Info Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 border-2 border-white shadow-xs p-0.5 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.studentPhoto ? (
                          <SafeImage
                            src={item.studentPhoto}
                            alt={item.studentName || "Author"}
                            fallbackCategory="student"
                            fallbackText={item.studentName}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-emerald-700 text-white font-black text-sm flex items-center justify-center">
                            {(item.studentName || "S")[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5" title={item.studentName}>
                          <span className="truncate">{item.studentName}</span>
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.studentClass && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              {item.studentClass}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            #{item.student_addNo || "Student"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Title */}
                  <div>
                    <h3
                      onClick={() => setSelectedItemForRead(item)}
                      className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2 cursor-pointer"
                      title={item.content_title}
                    >
                      {item.content_title}
                    </h3>
                  </div>

                  {/* Content Excerpt / Quote */}
                  {item.content_text && item.content_text !== "content_text" && (
                    <div className="bg-slate-50 border-l-4 border-emerald-500 rounded-r-2xl p-3 text-xs text-slate-700 leading-relaxed italic">
                      <p className="line-clamp-3">
                        "{item.content_text}"
                      </p>
                    </div>
                  )}

                  {/* Attached Visual or Document */}
                  {item.content_file && (
                    <div className="pt-1">
                      {hasImageFile ? (
                        <div
                          onClick={() => setSelectedItemForRead(item)}
                          className="relative h-32 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group/img shadow-2xs"
                        >
                          <img
                            src={item.content_file}
                            alt={item.content_title}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                            <Eye size={14} />
                            <span>View Visual Artwork</span>
                          </div>
                        </div>
                      ) : (
                        <a
                          href={item.content_file}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 hover:from-emerald-100/70 hover:to-teal-100/70 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 transition-all shadow-2xs group/doc"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                              <FileType size={14} />
                            </div>
                            <div className="truncate">
                              <span className="block text-[11px] font-black truncate">Submission Attachment</span>
                              <span className="block text-[9px] font-normal text-emerald-700">Official Student Work</span>
                            </div>
                          </span>
                          <div className="p-1.5 rounded-lg bg-white/80 group-hover/doc:bg-white text-emerald-700 shrink-0 transition">
                            <Download size={13} className="group-hover/doc:translate-y-0.5 transition-transform" />
                          </div>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Programme Context Pill */}
                  <div className="mt-auto pt-2">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                          Programme Reference
                        </span>
                        <p className="font-bold text-slate-800 text-[11px] truncate" title={item.programTitle}>
                          {item.programTitle}
                        </p>
                      </div>
                      {item.programe_code && (
                        <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          #{item.programe_code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => handleLike(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                        isLiked
                          ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                          : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Heart
                        size={14}
                        className={isLiked ? "fill-rose-500 text-rose-500" : "text-slate-400"}
                      />
                      <span>{item.like_count || 0}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Read / Details Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedItemForRead(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <span>Read Full Work</span>
                        <ArrowRight size={12} />
                      </button>

                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title="Share Work"
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
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          FULL CONTENT READER MODAL
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
