import React, { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { 
  Landmark, Smartphone, QrCode, DollarSign, User, MapPin, 
  MessageSquare, ShieldCheck, CheckCircle2, AlertCircle, 
  Loader2, Mail 
} from "lucide-react";

interface DonationFormState {
  Donator_Name: string;
  Donator_Place: string;
  DonationAmnts: number;
  DonationYear: number;
  FeedBack: string;
  PayMentType: "Bank Transfer" | "UPI / QR" | "Cash";
}

interface BankDetails {
  Bank_Holde_Name: string;
  Account_Number: string;
  UPi_Number: string;
  PaY_Qr_Photo: string;
}

export default function CreateDonationForUs() {
  const [formData, setFormData] = useState<DonationFormState>({
    Donator_Name: "",
    Donator_Place: "",
    DonationAmnts: 100,
    DonationYear: new Date().getFullYear(),
    FeedBack: "",
    PayMentType: "UPI / QR",
  });

  // State for fetching active bank details
  const [activeBank, setActiveBank] = useState<BankDetails | null>(null);
  const [fetchingBank, setFetchingBank] = useState<boolean>(true);
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // Fetch the active bank configuration on mount
  useEffect(() => {
    const fetchActiveBank = async () => {
      try {
        setFetchingBank(true);
        const { data, error } = await SupaBaseFunction
          .from("BanksDetails")
          .select("Bank_Holde_Name, Account_Number, UPi_Number, PaY_Qr_Photo")
          .eq("IsActive", true)
          .limit(1)
          .single(); // Gets the single active row

        if (error && error.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is fine (handled below)
          console.error("Error fetching bank:", error.message);
        }

        if (data) {
          setActiveBank(data as BankDetails);
        } else {
          setActiveBank(null); // No active bank found
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setActiveBank(null);
      } finally {
        setFetchingBank(false);
      }
    };

    fetchActiveBank();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    try {
      setSubmitting(true);
      const { error } = await SupaBaseFunction.from("DonationTable").insert([
        {
          ...formData,
          DonationAmnts: parseInt(String(formData.DonationAmnts), 10),
          DonationYear: parseInt(String(formData.DonationYear), 10),
        },
      ]);

      if (error) throw error;

      setFeedback({
        type: "success",
        text: "Thank you! Your donation registration ledger has been successfully recorded.",
      });

      setFormData({
        Donator_Name: "",
        Donator_Place: "",
        DonationAmnts: 100,
        DonationYear: new Date().getFullYear(),
        FeedBack: "",
        PayMentType: "UPI / QR",
      });
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "An unexpected error took place during insertion." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      
      {/* Page Header */}
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Support Our Vision</h2>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Please complete your contribution using our verified accounts below, then log your transaction details in the registry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Dynamic Payment Guide OR Fallback */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full">
          
          {fetchingBank ? (
            // Loading Skeleton
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center h-full min-h-[400px] animate-pulse">
              <Loader2 className="w-10 h-10 text-emerald-200 animate-spin mb-4" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
          ) : activeBank ? (
            // Active Bank Configuration Found
            <>
              {/* Bank Transfer Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Bank Wire Transfer</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Account Name</p>
                    <p className="font-medium text-slate-800">{activeBank.Bank_Holde_Name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Account Number</p>
                    <p className="font-mono text-lg font-semibold text-emerald-700">{activeBank.Account_Number}</p>
                  </div>
                </div>
              </div>

              {/* UPI & QR Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-md text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <QrCode className="w-32 h-32" />
                </div>
                <div className="p-4 border-b border-white/20 flex items-center gap-3 relative z-10">
                  <Smartphone className="w-5 h-5 text-emerald-100" />
                  <h3 className="font-semibold text-white">Direct Mobile Gateway / UPI</h3>
                </div>
                <div className="p-6 relative z-10 flex flex-col items-center text-center">
                  <div className="bg-white p-3  rounded-xl shadow-inner mb-4 inline-block">
                    <img src={activeBank.PaY_Qr_Photo} alt="UPI QR Code" className="w-75 h-80 rounded-lg object-contain" />
                  </div>
                  <p className="text-emerald-100 text-sm mb-1">Scan to pay, or use ID:</p>
                  <p className="font-mono text-xl font-bold tracking-wider">{activeBank.UPi_Number}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs bg-black/20 py-1.5 px-3 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>Verified Organizational Account</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // NO ACTIVE BANK - Fallback UI
            <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-100 overflow-hidden flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px]">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5">
                <AlertCircle className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Bank Details Unavailable</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                We are currently updating our payment gateways. No active bank account details are available right now. Please reach out to us via email to make a contribution.
              </p>
              <a 
                href="mailto:anjumanniicschs@gmail.com" 
                className="flex items-center gap-2.5 bg-slate-900 text-white px-6 py-3.5 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-md hover:shadow-lg w-full justify-center"
              >
                <Mail className="w-5 h-5 text-amber-400" />
                anjumanniicschs@gmail.com
              </a>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: The Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Register Receipt</h3>
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Ledger Entry
            </span>
          </div>

          {feedback.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
              <p className="text-sm font-medium leading-relaxed">{feedback.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Name & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" /> Contributor Name
                </label>
                <input
                  type="text"
                  name="Donator_Name"
                  required
                  value={formData.Donator_Name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" /> Location
                </label>
                <input
                  type="text"
                  name="Donator_Place"
                  required
                  value={formData.Donator_Place}
                  onChange={handleInputChange}
                  placeholder="e.g., London, UK"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Row 2: Amount & Payment Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-slate-400" /> Amount Contributed
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <input
                    type="number"
                    name="DonationAmnts"
                    required
                    min="1"
                    value={formData.DonationAmnts}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-8 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Payment Method Used</label>
                <select
                  name="PayMentType"
                  value={formData.PayMentType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="UPI / QR">⚡ UPI / Live QR Scan</option>
                  <option value="Bank Transfer">🏢 Bank Wire Transfer</option>
                  <option value="Cash">💵 Physical Cash Deposit</option>
                </select>
              </div>
            </div>

            {/* Row 3: Feedback Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-slate-400" /> Dedicated Message / Notes
              </label>
              <textarea
                name="FeedBack"
                rows={3}
                value={formData.FeedBack}
                onChange={handleInputChange}
                placeholder="Leave an encouraging memo, prayer request, or note for the campus logs..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || (!activeBank && formData.PayMentType !== "Cash")} // Optional safety
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    Register Donation Receipt
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-4">
                Ledger Year: <span className="font-medium text-slate-500">{formData.DonationYear}</span>
              </p>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  );
}