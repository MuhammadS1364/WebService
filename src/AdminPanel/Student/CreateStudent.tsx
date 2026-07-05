import { useState } from "react";
import { APPS_SCRIPT_URL, SupaBaseFunction } from "../../lib/SupaBase";

// import axios from "axios"; // retained if you need it elsewhere
import * as XLSX from "xlsx";

export default function StudentRegistration() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- NEW: Photo Upload States ---
    const [uploadMethod, setUploadMethod] = useState("url"); // "url" | "file"
    const [imageUrl, setImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState("");

    const [formData, setFormData] = useState({
        AddNo: "",
        StudentName: "",
        StudentEmail: "",
        FatherName: "",
        CollegeName: "",
        Class: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    // Single Student Registration Manual Flow
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setUploadError(""); // Reset previous errors

        try {
            // 1. Ensure No Duplicate Email exists in UserTable
            const { data: existingUser, error: checkError } = await SupaBaseFunction
                .from("UserTable")
                .select("UserEmail")
                .eq("UserEmail", formData.StudentEmail)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existingUser) {
                throw new Error("This Email is already registered in the system!");
            }

            // 2. Handle Photo Source (URL or File Upload)
            let finalPhotoUrl = "";

            if (uploadMethod === "url" && imageUrl.trim()) {
                finalPhotoUrl = imageUrl.trim();
            } else if (uploadMethod === "file" && selectedFile) {
                try {
                    let base64File = await convertToBase64(selectedFile);

                    if (base64File.includes(",")) {
                        base64File = base64File.split(",")[1];
                    }

                    const payloadData = {
                        action: "upload",
                        subFolderName: "NcMs-Students",
                        file: base64File,
                        filename: `STD_${formData.AddNo}_${selectedFile.name}`,
                    };

                    const response = await fetch(APPS_SCRIPT_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "text/plain;charset=utf-8"
                        },
                        body: JSON.stringify(payloadData)
                    });

                    const responseData = await response.json();

                    if (responseData && (responseData.success || responseData.status === "success")) {
                        finalPhotoUrl = responseData.fileUrl;
                    } else {
                        throw new Error("Google Drive upload failed: " + (responseData.error || responseData.message || "Unknown Error"));
                    }
                } catch (uploadFailError) {
                    console.error("Upload process failed:", uploadFailError);
                    setUploadError("⚠️ Image upload failed. Please switch to the 'Image URL' option to continue.");
                    setIsSubmitting(false);
                    return; // Halt submission
                }
            }

            // 3. Create User account first
            const userPayload = {
                UserEmail: formData.StudentEmail,
                UserPassword: formData.AddNo,
                UserRole: "Student",
            };

            const { error: userTableError } = await SupaBaseFunction
                .from("UserTable")
                .insert([userPayload]);

            if (userTableError) throw new Error(`User auth account mapping failed: ${userTableError.message}`);

            // 4. Create Student Details Record inside StudentsBox
            const studentPayload = {
                AddNo: formData.AddNo,
                StudentName: formData.StudentName,
                StudentEmail: formData.StudentEmail,
                FatherName: formData.FatherName,
                CollegeName: formData.CollegeName,
                StnUserId: formData.StudentEmail,
                Class: formData.Class,
                ...(finalPhotoUrl && { Student_Photo_Urls: finalPhotoUrl }), // Only attach if a URL was resolved
            };

            const { error: studentBoxError } = await SupaBaseFunction
                .from("StudentsBox")
                .insert([studentPayload]);

            if (studentBoxError) throw new Error(`Student box mapping failed: ${studentBoxError.message}`);

            alert("Success! User account verified and Student registered perfectly.");

            // Reset Form Data
            setFormData({ AddNo: "", StudentName: "", StudentEmail: "", FatherName: "", CollegeName: "", Class: "" });
            setImageUrl("");
            setSelectedFile(null);
            setUploadError("");
            const fileInput = document.getElementById("studentPhotoInput") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Bulk Import Feature (Skips Photos Automatically)
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                let successCount = 0;
                let skippedCount = 0;

                for (const row of data) {
                    if (!row.AddNo || !row.StudentEmail) continue;

                    const { data: existing } = await SupaBaseFunction
                        .from("UserTable")
                        .select("UserEmail")
                        .eq("UserEmail", row.StudentEmail)
                        .maybeSingle();

                    if (existing) {
                        skippedCount++;
                        continue;
                    }

                    await SupaBaseFunction.from("UserTable").insert([{
                        UserEmail: row.StudentEmail,
                        UserPassword: String(row.AddNo),
                        UserRole: "Student"
                    }]);

                    await SupaBaseFunction.from("StudentsBox").insert([{
                        AddNo: String(row.AddNo),
                        StudentName: row.StudentName || "",
                        StudentEmail: row.StudentEmail,
                        FatherName: row.FatherName || "",
                        CollegeName: row.CollegeName || "",
                        StnUserId: row.StudentEmail,
                        Class: row.Class ? String(row.Class) : "",
                    }]);

                    successCount++;
                }

                alert(`Bulk Registration Completed!\nSuccessfully Registered: ${successCount}\nSkipped (Duplicates): ${skippedCount}`);
            } catch (err: any) {
                alert("Failed to parse file: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExportData = async () => {
        const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
        if (error) {
            alert("Export failed: " + error.message);
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data || []);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Registered Students");
        XLSX.writeFile(workbook, "StudentsExport_List.xlsx");
    };

    return (
        <div className="mx-auto max-w-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 border border-gray-200">
                <div>
                    <h3 className="font-bold text-gray-700">Bulk Actions (Excel/CSV)</h3>
                    <p className="text-xs text-gray-500">Imports bypass drive photos automatically</p>
                </div>
                <div className="flex gap-2">
                    <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2 px-3 rounded-lg transition">
                        Import Excel
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} className="hidden" />
                    </label>
                    <button onClick={handleExportData} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2 px-3 rounded-lg transition">
                        Export Data
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Student Registration & User Setup</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Admission No (Will be Password) *</label>
                            <input type="text" name="AddNo" required value={formData.AddNo} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name *</label>
                            <input type="text" name="StudentName" required value={formData.StudentName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Will be Login ID) *</label>
                            <input type="email" name="StudentEmail" required value={formData.StudentEmail} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Father's Name</label>
                            <input type="text" name="FatherName" value={formData.FatherName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">College Name</label>
                            <input type="text" name="CollegeName" value={formData.CollegeName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Class</label>
                            <select
                                name="Class"
                                value={formData.Class}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">Select your class</option>
                                <option value="Secondary First Year">Secondary First Year</option>
                                <option value="Secondary Second Year">Secondary Second Year</option>
                                <option value="Secondary Third Year">Secondary Third Year</option>
                                <option value="Secondary Fourth Year">Secondary Fourth Year</option>
                                <option value="Secondary Final Year">Secondary Final Year</option>
                                <option value="Senior Secondary First Year">Senior Secondary First Year</option>
                                <option value="Senior Secondary Last Year">Senior Secondary Last Year</option>
                                <option value="Degree First Year">Degree First Year</option>
                                <option value="Degree Second Year">Degree Second Year</option>
                                <option value="Degree Last Year">Degree Last Year</option>
                                <option value="Pg First Year">Pg First Year</option>
                                <option value="Pg Final Year">Pg Final Year</option>
                            </select>
                        </div>
                    </div>

                    {/* NEW: Photo Upload/URL Section */}
                    <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Student Photo (Optional)
                        </label>

                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="uploadMethod"
                                    value="url"
                                    checked={uploadMethod === "url"}
                                    onChange={() => {
                                        setUploadMethod("url");
                                        setUploadError("");
                                    }}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                Image URL
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="uploadMethod"
                                    value="file"
                                    checked={uploadMethod === "file"}
                                    onChange={() => {
                                        setUploadMethod("file");
                                        setUploadError("");
                                    }}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                Upload Image File
                            </label>
                        </div>

                        {uploadMethod === "url" ? (
                            <input
                                type="url"
                                placeholder="https://example.com/photo.jpg"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none"
                            />
                        ) : (
                            <div className="flex flex-col gap-2">
                                <input
                                    id="studentPhotoInput"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSelectedFile(e.target.files[0]);
                                            setUploadError(""); // clear error on new file
                                        }
                                    }}
                                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none bg-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {uploadError && (
                                    <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                                        {uploadError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full rounded-xl py-3 font-bold text-white transition mt-4 shadow-lg ${isSubmitting ? "bg-blue-400 cursor-not-allowed shadow-none" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/20"}`}
                    >
                        {isSubmitting ? "Processing Registration..." : "Register Student & Create Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}