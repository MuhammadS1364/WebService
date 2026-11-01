interface AnalyticsPrintHeaderProps {
  title?: string;
  reportType: string;
  startDate?: string;
  endDate?: string;
  activeFilterLabels?: string[];
  totalCount: number;
  totalCountLabel?: string;
  subMetrics?: string;
  printDateString?: string;
}

export function formatPrintDate(dStr?: string): string {
  if (!dStr) return "";
  try {
    const parts = dStr.split("-");
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d} ${months[m] || parts[1]} ${y}`;
    }
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch {
    // fallback
  }
  return dStr;
}

export function formatPrintDateRange(startDate?: string, endDate?: string): string {
  const startFmt = formatPrintDate(startDate);
  const endFmt = formatPrintDate(endDate);

  if (startFmt && endFmt) {
    return `${startFmt} - ${endFmt} Data`;
  }
  if (startFmt) {
    return `From ${startFmt} Onwards Data`;
  }
  if (endFmt) {
    return `Up to ${endFmt} Data`;
  }
  return "";
}

export function AnalyticsPrintHeader({
  title = "Anjuman e Huda (Chs) Analytics",
  reportType,
  startDate,
  endDate,
  activeFilterLabels = [],
  totalCount,
  totalCountLabel = "Records",
  subMetrics,
  printDateString,
}: AnalyticsPrintHeaderProps) {
  const dateRangeStr = formatPrintDateRange(startDate, endDate);
  const hasDateFilter = Boolean(dateRangeStr);
  const hasOtherFilters = activeFilterLabels.length > 0;

  // Build sub heading according to user requirements:
  // "sub heading : Analytics Report , or filter by month duriing " 01 Oct - 31 Oct 2026 Data " "
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

  return (
    <div className="print-only-header hidden print:block border-b-2 border-slate-900 pb-4 mb-5 print-break-inside-avoid break-inside-avoid">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          {/* Main Heading requested by user */}
          <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">
            {title}
          </h1>
          {/* Sub heading requested by user */}
          <p className="text-sm font-bold text-indigo-900 mt-1">
            {subheadingText}
          </p>
          {/* Scope and Record Details */}
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
  );
}

export function AnalyticsPrintFooter() {
  return (
    <div className="print-footer print-only-footer hidden print:block w-full pt-6 mt-8 border-t-2 border-slate-300 print-break-inside-avoid break-inside-avoid">
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

        {/* Institutional Accreditation and Footer Notice */}
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
  );
}
