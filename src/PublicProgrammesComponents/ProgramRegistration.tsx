// // // import { useState } from "react";
// // // import { SupaBaseFunction } from "../../src/lib/SupaBase";
// // // import formatProgramDate from "./DateFormatConvertor";
// // // import { APPS_SCRIPT_URL } from "../../src/lib/SupaBase";

// // // export default function ProgrammeRegistration() {
// // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // //   // Poster Upload States
// // //   const [uploadMethod, setUploadMethod] = useState("url"); // "url" | "file"
// // //   const [posterUrl, setPosterUrl] = useState("");
// // //   const [selectedFile, setSelectedFile] = useState<File | null>(null);
// // //   const [uploadError, setUploadError] = useState("");

// // //   const [formData, setFormData] = useState({
// // //     Program_Code: "",
// // //     Program_Title: "",
// // //     Category: "",
// // //     WingName: "",
// // //     Group: "",
// // //     Description: "",
// // //     OutComes: "",
// // //     Date: "",
// // //     Venue: "",
// // //     IsApproved: false,
// // //     IsResulted: false,
// // //     IsResultPublished: false,
// // //     AccademicYear: "",
// // //     Expected_Time: "",
// // //   });

// // //   // --- PREDEFINED LISTS ---
// // //   const wingOptions = [
// // //     "Islamic Enrichment Wing", "Campus Care", "Arts & Aesthetics",
// // //     "Organizing Board", "Out Reach Board", "Math & Science",
// // //     "Gk & Social Studies", "English Wing", "Arabic Wing",
// // //     "Urdu Wing", "English Debate", "Arabic Debate",
// // //     "Urdu Debate", "Media & It Cell"
// // //   ];

// // //   const groupOptions = [
// // //     "Pen Fight", "My-Opinion", "Shaping Future", "Tech-Nest",
// // //     "الاجتماع", "Assembly", "ClassicalSpace", "Tell Me More",
// // //     "صاحب القرآن", "جليس الفقه", "صاحب الترجمان", "Designing"
// // //   ];

// // //   const categoryOptions = [
// // //     "Bidaya", "Ula", "Thaniya", "Thanawiyya", "General(1-7)",
// // //     "UpU2toU4", "UpU4toU7", "UpU5ToU7", "ClassWise"
// // //   ];

// // //   const venueOptions = [
// // //     "Niics_Ground", "CHS-Confrence Hall", "Masjid", "ReadingRoom",
// // //     "Class U1", "Darul Hikma", "Computer Lab", "Other"
// // //   ];

// // //   const Expected_Time = [
// // //     'After Fazar-7:00Am', 'After 7:00Am-Befor Breakfast(9:00Am)', 'Breakfast(9:15AM)-10:00Am', '10:00AM-Till Zohar', 'After Zohar(1:45PM)-3:00PM', 'Befor Asar(4:05PM)-4:30PM', 'After Magirb-Ishaa', 'After Ishaa-10:20PM'
// // //   ]
// // //   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
// // //     const { name, value } = e.target;
// // //     setFormData((prev) => ({ ...prev, [name]: value }));
// // //   };

// // //   const convertToBase64 = (file: File): Promise<string> => {
// // //     return new Promise((resolve, reject) => {
// // //       const reader = new FileReader();
// // //       reader.readAsDataURL(file);
// // //       reader.onload = () => resolve(reader.result as string);
// // //       reader.onerror = (error) => reject(error);
// // //     });
// // //   };

// // //   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
// // //     e.preventDefault();
// // //     setIsSubmitting(true);
// // //     setUploadError("");

// // //     try {
// // //       // 1. Get Wing details from Supabase
// // //       const { data: actWing, error: checkError } = await SupaBaseFunction
// // //         .from("Chs-WingS")
// // //         .select("WingCode, WingTitle, WingEmail, Total_Registrations, Total_Points")
// // //         .eq("WingTitle", formData.WingName)
// // //         .maybeSingle();

// // //       if (checkError) throw checkError;

// // //       if (!actWing) {
// // //         throw new Error("Wing not found. Please ensure you have selected a valid wing.");
// // //       }

