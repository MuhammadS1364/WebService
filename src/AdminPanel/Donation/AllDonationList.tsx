import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { exportToExcel } from "../../lib/excelService";
import {
  Search,
  Users,
  TrendingUp,
  Loader2,
  Download,
  IndianRupee,
  MapPin,
  Calendar,
  CreditCard,
  MessageSquareQuote,
  ArrowUpDown,
  HeartHandshake,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";

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
  const [selectedMethod, setSelectedMethod] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");

  // Feedback modal
  const [selectedFeedback, setSelectedFeedback] = useState<DonationRecord | null>(null);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction
        .from("DonationTable")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations((data as DonationRecord[]) || []);
    } catch (error) {
      console.error("Error pulling donations ledger rows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // Filter and sort donations
  const filteredDonations = useMemo(() => {
    return donations
      .filter((item) => {
        const nameMatch = (item.Donator_Name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const placeMatch = (item.Donator_Place || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = !searchTerm.trim() || nameMatch || placeMatch;

        const matchesYear =
          selectedYear === "All" || (item.DonationYear && item.DonationYear.toString() === selectedYear);

        const matchesMethod =
          selectedMethod === "All" ||
          (item.PayMentType && item.PayMentType.toLowerCase() === selectedMethod.toLowerCase());

        return matchesSearch && matchesYear && matchesMethod;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        if (sortBy === "amount_desc") {
          return (b.DonationAmnts || 0) - (a.DonationAmnts || 0);
        }
        if (sortBy === "amount_asc") {
          return (a.DonationAmnts || 0) - (b.DonationAmnts || 0);
        }
        return 0;
      });
  }, [donations, searchTerm, selectedYear, selectedMethod, sortBy]);

  // Aggregate Metrics
  const totalFunds = useMemo(() => {
    return filteredDonations.reduce((sum, item) => sum + (item.DonationAmnts || 0), 0);
  }, [filteredDonations]);

  const avgDonation = useMemo(() => {
    if (filteredDonations.length === 0) return 0;
    return Math.round(totalFunds / filteredDonations.length);
  }, [filteredDonations, totalFunds]);

  const maxDonation = useMemo(() => {
    if (filteredDonations.length === 0) return 0;
    return Math.max(...filteredDonations.map((d) => d.DonationAmnts || 0));
  }, [filteredDonations]);

  const uniqueYears = useMemo(() => {
    return ["All", ...Array.from(new Set(donations.map((d) => d.DonationYear?.toString()).filter(Boolean)))];
  }, [donations]);

  const uniqueMethods = useMemo(() => {
    return ["All", ...Array.from(new Set(donations.map((d) => d.PayMentType).filter(Boolean)))];
  }, [donations]);

  const handleExport = () => {
    const exportData = filteredDonations.map((d, index) => ({
      "Sl No": index + 1,
      "Donor Name": d.Donator_Name || "Anonymous",
      "Location / Place": d.Donator_Place || "Not Specified",
      "Amount (INR)": d.DonationAmnts || 0,
      "Year": d.DonationYear || "N/A",
      "Payment Method": d.PayMentType || "General",
      "Feedback Note": d.FeedBack || "None",
      "Donation Date": d.created_at ? new Date(d.created_at).toLocaleDateString() : "N/A",
      "Transaction ID": d.Donner_id,
    }));

    exportToExcel(
      exportData,
      `Donations_Ledger_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Donations"
    );
  };

  const getMethodBadgeColor = (method: string | null) => {
    const m = (method || "").toLowerCase();
    if (m.includes("upi") || m.includes("gpay") || m.includes("phonepe")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (m.includes("cash")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (m.includes("bank") || m.includes("neft") || m.includes("rtgs") || m.includes("transfer")) {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    if (m.includes("card")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getInitials = (name: string | null) => {
    if (!name) return "DH";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
            <HeartHandshake size={14} className="text-emerald-600" />
            Financial Philanthropy & Sponsorships
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            All Donations & Contributors
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Real-time financial contributions ledger supporting student programs, infrastructure, and institutional outreach of Darul Huda Islamic University.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchDonations}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={filteredDonations.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-xs font-bold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
          >
            <Download size={16} />
            Export Ledger (.xlsx)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Funds Raised */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-700/15 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Funds Raised</span>
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
              <IndianRupee size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              ₹{totalFunds.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1 flex items-center gap-1">
              <TrendingUp size={13} /> Across {filteredDonations.length} recorded contributions
            </p>
          </div>
        </div>

        {/* Total Donors */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Transactions</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {filteredDonations.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Verified donor transactions</p>
          </div>
        </div>

        {/* Average Contribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Donation</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{avgDonation.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Mean gift amount</p>
          </div>
        </div>

        {/* Top Single Donation */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Contribution</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CreditCard size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-600 tracking-tight">
              ₹{maxDonation.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Single highest pledge</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Live Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search donor name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  {year === "All" ? "All Financial Years" : `FY ${year}`}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              {uniqueMethods.map((m) => (
                <option key={m || "empty"} value={m || "All"}>
                  {m === "All" ? "All Payment Channels" : `Method: ${m}`}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              <option value="newest">Sort: Most Recent First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Filter tags summary */}
        {(searchTerm || selectedYear !== "All" || selectedMethod !== "All") && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold">Active Filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                Keyword: "{searchTerm}"
                <button type="button" onClick={() => setSearchTerm("")} className="hover:text-red-500">×</button>
              </span>
            )}
            {selectedYear !== "All" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                Year: {selectedYear}
                <button type="button" onClick={() => setSelectedYear("All")} className="hover:text-red-500">×</button>
              </span>
            )}
            {selectedMethod !== "All" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                Method: {selectedMethod}
                <button type="button" onClick={() => setSelectedMethod("All")} className="hover:text-red-500">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedYear("All");
                setSelectedMethod("All");
              }}
              className="text-xs text-indigo-600 font-bold hover:underline ml-2"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <span className="text-xs font-semibold">Synchronizing financial ledger records...</span>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <HeartHandshake className="mx-auto text-slate-300" size={42} />
            <p className="text-base font-bold text-slate-700">No donations match your criteria</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting search terms or resetting filters to view all recorded contributions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Donor / Contributor</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5 text-center">Year</th>
                  <th className="py-4 px-5">Channel</th>
                  <th className="py-4 px-5">Donor Message</th>
                  <th className="py-4 px-5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonations.map((item) => (
                  <tr key={item.Donner_id} className="hover:bg-slate-50/70 transition">
                    {/* Contributor Name & Avatar */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-xs shrink-0">
                          {getInitials(item.Donator_Name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {item.Donator_Name || "Anonymous Supporter"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            Ref: {item.Donner_id.slice(0, 14)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{item.Donator_Place || "Not Specified"}</span>
                      </div>
                    </td>

                    {/* Financial Year */}
                    <td className="py-4 px-5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold font-mono text-[11px]">
                        {item.DonationYear || "—"}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getMethodBadgeColor(
                          item.PayMentType
                        )}`}
                      >
                        <CreditCard size={11} />
                        {item.PayMentType || "General"}
                      </span>
                    </td>

                    {/* Donor Feedback Note */}
                    <td className="py-4 px-5">
                      {item.FeedBack ? (
                        <button
                          type="button"
                          onClick={() => setSelectedFeedback(item)}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer max-w-[200px] truncate"
                          title="Click to view full message"
                        >
                          <MessageSquareQuote size={13} className="shrink-0 text-indigo-500" />
                          <span className="truncate">"{item.FeedBack}"</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">— No note —</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-5 text-right font-mono">
                      <span className="text-sm font-black text-emerald-600">
                        ₹{(item.DonationAmnts || 0).toLocaleString("en-IN")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Donor Feedback Dialog Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <MessageSquareQuote className="text-emerald-600" size={18} />
                Donor Message & Prayers
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Contributor
              </p>
              <p className="text-sm font-bold text-slate-900">{selectedFeedback.Donator_Name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={12} /> {selectedFeedback.Donator_Place || "Location Not Provided"}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Full Message & Du'a Note
              </p>
              <blockquote className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs sm:text-sm text-emerald-950 italic leading-relaxed">
                "{selectedFeedback.FeedBack}"
              </blockquote>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Pledged Amount:</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                ₹{(selectedFeedback.DonationAmnts || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
