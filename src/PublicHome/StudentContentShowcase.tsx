import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
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
  FileText
} from "lucide-react";

export interface StudentContentItem {
  content_id: string;
  created_at: string;
  content_title: string;
  programe_code: string | null;
  student_addNo: string | null;
  like_count: number;
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
      let studentsMap: Record<string, { name: string; photo?: string | null; class?: string | null; college?: string | null }> = {};
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
      let progMap: Record<string, { title: string; wing?: string | null; group?: string | null }> = {};
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
          programTitle: prg?.title || (c.programe_code ? `Programme #${c.programe_code}` : "General Programme"),
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
      const author = (item.studentName || "").toLowerCase();
      const prgTitle = (item.programTitle || "").toLowerCase();
      const addNo = (item.student_addNo || "").toLowerCase();
      const code = (item.programe_code || "").toLowerCase();

      return (
        title.includes(q) ||
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <Sparkles size={13} className="text-emerald-600" />
            <span>Public Student Creative Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Student Content & Literary Showcases
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
            Discover articles, speeches, essays, and creative submissions created by registered students of Anjuman-e-Huda for various academic and wing programmes.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search by student name, content title, or programme title..."
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
              : "Submissions from registered students will appear here once submitted."}
          </p>
        </div>
      ) : (
        /* Content Cards Grid */
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

            return (
              <div
                key={item.content_id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden p-5 group"
              >
                {/* Author Info Bar (Who Wrote) */}
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

                {/* Content Box (Content & Title) */}
                <div className="py-4 space-y-2 grow">
                  <div className="flex items-start gap-2">
                    <FileText size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-3">
                      {item.content_title}
                    </h3>
                  </div>

                  {/* Associated Programme Badge */}
                  <div className="pt-2">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-700 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-mono font-bold text-emerald-700 block">
                          Submitted For Programme
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
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
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
                    <span className="hidden sm:inline font-normal text-[11px]">
                      {isLiked ? "Liked" : "Like"}
                    </span>
                  </button>

                  {/* Share button */}
                  <button
                    type="button"
                    onClick={() => handleShare(item)}
                    className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                    title="Share Showcase"
                  >
                    {copiedId === item.content_id ? (
                      <Check size={15} className="text-emerald-600" />
                    ) : (
                      <Share2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