// // //       // 2. Upload File or Use URL
// // //       let driveFileUrl = "";

// // //       if (uploadMethod === "url") {
// // //         driveFileUrl = posterUrl;
// // //       } else if (uploadMethod === "file" && selectedFile) {
// // //         try {
// // //           const fullBase64 = await convertToBase64(selectedFile);
// // //           const rawBase64 = fullBase64.split(",")[1];

// // //           const response = await fetch(APPS_SCRIPT_URL, {
// // //             method: "POST",
// // //             headers: {
// // //               "Content-Type": "text/plain;charset=utf-8"
// // //             },
// // //             body: JSON.stringify({
// // //               file: rawBase64,
// // //               subFolderName: formData.Category || "Uncategorized",
// // //               filename: `${formData.Program_Code || "Poster"}_${selectedFile.name}`,
// // //             })
// // //           });

// // //           const responseData = await response.json();

// // //           if (responseData && responseData.status === "success") {
// // //             driveFileUrl = responseData.fileUrl;
// // //           } else {
// // //             throw new Error("Google Drive upload failed: " + (responseData.message || "Unknown Error"));
// // //           }
// // //         } catch (uploadFailError) {
// // //           console.error("Upload process failed:", uploadFailError);
// // //           setUploadError("⚠️ Image upload failed. Please switch to the 'Image URL' option above to continue.");
// // //           setIsSubmitting(false);
// // //           return;
// // //         }
// // //       }

// // //       const formatteddDate = formatProgramDate(formData.Date);

// // //       // 3. Prepare payload for Supabase database insertion
// // //       // Remove WingName so we don't try to push it to the database
// // //       const { WingName, ...restOfFormData } = formData;

// // //       const payload = {
// // //         ...restOfFormData,
// // //         Program_Poster: driveFileUrl,
// // //         WingCode: actWing.WingCode, // Use WingCode to match the schema
// // //         Date: formatteddDate,

// // //       };


// // //       // 4. Insert programme data row
// // //       const { error } = await SupaBaseFunction
// // //         .from("ProgrammesBox")
// // //         .insert([payload]);

// // //       if (error) throw error;

// // //       // 5. Increment wing metrics points
// // //       const { error: updateError } = await SupaBaseFunction
// // //         .from("Chs-WingS")
// // //         .update({
// // //           Total_Points: (actWing.Total_Points || 0) + 1,
// // //           Total_Registrations: (actWing.Total_Registrations || 0) + 1
// // //         })
// // //         .eq("WingCode", actWing.WingCode);

// // //       if (updateError) throw updateError;

// // //       // 6. Success Feedback
// // //       alert("Program registered successfully!");

// // //       // 7. Reset Form completely
// // //       setFormData({
// // //         Program_Code: "",
// // //         Program_Title: "",
// // //         Category: "",
// // //         WingName: "",
// // //         Group: "",
// // //         Description: "",
// // //         OutComes: "",
// // //         Date: "",
// // //         Venue: "",
// // //         IsApproved: false,
// // //         IsResulted: false,
// // //         IsResultPublished: false,
// // //         AccademicYear: "",
// // //         Expected_Time: "",
// // //       });
// // //       setPosterUrl("");
// // //       setSelectedFile(null);
// // //       setUploadError("");

// // //       const fileInput = document.getElementById("posterFileInput") as HTMLInputElement;
// // //       if (fileInput) fileInput.value = "";

// // //     } catch (err: any) {
// // //       console.error("Submit error:", err.message);
// // //       alert(`Error: ${err.message}`);
// // //     } finally {
// // //       setIsSubmitting(false);
// // //     }
// // //   };

// // //   return (
// // //     <div className="mx-auto max-w-4xl p-6">
// // //       <div className="rounded-2xl bg-white p-8 shadow-xl">
// // //         <h2 className="mb-6 text-3xl font-bold text-gray-800">
// // //           Register New Program
// // //         </h2>

