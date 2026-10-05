import * as XLSX from "xlsx";
import Papa from "papaparse";

/**
 * Universal Excel and CSV Export/Import Engine
 */

export function exportToExcel<T extends object>(
  data: T[],
  filename: string,
  sheetName = "Sheet1"
): void {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

export function exportToCSV<T extends object>(data: T[], filename: string): void {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseSpreadsheet<T = any>(file: File): Promise<T[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<T>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results: Papa.ParseResult<T>) => {
          resolve(results.data);
        },
        error: (error: Error) => reject(error),
      });
    });
  }

  // Handle XLSX / XLS
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<T>(worksheet, { defval: "" });
  return jsonData;
}

/**
 * Standard Downloadable Sample Templates for Admins
 */
export function downloadSampleTemplate(type: "students" | "treasurers" | "wings" | "programmes" | "donations"): void {
  let sampleData: Record<string, any>[] = [];
  let filename = "";

  switch (type) {
    case "students":
      filename = "Students_Import_Template.xlsx";
      sampleData = [
        {
          AddNo: "STN101",
          StudentName: "Ahmad Raza",
          StudentEmail: "ahmad@example.com",
          FatherName: "Muhammad Raza",
          CollegeName: "Darul Huda Assam Centre",
          Class: "Degree 1st Year",
          StnState: "Assam",
          StnDistrict: "Dhubri",
        },
        {
          AddNo: "STN102",
          StudentName: "Zaid Khan",
          StudentEmail: "zaid@example.com",
          FatherName: "Tariq Khan",
          CollegeName: "Darul Huda Bengal Centre",
          Class: "Degree 2nd Year",
          StnState: "West Bengal",
          StnDistrict: "Kolkata",
        },
      ];
      break;

    case "treasurers":
      filename = "Treasurers_Import_Template.xlsx";
      sampleData = [
        {
          Treasurer_id: "TRZ_2026_01",
          Treasurer_Name: "Usman Ghani",
          Treasurer_Email: "usman.treasury@example.com",
          AccountingFor: "General Accounts",
          IsActive: true,
        },
      ];
      break;

    case "wings":
      filename = "Wings_Import_Template.xlsx";
      sampleData = [
        {
          WingCode: "WNG_ENG",
          WingTitle: "English Wing",
          WingEmail: "english.wing@example.com",
          WingManager: "Zubair Al-Huda",
          WingConvener: "Hamza Farooq",
          WingAssistant: "Ibrahim Noor",
          Description: "Promoting English literature, speech, and composition skills.",
        },
      ];
      break;

    case "programmes":
      filename = "Programmes_Import_Template.xlsx";
      sampleData = [
        {
          Program_Code: "PRG_2026_01",
          Program_Title: "Annual Arabic Calligraphy Contest",
          WingCode: "WNG_ARB",
          Category: "Competition",
          Group: "ClassicalSpace",
          Date: "2026-11-15",
          Venue: "Auditorium",
          AccademicYear: "2026-27",
          Description: "Statewide calligraphy exhibition and student competition.",
          is_group_program: false,
        },
      ];
      break;

    case "donations":
      filename = "Donations_Import_Template.xlsx";
      sampleData = [
        {
          Donator_Name: "Al-Huda Welfare Trust",
          Donator_Place: "Guwahati",
          DonationAmnts: 50000,
          DonationYear: 2026,
          FeedBack: "Educational welfare sponsorship",
          PayMentType: "UPI/Online",
        },
      ];
      break;
  }

  exportToExcel(sampleData, filename, "Template");
}
