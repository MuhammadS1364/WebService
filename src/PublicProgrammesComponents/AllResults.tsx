import { useState, useEffect, useMemo } from "react";
import { useLocation, Link, useParams } from "react-router-dom";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import ProgrammeResultModal from "../components/ProgrammeResultModal";
import ResultExportModal from "../components/ResultExportModal";
import {
  exportResultsToPdf,
  type PdfExportProgramItem,
  type PdfExportWinnerItem,
} from "../lib/pdfResultService";
import { exportResultsToExcel } from "../lib/excelResultService";
import dhiuLogo from "../ImgBox/Dhiu.jpg";
import {
  Trophy,
  Search,
  Download,
  Calendar,
  MapPin,
  Printer,
  RotateCcw,
  X,
  FileSpreadsheet,
  FileDown,
  Table,
  FileText,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { ResultBoxRecord } from "../lib/types";
import { hydrateResultRecords, deleteOfficialResult } from "../lib/resultService";

interface StudentInfo {
  AddNo: string;
  StudentName: string;
  Class: string;
  CollegeName?: string;
  Student_Photo_Urls?: string;
  Stn_Class?: string;
}

export interface EnrichedResult extends ResultBoxRecord {
  programme?: {
    Program_Title: string | null;
    Program_Code: string;
    Date: string | null;
    Venue: string | null;
    Category: string | null;
    WingCode: string | null;
    Group: string | null;
    is_group_program?: boolean;
    Program_Poster?: string | null;
    IsResultPublished?: boolean;
    IsResulted?: boolean;
    points_template?: string | null;
  } | null;
  firstStudent?: StudentInfo | null;
  secondStudent?: StudentInfo | null;
  thirdStudent?: StudentInfo | null;
  aGradeStudent?: StudentInfo | null;
  bGradeStudent?: StudentInfo | null;
  firstStudentsList?: StudentInfo[];
  secondStudentsList?: StudentInfo[];
  thirdStudentsList?: StudentInfo[];
  aGradeStudentsList?: StudentInfo[];
  bGradeStudentsList?: StudentInfo[];
  firstSquadTitle?: string | null;
  secondSquadTitle?: string | null;
  thirdSquadTitle?: string | null;
  aGradeSquadTitle?: string | null;
  bGradeSquadTitle?: string | null;
}

/**
 * Flexible Date Parser supporting DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
const parseFlexibleDate = (val?: string | null): Date | null => {
  if (!val) return null;
  const str = val.trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

export default function AllResultsList() {
  const meta = useProgrammeMeta();
  const location = useLocation();
  const { actUser } = useParams<{ actUser?: string }>();
  const isAdmin = location.pathname.includes("/admin-panel");

  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Admin View Mode & Export States
  const [adminViewMode, setAdminViewMode] = useState<"table" | "judgements">("table");
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Delete State (Admin only)
  const [programToDelete, setProgramToDelete] = useState<{ code: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteStatus, setDeleteStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [wingFilter, setWingFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [publicationFilter, setPublicationFilter] = useState<"published" | "all">("published");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedResultModal, setSelectedResultModal] = useState<EnrichedResult | null>(null);

  const handleDeleteConfirm = async () => {
    if (!programToDelete || !isAdmin) return;
    try {
      setIsDeleting(true);
      setDeleteStatus(null);
      const res = await deleteOfficialResult(programToDelete.code);
      if (!res.success) {
        throw new Error(res.message);
      }
      setResults((prev) => prev.filter((r) => r.Program_Id !== programToDelete.code));
      setDeleteStatus({ type: "success", text: res.message });
      setProgramToDelete(null);
    } catch (err: any) {
      console.error("Admin delete result error:", err);
      setDeleteStatus({
        type: "error",
        text: "Failed to delete result: " + (err.message || "Unknown error"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch from ResultBox
      const { data: rawResultRows, error: resultError } = await SupaBaseFunction
        .from("ResultBox")
        .select("*")
        .order("Result_id", { ascending: false });

      if (resultError) throw resultError;
      if (!rawResultRows || rawResultRows.length === 0) {
        setResults([]);
        return;
      }

      const resultRows = await hydrateResultRecords(rawResultRows);

      // 2. Fetch associated ProgrammesBox
      const progCodes = Array.from(new Set(resultRows.map((r: ResultBoxRecord) => r.Program_Id).filter(Boolean))) as string[];
      let progsMap: Record<string, any> = {};
      if (progCodes.length > 0) {
        const { data: progRows } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("*")
          .in("Program_Code", progCodes);

        (progRows || []).forEach((p: any) => {
          progsMap[p.Program_Code] = p;
        });
      }

      // 3. Collect ALL Candidate / Winner AddNos across individual and squads
      const candidateCodeSet = new Set<string>();
      resultRows.forEach((r: any) => {
        (r.firstHolderAddNos || (r.First_Holder ? r.First_Holder.split(",") : [])).forEach((s: string) => s && candidateCodeSet.add(s.trim().toUpperCase()));
        (r.secondHolderAddNos || (r.Second_Holder ? r.Second_Holder.split(",") : [])).forEach((s: string) => s && candidateCodeSet.add(s.trim().toUpperCase()));
        (r.thirdHolderAddNos || (r.Third_Holder ? r.Third_Holder.split(",") : [])).forEach((s: string) => s && candidateCodeSet.add(s.trim().toUpperCase()));
        (r.aGradeAddNos || (r.AGrade ? r.AGrade.split(",") : [])).forEach((s: string) => s && candidateCodeSet.add(s.trim().toUpperCase()));
        (r.bGradeAddNos || (r.BGrade ? r.BGrade.split(",") : [])).forEach((s: string) => s && candidateCodeSet.add(s.trim().toUpperCase()));

        [r.First_Holder, r.Second_Holder, r.Third_Holder, r.AGrade, r.BGrade].forEach((val: string) => {
          if (val && !val.includes(",")) candidateCodeSet.add(val.trim().toUpperCase());
        });
      });

      let studentsMap: Record<string, StudentInfo> = {};
      const allCodes = Array.from(candidateCodeSet);
      if (allCodes.length > 0) {
        const { data: studentRows, error: stnError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
          .in("AddNo", allCodes);

        if (stnError) console.warn("Error loading student records in AllResults:", stnError);

        (studentRows || []).forEach((s: any) => {
          const matchedClass = meta.classes.find(
            (c: any) =>
              c.class_id === s.Stn_Class ||
              c.standard_name === s.Stn_Class ||
              c.class_nick_name === s.Stn_Class
          );
          const resolvedClass =
            matchedClass?.standard_name && matchedClass?.class_nick_name
              ? `${matchedClass.standard_name} (${matchedClass.class_nick_name})`
              : matchedClass?.standard_name || matchedClass?.class_nick_name || s.Stn_Class || "Standard Class";

          studentsMap[s.AddNo.toUpperCase()] = {
            ...s,
            Class: resolvedClass,
          };
        });
      }

      // Helper to resolve list of student objects
      const getStudentsList = (addNos?: string[], rawStr?: string | null): StudentInfo[] => {
        const codes = addNos && addNos.length > 0
          ? addNos
          : rawStr ? rawStr.split(",").map((s) => s.trim()) : [];

        return codes
          .map((c) => {
            const clean = c.toUpperCase();
            return (
              studentsMap[clean] || {
                AddNo: c,
                StudentName: c,
                Class: "Assigned Class",
                CollegeName: "Campus",
              }
            );
          })
          .filter(Boolean);
      };

      // 4. Combine into EnrichedResult with full holder lists
      const combined: EnrichedResult[] = resultRows.map((r: any) => {
        const firstList = getStudentsList(r.firstHolderAddNos, r.First_Holder);
        const secondList = getStudentsList(r.secondHolderAddNos, r.Second_Holder);
        const thirdList = getStudentsList(r.thirdHolderAddNos, r.Third_Holder);
        const aGradeList = getStudentsList(r.aGradeAddNos, r.AGrade);
        const bGradeList = getStudentsList(r.bGradeAddNos, r.BGrade);

        return {
          ...r,
          programme: r.Program_Id ? progsMap[r.Program_Id] || null : null,
          firstStudent: firstList[0] || null,
          secondStudent: secondList[0] || null,
          thirdStudent: thirdList[0] || null,
          aGradeStudent: aGradeList[0] || null,
          bGradeStudent: bGradeList[0] || null,
          firstStudentsList: firstList,
          secondStudentsList: secondList,
          thirdStudentsList: thirdList,
          aGradeStudentsList: aGradeList,
          bGradeStudentsList: bGradeList,
        };
      });

      setResults(combined);
    } catch (err: any) {
      console.error("Error fetching results:", err);
      setError("Failed to load results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // Helper resolvers
  const getWingTitle = (code?: string | null) => {
    if (!code) return "General";
    return meta.wingMap[code] || code;
  };

  const getCategoryTitle = (cat?: string | null) => {
    if (!cat) return "General";
    return meta.categoryMap[cat] || cat;
  };

  const getVenueTitle = (ven?: string | null) => {
    if (!ven) return "Campus Venue";
    return meta.venueMap[ven] || ven;
  };

  // Dynamic Filter Options - ONLY from loaded results table and registered classes
  const { uniqueWings, uniqueCategories, uniqueClasses } = useMemo(() => {
    const wingMap = new Map<string, string>();
    const catMap = new Map<string, string>();
    const classMap = new Map<string, string>();

    // Add classes from meta
    (meta.classes || []).forEach((c) => {
      const label =
        c.standard_name && c.class_nick_name
          ? `${c.standard_name} (${c.class_nick_name})`
          : c.standard_name || c.class_nick_name;
      if (label) classMap.set(label, label);
    });

    results.forEach((r) => {
      if (r.programme?.WingCode) {
        const title = meta.wingMap[r.programme.WingCode] || r.programme.WingCode;
        wingMap.set(r.programme.WingCode, title);
      }
      if (r.programme?.Category) {
        const title = meta.categoryMap[r.programme.Category] || r.programme.Category;
        catMap.set(r.programme.Category, title);
      }

      // Collect classes from winners
      [
        ...(r.firstStudentsList || []),
        ...(r.secondStudentsList || []),
        ...(r.thirdStudentsList || []),
        ...(r.aGradeStudentsList || []),
        ...(r.bGradeStudentsList || []),
      ].forEach((s) => {
        if (s.Class && s.Class !== "Assigned Class") {
          classMap.set(s.Class, s.Class);
        }
      });
    });

    return {
      uniqueWings: Array.from(wingMap.entries()).map(([code, label]) => ({ code, label })),
      uniqueCategories: Array.from(catMap.entries()).map(([id, label]) => ({ id, label })),
      uniqueClasses: Array.from(classMap.entries()).map(([id, label]) => ({ id, label })),
    };
  }, [results, meta.wingMap, meta.categoryMap, meta.classes]);

  // Filtered Results
  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return results.filter((res) => {
      const prog = res.programme;
      const title = (prog?.Program_Title || "").toLowerCase();
      const code = (res.Program_Id || "").toLowerCase();
      const wing = getWingTitle(prog?.WingCode).toLowerCase();
      const venue = getVenueTitle(prog?.Venue).toLowerCase();

      // 1. Publication Filter: In admin result directory, strictly show only published results where is_published/IsResultPublished is true
      const isPublished = Boolean(
        prog?.IsResultPublished === true ||
        (prog as any)?.is_published === true ||
        (res as any)?.is_published === true ||
        (res as any)?.IsResultPublished === true
      );

      if (isAdmin || publicationFilter === "published") {
        if (!isPublished) return false;
      }

      // 2. Specific Date Range Filter (e.g. "20-07-2026" to "10-10-2026")
      if (startDate) {
        const start = parseFlexibleDate(startDate);
        const progDate = parseFlexibleDate(prog?.Date);
        if (start && progDate) {
          start.setHours(0, 0, 0, 0);
          const checkDate = new Date(progDate);
          checkDate.setHours(0, 0, 0, 0);
          if (checkDate < start) return false;
        }
      }

      if (endDate) {
        const end = parseFlexibleDate(endDate);
        const progDate = parseFlexibleDate(prog?.Date);
        if (end && progDate) {
          end.setHours(23, 59, 59, 999);
          const checkDate = new Date(progDate);
          checkDate.setHours(0, 0, 0, 0);
          if (checkDate > end) return false;
        }
      }

      // 3. Class Filter
      if (classFilter !== "All") {
        const checkStudentClass = (list?: StudentInfo[]) => {
          if (!list || list.length === 0) return false;
          return list.some((s) => {
            const cName = (s.Class || "").toLowerCase();
            const target = classFilter.toLowerCase();
            return cName.includes(target) || target.includes(cName);
          });
        };

        const hasClassMatch =
          checkStudentClass(res.firstStudentsList) ||
          checkStudentClass(res.secondStudentsList) ||
          checkStudentClass(res.thirdStudentsList) ||
          checkStudentClass(res.aGradeStudentsList) ||
          checkStudentClass(res.bGradeStudentsList);

        if (!hasClassMatch) return false;
      }

      const checkStudentsSearch = (list?: StudentInfo[]) => {
        if (!list) return false;
        return list.some(
          (s) =>
            (s.StudentName || "").toLowerCase().includes(query) ||
            (s.AddNo || "").toLowerCase().includes(query) ||
            (s.Class || "").toLowerCase().includes(query) ||
            (s.CollegeName || "").toLowerCase().includes(query)
        );
      };

      const matchesSearch =
        !query ||
        title.includes(query) ||
        code.includes(query) ||
        wing.includes(query) ||
        venue.includes(query) ||
        (res.firstSquadTitle || "").toLowerCase().includes(query) ||
        (res.secondSquadTitle || "").toLowerCase().includes(query) ||
        (res.thirdSquadTitle || "").toLowerCase().includes(query) ||
        checkStudentsSearch(res.firstStudentsList) ||
        checkStudentsSearch(res.secondStudentsList) ||
        checkStudentsSearch(res.thirdStudentsList) ||
        checkStudentsSearch(res.aGradeStudentsList) ||
        checkStudentsSearch(res.bGradeStudentsList);

      const matchesWing = wingFilter === "All" || prog?.WingCode === wingFilter;
      const matchesCategory = categoryFilter === "All" || prog?.Category === categoryFilter;

      return matchesSearch && matchesWing && matchesCategory;
    });
  }, [
    results,
    searchQuery,
    wingFilter,
    categoryFilter,
    classFilter,
    publicationFilter,
    startDate,
    endDate,
    meta.wingMap,
    meta.categoryMap,
    meta.venueMap,
  ]);

  // Exportable programmes data for both PDF and Excel
  const exportableProgrammes = useMemo((): PdfExportProgramItem[] => {
    return filteredResults.map((r) => {
      const p = r.programme;
      const template =
        meta.pointsTemplates.find((t) => t.p_template_id === (p as any)?.points_template) ||
        meta.pointsTemplates[0];

      // Compute actual achieved points based on position and grade honors
      const is1stAGrade = (r.Grade1_uuid && r.Grade1_uuid === r.First_Holder_uuid) || (r.grade_holder_group1 && r.grade_holder_group1 === r["1st_holder_group"]);
      const is1stBGrade = (r.Grade2_uuid && r.Grade2_uuid === r.First_Holder_uuid) || (r.grade_holder_group2 && r.grade_holder_group2 === r["1st_holder_group"]);
      const firstRealPts = is1stAGrade ? (template?.first_A_grade ?? 10) : is1stBGrade ? (template?.first_B_grade ?? 8) : (template?.first_only ?? 5);

      const is2ndAGrade = (r.Grade1_uuid && r.Grade1_uuid === r.Second_Holder_uuid) || (r.grade_holder_group1 && r.grade_holder_group1 === r["2nd_holder_group"]);
      const is2ndBGrade = (r.Grade2_uuid && r.Grade2_uuid === r.Second_Holder_uuid) || (r.grade_holder_group2 && r.grade_holder_group2 === r["2nd_holder_group"]);
      const secondRealPts = is2ndAGrade ? (template?.second_A_grade ?? 8) : is2ndBGrade ? (template?.second_B_grade ?? 6) : (template?.second_only ?? 3);

      const is3rdAGrade = (r.Grade1_uuid && r.Grade1_uuid === r.Third_Holder_uuid) || (r.grade_holder_group1 && r.grade_holder_group1 === r["3rd_holder_group"]);
      const is3rdBGrade = (r.Grade2_uuid && r.Grade2_uuid === r.Third_Holder_uuid) || (r.grade_holder_group2 && r.grade_holder_group2 === r["3rd_holder_group"]);
      const thirdRealPts = is3rdAGrade ? (template?.third_A_grade ?? 6) : is3rdBGrade ? (template?.third_B_grade ?? 4) : (template?.third_only ?? 1);

      const aGradeRealPts = template?.A_grade ?? 5;
      const bGradeRealPts = template?.B_grade ?? 3;

      const mapWinnerItems = (
        items: StudentInfo[] = [],
        positionLabel: string,
        pts: number,
        squadTitle?: string | null
      ): PdfExportWinnerItem[] => {
        if (items.length === 0) return [];
        return items.map((stn) => ({
          position: positionLabel,
          addNo: stn.AddNo,
          name: stn.StudentName,
          classTitle: stn.Class || "Standard Class",
          collegeName: stn.CollegeName || "Campus",
          points: pts,
          squadTitle: squadTitle || null,
        }));
      };

      const firstPlace = mapWinnerItems(r.firstStudentsList, "1st Prize", firstRealPts, r.firstSquadTitle);
      const secondPlace = mapWinnerItems(r.secondStudentsList, "2nd Prize", secondRealPts, r.secondSquadTitle);
      const thirdPlace = mapWinnerItems(r.thirdStudentsList, "3rd Prize", thirdRealPts, r.thirdSquadTitle);
      const aGrade = mapWinnerItems(r.aGradeStudentsList, "A Grade", aGradeRealPts, r.aGradeSquadTitle);
      const bGrade = mapWinnerItems(r.bGradeStudentsList, "B Grade", bGradeRealPts, r.bGradeSquadTitle);

      return {
        programCode: r.Program_Id || "PROG",
        programTitle: p?.Program_Title || "Untitled Programme",
        category: getCategoryTitle(p?.Category),
        wing: getWingTitle(p?.WingCode),
        date: p?.Date || "TBA",
        venue: getVenueTitle(p?.Venue),
        eventType: p?.is_group_program ? "Squad / Group Event" : "Individual Event",
        firstPlace,
        secondPlace,
        thirdPlace,
        aGrade,
        bGrade,
        totalPoints:
          firstPlace.length * firstRealPts +
          secondPlace.length * secondRealPts +
          thirdPlace.length * thirdRealPts +
          aGrade.length * aGradeRealPts +
          bGrade.length * bGradeRealPts,
      };
    });
  }, [filteredResults, meta.pointsTemplates, meta.wingMap, meta.categoryMap, meta.venueMap]);

  // Export Handlers for Admin Directory
  const handleExportPdf = () => {
    if (exportableProgrammes.length === 0) {
      alert("No published results available to export to PDF.");
      return;
    }
    try {
      setIsExportingPdf(true);
      exportResultsToPdf({
        programmes: exportableProgrammes,
        exportType: adminViewMode === "table" ? "table" : "judgements",
        filters: {
          categoryTitle: categoryFilter !== "All" ? getCategoryTitle(categoryFilter) : undefined,
          wingTitle: wingFilter !== "All" ? getWingTitle(wingFilter) : undefined,
          classTitle: classFilter !== "All" ? classFilter : undefined,
          searchQuery: searchQuery || undefined,
        },
        filename: `Official_Results_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    if (exportableProgrammes.length === 0) {
      alert("No published results available to export to Excel.");
      return;
    }
    try {
      setIsExportingExcel(true);
      exportResultsToExcel({
        programmes: exportableProgrammes,
        exportType: "both",
        filters: {
          categoryTitle: categoryFilter !== "All" ? getCategoryTitle(categoryFilter) : undefined,
          wingTitle: wingFilter !== "All" ? getWingTitle(wingFilter) : undefined,
          classTitle: classFilter !== "All" ? classFilter : undefined,
          searchQuery: searchQuery || undefined,
        },
        filename: `Official_Results_${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    } catch (err) {
      console.error("Excel export error:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-slate-700 animate-pulse">Loading Official Competition Results...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 font-sans">
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Trophy className="w-6 h-6 text-yellow-300" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-200">
                {isAdmin ? "Admin Results Directory & Export Center" : "Official Hall of Fame"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdmin ? "Competition Results Directory" : "Our Published Results"}
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-xl">
              {isAdmin
                ? "Export verified published results in PDF or Excel workbooks, review scorecards, and audit position standings."
                : "Official standings, winners podium, and grade honors for conducted programmes and competitions."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap no-print">
            {isAdmin ? (
              <>
                {/* Button 1: Export PDF */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || exportableProgrammes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Export results as official PDF document"
                >
                  <FileDown size={16} />
                  <span>{isExportingPdf ? "Exporting PDF..." : "Export PDF"}</span>
                </button>

                {/* Button 2: Export Excel */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || exportableProgrammes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Export results as Excel spreadsheet (.xlsx)"
                >
                  <FileSpreadsheet size={16} />
                  <span>{isExportingExcel ? "Exporting Excel..." : "Export Excel"}</span>
                </button>

                {/* Advanced Modal Trigger */}
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                  title="Open Advanced Export Hub & Print Preview"
                >
                  <Download size={14} />
                  <span>Export Hub</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer active:scale-95"
                title="Print all official Judgement Sheets or save as PDF"
              >
                <Printer size={15} className="text-indigo-600" />
                <span>Print All Judgement Sheets</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Search & Filter Controls (Filtered to only my-tables data) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs mb-6 space-y-3.5 no-print">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by program title, code (e.g. PRG101), candidate name, or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Publication Status Filter */}
            <select
              value={publicationFilter}
              onChange={(e) => setPublicationFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 focus:outline-none cursor-pointer hover:bg-purple-100/50 transition"
            >
              <option value="published">📢 Published Results Only</option>
              <option value="all">🏆 All Evaluated Results</option>
            </select>

            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none cursor-pointer hover:bg-indigo-100/50 transition"
            >
              <option value="All">All Classes ({uniqueClasses.length})</option>
              {uniqueClasses.map((cl) => (
                <option key={cl.id} value={cl.label}>
                  {cl.label}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100 transition"
            >
              <option value="All">All Categories ({uniqueCategories.length})</option>
              {uniqueCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Wing Filter */}
            <select
              value={wingFilter}
              onChange={(e) => setWingFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100 transition"
            >
              <option value="All">All Wings ({uniqueWings.length})</option>
              {uniqueWings.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Filter Section & View Mode Switcher */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar size={14} className="text-amber-600" /> Date Range:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate || wingFilter !== "All" || categoryFilter !== "All" || classFilter !== "All" || publicationFilter !== "published" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setWingFilter("All");
                  setCategoryFilter("All");
                  setClassFilter("All");
                  setPublicationFilter("published");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                title="Reset all search filters"
              >
                <RotateCcw size={12} /> Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {isAdmin && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdminViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    adminViewMode === "table"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Consolidated Result Table"
                >
                  <Table size={13} />
                  <span>Result Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode("judgements")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    adminViewMode === "judgements"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Official Judgement Sheets"
                >
                  <FileText size={13} />
                  <span>Judgement Sheets</span>
                </button>
              </div>
            )}
            <div className="text-xs font-semibold text-slate-600 whitespace-nowrap bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
              Showing <span className="font-bold text-slate-900">{filteredResults.length}</span> published result{filteredResults.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      {/* Results Content Area */}
      {filteredResults.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">No Results Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No published results match your current search query or filter selection.
          </p>
          {(startDate || endDate || wingFilter !== "All" || categoryFilter !== "All" || classFilter !== "All" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setWingFilter("All");
                setCategoryFilter("All");
                setClassFilter("All");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : isAdmin && adminViewMode === "table" ? (
        /* ======================================================== */
        /* ADMIN VIEW 1: CONSOLIDATED RESULTS TABLE                 */
        /* ======================================================== */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Official Consolidated Results Table
              </h2>
              <p className="text-xs text-slate-500">
                Tabular overview of conducted programmes and verified position holders.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Verified Published Only
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">Sl</th>
                  <th className="py-3 px-3 min-w-[170px]">Programme Title</th>
                  <th className="py-3 px-3 min-w-[85px]">Date</th>
                  <th className="py-3 px-3 min-w-[100px]">Category</th>
                  <th className="py-3 px-3 min-w-[150px]">1st Position</th>
                  <th className="py-3 px-3 min-w-[150px]">2nd Position</th>
                  <th className="py-3 px-3 min-w-[150px]">3rd Position</th>
                  <th className="py-3 px-3 min-w-[130px]">Grade Holders</th>
                  <th className="py-3 px-3 text-center min-w-[90px] no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium bg-white">
                {exportableProgrammes.map((p, index) => {
                  const isGroup = p.eventType?.includes("Group") || p.eventType?.includes("Squad");

                  const formatWinnerCell = (
                    items?: PdfExportWinnerItem[],
                    bgBadge = "bg-slate-100 text-slate-800"
                  ) => {
                    if (!items || items.length === 0) return <span className="text-slate-400 font-normal">-</span>;

                    const hasSquads = items.some((i) => Boolean(i.squadTitle));

                    if (hasSquads || isGroup) {
                      const squadsMap = new Map<string, PdfExportWinnerItem[]>();
                      items.forEach((item) => {
                        const key = item.squadTitle?.trim() || "Squad Group";
                        if (!squadsMap.has(key)) squadsMap.set(key, []);
                        squadsMap.get(key)!.push(item);
                      });

                      return (
                        <div className="space-y-1.5">
                          {Array.from(squadsMap.entries()).map(([squadName, members], sIdx) => {
                            const pts = members[0]?.points;
                            return (
                              <div key={sIdx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                                <div className="font-bold text-slate-900 flex items-center justify-between gap-1 text-[11px]">
                                  <span className="text-indigo-900 font-extrabold">{squadName}</span>
                                  {pts ? (
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${bgBadge}`}>
                                      {pts} pts
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-[10px] text-slate-600 font-mono mt-0.5 leading-snug">
                                  {members.map((m, mIdx) => (
                                    <span key={mIdx}>
                                      {mIdx > 0 && ", "}
                                      {m.addNo} {m.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1">
                        {items.map((i, iIdx) => (
                          <div key={iIdx} className="flex items-center justify-between gap-1 text-slate-900">
                            <span className="font-semibold text-xs">
                              {i.name}{" "}
                              <span className="font-mono text-slate-500 font-normal text-[10px]">
                                ({i.addNo})
                              </span>
                            </span>
                            {i.points ? (
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${bgBadge}`}>
                                {i.points} pts
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    );
                  };

                  return (
                    <tr key={p.programCode || index} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500 text-[11px]">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block text-xs">{p.programTitle}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.programCode}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs whitespace-nowrap">{p.date || "TBA"}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{formatWinnerCell(p.firstPlace, "bg-amber-100 text-amber-800")}</td>
                      <td className="py-2.5 px-3">{formatWinnerCell(p.secondPlace, "bg-slate-200 text-slate-800")}</td>
                      <td className="py-2.5 px-3">{formatWinnerCell(p.thirdPlace, "bg-orange-100 text-orange-800")}</td>
                      <td className="py-2.5 px-3">{formatWinnerCell([...(p.aGrade || []), ...(p.bGrade || [])], "bg-indigo-100 text-indigo-800")}</td>
                      <td className="py-2.5 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              exportResultsToPdf({
                                programmes: [p],
                                exportType: "judgements",
                                filters: { categoryTitle: p.category, wingTitle: p.wing },
                                filename: `Judgement_Sheet_${p.programCode}.pdf`,
                              });
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Download Judgement Sheet PDF"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const matched = filteredResults.find((fr) => fr.Program_Id === p.programCode);
                              if (matched) setSelectedResultModal(matched);
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Podium View"
                          >
                            <Trophy size={13} />
                          </button>

                          {isAdmin && (
                            <>
                              <Link
                                to={`/admin-panel/${encodeURIComponent(actUser || "admin")}/create-result?program=${p.programCode}`}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Edit Result & Recalibrate Points"
                              >
                                <Edit size={13} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setProgramToDelete({ code: p.programCode, title: p.programTitle || p.programCode })}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Result & Rollback Student Points"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* OFFICIAL JUDGEMENT SHEETS DECLARATION VIEW               */
        /* ======================================================== */
        <div className="space-y-8">
          {exportableProgrammes.map((p, index) => (
            <div
              key={p.programCode || index}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition p-6 sm:p-8 space-y-6 print-break-inside-avoid relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-700 via-purple-600 to-amber-500" />

              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-slate-100">
                <div className="flex items-center gap-3.5">
                  <img
                    src={dhiuLogo}
                    alt="DHIU"
                    className="w-13 h-13 object-contain rounded-2xl border border-slate-200 p-1 bg-white shadow-2xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        Official Judgement Sheet & Scorecard
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        {p.programCode}
                      </span>
                      {p.totalPoints ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          Total: {p.totalPoints} pts
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1 leading-snug">
                      {p.programTitle}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                        {p.category}
                      </span>
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                        {p.wing}
                      </span>
                      <span className="text-slate-600 font-medium">
                        {p.eventType}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        {p.date || "TBA"}
                      </span>
                      {p.venue && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600 truncate">
                            <MapPin size={13} className="text-slate-400" />
                            {p.venue}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 no-print self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      exportResultsToPdf({
                        programmes: [p],
                        exportType: "judgements",
                        filters: { categoryTitle: p.category, wingTitle: p.wing },
                        filename: `Judgement_Sheet_${p.programCode}.pdf`,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                    title="Download this official Judgement Sheet as a PDF document"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const matched = filteredResults.find((fr) => fr.Program_Id === p.programCode);
                      if (matched) setSelectedResultModal(matched);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                    title="View candidate photos, certificates & detailed podium"
                  >
                    <Trophy size={13} className="text-amber-600" />
                    <span>Podium View</span>
                  </button>
                </div>
              </div>

              {/* Winners Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Position</th>
                      <th className="py-2.5 px-3">AddNo</th>
                      <th className="py-2.5 px-3.5">Winner / Squad Name</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3 text-center">Points</th>
                      <th className="py-2.5 px-3">College / Center</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {/* 1st Place */}
                    {p.firstPlace && p.firstPlace.length > 0 && p.firstPlace.map((w, wIdx) => (
                      <tr key={`1-${wIdx}`} className="bg-amber-50/50 hover:bg-amber-50/80">
                        <td className="py-2.5 px-3.5 font-bold text-amber-800 flex items-center gap-1.5">
                          <span>🥇</span>
                          <span>1st Prize</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {w.squadTitle ? (
                            <div>
                              <span className="text-indigo-800 font-black">{w.squadTitle}</span>
                              <span className="text-slate-700 font-medium block text-[11px]">• {w.name}</span>
                            </div>
                          ) : (
                            w.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{w.classTitle || "-"}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                          {w.points ? `${w.points} pts` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                      </tr>
                    ))}

                    {/* 2nd Place */}
                    {p.secondPlace && p.secondPlace.length > 0 && p.secondPlace.map((w, wIdx) => (
                      <tr key={`2-${wIdx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3.5 font-bold text-slate-600 flex items-center gap-1.5">
                          <span>🥈</span>
                          <span>2nd Prize</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {w.squadTitle ? (
                            <div>
                              <span className="text-indigo-800 font-black">{w.squadTitle}</span>
                              <span className="text-slate-700 font-medium block text-[11px]">• {w.name}</span>
                            </div>
                          ) : (
                            w.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{w.classTitle || "-"}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {w.points ? `${w.points} pts` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                      </tr>
                    ))}

                    {/* 3rd Place */}
                    {p.thirdPlace && p.thirdPlace.length > 0 && p.thirdPlace.map((w, wIdx) => (
                      <tr key={`3-${wIdx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3.5 font-bold text-orange-700 flex items-center gap-1.5">
                          <span>🥉</span>
                          <span>3rd Prize</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {w.squadTitle ? (
                            <div>
                              <span className="text-indigo-800 font-black">{w.squadTitle}</span>
                              <span className="text-slate-700 font-medium block text-[11px]">• {w.name}</span>
                            </div>
                          ) : (
                            w.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{w.classTitle || "-"}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-orange-700">
                          {w.points ? `${w.points} pts` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                      </tr>
                    ))}

                    {/* Grade A / B */}
                    {[...(p.aGrade || []), ...(p.bGrade || [])].map((w, wIdx) => (
                      <tr key={`g-${wIdx}`} className="hover:bg-slate-50 text-slate-700">
                        <td className="py-2.5 px-3.5 font-bold text-indigo-700 flex items-center gap-1.5">
                          <span>🎖️</span>
                          <span>{w.position || "Grade Holder"}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-800">
                          {w.squadTitle ? (
                            <div>
                              <span className="text-indigo-800 font-black">{w.squadTitle}</span>
                              <span className="text-slate-700 font-medium block text-[11px]">• {w.name}</span>
                            </div>
                          ) : (
                            w.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{w.classTitle || "-"}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                          {w.points ? `${w.points} pts` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                      </tr>
                    ))}

                    {(!p.firstPlace || p.firstPlace.length === 0) &&
                      (!p.secondPlace || p.secondPlace.length === 0) &&
                      (!p.thirdPlace || p.thirdPlace.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                            No published winners recorded for this programme yet.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>

              {/* Verification Signatures & Seal */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-4">
                  <div className="h-8 border-b border-dashed border-slate-300" />
                  <p className="font-bold text-slate-600">Judge / Evaluator</p>
                </div>
                <div className="space-y-4">
                  <div className="h-8 border-b border-dashed border-slate-300" />
                  <p className="font-bold text-slate-600">Category Controller</p>
                </div>
                <div className="space-y-4">
                  <div className="h-8 border-b border-dashed border-slate-300" />
                  <p className="font-bold text-slate-600">Festival Convener / Seal</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Result Modal with Podium & Grades */}
      {selectedResultModal && (
        <ProgrammeResultModal
          isOpen={Boolean(selectedResultModal)}
          onClose={() => setSelectedResultModal(null)}
          programCode={selectedResultModal.Program_Id || ""}
          programTitle={selectedResultModal.programme?.Program_Title || selectedResultModal.Program_Id}
          programDate={selectedResultModal.programme?.Date}
          programVenue={selectedResultModal.programme?.Venue}
          programPoster={selectedResultModal.programme?.Program_Poster}
          wingCode={selectedResultModal.programme?.WingCode}
        />
      )}

      {/* Advanced Result Export Hub Modal */}
      {isExportModalOpen && (
        <ResultExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          programmes={exportableProgrammes}
          availableCategories={uniqueCategories}
          availableClasses={uniqueClasses}
          availableWings={uniqueWings}
          initialCategory={categoryFilter}
          initialClass={classFilter}
          initialWing={wingFilter}
        />
      )}

      {/* Admin Delete Result Confirmation Modal */}
      {programToDelete && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Delete Official Result?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the result for{" "}
                <span className="font-bold text-slate-900">{programToDelete.title}</span> (
                <span className="font-mono text-slate-500">#{programToDelete.code}</span>)?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertCircle size={13} className="text-rose-600 shrink-0" />
                  Automatic Point Recalibration:
                </span>
                <p className="text-[11px] text-rose-700">
                  All points awarded to winning students and group squads will be cleanly deducted back to their pre-result values, and the programme status will be reset.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProgramToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rolling back points &amp; deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Yes, Delete &amp; Rollback Points</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Feedback Toast */}
      {deleteStatus && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            deleteStatus.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          {deleteStatus.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold">{deleteStatus.text}</span>
          <button
            type="button"
            onClick={() => setDeleteStatus(null)}
            className="ml-2 text-white/60 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