// // //         <form onSubmit={handleSubmit} className="space-y-6">
// // //           {/* Top Grid: Basic Info */}
// // //           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Program Code <span className="text-red-500">*</span>
// // //               </label>
// // //               <input
// // //                 type="text"
// // //                 name="Program_Code"
// // //                 required
// // //                 value={formData.Program_Code}
// // //                 onChange={handleChange}
// // //                 placeholder="e.g. PRG-2024-001"
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
// // //               />
// // //             </div>

// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Program Title <span className="text-red-500">*</span>
// // //               </label>
// // //               <input
// // //                 type="text"
// // //                 name="Program_Title"
// // //                 required
// // //                 value={formData.Program_Title}
// // //                 onChange={handleChange}
// // //                 placeholder="Enter program title"
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
// // //               />
// // //             </div>
// // //           </div>

// // //           {/* Middle Grid: Dropdown Categories & Tags */}
// // //           <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Category <span className="text-red-500">*</span>
// // //               </label>
// // //               <select
// // //                 name="Category"
// // //                 required
// // //                 value={formData.Category}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
// // //               >
// // //                 <option value="" disabled>Select Category</option>
// // //                 {categoryOptions.map((cat, idx) => (
// // //                   <option key={idx} value={cat}>{cat}</option>
// // //                 ))}
// // //               </select>
// // //             </div>

// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Wing Name <span className="text-red-500">*</span>
// // //               </label>
// // //               <select
// // //                 name="WingName"
// // //                 required
// // //                 value={formData.WingName}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
// // //               >
// // //                 <option value="" disabled>Select Wing</option>
// // //                 {wingOptions.map((wing, idx) => (
// // //                   <option key={idx} value={wing}>{wing}</option>
// // //                 ))}
// // //               </select>
// // //             </div>

// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Group <span className="text-red-500">*</span>
// // //               </label>
// // //               <select
// // //                 name="Group"
// // //                 required
// // //                 value={formData.Group}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
// // //               >
// // //                 <option value="" disabled>Select Group</option>
// // //                 {groupOptions.map((group, idx) => (
// // //                   <option key={idx} value={group}>{group}</option>
// // //                 ))}
// // //               </select>
// // //             </div>
// // //           </div>

// // //           {/* Venue Info */}
// // //           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">


// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Venue <span className="text-red-500">*</span>
// // //               </label>
// // //               <select
// // //                 name="Venue"
// // //                 required
// // //                 value={formData.Venue}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
// // //               >
// // //                 <option value="" disabled>Select Venue</option>
// // //                 {venueOptions.map((venue, idx) => (
// // //                   <option key={idx} value={venue}>{venue}</option>
// // //                 ))}
// // //               </select>
// // //             </div>

// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Academic Year <span className="text-red-500">*</span>
// // //               </label>
// // //               <input
// // //                 type="text"
// // //                 name="AccademicYear"
// // //                 required
// // //                 placeholder="Example 2026-27"
// // //                 value={formData.AccademicYear}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
// // //               />
// // //             </div>

// // //           </div>

// // //           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Date <span className="text-red-500">*</span>
// // //               </label>
// // //               <input
// // //                 type="date"
// // //                 name="Date"
// // //                 required
// // //                 value={formData.Date}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
// // //               />
// // //             </div>
// // //             <div>
// // //               <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //                 Expected Time <span className="text-red-500">*</span>
// // //               </label>
// // //               <select
// // //                 name="Expected_Time"
// // //                 required
// // //                 value={formData.Expected_Time}
// // //                 onChange={handleChange}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
// // //               >
// // //                 <option value="" disabled>Select Expected_Time</option>
// // //                 {Expected_Time.map((time, idx) => (
// // //                   <option key={idx} value={time}>{time}</option>
// // //                 ))}
// // //               </select>
// // //             </div>


// // //           </div>

// // //           {/* Poster Upload/URL Section */}
// // //           <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
// // //             <label className="mb-3 block text-sm font-semibold text-gray-700">
// // //               Program Poster
// // //             </label>

