import React, { useState, useEffect, useRef } from "react";
import { Download, Upload, UserPlus, Search, AlertCircle, ShieldCheck, ShieldX } from "lucide-react";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Adjust path as needed

// 1. TYPE DEFINITIONS
interface Treasurer {
  Treasurer_id: string;
  created_at: string;
  Treasurer_Name: string | null;
  Treasurer_Email: string | null;
  AccountingFor: string | null;
  IsActive: boolean;
}

export default function AllTreasurerList() {
  // 2. STATE & REFS (Properly Typed)
  const [treasurers, setTreasurers] = useState<Treasurer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. FETCH DATA
  const fetchTreasurers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await SupaBaseFunction
        .from("TreasurerVolt")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      // Tell TypeScript this data conforms to our Treasurer interface
      setTreasurers((data as Treasurer[]) || []);
    } catch (err: unknown) {
      console.error("Error fetching treasurers:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasurers();
  }, []);

  // 4. EXPORT HANDLER
  const handleExport = () => {
    if (treasurers.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Name", "Email", "Accounting For", "Status", "Date Added"];
    
    // Explicitly define 't' as Treasurer
    const csvRows = treasurers.map((t: Treasurer) => [
      `"${t.Treasurer_Name || ""}"`,
      `"${t.Treasurer_Email || ""}"`,
      `"${t.AccountingFor || ""}"`,
      t.IsActive ? "Active" : "Inactive",
      `"${new Date(t.created_at).toLocaleDateString()}"`
    ]);

    const csvContent = [headers.join(","), ...csvRows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Treasurers_List_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. IMPORT TRIGGER
  const triggerImportClick = () => {
    // Null check required by TypeScript before calling .click()
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 6. IMPORT LOGIC (Strictly Typed)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event: ProgressEvent<FileReader>) => {
      // Ensure target and result exist
      if (!event.target || !event.target.result) return;

      // Force type to string (resolves ArrayBuffer conflict)
      const text = event.target.result as string;
      
      // Type 'line' as string
      const lines = text.split("\n").filter((line: string) => line.trim() !== "");
      
      if (lines.length <= 1) {
        alert("The CSV file seems to be empty or only contains headers.");
        return;
      }

      // Skip the header row
      const dataRows = lines.slice(1);
      const insertPayloads = [];

      for (const row of dataRows) {
        // Type 'col' as string
        const columns = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((col: string) => col.replace(/(^"|"$)/g, "")) || [];
        
        if (columns.length >= 3) {
          insertPayloads.push({
            Treasurer_Name: columns[0] || "Unknown",
            Treasurer_Email: columns[1] || "",
            AccountingFor: columns[2] || "General",
            IsActive: columns[3]?.toLowerCase() === "active" ? true : false,
          });
        }
      }

      if (insertPayloads.length > 0) {
        setIsLoading(true);
        try {
          const { error: insertError } = await supabase
            .from("TreasurerVolt")
            .insert(insertPayloads);

          if (insertError) throw insertError;
          
          alert(`${insertPayloads.length} Treasurers imported successfully!`);
          fetchTreasurers(); // Refresh table
        } catch (err: unknown) {
          console.error("Import error:", err);
          alert(`Failed to import: ${(err as Error).message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    reader.readAsText(file);
    
    // Clear input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 7. FILTER FOR SEARCH BAR
  const filteredTreasurers = treasurers.filter((t) =>
    (t.Treasurer_Name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (t.Treasurer_Email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // 8. ERROR UI
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Data</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={fetchTreasurers} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Treasurer Directory</h1>
            <p className="text-slate-500 mt-1">Manage, import, and export your treasurers.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Hidden File Input */}
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
            
            <button
              onClick={triggerImportClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm transition-all font-medium text-sm"
            >
              <Upload size={16} /> Import CSV
            </button>
            
            <button
              onClick={handleExport}
              disabled={treasurers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-xl shadow-sm transition-all font-medium text-sm"
            >
              <Download size={16} /> Export
            </button>

            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all font-medium text-sm">
              <UserPlus size={16} /> Add Treasurer
            </button>
          </div>
        </div>

        {/* Tools Section (Search) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={18} />
            </span>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
            />
          </div>
          <div className="text-sm font-medium text-slate-500 hidden sm:block">
            Showing {filteredTreasurers.length} Users
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Accounting For</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        Loading treasurers...
                      </div>
                    </td>
                  </tr>
                ) : filteredTreasurers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No treasurers found.
                    </td>
                  </tr>
                ) : (
                  filteredTreasurers.map((person) => (
                    <tr key={person.Treasurer_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {person.Treasurer_Name || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {person.Treasurer_Email || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {person.AccountingFor || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                          person.IsActive 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-rose-100 text-rose-700"
                        }`}>
                          {person.IsActive ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
                          {person.IsActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-right">
                        {new Date(person.created_at).toLocaleDateString()}
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