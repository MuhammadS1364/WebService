import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";

// 1. Declare Data Schemas matching your Database structure
interface AchievementItem {
  Achieve_Id: string;
  Achiever_Name: string | null;
  Achievement_Title: string | null;
  Achievement_Type: string | null;
  Position_Achieved: string | null;
  Achieve_Descriptin: string | null;
  Point_Obtained: number | null;
  StnAddNo: string | null;
  displayName?: string; // Appended locally
}

interface OutreachItem {
  OutReach_Id: string;
  created_at: string;
  OutReach_Holder: string | null;
  OutReach_Title: string | null;
  OutReach_Type: string | null;
  Position_Achieved: string | null;
  OutReach_Descriptin: string | null;
  Point_Obtained: number | null;
  StnAddNo: string | null;
  displayName?: string; // Appended locally
}

interface StudentBoxRow {
  AddNo: string;
  StudentName: string | null;
}

export default function OutReachAndAchievements() {
  const [activeTab, setActiveTab] = useState<"achievements" | "outreach">("achievements");
  
  // Explicitly type your hook states to prevent 'never[]' assignment errors
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [outreach, setOutreach] = useState<OutreachItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [achRes, outRes, studentRes] = await Promise.all([
          SupaBaseFunction.from("StudentsAchievements").select("*"),
          SupaBaseFunction.from("StudentsOutReach").select("*"),
          SupaBaseFunction.from("StudentsBox").select("AddNo, StudentName")
        ]);

        if (achRes.error) throw achRes.error;
        if (outRes.error) throw outRes.error;
        if (studentRes.error) throw studentRes.error;

        // Type the lookup map index signature as string: string keys yielding string values
        const studentMap: Record<string, string> = {};
        
        (studentRes.data as StudentBoxRow[]).forEach(student => {
          if (student.AddNo && student.StudentName) {
            studentMap[student.AddNo] = student.StudentName;
          }
        });

        const mappedAchievements = (achRes.data as AchievementItem[]).map(item => ({
          ...item,
          displayName: item.Achiever_Name ? (studentMap[item.Achiever_Name] || "Unknown Student") : "Unknown Student"
        }));

        const mappedOutreach = (outRes.data as OutreachItem[]).map(item => ({
          ...item,
          displayName: item.StnAddNo ? (studentMap[item.StnAddNo] || "Unknown Student") : "Unknown Student"
        }));

        setAchievements(mappedAchievements);
        setOutreach(mappedOutreach);
      } catch (error) {
        console.error("Error structural fetching layout maps:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalAchievementPoints = achievements.reduce((acc, curr) => acc + (curr.Point_Obtained || 0), 0);
  const totalOutreachPoints = outreach.reduce((acc, curr) => acc + (curr.Point_Obtained || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-12 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/50 px-3 py-1.5 rounded-full border border-indigo-500/30">
          Student Spotlight
        </span>
        <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          Outreach & Achievements
        </h1>
      </div>

      {/* Quick Stats Overview Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Achievements</p>
            <p className="text-3xl font-extrabold text-white mt-1">{achievements.length}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 font-bold">🏆</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Outreach Initiatives</p>
            <p className="text-3xl font-extrabold text-white mt-1">{outreach.length}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 font-bold">🌐</div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Combined House Points</p>
            <p className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text mt-1">
              {totalAchievementPoints + totalOutreachPoints} PTS
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 font-bold">⚡</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto flex justify-center mb-10">
        <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 flex gap-2 shadow-inner">
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "achievements"
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            🏆 Academic & Sports Achievements
          </button>
          <button
            onClick={() => setActiveTab("outreach")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "outreach"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            🌐 Community Outreach
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading profiles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === "achievements" ? (
              achievements.length === 0 ? <EmptyState /> : achievements.map((item) => (
                <div key={item.Achieve_Id} className="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-colors" />
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
                        {item.Achievement_Type || "General"}
                      </span>
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        +{item.Point_Obtained || 0} PTS
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {item.Achievement_Title || "Untitled Accomplishment"}
                    </h3>
                    <p className="text-xs text-indigo-400 font-semibold mt-1">
                      {item.Position_Achieved ? `🎯 ${item.Position_Achieved}` : "Participant"}
                    </p>
                    <p className="text-sm text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                      {item.Achieve_Descriptin || "No description provided for this achievement record."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
                    <span>By: <strong className="text-slate-300">{item.displayName}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              outreach.length === 0 ? <EmptyState /> : outreach.map((item) => (
                <div key={item.OutReach_Id} className="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/5 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full group-hover:bg-cyan-500/10 transition-colors" />
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wide">
                        {item.OutReach_Type || "Volunteer"}
                      </span>
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        +{item.Point_Obtained || 0} PTS
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2">
                      {item.OutReach_Title || "Untitled Outreach"}
                    </h3>
                    <p className="text-xs text-cyan-400 font-semibold mt-1">
                      {item.Position_Achieved ? `💼 Role: ${item.Position_Achieved}` : "Contributor"}
                    </p>
                    <p className="text-sm text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                      {item.OutReach_Descriptin || "No descriptive logs found for this outreach project."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
                    <span>By: <strong className="text-slate-300">{item.displayName}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
      <p className="text-slate-500 text-sm">No records found matching this criterion.</p>
    </div>
  );
}