import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { Calendar, Tag, Layers, Award } from "lucide-react";

// 1. Declare Data Interfaces matching your exact new public."PublicHighLights" schema
interface PublicHighlightItem {
  id: number;
  created_at: string;
  HighLitght_Title: string | null;
  HighLight_Type: string | null;
  PhotoImg_Url: string | null;
  ShortDescpt: string | null;
  Accademic_Year: number | null;
  FileType: string | null;
}

export default function OurHighLights() {
  // Strongly typing the state array to banish 'never[]' errors permanently
  const [highlights, setHighlights] = useState<PublicHighlightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>("All");

  useEffect(() => {
    async function fetchHighlights() {
      try {
        setLoading(true);

        // Fetching data from your new single custom public table
        const { data, error } = await SupaBaseFunction
          .from("PublicHighLights")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setHighlights(data as PublicHighlightItem[]);
      } catch (err) {
        console.error("Failed retrieving milestone broadcast logs from cache:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHighlights();
  }, []);

  // Compute filtering tab categories dynamically from dataset values
  const categories = ["All", ...new Set(highlights.map(item => item.HighLight_Type).filter(Boolean)) as Set<string>];

  const filteredHighlights = selectedType === "All"
    ? highlights
    : highlights.filter(item => item.HighLight_Type === selectedType);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen p-2 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto">
        
        {/* Banner Section */}
        <div className="mb-12 border-b border-slate-900 pb-2 relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-800/30">
            Campus Broadcasts
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Our Highlights
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Explore a collection of our proudest moments, academic milestones, and local community outreach logs.
          </p>
        </div>

        {/* Dynamic Categorization Navigation Tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-900/20 p-1.5 rounded-xl border border-slate-900/60 max-w-fit">
            {categories.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-xs font-bold rounded-lg tracking-wide transition-all uppercase ${
                  selectedType === type
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Media / Data Display Area */}
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 text-xs tracking-wider">Syncing highlight records...</p>
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-900/10">
            <p className="text-slate-500 text-sm">No recent spotlight milestones matched your selection filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHighlights.map((event) => (
              <article 
                key={event.id} 
                className="group bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-2xl duration-300"
              >
                {/* Media Presentation Cover Frame */}
                <div className="aspect-video w-full bg-slate-950 overflow-hidden relative border-b border-slate-950 flex items-center justify-center group-hover:bg-slate-900/40 transition-colors">
                  {event.PhotoImg_Url ? (
                    <img
                      src={event.PhotoImg_Url}
                      alt={event.HighLitght_Title || "Campus Spotlight Image"}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-700 select-none">
                      <Award className="w-10 h-10 stroke-[1.5] group-hover:text-indigo-500/40 transition-colors" />
                    </div>
                  )}
                </div>

                {/* Body Details Card Shell Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Badge Layout Information Row */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                      {event.HighLight_Type && (
                        <span className="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md text-indigo-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {event.HighLight_Type}
                        </span>
                      )}
                      {event.Accademic_Year && (
                        <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> AY: {event.Accademic_Year}
                        </span>
                      )}
                    </div>

                    {/* Headline Title */}
                    <h2 className="text-base font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                      {event.HighLitght_Title || "Untitled Broadcast Announcement"}
                    </h2>

                    {/* Short Description */}
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {event.ShortDescpt || "No detailed descriptive log summaries have been appended for this spotlight event instance."}
                    </p>
                  </div>

                  {/* Datetime Stamp Footer Row */}
                  <div className="pt-4 border-t border-slate-900/60 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <time dateTime={event.created_at}>
                      {event.created_at 
                        ? new Date(event.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })
                        : "Date Unavailable"
                      }
                    </time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}