// // //             <div className="flex gap-4 mb-4">
// // //               <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
// // //                 <input
// // //                   type="radio"
// // //                   name="uploadMethod"
// // //                   value="url"
// // //                   checked={uploadMethod === "url"}
// // //                   onChange={() => {
// // //                     setUploadMethod("url");
// // //                     setUploadError(""); // Clear errors on switch
// // //                   }}
// // //                   className="text-blue-600 focus:ring-blue-500"
// // //                 />
// // //                 Image URL
// // //               </label>
// // //               <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
// // //                 <input
// // //                   type="radio"
// // //                   name="uploadMethod"
// // //                   value="file"
// // //                   checked={uploadMethod === "file"}
// // //                   onChange={() => {
// // //                     setUploadMethod("file");
// // //                     setUploadError(""); // Clear errors on switch
// // //                   }}
// // //                   className="text-blue-600 focus:ring-blue-500"
// // //                 />
// // //                 Upload Image File
// // //               </label>
// // //             </div>

// // //             {uploadMethod === "url" ? (
// // //               <input
// // //                 type="url"
// // //                 placeholder="https://example.com/poster.jpg"
// // //                 value={posterUrl}
// // //                 onChange={(e) => setPosterUrl(e.target.value)}
// // //                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
// // //               />
// // //             ) : (
// // //               <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
// // //                 <div className="flex flex-col gap-2">
// // //                   <input
// // //                     id="posterFileInput"
// // //                     type="file"
// // //                     accept="image/*"
// // //                     onChange={(e) => {
// // //                       const file = e.target.files?.[0] || null;
// // //                       setSelectedFile(file);
// // //                       setUploadError(""); // Reset error when user picks a new file
// // //                     }}
// // //                     className="w-full rounded-lg border border-gray-300 p-2.5 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
// // //                   />
// // //                   {uploadError && (
// // //                     <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
// // //                       {uploadError}
// // //                     </div>
// // //                   )}
// // //                 </div>

// // //                 {/* Image Preview */}
// // //                 <div className="flex items-center justify-center">
// // //                   {selectedFile ? (
// // //                     <div className="text-center">
// // //                       <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</p>
// // //                       <img
// // //                         src={URL.createObjectURL(selectedFile)}
// // //                         alt="Poster Preview"
// // //                         className="h-32 w-auto max-w-full rounded-lg object-contain shadow-md border border-gray-200 bg-white"
// // //                       />
// // //                     </div>
// // //                   ) : (
// // //                     <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm text-gray-400">
// // //                       No Poster Selected
// // //                     </div>
// // //                   )}
// // //                 </div>
// // //               </div>
// // //             )}
// // //           </div>

// // //           {/* Textareas */}
// // //           <div>
// // //             <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //               Description
// // //             </label>
// // //             <textarea
// // //               name="Description"
// // //               rows={3}
// // //               value={formData.Description}
// // //               onChange={handleChange}
// // //               placeholder="What is this program about?"
// // //               className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
// // //             ></textarea>
// // //           </div>

// // //           <div>
// // //             <label className="mb-2 block text-sm font-semibold text-gray-700">
// // //               Expected Outcomes
// // //             </label>
// // //             <textarea
// // //               name="OutComes"
// // //               rows={2}
// // //               value={formData.OutComes}
// // //               onChange={handleChange}
// // //               placeholder="What will participants achieve?"
// // //               className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
// // //             ></textarea>
// // //           </div>

// // //           {/* Submit Button */}
// // //           <div className="pt-4">
// // //             <button
// // //               type="submit"
// // //               disabled={isSubmitting}
// // //               className={`w-full rounded-xl py-4 text-lg font-bold text-white transition shadow-lg ${isSubmitting
// // //                 ? "cursor-not-allowed bg-blue-400 shadow-none"
// // //                 : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/20"
// // //                 }`}
// // //             >
// // //               {isSubmitting ? "Registering & Uploading..." : "Register Program"}
// // //             </button>
// // //           </div>
// // //         </form>
// // //       </div>
// // //     </div>
// // //   );
// // // }



// import { useState } from "react";
// import { SupaBaseFunction } from "../../src/lib/SupaBase";
// import formatProgramDate from "./DateFormatConvertor";

