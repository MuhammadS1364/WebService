import React, { useState, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { 
  Building2, 
  CreditCard, 
  Smartphone, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon,
  Power
} from "lucide-react";

export default function CreateBankDetails() {
  const [formData, setFormData] = useState({
    Bank_Holde_Name: "",
    Account_Number: "",
    UPi_Number: "",
    IsActive: false,
  });

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = () => {
    setFormData((prev) => ({ ...prev, IsActive: !prev.IsActive }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setFeedback({ type: "error", text: "Please upload a valid image file (PNG, JPG)." });
        return;
      }
      setQrFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFeedback({ type: "", text: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!qrFile) {
      setFeedback({ type: "error", text: "Please upload a QR Code image." });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Upload Image to Supabase Bucket ('QrImgBox')
      const fileExt = qrFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const {  error: uploadError } = await SupaBaseFunction.storage
        .from("QrImgBox")
        .upload(filePath, qrFile);

      if (uploadError) throw new Error(`Image Upload Failed: ${uploadError.message}`);

      // Optional: Get the public URL if you prefer storing the full URL instead of the path
      const { data: publicUrlData } = SupaBaseFunction.storage
        .from("QrImgBox")
        .getPublicUrl(filePath);

      // 2. Insert Record into 'BanksDetails' Table
      const deatiId = crypto.randomUUID(); // Generate unique ID

      const { error: insertError } = await SupaBaseFunction
        .from("BanksDetails")
        .insert([
          {
            Deati_id: deatiId,
            Bank_Holde_Name: formData.Bank_Holde_Name,
            Account_Number: formData.Account_Number,
            UPi_Number: formData.UPi_Number,
            PaY_Qr_Photo: publicUrlData.publicUrl, // Or use uploadData.path based on your preference
            IsActive: formData.IsActive,
          },
        ]);

      if (insertError) {
        // If the table insert fails, you might want to delete the uploaded image here to prevent orphan files
        throw new Error(insertError.message);
      }

      setFeedback({
        type: "success",
        text: "✨ Bank configuration created successfully!",
      });

      // Reset Form
      setFormData({ Bank_Holde_Name: "", Account_Number: "", UPi_Number: "", IsActive: false });
      setQrFile(null);
      setPreviewUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "An error occurred during submission." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Add Bank Configuration</h2>
        <p className="text-slate-500 mt-2">
          Set up a new receiving account and QR code for processing donations.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {feedback.text && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
              <p className="text-sm font-medium leading-relaxed">{feedback.text}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* LEFT SIDE: Text Inputs & Toggle */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Bank Holder Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" /> Account Holder Name
                  </label>
                  <input
                    type="text"
                    name="Bank_Holde_Name"
                    required
                    value={formData.Bank_Holde_Name}
                    onChange={handleInputChange}
                    placeholder="Must be unique"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-400" /> Account Number
                  </label>
                  <input
                    type="text"
                    name="Account_Number"
                    required
                    value={formData.Account_Number}
                    onChange={handleInputChange}
                    placeholder="e.g. 9508095318"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                  />
                </div>

                {/* UPI Number */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-slate-400" /> UPI Number / ID
                  </label>
                  <input
                    type="text"
                    name="UPi_Number"
                    required
                    value={formData.UPi_Number}
                    onChange={handleInputChange}
                    placeholder="phone@upi"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Power className={`w-4 h-4 ${formData.IsActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                    Set as Active Form
                  </span>
                  <span className="text-xs text-slate-500">Display this account to users.</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggle}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    formData.IsActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      formData.IsActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: QR Code File Upload */}
            <div className="space-y-1.5 h-full flex flex-col">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-slate-400" /> Payment QR Code
              </label>
              
              <div 
                className={`flex-1 min-h-[250px] relative rounded-xl border-2 border-dashed transition-all group overflow-hidden ${
                  previewUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {previewUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <img src={previewUrl} alt="QR Preview" className="w-48 h-48 object-contain rounded-lg shadow-sm bg-white p-2" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white text-slate-800 text-sm font-semibold px-4 py-2 rounded-full shadow-lg">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 pointer-events-none">
                    <div className="w-14 h-14 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Click or drag image to upload</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              onClick={() => {
                setFormData({ Bank_Holde_Name: "", Account_Number: "", UPi_Number: "", IsActive: false });
                setQrFile(null);
                setPreviewUrl("");
              }}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold py-2.5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Bank Details"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}