import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfExportWinnerItem {
  position: string;
  addNo: string;
  name: string;
  classTitle: string;
  collegeName?: string;
  points: number | string;
  squadTitle?: string | null;
}

export interface PdfExportProgramItem {
  programCode: string;
  programTitle: string;
  category: string;
  wing: string;
  date: string;
  venue?: string;
  eventType: string; // 'Individual' | 'Squad / Group'
  pointsTemplateName?: string;
  firstPlace?: PdfExportWinnerItem[];
  secondPlace?: PdfExportWinnerItem[];
  thirdPlace?: PdfExportWinnerItem[];
  aGrade?: PdfExportWinnerItem[];
  bGrade?: PdfExportWinnerItem[];
  totalPoints?: number;
}

export interface PdfExportOptions {
  programmes: PdfExportProgramItem[];
  exportType: "judgements" | "table";
  filters?: {
    categoryTitle?: string;
    classTitle?: string;
    wingTitle?: string;
    searchQuery?: string;
    statusFilter?: string;
    dateRange?: string;
  };
  filename?: string;
  institutionTitle?: string;
  eventTitle?: string;
}

/**
 * Universal PDF Result Exporter
 * Generates official, publication-quality PDF documents with DHIU recognized branding.
 */
export function exportResultsToPdf(options: PdfExportOptions): void {
  const {
    programmes,
    exportType,
    filters = {},
    filename,
    institutionTitle = "DARUL HUDA ISLAMIC UNIVERSITY",
    eventTitle = "OFFICIAL FESTIVAL PROGRAMME RESULTS & AWARDS",
  } = options;

  if (!programmes || programmes.length === 0) {
    alert("No programme results available to export to PDF.");
    return;
  }

  // Type 1: Judgements Breakdown (Portrait)
  if (exportType === "judgements") {
    exportJudgementsPdf(programmes, filters, institutionTitle, eventTitle, filename);
  } else {
    // Type 2: Consolidated Table Row View (Landscape)
    exportConsolidatedTablePdf(programmes, filters, institutionTitle, eventTitle, filename);
  }
}

/**
 * TYPE 1: Judgements Breakdown Sheet
 * Per-programme basic info box followed by winner details (AddNo, Name, Class, Position & Points)
 */