// // Ensure APPS_SCRIPT_URL is defined or imported
// const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// export default function ProgrammeRegistration() {
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [uploadMethod, setUploadMethod] = useState("url");
//   const [posterUrl, setPosterUrl] = useState("");
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [uploadError, setUploadError] = useState("");

//   const [formData, setFormData] = useState({
//     Program_Code: "", Program_Title: "", Category: "", WingName: "", Group: "",
//     Description: "", OutComes: "", Date: "", Venue: "", AccademicYear: "", Expected_Time: "",
//     IsApproved: false, IsResultPublished: false
//   });

//   const wingOptions = [
//     "Islamic Enrichment Wing", "Campus Care", "Arts & Aesthetics",
//     "Organizing Board", "Out Reach Board", "Math & Science",
//     "Gk & Social Studies", "English Wing", "Arabic Wing",
//     "Urdu Wing", "English Debate", "Arabic Debate",
//     "Urdu Debate", "Media & It Cell", "Core Committee"
//   ];

//   const groupOptions = [
//     "Pen Fight", "My-Opinion", "Shaping Future", "Tech-Nest",
//     "الاجتماع", "Assembly", "ClassicalSpace", "Tell Me More",
//     "صاحب القرآن", "جليس الفقه", "صاحب الترجمان", "Designing"
//   ];

//   const categoryOptions = [
//     "Bidaya", "Ula", "Thaniya", "Thanawiyya", "General(1-7)",
//     "UpU2toU4", "UpU4toU7", "UpU5ToU7", "ClassWise"
//   ];

//   const venueOptions = [
//     "Niics_Ground", "CHS-Confrence Hall", "Masjid", "ReadingRoom",
//     "Class U1", "Darul Hikma", "Computer Lab", "Other"
//   ];

//   const Expected_Time = [
//     'After Fazar-7:00Am', 'After 7:00Am-Befor Breakfast(9:00Am)', 'Breakfast(9:15AM)-10:00Am', '10:00AM-Till Zohar', 'After Zohar(1:45PM)-3:00PM', 'Befor Asar(4:05PM)-4:30PM', 'After Magirb-Ishaa', 'After Ishaa-10:20PM'
//   ];

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const convertToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => resolve(reader.result as string);
//       reader.onerror = (error) => reject(error);
//     });
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     setUploadError("");

//     // FIX: Properly declare the variable within this scope
//     let driveFileUrl = "";

//     try {
//       const { data: actWing, error: wingError } = await SupaBaseFunction
//         .from("Chs-WingS")
//         .select("WingCode, Total_Registrations, Total_Points")
//         .eq("WingTitle", formData.WingName)
//         .maybeSingle();

//       if (wingError || !actWing) throw new Error("Wing configuration not found.");

//       const formattedDate = formatProgramDate(formData.Date);

//       // Handle Image URL or File Upload
//       if (uploadMethod === "url") {
//         driveFileUrl = posterUrl;
//       } else if (uploadMethod === "file" && selectedFile) {
//         try {
//           const fullBase64 = await convertToBase64(selectedFile);
//           const rawBase64 = fullBase64.split(",")[1];

//           const response = await fetch(APPS_SCRIPT_URL, {
//             method: "POST",
//             body: JSON.stringify({
//               file: rawBase64,
//               subFolderName: formData.Category || "Uncategorized",
//               filename: `${formData.Program_Code || "Poster"}_${selectedFile.name}`,
//             })
//           });

//           const responseData = await response.json();
//           if (responseData?.status === "success") {
//             driveFileUrl = responseData.fileUrl;
//           } else {
//             throw new Error("Google Drive upload failed.");
//           }
//         } catch (uploadFailError) {
//           setUploadError("⚠️ Image upload failed. Please check your connection.");
//           setIsSubmitting(false);
//           return;
//         }
//       }

