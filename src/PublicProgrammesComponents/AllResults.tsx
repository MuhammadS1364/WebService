

import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../lib/SupaBase"; // Assuming this exports your Supabase client

export default function AllResultsList() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State to track which result IDs are currently selected
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch results on component mount
  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      // Fetching all results. You could add .eq('IsAwarded', true) if you only want public finalized ones.
      const { data, error } = await SupaBaseFunction
        .from('ResultBox')
        .select('*')
    
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Error fetching results:", err.message);
      setError("Failed to load results. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // --- Multiple Selection Logic ---

  // Handle checking/unchecking a single row
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      // If already selected, remove it
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      // If not selected, add it
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Handle checking/unchecking the "Select All" box in the header
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all currently loaded result IDs
      const allIds = results.map(result => result.id);
      setSelectedIds(allIds);
    } else {
      // Clear selection
      setSelectedIds([]);
    }
  };

  // --- Render logic ---

  if (loading) return <div className="p-4">Loading public results...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="results-container p-6">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Public Results Board</h1>
          <p className="text-gray-500">View competition outcomes and winners.</p>
        </div>
        
        {/* Actions for selected items */}
        {selectedIds.length > 0 && (
          <div className="actions bg-blue-50 px-4 py-2 rounded-md border border-blue-200">
            <span className="text-blue-700 font-medium mr-4">
              {selectedIds.length} items selected
            </span>
            <button 
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
              onClick={() => console.log("Perform action on:", selectedIds)}
            >
              Action (e.g., Export/Publish)
            </button>
          </div>
        )}
      </header>

      <div className="table-wrapper overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 border-b">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedIds.length === results.length && results.length > 0}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </th>
              <th className="p-4 border-b">Program Title</th>
              <th className="p-4 border-b">1st Place</th>
              <th className="p-4 border-b">2nd Place</th>
              <th className="p-4 border-b">3rd Place</th>
              <th className="p-4 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No results published yet.
                </td>
              </tr>
            ) : (
              results.map((result) => (
                <tr 
                  key={result.id} 
                  className={`border-b transition hover:bg-gray-50 ${selectedIds.includes(result.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-4">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(result.id)}
                      onChange={() => handleSelectOne(result.id)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-medium">{result.Program_Title || 'N/A'}</td>
                  <td className="p-4 text-yellow-600 font-semibold">🥇 {result.FirstHolder || '-'}</td>
                  <td className="p-4 text-gray-500 font-semibold">🥈 {result.SecondHolder || '-'}</td>
                  <td className="p-4 text-orange-700 font-semibold">🥉 {result.ThirdHolder || '-'}</td>
                  <td className="p-4">
                    {result.IsAwarded ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                        Awarded
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}