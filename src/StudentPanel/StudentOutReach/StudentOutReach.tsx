import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";
import SafeImage from "../../lib/SafeImage";
import { resolveStudentProfile, type LoggedInStudentProfile } from "../../lib/accountResolver";
import { Compass, Globe, Award, Sparkles } from "lucide-react";

interface OutreachRecord {
  OutReach_Id: string;
  OutReach_Type: string;
  OutReach_Title: string;
  OutReach_Descriptin: string;
  Point_Obtained: number;
  created_at: string;
}

export default function StudentsOutReach() {
  const { actStn } = useParams<{ actStn: string }>(); 
  const [student, setStudent] = useState<LoggedInStudentProfile | null>(() => {
    try {
      const cached = localStorage.getItem("cached_student_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !localStorage.getItem("cached_student_profile"));
  const [outreachRecords, setOutreachRecords] = useState<OutreachRecord[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    let isMounted = true;

    const fetchOutreach = async (silent = false) => {
      if (!silent && !student) {
        setLoading(true);
      }
      try {
        const studentData = await resolveStudentProfile(actStn);
        if (!studentData) throw new Error("Student not found");

        if (isMounted) {
          setStudent(studentData);
        }

        const { data: outreachData, error: outreachError } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("StnAddNo", studentData.AddNo)
          .order("created_at", { ascending: false });

        if (outreachError) throw outreachError;
        if (isMounted) {
          setOutreachRecords((outreachData as OutreachRecord[]) || []);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error fetching student outreach:", errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOutreach(Boolean(student));

    const handleProfileSync = () => {
      fetchOutreach(true);
    };
    window.addEventListener("student-profile-synced", handleProfileSync);

    return () => {
      isMounted = false;
      window.removeEventListener("student-profile-synced", handleProfileSync);
    };
  }, [actStn]);

  const totalPoints = outreachRecords.reduce((sum, record) => sum + (record.Point_Obtained || 0), 0);
  const totalMissions = outreachRecords.length;
  const outreachTypes = ["All", ...new Set(outreachRecords.map(o => o.OutReach_Type).filter(Boolean) as string[])];
  const filteredOutreach = outreachRecords.filter(record => 
    typeFilter === "All" || record.OutReach_Type === typeFilter
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800">Student Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">We couldn't locate records for this profile.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-28 font-sans px-1 sm:px-2">
      
      {/* HEADER HERO: CLEAN WHITE BACKGROUND, COLLAPSES ON SMALL SCREENS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left min-w-0">
          {/* Real Student Photo */}
          <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
            {student.Student_Photo_Urls ? (
              <SafeImage
                src={student.Student_Photo_Urls} 
                alt={student.StudentName} 
                fallbackCategory="student"
                fallbackText={student.StudentName}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-cyan-50 text-cyan-700 font-extrabold text-2xl flex items-center justify-center">
                {(student.StudentName || "S")[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full border border-cyan-200 inline-block mb-1">
              🌍 DHIU Community Reach
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              Global Outreach Footprint
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Field impact, symposiums, and civic missions for{" "}
              <strong className="text-slate-900 font-bold">{student.StudentName}</strong>
            </p>
          </div>
        </div>

        {/* Impact Score Counter Badge */}
        <div className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shrink-0 shadow-xs flex sm:flex-col items-center justify-between sm:justify-center gap-1 min-w-[150px]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Impact Score</p>
          <p className="text-3xl sm:text-4xl font-black text-cyan-600 flex items-center gap-1">
            <Sparkles className="w-6 h-6 text-cyan-500" />
            {totalPoints}
          </p>
          <span className="text-[10px] font-bold text-slate-400">Total Points</span>
        </div>
      </div>

      {/* STATS OVERVIEW: 2 COLS ON MOBILE, 2 ON DESKTOP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OverviewClipBox
          BoxTitle="Outreach Missions"
          BoxValue={totalMissions}
          BoxSvgLogo={<Globe className="w-6 h-6 text-cyan-600" />}
        />
        <OverviewClipBox
          BoxTitle="Active Categories"
          BoxValue={outreachTypes.length - 1}
          BoxSvgLogo={<Compass className="w-6 h-6 text-indigo-600" />}
        />
      </div>

      {/* FILTER & MISSIONS GRID */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Documented Missions ({filteredOutreach.length})</h2>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {outreachTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  typeFilter === type
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {filteredOutreach.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No outreach initiatives found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutreach.map(record => (
              <div
                key={record.OutReach_Id}
                className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition bg-slate-50/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                      {record.OutReach_Type || "Mission"}
                    </span>
                    <span className="text-xs font-black text-cyan-700 bg-cyan-100/70 px-2 py-0.5 rounded-lg">
                      +{record.Point_Obtained} PTS
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-1">
                    {record.OutReach_Title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
                    {record.OutReach_Descriptin}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">#{record.OutReach_Id}</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Award size={12} /> Approved
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
