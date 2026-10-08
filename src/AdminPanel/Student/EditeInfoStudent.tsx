import { useState, useEffect, useRef, useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { uploadImageToImgBB, processImageToSquareDataUrl } from "../../lib/imgbbService";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useProgrammeMeta } from "../../lib/programmeMeta";

interface FormDataState {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
  Student_Photo_Urls: string;
  FatherName: string;
  CollegeName: string;
  Class: string;
  Stn_Class?: string;
  StnState: string;
  StnDistrict: string;
}

export default function EditStudentRecord() {
  const { StnAddNo } = useParams<{ StnAddNo: string }>();
  const { actUser } = useParams<{ actUser: string }>();

  const navigate = useNavigate();
  const meta = useProgrammeMeta();

  const [formData, setFormData] = useState<FormDataState>({
    AddNo: "",
    StudentName: "",
    StudentEmail: "",
    Student_Photo_Urls: "",
    FatherName: "",
    CollegeName: "",
    Class: "",
    Stn_Class: "",
    StnState: "",
    StnDistrict: ""
  });

  // Photo Upload States
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const matchedClass = meta.classes.find(
            (c) =>
              (data.Stn_Class && c.class_id === data.Stn_Class) ||
              (data.Class && (c.standard_name === data.Class || c.class_nick_name === data.Class))
          );
          const resolvedClass =
            matchedClass?.standard_name ||
            data.Class ||
            (data.Stn_Class ? meta.classMap[data.Stn_Class] || "" : "") ||
            "";

          setFormData({
            AddNo: data.AddNo || "",
            StudentName: data.StudentName || "",
            StudentEmail: data.StudentEmail || "",
            Student_Photo_Urls: data.Student_Photo_Urls || "",
            FatherName: data.FatherName || "",
            CollegeName: data.CollegeName || "",
            Class: resolvedClass,
            Stn_Class: data.Stn_Class || matchedClass?.class_id || "",
            StnState: data.StnState || "No Provided",
            StnDistrict: data.StnDistrict || "No Provided",
          });
        }
      } catch (error: any) {
        console.error("Fetch Error:", error);
        setMessage({
          type: "error",
          text: `Failed to load student data: ${error.message || error}`,
        });
      } finally {
        setFetching(false);
      }
    };

    fetchStudentRecord();
  }, [StnAddNo]);

  // Synchronize class selection once metadata is retrieved
  useEffect(() => {
    if (meta.classes.length > 0) {
      const match = meta.classes.find(
        (c) =>
          (formData.Stn_Class && c.class_id === formData.Stn_Class) ||
          (formData.Class && (c.standard_name === formData.Class || c.class_nick_name === formData.Class || c.class_id === formData.Class))
      );
      if (match?.standard_name && formData.Class !== match.standard_name) {
        setFormData((prev) => ({
          ...prev,
          Class: match.standard_name,
          Stn_Class: match.class_id,
        }));
      }
    }
  }, [meta.classes, formData.Stn_Class, formData.Class]);

  // Canonical and DB-backed list of all standard class names
  const standardClassesOptions = useMemo(() => {
    const list: { id?: string; standard_name: string; class_nick_name?: string; class_serial_number?: number }[] = [];
    const seenNames = new Set<string>();

    if (meta.classes && meta.classes.length > 0) {
      meta.classes.forEach((c) => {
        const name = c.standard_name || c.class_nick_name;
        if (name && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          list.push({
            id: c.class_id,
            standard_name: name,
            class_nick_name: c.class_nick_name || undefined,
            class_serial_number: c.class_serial_number ?? undefined,
          });
        }
      });
    }

    const defaultStandardNames = [
      "Secondary First Year",
      "Secondary Second Year",
      "Secondary Third Year",
      "Secondary Fourth Year",
      "Secondary Final Year",
      "Senior Secondary First Year",
      "Senior Secondary Second Year",
      "Degree First Year",
      "Degree Second Year",
      "Degree Final Year",
      "PG First Year",
      "PG Final Year",
    ];

    defaultStandardNames.forEach((defName, idx) => {
      if (!seenNames.has(defName.toLowerCase())) {
        seenNames.add(defName.toLowerCase());
        list.push({
          standard_name: defName,
          class_serial_number: idx + 1,
        });
      }
    });

    return list.sort((a, b) => (a.class_serial_number ?? 99) - (b.class_serial_number ?? 99));
  }, [meta.classes]);

  // Fixes TS7006 & TS2339 by strictly typing the event target name mapping keys
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "Class") {
      const match = meta.classes.find(
        (c) => c.standard_name === value || c.class_nick_name === value || c.class_id === value
      );
      setFormData((prev) => ({
        ...prev,
        Class: value,
        Stn_Class: match?.class_id || prev.Stn_Class,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setImageError("");
      try {
        const squareDataUrl = await processImageToSquareDataUrl(file, 360, 0.86);
        setFormData((prev) => ({
          ...prev,
          Student_Photo_Urls: squareDataUrl,
        }));
      } catch (err: any) {
        setImageError("Could not process photo file.");
      }
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, Student_Photo_Urls: "" }));
    setPhotoFile(null);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ----------------------------------------
  // SAVE CHANGES (UPDATE METHOD)
  // ----------------------------------------
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    setImageError("");

    let finalPhotoUrl = formData.Student_Photo_Urls;

    try {
      // 1. Handle File Upload if selected
      if (photoFile) {
        try {
          const imgResult = await uploadImageToImgBB(photoFile, `std_${formData.AddNo}`);
          if (imgResult.displayUrl) finalPhotoUrl = imgResult.displayUrl;
        } catch {
          finalPhotoUrl = formData.Student_Photo_Urls;
        }
      }

      // 2. Sync User Account
      const { data: existingUser } = await SupaBaseFunction.from("UserTable")
        .select("UserEmail")
        .eq("UserEmail", formData.StudentEmail)
        .maybeSingle();

      if (!existingUser) {
        const { error: createError } = await SupaBaseFunction.from("UserTable").insert([
          { UserEmail: formData.StudentEmail, UserPassword: formData.AddNo, UserRole: "Student" },
        ]);
        if (createError) throw new Error(`User Account Sync Failed: ${createError.message}`);
      }

      // 3. Update Student Record
      const matchedClass = meta.classes.find(
        (c) => (c.standard_name || c.class_nick_name) === formData.Class || c.class_id === formData.Class
      );
      const stnClassId = matchedClass ? matchedClass.class_id : null;

      const updatePayload: any = {
        StudentName: formData.StudentName,
        StudentEmail: formData.StudentEmail,
        Student_Photo_Urls: finalPhotoUrl,
        FatherName: formData.FatherName,
        CollegeName: formData.CollegeName,
        Class: formData.Class || (matchedClass?.standard_name ?? null),
        Stn_Class: stnClassId,
        StnUserId: formData.StudentEmail,
        StnState: formData.StnState || "No Provided",
        StnDistrict: formData.StnDistrict || "No Provided",
      };

      let { error: updateError } = await SupaBaseFunction.from("StudentsBox")
        .update(updatePayload)
        .eq("AddNo", StnAddNo);

      if (updateError && updateError.message?.toLowerCase().includes("class")) {
        delete updatePayload.Class;
        const retry = await SupaBaseFunction.from("StudentsBox")
          .update(updatePayload)
          .eq("AddNo", StnAddNo);
        updateError = retry.error;
      }

      if (updateError) throw new Error(`Profile Update Failed: ${updateError.message}`);

      setMessage({ type: "success", text: "Student records updated successfully!" });
      navigate(`/admin-panel/${actUser}/all-students`);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || error });
    } finally {
      setLoading(false);
    }
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
      </div>

      {/* Global Message Alerts */}
      {message.text && (
        <div
          className={`p-4 mb-6 rounded-lg border ${message.type === "error"
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

          {/* Admission Number (Read Only) */}
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

          {/* Student Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="StudentName"
              required
              value={formData.StudentName}
              onChange={handleChange}
              placeholder="e.g. Aatif Pathan"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
            />
          </div>

          {/* Student Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Student Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="StudentEmail"
              required
              value={formData.StudentEmail}
              onChange={handleChange}
              placeholder="student@example.com"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
            />
          </div>

          {/* Class - Standard Names List from Our_Classes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700">
                Class Standard Name <span className="text-red-500">*</span>
              </label>
              {formData.Stn_Class && (
                <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Linked to Our_Classes
                </span>
              )}
            </div>
            <select
              name="Class"
              required
              value={formData.Class}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium text-slate-900"
            >
              <option value="">-- Select Standard Class (Our_Classes) --</option>
              {standardClassesOptions.map((cls: { id?: string; standard_name: string; class_nick_name?: string; class_serial_number?: number }) => (
                <option key={cls.id || cls.standard_name} value={cls.standard_name}>
                  {cls.standard_name} {cls.class_nick_name ? `(${cls.class_nick_name})` : ""} {cls.class_serial_number ? `— Order #${cls.class_serial_number}` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Official standard grade name stored in <span className="font-semibold text-slate-600">Our_Classes</span> (Stn_Class).
            </p>
          </div>

          {/* Father's Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Father's Name
            </label>
            <input
              type="text"
              name="FatherName"
              value={formData.FatherName}
              onChange={handleChange}
              placeholder="Student's Father Name"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
            />
          </div>

          {/* College / School Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              College/School Name
            </label>
            <input
              type="text"
              name="CollegeName"
              value={formData.CollegeName}
              onChange={handleChange}
              placeholder="e.g. Darul Huda Islamic University"
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
            />
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              District
            </label>
            <input
              type="text"
              name="StnDistrict"
              value={formData.StnDistrict}
              onChange={handleChange}
              placeholder="e.g. Banswara, Malappuram..."
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
            />
          </div>

          {/* State */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              State
            </label>
            <input
              type="text"
              name="StnState"
              value={formData.StnState}
              onChange={handleChange}
              placeholder="e.g. Rajasthan, Kerala, Bihar..."
              className="w-full md:w-1/2 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        {/* PHOTO UPLOAD & PREVIEW SECTION */}
        <div className="mt-8 p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-indigo-600" />
              Student Profile Photo
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Auto-crops to 1:1 Square
            </span>
          </div>

          {formData.Student_Photo_Urls ? (
            /* Live 1:1 Square Preview */
            <div className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
                <img
                  src={formData.Student_Photo_Urls}
                  alt={formData.StudentName || "Student Photo"}
                  className="w-full h-full object-cover object-center aspect-square"
                />
                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs" title="1:1 Perfect Square">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {photoFile ? photoFile.name : "Current Photo Active"}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    1:1 Square Portrait
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Click to upload new student photo
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
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Web URL Option */}
          <div className="pt-1">
            <details className="text-[11px] text-slate-500 cursor-pointer">
              <summary className="hover:text-indigo-600 font-semibold select-none">
                Or enter image URL directly
              </summary>
              <div className="mt-2">
                <input
                  type="text"
                  name="Student_Photo_Urls"
                  value={formData.Student_Photo_Urls}
                  onChange={handleChange}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>
            </details>
          </div>

          {imageError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
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