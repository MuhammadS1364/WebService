import { useState, useEffect, useRef } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";

export default function AllProgrammesList() {
    const [viewMode, setViewMode] = useState("list");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Calendar Navigation States (Defaults to July 2026)
    const [currentYear, setCurrentYear] = useState(2026);
    const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed: 6 = July
    const [selectedDate, setSelectedDate] = useState("2026-07-05");

    // Data States
    const [programmes, setProgrammes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef(null);
    const [filters, setFilters] = useState({ wing: "All", category: "All", group: "All" });

    // Handle Mobile Responsiveness Layout
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 650);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // --- FETCH PROGRAMMES DATA ---
    const fetchProgrammes = async () => {
        setIsLoading(true);
        try {
            let query = SupaBaseFunction.from("ProgrammesBox").select("*");

            // CRITICAL: If viewMode is calendar, restrict to selected date. Otherwise, fetch all records.
            if (viewMode === "calendar") {
                query = query.eq("Date", selectedDate);
            }

            const { data: programmesData, error: progError } = await query;
            if (progError) throw progError;
            
            if (!programmesData || programmesData.length === 0) {
                setProgrammes([]);
                return;
            }

            // Fetch structural details matching WingCode keys
            const wingCodes = [...new Set(programmesData.map(p => p.WingCode).filter(Boolean))];
            let wingsData = [];
            
            if (wingCodes.length > 0) {
                const { data: wData, error: wingError } = await SupaBaseFunction
                    .from("Chs-WingS")
                    .select("WingCode, WingTitle, WingEmail")
                    .in("WingCode", wingCodes);

                if (wingError) throw wingError;
                wingsData = wData || [];
            }

            const mergedData = programmesData.map(prog => {
                const matchedWing = wingsData.find(w => w.WingCode === prog.WingCode);
                return {
                    ...prog,
                    WingTitle: matchedWing ? matchedWing.WingTitle : null,
                    WingEmail: matchedWing ? matchedWing.WingEmail : null
                };
            });

            setProgrammes(mergedData);
        } catch (err) {
            console.error("Error fetching data hooks:", err);
            setProgrammes([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Re-trigger global query state logic upon view changes or date modifications
    useEffect(() => {
        fetchProgrammes();
    }, [viewMode, selectedDate]);

    // Unique dynamic filter dropdown arrays extracted directly from compiled data
    const uniqueWings = ["All", ...new Set(programmes.map(p => p.WingTitle || p.WingCode).filter(Boolean))];
    const uniqueCategories = ["All", ...new Set(programmes.map(p => p.Category).filter(Boolean))];

    // --- CALENDAR NAVIGATION MATH HANDLERS ---
    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Generate accurate calendar grid array mappings
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    // --- APPROVE PROGRAMME ---
    const handleApprove = async (code) => {
        try {
            const { error } = await SupaBaseFunction
                .from('ProgrammesBox')
                .update({ IsApproved: true })
                .eq('Program_Code', code);

            if (error) throw error;
            setProgrammes(prev => prev.map(p => p.Program_Code === code ? { ...p, IsApproved: true } : p));
        } catch (error) {
            console.error("Error setting approval state:", error.message);
        }
    };

    // --- EXPORT CSV ---
    const handleExport = () => {
        if (programmes.length === 0) return alert("No operational configurations to parse.");
        const headers = "Program_Code,Program_Title,WingCode,Date,Venue,Category,Group,IsApproved\n";
        const csvRows = programmes.map(p => `"${p.Program_Code}","${p.Program_Title}","${p.WingCode}","${p.Date}","${p.Venue}","${p.Category}","${p.Group}","${p.IsApproved}"`);
        const blob = new Blob([headers + csvRows.join("\n")], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Programmes_System_Dump.csv';
        a.click();
    };

    // --- CSV PARSER & INCREMENT ENGINE ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length <= 1) {
                setIsImporting(false);
                return;
            }

            const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
            const itemsToInsert = [];
            const wingRegistrationIncrements = {};

            for (let i = 1; i < lines.length; i++) {
                const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const rowData = {};
                
                headers.forEach((header, index) => {
                    let val = currentLine[index] ? currentLine[index].replace(/^"|"$/g, '').trim() : "";
                    rowData[header] = val;
                });

                if (rowData.Program_Code && rowData.Program_Title) {
                    itemsToInsert.push({
                        Program_Code: rowData.Program_Code,
                        Program_Title: rowData.Program_Title,
                        WingCode: rowData.WingCode || "",
                        Date: rowData.Date || new Date().toISOString().split('T')[0],
                        Venue: rowData.Venue || "",
                        Category: rowData.Category || "",
                        Group: rowData.Group || "",
                        IsApproved: rowData.IsApproved === "true" || false
                    });

                    if (rowData.WingCode) {
                        wingRegistrationIncrements[rowData.WingCode] = (wingRegistrationIncrements[rowData.WingCode] || 0) + 1;
                    }
                }
            }

            try {
                const { error: insertError } = await SupaBaseFunction.from("ProgrammesBox").insert(itemsToInsert);
                if (insertError) throw insertError;

                for (const wingCode of Object.keys(wingRegistrationIncrements)) {
                    const { data: wingRecords, error: fetchWingError } = await SupaBaseFunction
                        .from("Chs-WingS")
                        .select("WingCode, Total_Registrations")
                        .eq("WingCode", wingCode);

                    if (!fetchWingError && wingRecords && wingRecords.length > 0) {
                        const targetWing = wingRecords[0];
                        const incrementValue = wingRegistrationIncrements[wingCode];
                        
                        await SupaBaseFunction
                            .from("Chs-WingS")
                            .update({ Total_Registrations: (targetWing.Total_Registrations || 0) + incrementValue })
                            .eq("WingCode", wingCode);
                    }
                }

                alert(`Successfully loaded ${itemsToInsert.length} components.`);
                fetchProgrammes();
            } catch (err) {
                console.error("Bulk process failure:", err);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    // --- FILTER & SEARCH IMPLEMENTATION ---
    const filteredProgrammes = programmes.filter(p => {
        const currentWing = p.WingTitle || p.WingCode || "";
        const matchesSearch = (p.Program_Title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (p.Program_Code?.toLowerCase() || "").includes(searchQuery.toLowerCase());
        const matchesWing = filters.wing === "All" || currentWing === filters.wing;
        const matchesCategory = filters.category === "All" || p.Category === filters.category;

        return matchesSearch && matchesWing && matchesCategory;
    });

    return (
        <div className="mx-auto p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
            
            {/* TOP ACTIONS CONTROL BANNER */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-emerald-900">Programmes Repository</h1>
                    <p className="text-slate-500 text-sm mt-1">Viewing structural table metrics and automated allocation trackers</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    
                    <button disabled={isImporting} onClick={() => fileInputRef.current.click()} className="px-3 py-2 text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded-lg shadow-sm transition">
                        {isImporting ? "Processing..." : "↑ Import CSV"}
                    </button>
                    <button onClick={handleExport} className="px-3 py-2 text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded-lg shadow-sm transition">
                        ↓ Export Content
                    </button>

                    <div className="inline-flex bg-slate-200/70 p-1 rounded-lg">
                        <button className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === 'list' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600'}`} onClick={() => setViewMode('list')}>☷ Full List</button>
                        <button className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === 'calendar' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600'}`} onClick={() => setViewMode('calendar')}>📅 Calendar Grid</button>
                    </div>
                </div>
            </header>

            {/* LIST FILTER BAR */}
            <div className="p-4 mb-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
                <input 
                    type="text" 
                    placeholder="Search database schedules..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full sm:max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <div className="flex w-full sm:w-auto gap-2 justify-end">
                    <select onChange={(e) => setFilters({ ...filters, wing: e.target.value })} className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-600">
                        {uniqueWings.map(w => <option key={w} value={w}>{w === "All" ? "All Wings" : w}</option>)}
                    </select>
                    <select onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-600">
                        {uniqueCategories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
                    </select>
                </div>
            </div>

            {/* DYNAMIC VIEW CONTAINER RENDERING ENGINE */}
            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {!isMobile ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 tracking-wider uppercase">
                                    <th className="p-4">Program Code</th>
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Assigned Wing</th>
                                    <th className="p-4">Venue Space</th>
                                    <th className="p-4">Scheduled Date</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {isLoading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">Syncing database registers...</td></tr>
                                ) : filteredProgrammes.length > 0 ? (
                                    filteredProgrammes.map(prog => (
                                        <tr key={prog.Program_Code} className="hover:bg-slate-50/50 transition">
                                            <td className="p-4 font-mono font-bold text-slate-900">{prog.Program_Code}</td>
                                            <td className="p-4 font-medium text-slate-800">{prog.Program_Title}</td>
                                            <td className="p-4 text-slate-600">{prog.WingTitle || prog.WingCode || 'Unassigned'}</td>
                                            <td className="p-4 text-slate-700">{prog.Venue}</td>
                                            <td className="p-4 font-medium text-slate-600">{prog.Date}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${prog.IsApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {prog.IsApproved ? 'Approved' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {!prog.IsApproved && (
                                                    <button onClick={() => handleApprove(prog.Program_Code)} className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm transition">
                                                        Approve
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="p-12 text-center text-slate-400">No active parameters match your filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* MOBILE LAYOUT STRUCTURAL WRAPPER */
                        <div className="p-4 grid grid-cols-1 gap-4 bg-slate-50">
                            {filteredProgrammes.map(prog => (
                                <div key={prog.Program_Code} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{prog.Program_Code}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prog.IsApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{prog.IsApproved ? 'Approved' : 'Pending'}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 mt-1">{prog.Program_Title}</h3>
                                    <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                                        <p>📍 Venue: {prog.Venue}</p>
                                        <p>📆 Date: {prog.Date}</p>
                                        <p>🛡️ Wing: {prog.WingTitle || prog.WingCode}</p>
                                    </div>
                                    {!prog.IsApproved && (
                                        <button onClick={() => handleApprove(prog.Program_Code)} className="w-full mt-2 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded shadow">Approve Session</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* CALENDAR GRID VIEW ENGINE INTERFACE */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">{monthNames[currentMonth]} {currentYear}</h2>
                            <div className="flex items-center gap-1.5">
                                <button onClick={handlePrevMonth} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-bold transition">{"<"}</button>
                                <button onClick={() => { const d=new Date(); setCurrentYear(d.getFullYear()); setCurrentMonth(d.getMonth()); setSelectedDate(d.toISOString().split('T')[0]); }} className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition">Current</button>
                                <button onClick={handleNextMonth} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-bold transition">{">"}</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-1">{day}</div>)}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-2">
                            {/* Empty offset padding spaces */}
                            {[...Array(firstDayIndex)].map((_, i) => <div key={`empty-${i}`} className="aspect-square bg-slate-50/40 rounded-xl border border-dashed border-slate-100"></div>)}
                            
                            {/* Core Calendar Loop rendering counter logic blocks */}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const dayNum = i + 1;
                                const padMonth = (currentMonth + 1).toString().padStart(2, '0');
                                const padDay = dayNum.toString().padStart(2, '0');
                                const iterDateStr = `${currentYear}-${padMonth}-${padDay}`;
                                
                                const isSelected = selectedDate === iterDateStr;
                                
                                // Compute dynamic values directly out of database items
                                const matchCount = programmes.filter(p => p.Date === iterDateStr).length;
                                const hasPrograms = matchCount > 0;

                                return (
                                    <button 
                                        key={dayNum} 
                                        onClick={() => setSelectedDate(iterDateStr)}
                                        className={`aspect-square relative flex flex-col justify-between p-2 rounded-xl transition border text-left ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10' : 'bg-slate-50/70 hover:bg-slate-100 border-slate-100 text-slate-800'}`}
                                    >
                                        <div className="flex w-full justify-between items-start">
                                            <span className="text-sm font-bold">{dayNum}</span>
                                            {/* Dynamic Indicator Dot */}
                                            {hasPrograms && (
                                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></span>
                                            )}
                                        </div>
                                        {/* Dynamic Count Metric */}
                                        <span className={`text-[10px] font-medium tracking-tight block ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                            {hasPrograms ? `${matchCount} Prog${matchCount > 1 ? 's' : ''}` : '\u00A0'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SIDE PANEL SCHEDULE MONITOR DISPLAY */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">🗓️ Target View Date: <span className="text-slate-800 font-mono font-bold block text-sm mt-0.5">{selectedDate}</span></h3>
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[440px] pr-1">
                            {filteredProgrammes.length > 0 ? (
                                filteredProgrammes.map(prog => (
                                    <div key={prog.Program_Code} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm leading-tight">{prog.Program_Title}</h4>
                                            <p className="text-xs text-slate-400 font-mono mt-1">{prog.Program_Code} • {prog.WingTitle || prog.WingCode || 'No Wing Assigned'}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-200/60">
                                            <span className="text-xs text-slate-600 font-medium">📍 {prog.Venue}</span>
                                            {!prog.IsApproved && (
                                                <button onClick={() => handleApprove(prog.Program_Code)} className="px-2 py-1 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition">Approve</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-400 text-sm">No localized program logs are tied to this calendar date coordinates.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}