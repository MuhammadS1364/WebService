import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Printer, 
  X, 
  FileSpreadsheet,
  Users,
  CheckCircle2
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

interface SheetEntry {
  key: string;
  isGroup: boolean;
  addNo: string;
  name: string; // Candidate Real Name or Group Name
  subText?: string; // Teammates list (for group) or Father name (for individual)
  classNickName: string; // Short nickname of class (e.g. U6, U5, U4)
  district?: string;
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
  is_group_program?: boolean;
  is_topic_required?: boolean;
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
  const [sheetEntries, setSheetEntries] = useState<SheetEntry[]>([]);
  
  // Customization options for the printout (Attendance removed completely)
  const [sheetType, setSheetType] = useState<"evaluation" | "contestant">("evaluation");
  const [density, setDensity] = useState<"standard" | "compact" | "ultra">("compact");
  const [includeBlankRows, setIncludeBlankRows] = useState<boolean>(true);
  const [blankRowsCount, setBlankRowsCount] = useState<number>(10);
  const customNotes = "Official event document. Please maintain confidentiality.";
  const printableRef = useRef<HTMLDivElement>(null);

  // Helper to resolve Class Nickname (e.g. "U6", "U5", "U4", "U3")
  const getClassNickName = (classIdOrName?: string | null): string => {
    if (!classIdOrName) return "-";
    const trimmed = classIdOrName.trim();

    // 1. Match by class_id in meta.classes
    const byId = meta.classes.find((c: any) => c.class_id === trimmed);
    if (byId && (byId.class_nick_name || (byId as any).class_name)) {
      return byId.class_nick_name || (byId as any).class_name;
    }

    // 2. Match by standard_name or class_nick_name
    const byName = meta.classes.find(
      (c: any) =>
        (c.standard_name && c.standard_name.toLowerCase() === trimmed.toLowerCase()) ||
        (c.class_nick_name && c.class_nick_name.toLowerCase() === trimmed.toLowerCase()) ||
        ((c as any).class_name && (c as any).class_name.toLowerCase() === trimmed.toLowerCase())
    );
    if (byName && (byName.class_nick_name || (byName as any).class_name)) {
      return byName.class_nick_name || (byName as any).class_name;
    }

    // 3. Check if trimmed is already a short nickname (e.g., "U6", "U5", "U3", "U4")
    if (/^[A-Za-z0-9]{1,5}$/.test(trimmed)) {
      return trimmed;
    }

    // 4. Fallback: check standard name or return trimmed
    return byId?.standard_name || trimmed;
  };