//       // Validations
//       const { data: dayProgs, error: dayErr } = await SupaBaseFunction
//         .from("ProgrammesBox")
//         .select("Program_Code")
//         .eq("Date", formattedDate);
//       if (dayErr) throw dayErr;
//       if (dayProgs && dayProgs.length >= 6) throw new Error("Daily limit of 6 programs reached.");

//       const { data: wingProgs, error: wErr } = await SupaBaseFunction
//         .from("ProgrammesBox")
//         .select("Program_Code")
//         .eq("Date", formattedDate)
//         .eq("WingCode", actWing.WingCode);
//       if (wErr) throw wErr;
//       if (wingProgs && wingProgs.length >= 3) throw new Error("Your wing has reached the daily limit.");

//       // Final Insert
//       const { WingName, ...payloadData } = formData;
//       await SupaBaseFunction.from("ProgrammesBox").insert([{
//         ...payloadData,
//         WingCode: actWing.WingCode,
//         Date: formattedDate,
//         Program_Poster: driveFileUrl, // Now correctly defined
//       }]);

//       await SupaBaseFunction.from("Chs-WingS").update({
//         Total_Points: (actWing.Total_Points || 0) + 1,
//         Total_Registrations: (actWing.Total_Registrations || 0) + 1
//       }).eq("WingCode", actWing.WingCode);

//       alert("Program registered successfully!");
//       // Reset form here if needed
//       setFormData({
//         Program_Code: "",
//         Program_Title: "",
//         Category: "",
//         WingName: "",
//         Group: "",
//         Description: "",
//         OutComes: "",
//         Date: "",
//         Venue: "",
//         IsApproved: false,
//         IsResultPublished: false,
//         AccademicYear: "",
//         Expected_Time: "",
//       });
//       setPosterUrl("");
//       setSelectedFile(null);
//       setUploadError("")
//       const fileInput = document.getElementById("posterFileInput") as HTMLInputElement;
//       if (fileInput) fileInput.value = "";

//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     // ... rest of your JSX remains the same
//     <div className="mx-auto max-w-4xl p-6">

//       <div className="rounded-2xl bg-white p-8 shadow-xl">
//         <h2 className="mb-6 text-3xl font-bold text-gray-800">
//           Register New Program
//         </h2>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {/* Top Grid: Basic Info */}
//           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Program Code <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 name="Program_Code"
//                 required
//                 value={formData.Program_Code}
//                 onChange={handleChange}
//                 placeholder="e.g. PRG-2024-001"
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
//               />
//             </div>

//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Program Title <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 name="Program_Title"
//                 required
//                 value={formData.Program_Title}
//                 onChange={handleChange}
//                 placeholder="Enter program title"
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
//               />
//             </div>
//           </div>

//           {/* Middle Grid: Dropdown Categories & Tags */}
//           <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Category <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="Category"
//                 required
//                 value={formData.Category}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
//               >
//                 <option value="" disabled>Select Category</option>
//                 {categoryOptions.map((cat, idx) => (
//                   <option key={idx} value={cat}>{cat}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Wing Name <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="WingName"
//                 required
//                 value={formData.WingName}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
//               >
//                 <option value="" disabled>Select Wing</option>
//                 {wingOptions.map((wing, idx) => (
//                   <option key={idx} value={wing}>{wing}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Group <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="Group"
//                 required
//                 value={formData.Group}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
//               >
//                 <option value="" disabled>Select Group</option>
//                 {groupOptions.map((group, idx) => (
//                   <option key={idx} value={group}>{group}</option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           {/* Venue Info */}
//           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">


//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Venue <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="Venue"
//                 required
//                 value={formData.Venue}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
//               >
//                 <option value="" disabled>Select Venue</option>
//                 {venueOptions.map((venue, idx) => (
//                   <option key={idx} value={venue}>{venue}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Academic Year <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 name="AccademicYear"
//                 required
//                 placeholder="Example 2026-27"
//                 value={formData.AccademicYear}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
//               />
//             </div>

//           </div>

