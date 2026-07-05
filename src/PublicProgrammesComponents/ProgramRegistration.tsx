import { useState } from "react";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import formatProgramDate from "./DateFormatConvertor";

import { APPS_SCRIPT_URL } from "../../src/lib/SupaBase";

export default function ProgrammeRegistration() {

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    Program_Code: "",
    Program_Title: "",
    Program_Poster: "",
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

      // 2. Upload file to Google Drive using native fetch
      let driveFileUrl = formData.Program_Poster;

      if (selectedFile) {
        const fullBase64 = await convertToBase64(selectedFile);

        // Extract raw Base64 string
        const rawBase64 = fullBase64.split(",")[1];

        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            // 🚨 FIX: Removed subFolderName from headers. Only Content-Type belongs here!
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            file: rawBase64,
            subFolderName: formData.Category || "Uncategorized",
            filename: `${formData.Program_Code || "Poster"}_${selectedFile.name}`,
          })
        });

        // Parse the JSON returned by the Apps Script
        const responseData = await response.json();

        if (responseData && responseData.status === "success") {
          driveFileUrl = responseData.fileUrl;
        } else {
          throw new Error("Google Drive upload failed: " + (responseData.message || "Unknown Error"));
        }
      }

      const formatteddDate = formatProgramDate(formData.Date)
      // 3. Prepare payload for Supabase database insertion
      const payload = {
        ...formData,
        Program_Poster: driveFileUrl,
        WingName: actWing.WingCode,
        Date: formatteddDate
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
      alert("Program registered and poster uploaded successfully!");

      // 7. Reset Form completely
      setFormData({
        Program_Code: "",
        Program_Title: "",
        Program_Poster: "",
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
      setSelectedFile(null);

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

          {/* File Upload Field & Image Preview */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Upload Poster File
              </label>
              <input
                id="posterFileInput"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>

            {/* Image Preview */}
            <div className="flex items-center justify-center">
              {selectedFile ? (
                <div className="text-center">
                  <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Poster Preview</p>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Poster Preview"
                    className="h-32 w-auto max-w-full rounded-lg object-contain shadow-md border border-gray-200"
                  />
                </div>
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
                  No Poster Selected
                </div>
              )}
            </div>
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
              className={`w-full rounded-xl py-4 text-lg font-bold text-white transition ${isSubmitting
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
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