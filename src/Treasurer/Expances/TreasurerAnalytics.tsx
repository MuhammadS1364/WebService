import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Download, Filter, TrendingUp, TrendingDown, Wallet, Calendar, Search, AlertCircle, User } from "lucide-react";
import { SupaBaseFunction } from "../../lib/SupaBase"; 

// FIX: Added Interface so TypeScript knows what a transaction is (removes 'never[]' errors)
interface Transaction {
  Economy_id: string;
  created_at: string;
  forwhat?: string | null;
  how_mach?: number | null;
  Whom_Gave?: string | null;
  Date?: string | null;
  Method?: string | null;
  Income_Outcome?: string | null;
  Treasurer_Email?: string | null;
}

export default function TreasurerAnalytics() {
  const { actTreasurer } = useParams<{ actTreasurer: string }>();
  const decodedEmail = actTreasurer ? decodeURIComponent(actTreasurer) : null;

  const [dashboardData, setDashboardData] = useState({
    user: null as any,
    profile: null as any,
  });
  
  // FIX: Applied Interface to state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // FIX: Type error state properly so it accepts strings
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    academicYear: "All",
    startDate: "",
    endDate: "",
    type: "All",
    search: "",
  });

  useEffect(() => {
    async function loadDashboardData() {
      if (!decodedEmail) {
        setError("No treasurer email provided in the URL.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: userData, error: userError } = await SupaBaseFunction
          .from("UserTable")
          .select("*")
          .eq("UserEmail", decodedEmail)
          .single();

        if (userError) throw new Error(`User not found (${userError.message})`);
        if (!userData.IsActive) throw new Error("User account deactivated.");

        const { data: treasurerData, error: treasurerError } = await SupaBaseFunction
          .from("TreasurerVolt")
          .select("*")
          .eq("Treasurer_Email", userData.UserEmail)
          .single();

        if (treasurerError) throw new Error(`Treasurer profile not found (${treasurerError.message})`);
        if (!treasurerData.IsActive) throw new Error("Treasurer profile inactive.");

        const currentTreasurerEmail = treasurerData.Treasurer_Email;
        const { data: economyData, error: economyError } = await SupaBaseFunction
          .from("EconoMicalBox")
          .select("*")
          .eq("Treasurer_Email", currentTreasurerEmail)
          .order("created_at", { ascending: false });

        if (economyError) throw new Error(`Error loading transactions (${economyError.message})`);

        setDashboardData({ user: userData, profile: treasurerData });
        
        // FIX: Ensure data fits the Transaction array type
        setTransactions((economyData as Transaction[]) || []);
        
      } catch (err: unknown) {
        // FIX: properly type catch error
        const caughtError = err as Error;
        setError(caughtError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [decodedEmail]);

  const filteredData = useMemo(() => {
    return transactions.filter((txn) => {
      // Because of our interface, txn.Date and txn.created_at are now valid
      const txnDate = new Date(txn.Date || txn.created_at);
      const isAfterStart = filters.startDate ? txnDate >= new Date(filters.startDate) : true;
      const isBeforeEnd = filters.endDate ? txnDate <= new Date(filters.endDate) : true;
      
      const matchesType = filters.type === "All" || txn.Income_Outcome === filters.type;
      
      const matchesSearch = 
        (txn.forwhat?.toLowerCase() || "").includes(filters.search.toLowerCase()) || 
        (txn.Whom_Gave?.toLowerCase() || "").includes(filters.search.toLowerCase());

      let matchesAcademicYear = true; 
      if (filters.academicYear !== "All") {
        const year = txnDate.getFullYear();
        if (filters.academicYear === "2025-2026" && (year < 2025 || year > 2026)) matchesAcademicYear = false;
        if (filters.academicYear === "2026-2027" && (year < 2026 || year > 2027)) matchesAcademicYear = false;
      }

      return isAfterStart && isBeforeEnd && matchesType && matchesSearch && matchesAcademicYear;
    });
  }, [transactions, filters]);

  const totalIncome = filteredData.filter(d => d.Income_Outcome === "Income").reduce((sum, d) => sum + Number(d.how_mach || 0), 0);
  const totalExpense = filteredData.filter(d => d.Income_Outcome === "Expense").reduce((sum, d) => sum + Number(d.how_mach || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const exportToCSV = () => {
    if (filteredData.length === 0) return alert("No records to export.");

    const headers = ["Date", "For What", "Whom/From", "Method", "Type", "Amount", "Treasurer Email"];
    const csvRows = filteredData.map(row => {
      return [
        row.Date || row.created_at.split('T')[0],
        `"${row.forwhat || ""}"`,
        `"${row.Whom_Gave || ""}"`,
        row.Method || "N/A",
        row.Income_Outcome || "N/A",
        row.how_mach || 0,
        row.Treasurer_Email || "N/A"
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Treasurer_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // FIX: Type the event properly
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied or Error</h2>
          <p className="text-slate-600 mb-2 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm">Refresh Page</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <User size={20} />
              </div>
              {isLoading ? (
                <div className="h-6 w-48 bg-slate-200 animate-pulse rounded"></div>
              ) : (
                <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
                  {dashboardData.profile?.AccountingFor || 'Treasurer Dashboard'}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              {isLoading ? "Loading..." : `Welcome, ${dashboardData.profile?.Treasurer_Name}`}
            </h1>
          </div>
          
          <button
            onClick={exportToCSV}
            disabled={filteredData.length === 0 || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl shadow-sm transition-all font-medium"
          >
            <Download size={18} />
            Export ({filteredData.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Income</p>
              <h3 className="text-2xl font-bold text-slate-800">₹{totalIncome.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-rose-100 text-rose-600 rounded-xl"><TrendingDown size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Expense</p>
              <h3 className="text-2xl font-bold text-slate-800">₹{totalExpense.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-xl"><Wallet size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Net Balance</p>
              <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{netBalance.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
            <Filter size={18} /> Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative md:col-span-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Search size={16} /></span>
              <input 
                type="text" name="search" placeholder="Search description or name..." 
                value={filters.search} onChange={handleFilterChange}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <select name="academicYear" value={filters.academicYear} onChange={handleFilterChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
              <option value="All">All Academic Years</option>
              <option value="2025-2026">2025 - 2026</option>
              <option value="2026-2027">2026 - 2027</option>
            </select>
            <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
              <option value="All">All Types</option>
              <option value="Income">Income Only</option>
              <option value="Expense">Expense Only</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Whom / From</th>
                  <th className="px-6 py-4 font-medium">Method</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading records...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No records found.</td></tr>
                ) : (
                  filteredData.map((txn) => (
                    <tr key={txn.Economy_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {txn.Date ? txn.Date.split(' ')[0] : txn.created_at.split('T')[0]}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{txn.forwhat || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{txn.Whom_Gave || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{txn.Method || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          txn.Income_Outcome === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {txn.Income_Outcome}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${
                          txn.Income_Outcome === 'Income' ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {txn.Income_Outcome === 'Income' ? '+' : '-'}₹{Number(txn.how_mach || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}