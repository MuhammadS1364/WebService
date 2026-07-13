import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Adjust path if needed

// 1. Define TypeScript interfaces for your database tables
interface OutReachItem {
    id?: string | number;
    OutReach_Type?: string;
    [key: string]: any; // Allow other fields from your table
}

interface AchievementItem {
    id?: string | number;
    Achievement_Type?: string;
    [key: string]: any; // Allow other fields from your table
}

export default function OutReachDashboard() {
    const { actOutReach } = useParams<{ actOutReach: string }>();

    // 2. Initialize with empty arrays to prevent "Cannot read properties of undefined" errors
    const [outreach, setOutReach] = useState<OutReachItem[]>([]);
    const [achievement, setAchievements] = useState<AchievementItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch OutReach Data
                // NOTE: If you only want records specific to this user, append .eq("UserEmail", actOutReach)
                const { data: outReachData, error: outError } = await SupaBaseFunction
                    .from("StudentsOutReach")
                    .select("*");

                if (outError) throw new Error(`Outreach Error: ${outError.message}`);
                if (outReachData) setOutReach(outReachData);

                // Fetch Achievements Data
                // NOTE: If you only want records specific to this user, append .eq("UserEmail", actOutReach)
                const { data: achieveData, error: achieveError } = await SupaBaseFunction
                    .from("StudentsAchievements")
                    .select("*");

                if (achieveError) throw new Error(`Achievement Error: ${achieveError.message}`);
                if (achieveData) setAchievements(achieveData);

            } catch (err: any) {
                // Display error in a dialog box in a peaceful way
                alert(`⚠️ Notice: ${err.message || "Failed to load dashboard data."}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (actOutReach) {
            fetchDashboardData();
        }
    }, [actOutReach]); // Dependency array only depends on the URL parameter now to prevent infinite loops


    // 3. Dynamically count specific types based on your commented lists
    const totalOutreach = outreach.length;
    const totalAchievements = achievement.length;

    // OutReach Specific Counts
    const seminarCount = outreach.filter((item) => item.OutReach_Type === "Seminar").length;
    const debateCount = outreach.filter((item) => item.OutReach_Type === "Debate").length;

    // Achievement Specific Counts
    const essayCount = achievement.filter((item) => item.Achievement_Type === "Essay").length;
    const researchCount = achievement.filter((item) => item.Achievement_Type === "Research Papper").length;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-lg font-semibold text-gray-600 animate-pulse">
                    Loading OutReach Dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto">
            {/* Banner Section */}
            <ActiveUserCard
                Panel={"OutReach"}
                 UserName={actOutReach || "Student"}
            />

            {/* Overview Boxes Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">

                {/* 1. Total OutReach Count */}
                <OverViewClipBox
                    BoxTitle={"Total OutReach"}
                    BoxValue={totalOutreach}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />

                {/* 2. Total Achievements Count */}
                <OverViewClipBox
                    BoxTitle={"Total Achievements"}
                    BoxValue={totalAchievements}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days w-5 h-5">
                            <path d="M8 2v4"></path>
                            <path d="M16 2v4"></path>
                            <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                            <path d="M3 10h18"></path>
                            <path d="M8 14h.01"></path>
                            <path d="M12 14h.01"></path>
                            <path d="M16 14h.01"></path>
                            <path d="M8 18h.01"></path>
                            <path d="M12 18h.01"></path>
                            <path d="M16 18h.01"></path>
                        </svg>
                    }
                />

                {/* 3. Debate OutReach (Updated based on your options) */}
                <OverViewClipBox
                    BoxTitle={"Debate OutReach"}
                    BoxValue={debateCount} 
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-5 h-5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    }
                />

                {/* 4. Seminar OutReach */}
                <OverViewClipBox
                    BoxTitle={"Seminar OutReach"}
                    BoxValue={seminarCount} 
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic w-5 h-5">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" x2="12" y1="19" y2="22"></line>
                        </svg>
                    }
                />

                {/* 5. Essay Achievements (Updated based on your options) */}
                <OverViewClipBox
                    BoxTitle={"Essay Achievements"}
                    BoxValue={essayCount} 
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open w-5 h-5">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                    }
                />

                {/* 6. Research Paper Achievements (Updated based on your options) */}
                <OverViewClipBox
                    BoxTitle={"Research Papers"}
                    BoxValue={researchCount} 
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-medal w-5 h-5">
                            <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"></path>
                            <path d="M11 12 5.12 2.2"></path>
                            <path d="m13 12 5.88-9.8"></path>
                            <path d="M8 7h8"></path>
                            <circle cx="12" cy="17" r="5"></circle>
                            <path d="M12 18v-2h-.5"></path>
                        </svg>
                    }
                />

            </div>

            <div className="mx-auto">
                <ProgrammesCalendar />
            </div>
        </div>
    );
}