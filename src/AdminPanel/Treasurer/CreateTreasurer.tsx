import React, { useState } from "react";
import { User, Mail, Calendar, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Hash } from "lucide-react";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Ensure correct path

export default function CreateTreasurer() {
  const initialFormState = {
    Treasurer_Name: "",
    Treasurer_Email: "",
    AccountingFor: "",
    IsActive: true,
    Treasurer_id: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Typed state for error/success messages
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      // 1. First create user in UserTable
      const { error: userError } = await SupaBaseFunction
        .from('UserTable')
        .insert([
          {
            UserEmail: formData.Treasurer_Email,
            UserPassword: formData.Treasurer_id,
            UserRole: "Treasurer"
          }
        ]);

      if (userError) throw userError; // Catch user creation errors (like duplicate emails)

      // 2. Then create treasurer profile in TreasurerVolt
      const { error: treasurerError } = await SupaBaseFunction
        .from("TreasurerVolt")
        .insert([
          {
            Treasurer_id: formData.Treasurer_id,
            Treasurer_Name: formData.Treasurer_Name,
            Treasurer_Email: formData.Treasurer_Email,
            AccountingFor: formData.AccountingFor,
            IsActive: formData.IsActive,
            Treasurer_UserId: formData.Treasurer_Email,
          }
        ]);

      if (treasurerError) throw treasurerError;

      setStatus({ type: "success", message: "Treasurer profile created successfully!" });
      setFormData(initialFormState);

      // Auto-hide success message after 4 seconds
      setTimeout(() => setStatus(null), 4000);

    } catch (err: unknown) {
      const error = err as Error;
      setStatus({ type: "error", message: error.message || "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center p-4 py-12 bg-slate-50 min-h-[calc(100vh-4rem)] font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all">

        {/* Header Area */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Treasurer</h2>
          <p className="text-indigo-100 text-sm mt-1">Set up a new financial manager profile</p>
        </div>

        {/* Form Area */}
        <div className="p-8">

          {/* Status Alerts */}
          {status && (
            <div className={`flex items-start gap-3 p-4 mb-6 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 transition-all ${
              status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {status.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
              <p>{status.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Treasurer ID Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Treasurer ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  name="Treasurer_id"
                  value={formData.Treasurer_id}
                  onChange={handleChange}
                  required
                  placeholder="e.g. TSR001"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="Treasurer_Name"
                  value={formData.Treasurer_Name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="Treasurer_Email"
                  value={formData.Treasurer_Email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Accounting For Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Accounting For</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={18} />
                </div>
                <input
                  type="text"
                  name="AccountingFor"
                  value={formData.AccountingFor}
                  onChange={handleChange}
                  placeholder="e.g. Academic Year 2026-2027"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Custom Toggle Switch for IsActive */}
            <div className="flex items-center justify-between py-2 border-b border-t border-slate-100 my-4">
              <div>
                <label className="text-sm font-semibold text-slate-800">Account Status</label>
                <p className="text-xs text-slate-500">Allow this treasurer to access the system</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="IsActive"
                  checked={formData.IsActive}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-700 w-12">
                  {formData.IsActive ? "Active" : "Inactive"}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Save Treasurer"
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}