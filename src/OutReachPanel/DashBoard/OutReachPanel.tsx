import { NavLink, useNavigate, Outlet, useParams } from 'react-router-dom';
import SiteFooter from '../../PublicHome/SiteFooter';
import dhiuLogo from '../../ImgBox/Dhiu.jpg';
import {
  LayoutDashboard,
  Compass,
  Award,
  BarChart2,
  Lock,
  LogOut,
  User
} from 'lucide-react';

export default function OutReachPanel() {
  const { actOutReach } = useParams<{ actOutReach: string }>();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-xs font-semibold ${
      isActive
        ? "bg-purple-50 text-purple-700 font-bold border-l-4 border-purple-600 pl-3 shadow-xs"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 text-[10px] font-bold ${
      isActive
        ? "text-purple-600 font-black scale-105"
        : "text-slate-500 hover:text-slate-800"
    }`;

  const safeActOutReach = actOutReach ?? "";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* DESKTOP SIDEBAR (1025px+, Collapses on smaller screens) */}
      <aside className="hidden min-[1025px]:flex flex-col h-full w-64 bg-white border-r border-slate-200 shrink-0">
        
        {/* Brand Header with DHIU Official Logo */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              DHIU Outreach
            </span>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 truncate mt-1">
              Public Relations
            </h2>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Outreach Operations
          </p>

          <NavLink to={`/outreach-panel/${safeActOutReach}/dashboard`} className={navLinkClasses}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to={`/outreach-panel/${safeActOutReach}/create-outreach`} className={navLinkClasses}>
            <Compass size={16} className="text-cyan-600" />
            <span>Create OutReach</span>
          </NavLink>

          <NavLink to={`/outreach-panel/${safeActOutReach}/create-achievements`} className={navLinkClasses}>
            <Award size={16} className="text-amber-500" />
            <span>Create Achievement</span>
          </NavLink>

          <NavLink to={`/outreach-panel/${safeActOutReach}/outreach-anaylatics`} className={navLinkClasses}>
            <BarChart2 size={16} className="text-purple-600" />
            <span>OutReach Analytics</span>
          </NavLink>

          <div className="pt-3 border-t border-slate-100 my-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Account Management
            </p>

            <NavLink to={`/outreach-panel/${safeActOutReach}/profile`} className={navLinkClasses}>
              <User size={16} className="text-emerald-600" />
              <span>Update Profile</span>
            </NavLink>

            <NavLink to={`/outreach-panel/${safeActOutReach}/outreach-password`} className={navLinkClasses}>
              <Lock size={16} />
              <span>Security Password</span>
            </NavLink>
          </div>
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                OR
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-800 block truncate">{safeActOutReach}</span>
                <span className="text-[10px] text-slate-400 block">Outreach Officer</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 p-1 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">OutReach Portal</span>
              <span className="text-[10px] text-purple-600 font-semibold truncate block max-w-[170px]">
                {safeActOutReach || "Darul Huda"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to={`/outreach-panel/${safeActOutReach}/profile`}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
              title="Profile"
            >
              <User size={16} />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic Outlet Container (Safe padding pb-20) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-20 min-[1025px]:pb-0">
          <div className="flex-1 p-3 sm:p-6 md:p-8 w-full mx-auto max-w-7xl">
            <Outlet />
          </div>

          <div className="w-full mt-auto">
            <SiteFooter />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR: CLEAN WHITE BACKGROUND, DIRECT 5 TABS (NO (...) BUTTON) */}
        <nav className="min-[1025px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 flex items-center justify-around py-1.5 px-1 shadow-lg backdrop-blur-md">
          <NavLink
            to={`/outreach-panel/${safeActOutReach}/dashboard`}
            className={bottomBarLinkClasses}
          >
            <LayoutDashboard size={19} className="mb-0.5" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to={`/outreach-panel/${safeActOutReach}/create-outreach`}
            className={bottomBarLinkClasses}
          >
            <Compass size={19} className="mb-0.5 text-cyan-600" />
            <span>Outreach</span>
          </NavLink>

          <NavLink
            to={`/outreach-panel/${safeActOutReach}/create-achievements`}
            className={bottomBarLinkClasses}
          >
            <Award size={19} className="mb-0.5 text-amber-500" />
            <span>Honor</span>
          </NavLink>

          <NavLink
            to={`/outreach-panel/${safeActOutReach}/outreach-anaylatics`}
            className={bottomBarLinkClasses}
          >
            <BarChart2 size={19} className="mb-0.5 text-purple-600" />
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to={`/outreach-panel/${safeActOutReach}/profile`}
            className={bottomBarLinkClasses}
          >
            <User size={19} className="mb-0.5 text-emerald-600" />
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
