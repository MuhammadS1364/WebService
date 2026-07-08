import React, { useState } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Ensure correct path

export default function CreateTreasurer() {
  const [formData, setFormData] = useState({
    Treasurer_Name: "",
    Treasurer_Email: "",
    AccountingFor: "",
    IsActive: true,
  });

  // Typed state for error/success messages
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // FIX: Type the event properly
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  // FIX: Type the submit event properly
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const { error } = await SupaBaseFunction
        .from("TreasurerVolt")
        .insert([formData]);

      if (error) throw error;

      setStatus({ type: "success", message: "Treasurer created successfully!" });
      setFormData({
        Treasurer_Name: "",
        Treasurer_Email: "",
        AccountingFor: "",
        IsActive: true,
      });
    } catch (err: unknown) {
      // FIX: Assert 'err' as any or Error to safely access message
      const error = err as Error;
      setStatus({ type: "error", message: error.message || "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-slate-100 mt-10">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Create Treasurer</h2>
      
      {status && (
        <div className={`p-4 mb-4 rounded-lg text-sm ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input type="text" name="Treasurer_Name" value={formData.Treasurer_Name} onChange={handleChange} required className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" name="Treasurer_Email" value={formData.Treasurer_Email} onChange={handleChange} required className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Accounting For (e.g. 2026-2027)</label>
          <input type="text" name="AccountingFor" value={formData.AccountingFor} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" name="IsActive" checked={formData.IsActive} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
          <label className="text-sm text-slate-700">Is Active</label>
        </div>
        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {isLoading ? "Saving..." : "Save Treasurer"}
        </button>
      </form>
    </div>
  );
}