import { useEffect, useState } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import {
    Building2,
    CreditCard,
    Smartphone,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Image as ImageIcon,
    AlertTriangle
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface BankDetails {
    Deati_id: string;
    Bank_Holde_Name: string;
    Account_Number: string;
    UPi_Number: string;
    PaY_Qr_Photo: string;
    IsActive: boolean;
}

export default function BankDetailsList() {
    const navigate = useNavigate();
    const { actUser } = useParams();
    const [banks, setBanks] = useState<BankDetails[]>([]);

    // UI States
    const [fetching, setFetching] = useState<boolean>(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

    // Conflict Alert Modal State
    const [conflictAlert, setConflictAlert] = useState<{ show: boolean; pendingBank: BankDetails | null }>({ show: false, pendingBank: null });

    // 1. Fetch Data
    const fetchBanks = async () => {
        try {
            setFetching(true);
            const { data, error } = await SupaBaseFunction
                .from("BanksDetails")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setBanks(data as BankDetails[]);
        } catch (err: any) {
            setFeedback({ type: "error", text: "Failed to load bank configurations. Please refresh the page." });
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchBanks();
    }, []);

    // 2. Handle Toggle Logic
    const handleToggleClick = async (targetBank: BankDetails) => {
        setFeedback({ type: "", text: "" }); // Clear old messages

        // If trying to activate, check if another one is already active
        if (!targetBank.IsActive) {
            const currentlyActive = banks.find(b => b.IsActive);
            if (currentlyActive) {
                // Trigger the Conflict Alert instead of immediately processing
                setConflictAlert({ show: true, pendingBank: targetBank });
                return;
            }
        }

        // If deactivating, or activating when none are active, proceed normally
        await processToggle(targetBank.Deati_id, !targetBank.IsActive);
    };

    // 3. Process the Database Update
    const processToggle = async (idToUpdate: string, newStatus: boolean, idToDeactivate?: string) => {
        try {
            setProcessingId(idToUpdate); // Show loading spinner on this specific row

            // If we need to swap, deactivate the old one first
            if (idToDeactivate) {
                const { error: swapError } = await SupaBaseFunction
                    .from("BanksDetails")
                    .update({ IsActive: false })
                    .eq("Deati_id", idToDeactivate);
                if (swapError) throw swapError;
            }

            // Update the target one
            const { error } = await SupaBaseFunction
                .from("BanksDetails")
                .update({ IsActive: newStatus })
                .eq("Deati_id", idToUpdate);

            if (error) throw error;

            // Update local state to reflect success without reloading the whole page
            setBanks(prev => prev.map(bank => {
                if (bank.Deati_id === idToUpdate) return { ...bank, IsActive: newStatus };
                if (idToDeactivate && bank.Deati_id === idToDeactivate) return { ...bank, IsActive: false };
                return bank;
            }));

            setFeedback({ type: "success", text: "Status successfully updated." });
            setConflictAlert({ show: false, pendingBank: null });

        } catch (err: any) {
            setFeedback({ type: "error", text: "An error occurred while updating the status. Please try again." });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8">

            {/* Header & Global Feedback */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Active Configurations</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage which payment gateway is currently live for users.</p>
                </div>
                <div>
                    <button onClick={()=>{navigate(`/admin-panel/${actUser}/create-bank-detail`)}} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Add Bank Detail
                    </button>
                </div>
                
            </div>

            {feedback.text && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 shadow-sm border ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                    {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                    <p className="text-sm font-medium leading-relaxed">{feedback.text}</p>
                </div>
            )}

            {/* Conflict Modal Overlay */}
            {conflictAlert.show && conflictAlert.pendingBank && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 transform transition-all">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Account Limit Reached</h3>
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                            You already have an active bank configuration. The system only allows <strong>one active account</strong> at a time to prevent user confusion. <br /><br />
                            Would you like to deactivate the current one and activate <strong>{conflictAlert.pendingBank.Bank_Holde_Name}</strong> instead?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConflictAlert({ show: false, pendingBank: null })}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => processToggle(conflictAlert.pendingBank!.Deati_id, true, banks.find(b => b.IsActive)?.Deati_id)}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                            >
                                Yes, Switch Active Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Account Details</th>
                                <th className="px-6 py-4 font-semibold">UPI Integration</th>
                                <th className="px-6 py-4 font-semibold">QR Code</th>
                                <th className="px-6 py-4 font-semibold text-right">Live Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">

                            {fetching ? (
                                // Loading Skeletons
                                [...Array(3)].map((_, i) => (
                                    <tr key={i} className="animate-pulse bg-white">
                                        <td className="px-6 py-5">
                                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                        </td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="px-6 py-5"><div className="h-12 w-12 bg-slate-100 rounded-lg"></div></td>
                                        <td className="px-6 py-5 flex justify-end"><div className="h-6 w-12 bg-slate-200 rounded-full"></div></td>
                                    </tr>
                                ))
                            ) : banks.length === 0 ? (
                                // Empty State
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p className="font-medium text-slate-700">No bank configurations found.</p>
                                        <p className="text-sm mt-1">Add a new configuration to start accepting donations.</p>
                                    </td>
                                </tr>
                            ) : (
                                // Actual Data Rows
                                banks.map((bank) => (
                                    <tr key={bank.Deati_id} className={`transition-colors hover:bg-slate-50 ${bank.IsActive ? 'bg-emerald-50/30' : 'bg-white'}`}>

                                        {/* Holder & Account */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${bank.IsActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{bank.Bank_Holde_Name}</p>
                                                    <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <CreditCard className="w-3 h-3" /> {bank.Account_Number}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* UPI Number */}
                                        <td className="px-6 py-4">
                                            <p className="text-slate-700 font-medium flex items-center gap-1.5">
                                                <Smartphone className="w-4 h-4 text-slate-400" />
                                                {bank.UPi_Number}
                                            </p>
                                        </td>

                                        {/* QR Code Thumbnail */}
                                        <td className="px-6 py-4">
                                            {bank.PaY_Qr_Photo ? (
                                                <div className="relative group w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                                                    <img src={bank.PaY_Qr_Photo} alt="QR" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-slate-400">
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>

                                        {/* Active Toggle Status */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-3">
                                                {processingId === bank.Deati_id ? (
                                                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={`text-xs font-semibold ${bank.IsActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {bank.IsActive ? 'Live' : 'Hidden'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleToggleClick(bank)}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${bank.IsActive ? 'bg-emerald-500' : 'bg-slate-300'
                                                                }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${bank.IsActive ? 'translate-x-6' : 'translate-x-1'
                                                                    }`}
                                                            />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}