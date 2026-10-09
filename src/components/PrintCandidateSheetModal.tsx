import { useState, useEffect, useMemo } from "react";
import { 
  Printer, 
  X, 
  FileSpreadsheet
} from "lucide-react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import { exportToExcel } from "../lib/excelService";

export interface PrintCandidateSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  programCode: string;
  initialProgramTitle?: string;
}

interface CandidateItem {
  candidateCode: string;
  candidateUuid: string;
  registeredAt?: string;
  studentName: string;
  studentClass: string;
  fatherName?: string;
  contact?: string;
  district?: string;
  state?: string;
  contentTitle?: string;
}

interface ProgramInfo {
  Program_Code: string;
  Program_Title: string;
  Date: string | null;
  Venue: string | null;
  Category: string | null;
  Group: string | null;
  WingCode: string | null;
  Total_Registration: number | null;
  ContentSubmition_required?: boolean;
}

export default function PrintCandidateSheetModal({
  isOpen,
  onClose,
  programCode,
  initialProgramTitle,
}: PrintCandidateSheetModalProps) {
  const meta = useProgrammeMeta();
  const [loading, setLoading] = useState<boolean>(true);
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  
  // Customization options for the printout
  const [sheetType, setSheetType] = useState<"evaluation" | "attendance" | "contestant">("evaluation");
  const [density, setDensity] = useState<"standard" | "compact" | "ultra">("compact");
  const [includeBlankRows, setIncludeBlankRows] = useState<boolean>(true);
  const [blankRowsCount, setBlankRowsCount] = useState<number>(3);
  const [customNotes, setCustomNotes] = useState<string>("Official event document. Please maintain confidentiality.");

  // Fetch programme & registered candidates
  useEffect(() => {
    if (!isOpen || !programCode) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch Program Info
        const { data: progData, error: progErr } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*")
          .eq("Program_Code", programCode)
          .maybeSingle();

        if (progErr) throw progErr;
        if (isMounted && progData) {
          setProgramInfo(progData as ProgramInfo);
        }

        // 2. Fetch Candidate Registrations
        const { data: regRows, error: regErr } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code, CandidateUUiD, created_at")
          .eq("Program_Code", programCode)
          .order("created_at", { ascending: true });

        if (regErr) throw regErr;

        const regList = (regRows || []).map((r) => ({
          code: (r.Candidate_Code || "").trim(),
          uuid: r.CandidateUUiD,
          date: r.created_at,
        })).filter(r => Boolean(r.code));

        const uniqueCodes = Array.from(new Set(regList.map(r => r.code)));

        // 3. Fetch Student details for these codes
        let studentMap: Record<string, any> = {};
        if (uniqueCodes.length > 0) {
          const { data: studentsData } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Class, Stn_Class, FatherName, MobileNo, StnDistrict, StnState")
            .in("AddNo", uniqueCodes);

          if (studentsData) {
            studentsData.forEach((s: any) => {
              if (s.AddNo) studentMap[s.AddNo.trim()] = s;
            });
          }
        }

        // 4. Fetch content submission titles if applicable
        let contentMap: Record<string, string> = {};
        if (uniqueCodes.length > 0) {
          const { data: contentData } = await SupaBaseFunction
            .from("Content_Table")
            .select("student_addNo, content_title")
            .eq("programe_code", programCode)
            .in("student_addNo", uniqueCodes);

          if (contentData) {
            contentData.forEach((c: any) => {
              if (c.student_addNo) contentMap[c.student_addNo.trim()] = c.content_title;
            });
          }
        }

        // 5. Combine into CandidateItem
        const candidateItems: CandidateItem[] = regList.map((reg) => {
          const stn = studentMap[reg.code];
          let resolvedClass = "General";
          if (stn) {
            if (stn.Stn_Class && meta.classMap[stn.Stn_Class]) {
              resolvedClass = meta.classMap[stn.Stn_Class];
            } else if (stn.Class) {
              const matched = meta.classes.find(
                (c) => c.standard_name === stn.Class || c.class_nick_name === stn.Class
              );
              resolvedClass = matched ? matched.standard_name : stn.Class;
            }
          }

          return {
            candidateCode: reg.code,
            candidateUuid: reg.uuid,
            registeredAt: reg.date,
            studentName: stn?.StudentName || `Candidate (${reg.code})`,
            studentClass: resolvedClass,
            fatherName: stn?.FatherName || "",
            contact: stn?.MobileNo || "",
            district: stn?.StnDistrict || "",
            state: stn?.StnState || "",
            contentTitle: contentMap[reg.code] || "",
          };
        });

        if (isMounted) {
          setCandidates(candidateItems);
        }
      } catch (err) {
        console.error("Failed to load candidate sheet data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, programCode, meta.classMap, meta.classes]);

  // Derived metadata names
  const wingName = useMemo(() => {
    if (!programInfo?.WingCode) return "General Department";
    return meta.wingMap[programInfo.WingCode] || programInfo.WingCode;
  }, [programInfo?.WingCode, meta.wingMap]);

  const venueName = useMemo(() => {
    if (!programInfo?.Venue) return "TBA / Main Campus";
    return meta.venueMap[programInfo.Venue] || programInfo.Venue;
  }, [programInfo?.Venue, meta.venueMap]);

  const categoryName = useMemo(() => {
    if (!programInfo?.Category) return "Open / All Categories";
    return meta.categoryMap[programInfo.Category] || programInfo.Category;
  }, [programInfo?.Category, meta.categoryMap]);

  // Trigger Native Browser Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (candidates.length === 0) return;
    const rows = candidates.map((c, i) => ({
      "Sr No": i + 1,
      "Candidate ID / Add No": c.candidateCode,
      "Candidate Name": c.studentName,
      "Class / Grade": c.studentClass,
      "District": c.district,
      "Contact": c.contact,
      "Submitted Content": c.contentTitle || "N/A",
      "Attendance Status": "",
      "Marks Obtained": "",
      "Judge Remarks": "",
      "Signature": ""
    }));

    exportToExcel(
      rows,
      `Candidate_Sheet_${programCode}_${new Date().toISOString().slice(0, 10)}`,
      "CandidateSheet"
    );
  };

  if (!isOpen) return null;

  // Density styles for table cells to guarantee fitting onto 1 A4 page
  const cellPadding = density === "ultra" 
    ? "py-1 px-1.5 text-[10px]" 
    : density === "compact" 
    ? "py-1.5 px-2 text-[11px]" 
    : "py-2 px-3 text-xs";

  const headerPadding = density === "ultra" 
    ? "py-1 px-1.5 text-[10px]" 
    : density === "compact" 
    ? "py-1.5 px-2 text-[11px]" 
    : "py-2 px-3 text-xs";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Print-specific style tag: ensures portrait A4, crisp borders, no collapsing, page breaks avoided inside rows */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #candidate-sheet-a4-container, #candidate-sheet-a4-container * {
            visibility: visible !important;
          }
          #candidate-sheet-a4-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto !important;
            table-layout: fixed !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            color: #000000 !important;
            border-color: #334155 !important;
          }
        }
      `}</style>

      {/* Main Modal Container */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:h-auto print:rounded-none print:border-none print:shadow-none">
        
        {/* ============================================================ */}
        {/* HEADER TOOLBAR (Screen Only - Hidden in Print)              */}
        {/* ============================================================ */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Print Candidate Sheet (A4)
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {candidates.length} Registered
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official high-density A4 layout • Designed to not collapse when exported to PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={candidates.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Download Excel / CSV format"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRINT CONTROLS TOOLBAR (Screen Only)                         */}
        {/* ============================================================ */}
        <div className="no-print bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sheet Type */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 px-1.5">Mode:</span>
              <button
                type="button"
                onClick={() => setSheetType("evaluation")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  sheetType === "evaluation"
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Evaluation & Marks
              </button>
              <button
                type="button"
                onClick={() => setSheetType("attendance")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  sheetType === "attendance"
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Attendance Sheet
              </button>
              <button
                type="button"
                onClick={() => setSheetType("contestant")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  sheetType === "contestant"
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Simple Contestant List
              </button>
            </div>

            {/* Density Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 px-1.5" title="Control table density to ensure 1-page fit">
                Fit A4:
              </span>
              <button
                type="button"
                onClick={() => setDensity("standard")}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  density === "standard" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Standard spacing (up to 12 candidates)"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  density === "compact" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Compact spacing (up to 25 candidates on 1 page)"
              >
                Compact (1-Page)
              </button>
              <button
                type="button"
                onClick={() => setDensity("ultra")}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  density === "ultra" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Ultra-compact for 30+ candidates"
              >
                Ultra-Compact
              </button>
            </div>

            {/* Blank Rows Controls */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBlankRows}
                  onChange={(e) => setIncludeBlankRows(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>Include Blank Rows</span>
              </label>
              {includeBlankRows && (
                <select
                  value={blankRowsCount}
                  onChange={(e) => setBlankRowsCount(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-hidden"
                  title="Number of blank on-spot rows"
                >
                  <option value={1}>1 Row</option>
                  <option value={2}>2 Rows</option>
                  <option value={3}>3 Rows</option>
                  <option value={5}>5 Rows</option>
                  <option value={8}>8 Rows</option>
                </select>
              )}
            </div>

            {/* Custom Notes input */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400">Note:</span>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Footer note..."
                className="text-[11px] text-slate-700 bg-transparent outline-hidden w-36 sm:w-56 truncate"
              />
            </div>
          </div>

          <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            ✓ Ready for 1-Page A4 PDF
          </div>
        </div>

        {/* ============================================================ */}
        {/* SCROLLABLE SHEET PREVIEW & PRINTABLE CANVAS                 */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Generating Official Candidate Sheet...</p>
            </div>
          ) : (
            /* ============================================================ */
            /* A4 PRINTABLE DOCUMENT CONTAINER                             */
            /* ============================================================ */
            <div 
              id="candidate-sheet-a4-container"
              className="w-full max-w-[210mm] bg-white text-slate-900 border border-slate-300 shadow-xl p-6 sm:p-8 rounded-sm print:max-w-none print:w-full print:border-none print:shadow-none print:p-0"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                boxSizing: "border-box"
              }}
            >
              
              {/* --- OFFICIAL HEADER --- */}
              <div className="border-b-2 border-slate-900 pb-3 mb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest font-black text-slate-600">
                      OFFICIAL EVENT DOCUMENTATION • REGISTERED CANDIDATE SHEET
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight mt-0.5">
                      {programInfo?.Program_Title || initialProgramTitle || "Programme Candidate Sheet"}
                    </h1>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 border border-slate-900 font-mono font-black text-xs bg-slate-50 rounded">
                      CODE: {programCode}
                    </span>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">
                      Print Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>

                {/* --- PROGRAMME METADATA 4-BOX GRID --- */}
                <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-300 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Wing / Dept</div>
                    <div className="font-bold text-slate-900 truncate">{wingName}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Category & Group</div>
                    <div className="font-bold text-slate-900 truncate">{categoryName} • {programInfo?.Group || "Single"}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Scheduled Date</div>
                    <div className="font-bold text-slate-900 truncate">
                      {programInfo?.Date ? new Date(programInfo.Date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Venue & Enrolled</div>
                    <div className="font-bold text-slate-900 truncate">{venueName} • <span className="font-black text-violet-700">{candidates.length} Registered</span></div>
                  </div>
                </div>
              </div>

              {/* --- CANDIDATES TABLE --- */}
              <div className="w-full overflow-hidden">
                <table className="w-full border-collapse border border-slate-800 text-left text-xs table-fixed">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-900 font-black">
                      <th className={`border border-slate-800 ${headerPadding} text-center w-[7%]`}>
                        Sr.
                      </th>
                      <th className={`border border-slate-800 ${headerPadding} text-center w-[15%]`}>
                        Add No / ID
                      </th>
                      <th className={`border border-slate-800 ${headerPadding} w-[30%]`}>
                        Candidate Full Name
                      </th>
                      <th className={`border border-slate-800 ${headerPadding} text-center w-[14%]`}>
                        Class / Grade
                      </th>
                      
                      {sheetType === "evaluation" && (
                        <>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[10%]`}>
                            Attendance
                          </th>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[12%]`}>
                            Score / Marks
                          </th>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[12%]`}>
                            Signature
                          </th>
                        </>
                      )}

                      {sheetType === "attendance" && (
                        <>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[14%]`}>
                            District / Place
                          </th>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[10%]`}>
                            Status
                          </th>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[14%]`}>
                            Candidate Sign
                          </th>
                        </>
                      )}

                      {sheetType === "contestant" && (
                        <>
                          <th className={`border border-slate-800 ${headerPadding} text-center w-[14%]`}>
                            District / Place
                          </th>
                          <th className={`border border-slate-800 ${headerPadding} w-[20%]`}>
                            Content / Topic
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-slate-800 py-6 text-center font-bold text-slate-500">
                          No candidates registered yet for this programme ({programCode}).
                        </td>
                      </tr>
                    ) : (
                      candidates.map((cand, idx) => (
                        <tr 
                          key={cand.candidateCode || idx}
                          className="border-b border-slate-700 hover:bg-slate-50 print:hover:bg-transparent"
                        >
                          <td className={`border border-slate-800 ${cellPadding} text-center font-bold text-slate-700`}>
                            {idx + 1}
                          </td>
                          <td className={`border border-slate-800 ${cellPadding} text-center font-mono font-bold text-slate-900`}>
                            {cand.candidateCode}
                          </td>
                          <td className={`border border-slate-800 ${cellPadding} font-bold text-slate-950 truncate`}>
                            {cand.studentName}
                          </td>
                          <td className={`border border-slate-800 ${cellPadding} text-center text-slate-700 truncate`}>
                            {cand.studentClass}
                          </td>

                          {sheetType === "evaluation" && (
                            <>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-[10px]`}>
                                <div className="flex items-center justify-center gap-1 font-mono text-slate-600">
                                  <span>[ ] P</span>
                                  <span>[ ] A</span>
                                </div>
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300 font-mono`}>
                                ________
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300 font-mono`}>
                                ________
                              </td>
                            </>
                          )}

                          {sheetType === "attendance" && (
                            <>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-600 truncate`}>
                                {cand.district || cand.state || "-"}
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-[10px]`}>
                                <div className="flex items-center justify-center gap-1 font-mono text-slate-600">
                                  <span>[ ] P</span>
                                  <span>[ ] A</span>
                                </div>
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300 font-mono`}>
                                ________
                              </td>
                            </>
                          )}

                          {sheetType === "contestant" && (
                            <>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-600 truncate`}>
                                {cand.district || cand.state || "-"}
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-slate-700 truncate`}>
                                {cand.contentTitle || "-"}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}

                    {/* Optional Blank Extra Rows for on-the-spot registrations or manual judge additions */}
                    {includeBlankRows &&
                      Array.from({ length: blankRowsCount }).map((_, bIdx) => (
                        <tr key={`blank-row-${bIdx}`} className="border-b border-slate-700">
                          <td className={`border border-slate-800 ${cellPadding} text-center text-slate-400 font-mono`}>
                            {candidates.length + bIdx + 1}
                          </td>
                          <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300`}>
                            _______
                          </td>
                          <td className={`border border-slate-800 ${cellPadding} text-slate-300`}>
                            _________________________
                          </td>
                          <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300`}>
                            _______
                          </td>
                          {sheetType === "evaluation" && (
                            <>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-[10px] text-slate-400 font-mono`}>
                                [ ] P  [ ] A
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300 font-mono`}>
                                ________
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300 font-mono`}>
                                ________
                              </td>
                            </>
                          )}
                          {sheetType === "attendance" && (
                            <>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300`}>
                                _______
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-[10px] text-slate-400 font-mono`}>
                                [ ] P  [ ] A
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300 font-mono`}>
                                ________
                              </td>
                            </>
                          )}
                          {sheetType === "contestant" && (
                            <>
                              <td className={`border border-slate-800 ${cellPadding} text-center text-slate-300`}>
                                _______
                              </td>
                              <td className={`border border-slate-800 ${cellPadding} text-slate-300`}>
                                _______
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* --- OFFICIAL SIGN-OFF FOOTER --- */}
              <div className="mt-6 pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800 break-inside-avoid">
                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                  <div className="font-bold">Programme Coordinator</div>
                  <div className="text-[10px] text-slate-500">Name & Signature</div>
                </div>

                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                  <div className="font-bold">Evaluator / Judge</div>
                  <div className="text-[10px] text-slate-500">Signature & Remarks</div>
                </div>

                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                  <div className="font-bold">Wing Manager / Authorized Stamp</div>
                  <div className="text-[10px] text-slate-500">Official Verification</div>
                </div>
              </div>

              {/* --- FOOTER LEGAL NOTE --- */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400">
                <span>{customNotes}</span>
                <span>Page 1 of 1 • System Generated Sheet</span>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
