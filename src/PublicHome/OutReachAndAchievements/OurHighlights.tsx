// import { useState, useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import { Calendar, Tag, Layers, Award } from "lucide-react";

// // Synchronized Data Interface matching your fixed Supabase Schema
// interface PublicHighlightItem {
//   id: number;
//   created_at: string;
//   HighLitght_Title: string | null;
//   HighLight_Type: string | null;
//   PhotoImg_Url: string | null;
//   ShortDescpt: string | null;
//   Academic_Year: number | null;
//   FileType: string | null;
// }

// export default function OurHighLights() {
//   const [highlights, setHighlights] = useState<PublicHighlightItem[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [selectedType, setSelectedType] = useState<string>("All");

//   useEffect(() => {
//     async function fetchHighlights() {
//       try {
//         setLoading(true);
//         const { data, error } = await SupaBaseFunction
//           .from("PublicHighLights")
//           .select("*")
//           .order("created_at", { ascending: false });

//         if (error) throw error;
//         if (data) setHighlights(data as PublicHighlightItem[]);
//       } catch (err) {
//         console.error("Failed retrieving highlights:", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchHighlights();
//   }, []);

//   // Safe category builder preventing null/undefined mapping breakages
//   const categories = [
//     "All", 
//     ...Array.from(new Set(highlights.map(item => item.HighLight_Type).filter((type): type is string => Boolean(type))))
//   ];

//   const filteredHighlights = selectedType === "All"
//     ? highlights
//     : highlights.filter(item => item.HighLight_Type === selectedType);

//   return (
//     <div className="bg-slate-950 text-slate-100 min-h-screen p-2 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
//       <div className="mx-auto">

//         {/* Banner */}
//         <div className="mb-12 border-b border-slate-900 pb-2 relative">
//           <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
//           <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-800/30">
//             Campus Broadcasts
//           </span>
//           <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
//             Our Highlights
//           </h1>
//           <p className="text-sm text-slate-400 mt-2 max-w-2xl">
//             Explore a collection of our proudest moments, academic milestones, and community outreach logs.
//           </p>
//         </div>

//         {/* Tabs */}
//         {categories.length > 1 && (
//           <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-900/20 p-1.5 rounded-xl border border-slate-900/60 max-w-fit">
//             {categories.map((type) => (
//               <button
//                 key={type}
//                 onClick={() => setSelectedType(type)}
//                 className={`px-4 py-2 text-xs font-bold rounded-lg tracking-wide transition-all uppercase ${
//                   selectedType === type
//                     ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
//                     : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
//                 }`}
//               >
//                 {type}
//               </button>
//             ))}
//           </div>
//         )}

//         {/* Display */}
//         {loading ? (
//           <div className="text-center py-24">
//             <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
//             <p className="text-slate-500 text-xs tracking-wider">Syncing highlight records...</p>
//           </div>
//         ) : filteredHighlights.length === 0 ? (
//           <div className="text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-900/10">
//             <p className="text-slate-500 text-sm">No milestones matched your filter.</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredHighlights.map((event) => (
//               <article 
//                 key={event.id} 
//                 className="group bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-2xl duration-300"
//               >
//                 {/* Media */}
//                 <div className="aspect-video w-full bg-slate-950 overflow-hidden relative border-b border-slate-950 flex items-center justify-center group-hover:bg-slate-900/40 transition-colors">
//                   {event.FileType === "Video" && event.PhotoImg_Url ? (
//                     <video
//                       src={event.PhotoImg_Url}
//                       controls
//                       preload="metadata"
//                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//                     />
//                   ) : event.PhotoImg_Url ? (
//                     <img
//                       src={event.PhotoImg_Url}
//                       alt={event.HighLitght_Title || "Campus Spotlight Media"}
//                       loading="lazy"
//                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//                     />
//                   ) : (
//                     <div className="flex flex-col items-center gap-2 text-slate-700 select-none">
//                       <Award className="w-10 h-10 stroke-[1.5] group-hover:text-indigo-500/40 transition-colors" />
//                     </div>
//                   )}
//                 </div>

