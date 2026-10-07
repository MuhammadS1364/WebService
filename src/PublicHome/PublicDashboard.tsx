
import { SupaBaseFunction } from "../lib/SupaBase";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

import OverviewClipBox from "../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../PublicProgrammesComponents/ProgramCelender";

export default function PublicPageDashboard() {
    
    const [students, setStudents] = useState<any[]>([]);
    const [programmes, setProgrammes] = useState<any[]>([]);
    const [wings, setWings] = useState<any[]>([]);
    const [result, setResult] = useState<any[]>([]);
    const [outReach, setOutReach] = useState<any[]>([]);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [expance, setExpance] = useState<any[]>([]);

    // Geting All Data
    useEffect(() => {
        
        const GetStudentsData = async () => {
            const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
            if (error) console.log("Stn Error : ", error.message);
            setStudents(data || []);
        };

        const GetWingData = async () => {
            const { data, error } = await SupaBaseFunction.from("Chs-WingS").select("*");
            if (error) console.log("Wing Error : ", error.message);
            setWings(data || []);
        };

        const GetProgrammesData = async () => {
            const { data, error } = await SupaBaseFunction.from("ProgrammesBox").select("*");
            if (error) console.log("Program Error : ", error.message);
            setProgrammes(data || []);
        };

        const GetOutReachData = async () => {
            const { data, error } = await SupaBaseFunction.from("StudentsOutReach").select("*");
            if (error) console.log("OutReach Error : ", error.message);
            setOutReach(data || []);
        };

        const GetAchievementsData = async () => {
            const { data, error } = await SupaBaseFunction.from("StudentsAchievements").select("*");
            if (error) console.log("Achieve Error : ", error.message);
            setAchievements(data || []);
        };

        const GetResultsData = async () => {
            const { data, error } = await SupaBaseFunction.from("ResultBox").select("*");
            if (error) console.log("Result Error : ", error.message);
            setResult(data || []);
        };

        const GetExpanceData = async () => {
            const { data, error } = await SupaBaseFunction.from("EconoMicalBox").select("*");
            if (error) console.log("Expance Error : ", error.message);
            setExpance(data || []);
        };

        GetStudentsData();
        GetWingData();
        GetProgrammesData();
        GetOutReachData();
        GetAchievementsData();
        GetExpanceData();
        GetResultsData();
    }, []);


    // It prevents the "Property does not exist on type never" errors.
    const TotalParticipants = useMemo(() => {
        return programmes.reduce((total, prog) => {
            return total + Number(prog.Total_Registration ?? 0);
        }, 0);
    }, [programmes]);

    const TotalExpance = useMemo(() => {
        return expance.reduce((total, exp) => {
            return total + Number(exp.how_mach ?? 0);
        }, 0);
    }, [expance]);

    
    return (
        <div className="mx-auto px-4 overflow-hidden">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <OverviewClipBox
                    BoxTitle={"Total Students"}
                    BoxValue={students.length}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />

                <OverviewClipBox
                    BoxTitle={"Total Wings"}
                    BoxValue={wings.length}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
                <OverviewClipBox
                    BoxTitle={"Total Programmes"}
                    BoxValue={programmes.length}
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
                <OverviewClipBox
                    BoxTitle={"Total Participants"}
                    BoxValue={String(TotalParticipants)}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
                <OverviewClipBox
                    BoxTitle={"Total OutReach"}
                    BoxValue={outReach.length}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
                <OverviewClipBox
                    BoxTitle={"Total Achievements"}
                    BoxValue={achievements.length}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
                <OverviewClipBox
                    BoxTitle={"Total Expances"}
                    BoxValue={String(TotalExpance)}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
                <OverviewClipBox
                    BoxTitle={"Total Resulted"}
                    BoxValue={result.length}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5">
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                            <path d="M22 10v6"></path>
                            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                        </svg>
                    }
                />
            </div>

            {/* Student Content Creative Hub Feature Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 mt-7 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="relative z-10 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
                        <Sparkles size={13} className="text-emerald-400" />
                        <span>Student Publications & Works</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        Explore Student Articles, Speeches & Creative Submissions
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                        Read scholarly articles, Arabic prose, and competition writings submitted by registered students across all academic wings.
                    </p>
                </div>

                <Link
                    to="/public-panel/student-content"
                    className="relative z-10 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
                >
                    <BookOpen size={16} />
                    <span>View Student Showcases</span>
                    <ArrowRight size={15} />
                </Link>
            </div>

            <div className="mx-auto">
                <ProgrammesCalendar />
            </div>
        </div>
    )
}


