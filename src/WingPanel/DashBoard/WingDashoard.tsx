import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Import this
import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";
import { SupaBaseFunction } from "../../lib/SupaBase";

interface WingData {
    WingCode: string;
    WingTitle: string;
}

export default function WingDashboard() {
    // 1. Get the email dynamically from the URL
    const { actWing } = useParams<{ actWing: string }>();

    const [wingData, setWingData] = useState<WingData | null>(null);
    const [programmes, setProgrammes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 2. Prevent fetching if actWing is undefined
        if (!actWing) return;

        const fetchWingAndProgrammes = async () => {
            setLoading(true);
            try {
                const { data: wingResult, error: wingError } = await SupaBaseFunction
                    .from('Chs-WingS')
                    .select('WingCode, WingTitle')
                    .eq('WingEmail', actWing) // Uses the dynamic URL parameter
                    .single();

                if (wingError) throw wingError;
                setWingData(wingResult);

                const { data: programmesResult, error: progError } = await SupaBaseFunction
                    .from('ProgrammesBox')
                    .select('*')
                    .eq('WingCode', wingResult.WingCode);

                if (progError) throw progError;
                setProgrammes(programmesResult || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWingAndProgrammes();
    }, [actWing]); // Re-run effect if URL changes
    // Calculate totals
    const totalPrograms = programmes.length;
    const totalRegistration = programmes.reduce((sum, p) => sum + (p.Total_Registration || 0), 0);
    // Assuming you have a 'ResultStatus' or similar field in your programme table
    const totalResulted = programmes.filter(p => p.ResultStatus === 'Published').length;

    if (loading) return <div>Loading dashboard...</div>;
    if (error) return <div>Error loading data: {error}</div>;

    return (
        <div className="mx-auto space-y-6">
            <ActiveUserCard
                Panel="Wing"
                UserName={wingData?.WingTitle || "Art wing"}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Program */}
                <OverViewClipBox
                    BoxTitle="Total Program"
                    BoxValue={totalPrograms}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                    }
                />

                {/* Total Registration */}
                <OverViewClipBox
                    BoxTitle="Total Registration"
                    BoxValue={totalRegistration}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    }
                />

                {/* Total Resulted */}
                <OverViewClipBox
                    BoxTitle="Total Resulted"
                    BoxValue={totalResulted}
                    BoxSvgLogo={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    }
                />
            </div>

            <div className="w-full">
                <ProgrammesCalendar />
            </div>
        </div>
    );
}