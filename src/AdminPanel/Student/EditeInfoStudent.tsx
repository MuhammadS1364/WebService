import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";

// import ImportStudent from "./ImportStudent";

export default function EditeStudentRecord() {
  const { StnAddNo } = useParams();

  const [formData, setFormData] = useState({
    AddNo: "", StudentName: "", StudentEmail: "", StudentPhoto: "",
    FatherName: "", CollegeName: "", Class: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ----------------------------------------
  // FETCH PREVIOUS RECORD
  // ----------------------------------------
  useEffect(() => {
    const fetchStudentRecord = async () => {
      // FIX: Handle missing ID explicitly to prevent infinite loading
      if (!StnAddNo) {
        setFetching(false);
        setMessage({ type: "error", text: "Student ID missing from URL. Check your router setup." });
        return;
      }

      try {
        setFetching(true);
        const { data, error } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .eq("AddNo", StnAddNo)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            AddNo: data.AddNo || "",
            StudentName: data.StudentName || "",
            StudentEmail: data.StudentEmail || "",
            StudentPhoto: data.StudentPhoto || "",
            FatherName: data.FatherName || "",
            CollegeName: data.CollegeName || "",
            Class: data.Class || ""
          });
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setMessage({ type: "error", text: `Failed to load student data: ${error.message}` });
      } finally {
        setFetching(false);
      }
    };

    fetchStudentRecord();
  }, [StnAddNo]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ----------------------------------------
  // SAVE CHANGES (UPDATE METHOD)
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Ensure User Account is synchronized with the new/existing email
      let { data: existingUser, error: checkError } = await SupaBaseFunction
        .from("UserTable")
        .select("UserEmail")
        .eq("UserEmail", formData.StudentEmail)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw new Error(`Error checking user account: ${checkError.message}`);
      }

      // If email was changed and doesn't exist in UserTable yet, create it
      if (!existingUser) {
        const { error: createError } = await SupaBaseFunction
          .from("UserTable")
          .insert([{ UserEmail: formData.StudentEmail, UserPassword: formData.AddNo, UserRole: "Student" }]);
        if (createError) throw new Error(`User Account Sync Failed: ${createError.message}`);
      }

      // 2. Update Student Profile Information 
      const { error: updateError } = await SupaBaseFunction
        .from("StudentsBox")
        .update({
          StudentName: formData.StudentName,
          StudentEmail: formData.StudentEmail,
          StudentPhoto: formData.StudentPhoto,
          FatherName: formData.FatherName,
          CollegeName: formData.CollegeName,
          Class: formData.Class,
          StnUserId: formData.StudentEmail 
        })
        .eq("AddNo", StnAddNo);

      if (updateError) throw new Error(`Profile Update Failed: ${updateError.message}`);

      setMessage({ type: "success", text: "Student records updated successfully!" });

    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // EXPORT DATA 
  // ----------------------------------------
  const handleExport = async () => {
    try {
      setMessage({ type: "", text: "Exporting data..." });
      
      const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No students to export!");

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      
      XLSX.writeFile(workbook, "Students_Export.xlsx");
      
      setMessage({ type: "success", text: "Data exported successfully!" });
    } catch (error) {
      console.error("Export Error:", error);
      setMessage({ type: "error", text: `Export failed: ${error.message}` });
    }
  };

  // ----------------------------------------
  // IMPORT DATA 
  // ----------------------------------------
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage({ type: "", text: "Reading file..." });
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const importedData = XLSX.utils.sheet_to_json(worksheet);
        if (importedData.length === 0) throw new Error("The file is empty.");

        setMessage({ type: "", text: "Syncing User Accounts..." });

        const uniqueEmails = new Set();
        const usersToCreate = [];
        
        importedData.forEach(row => {
          if (!uniqueEmails.has(row.StudentEmail)) {
            uniqueEmails.add(row.StudentEmail);
            usersToCreate.push({
              UserEmail: row.StudentEmail,
              UserPassword: row.AddNo,
              UserRole: "Student"
            });
          }
        });

        const { error: userError } = await SupaBaseFunction
          .from("UserTable")
          .upsert(usersToCreate, { onConflict: "UserEmail", ignoreDuplicates: true });

        if (userError) throw new Error(`User Sync Failed: ${userError.message}`);

        setMessage({ type: "", text: "Inserting Students..." });

        const studentsToInsert = importedData.map(row => ({
          AddNo: row.AddNo,
          StudentName: row.StudentName,
          StudentEmail: row.StudentEmail,
          FatherName: row.FatherName || "",
          CollegeName: row.CollegeName || "",
          Class: row.Class || "",
          StnUserId: row.StudentEmail
        }));

        const { error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .upsert(studentsToInsert, { onConflict: "AddNo", ignoreDuplicates: true });

        if (studentError) throw new Error(`Student Insert Failed: ${studentError.message}`);

        setMessage({ type: "success", text: `Successfully imported ${studentsToInsert.length} students!` });
      } catch (error) {
        console.error("Import Error:", error);
        setMessage({ type: "error", text: `Import failed: ${error.message}` });
      }
      
      e.target.value = null;
    };

    reader.readAsArrayBuffer(file);
  };

  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10 text-center">
        <p className="text-gray-500 font-medium">Loading student records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Edit Student Record</h2>
        
        <div className="flex space-x-3 mt-4 md:mt-0">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            id="fileUpload" 
            style={{ display: "none" }} 
            onChange={handleImport} 
          />
          <button 
            type="button" 
            onClick={() => document.getElementById("fileUpload").click()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-medium shadow-sm"
          >
            ↓ Import Data
          </button>
          <button 
            type="button" 
            onClick={handleExport}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm font-medium shadow-sm"
          >
            ↑ Export to Excel
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="font-semibold">{message.type === 'error' ? 'Error' : 'Notice'}</p>
          <p className="text-sm mt-1">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Admission Number (AddNo) - Read Only</label>
            <input 
              type="text" 
              name="AddNo" 
              disabled 
              value={formData.AddNo} 
              className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded p-2 outline-none cursor-not-allowed" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
            <input type="text" name="StudentName" required value={formData.StudentName} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Email *</label>
            <input type="email" name="StudentEmail" required value={formData.StudentEmail} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
            <input type="text" name="Class" required value={formData.Class} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
            <input type="text" name="FatherName" value={formData.FatherName} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College/School Name</label>
            <input type="text" name="CollegeName" value={formData.CollegeName} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
            <input type="text" name="StudentPhoto" value={formData.StudentPhoto} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? "Saving Changes..." : "Update Student Record"}
          </button>
        </div>
      </form>
    </div>
  );
}