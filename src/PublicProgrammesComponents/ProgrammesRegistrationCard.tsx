import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase"; 
import formatResultDate from "./DateFormatConvertor";
import SafeImage from "../lib/SafeImage";
import SquadRegistrationModal from "./SquadRegistrationModal";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { Users, User, Calendar, MapPin, Search, X } from "lucide-react";

interface ProgramData {
  Program_Code: string;
  Program_Title: string | null;
  Program_Poster: string | null;
  Group: string | null;
  WingCode: string | null;
  Category: string | null;
  AccademicYear: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null;
  Venue: string | null;
  IsApproved: boolean;
  IsResulted: boolean;
  IsOpenRegistration: boolean;
  is_group_program?: boolean;
}

export default function ProgrammesRegistrationCard() {
  const { actStn } = useParams<{ actStn: string }>();
  const navigate = useNavigate();
  const meta = useProgrammeMeta();
  
  const [programmes, setProgrammes] = useState<ProgramData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Group squad modal state
  const [squadModal, setSquadModal] = useState<{
    isOpen: boolean;
    programCode: string;
    programTitle: string;
  }>({
    isOpen: false,
    programCode: "",
    programTitle: "",
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "individual" | "group">("all");
  const [selectedWing, setSelectedWing] = useState<string>("all");

  const fetchProgrammes = async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await SupaBaseFunction
        .from('ProgrammesBox')
        .select('*')
        .eq('IsConducted', false)
        .eq("IsApproved", true)
        .order('Date', { ascending: true }); 

      if (fetchError) throw fetchError;
      setProgrammes((data as ProgramData[]) || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected data fetching anomaly occurred.";
      console.error("Fetch Error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammes();
  }, []);

  const handleRegisterClick = (program: ProgramData) => {
    if (!program.IsOpenRegistration) return;

    if (program.is_group_program) {
      // Group Programme: Suggest forming a group and open squad registration
      setSquadModal({
        isOpen: true,
        programCode: program.Program_Code,
        programTitle: program.Program_Title || program.Program_Code,
      });
    } else {
      // Individual Programme: Navigate to candidate registration
      if (actStn) {
        navigate(`/student-panel/${actStn}/candidate-registration/${program.Program_Code}`);
      } else {
        // Fallback for public or other context
        navigate(`/public-panel`);
      }
    }
  };

  // Filtered Programmes based on search query, format, and wing
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      // 1. Format filter
      if (selectedFormat === "individual" && p.is_group_program) return false;
      if (selectedFormat === "group" && !p.is_group_program) return false;

      // 2. Wing filter
      if (selectedWing !== "all" && p.WingCode !== selectedWing) return false;

      // 3. Search query matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const code = (p.Program_Code || "").toLowerCase();
      const title = (p.Program_Title || "").toLowerCase();
      const desc = (p.Description || "").toLowerCase();
      const group = (p.Group || "").toLowerCase();
      const wing = (p.WingCode || "").toLowerCase();
      const wingName = (meta.wingMap[p.WingCode || ""] || "").toLowerCase();
      const venue = (meta.venueMap[p.Venue || ""] || p.Venue || "").toLowerCase();

      return (
        code.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        group.includes(q) ||
        wing.includes(q) ||
        wingName.includes(q) ||
        venue.includes(q)
      );
    });
  }, [programmes, searchQuery, selectedFormat, selectedWing, meta]);

  const uniqueWings = useMemo(() => {
    const list = Array.from(new Set(programmes.map((p) => p.WingCode).filter(Boolean))) as string[];
    return list.sort();
  }, [programmes]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500 font-bold">Error: {error}</div>;
  }

  return (
    <div className="md:p-5 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Upcoming Programmes
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Explore individual events and group competitions open for candidate registration.
            </p>
          </div>

          {actStn && (
            <button
              onClick={() => navigate(`/student-panel/${actStn}/create-group`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer self-start"
            >
              <Users size={15} /> Form / Manage Squad
            </button>
          )}
        </div>

        {/* --- SEARCH & QUICK FILTER BAR --- */}
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Real-time Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search by programme code, title, wing, group or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Format Tabs (All / Individual / Group) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedFormat("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedFormat === "all" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({programmes.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("individual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                selectedFormat === "individual" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User size={12} /> Individual
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("group")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                selectedFormat === "group" ? "bg-white text-purple-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={12} /> Group
            </button>
          </div>

          {/* Wing Filter */}
          {uniqueWings.length > 0 && (
            <div className="shrink-0">
              <select
                value={selectedWing}
                onChange={(e) => setSelectedWing(e.target.value)}
                className="w-full md:w-auto px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Wings</option>
                {uniqueWings.map((w) => (
                  <option key={w} value={w}>
                    {meta.wingMap[w] || w}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {filteredProgrammes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-500 font-semibold">
              {searchQuery || selectedFormat !== "all" || selectedWing !== "all"
                ? "No matching programmes found for this search/filter criteria."
                : "No open programmes available for registration at the moment."}
            </p>
            {(searchQuery || selectedFormat !== "all" || selectedWing !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFormat("all");
                  setSelectedWing("all");
                }}
                className="mt-3 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map((program) => {
              const isGroup = Boolean(program.is_group_program);

              return (
                <div 
                  key={program.Program_Code} 
                  className="bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* --- Image Section with SafeImage Dual-Layer Fallback --- */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    <SafeImage
                      src={program.Program_Poster}
                      alt={program.Program_Title || "Program Presentation Art"}
                      fallbackCategory="programme"
                      fallbackText={program.Program_Title || program.Program_Code}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />

                    {/* Format Badge: Group vs Individual Event */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-md backdrop-blur-md ${
                        isGroup 
                          ? "bg-purple-600/90 text-white border border-purple-400/30"
                          : "bg-blue-600/90 text-white border border-blue-400/30"
                      }`}>
                        {isGroup ? <Users size={12} /> : <User size={12} />}
                        {isGroup ? "Group / Squad Event" : "Individual Event"}
                      </span>

                      {program.Group && (
                        <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs self-start">
                          {program.Group}
                        </span>
                      )}
                    </div>

                    {/* Registration Status Pill */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-md ${
                        program.IsOpenRegistration 
                          ? "bg-emerald-500 text-white" 
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {program.IsOpenRegistration ? "Reg Open" : "Closed"}
                      </span>
                    </div>
                  </div>

                  {/* --- Body Section --- */}
                  <div className="p-5 flex flex-col gap-3 grow">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-indigo-600">
                          {program.Program_Code}
                        </span>
                        {program.WingCode && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                            {meta.wingMap[program.WingCode] || program.WingCode}
                          </span>
                        )}
                        {program.Category && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                            {meta.categoryMap[program.Category] || program.Category}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                        {program.Program_Title || "Untitled Program"}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {program.Description || "No detailed registration description supplied."}
                    </p>

                    {/* Date & Venue Box */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs mt-auto">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar size={14} className="text-indigo-500 shrink-0" />
                        <span className="font-semibold truncate">{formatResultDate(program.Date) || "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin size={14} className="text-rose-500 shrink-0" />
                        <span className="font-semibold truncate" title={meta.venueMap[program.Venue || ""] || program.Venue || "To Be Announced"}>
                          {meta.venueMap[program.Venue || ""] || program.Venue || "TBA"}
                        </span>
                      </div>
                    </div>

                    {/* Format Suggestion Banner if Group */}
                    {isGroup && (
                      <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-[11px] text-purple-900 flex items-center gap-2">
                        <Users size={14} className="text-purple-600 shrink-0" />
                        <span>Form or select a group squad to register all team members together.</span>
                      </div>
                    )}
                  </div>

                  {/* --- Footer Action Button --- */}
                  <div className="px-5 pb-5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRegisterClick(program)}
                      disabled={!program.IsOpenRegistration}
                      className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                        !program.IsOpenRegistration
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isGroup
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 active:scale-[0.98]"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                      }`}
                    >
                      {isGroup ? (
                        <>
                          <Users size={15} />
                          {program.IsOpenRegistration ? "Register Group / Squad" : "Registration Closed"}
                        </>
                      ) : (
                        <>
                          <User size={15} />
                          {program.IsOpenRegistration ? "Register Candidate" : "Registration Closed"}
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Squad Registration Modal for Group Events */}
        {squadModal.isOpen && (
          <SquadRegistrationModal
            isOpen={squadModal.isOpen}
            programCode={squadModal.programCode}
            programTitle={squadModal.programTitle}
            onClose={() => setSquadModal({ isOpen: false, programCode: "", programTitle: "" })}
            onSuccess={() => {
              fetchProgrammes();
            }}
          />
        )}
      </div>
    </div>
  );
}
