import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
// Ensure this path aligns perfectly with your setup
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams } from "react-router-dom";
import SafeImage from "../../lib/SafeImage";
import EditWingModal from "./EditWingModal";
import { Edit2, Trash2, CheckCircle2, KeyRound, Mail, Lock, Eye, EyeOff, Copy, Check } from "lucide-react";

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
    Total_Points?: number | null;
    Bonus_Points?: number | null;
    Description?: string | null;
    IsActive: boolean;
    wing_logo?: string | null;
}

export default function AllWingsList() {

    const { actUser } = useParams<{ actUser: string }>();
    const decodedEmail = actUser ? decodeURIComponent(actUser) : null;

    // 2. State hooks initialized with precise TypeScript generic definitions
    const [wings, setWings] = useState<WingData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    // Modal & Toast States
    const [selectedWingForEdit, setSelectedWingForEdit] = useState<WingData | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Credentials & Copy States
    const [wingPasswords, setWingPasswords] = useState<Record<string, string>>({});
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const togglePasswordVisibility = (code: string) => {
        setVisiblePasswords((prev) => ({ ...prev, [code]: !prev[code] }));
    };

    const fetchWings = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await SupaBaseFunction
                .from('Chs-WingS')
                .select('*')
                .order('WingTitle', { ascending: true });

            if (fetchError) throw fetchError;

            // Also retrieve passwords from UserTable for exact admin syncing
            try {
                const { data: userAccounts } = await SupaBaseFunction
                    .from('UserTable')
                    .select('UserEmail, UserPassword')
                    .eq('UserRole', 'Wing');

                if (userAccounts) {
                    const passMap: Record<string, string> = {};
                    userAccounts.forEach((u: any) => {
                        if (u.UserEmail) {
                            passMap[u.UserEmail.toLowerCase().trim()] = u.UserPassword;
                        }
                    });
                    setWingPasswords(passMap);
                }
            } catch (authErr) {
                console.warn("Could not query UserTable credentials:", authErr);
            }

            setWings(data || []);
        } catch (err: any) {
            console.error("Critical Fetch Exception Encountered:", err);
            setError(err.message || "Failed to load wings records securely from data-store layer.");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch live rows from Supabase
    useEffect(() => {
        fetchWings();
    }, []);

    const handleEditWing = (wing: WingData) => {
        setSelectedWingForEdit(wing);
        setIsEditModalOpen(true);
    };

    const handleWingEditSuccess = () => {
        setActionFeedback({ message: "Wing details updated successfully!", type: "success" });
        fetchWings();
        setTimeout(() => setActionFeedback(null), 3000);
    };

    const handleDeleteWing = async (wing: WingData) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${wing.WingTitle || wing.WingCode}"? This will remove the wing department record.`
        );
        if (!confirmed) return;

        try {
            const { error: delError } = await SupaBaseFunction
                .from('Chs-WingS')
                .delete()
                .eq('WingCode', wing.WingCode);

            if (delError) throw delError;

            setWings(prev => prev.filter(w => w.WingCode !== wing.WingCode));
            setActionFeedback({ message: `Wing "${wing.WingTitle || wing.WingCode}" deleted successfully.`, type: "success" });
            setTimeout(() => setActionFeedback(null), 3000);
        } catch (err: any) {
            console.error("Failed to delete wing:", err);
            setActionFeedback({ message: `Error deleting wing: ${err.message}`, type: "error" });
            setTimeout(() => setActionFeedback(null), 4000);
        }
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

            {/* --- ACTION FEEDBACK BANNER --- */}
            {actionFeedback && (
                <div className={`mb-6 rounded-2xl border p-4 text-xs sm:text-sm font-semibold flex items-center gap-3 transition-all ${
                    actionFeedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"
                }`}>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span>{actionFeedback.message}</span>
                </div>
            )}

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
                                    <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                                        {wing.wing_logo ? (
                                            <SafeImage
                                                src={wing.wing_logo}
                                                alt={wing.WingTitle ?? "Wing Logo"}
                                                fallbackCategory="wing"
                                                fallbackText={wing.WingTitle || "W"}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <span className="font-bold text-xs text-blue-700">
                                                {(wing.WingTitle || "W")[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
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
                                    <button
                                        type="button"
                                        onClick={() => handleEditWing(wing)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                                        title="Edit Wing Details"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteWing(wing)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                        title="Delete Wing"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Authentication Detail Wrapper (Collapse-Proof, Fully Responsive) */}
                            {decodedEmail ? (
                                <div className="mt-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5 space-y-3">
                                    {/* Section Header */}
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <KeyRound className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">
                                                Wing Credentials
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full shrink-0">
                                            Admin View
                                        </span>
                                    </div>

                                    {/* Login Email Block */}
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                                Login Email
                                            </span>
                                            {wing.WingEmail && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(wing.WingEmail || "", `email-${wing.WingCode}`)}
                                                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                                                    title="Copy Login Email"
                                                >
                                                    {copiedKey === `email-${wing.WingCode}` ? (
                                                        <>
                                                            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                                            <span className="text-emerald-600 font-bold">Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3 w-3 shrink-0" />
                                                            <span>Copy</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div 
                                            className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs min-w-0"
                                            title={wing.WingEmail ?? "No email configured"}
                                        >
                                            <span className="font-mono text-xs font-semibold text-slate-800 truncate select-all min-w-0">
                                                {wing.WingEmail || <span className="text-slate-400 italic">No email assigned</span>}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Password Block */}
                                    {(() => {
                                        const currentPass = (wing.WingEmail && wingPasswords[wing.WingEmail.toLowerCase().trim()]) || wing.WingCode;
                                        const isPassVisible = !!visiblePasswords[wing.WingCode];
                                        const isCustom = currentPass !== wing.WingCode;

                                        return (
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <span className="flex items-center gap-1">
                                                        <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                                                        Password
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        {isCustom ? "Custom Key" : "Wing Code (Default)"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs min-w-0">
                                                    <span className="font-mono text-xs font-bold text-indigo-700 select-all truncate min-w-0">
                                                        {isPassVisible ? currentPass : "••••••••"}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePasswordVisibility(wing.WingCode)}
                                                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                                            title={isPassVisible ? "Hide password" : "Show password"}
                                                        >
                                                            {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(currentPass, `pass-${wing.WingCode}`)}
                                                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                                            title="Copy password"
                                                        >
                                                            {copiedKey === `pass-${wing.WingCode}` ? (
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <h3 className="text-lg mt-3 font-bold text-slate-800 line-clamp-1">
                                    Wing Managers
                                </h3>
                            )}

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
                                        <span className="text-sm font-bold text-slate-700">{wing.Total_Registrations ?? 0} Registered</span>
                                    </div>

                                    <div className="flex items-center gap-1.5" title="Total Resulted">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{wing.Total_Resulted ?? 0} Resulted</span>
                                    </div>
                                </div>

                                {/* Active Configuration Badges */}
                                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${wing.IsActive
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                    : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20'
                                    }`}>
                                    <div className={`h-1.5 w-1.5 rounded-full ${wing.IsActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                    {wing.IsActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            {/* Action Button Row */}
                            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleEditWing(wing)}
                                    className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 active:bg-indigo-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-100 shadow-2xs"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    <span>Edit Wing Info</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteWing(wing)}
                                    className="py-2 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                    title="Delete Wing"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
            )
            }

            {/* Edit Wing Modal */}
            <EditWingModal
                wing={selectedWingForEdit}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedWingForEdit(null);
                }}
                onSuccess={handleWingEditSuccess}
            />
        </div>
    );
}