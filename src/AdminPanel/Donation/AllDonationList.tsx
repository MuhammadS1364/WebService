
import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { Search, Users, TrendingUp, Loader2 } from "lucide-react";

interface DonationRecord {
  Donner_id: string;
  created_at: string;
  Donator_Name: string | null;
  Donator_Place: string | null;
  DonationAmnts: number | null;
  DonationYear: number | null;
  FeedBack: string | null;
  PayMentType: string | null;
}

export default function AllDonationList() {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("All");

  useEffect(() => {
    async function fetchDonations() {
      try {
        setLoading(true);
        const { data, error } = await SupaBaseFunction
          .from("DonationTable")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDonations(data as DonationRecord[]);
      } catch (error) {
        console.error("Error pulling financial ledger rows:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDonations();
  }, []);

  const filteredDonations = donations.filter(item => {
    const matchesSearch = (item.Donator_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.Donator_Place || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "All" || item.DonationYear?.toString() === selectedYear;
    return matchesSearch && matchesYear;
  });

  const totalFunds = filteredDonations.reduce((sum, item) => sum + (item.DonationAmnts || 0), 0);
  const uniqueYears = ["All", ...Array.from(new Set(donations.map(d => d.DonationYear?.toString()).filter(Boolean)))];

  return (
    <div className="mx-auto py-8 px-4">
      {/* KPI Section */}

      {/* Header & Global Feedback */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">All Donation</h2>
          <p className="text-sm text-slate-500 mt-1">Every small donation helps us make a big difference in the community.</p>
        </div>
        <div>
          
        </div>

      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 opacity-90 mb-2">
            <TrendingUp className="w-5 h-5" /> Total Funds Raised
          </div>
          <div className="text-4xl font-bold tracking-tight">₹{totalFunds.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Users className="w-5 h-5" /> Total Transactions
          </div>
          <div className="text-3xl font-bold text-slate-800">{filteredDonations.length}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or place..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {uniqueYears.map(year => <option key={year} value={year}>{year === "All" ? "All Years" : year}</option>)}
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" /> Fetching ledger...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">Contributor</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Location</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Method</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonations.map((item) => (
                  <tr key={item.Donner_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.Donator_Name}</td>
                    <td className="px-6 py-4 text-slate-600">{item.Donator_Place}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
                        {item.PayMentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                      ₹{item.DonationAmnts?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}