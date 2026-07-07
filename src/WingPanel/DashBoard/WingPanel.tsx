import { useState } from 'react';
import { NavLink, useNavigate, Outlet, useParams } from 'react-router-dom';
import SiteFooter from '../../PublicHome/SiteFooter';

export default function WingPanel() {
    // METHOD FIX: Added strict typing to useParams so TypeScript knows 'actWing' is a string
    const { actWing } = useParams<{ actWing: string }>();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        // 1. Clear the login data
        localStorage.removeItem("token");

        // 2. Close the mobile menu
        setIsMenuOpen(false);

        // 3. Redirect to the main login page
        navigate("/login");
    };

    // METHOD FIX: Added { isActive: boolean } type definition to satisfy TS7031
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
                    Wing<span className="text-blue-500">DashBoard</span>
                </div>

                <nav className="p-4 space-y-4 overflow-y-auto h-[calc(100%-80px)]">
                    {/* Academics Section */}
                    <div className='flex flex-col space-y-1'>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3">Academics</p>

                        <NavLink
                            to={`/wing-panel/${actWing}/wing-dashboard`}
                            onClick={() => setIsMenuOpen(false)}
                            className={navLinkClasses}
                        >
                            Dashboard
                        </NavLink>

                        <NavLink
                            to={`/wing-panel/${actWing}/create-result`}
                            onClick={() => setIsMenuOpen(false)}
                            className={navLinkClasses}
                        >
                            Create Result
                        </NavLink>

                        <NavLink
                            to={`/wing-panel/${actWing}/create-program`}
                            onClick={() => setIsMenuOpen(false)}
                            className={navLinkClasses}
                        >
                            Create Program
                        </NavLink>
                    </div>

                    {/* Program Section */}
                    <div className='flex flex-col space-y-1'>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3 mt-4">Program</p>

                        <NavLink
                            to={`/wing-panel/${actWing}/wing-programmes`}
                            onClick={() => setIsMenuOpen(false)}
                            className={navLinkClasses}
                        >
                            My Programmes
                        </NavLink>

                        <NavLink
                            to={`/wing-panel/${actWing}/wing-results`}
                            onClick={() => setIsMenuOpen(false)}
                            className={navLinkClasses}
                        >
                            My Results
                        </NavLink>

                        <NavLink
                            to={`/wing-panel/${actWing}/wing-anylatics`}
                            onClick={() => setIsMenuOpen(false)}
                            className={navLinkClasses}
                        >
                            Wing Anylatics
                        </NavLink>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-4 border-t border-slate-800 mt-4">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left block p-3 rounded-lg hover:bg-red-500/10 transition text-red-400 hover:text-red-300 font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                {/* Mobile Header - Visible only below 1025px */}
                <header className="min-[1025px]:hidden flex items-center justify-between p-4 bg-white shadow-sm shrink-0 border-b border-slate-200">
                    <span className="font-bold text-slate-800">Wing Portal</span>
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        {isMenuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        )}
                    </button>
                </header>

                {/* Main Content Layout Container */}
                <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">

                    {/* Dynamic Route Content Area - flex-1 pushes footer down */}
                    <div className="flex-1 p-4 md:p-8 w-full mx-auto max-w-7xl">
                        <Outlet />
                    </div>

                    {/* Site Footer - Natural, clean placement inside the layout scroll flow */}
                    <SiteFooter />

                </main>
            </div>

            {/* Mobile Overlay - Interacts below 1025px */}
            {isMenuOpen && (
                <div
                    onClick={() => setIsMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm min-[1025px]:hidden transition-opacity"
                />
            )}
        </div>
    );
}