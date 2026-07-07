import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { Search, Filter, Calendar, MapPin, Landmark } from "lucide-react";

// Define Data Schema matching your DonationTable Structure
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
        if (data) setDonations(data as DonationRecord[]);
      } catch (error) {
        console.error("Error pulling financial ledger rows:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDonations();
  }, []);

  // Compute stats and filters dynamically
  const uniqueYears = ["All", ...new Set(donations.map(d => d.DonationYear?.toString()).filter(Boolean))];
  const totalFundsRaised = donations.reduce((sum, item) => sum + (item.DonationAmnts || 0), 0);

  // Apply search filtering models
  const filteredDonations = donations.filter(item => {
    const matchesSearch = (item.Donator_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.Donator_Place || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "All" || item.DonationYear?.toString() === selectedYear;
    return matchesSearch && matchesYear;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-emerald-500 selection:text-white relative">
      
      {/* High Energy Background Glow Accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Grid Section */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-900 pb-8">
        <div>
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/30">
            Financial Ledger Archive
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            Our Benevolent Donors
          </h1>
          <p className="text-sm text-slate-400 mt-1">Honoring individuals and groups fueling campus expansion.</p>
        </div>

        {/* Total Metric Showcase Banner Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 self-start md:self-auto shadow-xl shadow-emerald-950/20">
          <div className="p-3 bg-emerald-500 text-slate-950 rounded-xl font-bold text-xl">💵</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Total Contribution Value</p>
            <p className="text-2xl font-black text-white mt-0.5">${totalFundsRaised.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Control Filters Toolbar Container Panel */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Search Input Filter */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search matching donor registry by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/40 border border-slate-800 focus:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
          />
        </div>

        {/* Year Dropdown Filter Selection Menu */}
        <div className="relative">
          <Filter className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-slate-900/40 border border-slate-800 focus:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-300 focus:outline-none transition-all appearance-none cursor-pointer"
          >
            {uniqueYears.map(year => (
              <option key={year} value={year} className="bg-slate-950 text-slate-300">
                {year === "All" ? "🗓️ Filter By: All Years" : `🗓️ Financial Year: ${year}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Records Sheet Showcase Block */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 text-xs tracking-wider">Syncing contribution databases...</p>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-900/10">
            <p className="text-slate-500 text-sm">No matching donor ledger records identified.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP RESPONSIVE TABLE PREVIEW */}
            <div className="hidden md:block overflow-hidden bg-slate-900/20 border border-slate-900 rounded-2xl shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Donor Information</th>
                    <th className="py-4 px-6">Location</th>
                    <th className="py-4 px-6">Year</th>
                    <th className="py-4 px-6">Payment Method</th>
                    <th className="py-4 px-6 text-right">Amount Provided</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-sm">
                  {filteredDonations.map((item) => (
                    <tr key={item.Donner_id} className="hover:bg-slate-900/30 transition-colors group">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{item.Donator_Name || "Anonymous Donor"}</p>
                        {item.FeedBack && <p className="text-xs text-slate-500 mt-1 italic max-w-md line-clamp-1">"{item.FeedBack}"</p>}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-600" /> {item.Donator_Place || "N/A"}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-600" /> {item.DonationYear || "N/A"}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold tracking-wide bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300 inline-flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-emerald-500" /> {item.PayMentType || "Standard"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-emerald-400 group-hover:scale-[1.02] transition-transform origin-right">
                        ${(item.DonationAmnts || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE LAYOUT GRID PROFILE CARDS */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredDonations.map((item) => (
                <div key={item.Donner_id} className="bg-slate-900/40 border border-slate-900 p-5 rounded-xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-200 text-base">{item.Donator_Name || "Anonymous Donor"}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.Donator_Place || "Global Location"}</p>
                    </div>
                    <span className="text-base font-black text-emerald-400">${(item.DonationAmnts || 0).toLocaleString()}</span>
                  </div>
                  {item.FeedBack && <p className="text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-900/60 text-slate-400 italic">"{item.FeedBack}"</p>}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-900/40 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Year: {item.DonationYear || "N/A"}</span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-slate-400 text-[10px] uppercase font-bold">{item.PayMentType || "Transfer"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}