import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Assuming this is your initialized Supabase client

export default function WingResults() {
    const { actWing } = useParams();
    
    // State Management
    const [searchQuery, setSearchQuery] = useState("");
    const [programmes, setProgrammes] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [expandedProgrammes, setExpandedProgrammes] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch Data on Component Mount
    useEffect(() => {
        if (actWing) {
            fetchWingDetails();
        }
    }, [actWing]);

    const fetchWingDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch all programmes associated with this wing code
            const { data: progData, error: progError } = await SupaBaseFunction
                .from('programes') // Replace with your actual table name
                .select('*')
                .eq('wing_code', actWing);

            if (progError) throw progError;
            setProgrammes(progData || []);

            // 2. Extract programme codes to fetch related candidates
            const progCodes = progData?.map(p => p.programme_code) || [];
            
            if (progCodes.length > 0) {
                const { data: candData, error: candError } = await SupaBaseFunction
                    .from('candidates') // Replace with your actual table name
                    .select('*')
                    .in('programme_code', progCodes);

                if (candError) throw candError;
                setCandidates(candData || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Registration Status
    const toggleRegistration = async (programmeId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            
            // Optimistic UI Update
            setProgrammes(prev => prev.map(prog => 
                prog.id === programmeId ? { ...prog, registration_on: newStatus } : prog
            ));

            // Update Database
            const { error } = await SupaBaseFunction
                .from('programes')
                .update({ registration_on: newStatus })
                .eq('id', programmeId);

            if (error) {
                // Revert on failure
                setProgrammes(prev => prev.map(prog => 
                    prog.id === programmeId ? { ...prog, registration_on: currentStatus } : prog
                ));
                console.error("Failed to update registration status", error);
            }
        } catch (error) {
            console.error("Error toggling registration:", error);
        }
    };

    // Toggle Accordion View for Candidates
    const toggleExpand = (programmeCode) => {
        setExpandedProgrammes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(programmeCode)) {
                newSet.delete(programmeCode);
            } else {
                newSet.add(programmeCode);
            }
            return newSet;
        });
    };

    // Filter Logic
    const filteredProgrammes = programmes.filter(prog => 
        prog.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        prog.programme_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="mx-auto max-w-[1600px] p-4 md:p-8 font-sans text-slate-800 min-h-screen bg-slate-50/50">
            
            {/* --- CONTROLS HEADER --- */}
            <div className="mb-8 flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Wing Results & Programmes</h1>
                    <p className="text-sm text-slate-500 font-medium">Managing Wing ID: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{actWing}</span></p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-wrap">
                    {/* Search Bar */}
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search programmes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-medium transition-all focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 sm:w-72"
                        />
                        <svg className="absolute left-4 top-3 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>
            </div>

            {/* --- PROGRAMMES LIST --- */}
            {loading ? (
                <div className="flex justify-center items-center py-20 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 font-medium">Loading academic data...</span>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredProgrammes.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
                            <h3 className="text-lg font-semibold text-slate-700">No programmes found</h3>
                            <p className="text-slate-500 mt-1">Try adjusting your search criteria.</p>
                        </div>
                    ) : (
                        filteredProgrammes.map((prog) => {
                            const isExpanded = expandedProgrammes.has(prog.programme_code);
                            const progCandidates = candidates.filter(c => c.programme_code === prog.programme_code);

                            return (
                                <div key={prog.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md">
                                    
                                    {/* PROGRAMME ROW (ALWAYS VISIBLE) */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-xl font-bold text-slate-900">{prog.name}</h2>
                                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                    {prog.programme_code}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">{progCandidates.length} Registered Candidates</p>
                                        </div>

                                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                            
                                            {/* Toggle Registration Button */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-slate-600">Registration</span>
                                                <button 
                                                    onClick={() => toggleRegistration(prog.id, prog.registration_on)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${prog.registration_on ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prog.registration_on ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            {/* Show Candidates Button */}
                                            <button 
                                                onClick={() => toggleExpand(prog.programme_code)}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-bold transition-colors border border-slate-200"
                                            >
                                                {isExpanded ? 'Hide Candidates' : 'View Candidates'}
                                                <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* CANDIDATES TABLE (HIDDEN BY DEFAULT) */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                                            {progCandidates.length === 0 ? (
                                                <div className="text-center py-8 text-slate-500 italic text-sm">
                                                    No candidates registered for this programme yet.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200 bg-white">
                                                    <table className="w-full text-left text-sm text-slate-600">
                                                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-6 py-4">Candidate Name</th>
                                                                <th className="px-6 py-4">Class</th>
                                                                <th className="px-6 py-4">Category</th>
                                                                <th className="px-6 py-4">Campus Name</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {progCandidates.map((candidate) => (
                                                                <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-6 py-4 font-semibold text-slate-800">
                                                                        {candidate.name}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                                            {candidate.class_name}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                                                            {candidate.category}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 font-medium">
                                                                        {candidate.campus_name}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}