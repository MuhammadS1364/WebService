import React, { useState, useMemo, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Trophy,
  Medal,
  Calendar,
  Layers,
  GraduationCap,
  Users,
} from "lucide-react";
import { exportResultsToPdf, type PdfExportProgramItem, type PdfExportWinnerItem } from "../lib/pdfResultService";
import { exportResultsToExcel } from "../lib/excelResultService";
import dhiuLogo from "../ImgBox/Dhiu.jpg";

interface ResultExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  programmes: PdfExportProgramItem[];
  availableCategories: { id: string; label: string }[];
  availableClasses: { id: string; label: string }[];
  availableWings: { code: string; label: string }[];
  initialCategory?: string;
  initialClass?: string;
  initialWing?: string;
}

export default function ResultExportModal({
  isOpen,
  onClose,
  programmes,
  availableCategories,
  availableClasses,
  availableWings,
  initialCategory = "All",
  initialClass = "All",
  initialWing = "All",
}: ResultExportModalProps) {
  // Modal Local Filter State
  const [exportType, setExportType] = useState<"judgements" | "table">("judgements");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedWing, setSelectedWing] = useState<string>(initialWing);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [excelMode, setExcelMode] = useState<"current" | "both">("current");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Sync initial props when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory);
      setSelectedClass(initialClass);
      setSelectedWing(initialWing);
    }
  }, [isOpen, initialCategory, initialClass, initialWing]);

  // Filter programmes dynamically
  const filteredProgrammes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return programmes.filter((p) => {
      // 1. Category Filter
      if (selectedCategory !== "All") {
        if (p.category !== selectedCategory && !p.category?.toLowerCase().includes(selectedCategory.toLowerCase())) {
          return false;
        }
      }

      // 2. Wing Filter
      if (selectedWing !== "All") {
        if (p.wing !== selectedWing && !p.wing?.toLowerCase().includes(selectedWing.toLowerCase())) {
          return false;
        }
      }

      // 3. Class Filter
      if (selectedClass !== "All") {
        const checkWinnerClass = (items?: any[]) => {
          if (!items) return false;
          return items.some((w) => {
            const cls = (w.classTitle || "").toLowerCase();
            const target = selectedClass.toLowerCase();
            return cls.includes(target) || target.includes(cls);
          });
        };

        const hasMatch =
          checkWinnerClass(p.firstPlace) ||
          checkWinnerClass(p.secondPlace) ||
          checkWinnerClass(p.thirdPlace) ||
          checkWinnerClass(p.aGrade) ||
          checkWinnerClass(p.bGrade);

        if (!hasMatch) return false;
      }

      // 4. Search Query
      if (q) {
        const inTitle = (p.programTitle || "").toLowerCase().includes(q);
        const inCode = (p.programCode || "").toLowerCase().includes(q);
        const inWinners = [
          ...(p.firstPlace || []),
          ...(p.secondPlace || []),
          ...(p.thirdPlace || []),
          ...(p.aGrade || []),
          ...(p.bGrade || []),
        ].some(
          (w) =>
            (w.name || "").toLowerCase().includes(q) ||
            (w.addNo || "").toLowerCase().includes(q) ||
            (w.classTitle || "").toLowerCase().includes(q)
        );

        if (!inTitle && !inCode && !inWinners) return false;
      }

      return true;
    });
  }, [programmes, selectedCategory, selectedClass, selectedWing, searchQuery]);

  if (!isOpen) return null;

  // Handle PDF Download
  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      const catLabel = selectedCategory !== "All" ? selectedCategory : "All Categories";
      const clsLabel = selectedClass !== "All" ? selectedClass : "All Classes";
      const wingLabel = selectedWing !== "All" ? selectedWing : "All Wings";

      exportResultsToPdf({
        programmes: filteredProgrammes,
        exportType,
        filters: {
          categoryTitle: catLabel,
          classTitle: clsLabel,
          wingTitle: wingLabel,
        },
        filename:
          exportType === "judgements"
            ? `Official_Judgements_Results_${new Date().toISOString().split("T")[0]}.pdf`
            : `Official_Consolidated_Results_${new Date().toISOString().split("T")[0]}.pdf`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Browser Native Print / Save to PDF
  const handlePrint = () => {
    window.print();
  };

  // Handle Excel Download
  const handleDownloadExcel = () => {
    setIsExporting(true);
    try {
      exportResultsToExcel({
        programmes: filteredProgrammes,
        exportType: excelMode === "both" ? "both" : exportType,
        filters: {
          categoryTitle: selectedCategory,
          classTitle: selectedClass,
          wingTitle: selectedWing,
        },
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans overflow-hidden">
      {/* PRINT-ONLY CONTAINER WITH HIGH-FIDELITY OFFICIAL UI */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-print-document, #official-print-document * {
            visibility: visible !important;
          }
          #official-print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm !important;
            background: white !important;
            color: black !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* MODAL CARD */}
      <div className="relative flex flex-col w-full max-w-6xl max-h-[95vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* 1. MODAL TOP HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>Official Results Export Hub</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 uppercase tracking-wider">
                  PDF & Excel
                </span>
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Export verified competition results as official Judgement Scorecards or Consolidated Table Ledgers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. CONTROLS BAR: TYPE SELECTOR & FILTER DROPDOWNS */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-4 shrink-0">
          
          {/* Top row: Type switcher & Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Two Export Types Segmented Control */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setExportType("judgements")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  exportType === "judgements"
                    ? "bg-white text-indigo-900 shadow-xs border border-indigo-100"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Medal size={14} className={exportType === "judgements" ? "text-amber-500" : "text-slate-400"} />
                <span>1. Judgements Breakdown View</span>
              </button>

              <button
                type="button"
                onClick={() => setExportType("table")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  exportType === "table"
                    ? "bg-white text-indigo-900 shadow-xs border border-indigo-100"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers size={14} className={exportType === "table" ? "text-indigo-600" : "text-slate-400"} />
                <span>2. Consolidated Table Row View</span>
              </button>
            </div>

            {/* Export Actions (PDF, Print, Excel) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting || filteredProgrammes.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Download Vector PDF"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={filteredProgrammes.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Print official document directly or Save to PDF via browser print"
              >
                <Printer size={14} />
                <span>Print Official PDF</span>
              </button>

              <div className="flex items-center gap-1 bg-emerald-50 rounded-xl p-0.5 border border-emerald-200">
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={isExporting || filteredProgrammes.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  title="Download Excel Spreadsheet (.xlsx)"
                >
                  <FileSpreadsheet size={14} />
                  <span>Excel (.xlsx)</span>
                </button>
                <select
                  value={excelMode}
                  onChange={(e) => setExcelMode(e.target.value as any)}
                  className="bg-transparent text-[11px] font-bold text-emerald-800 pr-2 py-1 outline-none cursor-pointer"
                  title="Excel export format"
                >
                  <option value="current">Current Format</option>
                  <option value="both">Both Sheets</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom row: Class, Category, Wing, and Search Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
            
            {/* 1. Class Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <GraduationCap size={12} className="text-indigo-600" />
                <span>Filter by Class</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="All">All Classes ({availableClasses.length})</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Category Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Filter size={12} className="text-purple-600" />
                <span>Filter by Category</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="All">All Categories ({availableCategories.length})</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Wing Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users size={12} className="text-teal-600" />
                <span>Filter by Wing</span>
              </label>
              <select
                value={selectedWing}
                onChange={(e) => setSelectedWing(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="All">All Wings ({availableWings.length})</option>
                {availableWings.map((w) => (
                  <option key={w.code} value={w.label}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Search Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Search Code / Student
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Title, AddNo, Name..."
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Active Filters Summary Pill */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-700">Active Criteria:</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                Class: {selectedClass}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Category: {selectedCategory}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold border border-teal-200">
                Wing: {selectedWing}
              </span>
            </div>

            <span className="font-bold text-indigo-700 bg-indigo-50/80 px-2.5 py-0.5 rounded-full border border-indigo-200 shrink-0">
              {filteredProgrammes.length} Programme{filteredProgrammes.length === 1 ? "" : "s"} Ready for Export
            </span>
          </div>
        </div>

        {/* 3. INTERACTIVE DOCUMENT PREVIEW (WHAT YOU SEE IS WHAT IS EXPORTED) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          
          {/* DOCUMENT CANVAS CONTAINER (Used for both Screen Preview & Browser Native Print) */}
          <div
            id="official-print-document"
            ref={printRef}
            className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6"
          >
            {/* OFFICIAL DHIU LETTERHEAD HEADER */}
            <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl border border-slate-200 p-1 flex items-center justify-center shrink-0 bg-slate-50 overflow-hidden shadow-xs">
                  <img src={dhiuLogo} alt="DHIU Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                    DARUL HUDA ISLAMIC UNIVERSITY
                  </h1>
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Official Competition Results & Awards Secretariat
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {exportType === "judgements"
                      ? "Official Judgement & Winner Declaration Scorecards"
                      : "Master Consolidated Results & Position Holders Ledger"}
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] font-mono text-slate-500 shrink-0 hidden sm:block">
                <p className="font-bold text-slate-800">DOCUMENT ID: DHIU-RES-{new Date().getFullYear()}</p>
                <p>Date: {new Date().toLocaleDateString("en-GB")}</p>
                <p>Status: Officially Verified</p>
              </div>
            </div>

            {/* METADATA SUMMARY BAR */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-700">
                <span>
                  <strong>Category:</strong> {selectedCategory}
                </span>
                <span>•</span>
                <span>
                  <strong>Class:</strong> {selectedClass}
                </span>
                <span>•</span>
                <span>
                  <strong>Wing:</strong> {selectedWing}
                </span>
              </div>
              <span className="font-black text-indigo-700">
                Total Results: {filteredProgrammes.length}
              </span>
            </div>

            {/* EMPTY STATE */}
            {filteredProgrammes.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Trophy size={40} className="mx-auto mb-2 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">No results match the selected filters</h4>
                <p className="text-xs text-slate-500 mt-1">Try resetting the class, category, or wing filters.</p>
              </div>
            ) : exportType === "judgements" ? (
              
              /* ======================================================== */
              /* TYPE 1: JUDGEMENTS BREAKDOWN VIEW                        */
              /* ======================================================== */
              <div className="space-y-6">
                {filteredProgrammes.map((prog) => (
                  <div
                    key={prog.programCode}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3.5 page-break-avoid"
                  >
                    {/* Programme Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-700 text-white font-mono font-black text-xs">
                          {prog.programCode}
                        </span>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 leading-snug">
                            {prog.programTitle}
                          </h3>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {prog.eventType} • {prog.category} • {prog.wing}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 self-start sm:self-auto">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {prog.date || "Date TBA"}
                        </span>
                      </div>
                    </div>

                    {/* Winners Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Position</th>
                            <th className="py-2.5 px-3">AddNo</th>
                            <th className="py-2.5 px-3">Winner / Squad Name</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3 text-center">Points</th>
                            <th className="py-2.5 px-3">College / Center</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {/* 1st Place */}
                          {prog.firstPlace && prog.firstPlace.length > 0 && (
                            prog.firstPlace.map((w, wIdx) => (
                              <tr key={`1-${wIdx}`} className="bg-amber-50/40 hover:bg-amber-50/80">
                                <td className="py-2.5 px-3 font-bold text-amber-800 flex items-center gap-1.5">
                                  <span>🥇</span>
                                  <span>1st Prize</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{w.name}</td>
                                <td className="py-2.5 px-3 text-slate-700">{w.classTitle || "-"}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                                  {w.points ? `${w.points} pts` : "-"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                              </tr>
                            ))
                          )}

                          {/* 2nd Place */}
                          {prog.secondPlace && prog.secondPlace.length > 0 && (
                            prog.secondPlace.map((w, wIdx) => (
                              <tr key={`2-${wIdx}`} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-600 flex items-center gap-1.5">
                                  <span>🥈</span>
                                  <span>2nd Prize</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{w.name}</td>
                                <td className="py-2.5 px-3 text-slate-700">{w.classTitle || "-"}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                  {w.points ? `${w.points} pts` : "-"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                              </tr>
                            ))
                          )}

                          {/* 3rd Place */}
                          {prog.thirdPlace && prog.thirdPlace.length > 0 && (
                            prog.thirdPlace.map((w, wIdx) => (
                              <tr key={`3-${wIdx}`} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-orange-700 flex items-center gap-1.5">
                                  <span>🥉</span>
                                  <span>3rd Prize</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{w.name}</td>
                                <td className="py-2.5 px-3 text-slate-700">{w.classTitle || "-"}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-orange-700">
                                  {w.points ? `${w.points} pts` : "-"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                              </tr>
                            ))
                          )}

                          {/* Grade A / B */}
                          {[...(prog.aGrade || []), ...(prog.bGrade || [])].map((w, wIdx) => (
                            <tr key={`g-${wIdx}`} className="hover:bg-slate-50 text-slate-700">
                              <td className="py-2.5 px-3 font-bold text-indigo-700 flex items-center gap-1.5">
                                <span>🎖️</span>
                                <span>{w.position || "Grade Holder"}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{w.addNo}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">{w.name}</td>
                              <td className="py-2.5 px-3 text-slate-600">{w.classTitle || "-"}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                                {w.points ? `${w.points} pts` : "-"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">{w.collegeName || "Campus"}</td>
                            </tr>
                          ))}

                          {(!prog.firstPlace || prog.firstPlace.length === 0) &&
                            (!prog.secondPlace || prog.secondPlace.length === 0) && (
                              <tr>
                                <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                                  No positions or winners recorded for this programme yet.
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* OFFICIAL VERIFICATION SIGNATURES FOOTER */}
                <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs page-break-avoid">
                  <div className="space-y-6">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <p className="font-bold text-slate-700">Judge / Evaluator</p>
                  </div>
                  <div className="space-y-6">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <p className="font-bold text-slate-700">Category Controller</p>
                  </div>
                  <div className="space-y-6">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <p className="font-bold text-slate-700">Festival Convener / Seal</p>
                  </div>
                </div>
              </div>
            ) : (
              
              /* ======================================================== */
              /* TYPE 2: CONSOLIDATED TABLE ROW VIEW                      */
              /* ======================================================== */
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-10">Sl</th>
                      <th className="py-3 px-3 min-w-[160px]">Programme Title</th>
                      <th className="py-3 px-3 min-w-[85px]">Date</th>
                      <th className="py-3 px-3 min-w-[100px]">Category</th>
                      <th className="py-3 px-3 min-w-[140px]">1st Position</th>
                      <th className="py-3 px-3 min-w-[140px]">2nd Position</th>
                      <th className="py-3 px-3 min-w-[140px]">3rd Position</th>
                      <th className="py-3 px-3 min-w-[120px]">Grade Holders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium bg-white">
                    {filteredProgrammes.map((p, index) => {
                      const isGroup = p.eventType?.includes("Group") || p.eventType?.includes("Squad");

                      const formatCell = (
                        items?: PdfExportWinnerItem[],
                        bgBadge = "bg-slate-100 text-slate-800"
                      ) => {
                        if (!items || items.length === 0) return <span className="text-slate-400 font-normal">-</span>;

                        const hasSquads = items.some((i) => Boolean(i.squadTitle));

                        if (hasSquads || isGroup) {
                          // Group members by squadTitle
                          const squadsMap = new Map<string, PdfExportWinnerItem[]>();
                          items.forEach((item) => {
                            const key = item.squadTitle?.trim() || "Squad Group";
                            if (!squadsMap.has(key)) squadsMap.set(key, []);
                            squadsMap.get(key)!.push(item);
                          });

                          return (
                            <div className="space-y-2">
                              {Array.from(squadsMap.entries()).map(([squadName, members], sIdx) => {
                                const pts = members[0]?.points;
                                return (
                                  <div key={sIdx} className="leading-snug">
                                    {/* Group Name & Points */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900 text-xs">{squadName}</span>
                                      {pts && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/60">
                                          {pts}p
                                        </span>
                                      )}
                                    </div>
                                    {/* Line break then small text members with ONLY AddNo and Name (no class) */}
                                    <div className="mt-1 pl-1.5 space-y-0.5 border-l-2 border-indigo-200">
                                      {members.map((m, mIdx) => (
                                        <div key={mIdx} className="text-[10px] text-slate-600 flex items-center gap-1.5 font-medium">
                                          <span className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] ${bgBadge}`}>
                                            {m.addNo}
                                          </span>
                                          <span className="text-slate-800">{m.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        // Individual: Candidate Name, AddNo, Points (NO class)
                        return (
                          <div className="space-y-1.5">
                            {items.map((i, iIdx) => (
                              <div key={iIdx} className="leading-snug">
                                <span className="font-bold text-slate-900 block text-xs">{i.name}</span>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                                  <span className={`px-1 py-0.2 rounded font-bold ${bgBadge}`}>{i.addNo}</span>
                                  {i.points && <span className="font-bold text-amber-700">[{i.points}p]</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <tr key={p.programCode} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block leading-tight text-xs">{p.programTitle}</span>
                            <span className="font-mono text-slate-400 text-[10px] block mt-0.5">
                              ({p.programCode})
                            </span>
                            <span className="text-[10px] text-indigo-600 font-medium">{p.eventType}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">{p.date || "TBA"}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{p.category}</span>
                            <span className="text-[10px] text-slate-500">{p.wing}</span>
                          </td>
                          <td className="py-3 px-3 bg-amber-50/20">{formatCell(p.firstPlace, "bg-amber-100 text-amber-900")}</td>
                          <td className="py-3 px-3">{formatCell(p.secondPlace, "bg-slate-200 text-slate-800")}</td>
                          <td className="py-3 px-3">{formatCell(p.thirdPlace, "bg-orange-100 text-orange-900")}</td>
                          <td className="py-3 px-3 text-slate-600">
                            {formatCell([...(p.aGrade || []), ...(p.bGrade || [])], "bg-indigo-50 text-indigo-700")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* DOCUMENT FOOTER */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <span>Official Darul Huda Islamic University Festival Publication</span>
              <span>Generated on {new Date().toLocaleDateString("en-GB")}</span>
            </div>
          </div>
        </div>

        {/* 4. MODAL BOTTOM FOOTER BAR */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Selected Layout:{" "}
            <strong className="text-indigo-700 font-bold">
              {exportType === "judgements" ? "Type 1: Judgements Breakdown View" : "Type 2: Consolidated Table Row View"}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting || filteredProgrammes.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>Export Selected Format</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
