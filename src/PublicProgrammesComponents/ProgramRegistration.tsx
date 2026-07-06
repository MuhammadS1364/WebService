import { useState } from "react";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import formatProgramDate from "./DateFormatConvertor";
import { APPS_SCRIPT_URL } from "../../src/lib/SupaBase";

export default function ProgrammeRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Poster Upload States
  const [uploadMethod, setUploadMethod] = useState("url"); // "url" | "file"
  const [posterUrl, setPosterUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  const [formData, setFormData] = useState({
    Program_Code: "",
    Program_Title: "",
    Category: "",
    WingName: "",
    Group: "",
    Description: "",
    OutComes: "",
    Date: "",
    Venue: "",
    IsApproved: false,
    IsResulted: false,
    IsResultPublished: false,
  });

  // --- PREDEFINED LISTS ---
  const wingOptions = [
    "Islamic Enrichment Wing", "Campus Care", "Arts & Aesthetics",
    "Organizing Board", "Out Reach Board", "Math & Science",
    "Gk & Social Studies", "English Wing", "Arabic Wing",
    "Urdu Wing", "English Debate", "Arabic Debate",
    "Urdu Debate", "Media & It Cell"
  ];

  const groupOptions = [
    "Pen Fight", "My-Opinion", "Shaping Future", "Tech-Nest",
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

    try {
      // 1. Get Wing details from Supabase
      const { data: actWing, error: checkError } = await SupaBaseFunction
        .from("Chs-WingS")
        .select("WingCode, WingTitle, WingEmail, Total_Registrations, Total_Points")
        .eq("WingTitle", formData.WingName)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!actWing) {
        throw new Error("Wing not found. Please ensure you have selected a valid wing.");
      }

      // 2. Upload File or Use URL
      let driveFileUrl = "";

      if (uploadMethod === "url") {
        driveFileUrl = posterUrl;
      } else if (uploadMethod === "file" && selectedFile) {
        try {
          const fullBase64 = await convertToBase64(selectedFile);
          const rawBase64 = fullBase64.split(",")[1];

          const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
              file: rawBase64,
              subFolderName: formData.Category || "Uncategorized",
              filename: `${formData.Program_Code || "Poster"}_${selectedFile.name}`,
            })
          });

          const responseData = await response.json();

          if (responseData && responseData.status === "success") {
            driveFileUrl = responseData.fileUrl;
          } else {
            throw new Error("Google Drive upload failed: " + (responseData.message || "Unknown Error"));
          }
        } catch (uploadFailError) {
          console.error("Upload process failed:", uploadFailError);
          setUploadError("⚠️ Image upload failed. Please switch to the 'Image URL' option above to continue.");
          setIsSubmitting(false);
          return; 
        }
      }

      const formatteddDate = formatProgramDate(formData.Date);
      
      // 3. Prepare payload for Supabase database insertion
      // Remove WingName so we don't try to push it to the database
      const { WingName, ...restOfFormData } = formData;

      const payload = {
        ...restOfFormData,
        Program_Poster: driveFileUrl,
        WingCode: actWing.WingCode, // Use WingCode to match the schema
        Date: formatteddDate,
        AccademicYear : "2026-27"
      };

      // 4. Insert programme data row
      const { error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .insert([payload]);

      if (error) throw error;

      // 5. Increment wing metrics points
      const { error: updateError } = await SupaBaseFunction
        .from("Chs-WingS")
        .update({
          Total_Points: (actWing.Total_Points || 0) + 1,
          Total_Registrations: (actWing.Total_Registrations || 0) + 1
        })
        .eq("WingCode", actWing.WingCode);

      if (updateError) throw updateError;

      // 6. Success Feedback
      alert("Program registered successfully!");

      // 7. Reset Form completely
      setFormData({
        Program_Code: "",
        Program_Title: "",
        Category: "",
        WingName: "",
        Group: "",
        Description: "",
        OutComes: "",
        Date: "",
        Venue: "",
        IsApproved: false,
        IsResulted: false,
        IsResultPublished: false,
      });
      setPosterUrl("");
      setSelectedFile(null);
      setUploadError("");

      const fileInput = document.getElementById("posterFileInput") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (err: any) {
      console.error("Submit error:", err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-3xl font-bold text-gray-800">
          Register New Program
        </h2>

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
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Wing</option>
                {wingOptions.map((wing, idx) => (
                  <option key={idx} value={wing}>{wing}</option>
                ))}
              </select>
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

          {/* Date & Venue Info */}
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
                    setUploadError(""); // Clear errors on switch
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
                    setUploadError(""); // Clear errors on switch
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
                      setUploadError(""); // Reset error when user picks a new file
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