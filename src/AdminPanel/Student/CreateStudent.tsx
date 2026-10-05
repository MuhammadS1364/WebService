
import { useState, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { uploadImageToImgBB, processImageToSquareDataUrl } from "../../lib/imgbbService";
import { exportToExcel, parseSpreadsheet, downloadSampleTemplate } from "../../lib/excelService";
import { importStudentsBatch } from "./ImportStudent";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudentRegistration() {
    const meta = useProgrammeMeta();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // --- Photo Upload States ---
    const [imagePreview, setImagePreview] = useState<string>("");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState("");
    const [showUrlInput, setShowUrlInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        AddNo: "", StudentName: "", StudentEmail: "", FatherName: "",
        CollegeName: "", Class: "", StnState: "", StnDistrict: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError("");
        try {
            // Automatically center-crop to 1:1 square canvas
            const squareUrl = await processImageToSquareDataUrl(file, 360, 0.86);
            setImagePreview(squareUrl);
            setSelectedFile(file);
            setImageUrl("");
        } catch (err: any) {
            setUploadError("Unable to crop photo. Please try a different image.");
        }
    };

    const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setImageUrl(val);
        setUploadError("");
        if (val.trim()) {
            setImagePreview(val.trim());
            setSelectedFile(null);
        } else {
            setImagePreview("");
        }
    };

    const handleRemovePhoto = () => {
        setImagePreview("");
        setSelectedFile(null);
        setImageUrl("");
        setUploadError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
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

            // 2. Finalize Photo URL (fail-safe and crisp)
            let finalPhotoUrl = imagePreview || "";
            if (!finalPhotoUrl && imageUrl.trim()) {
                finalPhotoUrl = imageUrl.trim();
            } else if (selectedFile) {
                try {
                    const imgResult = await uploadImageToImgBB(selectedFile, `std_${formData.AddNo}`);
                    if (imgResult.displayUrl) finalPhotoUrl = imgResult.displayUrl;
                } catch {
                    // Fallback to already processed imagePreview
                    finalPhotoUrl = imagePreview;
                }
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
            setImagePreview("");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
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
        setStatusMessage("Parsing and validating spreadsheet data...");

        try {
            const rows = await parseSpreadsheet(file);
            setStatusMessage(`Importing ${rows.length} records in batch...`);
            const importRes = await importStudentsBatch(rows);

            if (importRes.errors.length > 0) {
                setStatusMessage(`⚠️ Notice: ${importRes.errors.join(", ")}`);
            } else {
                setStatusMessage(`✅ Batch import success! Ingested: ${importRes.successCount} students. Skipped duplicates: ${importRes.duplicatesSkipped}.`);
            }
        } catch (err: any) {
            setStatusMessage(`❌ Import failed: ${err.message}`);
        } finally {
            setIsSubmitting(false);
            e.target.value = "";
        }
    };

    // --- Export ---
    const handleExportData = async () => {
        setIsSubmitting(true);
        setStatusMessage("Exporting data, please wait...");
        try {
            const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
            if (error) throw error;
            exportToExcel(data || [], "Students_Directory_Export.xlsx", "Students");
            setStatusMessage("✅ Export successful!");
        } catch (err: any) {
            setStatusMessage(`❌ Export failed: ${err.message}`);
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
                <button disabled={isSubmitting} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition cursor-pointer" onClick={() => document.getElementById('fileInput')?.click()}>
                    {isSubmitting ? "Processing..." : "Import Excel"}
                </button>
                <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                <button disabled={isSubmitting} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition cursor-pointer" onClick={handleExportData}>
                    {isSubmitting ? "Processing..." : "Export Data"}
                </button>
                <button disabled={isSubmitting} type="button" className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition cursor-pointer" onClick={() => downloadSampleTemplate("students")}>
                    Sample Template (.xlsx)
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
                                <option value="">Select class</option>
                                {meta.classes.length > 0 ? (
                                    meta.classes.map((cls) => (
                                        <option key={cls.class_id} value={cls.class_title}>
                                            {cls.class_title} (Batch #{cls.class_serial_number ?? 1})
                                        </option>
                                    ))
                                ) : (
                                    <>
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
                                    </>
                                )}
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


                    {/* Student Photo Upload Section - Modern 1:1 Square Auto-Crop */}
                    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-slate-50/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Camera className="w-4 h-4 text-indigo-600" />
                                Student Photo (Optional)
                            </label>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Auto-crops to 1:1 Square
                            </span>
                        </div>

                        {imagePreview ? (
                            /* Live 1:1 Square Preview */
                            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
                                    <img
                                        src={imagePreview}
                                        alt="Student Preview"
                                        className="w-full h-full object-cover object-center aspect-square"
                                    />
                                    <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs" title="1:1 Perfect Square">
                                        <CheckCircle2 className="w-3 h-3" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 truncate">
                                            {selectedFile ? selectedFile.name : "Custom Image Attached"}
                                        </p>
                                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            Ready for registration
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition cursor-pointer"
                                        >
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Empty Upload Dropzone */
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                            >
                                <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-slate-800">
                                    Click to upload student photo
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Supports PNG, JPG, WebP • Auto-crops 1:1 square
                                </p>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileChange}
                            className="hidden"
                        />

                        {/* Optional Web URL Toggle */}
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className="text-[11px] text-slate-500 hover:text-indigo-600 font-semibold cursor-pointer underline transition-colors"
                            >
                                {showUrlInput ? "Hide web URL option" : "Or use direct image URL instead"}
                            </button>

                            {showUrlInput && (
                                <input
                                    type="url"
                                    placeholder="https://example.com/student-photo.jpg"
                                    value={imageUrl}
                                    onChange={handleUrlChange}
                                    className="mt-2 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none bg-white transition"
                                />
                            )}
                        </div>

                        {uploadError && (
                            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{uploadError}</span>
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