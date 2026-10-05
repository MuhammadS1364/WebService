import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveWingProfile, type LoggedInWingProfile } from "../../lib/wingResolver";

export default function WingDashboard() {
  const { actWing } = useParams<{ actWing: string }>();

  const [wingData, setWingData] = useState<LoggedInWingProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_wing_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(!localStorage.getItem("cached_wing_profile"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWingAndProgrammes = async (silent = false) => {
      if (!silent && !wingData) {
        setLoading(true);
      }
      setError(null);
      try {
        const wingResult = await resolveWingProfile(actWing);
        if (!wingResult) throw new Error("Wing portal configuration not found.");

        if (isMounted) {
          setWingData(wingResult);
        }

        // Fetch programmes using updated ProgrammesBox schema
        const { data: programmesResult, error: progError } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*")
          .eq("WingCode", wingResult.WingCode)
          .order("Date", { ascending: false });

        if (progError) throw progError;
        if (isMounted) {
          setProgrammes(programmesResult || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load wing dashboard.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWingAndProgrammes(Boolean(wingData));

    const handleProfileUpdate = () => {
      fetchWingAndProgrammes(true);
    };
    window.addEventListener("wing-profile-synced", handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("wing-profile-synced", handleProfileUpdate);
    };
  }, [actWing]);

  // Derived metrics matching updated ProgrammesBox table columns
  const totalPrograms = programmes.length;
  const totalRegistration = programmes.reduce((sum, p) => sum + (p.Total_Registration || 0), 0);
  const totalResulted = programmes.filter(p => p.IsResultPublished === true || p.IsResulted === true).length;
  const totalConducted = programmes.filter(p => p.IsConducted === true).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading wing dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-3xl p-6 text-center text-red-600 space-y-2">
        <p className="font-bold text-base">Wing Access Error</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6 pb-28 font-sans">
      <ActiveUserCard
        Panel="Wing Operations"
        UserName={wingData?.WingTitle || "Wing Space"}
        userPhoto={wingData?.wing_logo}
        roleType="wing"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Program */}
        <OverViewClipBox
          BoxTitle="Total Programs"
          BoxValue={totalPrograms}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-600">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          }
        />

        {/* Total Registration */}
        <OverViewClipBox
          BoxTitle="Total Registrations"
          BoxValue={totalRegistration}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />

        {/* Total Resulted */}
        <OverViewClipBox
          BoxTitle="Results Published"
          BoxValue={totalResulted}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />

        {/* Total Conducted */}
        <OverViewClipBox
          BoxTitle="Conducted Events"
          BoxValue={totalConducted}
          BoxSvgLogo={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      <div className="w-full">
        <ProgrammesCalendar />
      </div>
    </div>
  );
}
