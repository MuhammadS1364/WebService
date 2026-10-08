import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useParams } from 'react-router-dom';
import SiteFooter from '../../PublicHome/SiteFooter';
import dhiuLogo from '../../ImgBox/Dhiu.jpg';
import SafeImage from '../../lib/SafeImage';
import { resolveWingProfile, type LoggedInWingProfile } from '../../lib/wingResolver';
import {
  LayoutDashboard,
  Calendar,
  Award,
  BarChart2,
  Lock,
  LogOut,
  User,
  PlusCircle,
  Trophy
} from 'lucide-react';

export default function WingPanel() {
  const { actWing } = useParams<{ actWing: string }>();
  const navigate = useNavigate();

  const [wing, setWing] = useState<LoggedInWingProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_wing_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let isMounted = true;
    const fetchWingData = async () => {
      try {
        const wingResult = await resolveWingProfile(actWing);
        if (wingResult && isMounted) {
          setWing(wingResult);
        }
      } catch (err) {
        console.error("Error loading wing profile in nav:", err);
      }
    };

    fetchWingData();

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<LoggedInWingProfile>;
      if (customEvent.detail && isMounted) {
        setWing(customEvent.detail);
      } else {
        fetchWingData();
      }
    };
    window.addEventListener("wing-profile-synced", handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("wing-profile-synced", handleProfileUpdate);
    };
  }, [actWing]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-xs font-semibold ${
      isActive
        ? "bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 pl-3 shadow-xs"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-xl transition-all duration-200 text-[9px] font-bold shrink-0 ${
      isActive
        ? "text-blue-600 font-black bg-blue-50/90 shadow-2xs"
        : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* DESKTOP SIDEBAR (Visible on 1025px+, Collapses on smaller screens) */}
      <aside className="hidden min-[1025px]:flex flex-col h-full w-64 bg-white border-r border-slate-200 shrink-0">
        
        {/* Brand Header with DHIU Official Logo */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              DHIU Wing
            </span>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 truncate mt-1">
              {wing?.WingTitle || actWing || "Wing Space"}
            </h2>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Wing Operations
          </p>

          <NavLink to={`/wing-panel/${actWing}/wing-dashboard`} className={navLinkClasses}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to={`/wing-panel/${actWing}/create-program`} className={navLinkClasses}>
            <PlusCircle size={16} className="text-indigo-600" />
            <span>Create Program</span>
          </NavLink>

          <NavLink to={`/wing-panel/${actWing}/create-result`} className={navLinkClasses}>
            <Trophy size={16} className="text-amber-500" />
            <span>Generate Results</span>
          </NavLink>

          <NavLink to={`/wing-panel/${actWing}/wing-programmes`} className={navLinkClasses}>
            <Calendar size={16} className="text-emerald-600" />
            <span>My Programmes</span>
          </NavLink>

          <NavLink to={`/wing-panel/${actWing}/wing-results`} className={navLinkClasses}>
            <Award size={16} className="text-purple-600" />
            <span>Published Results</span>
          </NavLink>

          <NavLink to={`/wing-panel/${actWing}/wing-anylatics`} className={navLinkClasses}>
            <BarChart2 size={16} className="text-blue-600" />
            <span>Wing Analytics</span>
          </NavLink>

          <div className="pt-3 border-t border-slate-100 my-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Settings & Identity
            </p>

            <NavLink to={`/wing-panel/${actWing}/profile`} className={navLinkClasses}>
              <User size={16} className="text-emerald-600" />
              <span>Update Profile & Logo</span>
            </NavLink>

            <NavLink to={`/wing-panel/${actWing}/wing-password`} className={navLinkClasses}>
              <Lock size={16} />
              <span>Security Password</span>
            </NavLink>
          </div>
        </nav>

        {/* User Card & Logout in Desktop Sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white border border-slate-200">
            <NavLink
              to={`/wing-panel/${actWing}/profile`}
              className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-85 transition"
              title="Wing Profile"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 bg-blue-50 shrink-0 flex items-center justify-center p-0.5">
                {wing?.wing_logo ? (
                  <SafeImage
                    src={wing.wing_logo}
                    alt={wing.WingTitle || "Wing"}
                    fallbackCategory="wing"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-bold text-xs text-blue-700">
                    {(wing?.WingTitle || actWing || "W")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="truncate min-w-0">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {wing?.WingTitle || actWing}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {wing?.WingCode ? `Code: ${wing.WingCode}` : "Wing Department"}
                </span>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-50">
        
        {/* MOBILE TOP HEADER (< 1025px, Clean White) */}
        <header className="min-[1025px]:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 p-1 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-sm tracking-tight block truncate">
                {wing?.WingTitle || "Wing Portal"}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold truncate block">
                {wing?.WingCode ? `Code: ${wing.WingCode}` : actWing || "Darul Huda"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to={`/wing-panel/${actWing}/profile`}
              className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 bg-blue-50 flex items-center justify-center p-0.5 shadow-xs"
              title="Profile"
            >
              {wing?.wing_logo ? (
                <SafeImage
                  src={wing.wing_logo}
                  alt="Wing"
                  fallbackCategory="wing"
                  className="w-full h-full object-contain"
                />
              ) : (
                <User size={16} className="text-slate-600" />
              )}
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic Outlet Container (Safe padding for bottom nav) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-36 min-[1025px]:pb-8">
          <div className="flex-1 p-3 sm:p-6 md:p-8 w-full mx-auto max-w-7xl">
            <Outlet />
          </div>

          <div className="h-10 min-[1025px]:hidden shrink-0" aria-hidden="true" />

          <div className="w-full mt-auto">
            <SiteFooter />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR: SHOWS ALL BUTTONS WITH SMOOTH HORIZONTAL SCROLL */}
        <nav className="min-[1025px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 flex items-center overflow-x-auto scrollbar-none py-1.5 px-1 shadow-lg backdrop-blur-md gap-1">
          <NavLink
            to={`/wing-panel/${actWing}/wing-dashboard`}
            className={bottomBarLinkClasses}
          >
            <LayoutDashboard size={17} className="mb-0.5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to={`/wing-panel/${actWing}/create-program`}
            className={bottomBarLinkClasses}
          >
            <PlusCircle size={17} className="mb-0.5 text-indigo-600" />
            <span>New Prog</span>
          </NavLink>

          <NavLink
            to={`/wing-panel/${actWing}/create-result`}
            className={bottomBarLinkClasses}
          >
            <Trophy size={17} className="mb-0.5 text-amber-500" />
            <span>Declare</span>
          </NavLink>

          <NavLink
            to={`/wing-panel/${actWing}/wing-results`}
            className={bottomBarLinkClasses}
          >
            <Award size={17} className="mb-0.5 text-purple-600" />
            <span>Results</span>
          </NavLink>

          <NavLink
            to={`/wing-panel/${actWing}/wing-programmes`}
            className={bottomBarLinkClasses}
          >
            <Calendar size={17} className="mb-0.5 text-emerald-600" />
            <span>Events</span>
          </NavLink>

          <NavLink
            to={`/wing-panel/${actWing}/wing-anylatics`}
            className={bottomBarLinkClasses}
          >
            <BarChart2 size={17} className="mb-0.5 text-blue-600" />
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to={`/wing-panel/${actWing}/profile`}
            className={bottomBarLinkClasses}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center mb-0.5">
              {wing?.wing_logo ? (
                <SafeImage
                  src={wing.wing_logo}
                  alt="Wing"
                  fallbackCategory="wing"
                  fallbackText={wing.WingTitle}
                  className="w-full h-full object-contain"
                />
              ) : (
                <User size={12} className="text-blue-600" />
              )}
            </div>
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