//           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Date <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="date"
//                 name="Date"
//                 required
//                 value={formData.Date}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
//               />
//             </div>
//             <div>
//               <label className="mb-2 block text-sm font-semibold text-gray-700">
//                 Expected Time <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="Expected_Time"
//                 required
//                 value={formData.Expected_Time}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
//               >
//                 <option value="" disabled>Select Expected_Time</option>
//                 {Expected_Time.map((time, idx) => (
//                   <option key={idx} value={time}>{time}</option>
//                 ))}
//               </select>
//             </div>


//           </div>

//           {/* Poster Upload/URL Section */}
//           <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
//             <label className="mb-3 block text-sm font-semibold text-gray-700">
//               Program Poster
//             </label>

//             <div className="flex gap-4 mb-4">
//               <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
//                 <input
//                   type="radio"
//                   name="uploadMethod"
//                   value="url"
//                   checked={uploadMethod === "url"}
//                   onChange={() => {
//                     setUploadMethod("url");
//                     setUploadError(""); // Clear errors on switch
//                   }}
//                   className="text-blue-600 focus:ring-blue-500"
//                 />
//                 Image URL
//               </label>
//               <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
//                 <input
//                   type="radio"
//                   name="uploadMethod"
//                   value="file"
//                   checked={uploadMethod === "file"}
//                   onChange={() => {
//                     setUploadMethod("file");
//                     setUploadError(""); // Clear errors on switch
//                   }}
//                   className="text-blue-600 focus:ring-blue-500"
//                 />
//                 Upload Image File
//               </label>
//             </div>

//             {uploadMethod === "url" ? (
//               <input
//                 type="url"
//                 placeholder="https://example.com/poster.jpg"
//                 value={posterUrl}
//                 onChange={(e) => setPosterUrl(e.target.value)}
//                 className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
//               />
//             ) : (
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
//                 <div className="flex flex-col gap-2">
//                   <input
//                     id="posterFileInput"
//                     type="file"
//                     accept="image/*"
//                     onChange={(e) => {
//                       const file = e.target.files?.[0] || null;
//                       setSelectedFile(file);
//                       setUploadError(""); // Reset error when user picks a new file
//                     }}
//                     className="w-full rounded-lg border border-gray-300 p-2.5 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
//                   />
//                   {uploadError && (
//                     <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
//                       {uploadError}
//                     </div>
//                   )}
//                 </div>

//                 {/* Image Preview */}
//                 <div className="flex items-center justify-center">
//                   {selectedFile ? (
//                     <div className="text-center">
//                       <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</p>
//                       <img
//                         src={URL.createObjectURL(selectedFile)}
//                         alt="Poster Preview"
//                         className="h-32 w-auto max-w-full rounded-lg object-contain shadow-md border border-gray-200 bg-white"
//                       />
//                     </div>
//                   ) : (
//                     <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm text-gray-400">
//                       No Poster Selected
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Textareas */}
//           <div>
//             <label className="mb-2 block text-sm font-semibold text-gray-700">
//               Description
//             </label>
//             <textarea
//               name="Description"
//               rows={3}
//               value={formData.Description}
//               onChange={handleChange}
//               placeholder="What is this program about?"
//               className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
//             ></textarea>
//           </div>

//           <div>
//             <label className="mb-2 block text-sm font-semibold text-gray-700">
//               Expected Outcomes
//             </label>
//             <textarea
//               name="OutComes"
//               rows={2}
//               value={formData.OutComes}
//               onChange={handleChange}
//               placeholder="What will participants achieve?"
//               className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
//             ></textarea>
//           </div>

//           {/* Submit Button */}
//           <div className="pt-4">
//             <button
//               type="submit"
//               disabled={isSubmitting}
//               className={`w-full rounded-xl py-4 text-lg font-bold text-white transition shadow-lg ${isSubmitting
//                 ? "cursor-not-allowed bg-blue-400 shadow-none"
//                 : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/20"
//                 }`}
//             >
//               {isSubmitting ? "Registering & Uploading..." : "Register Program"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>

