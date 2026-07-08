import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";

export default function CreateExpance() {
  const { actTreasurer } = useParams<{ actTreasurer: string }>();
  const decodedEmail = actTreasurer ? decodeURIComponent(actTreasurer) : "";

  const [formData, setFormData] = useState({
    forwhat: "",
    how_mach: "",
    Whom_Gave: "",
    Date: "",
    Method: "Cash",
    Income_Outcome: "Expense",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // FIX: Typed the change event for both inputs and selects
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // FIX: Typed the type parameter
  const setTransactionType = (type: string) => {
    setFormData({ ...formData, Income_Outcome: type });
  };

  // FIX: Typed the form submission event
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!decodedEmail) {
      alert("Error: Treasurer email is missing from the URL.");
      return;
    }

    setIsLoading(true);
    
    try {
      const payload = {
        forwhat: formData.forwhat,
        how_mach: Number(formData.how_mach),
        Whom_Gave: formData.Whom_Gave,
        Date: formData.Date || null,
        Method: formData.Method,
        Income_Outcome: formData.Income_Outcome,
        Treasurer_Email: decodedEmail
      };

      const { error } = await SupaBaseFunction
        .from('EconoMicalBox')
        .insert([payload])
        .select();

      if (error) {
        throw error;
      }

      alert(`${formData.Income_Outcome} added successfully!`);
      setFormData({
        forwhat: "",
        how_mach: "",
        Whom_Gave: "",
        Date: "",
        Method: "Cash",
        Income_Outcome: "Expense",
      });

    } catch (err: unknown) {
      // FIX: Handle 'unknown' error type and cast safely
      const error = err as { message: string; details?: string };
      console.error("Supabase Insert Error:", error.message, error.details);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isIncome = formData.Income_Outcome === "Income";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className={`p-6 text-white transition-colors duration-300 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          <h2 className="text-2xl font-bold text-center">Add New Transaction</h2>
          <p className="text-center text-sm opacity-90 mt-1">Logging as: {decodedEmail || "Unknown"}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => setTransactionType("Income")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isIncome ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
              Income
            </button>
            <button type="button" onClick={() => setTransactionType("Expense")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isIncome ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>
              Expense
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹/$)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-lg">$</span>
              <input type="number" name="how_mach" value={formData.how_mach} onChange={handleChange} required className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">For What</label>
              <input type="text" name="forwhat" value={formData.forwhat} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Groceries" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Whom / From</label>
              <input type="text" name="Whom_Gave" value={formData.Whom_Gave} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. John Doe" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="time" name="Date" value={formData.Date} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
              <select name="Method" value={formData.Method} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="UPI / Bank Transfer">UPI / Bank Transfer</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-lg transition-all ${isIncome ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"} ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}>
            {isLoading ? "Saving..." : `Save ${formData.Income_Outcome}`}
          </button>
        </form>
      </div>
    </div>
  );
}