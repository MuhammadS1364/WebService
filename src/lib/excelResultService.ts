import * as XLSX from "xlsx";
import type { PdfExportProgramItem, PdfExportWinnerItem } from "./pdfResultService";

export interface ExcelExportOptions {
  programmes: PdfExportProgramItem[];
  exportType: "judgements" | "table" | "both";
  filters?: {
    categoryTitle?: string;
    classTitle?: string;
    wingTitle?: string;
    searchQuery?: string;
    statusFilter?: string;
  };
  filename?: string;
}

/**
 * Universal Excel Result Exporter
 * Generates structured, readable Excel workbooks for Judgements Breakdown,
 * Consolidated Table View, or both.
 */
export function exportResultsToExcel(options: ExcelExportOptions): void {
  const { programmes, exportType, filename } = options;

  if (!programmes || programmes.length === 0) {
    alert("No programme results available to export to Excel.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  // Helper to format winners for tabular view
  const formatHolderString = (items?: PdfExportWinnerItem[], isGroup?: boolean) => {
    if (!items || items.length === 0) return "-";

    const hasSquads = items.some((i) => Boolean(i.squadTitle));

    if (hasSquads || isGroup) {
      // Group members by squadTitle
      const squadsMap = new Map<string, PdfExportWinnerItem[]>();
      items.forEach((item) => {
        const key = item.squadTitle?.trim() || "Squad Group";
        if (!squadsMap.has(key)) squadsMap.set(key, []);
        squadsMap.get(key)!.push(item);
      });

      const squadEntries: string[] = [];
      squadsMap.forEach((members, squadName) => {
        const pts = members[0]?.points ? ` [${members[0].points} pts]` : "";
        const memberList = members.map((m) => `${m.addNo} ${m.name}`).join(", ");
        squadEntries.push(`${squadName}${pts}: ${memberList}`);
      });
      return squadEntries.join(" | ");
    }

    // Individual Candidate: Name (AddNo) [Points] - NO class
    return items
      .map((i) => {
        const pts = i.points ? ` [${i.points} pts]` : "";
        return `${i.name} (${i.addNo})${pts}`;
      })
      .join("; ");
  };

  // 1. CONSOLIDATED TABLE SHEET
  if (exportType === "table" || exportType === "both") {
    const tableRows = programmes.map((p, index) => {
      const isGroup = p.eventType?.includes("Group") || p.eventType?.includes("Squad");

      return {
        "Sl No": index + 1,
        "Programme Title": p.programTitle,
        "Programme Code": p.programCode,
        "Date": p.date || "TBA",
        "Category": p.category || "General",
        "Wing": p.wing || "General",
        "Event Type": p.eventType || "Individual",
        "1st Position Holder(s)": formatHolderString(p.firstPlace, isGroup),
        "2nd Position Holder(s)": formatHolderString(p.secondPlace, isGroup),
        "3rd Position Holder(s)": formatHolderString(p.thirdPlace, isGroup),
        "Grade A Holder(s)": formatHolderString(p.aGrade, isGroup),
        "Grade B Holder(s)": formatHolderString(p.bGrade, isGroup),
        "Venue": p.venue || "Campus",
      };
    });

    const tableSheet = XLSX.utils.json_to_sheet(tableRows);

    // Set auto column widths
    const colWidths = [
      { wch: 8 },  // Sl No
      { wch: 32 }, // Title
      { wch: 14 }, // Code
      { wch: 12 }, // Date
      { wch: 18 }, // Category
      { wch: 16 }, // Wing
      { wch: 15 }, // Event Type
      { wch: 45 }, // 1st Place
      { wch: 45 }, // 2nd Place
      { wch: 45 }, // 3rd Place
      { wch: 30 }, // Grade A
      { wch: 30 }, // Grade B
      { wch: 20 }, // Venue
    ];
    tableSheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, tableSheet, "Consolidated Results");
  }

  // 2. JUDGEMENTS BREAKDOWN SHEET
  if (exportType === "judgements" || exportType === "both") {
    const judgementRows: Record<string, any>[] = [];
    let sl = 1;

    programmes.forEach((prog) => {
      const addEntry = (items?: PdfExportWinnerItem[], defaultPos = "") => {
        if (!items || items.length === 0) return;
        items.forEach((item) => {
          judgementRows.push({
            "Sl No": sl++,
            "Programme Code": prog.programCode,
            "Programme Title": prog.programTitle,
            "Category": prog.category,
            "Wing": prog.wing,
            "Date": prog.date || "TBA",
            "Event Type": prog.eventType,
            "Position": item.position || defaultPos,
            "Admission No": item.addNo,
            "Winner Name": item.name,
            "Class": item.classTitle,
            "College / Center": item.collegeName || "Campus",
            "Points Awarded": item.points,
          });
        });
      };

      addEntry(prog.firstPlace, "1st Prize");
      addEntry(prog.secondPlace, "2nd Prize");
      addEntry(prog.thirdPlace, "3rd Prize");
      addEntry(prog.aGrade, "A Grade");
      addEntry(prog.bGrade, "B Grade");
    });

    if (judgementRows.length === 0) {
      judgementRows.push({
        "Sl No": 1,
        "Programme Code": "-",
        "Programme Title": "No published winner records",
        "Category": "-",
        "Wing": "-",
        "Date": "-",
        "Event Type": "-",
        "Position": "-",
        "Admission No": "-",
        "Winner Name": "-",
        "Class": "-",
        "College / Center": "-",
        "Points Awarded": 0,
      });
    }

    const judgementSheet = XLSX.utils.json_to_sheet(judgementRows);

    judgementSheet["!cols"] = [
      { wch: 8 },  // Sl No
      { wch: 15 }, // Code
      { wch: 30 }, // Title
      { wch: 18 }, // Category
      { wch: 16 }, // Wing
      { wch: 12 }, // Date
      { wch: 15 }, // Event Type
      { wch: 14 }, // Position
      { wch: 14 }, // AddNo
      { wch: 28 }, // Winner Name
      { wch: 24 }, // Class
      { wch: 26 }, // College
      { wch: 14 }, // Points
    ];

    XLSX.utils.book_append_sheet(workbook, judgementSheet, "Judgements Breakdown");
  }

  const defaultName =
    exportType === "judgements"
      ? "Judgements_Results_Breakdown.xlsx"
      : exportType === "table"
      ? "Consolidated_Results_Ledger.xlsx"
      : "Complete_Competition_Results.xlsx";

  const cleanFilename = filename ? (filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`) : defaultName;
  XLSX.writeFile(workbook, cleanFilename);
}
