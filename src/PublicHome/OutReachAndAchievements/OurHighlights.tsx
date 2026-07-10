import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { Calendar, Tag, Layers, Award } from "lucide-react";

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

// Utility: Convert Google Drive share link to direct playable link
function getPlayableUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([^/]+)\//);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url; // fallback: return original if not a Drive link
}

export default function OurHighLights() {
  const [highlights, setHighlights] = useState<PublicHighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    async function fetchHighlights() {
      try {
        setLoading(true);
        const { data, error } = await SupaBaseFunction
          .from("PublicHighLights")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) setHighlights(data as PublicHighlightItem[]);
      } catch (err) {
        console.error("Error fetching highlights:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHighlights();
  }, []);

  const categories = ["All", ...new Set(highlights.map(h => h.HighLight_Type).filter(Boolean))];
  const filteredHighlights = selectedType === "All"
    ? highlights
    : highlights.filter(h => h.HighLight_Type === selectedType);

  return (
    <div className="bg-gradient-to-br from-green-100 to-green-200 text-slate-900 min-h-screen p-4 md:p-12 font-sans">
      <div className="mx-auto max-w-7xl">
        
        {/* Banner */}
        <div className="mb-12 text-center">
          <span className="text-xs font-bold tracking-widest text-green-800 uppercase bg-green-300 px-3 py-1 rounded-full">
            Campus Broadcasts
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-green-900 sm:text-5xl">
            Our Highlights
          </h1>
          <p className="text-sm text-green-700 mt-2 max-w-2xl mx-auto">
            Explore our proudest moments, academic milestones, and community outreach logs.
          </p>
        </div>

        {/* Tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-xs font-bold rounded-full tracking-wide transition-all uppercase ${
                  selectedType === type
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-green-200 text-green-800 hover:bg-green-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-green-700 text-xs tracking-wider">Loading highlights...</p>
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-green-400 rounded-2xl bg-green-50">
            <p className="text-green-600 text-sm">No highlights found for this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHighlights.map(event => {
              const playableUrl = getPlayableUrl(event.PhotoImg_Url);
              return (
                <article 
                  key={event.id} 
                  className="group bg-white border border-green-200 rounded-2xl overflow-hidden shadow hover:shadow-lg transition-all"
                >
                  {/* Media */}
                  <div className="aspect-video w-full bg-green-50 flex items-center justify-center">
                    {event.FileType === "Video" && playableUrl ? (
                      <video
                        src={playableUrl}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover rounded-t-2xl"
                      >
                        Sorry, your browser doesn’t support embedded videos.
                      </video>
                    ) : playableUrl ? (
                      <img
                        src={playableUrl}
                        alt={event.HighLitght_Title || "Highlight"}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-2xl"
                      />
                    ) : (
                      <Award className="w-12 h-12 text-green-400" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                        {event.HighLight_Type && (
                          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {event.HighLight_Type}
                          </span>
                        )}
                        {event.Accademic_Year && (
                          <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Layers className="w-3 h-3" /> AY: {event.Accademic_Year}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-green-900 line-clamp-2">
                        {event.HighLitght_Title || "Untitled Highlight"}
                      </h2>
                      <p className="text-xs text-green-700 line-clamp-3">
                        {event.ShortDescpt || "No description available."}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-green-100 text-[11px] text-green-600 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <time dateTime={event.created_at}>
                        {new Date(event.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </time>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
