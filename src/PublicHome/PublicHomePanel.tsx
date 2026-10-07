import { NavLink, Outlet } from 'react-router-dom';
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
  BookOpen
} from 'lucide-react';

export default function PublicHomePanel() {
  const desktopNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-xs font-semibold ${
      isActive
        ? "bg-emerald-50 text-emerald-800 font-bold border-l-4 border-emerald-600 pl-3 shadow-xs"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 text-[10px] font-bold ${
      isActive ? "text-emerald-700 font-black scale-105" : "text-slate-500 hover:text-slate-800"
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
        
        {/* Mobile Header (< 1025px) with Anjuman-e-Huda & DHIU Official Logos */}
        <header className="min-[1025px]:hidden flex items-center justify-between p-3.5 bg-white text-slate-900 shadow-xs shrink-0 border-b border-slate-200 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 overflow-hidden shrink-0 flex items-center justify-center border border-emerald-200">
              <img src={anjumanLogo} alt="Anjuman Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block leading-tight">Anjuman-e-Huda</span>
              <span className="text-[10px] text-emerald-600 font-bold block">CHS • DHIU Portal</span>
            </div>
          </div>
          
          <NavLink
            to="/login"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <LogIn size={14} /> Login
          </NavLink>
        </header>

        {/* Dynamic Outlet Container (Safe bottom padding pb-20 for bottom navigation) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-20 min-[1025px]:pb-0">
          <div className="flex-1 p-3 sm:p-6 md:p-8 w-full mx-auto max-w-7xl">
            <Outlet />
          </div>

          <div className="w-full mt-auto">
            <SiteFooter />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR: CLEAN WHITE BACKGROUND */}
        <nav className="min-[1025px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 flex items-center justify-around py-1.5 px-1 shadow-lg backdrop-blur-md">
          <NavLink
            to="/public-panel/dashboard"
            className={bottomBarLinkClasses}
          >
            <LayoutDashboard size={19} className="mb-0.5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/public-panel/student-content"
            className={bottomBarLinkClasses}
          >
            <BookOpen size={19} className="mb-0.5 text-emerald-600" />
            <span>Content</span>
          </NavLink>

          <NavLink
            to="/public-panel/our-programmes-list"
            className={bottomBarLinkClasses}
          >
            <Calendar size={19} className="mb-0.5" />
            <span>Events</span>
          </NavLink>

          <NavLink
            to="/public-panel/our-hightligths-evens"
            className={bottomBarLinkClasses}
          >
            <Sparkles size={19} className="mb-0.5 text-amber-500" />
            <span>Highlights</span>
          </NavLink>

          <NavLink
            to="/login"
            className={bottomBarLinkClasses}
          >
            <LogIn size={19} className="mb-0.5 text-emerald-600" />
            <span>Login</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