  // Fetch programme & registered candidates with group/squad awareness
  useEffect(() => {
    if (!isOpen || !programCode) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch Program Info (includes is_group_program)
        const { data: progData, error: progErr } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*")
          .eq("Program_Code", programCode)
          .maybeSingle();

        if (progErr) throw progErr;
        const prog = (progData as ProgramInfo) || null;
        if (isMounted) {
          setProgramInfo(prog);
        }

        const isGroupProgram = Boolean(prog?.is_group_program);

        // 2. Fetch Candidate Registrations
        const { data: regRows, error: regErr } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code, CandidateUUiD, squad_uuid")
          .eq("Program_Code", programCode);

        if (regErr) throw regErr;
        const rawRegs = regRows || [];

        // 3. Extract unique Candidate Codes & Squad UUIDs
        const directCandidateCodes = Array.from(
          new Set(rawRegs.map((r: any) => (r.Candidate_Code || "").trim()).filter(Boolean))
        );
        const squadIds = Array.from(
          new Set(rawRegs.map((r: any) => r.squad_uuid).filter(Boolean))
        );

        // 4. Fetch Squads if applicable
        const squadMap: Record<string, any> = {};
        const squadMemberAddNos = new Set<string>();

        if (squadIds.length > 0) {
          const { data: squadData } = await SupaBaseFunction
            .from("SquadMate")
            .select("*")
            .in("squad_id", squadIds);

          if (squadData) {
            squadData.forEach((sq: any) => {
              if (sq.squad_id) {
                squadMap[sq.squad_id] = sq;
                [
                  sq.member1_uuid,
                  sq.member2_uuid,
                  sq.member3_uuid,
                  sq.member4_uuid,
                  sq.member5_uuid,
                  sq.member6_uuid,
                  sq.member7_uuid,
                ]
                  .filter(Boolean)
                  .forEach((m) => squadMemberAddNos.add((m as string).trim()));
              }
            });
          }
        }

        // 5. Collect all student AddNos to load from StudentsBox
        const allAddNos = Array.from(
          new Set([...directCandidateCodes, ...Array.from(squadMemberAddNos)])
        );

        let studentMap: Record<string, any> = {};
        if (allAddNos.length > 0) {
          // Note: StudentsBox has Stn_Class, StudentName, FatherName, etc. (No MobileNo)
          const { data: studentsData } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Stn_Class, FatherName, CollegeName, StnDistrict, StnState")
            .in("AddNo", allAddNos);

          if (studentsData) {
            studentsData.forEach((s: any) => {
              if (s.AddNo) {
                const trimmedCode = s.AddNo.trim();
                studentMap[trimmedCode] = s;
                studentMap[trimmedCode.toUpperCase()] = s;
                studentMap[trimmedCode.toLowerCase()] = s;
              }
            });
          }
        }

        // 6. Fetch content / topic submission titles
        let contentMap: Record<string, string> = {};
        if (allAddNos.length > 0) {
          try {
            const { data: contentData } = await SupaBaseFunction
              .from("Content_Table")
              .select("student_addNo, content_title")
              .eq("programe_code", programCode)
              .in("student_addNo", allAddNos);

            if (contentData) {
              contentData.forEach((c: any) => {
                if (c.student_addNo) contentMap[c.student_addNo.trim()] = c.content_title;
              });
            }
          } catch {
            // ignore
          }

          try {
            const { data: topicData } = await SupaBaseFunction
              .from("Topics_Box")
              .select("student_addNo, topic_title")
              .eq("program_code", programCode)
              .in("student_addNo", allAddNos);

            if (topicData) {
              topicData.forEach((t: any) => {
                if (t.student_addNo && t.topic_title) {
                  contentMap[t.student_addNo.trim()] = t.topic_title;
                }
              });
            }
          } catch {
            // ignore
          }
        }

        // 7. BUILD SHEET ENTRIES: Group vs Individual
        const entries: SheetEntry[] = [];

        if (isGroupProgram) {
          // GROUP PROGRAMME: Group registrations by Squad
          const seenSquads = new Set<string>();
          const seenIndividualCodes = new Set<string>();

          rawRegs.forEach((r: any) => {
            const sqId = r.squad_uuid;
            if (sqId && squadMap[sqId]) {
              if (seenSquads.has(sqId)) return;
              seenSquads.add(sqId);

              const sq = squadMap[sqId];
              const memberAddNos = [
                sq.member1_uuid,
                sq.member2_uuid,
                sq.member3_uuid,
                sq.member4_uuid,
                sq.member5_uuid,
                sq.member6_uuid,
                sq.member7_uuid,
              ]
                .map((m) => m?.trim())
                .filter(Boolean) as string[];

              // Resolve each teammate's real name and class nickname
              const teammateDetails = memberAddNos.map((addNo) => {
                const stn = studentMap[addNo] || studentMap[addNo.toUpperCase()];
                const realName = stn?.StudentName || addNo;
                const nick = getClassNickName(stn?.Stn_Class);
                return { addNo, name: realName, classNick: nick };
              });

              const teammateNamesStr = teammateDetails
                .map((t) => `${t.name} (${t.addNo})`)
                .join(", ");

              const uniqueClasses = Array.from(
                new Set(teammateDetails.map((t) => t.classNick).filter((c) => c && c !== "-"))
              ).join(", ") || "-";

              entries.push({
                key: `squad_${sqId}`,
                isGroup: true,
                addNo: memberAddNos.join(", "),
                name: sq.squad_title || "Group Squad",
                subText: teammateDetails.length > 0 ? `Teammates: ${teammateNamesStr}` : undefined,
                classNickName: uniqueClasses,
                district: "",
                contentTitle: contentMap[memberAddNos[0]] || "",
              });
            } else if (!sqId) {
              // Individual participant inside a group programme
              const code = (r.Candidate_Code || "").trim();
              if (!code || seenIndividualCodes.has(code)) return;
              seenIndividualCodes.add(code);

              const stn = studentMap[code] || studentMap[code.toUpperCase()];
              entries.push({
                key: `cand_${r.CandidateUUiD || code}`,
                isGroup: false,
                addNo: code,
                name: stn?.StudentName || code,
                subText: stn?.FatherName ? `S/O ${stn.FatherName}` : undefined,
                classNickName: getClassNickName(stn?.Stn_Class),
                district: stn?.StnDistrict || "",
                contentTitle: contentMap[code] || "",
              });
            }
          });
        } else {
          // INDIVIDUAL PROGRAMME: Display individual students with real names and class nickname
          const seenCodes = new Set<string>();

          rawRegs.forEach((r: any) => {
            const code = (r.Candidate_Code || "").trim();
            if (!code || seenCodes.has(code)) return;
            seenCodes.add(code);

            const stn = studentMap[code] || studentMap[code.toUpperCase()];
            entries.push({
              key: `cand_${r.CandidateUUiD || code}`,
              isGroup: false,
              addNo: code,
              name: stn?.StudentName || code,
              subText: stn?.FatherName ? `S/O ${stn.FatherName}` : undefined,
              classNickName: getClassNickName(stn?.Stn_Class),
              district: stn?.StnDistrict || "",
              contentTitle: contentMap[code] || "",
            });
          });
        }

        if (isMounted) {
          setSheetEntries(entries);
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
  }, [isOpen, programCode, meta.classes, meta.classMap]);

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

  // Reliable Native Print Mechanism via Isolated Iframe (with window.print() fallback)
  const handlePrint = () => {
    try {
      let iframe = document.getElementById("print-candidate-sheet-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "print-candidate-sheet-iframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";
        document.body.appendChild(iframe);
      }

      const printableElement = document.getElementById("candidate-sheet-a4-container");
      if (printableElement && iframe.contentWindow) {
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${programInfo?.Program_Title || programCode} - Candidate Sheet</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 8mm 10mm 8mm 10mm;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: Arial, Helvetica, sans-serif;
                  color: #000;
                  background: #fff;
                  font-size: 11px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  border: 1.5px solid #0f172a;
                  table-layout: fixed;
                }
                th, td {
                  border: 1px solid #0f172a;
                  padding: 6px 8px;
                  vertical-align: middle;
                }
                th {
                  background-color: #f1f5f9 !important;
                  font-weight: 800;
                  text-align: center;
                }
                tr {
                  page-break-inside: avoid;
                }
                .font-mono { font-family: monospace; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .font-extrabold { font-weight: 800; }
                .text-xs { font-size: 11px; }
                .text-sm { font-size: 12px; }
                .border { border: 1px solid #cbd5e1; }
                .rounded { border-radius: 4px; }
                .p-2 { padding: 6px; }
                .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
                .header-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px; border-radius: 4px; }
                .meta-label { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; }
                .meta-value { font-size: 11px; font-weight: bold; color: #0f172a; }
              </style>
            </head>
            <body>
              ${printableElement.innerHTML}
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn("Iframe print error, falling back to window.print():", e);
            window.focus();
            window.print();
          }
        }, 250);
        return;
      }
    } catch (err) {
      console.warn("Could not use iframe print, falling back to window.print():", err);
    }

