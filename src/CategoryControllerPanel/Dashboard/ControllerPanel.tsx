import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet, useParams } from "react-router-dom";
import SiteFooter from "../../PublicHome/SiteFooter";
import dhiuLogo from "../../ImgBox/Dhiu.jpg";
import { resolveControllerProfile, type LoggedInControllerProfile } from "../../lib/controllerResolver";
import {
  LayoutDashboard,
  Calendar,
  Award,
  Layers,
  LogOut,
  User,
  PlusCircle,
  Trophy,
  Users,
  Menu,
  X,
  ShieldCheck,
  Clock,
  KeyRound,
} from "lucide-react";

export default function ControllerPanel() {
  const { actController } = useParams<{ actController: string }>();
  const navigate = useNavigate();

  const [controller, setController] = useState<LoggedInControllerProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_controller_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await resolveControllerProfile(actController);
        if (res && isMounted) {
          setController(res);
        }
      } catch (err) {
        console.error("Error loading controller profile in nav:", err);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [actController]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userToken");
    localStorage.removeItem("cached_controller_profile");
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 text-xs font-semibold ${
      isActive
        ? "bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 pl-3 shadow-xs"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-xl transition-all duration-200 text-[9px] font-bold shrink-0 ${
      isActive
        ? "text-indigo-600 font-black bg-indigo-50/90 shadow-2xs"
        : "text-slate-500 hover:text-slate-800"
    }`;

  const activeUser = actController || controller?.controller_email || "";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden min-[1025px]:flex flex-col h-full w-64 bg-white border-r border-slate-200 shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">Darul Huda</span>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider block">
                Category Suite
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Category Badge Banner */}
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100/60">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-600 text-white shrink-0">
              <Layers size={13} />
            </span>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 block">
                Jurisdiction
              </span>
              <span className="text-xs font-black text-slate-900 truncate block">
                {controller?.category_title || "Assigned Category"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          <NavLink to={`/controller-panel/${activeUser}/dashboard`} className={navLinkClasses}>
            <LayoutDashboard size={16} />
            <span>Dashboard Overview</span>
          </NavLink>

          <NavLink to={`/controller-panel/${activeUser}/programmes`} className={navLinkClasses}>
            <Calendar size={16} />
            <span>Category Programmes</span>
          </NavLink>

          <NavLink to={`/controller-panel/${activeUser}/create-program`} className={navLinkClasses}>
            <PlusCircle size={16} />
            <span>Add Programme</span>
          </NavLink>

          <NavLink to={`/controller-panel/${activeUser}/create-result`} className={navLinkClasses}>
            <Award size={16} />
            <span>Declare Result</span>
          </NavLink>

          <NavLink to={`/controller-panel/${activeUser}/results`} className={navLinkClasses}>
            <Trophy size={16} />
            <span>Results & Standings</span>
          </NavLink>

          <NavLink to={`/controller-panel/${activeUser}/registrations`} className={navLinkClasses}>
            <Users size={16} />
            <span>Candidate Registrations</span>
          </NavLink>

          <NavLink to={`/controller-panel/${activeUser}/calendar`} className={navLinkClasses}>
            <Clock size={16} />
            <span>Category Calendar</span>
          </NavLink>

          <div className="pt-2 border-t border-slate-100 my-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 block mb-1">
              Account
            </span>
            <NavLink to={`/controller-panel/${activeUser}/profile`} className={navLinkClasses}>
              <User size={16} />
              <span>Controller Profile</span>
            </NavLink>
            <NavLink to={`/controller-panel/${activeUser}/password`} className={navLinkClasses}>
              <KeyRound size={16} />
              <span>Change Password</span>
            </NavLink>
          </div>
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-slate-200/60 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden shrink-0 flex items-center justify-center font-black text-indigo-700 text-xs">
              {controller?.controller_img ? (
                <img
                  src={controller.controller_img}
                  alt={controller.controller_fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                (controller?.controller_fullName || "C")[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-slate-900 truncate block">
                {controller?.controller_fullName || "Controller"}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                {controller?.controller_id || "ID"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="min-[1025px]:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>{controller?.category_title || "Category Controller"}</span>
              </span>
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">•</span>
              <span className="text-xs text-slate-600 font-bold hidden sm:inline">
                ID: {controller?.controller_id || "Active"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to={`/controller-panel/${activeUser}/create-program`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <PlusCircle size={14} />
              <span>Add Programme</span>
            </NavLink>
            <NavLink
              to={`/controller-panel/${activeUser}/create-result`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Trophy size={14} />
              <span>Declare Result</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic Outlet Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <Outlet context={{ controller }} />
          <SiteFooter />
        </main>

        {/* BOTTOM NAV BAR (Mobile Devices) */}
        <nav className="min-[1025px]:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shrink-0">
          <NavLink to={`/controller-panel/${activeUser}/dashboard`} className={bottomBarLinkClasses}>
            <LayoutDashboard size={17} />
            <span>Home</span>
          </NavLink>
          <NavLink to={`/controller-panel/${activeUser}/programmes`} className={bottomBarLinkClasses}>
            <Calendar size={17} />
            <span>Programs</span>
          </NavLink>
          <NavLink to={`/controller-panel/${activeUser}/create-program`} className={bottomBarLinkClasses}>
            <PlusCircle size={17} />
            <span>Add</span>
          </NavLink>
          <NavLink to={`/controller-panel/${activeUser}/create-result`} className={bottomBarLinkClasses}>
            <Award size={17} />
            <span>Result</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-xl transition-all text-[9px] font-bold shrink-0 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <Menu size={17} />
            <span>More</span>
          </button>
        </nav>

        {/* MOBILE FULL DRAWER */}
        {isMobileDrawerOpen && (
          <div className="min-[1025px]:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs transition-opacity">
            <div className="bg-white border-t border-slate-200 rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-50 p-0.5 overflow-hidden border border-slate-200">
                    <img src={dhiuLogo} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <span>{controller?.category_title || "Category"} Controller Portal</span>
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
                  to={`/controller-panel/${activeUser}/programmes`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-200 col-span-2"
                >
                  <Calendar size={16} className="text-indigo-600" />
                  <span>All {controller?.category_title || "Category"} Programmes</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/create-program`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  <PlusCircle size={16} className="text-indigo-600" />
                  <span>Add Programme</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/create-result`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200"
                >
                  <Award size={16} className="text-amber-600" />
                  <span>Declare Result</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/results`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  <Trophy size={16} className="text-yellow-600" />
                  <span>Results Showcase</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/registrations`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  <Users size={16} className="text-emerald-600" />
                  <span>Candidates</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/calendar`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  <Clock size={16} className="text-purple-600" />
                  <span>Calendar</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/profile`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  <User size={16} className="text-blue-600" />
                  <span>Profile</span>
                </NavLink>

                <NavLink
                  to={`/controller-panel/${activeUser}/password`}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  <KeyRound size={16} className="text-rose-600" />
                  <span>Password</span>
                </NavLink>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Logout from Controller Suite</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
