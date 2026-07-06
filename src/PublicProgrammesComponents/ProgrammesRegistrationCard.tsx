import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase"; 

export default function ProgrammesRegistrationCard() {
  const { actStn } = useParams();
  const navigate = useNavigate();
  
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch and Filter Data
  useEffect(() => {
    const fetchProgrammes = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await SupaBaseFunction
          .from('ProgrammesBox')
          .select('*')
          .eq('IsConducted', false)  // Filter: Not conducted yet
          .order('Date', { ascending: true }); 

        if (error) throw error;
        setProgrammes(data || []);
      } catch (err) {
        console.error("Fetch Error:", err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgrammes();
  }, []);

  // UI States
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500 font-bold">Error: {error}</div>;
  }

  return (
    <div className="md:p-5 bg-gray-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
          Upcoming Programmes
        </h2>
        
        {programmes.length === 0 ? (
          <p className="text-gray-500">No programs available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            
            {/* Loop through the fetched data */}
            {programmes.map((program, index) => (
              
              <div 
                key={program.Program_Code || index} 
                className="w-full max-w-[360px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden font-sans hover:shadow-md transition-shadow"
              >
                
                {/* --- Image Section --- */}
                <div className="relative h-48 w-full bg-gray-200">
                  <img
                    src={program.Program_Poster || "https://via.placeholder.com/400x200?text=No+Image"}
                    alt={program.Program_Title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = "https://via.placeholder.com/400x200?text=No+Image" }}
                  />
                  {program.Group && (
                    <div className="absolute top-3 left-3 bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                      {program.Group}
                    </div>
                  )}
                </div>

                {/* --- Body Section --- */}
                <div className="p-5 flex flex-col gap-4 flex-grow">
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
                    {program.Description}
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
                      <span className="text-sm font-semibold text-gray-900">{program.Date || "TBA"}</span>
                    </div>
                    <div className="flex flex-col w-1/2 pl-4">
                      <span className="text-xs font-medium text-gray-500 mb-1">Venue</span>
                      <span className="text-sm font-semibold text-gray-900 truncate" title={program.Venue}>
                        {program.Venue || "TBA"}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex gap-2 mt-1">
                    {program.IsApproved && (
                      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Approved
                      </div>
                    )}
                    <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                      {program.IsResulted ? "Result Published" : "No Result"}
                    </div>
                  </div>
                </div>

                {/* --- Footer Button --- */}
                <div className="px-5 pb-5 pt-2 mt-auto">
                  <button
                    onClick={() => {
                      if (program.IsOpenRegistration && program.Program_Code && actStn) {
                        navigate(`/student-panel/${actStn}/candidate-registration/${program.Program_Code}`);
                      } else if (!actStn) {
                        alert("Student ID is missing from the URL. Cannot register.");
                      }
                    }}
                    disabled={!program.IsOpenRegistration}
                    className={`w-full py-3 rounded-xl font-bold text-[15px] transition-all duration-200 ${
                      program.IsOpenRegistration
                        ? "bg-[#2563eb] hover:bg-blue-700 text-white active:scale-[0.98]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {program.IsOpenRegistration ? "Register Now" : "Registration Closed"}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}