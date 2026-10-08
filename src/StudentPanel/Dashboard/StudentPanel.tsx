import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet, useParams } from "react-router-dom";
import SiteFooter from "../../PublicHome/SiteFooter";
import dhiuLogo from "../../ImgBox/Dhiu.jpg";
import SafeImage from "../../lib/SafeImage";
import { resolveStudentProfile, type LoggedInStudentProfile } from "../../lib/accountResolver";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Award,
  BarChart2,
  Lock,
  LogOut,
  User,
  Compass,
  CheckSquare,
  Trophy
} from "lucide-react";

export default function StudentPanel() {
  const { actStn } = useParams<{ actStn: string }>();
  const navigate = useNavigate();

  // Logged-in Student Account state
  const [student, setStudent] = useState<LoggedInStudentProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAccountData = async () => {
      const profile = await resolveStudentProfile(actStn);
      if (profile && isMounted) {
        setStudent(profile);
      }
    };

    fetchAccountData();

    // Listen for profile updates from UpdateProfile component
    const handleProfileSync = (e: Event) => {
      const customEvent = e as CustomEvent<LoggedInStudentProfile>;
      if (customEvent.detail && isMounted) {
        setStudent(customEvent.detail);
      } else {
        fetchAccountData();
      }
    };

    window.addEventListener("student-profile-synced", handleProfileSync);
    return () => {
      isMounted = false;
      window.removeEventListener("student-profile-synced", handleProfileSync);
    };
  }, [actStn]);

  const handleLogout = (): void => {
    localStorage.removeItem("user");
    localStorage.removeItem("userToken");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }): string =>
    `flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-xs font-semibold ${
      isActive
        ? "bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 pl-3 shadow-xs"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const bottomBarLinkClasses = ({ isActive }: { isActive: boolean }): string =>
    `flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 text-[10px] font-bold ${
      isActive
        ? "text-indigo-600 font-black scale-105"
        : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* DESKTOP SIDEBAR (Collapses on small devices < 1025px, visible on 1025px+) */}
      <aside className="hidden min-[1025px]:flex flex-col h-full w-64 bg-white border-r border-slate-200 shrink-0">
        
        {/* Brand Header with DHIU Official Logo */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              DHIU Student
            </span>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 truncate mt-1">
              Student Space
            </h2>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Main Menu
          </p>

          <NavLink to={`/student-panel/${actStn || ""}/stn-dashboard`} className={navLinkClasses}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/all-programmes-list`} className={navLinkClasses}>
            <Calendar size={16} />
            <span>Upcoming Events</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/create-group`} className={navLinkClasses}>
            <Users size={16} className="text-purple-600" />
            <span>Squads & Groups</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/stn-program`} className={navLinkClasses}>
            <CheckSquare size={16} className="text-emerald-600" />
            <span>My Registered Events</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/stn-results`} className={navLinkClasses}>
            <Trophy size={16} className="text-amber-600" />
            <span>My Results</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/stn-achievements-list`} className={navLinkClasses}>
            <Award size={16} className="text-amber-500" />
            <span>Achievements</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/stn-outreach-list`} className={navLinkClasses}>
            <Compass size={16} className="text-cyan-600" />
            <span>Outreach Portfolio</span>
          </NavLink>

          <NavLink to={`/student-panel/${actStn || ""}/stn-anylatics`} className={navLinkClasses}>
            <BarChart2 size={16} className="text-blue-600" />
            <span>My Analytics</span>
          </NavLink>

          <div className="pt-3 border-t border-slate-100 my-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Account Management
            </p>

            <NavLink to={`/student-panel/${actStn || ""}/profile`} className={navLinkClasses}>
              <User size={16} className="text-emerald-600" />
              <span>Update Profile</span>
            </NavLink>

            <NavLink to={`/student-panel/${actStn || ""}/stn-password`} className={navLinkClasses}>
              <Lock size={16} />
              <span>Security Password</span>
            </NavLink>
          </div>
        </nav>

        {/* LOGGED IN ACCOUNT PROFILE CARD (SHOWS REAL STUDENT PHOTO NOT DEFAULT IMG) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <NavLink
              to={`/student-panel/${actStn || ""}/profile`}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition group"
              title="Click to view/update profile"
            >
              {/* Real student image avatar */}
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-indigo-50 shrink-0 flex items-center justify-center shadow-xs">
                {student?.Student_Photo_Urls ? (
                  <SafeImage
                    src={student.Student_Photo_Urls}
                    alt={student.StudentName || "Student Photo"}
                    fallbackCategory="student"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-xs text-indigo-700">
                    {(student?.StudentName || actStn || "S")[0].toUpperCase()}
                  </span>
                )}
              </div>

              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                  {student?.StudentName || actStn || "Student"}
                </p>
                <p className="text-[10px] text-slate-400 truncate font-mono">
                  {student?.AddNo ? `ID: ${student.AddNo}` : "Verified Student"}
                </p>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-50">
        
        {/* MOBILE TOP HEADER (Shows student photo on profile button) */}
        <header className="min-[1025px]:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 p-1 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
              <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-slate-900 leading-tight truncate">
                {student?.StudentName || "Student Portal"}
              </h1>
              <p className="text-[10px] text-indigo-600 font-semibold truncate">
                {student?.AddNo ? `Roll: ${student.AddNo}` : actStn || "Darul Huda"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Real student image on profile button */}
            <NavLink
              to={`/student-panel/${actStn || ""}/profile`}
              className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 bg-indigo-50 flex items-center justify-center shadow-xs"
              title="My Profile"
            >
              {student?.Student_Photo_Urls ? (
                <SafeImage
                  src={student.Student_Photo_Urls}
                  alt={student.StudentName || "Profile"}
                  fallbackCategory="student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={15} className="text-slate-600" />
              )}
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition cursor-pointer"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Dynamic Route Content Layout Container (Safe pb-36 padding prevents cards from being covered by bottom nav) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-36 min-[1025px]:pb-8">
          <div className="flex-1 p-3 sm:p-6 md:p-8 w-full mx-auto max-w-7xl">
            <Outlet />
          </div>

          {/* Guaranteed bottom clearance spacer for mobile */}
          <div className="h-10 min-[1025px]:hidden shrink-0" aria-hidden="true" />

          <div className="w-full mt-auto">
            <SiteFooter />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR: CLEAN WHITE BACKGROUND, DIRECT 5 TABS (NO (...) BUTTON) */}
        <nav className="min-[1025px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 flex items-center justify-around py-1.5 px-1 shadow-xl backdrop-blur-md">
          <NavLink
            to={`/student-panel/${actStn || ""}/stn-dashboard`}
            className={bottomBarLinkClasses}
          >
            <LayoutDashboard size={19} className="mb-0.5" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to={`/student-panel/${actStn || ""}/all-programmes-list`}
            className={bottomBarLinkClasses}
          >
            <Calendar size={19} className="mb-0.5" />
            <span>Events</span>
          </NavLink>

          <NavLink
            to={`/student-panel/${actStn || ""}/create-group`}
            className={bottomBarLinkClasses}
          >
            <Users size={19} className="mb-0.5 text-purple-600" />
            <span>Squads</span>
          </NavLink>

          <NavLink
            to={`/student-panel/${actStn || ""}/stn-achievements-list`}
            className={bottomBarLinkClasses}
          >
            <Award size={19} className="mb-0.5 text-amber-500" />
            <span>Honors</span>
          </NavLink>

          <NavLink
            to={`/student-panel/${actStn || ""}/stn-results`}
            className={bottomBarLinkClasses}
          >
            <Trophy size={19} className="mb-0.5 text-amber-600" />
            <span>Results</span>
          </NavLink>

          <NavLink
            to={`/student-panel/${actStn || ""}/profile`}
            className={bottomBarLinkClasses}
          >
            {/* Show real student photo thumbnail on profile tab icon */}
            <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center mb-0.5">
              {student?.Student_Photo_Urls ? (
                <SafeImage
                  src={student.Student_Photo_Urls}
                  alt="Me"
                  fallbackCategory="student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={12} className="text-emerald-600" />
              )}
            </div>
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
