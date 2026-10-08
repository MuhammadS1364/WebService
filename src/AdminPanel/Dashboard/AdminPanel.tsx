import { useState } from 'react';
import { NavLink, useNavigate, Outlet, useParams, useLocation } from 'react-router-dom';
import SiteFooter from '../../PublicHome/SiteFooter';
import dhiuLogo from '../../ImgBox/Dhiu.jpg';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  TrendingUp,
  Award,
  CreditCard,
  UserCheck,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Database,
} from 'lucide-react';

export default function AdminPanel() {
  const { actUser } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile drawer state for full menu access
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Auto-detect open section for desktop accordion
  const getDefaultSection = () => {
    const p = location.pathname;
    if (p.includes("master") || p.includes("class") || p.includes("categor") || p.includes("venue") || p.includes("template")) return "master";
    if (p.includes("program") || p.includes("highlight")) return "programmes";
    if (p.includes("student") || p.includes("user") || p.includes("donation")) return "people";
    if (p.includes("wing") || p.includes("treasurer") || p.includes("bank")) return "wings";
    if (p.includes("analytics") || p.includes("anaylatics")) return "analytics";
    return null;
  };

  const [expandedSection, setExpandedSection] = useState<string | null>(getDefaultSection());

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userToken");
    setIsMobileDrawerOpen(false);
    navigate("/login");
  };

  const desktopNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? "bg-indigo-50 text-indigo-700 font-bold border-l-3 border-indigo-600 pl-2.5"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-xl transition-all text-[9px] font-bold shrink-0 ${
      isActive ? "text-indigo-600 font-black bg-indigo-50/90 shadow-2xs" : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* DESKTOP SIDEBAR - Clean White Background, Collapses on small devices < 1025px */}
      <aside className="hidden min-[1025px]:flex h-full w-64 bg-white text-slate-700 flex-col border-r border-slate-200 shrink-0">
        
        {/* Brand Header with DHIU Official Logo */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">Darul Huda</span>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider block">Admin Suite</span>
            </div>
          </div>
        </div>

        {/* Shortened Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          <NavLink
            to={`/admin-panel/${actUser}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                isActive ? "bg-indigo-600 text-white shadow-xs font-bold" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <LayoutDashboard size={16} />
            <span>Dashboard Overview</span>
          </NavLink>

          {/* Section: Master Setup */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleSection("master")}
              className="w-full flex items-center justify-between py-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Database size={14} className="text-violet-600" /> Master Setup
              </span>
              {expandedSection === "master" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSection === "master" && (
              <div className="pl-4 pr-1 py-1 space-y-1 mt-1 border-l-2 border-slate-200 ml-4">
                <NavLink to={`/admin-panel/${actUser}/master-config`} className={desktopNavLinkClasses}>
                  Master Hub
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/our-classes`} className={desktopNavLinkClasses}>
                  Our Classes
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/our-batches`} className={desktopNavLinkClasses}>
                  Our Batches
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/our-categories`} className={desktopNavLinkClasses}>
                  Our Categories
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/our-venues`} className={desktopNavLinkClasses}>
                  Our Venues
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/points-templates`} className={desktopNavLinkClasses}>
                  Points Templates
                </NavLink>
              </div>
            )}
          </div>

          {/* Section: Programmes */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleSection("programmes")}
              className="w-full flex items-center justify-between py-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-indigo-600" /> Programmes
              </span>
              {expandedSection === "programmes" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSection === "programmes" && (
              <div className="pl-4 pr-1 py-1 space-y-1 mt-1 border-l-2 border-slate-200 ml-4">
                <NavLink to={`/admin-panel/${actUser}/Programmes-List`} className={desktopNavLinkClasses}>
                  All Programmes
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/create-program`} className={desktopNavLinkClasses}>
                  Add Programme
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/programmes-calendar`} className={desktopNavLinkClasses}>
                  Calendar View
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/create-highlight`} className={desktopNavLinkClasses}>
                  Add Highlight
                </NavLink>
              </div>
            )}
          </div>

          {/* Section: People */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("people")}
              className="w-full flex items-center justify-between py-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Users size={14} className="text-emerald-600" /> People & Users
              </span>
              {expandedSection === "people" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSection === "people" && (
              <div className="pl-4 pr-1 py-1 space-y-1 mt-1 border-l-2 border-slate-200 ml-4">
                <NavLink to={`/admin-panel/${actUser}/all-students`} className={desktopNavLinkClasses}>
                  Students Directory
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/new-student`} className={desktopNavLinkClasses}>
                  Add New Student
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/all-users`} className={desktopNavLinkClasses}>
                  Registered Users
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/all-donation`} className={desktopNavLinkClasses}>
                  Donations List
                </NavLink>
              </div>
            )}
          </div>

          {/* Section: Wings */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("wings")}
              className="w-full flex items-center justify-between py-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Building2 size={14} className="text-amber-600" /> Wings & Finance
              </span>
              {expandedSection === "wings" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSection === "wings" && (
              <div className="pl-4 pr-1 py-1 space-y-1 mt-1 border-l-2 border-slate-200 ml-4">
                <NavLink to={`/admin-panel/${actUser}/all-wings-list`} className={desktopNavLinkClasses}>
                  Wings Directory
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/create-wing`} className={desktopNavLinkClasses}>
                  Create New Wing
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/all-treasurer-list`} className={desktopNavLinkClasses}>
                  Treasurers List
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/create-treasurer`} className={desktopNavLinkClasses}>
                  Add Treasurer
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/bank-detail-list`} className={desktopNavLinkClasses}>
                  Bank & QR Details
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/economy-analytics`} className={desktopNavLinkClasses}>
                  Economy Analytics
                </NavLink>
              </div>
            )}
          </div>

          {/* Section: Analytics */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("analytics")}
              className="w-full flex items-center justify-between py-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-600" /> System Analytics
              </span>
              {expandedSection === "analytics" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSection === "analytics" && (
              <div className="pl-4 pr-1 py-1 space-y-1 mt-1 border-l-2 border-slate-200 ml-4">
                <NavLink to={`/admin-panel/${actUser}/program-general-anaylatics`} className={desktopNavLinkClasses}>
                  Programmes Analytics
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/student-general-anaylatics`} className={desktopNavLinkClasses}>
                  Students Analytics
                </NavLink>
                <NavLink to={`/admin-panel/${actUser}/wing-general-anaylatics`} className={desktopNavLinkClasses}>
                  Wings Analytics
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* Footer Admin Info */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
              AD
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-slate-800 block truncate">{actUser || "Admin"}</span>
              <span className="text-[10px] text-slate-400 block">Super Admin</span>
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
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-50">
        
        {/* MOBILE TOP HEADER (< 1025px, Clean White) */}
        <header className="min-[1025px]:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 p-1 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">DHIU Admin</span>
              <span className="text-[10px] text-indigo-600 font-semibold truncate block max-w-[170px]">
                {actUser || "Control Suite"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              aria-label="Toggle Full Menu"
            >
              {isMobileDrawerOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
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

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-20 min-[1025px]:pb-0">
          <div className="flex-1 p-3 sm:p-6 md:p-8 w-full mx-auto max-w-7xl">
            <Outlet />
          </div>

          <div className="w-full mt-auto">
            <SiteFooter />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR: SHOWS ALL BUTTONS WITH SMOOTH HORIZONTAL SCROLL */}
        <nav className="min-[1025px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 flex items-center overflow-x-auto scrollbar-none py-1.5 px-1 shadow-lg backdrop-blur-md gap-1">
          <NavLink
            to={`/admin-panel/${actUser}/dashboard`}
            className={bottomBarLinkClasses}
          >
            <LayoutDashboard size={17} className="mb-0.5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/Programmes-List`}
            className={bottomBarLinkClasses}
          >
            <Calendar size={17} className="mb-0.5 text-indigo-600" />
            <span>Programs</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/all-students`}
            className={bottomBarLinkClasses}
          >
            <Users size={17} className="mb-0.5 text-emerald-600" />
            <span>Students</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/all-wings-list`}
            className={bottomBarLinkClasses}
          >
            <Building2 size={17} className="mb-0.5 text-amber-600" />
            <span>Wings</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/master-config`}
            className={bottomBarLinkClasses}
          >
            <Database size={17} className="mb-0.5 text-violet-600" />
            <span>Master</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/economy-analytics`}
            className={bottomBarLinkClasses}
          >
            <CreditCard size={17} className="mb-0.5 text-sky-600" />
            <span>Finance</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/all-donators`}
            className={bottomBarLinkClasses}
          >
            <Award size={17} className="mb-0.5 text-rose-500" />
            <span>Donations</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/all-users`}
            className={bottomBarLinkClasses}
          >
            <UserCheck size={17} className="mb-0.5 text-teal-600" />
            <span>Users</span>
          </NavLink>

          <NavLink
            to={`/admin-panel/${actUser}/profile`}
            className={bottomBarLinkClasses}
          >
            <TrendingUp size={17} className="mb-0.5 text-blue-600" />
            <span>Profile</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-xl transition-all text-[9px] font-bold shrink-0 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <Menu size={17} className="mb-0.5 text-slate-600" />
            <span>More</span>
          </button>
        </nav>

        {/* MOBILE FULL DRAWER (Clean white background, opened via Header menu button) */}
        {isMobileDrawerOpen && (
          <div className="min-[1025px]:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs transition-opacity">
            <div className="bg-white border-t border-slate-200 rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-50 p-0.5 overflow-hidden border border-slate-200">
                    <img src={dhiuLogo} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  All Admin Operations
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <NavLink
                  to={`/admin-panel/${actUser}/master-config`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-semibold border border-violet-200 col-span-2"
                >
                  <Database size={16} className="text-violet-600" />
                  <span>Master Setup (Classes, Categories, Venues, Points)</span>
                </NavLink>

                <NavLink
                  to={`/admin-panel/${actUser}/create-program`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200"
                >
                  <Calendar size={16} className="text-indigo-600" />
                  <span>New Programme</span>
                </NavLink>

                <NavLink
                  to={`/admin-panel/${actUser}/new-student`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200"
                >
                  <Users size={16} className="text-emerald-600" />
                  <span>Add Student</span>
                </NavLink>

                <NavLink
                  to={`/admin-panel/${actUser}/all-treasurer-list`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200"
                >
                  <Award size={16} className="text-amber-500" />
                  <span>Treasurers</span>
                </NavLink>

                <NavLink
                  to={`/admin-panel/${actUser}/bank-detail-list`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200"
                >
                  <CreditCard size={16} className="text-sky-600" />
                  <span>Bank & QR</span>
                </NavLink>

                <NavLink
                  to={`/admin-panel/${actUser}/all-users`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200"
                >
                  <UserCheck size={16} className="text-purple-600" />
                  <span>User Accounts</span>
                </NavLink>

                <NavLink
                  to={`/admin-panel/${actUser}/program-general-anaylatics`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200"
                >
                  <TrendingUp size={16} className="text-cyan-600" />
                  <span>Analytics</span>
                </NavLink>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition border border-red-200 cursor-pointer"
                >
                  <LogOut size={16} /> Sign Out Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
