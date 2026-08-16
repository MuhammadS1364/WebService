
import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import formatResultDate from "./DateFormatConvertor";

// 1. Production-grade Schema Type Declarations matching your Supabase row fields
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
}


export default function PublicProgrammesList() {
  // const { actStn } = useParams<{ actStn: string }>();
  // const navigate = useNavigate();

  // Explicitly assign structural parameters to the component state hooks
  const [programmes, setProgrammes] = useState<ProgramData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and Filter Data Layer
  useEffect(() => {
    const fetchProgrammes = async () => {
      try {
        setIsLoading(true);
        const { data, error: fetchError } = await SupaBaseFunction
          .from('ProgrammesBox')
          .select('*')
          // Temporarily disabled so your unapproved test data shows up!
          // .eq('IsConducted', true) 
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

    fetchProgrammes();
  }, []);

  // UI States Handling Exception Blockers
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg className="h-10 w-10 animate-spin text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-medium animate-pulse">Programmes are loading...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500 font-bold">Error: {error}</div>;
  }

  return (
    <div className="md:p-5 bg-gray-50 min-h-screen">
      <div className="max-w-300 mx-auto">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
          Facilitated Programmes
        </h2>

        {programmes.length === 0 ? (
          <p className="text-gray-500">No programs available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Loop structurally over safe records */}
            {programmes.map((program, index) => (

              <div
                key={program.Program_Code || index}
                className="w-full max-w-90 mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden font-sans hover:shadow-md transition-shadow"
              >

                {/* --- Image Section --- */}
                <div className="relative h-48 w-full bg-gray-200">
                  <img
                    src={program.Program_Poster || "https://via.placeholder.com/400x200?text=No+Image"}
                    alt={program.Program_Title || "Program Presentation Art"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fixed target assertion blocking any property errors
                      (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/400x200?text=No+Image";
                    }}
                  />
                  {program.Group && (
                    <div className="absolute top-3 left-3 bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                      {program.Group}
                    </div>
                  )}
                </div>

                {/* --- Body Section --- */}
                <div className="p-5 flex flex-col gap-4 grow">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight line-clamp-2">
                      {program.Program_Title || "Untitled Program"}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">{program.Program_Code}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {program.WingCode && (
                      <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-md">
                        {program.WingCode}
                      </span>
                    )}
                    {program.Category && (
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-md">
                        {program.Category}
                      </span>
                    )}
                    {program.AccademicYear && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md">
                        {program.AccademicYear}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[15px] text-gray-600 leading-relaxed line-clamp-3">
                    {program.Description || "No registration details supplied."}
                  </p>

                  {/* Expected Outcome */}
                  {program.OutComes && (
                    <div className="mt-1">
                      <h3 className="text-xs font-bold text-gray-500 tracking-wide uppercase mb-1">
                        Expected Outcome
                      </h3>
                      <p className="text-[15px] text-gray-700 line-clamp-2">{program.OutComes}</p>
                    </div>
                  )}

                  {/* Date & Venue Box */}
                  <div className="flex bg-[#f8f9fa] border border-gray-100 rounded-xl p-4 mt-2">
                    <div className="flex flex-col w-1/2 border-r border-gray-200/60 pr-2">
                      <span className="text-xs font-medium text-gray-500 mb-1">Date</span>

                      {/* UPDATED: Applied formatDisplayDate here */}
                      <span className="text-sm font-semibold text-gray-900">
                        {formatResultDate(program.Date)}
                      </span>

                    </div>
                    <div className="flex flex-col w-1/2 pl-4">
                      <span className="text-xs font-medium text-gray-500 mb-1">Venue</span>
                      <span className="text-sm font-semibold text-gray-900 truncate" title={program.Venue ?? "To Be Announced"}>
                        {program.Venue || "TBA"}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicators */}

                </div>

                {/* --- Footer Button --- */}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// checking start here 
