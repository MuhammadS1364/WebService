import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
// Ensure this path aligns perfectly with your setup
import { SupaBaseFunction } from "../../lib/SupaBase"; 

// 1. Explicitly typed structure representing database schema
interface WingData {
  WingTitle: string | null;
  WingCode: string;
  WingEmail?: string | null;
  WingManager?: string | null;
  WingConvener?: string | null;
  WingAssistant?: string | null;
  Total_Registrations?: number | null;
  Total_Resulted?: number | null;
  IsActive: boolean;
}

export default function AllWingsList() {
    const navigate = useNavigate();
    
    // 2. State hooks initialized with precise TypeScript generic definitions
    const [wings, setWings] = useState<WingData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    // Fetch live rows from Supabase
    useEffect(() => {
        let isMounted = true;
        
        const fetchWings = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await SupaBaseFunction
                    .from('Chs-WingS')
                    .select('*')
                    .order('WingTitle', { ascending: true });

                if (fetchError) throw fetchError;
                
                if (isMounted) {
                    setWings(data || []);
                }
            } catch (err: any) {
                console.error("Critical Fetch Exception Encountered:", err);
                if (isMounted) {
                    setError(err.message || "Failed to load wings records securely from data-store layer.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchWings();
        
        return () => {
            isMounted = false;
        };
    }, []);

    const BackToDashBoard = (): void => {
        navigate(-1);
    };

    // Strongly typed form input event targets
    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(e.target.value);
    };

    const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>): void => {
        setStatusFilter(e.target.value);
    };

    // Type-safe matching engine for local filters
    const filteredWings = wings.filter((wing: WingData) => {
        const title = wing.WingTitle ?? "";
        const code = wing.WingCode ?? "";
        
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              code.toLowerCase().includes(searchQuery.toLowerCase());
                              
        const matchesStatus = statusFilter === "All" || 
                              (statusFilter === "Active" && wing.IsActive) || 
                              (statusFilter === "Inactive" && !wing.IsActive);
                              
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen font-sans">
            
            {/* --- CONTROLS HEADER --- */}
            <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Our Wings</h1>
                    <button 
                        type="button"
                        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/20 hover:bg-indigo-100 transition-colors w-fit flex items-center gap-1.5"
                        onClick={BackToDashBoard}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back To Dashboard
                    </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Search Field Element */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by title or code..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-64 transition-all"
                            disabled={isLoading || error !== null}
                        />
                        <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>

                    {/* Filter Dropdown Element */}
                    <select
                        value={statusFilter}
                        onChange={handleFilterChange}
                        className="rounded-xl border border-slate-300 py-2 px-4 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer"
                        disabled={isLoading || error !== null}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active Only</option>
                        <option value="Inactive">Inactive Only</option>
                    </select>
                </div>
            </div>

            {/* --- ERROR ALERTS --- */}
            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-center gap-3">
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* --- LOADING VIEWS --- */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <svg className="h-10 w-10 animate-spin text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-medium animate-pulse">Syncing with database...</p>
                </div>
            ) : !error && (
                /* --- RECORDS GRID GRID --- */
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredWings.map((wing: WingData) => (
                        <div key={wing.WingCode} className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200">
                            
                            {/* Card Heading Header */}
                            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                                <div className="flex items-start gap-3">
                                    <input type="checkbox" className="mt-1.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 line-clamp-1" title={wing.WingTitle ?? "No Title Available"}>
                                            {wing.WingTitle ?? "No Title Provided"}
                                        </h3>
                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider">
                                            {wing.WingCode}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Interaction Actions Buttons */}
                                <div className="flex items-center gap-1">
                                    <button type="button" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button type="button" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Authentication Detail Wrapper */}
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex flex-col space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-500">Login Email:</span>
                                        <span className="font-mono text-slate-800">{wing.WingEmail ?? "N/A"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-500">Password:</span>
                                        <span className="font-mono text-slate-800">{wing.WingCode}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Assignment Hierarchies */}
                            <div className="mt-4 space-y-2 flex-1">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    <span className="font-medium">Manager:</span> {wing.WingManager ?? "Unassigned"}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                    <span className="font-medium">Convener:</span> {wing.WingConvener ?? "Unassigned"}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <span className="font-medium">Assistant:</span> {wing.WingAssistant ?? "Unassigned"}
                                </div>
                            </div>

                            {/* Metrics Footers */}
                            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5" title="Total Registrations">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{wing.Total_Registrations ?? 0}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5" title="Total Resulted">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{wing.Total_Resulted ?? 0}</span>
                                    </div>
                                </div>

                                {/* Active Configuration Badges */}
                                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                    wing.IsActive 
                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' 
                                        : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20'
                                }`}>
                                    <div className={`h-1.5 w-1.5 rounded-full ${wing.IsActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                    {wing.IsActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty Query Fallbacks */}
                    {filteredWings.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                            <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <h3 className="text-lg font-medium text-slate-900">No wings found</h3>
                            <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filter settings, or check your database.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}