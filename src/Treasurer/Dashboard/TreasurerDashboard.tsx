import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import OverViewClipBox from "../../PublicDashboardComp/OverViewBox";
import ProgrammesCalendar from "../../PublicProgrammesComponents/ProgramCelender";
import ActiveUserCard from "../../PublicDashboardComp/UserInfoCard";
import { SupaBaseFunction } from "../../lib/SupaBase"; // Ensure this is your Supabase client

// Define your User interface
interface DashboardUser {
  UserName: string;
  UserEmail: string;
  // add other fields if needed
}

// Define your Transaction interface
interface Transaction {
  Amount: number;
  Type: "Expense" | "Income"; // Adjust based on your DB values
  [key: string]: any;
}

// Define your DashboardData interface
interface DashboardData {
  user?: DashboardUser;
}

export default function TreasurerDashboard() {
  const { actTreasurer } = useParams<{ actTreasurer: string }>();
  const decodedEmail = actTreasurer ? decodeURIComponent(actTreasurer) : null;

  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!decodedEmail) {
        setError("No treasurer email provided.");
        setIsLoading(false);
        return;
      }
      try {
        // Fetch user details
        const { data: userData, error: userError } = await SupaBaseFunction
          .from("UserTable")
          .select("*")
          .eq("UserEmail", decodedEmail)
          .single();

        if (userError) throw userError;

        // Fetch transactions
        const { data: econoData, error: econoError } = await SupaBaseFunction
          .from("EconoMicalBox")
          .select("*")
          .eq("Treasurer_Email", userData.UserEmail);

        if (econoError) throw econoError;

        // ✅ Only set `user`, since `profile` is not in DashboardData
        setDashboardData({ user: userData });
        setTransactions(econoData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [decodedEmail]);

  // Calculate Totals
  const totalExpense = transactions
    .filter((t) => t.Type === "Expense")
    .reduce((sum, t) => sum + (t.Amount || 0), 0);

  const totalBalance = transactions.reduce((sum, t) => sum + (t.Amount || 0), 0);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="mx-auto px-4 overflow-hidden">
      <ActiveUserCard
        Panel="Treasurer"
        UserName={dashboardData.user?.UserName || "Treasurer"}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <OverViewClipBox
          BoxTitle="Total Expense"
          BoxValue={totalExpense}
          BoxSvgLogo={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24" height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-red-500"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          }
        />
        <OverViewClipBox
          BoxTitle="Total Balance"
          BoxValue={totalBalance}
          BoxSvgLogo={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24" height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-green-500"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
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
