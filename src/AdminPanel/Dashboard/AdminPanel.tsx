import { useState } from 'react';
import { NavLink, useNavigate, Outlet, useParams } from 'react-router-dom';
import SiteFooter from '../../PublicHome/SiteFooter';

export default function AdminPanel() {
    const { actUser } = useParams();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsMenuOpen(false);
        navigate("/login");
    };

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
                    Admin<span className="text-blue-500"> Dashboard</span>
                </div>
                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
                    <NavLink to={`/admin-panel/${actUser}/dashboard`} onClick={() => setIsMenuOpen(true)} className={navLinkClasses}>
                        Dashboard
                    </NavLink>
                    <div className='flex flex-col space-y-1'>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3 mt-4">Program & Result</p>
                        <NavLink to={`/admin-panel/${actUser}/programmes-list`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Programmes List
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/create-program`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Create Programme
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/create-highlight`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Create HighLight
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/programmes-card`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Programmes Card
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/programmes-calendar`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Programmes Calendar
                        </NavLink>
                    </div>
                    <div className='flex flex-col space-y-1'>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3 mt-4">Students & Users</p>
                        <NavLink to={`/admin-panel/${actUser}/all-students`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            All Students
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/all-users`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            All Users
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/new-student`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Create Student
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/all-donation`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            All Donation
                        </NavLink>
                    </div>

                    <div className='flex flex-col space-y-1'>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3 mt-4">Wings</p>
                        <NavLink to={`/admin-panel/${actUser}/create-wing`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Create Wing
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/all-wings-list`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Wing List
                        </NavLink>
                    </div>

                    <div className='flex flex-col space-y-1'>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3 mt-4">Treasurer</p>
                        <NavLink to={`/admin-panel/${actUser}/create-treasurer`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Create Treasurer
                        </NavLink>

                        <NavLink to={`/admin-panel/${actUser}/all-treasurer-list`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Treasurer List
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/bank-detail-list`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Bank Accounts List
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/economy-analytics`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Treasurer Analytics
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/program-general-anaylatics`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            Program General Analytics
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/student-general-anaylatics`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            student General Analytics
                        </NavLink>
                        <NavLink to={`/admin-panel/${actUser}/wing-general-anaylatics`} onClick={() => setIsMenuOpen(false)} className={navLinkClasses}>
                            wing General Analytics
                        </NavLink>
                    </div>

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

                {/* Main Content Layout Container */}
                <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">

                    {/* Dynamic Route Content Area - flex-1 pushes footer down */}
                    <div className="flex-1 p-4 md:p-8 w-full mx-auto max-w-7xl">
                        <Outlet />
                    </div>

                    {/* Site Footer - Natural, clean placement inside the layout scroll flow */}
                    <div className="flex-1 p-4 md:p-8 w-full mx-auto max-w-7xl">

                        <SiteFooter />
                    </div>

                </main>
            </div>

            {/* Mobile Overlay - Interacts below 1025px */}
            {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm min-[1025px]:hidden transition-opacity" />}
        </div>
    );
}