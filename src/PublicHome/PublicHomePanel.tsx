import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import SiteFooter from './SiteFooter';

export default function PublicHomePanel() {

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Added type definition { isActive: boolean } to fix the TS7031 error
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `block p-3 rounded-lg transition-all duration-200 ${isActive
            ? "bg-slate-700 text-white font-medium shadow-sm border-l-4 border-blue-500 pl-2"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
            {/* Sidebar - Automatically stays fixed/hidden below 1025px, turns structural at 1025px+ */}
            <aside className={`h-full fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out min-[1025px]:relative min-[1025px]:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 text-2xl font-bold border-b border-slate-800 tracking-tight">
                    Public<span className="text-blue-500">Dashboard</span>
                </div>
                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
                    <NavLink to={`/public-panel/dashboard`} onClick={() => setIsMenuOpen(true)} className={navLinkClasses}>
                        Dashboard
                    </NavLink>
                    <NavLink to={`/public-panel/our-wing-list`} onClick={() => setIsMenuOpen(true)} className={navLinkClasses}>
                        Our Wings
                    </NavLink>
                    <NavLink to={`/public-panel/donate-us`} onClick={() => setIsMenuOpen(true)} className={navLinkClasses}>
                        Donate Us
                    </NavLink>
                    <NavLink to={`/public-panel/programmes-calendar`} onClick={() => setIsMenuOpen(true)} className={navLinkClasses}>
                        Program Celender
                    </NavLink>
                    <NavLink to={`/public-panel/our-hightligths-evens`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Highlights
                    </NavLink>
                    <NavLink to={`/public-panel/our-programmes`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Our Program
                    </NavLink>
                    <NavLink to={`/public-panel/our-achievements`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Our Achievements
                    </NavLink>

                    {/* <NavLink to={`/public-panel/programmes-calendar`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Our OurReachs
                    </NavLink> */}

                    <NavLink to={`/login`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Login
                    </NavLink>

                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                {/* Mobile Header - Visible only below 1025px */}
                <header className="min-[1025px]:hidden flex items-center justify-between p-4 bg-white shadow-sm shrink-0 border-b border-slate-200">
                    <span className="font-bold text-slate-800">AdminPro</span>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
                        {isMenuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        )}
                    </button>
                </header>

                {/* Main Layout Container - Fixed height, no page scroll */}
                <main className="flex-1 flex flex-col bg-gray-50 h-screen overflow-hidden">

                    {/* 1. FIXED TOP BANNER AREA */}
                    {/* shrink-0 ensures the banner never squishes, and it stays pinned */}
                    <div className="w-full shrink-0 p-4 md:p-6 lg:p-8 pb-2 md:pb-4">
                        <div className="relative w-full mx-auto bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl shadow-lg overflow-hidden">

                            {/* Ambient background glows */}
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 md:w-64 h-48 md:h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 md:w-48 h-32 md:h-48 bg-black opacity-10 rounded-full blur-2xl pointer-events-none"></div>

                            {/* Responsive Banner Content */}
                            <div className="relative z-10 px-5 py-6 md:px-10 md:py-10 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md mb-1">
                                        Anjuman Huda
                                    </h1>
                                    <p className="text-emerald-50 text-sm md:text-base font-medium max-w-xl opacity-90">
                                        Empowering the community through knowledge, unity, and dedication.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* 2. SCROLLABLE CONTENT AREA */}
                    {/* flex-1 lets it take remaining space, overflow-y-auto adds the scrollbar here */}
                    <div className="flex-1 p-1 md:p-8 w-full mx-auto overflow-x-auto">
                        <Outlet />
                    </div>

                    {/* Site Footer - Natural, clean placement inside the layout scroll flow */}
                    <SiteFooter />

                </main>
            </div>

            {/* Mobile Overlay - Interacts below 1025px */}
            {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm min-[1025px]:hidden transition-opacity" />}
        </div>
    );
}