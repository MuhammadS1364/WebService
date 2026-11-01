import type { ReactNode } from "react";
import { Printer, X, Download, Info } from "lucide-react";
import { formatPrintDateRange } from "./AnalyticsPrintHeaderFooter";

interface A4PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reportType: string;
  startDate?: string;
  endDate?: string;
  activeFilterLabels?: string[];
  totalCount: number;
  totalCountLabel?: string;
  subMetrics?: string;
  printDateString?: string;
  children: ReactNode;
}

export default function A4PrintPreviewModal({
  isOpen,
  onClose,
  title = "Anjuman e Huda (Chs) Analytics",
  reportType,
  startDate,
  endDate,
  activeFilterLabels = [],
  totalCount,
  totalCountLabel = "Records",
  subMetrics,
  printDateString,
  children,
}: A4PrintPreviewModalProps) {
  if (!isOpen) return null;

  const dateRangeStr = formatPrintDateRange(startDate, endDate);
  const hasDateFilter = Boolean(dateRangeStr);
  const hasOtherFilters = activeFilterLabels.length > 0;

  let subheadingText = "Analytics Report";
  if (hasDateFilter) {
    subheadingText = `filter by month during " ${dateRangeStr} "`;
    if (hasOtherFilters) {
      subheadingText += ` (${activeFilterLabels.join(" • ")})`;
    }
  } else if (hasOtherFilters) {
    subheadingText = `Analytics Report — Filter: ${activeFilterLabels.join(" • ")}`;
  } else {
    subheadingText = "Analytics Report — Comprehensive Institutional Records (All Data)";
  }

  const handlePrintDocument = () => {
    onClose();
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (e) {
        console.error("Print trigger failed:", e);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans overflow-hidden no-print">
      <div className="bg-slate-100 w-full max-w-5xl h-[94vh] rounded-3xl shadow-2xl flex flex-col border border-slate-300 overflow-hidden">
        
        {/* Top Preview Control Bar */}
        <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                A4 Official Print & PDF Preview
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Best Ready-to-Print A4 layout • No overlapping • Logos centered in footer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDocument}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Print Document or Save as PDF"
            >
              <Printer size={15} />
              <span>Print / Save as PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Helpful Tip Banner */}
        <div className="bg-indigo-50/80 px-4 py-2 border-b border-indigo-100 flex items-center gap-2 text-xs text-indigo-900 shrink-0">
          <Info size={14} className="text-indigo-600 shrink-0" />
          <span>
            <strong>Ready-to-Print Tip:</strong> When the browser print dialog opens, set <strong>Destination</strong> to <em>Save as PDF</em>, <strong>Paper Size</strong> to <em>A4</em>, and enable <em>Background Graphics</em> for pristine chart visuals.
          </span>
        </div>

        {/* Scrollable Simulated A4 Page Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70">
          <div className="bg-white w-full max-w-[850px] min-h-[1100px] shadow-lg rounded-2xl p-6 sm:p-10 flex flex-col justify-between border border-slate-200">
            
            {/* Top Section */}
            <div className="space-y-6">
              {/* Branded Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">
                      {title}
                    </h1>
                    <p className="text-sm font-bold text-indigo-900 mt-1">
                      {subheadingText}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold mt-1">
                      {reportType} • {totalCountLabel}: {totalCount.toLocaleString()} {subMetrics ? `• ${subMetrics}` : ""}
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-600 font-mono shrink-0">
                    <p className="font-bold text-slate-900">
                      Printed: {printDateString || "Official Date Record"}
                    </p>
                    <p className="text-[11px] text-slate-500">Document: A4 Official Analytics</p>
                    <p className="text-[11px] font-bold text-indigo-700">Official Institutional Copy</p>
                  </div>
                </div>
              </div>

              {/* Injected Visual Analytics Content */}
              <div className="space-y-6">
                {children}
              </div>
            </div>

            {/* Bottom Footer Section with Two Centered Logos */}
            <div className="w-full pt-8 mt-12 border-t-2 border-slate-300">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                {/* Two logos in center of the page as requested */}
                <div className="flex items-center justify-center gap-6 sm:gap-10">
                  <img
                    src="/Anjumen_Large.png"
                    alt="Anjuman-e-Huda"
                    className="h-10 sm:h-12 w-auto max-w-[220px] object-contain"
                  />
                  <div className="h-8 w-px bg-slate-300" />
                  <img
                    src="/dh_logo.png"
                    alt="Darul Huda Islamic University"
                    className="h-10 sm:h-12 w-auto max-w-[220px] object-contain"
                  />
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">
                    Darul Huda Islamic University • Anjuman-e-Huda (Secondary & Senior Secondary Institute)
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Official Visual Analytics Report • Generated automatically for institutional audits and administration • A4 Standard
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Drawer Bar */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Page formatted for standard A4 Portrait paper dimensions (210mm × 297mm).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDocument}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
