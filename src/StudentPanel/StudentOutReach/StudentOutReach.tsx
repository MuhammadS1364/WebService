import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import OverviewClipBox from "../../PublicDashboardComp/OverViewBox";

export default function StudentsOutReach() {
  const { actStn } = useParams(); // Expected to be the StudentEmail
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [outreachRecords, setOutreachRecords] = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    const fetchOutreach = async () => {
      setLoading(true);
      try {
        // 1. Fetch Student Info via Email
        const { data: studentData, error: studentError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .eq("StudentEmail", actStn)
          .single();

        if (studentError || !studentData) throw studentError;
        setStudent(studentData);

        // 2. Fetch Outreach Records using the student's AddNo
        const { data: outreachData, error: outreachError } = await SupaBaseFunction
          .from("StudentsOutReach")
          .select("*")
          .eq("StnAddNo", studentData.AddNo)
          .order("created_at", { ascending: false });

        if (outreachError) throw outreachError;
        setOutreachRecords(outreachData || []);
        
      } catch (error) {
        console.error("Error fetching student outreach:", error);
      } finally {
        setLoading(false);
      }
    };

    if (actStn) fetchOutreach();
  }, [actStn]);

  // Derived Stats
  const totalPoints = outreachRecords.reduce((sum, record) => sum + (record.Point_Obtained || 0), 0);
  const totalMissions = outreachRecords.length;
  
  const outreachTypes = ["All", ...new Set(outreachRecords.map(o => o.OutReach_Type).filter(Boolean))];

  const filteredOutreach = outreachRecords.filter(record => 
    typeFilter === "All" || record.OutReach_Type === typeFilter
  );

  const getTypeColor = (type) => {
    const defaultColor = "bg-teal-50 text-teal-700 border-teal-200";
    if (!type) return defaultColor;
    const charCode = type.charCodeAt(0);
    if (charCode % 4 === 0) return "bg-cyan-50 text-cyan-700 border-cyan-200";
    if (charCode % 4 === 1) return "bg-blue-50 text-blue-700 border-blue-200";
    if (charCode % 4 === 2) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return defaultColor;
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-teal-500"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center mt-20 text-gray-500">
        <h2 className="text-2xl font-bold text-gray-700">Student Not Found</h2>
        <p>We couldn't locate records for this profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Global Footprint</h1>
            <p className="text-teal-100 mt-2 text-lg">
              Outreach & community impact map for <span className="font-bold text-white">{student.StudentName}</span>
            </p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center shadow-lg transform hover:scale-105 transition-transform">
            <p className="text-sm font-bold text-teal-100 uppercase tracking-widest mb-1">Impact Score</p>
            <p className="text-5xl font-black text-white">{totalPoints}</p>
          </div>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OverviewClipBox
            BoxTitle="Outreach Missions"
            BoxValue={totalMissions}
            variant="emerald"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          />
          <OverviewClipBox
            BoxTitle="Network Sectors"
            BoxValue={outreachTypes.length > 1 ? outreachTypes.length - 1 : 0}
            variant="blue"
            BoxSvgLogo={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            }
          />
        </div>

        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4 sm:mb-0">🌍 Mission Log</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-500">Sector:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none font-medium transition-all"
            >
              {outreachTypes.map((type, idx) => (
                <option key={idx} value={type}>{type || "Uncategorized"}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Outreach Log Grid */}
        {filteredOutreach.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
            <span className="text-6xl mb-4 block">🚀</span>
            <h3 className="text-2xl font-bold text-gray-700">Ready for Launch?</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Engage in community service or global programs to fill your mission log.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutreach.map((record) => {
              const themeColor = getTypeColor(record.OutReach_Type);
              return (
                <div key={record.OutReach_Id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col group hover:-translate-y-1">
                  <div className={`h-2 w-full ${themeColor.split(' ')[0].replace('bg-', 'bg-')}`} style={{ filter: 'brightness(0.9)' }}></div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${themeColor}`}>
                        {record.OutReach_Type || "General Outreach"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{record.OutReach_Title}</h3>
                    <p className="text-sm text-gray-600 mb-6 flex-1 line-clamp-3">{record.OutReach_Descriptin}</p>
                    <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                      <div className="text-xs font-medium text-gray-400">
                        {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'Date N/A'}
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase">Impact</span>
                        <span className="text-lg font-black text-cyan-600">+{record.Point_Obtained}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}