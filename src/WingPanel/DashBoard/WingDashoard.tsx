import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";

export default function WingDashboard() {
    return (
        <div className="mx-auto space-y-6">
            {/* Banner Section */}
            <ActiveUserCard
                Panel="Wing"
                UserName="Art wing"
            />

            {/* Grid Container - Fully responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <OverViewClipBox
                    BoxTitle="Total Students"
                    BoxValue={10}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
            </div>
            
            {/* Calendar Section Wrapper */}
            <div className="w-full">
                <ProgrammesCalendar />
            </div>
        </div>
    );
}