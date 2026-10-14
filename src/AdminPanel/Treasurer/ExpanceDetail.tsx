import React, { useState, useEffect, useMemo } from "react";
import { 
  Download, Filter, Search, TrendingUp, TrendingDown, 
  Wallet, Calendar, AlertCircle, ChevronDown, ChevronUp, Printer, RotateCcw, X 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { SupaBaseFunction } from "../../lib/SupaBase";

// 1. DEFINE TYPESCRIPT INTERFACES
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
  AcademicYear?: string | null;
}

export default function ExpancesDetail() {
  // 2. STATE MANAGEMENT (WITH TYPES)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false); // Collapsible UI state

  const [filters, setFilters] = useState({
    whomGave: "",
    academicYear: "All",
    method: "All",
    startDate: "",
    endDate: "",
  });

  // 3. FETCH REAL DATA FROM SUPABASE
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await SupaBaseFunction
          .from('EconoMicalBox')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(error.message);
        }
        
        setTransactions((data as Transaction[]) || []);
      } catch (err: unknown) {
        console.error("Failed to load data from Supabase:", err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Dynamic Options derived strictly from table data
  const availableYears = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.AcademicYear).filter(Boolean) as string[])).sort();
  }, [transactions]);

  const availableMethods = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.Method).filter(Boolean) as string[])).sort();
  }, [transactions]);

  /**
   * Flexible Date Parser for YYYY-MM-DD, DD-MM-YYYY, or ISO timestamps
   */
  const parseFlexibleDate = (val?: string | null): Date | null => {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;

    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
      const d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
      if (!isNaN(d.getTime())) return d;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
      const d = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
      if (!isNaN(d.getTime())) return d;
    }

    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // 4. APPLY FILTERS
  const filteredData = useMemo(() => {
    const startDateObj = filters.startDate ? parseFlexibleDate(filters.startDate) : null;
    if (startDateObj) startDateObj.setHours(0, 0, 0, 0);

    const endDateObj = filters.endDate ? parseFlexibleDate(filters.endDate) : null;
    if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

    return transactions.filter((txn) => {
      const txnDate = parseFlexibleDate(txn.Date || txn.created_at);
      const isAfterStart = startDateObj ? (txnDate ? txnDate >= startDateObj : false) : true;
      const isBeforeEnd = endDateObj ? (txnDate ? txnDate <= endDateObj : false) : true;
      
      const matchesWhom = txn.Whom_Gave?.toLowerCase().includes(filters.whomGave.toLowerCase()) ?? true;
      const matchesYear = filters.academicYear === "All" || txn.AcademicYear === filters.academicYear;
      const matchesMethod = filters.method === "All" || txn.Method === filters.method;

      return isAfterStart && isBeforeEnd && matchesWhom && matchesYear && matchesMethod;
    });
  }, [transactions, filters]);

  // 5. CHART DATA PREPARATION
  const kpis = useMemo(() => {
    const income = filteredData.filter(d => d.Income_Outcome === "Income").reduce((sum, d) => sum + Number(d.how_mach || 0), 0);
    const expense = filteredData.filter(d => d.Income_Outcome === "Expense").reduce((sum, d) => sum + Number(d.how_mach || 0), 0);
    return { income, expense, balance: income - expense };
  }, [filteredData]);

  const barChartData = useMemo(() => {
    // Strongly type the grouped accumulator
    const grouped: Record<string, { name: string; Income: number; Expense: number }> = {};
    
    filteredData.forEach(txn => {
      const year = txn.AcademicYear || "Unknown";
      if (!grouped[year]) grouped[year] = { name: year, Income: 0, Expense: 0 };
      
      if (txn.Income_Outcome === 'Income') {
        grouped[year].Income += Number(txn.how_mach || 0);
      } else if (txn.Income_Outcome === 'Expense') {
        grouped[year].Expense += Number(txn.how_mach || 0);
      }
    });
    return Object.values(grouped);
  }, [filteredData]);

  const pieChartData = useMemo(() => {
    // Strongly type the pie chart accumulator
    const grouped: Record<string, number> = {};
    
    filteredData.forEach(txn => {
      const method = txn.Method || "Unknown";
      if (!grouped[method]) grouped[method] = 0;
      grouped[method] += Number(txn.how_mach || 0);
    });
    return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
  }, [filteredData]);
  
  const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];

  // 6. EXPORT FUNCTION
  const handleExport = () => {
    if (filteredData.length === 0) return;
    const headers = ["Date", "For What", "Whom/From", "Method", "Type", "Amount", "Academic Year", "Treasurer Email"];
    const csvRows = filteredData.map(r => [
      r.created_at.split('T')[0],
      `"${r.forwhat || ""}"`,
      `"${r.Whom_Gave || ""}"`,
      r.Method || "-",
      r.Income_Outcome || "-",
      r.how_mach || 0,
      r.AcademicYear || "-",
      r.Treasurer_Email || "-"
    ].join(","));
    
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Financial_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Event typed correctly for Inputs and Selects
  const updateFilter = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // ERROR UI
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Failed to load data</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      {/* PRINT-ONLY STYLES */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-block { display: block !important; }
        }
      `}</style>

      {/* PRINT-ONLY BRANDED HEADER */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Anjuman e Huda</h1>
            <p className="text-sm font-bold text-slate-700">Financial Intelligence & Transactions Statement</p>
          </div>
          <div className="text-right text-xs text-slate-600 font-mono">
            <p>Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p className="font-bold text-indigo-800">
              {filters.startDate || filters.endDate
                ? `Period: ${filters.startDate || "Beginning"} to ${filters.endDate || "Present"}`
                : "Period: Complete Financial Records"}
            </p>
            <p>Transactions: {filteredData.length} | Net: ₹{kpis.balance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Expenses & Income Detail</h1>
            <p className="text-slate-500">Analyze your economical box transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={filteredData.length === 0 || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white rounded-xl shadow-sm transition-all font-medium cursor-pointer"
              title="Print or Save PDF of the Financial Visual Report"
            >
              <Printer size={18} />
              Print Visual
            </button>
            <button
              onClick={handleExport}
              disabled={filteredData.length === 0 || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl shadow-sm transition-all font-medium cursor-pointer"
            >
              <Download size={18} />
              Export ({filteredData.length} records)
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Filtered Income</p>
              <h3 className="text-2xl font-bold text-slate-800">₹{kpis.income.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-rose-100 text-rose-600 rounded-xl"><TrendingDown size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Filtered Expense</p>
              <h3 className="text-2xl font-bold text-slate-800">₹{kpis.expense.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-xl"><Wallet size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Net Balance</p>
              <h3 className={`text-2xl font-bold ${kpis.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{kpis.balance.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Collapsible Filters UI/UX */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 no-print">
          <button 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <Filter size={18} className="text-indigo-600" /> 
              Advanced Filters
              {(filters.whomGave || filters.academicYear !== 'All' || filters.method !== 'All' || filters.startDate || filters.endDate) && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">Active Filters</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {(filters.whomGave || filters.academicYear !== 'All' || filters.method !== 'All' || filters.startDate || filters.endDate) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters({ whomGave: "", academicYear: "All", method: "All", startDate: "", endDate: "" });
                  }}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
              {isFiltersOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </button>
          
          <div className={`px-5 pb-5 transition-all duration-300 ${isFiltersOpen ? "block border-t border-slate-100 pt-4" : "hidden"}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Whom Gave */}
              <div className="relative lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Search Whom / From</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Search size={16} /></span>
                  <input 
                    type="text" name="whomGave" placeholder="Search Whom / From..." 
                    value={filters.whomGave} onChange={updateFilter}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
              
              {/* Academic Year */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Academic Year</label>
                <select name="academicYear" value={filters.academicYear} onChange={updateFilter} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm cursor-pointer">
                  <option value="All">All Academic Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Method */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Payment Method</label>
                <select name="method" value={filters.method} onChange={updateFilter} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm cursor-pointer">
                  <option value="All">All Methods</option>
                  {availableMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Specific Time Dates */}
              <div className="lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Specific Time Range</label>
                <div className="flex items-center gap-1.5">
                  <input type="date" name="startDate" value={filters.startDate} onChange={updateFilter} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer" title="From Date (e.g. 20-07-2026)" />
                  <span className="text-xs text-slate-400 font-bold">-</span>
                  <input type="date" name="endDate" value={filters.endDate} onChange={updateFilter} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer" title="To Date (e.g. 10-10-2026)" />
                  {(filters.startDate || filters.endDate) && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, startDate: "", endDate: "" })}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Clear dates"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow by Academic Year</h3>
            <div className="h-72">
              {isLoading ? (
                 <div className="h-full flex items-center justify-center text-slate-400">Loading charts...</div>
              ) : barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
              )}
            </div>
            {barChartData.length > 0 && (
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-3">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Income</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> Expense</span>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Volume by Method</h3>
            <div className="h-72">
              {isLoading ? (
                 <div className="h-full flex items-center justify-center text-slate-400">Loading charts...</div>
              ) : pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
              )}
            </div>
            {pieChartData.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 pt-3">
                {pieChartData.map((item, idx) => (
                  <span key={item.name} className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {item.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Academic Year</th>
                  <th className="px-6 py-4 font-medium">Whom / From</th>
                  <th className="px-6 py-4 font-medium">Method</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    {/* Fixed colSpan TS Error by using curly braces {6} instead of "6" */}
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        Fetching records securely...
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No transactions match your filters.</td></tr>
                ) : (
                  filteredData.map((txn) => (
                    <tr key={txn.Economy_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {txn.created_at.split('T')[0]}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{txn.AcademicYear || '-'}</td>
                      <td className="px-6 py-4 text-slate-800">{txn.Whom_Gave || '-'}</td>
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