//   );
// }

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // Imported useParams
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

  // Extract user email/identifier from the URL
  const { actUser, actWing } = useParams();
  const loggedInEmail = actUser || actWing;

  const [formData, setFormData] = useState({
    Program_Code: "", Program_Title: "", Category: "", WingName: "", Group: "",
    Description: "", OutComes: "", Date: "", Venue: "", AccademicYear: "", Expected_Time: "",
    IsApproved: false, IsResultPublished: false, Collaborators: "",
  });

  const wingOptions = [
    "Islamic Enrichment Wing", "Campus Care", "Arts & Aesthetics",
    "Organizing Board", "Out Reach Board", "Math & Science",
    "Gk & Social Studies", "English Wing", "Arabic Wing",
    "Urdu Wing", "English Debate", "Arabic Debate",
    "Urdu Debate", "Media & It Cell", "Core Committee"
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

  const Expected_Time = [
    'After Fazar-7:00Am', 'After 7:00Am-Befor Breakfast(9:00Am)', 'Breakfast(9:15AM)-10:00Am', '10:00AM-Till Zohar', 'After Zohar(1:45PM)-3:00PM', 'Befor Asar(4:05PM)-4:30PM', 'After Magirb-Ishaa', 'After Ishaa-10:20PM'
  ];
  const Collaborators = [
    'ShaadMate(24rd Batch)', 'Afnan Friends(24rd Batch)', 'Al Misbah Friends(24rd Batch)', 'Saba Friend(24rd Batch)', 'Sidra Friends(24rd Batch)', 'Wahda Friend(24rd Batch)', 'Falah Friends(24rd Batch)'
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

        // 1. Fetch the user's role from your custom UserTable
        const { data: userData, error: userError } = await SupaBaseFunction
          .from("UserTable")
          .select("UserRole")
          .eq("UserEmail", loggedInEmail)
          .maybeSingle();

        //  two role checking : Admin, Wing
        if (userError) {
          console.error("Error verifying user in UserTable:", userError);
        }

        // 2. Check if this user's email is assigned to any Wing
        const { data: wingData, error: wingError } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingTitle, WingUserId")
          .eq("WingUserId", loggedInEmail)
          .maybeSingle();

        if (wingError) {
          console.error("Error verifying user in Chs-WingS:", wingError);
        }

        // --- FIXED PRIORITY LOGIC ---
        // Added "?." to safely check if userData exists to prevent crashes
        const isRoleAdmin = userData?.UserRole === 'Admin';

        if (isRoleAdmin) {
          // 1st Priority: They are an admin. Give full dropdown access.
          setIsAdmin(true);

          // Optional: If they are an admin but also happen to head a wing, pre-fill it, 
          // but leave the dropdown unlocked so they can change it.
          if (wingData && wingData.WingTitle) {
            setFormData((prev) => ({ ...prev, WingName: wingData.WingTitle }));
          }
        } else if (wingData && wingData.WingTitle) {
          // 2nd Priority: Not an admin, but assigned to a wing. Lock them to this wing.
          setIsAdmin(false);
          setFormData((prev) => ({ ...prev, WingName: wingData.WingTitle }));
        } else {
          // 3rd Priority: Fallback: Not an admin, and no wing found
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

  // change
  // Optimized handleSubmit within your component
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadError("");

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

      // 3. Prepare Payload (Map explicitly to DB column names)
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
        Collaborator: formData.Collaborators, // Fixed: Maps to DB Column
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

      alert("Program registered successfully!");
      // ... reset form logic
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isLoadingRole) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg font-semibold text-gray-600 animate-pulse">
          Verifying user permissions...
        </div>
      </div>
    );
  }

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
                disabled={!isAdmin}
                className={`w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'
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
                <option value="" disabled>Select Expected_Time</option>
                {Expected_Time.map((time, idx) => (
                  <option key={idx} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Collaborator<span className="text-red-500">(Optional)</span>
              </label>
              <select
                name="Collaborators"
                value={formData.Collaborators}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
              >
                <option value="" disabled>Select Collaborators</option>
                {Collaborators.map((time, idx) => (
                  <option key={idx} value={time}>{time}</option>
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
              className={`w-full rounded-xl py-4 text-lg font-bold text-white transition shadow-lg ${isSubmitting
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



