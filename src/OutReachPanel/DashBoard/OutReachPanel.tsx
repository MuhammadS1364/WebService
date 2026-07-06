import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet, useParams } from 'react-router-dom';

export default function OutReachPanel() {
    const {actOutReach} = useParams(); 
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsMenuOpen(false);
        navigate("/login");
    };

    const navLinkClasses = ({ isActive }) =>
        `block p-3 rounded-lg transition-all duration-200 ${
            isActive 
                ? "bg-slate-700 text-white font-medium shadow-sm border-l-4 border-blue-500 pl-2" 
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
            {/* Sidebar - Automatically stays fixed/hidden below 1025px, turns structural at 1025px+ */}
            <aside className={`h-full fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out min-[1025px]:relative min-[1025px]:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 text-2xl font-bold border-b border-slate-800 tracking-tight">
                    OutReach<span className="text-blue-500">DashBoard</span>
                </div>
                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
                    <NavLink to={`/outreach-panel/${actOutReach}/dashboard`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Programmes List
                    </NavLink>
                    <NavLink to={`/outreach-panel/${actOutReach}/create-outreach`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Create OutReach
                    </NavLink>
                    <NavLink to={`/outreach-panel/${actOutReach}/create-achievements`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                        Create Achievement
                    </NavLink>

                    <div className="pt-4 border-t border-slate-800 mt-4">
                        <button onClick={handleLogout} className="w-full text-left block p-3 rounded-lg hover:bg-red-500/10 transition text-red-400 hover:text-red-300 font-medium">
                            Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                {/* Mobile Header - Visible only below 1025px */}
                <header className="min-[1025px]:hidden flex items-center justify-between p-4 bg-white shadow-sm flex-shrink-0 border-b border-slate-200">
                    <span className="font-bold text-slate-800">OutReach Block</span>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
                        {isMenuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        )}
                    </button>
                </header> 

                {/* Dynamic Route Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="w-full p-3 mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Overlay - Interacts below 1025px */}
            {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm min-[1025px]:hidden transition-opacity" />}
        </div>
    );
}
