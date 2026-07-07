import React, { useState, useEffect} from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";

// --- INTERFACES ---
interface Wing { WingTitle: string; WingCode: string; }
interface Programme {
  Program_Code: string;
  Program_Title: string;
  Group: string;
  Category: string;
  Date: string;
  IsOpenRegistration: boolean;
}
interface Student { AddNo: string; StudentName: string; Class: string; CollegeName: string; Student_Photo_Urls: string; }

export default function WingProgrammes() {
  const { actWing } = useParams<{ actWing: string }>();
  const [loading, setLoading] = useState(true);
  const [wingData, setWingData] = useState<Wing | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Student[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingCands, setLoadingCands] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchAll = async () => {
      if (!actWing) return;
      try {
        const { data: wing } = await SupaBaseFunction.from("Chs-WingS").select("*").eq("WingEmail", actWing).single();
        setWingData(wing);
        const { data: progs } = await SupaBaseFunction.from("ProgrammesBox").select("*").eq("WingCode", wing.WingCode);
        setProgrammes(progs || []);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [actWing]);

  const toggleReg = async (code: string, status: boolean) => {
    setProgrammes(prev => prev.map(p => p.Program_Code === code ? { ...p, IsOpenRegistration: !status } : p));
    await SupaBaseFunction.from("ProgrammesBox").update({ IsOpenRegistration: !status }).eq("Program_Code", code);
  };

  const toggleCandidates = async (code: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(code)) { newExpanded.delete(code); } else { newExpanded.add(code); }
    setExpanded(newExpanded);
    
    if (!candidates[code]) {
      setLoadingCands(p => ({ ...p, [code]: true }));
      const { data: regs } = await SupaBaseFunction.from("CandidateRegistrationTable").select("Candidate_Code").eq("Program_Code", code);
      if (regs?.length) {
        const { data: students } = await SupaBaseFunction.from("StudentsBox").select("*").in("AddNo", regs.map(r => r.Candidate_Code));
        setCandidates(p => ({ ...p, [code]: students || [] }));
      }
      setLoadingCands(p => ({ ...p, [code]: false }));
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Fancy Header */}
        <div className="relative bg-slate-900 rounded-2 p-8 mb-8 text-white overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">{wingData?.WingTitle}</h1>
            <p className="text-slate-400 font-medium">Programme & Candidate Management Dashboard</p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-30"></div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Programme</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Registration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {programmes.map((p) => (
                <React.Fragment key={p.Program_Code}>
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900">{p.Program_Title}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.Program_Code}</div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600">{p.Date}</td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => toggleReg(p.Program_Code, p.IsOpenRegistration)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${p.IsOpenRegistration ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {p.IsOpenRegistration ? "● OPEN" : "○ CLOSED"}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => toggleCandidates(p.Program_Code)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 transition-all"
                      >
                        {expanded.has(p.Program_Code) ? "HIDE LIST" : "VIEW CANDIDATES"}
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Detail View */}
                  {expanded.has(p.Program_Code) && (
                    <tr>
                      <td colSpan={4} className="bg-slate-50/50 p-6 border-b border-slate-100">
                        {loadingCands[p.Program_Code] ? <div className="text-center italic text-slate-400">Fetching records...</div> : (
                          candidates[p.Program_Code]?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {candidates[p.Program_Code].map(c => (
                                <div key={c.AddNo} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                  <img src={c.Student_Photo_Urls} className="w-10 h-10 rounded-full object-cover" />
                                  <div>
                                    <div className="font-bold text-sm">{c.StudentName}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{c.AddNo} • {c.Class}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <div className="text-center text-slate-400 text-sm italic">No candidates registered yet.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}