    // Fallback: standard window.print()
    window.focus();
    window.print();
  };

  // Export to Excel / CSV (No attendance column)
  const handleExportExcel = () => {
    if (sheetEntries.length === 0) return;
    const isGroup = Boolean(programInfo?.is_group_program);

    const rows = sheetEntries.map((c, i) => ({
      "Sr No": i + 1,
      [isGroup ? "Member Add Nos" : "Add No"]: c.addNo,
      [isGroup ? "Group Name" : "Candidate Name"]: c.name,
      [isGroup ? "Teammates" : "Father Name"]: c.subText || "",
      "Class Nickname": c.classNickName,
      "Score": "",
      "Signature / Remarks": "",
    }));

    exportToExcel(
      rows,
      `Candidate_Sheet_${programCode}_${new Date().toISOString().slice(0, 10)}`,
      "CandidateSheet"
    );
  };

  if (!isOpen) return null;

  // Density styles for table cells
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

  const isGroupProg = Boolean(programInfo?.is_group_program);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Print-specific style tag: portrait A4, crisp borders, page breaks avoided inside rows */}
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
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                  {isGroupProg ? <Users size={12} /> : null}
                  {sheetEntries.length} {isGroupProg ? "Groups" : "Registered"}
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
              disabled={sheetEntries.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Download Excel / CSV format"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
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
        {/* PRINT CONTROLS TOOLBAR (Screen Only - Attendance Removed)   */}
        {/* ============================================================ */}
        <div className="no-print bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sheet Type (Attendance Removed) */}
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
                title="Standard spacing"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  density === "compact" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Compact spacing (Guaranteed 1-Page fit for 25+ rows)"
              >
                Compact (1-Page)
              </button>
              <button
                type="button"
                onClick={() => setDensity("ultra")}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  density === "ultra" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Ultra-compact for 30+ entries"
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
                <div className="flex items-center gap-1">
                  <select
                    value={blankRowsCount}
                    onChange={(e) => setBlankRowsCount(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-hidden cursor-pointer"
                    title="Number of blank on-spot rows (default 10)"
                  >
                    <option value={5}>5 Rows</option>
                    <option value={10}>10 Rows (Default)</option>
                    <option value={15}>15 Rows</option>
                    <option value={20}>20 Rows</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Ready for 1-Page A4 PDF</span>
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DOCUMENT PREVIEW & PRINT AREA                                */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {loading ? (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-violet-600 mx-auto mb-3"></div>
              <p className="text-sm font-bold text-slate-600">Generating Official Candidate Sheet...</p>
            </div>
          ) : (
            /* ============================================================ */
            /* A4 PRINTABLE DOCUMENT CONTAINER                             */
            /* ============================================================ */
            <div 
              id="candidate-sheet-a4-container"
              ref={printableRef}
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
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Format & Category</div>
                    <div className="font-bold text-slate-900 truncate">
                      {isGroupProg ? "Group Event" : "Individual"} • {categoryName}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Scheduled Date</div>
                    <div className="font-bold text-slate-900 truncate">
                      {programInfo?.Date ? new Date(programInfo.Date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Venue & Enrolled</div>
                    <div className="font-bold text-slate-900 truncate">
                      {venueName} • <span className="font-black text-violet-700">{sheetEntries.length} {isGroupProg ? "Groups" : "Candidates"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- CANDIDATES TABLE (NO ATTENDANCE COLUMN) --- */}
              <div className="w-full overflow-x-auto print:overflow-visible my-2">
                <table className="w-full border-collapse border border-slate-900 text-left text-xs table-fixed">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-950 font-black">
                      <th className={`border border-slate-900 ${headerPadding} text-center w-10 shrink-0`}>
                        Sr.
                      </th>
                      <th className={`border border-slate-900 ${headerPadding} text-center w-24 shrink-0 font-mono`}>
                        {isGroupProg ? "Teammate AddNos" : "Add No"}
                      </th>
                      <th className={`border border-slate-900 ${headerPadding} w-[42%]`}>
                        {isGroupProg ? "Group Name & Teammates" : "Candidate Full Name"}
                      </th>
                      <th className={`border border-slate-900 ${headerPadding} text-center w-20 shrink-0`}>
                        Class
                      </th>
                      
                      {sheetType === "evaluation" && (
                        <>
                          <th className={`border border-slate-900 ${headerPadding} text-center w-24 shrink-0`}>
                            Score
                          </th>
                          <th className={`border border-slate-900 ${headerPadding} text-center w-28 shrink-0`}>
                            Remarks / Sign
                          </th>
                        </>
                      )}

                      {sheetType === "contestant" && (
                        <>
                          <th className={`border border-slate-900 ${headerPadding} w-[34%]`}>
                            Content / Topic
                          </th>
                          <th className={`border border-slate-900 ${headerPadding} text-center w-24 shrink-0`}>
                            Signature
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sheetEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border border-slate-900 py-8 text-center font-bold text-slate-500">
                          No {isGroupProg ? "groups" : "candidates"} registered yet for this programme ({programCode}).
                        </td>
                      </tr>
                    ) : (
                      sheetEntries.map((item, idx) => (
                        <tr 
                          key={item.key || idx}
                          className="border-b border-slate-800 hover:bg-slate-50 print:hover:bg-transparent"
                        >
                          <td className={`border border-slate-900 ${cellPadding} text-center font-bold text-slate-700`}>
                            {idx + 1}
                          </td>
                          <td className={`border border-slate-900 ${cellPadding} text-center font-mono font-bold text-slate-950 break-words leading-tight`}>
                            {item.addNo}
                          </td>
                          <td className={`border border-slate-900 ${cellPadding} font-bold text-slate-950 break-words leading-snug`}>
                            {/* Display GroupName or Student Name */}
                            <div className="font-extrabold text-slate-950 text-[12px] sm:text-xs">
                              {item.name}
                            </div>
                            {/* Display Teammates just below the GroupName, or Father Name for individual */}
                            {item.subText && (
                              <div className="text-[10px] text-slate-700 font-medium mt-0.5 leading-snug">
                                {item.subText}
                              </div>
                            )}
                          </td>
                          <td className={`border border-slate-900 ${cellPadding} text-center text-slate-950 font-bold tracking-wide`}>
                            {item.classNickName}
                          </td>

                          {sheetType === "evaluation" && (
                            <>
                              <td className={`border border-slate-900 ${cellPadding} text-center font-mono text-slate-400`}>
                                &nbsp;
                              </td>
                              <td className={`border border-slate-900 ${cellPadding} text-center font-mono text-slate-400`}>
                                &nbsp;
                              </td>
                            </>
                          )}

                          {sheetType === "contestant" && (
                            <>
                              <td className={`border border-slate-900 ${cellPadding} text-slate-900 font-medium truncate`} title={item.contentTitle || ""}>
                                {item.contentTitle || "-"}
                              </td>
                              <td className={`border border-slate-900 ${cellPadding} text-center font-mono text-slate-400`}>
                                &nbsp;
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}

                    {/* Optional Blank Extra Rows (NO ATTENDANCE COLUMN) */}
                    {includeBlankRows &&
                      Array.from({ length: blankRowsCount }).map((_, bIdx) => (
                        <tr key={`blank-row-${bIdx}`} className="border-b border-slate-800">
                          <td className={`border border-slate-900 ${cellPadding} text-center text-slate-400 font-mono`}>
                            {sheetEntries.length + bIdx + 1}
                          </td>
                          <td className={`border border-slate-900 ${cellPadding} text-center text-slate-300`}>
                            &nbsp;
                          </td>
                          <td className={`border border-slate-900 ${cellPadding} text-slate-300`}>
                            &nbsp;
                          </td>
                          <td className={`border border-slate-900 ${cellPadding} text-center text-slate-300`}>
                            &nbsp;
                          </td>
                          {sheetType === "evaluation" && (
                            <>
                              <td className={`border border-slate-900 ${cellPadding} text-center text-slate-300 font-mono`}>
                                &nbsp;
                              </td>
                              <td className={`border border-slate-900 ${cellPadding} text-center text-slate-300 font-mono`}>
                                &nbsp;
                              </td>
                            </>
                          )}
                          {sheetType === "contestant" && (
                            <>
                              <td className={`border border-slate-900 ${cellPadding} text-slate-300`}>
                                &nbsp;
                              </td>
                              <td className={`border border-slate-900 ${cellPadding} text-center text-slate-300 font-mono`}>
                                &nbsp;
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
