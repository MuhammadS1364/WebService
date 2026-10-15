import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveControllerProfile, type LoggedInControllerProfile } from "../../lib/controllerResolver";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import { exportToExcel } from "../../lib/excelService";
import {
  Users,
  Search,
  Printer,
  FileSpreadsheet,
  Layers,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface CandidateEntry {
  CandidateUUiD: string;
  Program_Code: string;
  Candidate_Code: string;
  squad_uuid?: string;
  studentName?: string;
  studentClass?: string;
  studentEmail?: string;
  programTitle?: string;
}

export default function ControllerRegistrations() {
  const { actController } = useParams<{ actController: string }>();

  const [controller, setController] = useState<LoggedInControllerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryPrograms, setCategoryPrograms] = useState<{ Program_Code: string; Program_Title: string }[]>([]);
  const [selectedProgramCode, setSelectedProgramCode] = useState<string>("all");
  const [candidates, setCandidates] = useState<CandidateEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Print Sheet Modal
  const [sheetProgram, setSheetProgram] = useState<{ code: string; title: string } | null>(null);

  // 1. Resolve Controller
  useEffect(() => {
    async function load() {
      try {
        const profile = await resolveControllerProfile(actController);
        if (profile) setController(profile);
      } catch (err) {
        console.error("Error resolving controller:", err);
      }
    }
    load();
  }, [actController]);

  // 2. Fetch category programmes and registrations
  const fetchRegistrations = async () => {
    if (!controller?.category_uuid) return;
    setLoading(true);
    try {
      // A. Fetch programmes belonging to this category
      const { data: progs, error: pErr } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Program_Code, Program_Title")
        .eq("Category", controller.category_uuid);

      if (pErr) throw pErr;
      const progList = progs || [];
      setCategoryPrograms(progList);

      if (progList.length === 0) {
        setCandidates([]);
        return;
      }

      const progCodes = progList.map((p) => p.Program_Code);

      // B. Fetch CandidateRegistrations for these programmes
      const { data: regs, error: rErr } = await SupaBaseFunction
        .from("CandidateRegistration")
        .select("*")
        .in("Program_Code", progCodes);

      if (rErr) throw rErr;

      // C. Fetch Student profiles
      const addNos = Array.from(new Set((regs || []).map((r) => r.Candidate_Code).filter(Boolean)));
      let studentMap: Record<string, { StudentName: string; Class?: string; StudentEmail?: string }> = {};

      if (addNos.length > 0) {
        const { data: stns } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Class, Stn_Class, StudentEmail")
          .in("AddNo", addNos);

        if (stns) {
          stns.forEach((s) => {
            studentMap[s.AddNo] = {
              StudentName: s.StudentName,
              Class: s.Stn_Class || s.Class,
              StudentEmail: s.StudentEmail,
            };
          });
        }
      }

      // Enriched
      const enriched: CandidateEntry[] = (regs || []).map((r) => {
        const stn = studentMap[r.Candidate_Code] || {};
        const prg = progList.find((p) => p.Program_Code === r.Program_Code);
        return {
          ...r,
          studentName: stn.StudentName || "Student #" + r.Candidate_Code,
          studentClass: stn.Class || "",
          studentEmail: stn.StudentEmail || "",
          programTitle: prg ? prg.Program_Title : r.Program_Code,
        };
      });

      setCandidates(enriched);
    } catch (err: any) {
      console.error("Error fetching category registrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (controller?.category_uuid) {
      fetchRegistrations();
    }
  }, [controller?.category_uuid]);

  // Filtered
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchProgram =
        selectedProgramCode === "all" || c.Program_Code === selectedProgramCode;
      const matchSearch =
        searchQuery === "" ||
        c.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.Candidate_Code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.studentClass?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.programTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchProgram && matchSearch;
    });
  }, [candidates, selectedProgramCode, searchQuery]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredCandidates.length === 0) return;
    const exportData = filteredCandidates.map((c, i) => ({
      "Sl No": i + 1,
      "Admission No": c.Candidate_Code,
      "Student Name": c.studentName,
      Class: c.studentClass,
      "Programme Code": c.Program_Code,
      "Programme Title": c.programTitle,
      Category: controller?.category_title,
    }));
    exportToExcel(
      exportData,
      `${controller?.category_title || "Category"}_Candidates_List`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
              <Layers size={13} />
              <span>{controller?.category_title || "Category"} Jurisdiction</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Candidate Registrations
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Review and manage all candidate registrations enrolled in {controller?.category_title} programmes.
              Generate official A4 evaluation/attendance sheets and export registers to Excel.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={fetchRegistrations}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredCandidates.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Total Candidates</span>
            <span className="text-2xl font-black text-white mt-1 block">{candidates.length}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Events with Entries</span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {new Set(candidates.map((c) => c.Program_Code)).size} / {categoryPrograms.length}
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Category Scope</span>
            <span className="text-xs font-bold text-amber-200 mt-1 block truncate">
              {controller?.category_title}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, admission number, class, or programme..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Calendar size={13} className="text-slate-400" />
            <select
              value={selectedProgramCode}
              onChange={(e) => setSelectedProgramCode(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold text-xs outline-none cursor-pointer max-w-xs truncate"
            >
              <option value="all">All Category Programmes ({categoryPrograms.length})</option>
              {categoryPrograms.map((p) => (
                <option key={p.Program_Code} value={p.Program_Code}>
                  {p.Program_Code} • {p.Program_Title}
                </option>
              ))}
            </select>
          </div>

          {selectedProgramCode !== "all" && (
            <button
              type="button"
              onClick={() => {
                const prg = categoryPrograms.find((p) => p.Program_Code === selectedProgramCode);
                if (prg) {
                  setSheetProgram({ code: prg.Program_Code, title: prg.Program_Title });
                }
              }}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Print official A4 evaluation sheet for this programme"
            >
              <Printer size={13} />
              <span>Print A4 Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Registrations List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 size={30} className="animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-bold text-slate-500">Loading registrations...</span>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-black text-slate-700">No Registrations Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No students have registered yet for the selected programme(s) under "{controller?.category_title}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Admission No</th>
                  <th className="py-3.5 px-4">Class</th>
                  <th className="py-3.5 px-4">Programme</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCandidates.map((cand, idx) => (
                  <tr key={cand.CandidateUUiD || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{cand.studentName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">#{cand.Candidate_Code}</td>
                    <td className="py-3 px-4">
                      {cand.studentClass ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {cand.studentClass}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="truncate max-w-xs font-bold text-slate-800" title={cand.programTitle}>
                        {cand.programTitle}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block">{cand.Program_Code}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSheetProgram({
                            code: cand.Program_Code,
                            title: cand.programTitle || cand.Program_Code,
                          })
                        }
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition border border-transparent hover:border-indigo-200 cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        title="Print candidate evaluation sheet"
                      >
                        <Printer size={13} />
                        <span>Sheet</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT SHEET MODAL */}
      {sheetProgram && (
        <PrintCandidateSheetModal
          isOpen={Boolean(sheetProgram)}
          programCode={sheetProgram.code}
          initialProgramTitle={sheetProgram.title}
          onClose={() => setSheetProgram(null)}
        />
      )}
    </div>
  );
}
