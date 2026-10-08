import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import SiteFooter from './SiteFooter';
import anjumanLogo from '../ImgBox/anjumanLogo.png';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  HeartHandshake,
  Sparkles,
  Award,
  LogIn,
  BookOpen,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

export default function PublicHomePanel() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const desktopNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-xs font-semibold ${
      isActive
        ? "bg-emerald-50 text-emerald-800 font-bold border-l-4 border-emerald-600 pl-3 shadow-xs"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center min-w-[62px] py-1 px-1 rounded-xl transition-all duration-200 text-[9px] font-bold shrink-0 ${
      isActive ? "text-emerald-700 bg-emerald-50/90 font-black shadow-2xs" : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* DESKTOP SIDEBAR - Only visible on 1025px+ screens, Clean White */}
      <aside className="hidden min-[1025px]:flex h-full w-64 bg-white text-slate-700 flex-col border-r border-slate-200 shrink-0">
        
        {/* Brand Header with Anjuman & DHIU Official Logos */}
        <div className="p-4 text-xl font-bold border-b border-slate-100 tracking-tight flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white p-1 shadow-xs border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center">
            <img src={anjumanLogo} alt="Anjuman-e-Huda Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black text-slate-900 block truncate">Anjuman-e-Huda</span>
            <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">CHS • Public Gateway</span>
          </div>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto flex-1 scrollbar-thin">
          <NavLink to={`/public-panel/dashboard`} className={desktopNavLinkClasses}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to={`/public-panel/student-content`} className={desktopNavLinkClasses}>
            <BookOpen size={16} className="text-emerald-600" />
            <span>Student Content</span>
          </NavLink>
          <NavLink to={`/public-panel/our-wing-list`} className={desktopNavLinkClasses}>
            <Building2 size={16} />
            <span>Our Wings</span>
          </NavLink>
          <NavLink to={`/public-panel/our-programmes-list`} className={desktopNavLinkClasses}>
            <Calendar size={16} />
            <span>All Programmes</span>
          </NavLink>
          <NavLink to={`/public-panel/programmes-calendar`} className={desktopNavLinkClasses}>
            <Calendar size={16} className="text-emerald-600" />
            <span>Events Calendar</span>
          </NavLink>
          <NavLink to={`/public-panel/our-hightligths-evens`} className={desktopNavLinkClasses}>
            <Sparkles size={16} className="text-amber-500" />
            <span>Highlights</span>
          </NavLink>
          <NavLink to={`/public-panel/our-achievements`} className={desktopNavLinkClasses}>
            <Award size={16} className="text-purple-600" />
            <span>Our Achievements</span>
          </NavLink>
          <NavLink to={`/public-panel/donate-us`} className={desktopNavLinkClasses}>
            <HeartHandshake size={16} className="text-rose-500" />
            <span>Donate Us</span>
          </NavLink>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <NavLink to={`/login`} className={desktopNavLinkClasses}>
              <LogIn size={16} />
              <span>Portal Login</span>
            </NavLink>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-slate-50">
        
        {/* Mobile Header (< 1025px) with Anjuman-e-Huda Official Logo & Full Menu Trigger */}
        <header className="min-[1025px]:hidden flex items-center justify-between p-3 bg-white text-slate-900 shadow-xs shrink-0 border-b border-slate-200 z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} className="text-emerald-700" /> : <Menu size={20} />}
            </button>
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 overflow-hidden shrink-0 flex items-center justify-center border border-emerald-200">
              <img src={anjumanLogo} alt="Anjuman Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block leading-tight">Anjuman-e-Huda</span>
              <span className="text-[9px] text-emerald-600 font-bold block uppercase tracking-wider">CHS Public Portal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <NavLink
              to="/public-panel/donate-us"
              className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
            >
              <HeartHandshake size={13} className="text-rose-600" />
              <span>Donate</span>
            </NavLink>
            <NavLink
              to="/login"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <LogIn size={13} />
              <span>Login</span>
            </NavLink>
          </div>
        </header>

        {/* Mobile Slide-Over Menu (Displays ALL Navigation Buttons Clearly) */}
        {mobileMenuOpen && (
          <div className="min-[1025px]:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 border-t border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center p-0.5">
                    <img src={anjumanLogo} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">All Portal Sections</h3>
                    <p className="text-[10px] text-slate-500">Explore Anjuman-e-Huda CHS</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1">
                {[
                  { to: "/public-panel/dashboard", icon: LayoutDashboard, label: "Dashboard (Home)", color: "text-slate-700" },
                  { to: "/public-panel/student-content", icon: BookOpen, label: "Student Content & Literary Hub", color: "text-emerald-600" },
                  { to: "/public-panel/our-wing-list", icon: Building2, label: "Our Wings Directory", color: "text-indigo-600" },
                  { to: "/public-panel/our-programmes-list", icon: Calendar, label: "All Programmes & Contests", color: "text-blue-600" },
                  { to: "/public-panel/programmes-calendar", icon: Calendar, label: "Events & Programme Calendar", color: "text-emerald-700" },
                  { to: "/public-panel/our-hightligths-evens", icon: Sparkles, label: "Grand Highlights & Media", color: "text-amber-500" },
                  { to: "/public-panel/our-achievements", icon: Award, label: "Official Achievements", color: "text-purple-600" },
                  { to: "/public-panel/donate-us", icon: HeartHandshake, label: "Donate to Anjuman-e-Huda", color: "text-rose-500" },
                  { to: "/login", icon: LogIn, label: "Portal Authorized Login", color: "text-emerald-600" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-2xl transition font-bold text-xs ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-slate-100 ${item.color}`}>
                          <Icon size={16} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Outlet Container (Safe bottom padding pb-22 for scrollable bottom bar) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-22 min-[1025px]:pb-0">
          <div className="flex-1 p-3 sm:p-6 md:p-8 w-full mx-auto max-w-7xl">
            <Outlet />
          </div>

          <div className="w-full mt-auto">
            <SiteFooter />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR: SHOWS ALL BUTTONS IN SMOOTH HORIZONTAL SCROLL BAR */}
        <nav className="min-[1025px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 shadow-xl backdrop-blur-md px-1 py-1.5 flex items-center overflow-x-auto scrollbar-none gap-1">
          <NavLink
            to="/public-panel/dashboard"
            className={bottomBarLinkClasses}
          >
            <LayoutDashboard size={17} className="mb-0.5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/public-panel/student-content"
            className={bottomBarLinkClasses}
          >
            <BookOpen size={17} className="mb-0.5 text-emerald-600" />
            <span>Content</span>
          </NavLink>

          <NavLink
            to="/public-panel/our-wing-list"
            className={bottomBarLinkClasses}
          >
            <Building2 size={17} className="mb-0.5 text-indigo-600" />
            <span>Wings</span>
          </NavLink>

          <NavLink
            to="/public-panel/our-programmes-list"
            className={bottomBarLinkClasses}
          >
            <Calendar size={17} className="mb-0.5 text-blue-600" />
            <span>Events</span>
          </NavLink>

          <NavLink
            to="/public-panel/programmes-calendar"
            className={bottomBarLinkClasses}
          >
            <Calendar size={17} className="mb-0.5 text-emerald-700" />
            <span>Calendar</span>
          </NavLink>

          <NavLink
            to="/public-panel/our-hightligths-evens"
            className={bottomBarLinkClasses}
          >
            <Sparkles size={17} className="mb-0.5 text-amber-500" />
            <span>Highlights</span>
          </NavLink>

          <NavLink
            to="/public-panel/our-achievements"
            className={bottomBarLinkClasses}
          >
            <Award size={17} className="mb-0.5 text-purple-600" />
            <span>Achieve</span>
          </NavLink>

          <NavLink
            to="/public-panel/donate-us"
            className={bottomBarLinkClasses}
          >
            <HeartHandshake size={17} className="mb-0.5 text-rose-500" />
            <span>Donate</span>
          </NavLink>

          <NavLink
            to="/login"
            className={bottomBarLinkClasses}
          >
            <LogIn size={17} className="mb-0.5 text-emerald-600" />
            <span>Login</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
