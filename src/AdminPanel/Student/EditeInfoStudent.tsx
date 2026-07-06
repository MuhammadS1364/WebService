import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";

export default function EditStudentRecord() {
  const { StnAddNo } = useParams();

  const [formData, setFormData] = useState({
    AddNo: "",
    StudentName: "",
    StudentEmail: "",
    Student_Photo_Urls: "",
    FatherName: "",
    CollegeName: "",
    Class: "",
  });

  // Photo Upload States
  const [photoInputMethod, setPhotoInputMethod] = useState("url"); // 'url' or 'file'
  const [photoFile, setPhotoFile] = useState(null);
  const [imageError, setImageError] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ----------------------------------------
  // FETCH PREVIOUS RECORD
  // ----------------------------------------
  useEffect(() => {
    const fetchStudentRecord = async () => {
      if (!StnAddNo) {
        setFetching(false);
        setMessage({
          type: "error",
          text: "Student ID missing from URL. Check your router setup.",
        });
        return;
      }

      try {
        setFetching(true);
        const { data, error } = await SupaBaseFunction.from("StudentsBox")
          .select("*")
          .eq("AddNo", StnAddNo)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            AddNo: data.AddNo || "",
            StudentName: data.StudentName || "",
            StudentEmail: data.StudentEmail || "",
            Student_Photo_Urls: data.Student_Photo_Urls || "",
            FatherName: data.FatherName || "",
            CollegeName: data.CollegeName || "",
            Class: data.Class || "",
          });
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setMessage({
          type: "error",
          text: `Failed to load student data: ${error.message}`,
        });
      } finally {
        setFetching(false);
      }
    };

    fetchStudentRecord();
  }, [StnAddNo]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
      setImageError(""); // Clear any previous image errors
    }
  };

  // ----------------------------------------
  // SAVE CHANGES (UPDATE METHOD)
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    setImageError("");

    let finalPhotoUrl = formData.Student_Photo_Urls;

    try {
      // 1. Handle Image Upload if 'Upload File' is selected
      if (photoInputMethod === "file" && photoFile) {
        try {
          const fileExt = photoFile.name.split(".").pop();
          const fileName = `${StnAddNo}-${Math.random()}.${fileExt}`;
          
          // NOTE: Replace 'student-photos' with your actual Supabase storage bucket name
          const { error: uploadError } = await SupaBaseFunction.storage
            .from("student-photos") 
            .upload(fileName, photoFile);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = SupaBaseFunction.storage
            .from("student-photos")
            .getPublicUrl(fileName);

          finalPhotoUrl = publicUrlData.publicUrl;
        } catch (imgError) {
          console.error("Image Upload Error:", imgError);
          setImageError("Image upload failed! Please switch to the 'Image URL' option and paste a direct link instead.");
          setLoading(false);
          return; // Halt form submission so the user can fix the image
        }
      }

      // 2. Ensure User Account is synchronized with the new/existing email
      let { data: existingUser, error: checkError } = await SupaBaseFunction.from("UserTable")
        .select("UserEmail")
        .eq("UserEmail", formData.StudentEmail)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw new Error(`Error checking user account: ${checkError.message}`);
      }

      // If email was changed and doesn't exist in UserTable yet, create it
      if (!existingUser) {
        const { error: createError } = await SupaBaseFunction.from("UserTable").insert([
          { UserEmail: formData.StudentEmail, UserPassword: formData.AddNo, UserRole: "Student" },
        ]);
        if (createError) throw new Error(`User Account Sync Failed: ${createError.message}`);
      }

      // 3. Update Student Profile Information
      const { error: updateError } = await SupaBaseFunction.from("StudentsBox")
        .update({
          StudentName: formData.StudentName,
          StudentEmail: formData.StudentEmail,
          Student_Photo_Urls: finalPhotoUrl, // Use the processed URL
          FatherName: formData.FatherName,
          CollegeName: formData.CollegeName,
          Class: formData.Class,
          StnUserId: formData.StudentEmail,
        })
        .eq("AddNo", StnAddNo);

      if (updateError) throw new Error(`Profile Update Failed: ${updateError.message}`);

      // Update local state to reflect the new photo URL if a file was uploaded
      setFormData(prev => ({ ...prev, Student_Photo_Urls: finalPhotoUrl }));
      setPhotoFile(null);
      setPhotoInputMethod("url"); // Reset back to URL view
      
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

        importedData.forEach((row) => {
          if (!uniqueEmails.has(row.StudentEmail)) {
            uniqueEmails.add(row.StudentEmail);
            usersToCreate.push({
              UserEmail: row.StudentEmail,
              UserPassword: row.AddNo,
              UserRole: "Student",
            });
          }
        });

        const { error: userError } = await SupaBaseFunction.from("UserTable").upsert(usersToCreate, {
          onConflict: "UserEmail",
          ignoreDuplicates: true,
        });

        if (userError) throw new Error(`User Sync Failed: ${userError.message}`);

        setMessage({ type: "", text: "Inserting Students..." });

        const studentsToInsert = importedData.map((row) => ({
          AddNo: row.AddNo,
          StudentName: row.StudentName,
          StudentEmail: row.StudentEmail,
          FatherName: row.FatherName || "",
          CollegeName: row.CollegeName || "",
          Class: row.Class || "",
          StnUserId: row.StudentEmail,
        }));

        const { error: studentError } = await SupaBaseFunction.from("StudentsBox").upsert(studentsToInsert, {
          onConflict: "AddNo",
          ignoreDuplicates: true,
        });

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
      <div className="max-w-5xl mx-auto p-8 bg-white rounded-xl shadow-sm mt-10 text-center border border-slate-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
          <p className="text-slate-500 font-medium tracking-wide">Loading student records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-xl shadow-lg mt-10 border border-slate-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Edit Student Record</h2>
          <p className="text-slate-500 text-sm mt-1">Manage and update student profile information</p>
        </div>

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
            className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-semibold shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Import Data
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-semibold shadow-sm border border-slate-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export to Excel
          </button>
        </div>
      </div>

      {/* Global Message Alerts */}
      {message.text && (
        <div
          className={`p-4 mb-6 rounded-lg border ${
            message.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          } flex items-start`}
        >
          <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {message.type === "error" 
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          </svg>
          <div>
            <p className="font-semibold">{message.type === "error" ? "Error" : "Success"}</p>
            <p className="text-sm mt-1">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Read Only field */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Admission Number (AddNo)
            </label>
            <input
              type="text"
              name="AddNo"
              disabled
              value={formData.AddNo}
              className="w-full md:w-1/2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5 outline-none cursor-not-allowed font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Student Name *</label>
            <input
              type="text"
              name="StudentName"
              required
              value={formData.StudentName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Student Email *</label>
            <input
              type="email"
              name="StudentEmail"
              required
              value={formData.StudentEmail}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Class *</label>
            <input
              type="text"
              name="Class"
              required
              value={formData.Class}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Father's Name</label>
            <input
              type="text"
              name="FatherName"
              value={formData.FatherName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">College/School Name</label>
            <input
              type="text"
              name="CollegeName"
              value={formData.CollegeName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* ------------------------------- */}
        {/* PHOTO UPLOAD SECTION            */}
        {/* ------------------------------- */}
        <div className="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">Student Photo</h3>
          
          {/* Toggle Radio Buttons */}
          <div className="flex items-center space-x-6 mb-4">
            <label className="flex items-center cursor-pointer">
              <input 
                type="radio" 
                name="photoInputMethod" 
                value="url" 
                checked={photoInputMethod === "url"} 
                onChange={() => setPhotoInputMethod("url")} 
                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              />
              <span className="ml-2 text-sm font-medium text-slate-700">Image URL</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input 
                type="radio" 
                name="photoInputMethod" 
                value="file" 
                checked={photoInputMethod === "file"} 
                onChange={() => setPhotoInputMethod("file")} 
                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              />
              <span className="ml-2 text-sm font-medium text-slate-700">Upload Image File</span>
            </label>
          </div>

          {/* Conditional Input Fields */}
          {photoInputMethod === "url" ? (
            <div>
              <input
                type="text"
                name="Student_Photo_Urls"
                value={formData.Student_Photo_Urls}
                onChange={handleChange}
                placeholder="https://example.com/photo.jpg"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
              {formData.Student_Photo_Urls && (
                <p className="text-xs text-slate-500 mt-2">Current Image URL provided.</p>
              )}
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100 transition-all cursor-pointer border border-slate-300 rounded-lg p-1 bg-white"
              />
            </div>
          )}

          {/* Image Upload Error Fallback Suggestion */}
          {imageError && (
             <div className="mt-3 p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-start text-sm">
               <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
               <span>{imageError}</span>
             </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-slate-200 mt-8">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? "Saving Changes..." : "Update Student Record"}
          </button>
        </div>
      </form>
    </div>
  );
}