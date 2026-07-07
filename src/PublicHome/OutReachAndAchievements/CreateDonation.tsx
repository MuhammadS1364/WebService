import React, { useState } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { Landmark, Smartphone, QrCode, DollarSign, User, MapPin, MessageSquare, ShieldCheck } from "lucide-react";

// 1. Declare Data Schema based on your Table Structure
interface DonationFormState {
  Donator_Name: string;
  Donator_Place: string;
  DonationAmnts: number;
  DonationYear: number;
  FeedBack: string;
  PayMentType: "Bank Transfer" | "UPI / QR" | "Cash";
}

export default function CreateDonationForUs() {
  // Static Banking Metadata Config Object
  const bankConfig = {
    BankAct_Holder_Name: "CHS Development Trust",
    BankActnNum: "9508095318",
    PhoneNumber: "9508095318",
    Qr_CodeImg: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=school@upi", // Fallback generated placeholder QR
  };

  const [formData, setFormData] = useState<DonationFormState>({
    Donator_Name: "",
    Donator_Place: "",
    DonationAmnts: 100, // Reasonable starting default value
    DonationYear: new Date().getFullYear(),
    FeedBack: "",
    PayMentType: "UPI / QR",
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    try {
      setSubmitting(true);

      const { error } = await SupaBaseFunction
        .from("DonationTable")
        .insert([
          {
            ...formData,
            DonationAmnts: parseInt(String(formData.DonationAmnts), 10),
            DonationYear: parseInt(String(formData.DonationYear), 10),
          },
        ]);

      if (error) throw error;

      setFeedback({
        type: "success",
        text: "✨ Thank you! Your donation registration ledger has been successfully recorded.",
      });

      // Clear the Form inputs safely
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans flex items-center justify-center relative overflow-hidden">
      {/* Decorative Radial Background Lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT COLUMN: INTERACTIVE BANKING PAYMENT BOX GUIDE */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-slate-900 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800/30">
              Payment Gateway Guide
            </span>
            <h2 className="text-2xl font-black text-white mt-4">How to complete your contribution</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Please execute your transaction using one of our verified campus accounts below <strong className="text-emerald-400">prior to completing the registration details form</strong>.
            </p>

            {/* Account Info list */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 bg-slate-900/50 border border-slate-800/60 p-4 rounded-xl">
                <Landmark className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Bank Wire Transfer</p>
                  <p className="text-slate-200 mt-1 font-semibold text-sm">{bankConfig.BankAct_Holder_Name}</p>
                  <p className="text-slate-400 mt-0.5 font-mono select-all">A/C: {bankConfig.BankActnNum}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/50 border border-slate-800/60 p-4 rounded-xl">
                <Smartphone className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Direct Mobile Gateway / UPI</p>
                  <p className="text-slate-400 mt-1 font-mono select-all">{bankConfig.PhoneNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Container Module */}
          <div className="mt-8 pt-6 border-t border-slate-900 text-center flex flex-col items-center">
            <div className="p-3 bg-white rounded-2xl inline-block shadow-lg relative group">
              <img src={bankConfig.Qr_CodeImg} alt="Payment Routing QR" className="w-36 h-36 object-contain" />
              <div className="absolute inset-0 bg-slate-950/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                <QrCode className="w-6 h-6 text-slate-900 bg-white p-1 rounded-md" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-3 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Encryption Routing Checked
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: DONATION SUBMISSION REGISTRY FORM */}
        <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-black tracking-tight text-white">Register Contribution Receipt</h1>
              <p className="text-xs text-slate-400 mt-1">Append your financial transaction token records into the system public archive.</p>
            </div>

            {feedback.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm border font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}>
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ROW 1: NAME */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Contributor Name / Organization <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="Donator_Name"
                  required
                  value={formData.Donator_Name}
                  onChange={handleInputChange}
                  placeholder="e.g., Alumnus Benefactor Group"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none transition-all"
                />
              </div>

              {/* ROW 2: LOCATION & TRANSACTION ROUTE TYPE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> Contributor Location
                  </label>
                  <input
                    type="text"
                    name="Donator_Place"
                    value={formData.Donator_Place}
                    onChange={handleInputChange}
                    placeholder="e.g., London, UK"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Selected Payment Method
                  </label>
                  <select
                    name="PayMentType"
                    value={formData.PayMentType}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none transition-all"
                  >
                    <option value="UPI / QR">⚡ UPI / Live QR Scan</option>
                    <option value="Bank Transfer">🏢 Bank wire Transfer</option>
                    <option value="Cash">💵 Physical Cash Deposit</option>
                  </select>
                </div>
              </div>

              {/* ROW 3: AMOUNT & BUDGETARY REGISTRY YEAR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Amount Contributed <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="DonationAmnts"
                    required
                    min={1}
                    value={formData.DonationAmnts}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Donation Ledger Calendar Year
                  </label>
                  <input
                    type="number"
                    name="DonationYear"
                    required
                    value={formData.DonationYear}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* ROW 4: BENEDICTORY MESSAGE FEEDBACK BOX */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> Feedback / Dedicated Message Notes
                </label>
                <textarea
                  name="FeedBack"
                  rows={3}
                  value={formData.FeedBack}
                  onChange={handleInputChange}
                  placeholder="Leave an encouraging memo, prayer request, or note for the campus logs..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              {/* ACTION EXECUTION BUTTON PANELS */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm tracking-wide rounded-xl shadow-xl shadow-indigo-600/10 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving Ledger Records..." : "💾 Register Donation Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}