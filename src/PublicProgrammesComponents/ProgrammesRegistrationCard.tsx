import { useState, useEffect } from "react";
// Import your Supabase client (adjust the path to match your setup)
import { SupaBaseFunction } from "../lib/SupaBase"; 
// Import the card component we designed earlier
import ProgrammesRegistrationCard from "./ProgrammesRegistrationCard";

export default function ProgrammesList() {
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProgrammes();
  }, []);

  const fetchProgrammes = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data from 'ProgrammesBox' where IsApproved is true
      const { data, error } = await SupaBaseFunction
        .from('ProgrammesBox')
        .select('*')
        .eq('IsApproved', true); // Filtering only approved programs

      if (error) {
        throw error;
      }

      setProgrammes(data || []);
    } catch (err) {
      console.error("Error fetching programmes:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // UI States for Loading and Error
  if (isLoading) {
    return <div className="p-10 text-center text-gray-500 font-semibold">Loading programmes...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500 font-semibold">Failed to load: {error}</div>;
  }

  // Render the Grid of Cards
  return (
    <div className="p-6 md:p-10 min-h-screen bg-gray-50">
      <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Available Programmes</h2>
      
      {programmes.length === 0 ? (
        <p className="text-gray-500">No programmes available right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {programmes.map((prog) => (
            <ProgrammesRegistrationCard key={prog.Program_Code} program={prog} />
          ))}
        </div>
      )}
    </div>
  );
}