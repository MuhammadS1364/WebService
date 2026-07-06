import React, { useState, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Ensure this exports a standard Supabase client
import * as XLSX from "xlsx";

// Define the shape of your form data so TypeScript knows exactly what to expect
interface WingFormData {
  wingCode: string;
  wingTitle: string;
  wingEmail: string;
  wingManager: string;
  wingConvener: string;
  wingAssistant: string;
  Description: string;
  wingUserId?: string; // Optional, as it might only come from Excel
}

export default function CreateNewWing() {
  const [formData, setFormData] = useState<WingFormData>({
    wingCode: "",
    wingTitle: "",
    wingEmail: "",
    wingManager: "",
    wingConvener: "",
    wingAssistant: "",
    Description: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Explicitly tell TypeScript this ref belongs to an HTML Input Element
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Input Changes with strict event typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 1. Core Logic to Create a Single User & Wing
  const createWingRecord = async (data: WingFormData) => {
    // A. Create User in UserTable
    const { error: userError } = await SupaBaseFunction.from("UserTable").insert([
      {
        UserEmail: data.wingEmail,
        UserPassword: data.wingCode,
        UserRole: "Wing",
      },
    ]);

    if (userError) {
      throw new Error(`User Creation Failed: ${userError.message}`);
    }

    // B. Create Wing in Chs-WingS
    const { error: wingError } = await SupaBaseFunction.from("Chs-WingS").insert([
      {
        WingCode: data.wingCode,
        WingTitle: data.wingTitle,
        WingUserId: data.wingUserId || data.wingEmail, // Fallback to email if ID isn't provided
        WingEmail: data.wingEmail,
        WingManager: data.wingManager,
        WingConvener: data.wingConvener,
        WingAssistant: data.wingAssistant,
        Description: data.Description,
      },
    ]);

    if (wingError) throw new Error(`Wing Creation Failed: ${wingError.message}`);
  };

  // 2. Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await createWingRecord(formData);
      setMessage({ text: "Wing created successfully!", type: "success" });
      setFormData({
        wingCode: "", wingTitle: "", wingEmail: "",
        wingManager: "", wingConvener: "", wingAssistant: "",
        Description: "",
      });
    } catch (error) {
      // Cast the unknown error to a standard Error object
      const err = error as Error;
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Excel Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage({ text: "Importing data, please wait...", type: "info" });

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("Failed to read the file.");

        // Safely cast result to ArrayBuffer for Uint8Array
        const data = new Uint8Array(result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to 2D array
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        let successCount = 0;
        let errorCount = 0;

        // Assuming row 0 is headers, loop from row 1
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.length === 0) continue; // Skip empty rows

          const [
            wingCode,
            wingTitle,
            wingEmail,
            wingManager,
            wingConvener,
            wingAssistant,
            description,
            wingUserId
          ] = row;

          if (wingCode && wingEmail) {
            try {
              await createWingRecord({
                wingCode: String(wingCode),
                wingTitle: String(wingTitle || ""),
                wingEmail: String(wingEmail),
                wingManager: String(wingManager || ""),
                wingConvener: String(wingConvener || ""),
                wingAssistant: String(wingAssistant || ""),
                Description: String(description || ""),
                wingUserId: wingUserId ? String(wingUserId) : undefined
              });

              successCount++;
            } catch (rowError) {
              console.error(`Failed to import row ${i} (Code: ${wingCode}):`, rowError);
              errorCount++;
            }
          }
        }

        if (errorCount > 0) {
          setMessage({
            text: `Imported ${successCount} wings, but ${errorCount} failed (likely due to duplicates). Check console.`,
            type: "warning"
          });
        } else {
          setMessage({ text: `Successfully imported ${successCount} wings!`, type: "success" });
        }

      } catch (error) {
        const err = error as Error;
        setMessage({ text: `Import error: ${err.message}`, type: "error" });
      } finally {
        setLoading(false);
        // Reset file input so you can upload the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4. Handle Excel Export
  const handleExport = async () => {
    setLoading(true);
    setMessage({ text: "Generating export...", type: "info" });

    try {
      const { data, error } = await SupaBaseFunction.from("Chs-WingS").select("*");

      if (error) throw error;
      if (!data || data.length === 0) {
        setMessage({ text: "No data available to export.", type: "error" });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Wings");

      XLSX.writeFile(workbook, "WingsData.xlsx");
      setMessage({ text: "Export successful!", type: "success" });
    } catch (error) {
      const err = error as Error;
      setMessage({ text: `Export failed: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">

        {/* Header Section */}
        <header className="bg-blue-600 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Wing Management</h1>
            <p className="text-sm opacity-90">Create and manage structural wings</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImport}
            />
            <button
              type="button" // Always specify button type
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg shadow hover:bg-gray-100 transition disabled:opacity-50"
            >
              Import XLSX
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-blue-800 text-white font-semibold rounded-lg shadow hover:bg-blue-900 transition disabled:opacity-50"
            >
              Export XLSX
            </button>
          </div>
        </header>

        {/* Status Messages */}
        {message.text && (
          <div className={`p-4 text-center font-medium ${message.type === "error" ? "bg-red-100 text-red-700" :
              message.type === "success" ? "bg-green-100 text-green-700" :
                "bg-blue-100 text-blue-700"
            }`}>
            {message.text}
          </div>
        )}

        {/* Form Section */}
        <div className="p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2">Manual Wing Registration</h2>

          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Wing Code / Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wing Code (Password)*</label>
                <input required type="text" name="wingCode" value={formData.wingCode} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="e.g. WING-01" />
              </div>

              {/* Wing Email / Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wing Email (Username)*</label>
                <input required type="email" name="wingEmail" value={formData.wingEmail} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="wing@example.com" />
              </div>

              {/* Wing Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Wing Title</label>
                <input type="text" name="wingTitle" value={formData.wingTitle} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="e.g. Science & Tech Wing" />
              </div>

              {/* Wing Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <input type="text" name="wingManager" value={formData.wingManager} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Manager Name" />
              </div>

              {/* Wing Convener */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Convener</label>
                <input type="text" name="wingConvener" value={formData.wingConvener} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Convener Name" />
              </div>

              {/* Wing Assistant */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assistant</label>
                <input type="text" name="wingAssistant" value={formData.wingAssistant} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Assistant Name" />
              </div>

              {/* Wing Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" name="Description" value={formData.Description} onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Description about this Wing...." />
              </div>

            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </span>
                ) : (
                  "Create New Wing"
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}