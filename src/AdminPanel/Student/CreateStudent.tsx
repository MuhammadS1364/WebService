
import { useState } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import * as XLSX from "xlsx";

export default function StudentRegistration() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // --- Photo Upload States ---
    const [uploadMethod, setUploadMethod] = useState("url");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState("");

    const [formData, setFormData] = useState({
        AddNo: "", StudentName: "", StudentEmail: "", FatherName: "",
        CollegeName: "", Class: "", StnState: "", StnDistrict: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // --- Main Submission Logic ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage("Processing registration, please wait...");
        setUploadError("");

        try {
            // 1. Check if user exists
            const { data: existingUser, error: checkError } = await SupaBaseFunction
                .from("UserTable").select("UserEmail").eq("UserEmail", formData.StudentEmail).maybeSingle();

            if (checkError) throw checkError;
            if (existingUser) throw new Error("This Email is already registered!");

            let finalPhotoUrl = "";

            // 2. Handle Photo Upload
            if (uploadMethod === "url" && imageUrl.trim()) {
                finalPhotoUrl = imageUrl.trim();
            } else if (uploadMethod === "file" && selectedFile) {
                // Generate a unique file name
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `std_${formData.AddNo}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await SupaBaseFunction.storage
                    .from("StudentPhoto")
                    .upload(filePath, selectedFile);

                if (uploadError) throw new Error("Storage Upload failed: " + uploadError.message);

                // Get Public URL
                const { data: publicUrlData } = SupaBaseFunction.storage
                    .from("StudentPhoto")
                    .getPublicUrl(filePath);

                finalPhotoUrl = publicUrlData.publicUrl;
            }

            // 3. Register user and save student data
            await SupaBaseFunction.from("UserTable").insert([{
                UserEmail: formData.StudentEmail,
                UserPassword: formData.AddNo,
                UserRole: "Student"
            }]);

            await SupaBaseFunction.from("StudentsBox").insert([{
                ...formData,
                StnUserId: formData.StudentEmail,
                Student_Photo_Urls: finalPhotoUrl
            }]);

            setStatusMessage("✅ Success! Student registered successfully.");
            setFormData({ AddNo: "", StudentName: "", StudentEmail: "", FatherName: "", CollegeName: "", Class: "", StnState: "", StnDistrict: "" });
            setImageUrl("");
            setSelectedFile(null);
        } catch (err: any) {
            setStatusMessage(`❌ Error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Bulk Import ---
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsSubmitting(true);
        setStatusMessage("Importing data, please wait...");

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const workbook = XLSX.read(evt.target?.result, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                let successCount = 0;
                let duplicateCount = 0;

                for (const row of data) {
                    if (!row.AddNo || !row.StudentEmail) continue;

                    // Check if user already exists
                    const { data: existingUser, error: checkError } = await SupaBaseFunction
                        .from("UserTable")
                        .select("UserEmail")
                        .eq("UserEmail", row.StudentEmail)
                        .maybeSingle();

                    if (checkError) throw checkError;

                    if (existingUser) {
                        duplicateCount++;
                        continue; // skip insert
                    }

                    // Insert new user
                    await SupaBaseFunction.from("UserTable").insert([{
                        UserEmail: row.StudentEmail,
                        UserPassword: String(row.AddNo),
                        UserRole: "Student"
                    }]);

                    await SupaBaseFunction.from("StudentsBox").insert([{
                        ...row,
                        StnUserId: row.StudentEmail
                    }]);

                    successCount++;
                }

                setStatusMessage(`✅ Import completed! Registered: ${successCount}, Duplicates skipped: ${duplicateCount}`);
            } catch (err: any) {
                setStatusMessage("❌ Import failed: " + err.message);
            } finally {
                setIsSubmitting(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- Export ---
    const handleExportData = async () => {
        setIsSubmitting(true);
        setStatusMessage("Exporting data, please wait...");
        try {
            const { data } = await SupaBaseFunction.from("StudentsBox").select("*");
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data || []), "Students");
            XLSX.writeFile(wb, "StudentsExport.xlsx");
            setStatusMessage("✅ Export successful!");
        } catch {
            setStatusMessage("❌ Export failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl p-6 space-y-6">
            {statusMessage && (
                <div className={`p-4 rounded-lg font-medium text-center ${statusMessage.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {statusMessage}
                </div>
            )}

            {/* Bulk Actions UI */}
            <div className="flex flex-wrap items-center justify-end gap-4 rounded-xl p-4 border border-gray-200">
                <h2 className="text-4xl">Quick Action</h2>
                <button disabled={isSubmitting} className="bg-emerald-600 text-white px-4 py-2 rounded-lg" onClick={() => document.getElementById('fileInput')?.click()}>
                    {isSubmitting ? "Processing..." : "Import Excel"}
                </button>
                <input id="fileInput" type="file" className="hidden" onChange={handleImportExcel} />
                <button disabled={isSubmitting} className="bg-indigo-600 text-white px-4 py-2 rounded-lg" onClick={handleExportData}>
                    {isSubmitting ? "Processing..." : "Export Data"}
                </button>
            </div>

            {/* Registration Form UI remains here... */}
            <div className="rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Student Registration & User Setup</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Admission No (Will be Password) *</label>
                            <input type="text" placeholder="Student Addmission no U1364" name="AddNo" required value={formData.AddNo} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name *</label>
                            <input type="text" placeholder="Student Name" name="StudentName" required value={formData.StudentName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Will be Login ID) *</label>
                            <input type="email" placeholder="Student Email" name="StudentEmail" required value={formData.StudentEmail} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Father's Name</label>
                            <input type="text" placeholder="Student's Father Name" name="FatherName" value={formData.FatherName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">College Name</label>
                            <input type="text" placeholder="ex Darul Huda Islamic University" name="CollegeName" value={formData.CollegeName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">State*</label>
                            <input type="text" name="StnState" placeholder="Student's State" required value={formData.StnState} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">District*</label>
                            <input type="text" name="StnDistrict" placeholder="Student District" required value={formData.StnDistrict} onChange={handleChange} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" />
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