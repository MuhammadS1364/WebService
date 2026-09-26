import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase"; 

export default function UpdatePassword() {
  const { actWing, actTreasurer, actStn, actOutReach } = useParams<{
    actWing?: string;
    actTreasurer?: string;
    actStn?: string;
    actOutReach?: string;
  }>();

  // State management mapped to your exact schema
  const [userEmail, setUserEmail] = useState<string>("Loading...");
  const [currentPassword, setCurrentPassword] = useState<string>("********");
  const [newPassword, setNewPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });

  // Determine the current user identifier based on available URL parameters
  const activeUserId = actWing || actTreasurer || actStn || actOutReach;

  // Fetch current user details on mount
  useEffect(() => {
    if (!activeUserId) {
      setUserEmail("No user specified");
      return;
    }

    const fetchUserDetails = async () => {
      try {
        const { data, error } = await SupaBaseFunction
          .from('UserTable')
          .select('UserEmail, UserPassword')
          .eq('UserEmail', activeUserId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setUserEmail(data.UserEmail);
          setCurrentPassword(data.UserPassword);
        }
      } catch (error) {
        console.error("Failed to fetch user details", error);
        setUserEmail("Error loading user");
      }
    };

    fetchUserDetails();
  }, [activeUserId]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword.trim()) {
      setMessage({ type: "error", text: "New password cannot be empty." });
      return;
    }

    if (!activeUserId) {
      setMessage({ type: "error", text: "No user identified to update." });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await SupaBaseFunction
        .from('UserTable')
        .update({ UserPassword: newPassword })
        .eq('UserEmail', activeUserId);
      
      if (error) throw error;
      
      // Update local state to reflect success
      setCurrentPassword(newPassword);
      setNewPassword("");
      setMessage({ type: "success", text: "Password updated successfully!" });
    } catch (error: any) {
      console.error("Update error:", error);
      setMessage({ type: "error", text: error.message || "Failed to update password. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all">
        
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Security</h2>
          <p className="text-sm text-gray-500">
            View your current credentials and update your password below.
          </p>
        </div>

        {/* Current Credentials Section */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Current Email
            </label>
            <div className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border border-gray-200 truncate">
              {userEmail}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Current Password
            </label>
            <div className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border border-gray-200 truncate">
              {currentPassword} 
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label 
              htmlFor="new-password" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
              required
              minLength={3}
            />
          </div>

          {/* Status Messages */}
          {message.text && (
            <div
              className={`p-3 rounded-lg text-sm font-medium ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold transition-all duration-200 ${
              isSubmitting
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-[0.98]"
            }`}
          >
            {isSubmitting ? "Saving Changes..." : "Save New Password"}
          </button>
        </form>

      </div>
    </div>
  );
}