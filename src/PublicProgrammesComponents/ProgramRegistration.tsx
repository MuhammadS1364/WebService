import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import formatProgramDate from "./DateFormatConvertor";

// Ensure APPS_SCRIPT_URL is defined or imported
const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

export default function ProgrammeRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("url");
  const [posterUrl, setPosterUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Role Management States
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  // Success Message State
  const [isShow, setShow] = useState(false);
  const [msg, setMsg] = useState("");

  // Extract user email/identifier from the URL
  const { actUser, actWing } = useParams();
  const loggedInEmail = actUser || actWing;

  const initialFormState = {
    Program_Code: "",
    Program_Title: "",
    Category: "",
    WingName: "",
    Group: "",
    Description: "",
    OutComes: "",
    Date: "",
    Venue: "",
    AccademicYear: "",
    Expected_Time: "",
    IsApproved: false,
    IsResultPublished: false,
    Collaborators: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  const wingOptions = [
    "Islamic Enrichment Wing", "Campus Care", "Arts & Aesthetics",
    "Organizing Board", "Out Reach Board", "Math & Science",
    "Gk & Social Studies", "English Wing", "Arabic Wing",
    "Urdu Wing", "English Debate", "Arabic Debate",
    "Urdu Debate", "Media & It Cell", "Core Committee"
  ];

  const groupOptions = [
    "Other", "Pen Fight", "My-Opinion", "Shaping Future", "Tech-Nest",
    "الاجتماع", "Assembly", "ClassicalSpace", "Tell Me More",
    "صاحب القرآن", "جليس الفقه", "صاحب الترجمان", "Designing"
  ];

  const categoryOptions = [
    "Bidaya", "Ula", "Thaniya", "Thanawiyya", "General(1-7)",
    "UpU2toU4", "UpU4toU7", "UpU5ToU7", "ClassWise"
  ];

  const venueOptions = [
    "Niics_Ground", "CHS-Confrence Hall", "Masjid", "ReadingRoom",
    "Class U1", "Darul Hikma", "Computer Lab", "Other"
  ];

  const Expected_Time = [
    'After Fazar-7:00Am', 'After 7:00Am-Befor Breakfast(9:00Am)', 'Breakfast(9:15AM)-10:00Am', 
    '10:00AM-Till Zohar', 'After Zohar(1:45PM)-3:00PM', 'Befor Asar(4:05PM)-4:30PM', 
    'After Magirb-Ishaa', 'After Ishaa-10:20PM'
  ];
  
  const Collaborators = [
    'Not Collaborated', 'ShaadMate(24th Batch)', 'Afnan Friends(23th Batch)', 
    'Al Misbah Friends(25th Batch)', 'Saba Friend(26th Batch)', 'Sidra Friends(27th Batch)', 
    'Wahda Friend(28th Batch)', 'Falah Friends(28th Batch)'
  ];

  // Fetch current user details based on URL parameter
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (!loggedInEmail) {
          console.error("No user email found in the URL parameters.");
          setIsLoadingRole(false);
          return;
        }

        const { data: userData, error: userError } = await SupaBaseFunction
          .from("UserTable")
          .select("UserRole")
          .eq("UserEmail", loggedInEmail)
          .maybeSingle();

        if (userError) {
          console.error("Error verifying user in UserTable:", userError);
        }

        const { data: wingData, error: wingError } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingTitle, WingUserId")
          .eq("WingUserId", loggedInEmail)
          .maybeSingle();

        if (wingError) {
          console.error("Error verifying user in Chs-WingS:", wingError);
        }

        const isRoleAdmin = userData?.UserRole === 'Admin';

        if (isRoleAdmin) {
          setIsAdmin(true);
          if (wingData && wingData.WingTitle) {
            setFormData((prev) => ({ ...prev, WingName: wingData.WingTitle }));
          }
        } else if (wingData && wingData.WingTitle) {
          setIsAdmin(false);
          setFormData((prev) => ({ ...prev, WingName: wingData.WingTitle }));
        } else {
          setIsAdmin(false);
        }

      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setIsLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [loggedInEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadError("");
    setShow(false);

    try {
      // 1. Fetch Wing Config
      const { data: actWingConfig, error: wingError } = await SupaBaseFunction
        .from("Chs-WingS")
        .select("WingCode, Total_Registrations, Total_Points")
        .eq("WingTitle", formData.WingName)
        .maybeSingle();

      if (wingError || !actWingConfig) throw new Error("Wing configuration not found.");

      // 2. Handle Image
      let driveFileUrl = uploadMethod === "url" ? posterUrl : "";
      if (uploadMethod === "file" && selectedFile) {
        const fullBase64 = await convertToBase64(selectedFile);
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({
            file: fullBase64.split(",")[1],
            subFolderName: formData.Category || "Uncategorized",
            filename: `${formData.Program_Code}_${selectedFile.name}`,
          })
        });
        const data = await response.json();
        if (data?.status !== "success") throw new Error("File upload failed.");
        driveFileUrl = data.fileUrl;
      }

      // 3. Prepare Payload
      const payload = {
        Program_Code: formData.Program_Code,
        Program_Title: formData.Program_Title,
        Category: formData.Category,
        WingCode: actWingConfig.WingCode,
        Group: formData.Group,
        Description: formData.Description,
        OutComes: formData.OutComes,
        Date: formatProgramDate(formData.Date),
        Venue: formData.Venue,
        AccademicYear: formData.AccademicYear,
        Expected_Time: formData.Expected_Time,
        Collaborator: formData.Collaborators,
        Program_Poster: driveFileUrl,
        IsApproved: false,
        IsResultPublished: false
      };

      // 4. Insert
      const { error: insertError } = await SupaBaseFunction
        .from("ProgrammesBox")
        .insert([payload]);

      if (insertError) {
        console.error("Supabase Insert Error:", insertError);
        throw new Error(`DB Error: ${insertError.message}`);
      }

      // 5. Update Metrics
      await SupaBaseFunction
        .from("Chs-WingS")
        .update({
          Total_Points: (actWingConfig.Total_Points || 0) + 1,
          Total_Registrations: (actWingConfig.Total_Registrations || 0) + 1
        })
        .eq("WingCode", actWingConfig.WingCode);

      // Success Feedback & Reset
      setShow(true);
      setMsg("Program registered successfully!");
      setFormData(initialFormState);
      setPosterUrl("");
      setSelectedFile(null);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRole) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg className="h-10 w-10 animate-spin text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-medium animate-pulse">Form is Being Ready for You!...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 relative">
      {/* Loading Overlay when Submitting */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl transition-all">
          <svg className="h-12 w-12 animate-spin text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-bold text-gray-800 animate-pulse">Registering your program...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait while we upload data and update records.</p>
        </div>
      )}

      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-3xl font-bold text-gray-800">
          Register New Program
        </h2>

        {/* Success Banner */}
        {isShow && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-green-50 p-4 border border-green-200 text-green-800">
            <span className="font-medium">{msg}</span>
            <button 
              onClick={() => setShow(false)}
              className="text-sm font-bold text-green-600 hover:text-green-800"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Grid: Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Program Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="Program_Code"
                required
                value={formData.Program_Code}
                onChange={handleChange}
                placeholder="e.g. PRG-2024-001"
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Program Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="Program_Title"
                required
                value={formData.Program_Title}
                onChange={handleChange}
                placeholder="Enter program title"
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
          </div>

          {/* Middle Grid: Dropdown Categories & Tags */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="Category"
                required
                value={formData.Category}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Category</option>
                {categoryOptions.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Wing Name <span className="text-red-500">*</span>
              </label>
              <select
                name="WingName"
                required
                value={formData.WingName}
                onChange={handleChange}
                disabled={!isAdmin}
                className={`w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition ${
                  !isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'
                }`}
              >
                <option value="" disabled>Select Wing</option>
                {wingOptions.map((wing, idx) => (
                  <option key={idx} value={wing}>{wing}</option>
                ))}
              </select>
              {!isAdmin && formData.WingName && (
                <p className="mt-1 text-xs text-blue-600 font-medium">Auto-selected based on your account.</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Group <span className="text-red-500">*</span>
              </label>
              <select
                name="Group"
                required
                value={formData.Group}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Group</option>
                {groupOptions.map((group, idx) => (
                  <option key={idx} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Venue Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Venue <span className="text-red-500">*</span>
              </label>
              <select
                name="Venue"
                required
                value={formData.Venue}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Venue</option>
                {venueOptions.map((venue, idx) => (
                  <option key={idx} value={venue}>{venue}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="AccademicYear"
                required
                placeholder="Example 2026-27"
                value={formData.AccademicYear}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="Date"
                required
                value={formData.Date}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Expected Time <span className="text-red-500">*</span>
              </label>
              <select
                name="Expected_Time"
                required
                value={formData.Expected_Time}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Expected Time</option>
                {Expected_Time.map((time, idx) => (
                  <option key={idx} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Collaborator <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                name="Collaborators"
                value={formData.Collaborators}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Collaborators</option>
                {Collaborators.map((collab, idx) => (
                  <option key={idx} value={collab}>{collab}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Poster Upload/URL Section */}
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Program Poster
            </label>

            <div className="flex gap-4 mb-4">
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
                placeholder="https://example.com/poster.jpg"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
                <div className="flex flex-col gap-2">
                  <input
                    id="posterFileInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      setUploadError("");
                    }}
                    className="w-full rounded-lg border border-gray-300 p-2.5 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadError && (
                    <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                      {uploadError}
                    </div>
                  )}
                </div>

                {/* Image Preview */}
                <div className="flex items-center justify-center">
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</p>
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Poster Preview"
                        className="h-32 w-auto max-w-full rounded-lg object-contain shadow-md border border-gray-200 bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm text-gray-400">
                      No Poster Selected
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Textareas */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              name="Description"
              rows={3}
              value={formData.Description}
              onChange={handleChange}
              placeholder="What is this program about?"
              className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            ></textarea>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Expected Outcomes
            </label>
            <textarea
              name="OutComes"
              rows={2}
              value={formData.OutComes}
              onChange={handleChange}
              placeholder="What will participants achieve?"
              className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-xl py-4 text-lg font-bold text-white transition shadow-lg ${
                isSubmitting
                  ? "cursor-not-allowed bg-blue-400 shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/20"
              }`}
            >
              {isSubmitting ? "Registering & Uploading..." : "Register Program"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}