//                 {/* Content */}
//                 <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
//                   <div className="space-y-3">
//                     <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
//                       {event.HighLight_Type && (
//                         <span className="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md text-indigo-400 flex items-center gap-1">
//                           <Tag className="w-3 h-3" /> {event.HighLight_Type}
//                         </span>
//                       )}
//                       {event.Academic_Year && (
//                         <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 flex items-center gap-1">
//                           <Layers className="w-3 h-3" /> AY: {event.Academic_Year}
//                         </span>
//                       )}
//                     </div>

//                     <h2 className="text-base font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
//                       {event.HighLitght_Title || "Untitled Broadcast"}
//                     </h2>

//                     <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
//                       {event.ShortDescpt || "No description available."}
//                     </p>
//                   </div>

//                   <div className="pt-4 border-t border-slate-900/60 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
//                     <Calendar className="w-3.5 h-3.5 text-slate-600" />
//                     <time dateTime={event.created_at}>
//                       {event.created_at 
//                         ? new Date(event.created_at).toLocaleDateString(undefined, {
//                             year: "numeric",
//                             month: "short",
//                             day: "numeric"
//                           })
//                         : "Date Unavailable"}
//                     </time>
//                   </div>
//                 </div>
//               </article>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { Calendar, Tag, Layers, X, Maximize2, Download } from "lucide-react";

interface PublicHighlightItem {
  id: number;
  created_at: string;
  HighLitght_Title: string | null;
  HighLight_Type: string | null;
  PhotoImg_Url: string | null;
  ShortDescpt: string | null;
  Academic_Year: number | null;
  FileType: string | null;
}

export default function OurHighLights() {
  const [highlights, setHighlights] = useState<PublicHighlightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>("All");
  const [fullscreenMedia, setFullscreenMedia] = useState<{url: string, type: string} | null>(null);

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
        console.error("Failed retrieving:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHighlights();
  }, []);

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "highlight-media");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { console.error("Download failed:", err); }
  };

  const categories = ["All", ...Array.from(new Set(highlights.map(i => i.HighLight_Type).filter((t): t is string => !!t)))];
  const filtered = selectedType === "All" ? highlights : highlights.filter(i => i.HighLight_Type === selectedType);

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen p-6 md:p-16 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <span className="text-[10px] font-extrabold tracking-[0.2em] text-emerald-600 uppercase bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">Campus Highlights</span>
          <h1 className="mt-6 text-5xl md:text-6xl font-extrabold text-slate-950 tracking-tight">Our Milestones</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map(type => (
            <button key={type} onClick={() => setSelectedType(type)} className={`px-5 py-2 text-xs font-bold rounded-full transition-all ${selectedType === type ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              {type}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((event) => (
            <article key={event.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
              <div className="aspect-[4/3] relative cursor-pointer overflow-hidden" onClick={() => event.PhotoImg_Url && setFullscreenMedia({url: event.PhotoImg_Url, type: event.FileType || 'Image'})}>
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                  {event.FileType === "Video" ? <video src={event.PhotoImg_Url || ""} className="w-full h-full object-cover" /> : <img src={event.PhotoImg_Url || ""} className="w-full h-full object-cover" />}
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white w-8 h-8" />
                </div>
              </div>
              <div className="p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-2">{event.HighLitght_Title}</h2>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2">{event.ShortDescpt}</p>
                <div className="flex items-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 mr-2" />{new Date(event.created_at).toLocaleDateString()}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Modal */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button onClick={() => setFullscreenMedia(null)} className="absolute top-8 right-8 text-white p-3"><X size={24} /></button>
          <button onClick={() => handleDownload(fullscreenMedia.url)} className="absolute top-8 right-20 text-white flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full"><Download size={18} /> Save</button>
          <div className="max-w-5xl w-full">
            {fullscreenMedia.type === "Video" ? <video src={fullscreenMedia.url} controls className="w-full rounded-2xl" /> : <img src={fullscreenMedia.url} className="w-full h-auto rounded-2xl" />}
          </div>
        </div>
      )}
    </div>
  );
}