function exportJudgementsPdf(
  programmes: PdfExportProgramItem[],
  filters: NonNullable<PdfExportOptions["filters"]>,
  institutionTitle: string,
  eventTitle: string,
  customFilename?: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Header Helper
  const drawPageHeader = (pageNumber: number) => {
    // Top Decorative Accent Bar
    doc.setFillColor(30, 41, 59); // Deep Slate
    doc.rect(0, 0, pageWidth, 5, "F");
    doc.setFillColor(79, 70, 229); // Indigo Accent
    doc.rect(0, 5, pageWidth, 1.5, "F");

    // Institution Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(institutionTitle, pageWidth / 2, 14, { align: "center" });

    // Document Title
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(eventTitle, pageWidth / 2, 19, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Official Judgement & Award Declaration Scorecards", pageWidth / 2, 23, { align: "center" });

    // Thin separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 25.5, pageWidth - margin, 25.5);

    // Meta filters summary bar (on page 1)
    if (pageNumber === 1) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, 27.5, pageWidth - margin * 2, 11, 2, 2, "F");
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, 27.5, pageWidth - margin * 2, 11, 2, 2, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      const fCategory = `Category: ${filters.categoryTitle || "All"}`;
      const fClass = `Class: ${filters.classTitle || "All Classes"}`;
      const fWing = `Wing: ${filters.wingTitle || "All Wings"}`;
      const fTotal = `Total Results: ${programmes.length}`;
      const fDate = `Generated: ${new Date().toLocaleDateString("en-GB")}`;

      doc.text(fCategory, margin + 4, 34);
      doc.text("•", margin + 44, 34);
      doc.text(fClass, margin + 48, 34);
      doc.text("•", margin + 92, 34);
      doc.text(fWing, margin + 96, 34);
      doc.text("•", margin + 134, 34);
      doc.text(fTotal, margin + 138, 34);
      doc.text(fDate, pageWidth - margin - 4, 34, { align: "right" });

      currentY = 43;
    } else {
      currentY = 29;
    }
  };

  // Draw first page header
  drawPageHeader(1);

  // Iterate programmes
  programmes.forEach((prog) => {
    // Check space remaining on page; each programme needs ~40-60mm
    if (currentY + 50 > pageHeight - 20) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
    }

    // Programme Header Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 1.5, 1.5, "F");
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 1.5, 1.5, "S");

    // Left program code badge
    doc.setFillColor(67, 56, 202); // Deep indigo
    doc.roundedRect(margin + 2, currentY + 2, 24, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(prog.programCode || "PROG", margin + 14, currentY + 6.8, { align: "center" });

    // Programme Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const titleText = prog.programTitle.length > 45 ? prog.programTitle.substring(0, 45) + "..." : prog.programTitle;
    doc.text(titleText, margin + 28, currentY + 7);

    // Meta details on right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const metaRight = `${prog.category} | ${prog.wing} | ${prog.date || "Date TBA"}`;
    doc.text(metaRight, pageWidth - margin - 4, currentY + 7, { align: "right" });

    currentY += 13.5;

    // Build Winners Rows
    const tableBody: any[] = [];

    const addWinners = (items?: PdfExportWinnerItem[], defaultPos = "") => {
      if (!items || items.length === 0) return;
      items.forEach((item) => {
        tableBody.push([
          item.position || defaultPos,
          item.addNo || "-",
          item.name || "Anonymous",
          item.classTitle || "-",
          item.points ? `${item.points} Pts` : "-",
          item.collegeName || "Campus",
        ]);
      });
    };

    addWinners(prog.firstPlace, "1st Prize");
    addWinners(prog.secondPlace, "2nd Prize");
    addWinners(prog.thirdPlace, "3rd Prize");
    addWinners(prog.aGrade, "A Grade");
    addWinners(prog.bGrade, "B Grade");

    if (tableBody.length === 0) {
      tableBody.push(["Pending", "-", "No position holders declared yet", "-", "-", "-"]);
    }

    // AutoTable for Programme Winners
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Position", "AddNo", "Candidate / Squad Name", "Class", "Points", "College / Center"]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 26 },
        1: { fontStyle: "bold", cellWidth: 20 },
        2: { fontStyle: "bold", cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { fontStyle: "bold", cellWidth: 18, halign: "center" },
        5: { cellWidth: "auto", fontSize: 7 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        // Highlight 1st, 2nd, 3rd position badges
        if (data.section === "body" && data.column.index === 0) {
          const val = String(data.cell.raw).toLowerCase();
          if (val.includes("1st")) {
            data.cell.styles.textColor = [180, 83, 9]; // Amber
          } else if (val.includes("2nd")) {
            data.cell.styles.textColor = [71, 85, 105]; // Silver slate
          } else if (val.includes("3rd")) {
            data.cell.styles.textColor = [194, 65, 12]; // Bronze
          }
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 20;
    currentY = finalY + 5;
  });

  // Footer & Signature Block
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Draw Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Official Festival Secretariat • Darul Huda Islamic University", margin, pageHeight - 8);

    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
  }

  const safeName = customFilename || `Judgements_Results_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}

/**
 * TYPE 2: Consolidated Summary Table
 * Tabular row format: sino, programe title, date, category, position holder names
 */
function exportConsolidatedTablePdf(
  programmes: PdfExportProgramItem[],
  filters: NonNullable<PdfExportOptions["filters"]>,
  institutionTitle: string,
  eventTitle: string,
  customFilename?: string
) {
  // Use Landscape for comfortable column fit
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Header for Page 1
  const drawPage1Header = () => {
    // Decorative Bar
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 4.5, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 4.5, pageWidth, 1.2, "F");

    // Institution Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(institutionTitle, pageWidth / 2, 11.5, { align: "center" });

    // Subtitle
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`${eventTitle} - CONSOLIDATED RESULTS DIRECTORY`, pageWidth / 2, 16, { align: "center" });

    // Meta filters summary bar (Page 1)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, 18.5, pageWidth - margin * 2, 8, 1.5, 1.5, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, 18.5, pageWidth - margin * 2, 8, 1.5, 1.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const fCategory = `Category: ${filters.categoryTitle || "All"}`;
    const fClass = `Class: ${filters.classTitle || "All Classes"}`;
    const fWing = `Wing: ${filters.wingTitle || "All Wings"}`;
    const fTotal = `Total Programmes: ${programmes.length}`;
    const fDate = `Generated: ${new Date().toLocaleDateString("en-GB")}`;

    doc.text(fCategory, margin + 4, 23.7);
    doc.text("•", margin + 55, 23.7);
    doc.text(fClass, margin + 60, 23.7);
    doc.text("•", margin + 120, 23.7);
    doc.text(fWing, margin + 125, 23.7);
    doc.text("•", margin + 180, 23.7);
    doc.text(fTotal, margin + 185, 23.7);
    doc.text(fDate, pageWidth - margin - 4, 23.7, { align: "right" });
  };

  drawPage1Header();

  // Helper to format winners cell:
  // - If Group: show Group name, line break, then small bullet members with only AddNo and Name (no class!)
  // - If Individual: show Candidate Name, AddNo, points (no class!)
  const formatWinnersCell = (items?: PdfExportWinnerItem[], isGroupEvent?: boolean): string => {
    if (!items || items.length === 0) return "-";

    const hasSquads = items.some((i) => Boolean(i.squadTitle));

    if (hasSquads || isGroupEvent) {
      // Group by squad name
      const squadMap = new Map<string, PdfExportWinnerItem[]>();
      items.forEach((item) => {
        const key = item.squadTitle?.trim() || "Squad Group";
        if (!squadMap.has(key)) squadMap.set(key, []);
        squadMap.get(key)!.push(item);
      });

      const lines: string[] = [];
      squadMap.forEach((members, squadName) => {
        const pts = members[0]?.points ? ` [${members[0].points}p]` : "";
        lines.push(`${squadName}${pts}`);
        members.forEach((m) => {
          lines.push(`  • ${m.addNo} ${m.name}`);
        });
      });
      return lines.join("\n");
    }

    // Individual: Candidate Name, (AddNo) [pts] - NO class
    return items
      .map((i) => {
        const pts = i.points ? ` [${i.points}p]` : "";
        return `${i.name} (${i.addNo})${pts}`;
      })
      .join("\n");
  };

  // Prepare table data
  const tableRows = programmes.map((p, index) => {
    const isGroup = p.eventType?.includes("Group") || p.eventType?.includes("Squad");

    const firstStr = formatWinnersCell(p.firstPlace, isGroup);
    const secondStr = formatWinnersCell(p.secondPlace, isGroup);
    const thirdStr = formatWinnersCell(p.thirdPlace, isGroup);

    const gradeItems = [...(p.aGrade || []), ...(p.bGrade || [])];
    const gradeStr = formatWinnersCell(gradeItems, isGroup);

    // Program title on top, program code secondary in parentheses
    const progTitleWithCode = `${p.programTitle}\n(${p.programCode})`;

    return [
      String(index + 1),
      progTitleWithCode,
      p.date || "TBA",
      p.category || "General",
      p.wing || "-",
      firstStr,
      secondStr,
      thirdStr,
      gradeStr,
    ];
  });

  // Table Columns: sino, programe title, date, category, position holder names
  autoTable(doc, {
    startY: 29,
    margin: { top: 16, left: margin, right: margin, bottom: 12 },
    head: [
      [
        "Sl",
        "Programme Title & Code",
        "Date",
        "Category",
        "Wing",
        "1st Position Holder(s)",
        "2nd Position Holder(s)",
        "3rd Position Holder(s)",
        "Grade Holders",
      ],
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.2,
      halign: "left",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 46, fontStyle: "bold" },
      2: { cellWidth: 18 },
      3: { cellWidth: 22, fontStyle: "bold" },
      4: { cellWidth: 20 },
      5: { cellWidth: 48 },
      6: { cellWidth: 44 },
      7: { cellWidth: 41 },
      8: { cellWidth: 30 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // On page 2 and later, draw a clean compact runner header at Y=9 with separator line at Y=12
      // Margin top is 16, so the table starts cleanly below with zero overlap!
      if (data.pageNumber > 1) {
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageWidth, 3.5, "F");
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 3.5, pageWidth, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`${institutionTitle} • CONSOLIDATED RESULTS DIRECTORY`, margin, 9.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Sheet ${data.pageNumber}`, pageWidth - margin, 9.5, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, 12, pageWidth - margin, 12);
      }
    },
  });

  // Add Page Numbers in footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Official Festival Secretariat • Darul Huda Islamic University", margin, pageHeight - 5.5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: "right" });
  }

  const safeName = customFilename || `Consolidated_Results_Ledger_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}
