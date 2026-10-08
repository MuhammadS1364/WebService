import { SupaBaseFunction } from "../../lib/SupaBase";
import type { StudentRecord } from "../../lib/types";

export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  duplicatesSkipped: number;
  errors: string[];
}

/**
 * High-performance batch student importer
 * Uses batch upserts to insert user accounts and student profiles in 2 network queries
 * instead of hundreds of sequential queries.
 */
export async function importStudentsBatch(rawRows: any[]): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    totalRows: rawRows.length,
    successCount: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  if (!rawRows || rawRows.length === 0) {
    result.errors.push("No data rows found in the provided spreadsheet.");
    return result;
  }

  // 1. Sanitize and normalize rows with fuzzy header mapping
  const classMap = new Map<string, string>();
  try {
    const { data: classesData } = await SupaBaseFunction.from("Our_Classes").select("class_id, standard_name, class_nick_name");
    if (classesData) {
      for (const cls of classesData) {
        if (cls.standard_name) classMap.set(cls.standard_name.toLowerCase().trim(), cls.class_id);
        if (cls.class_nick_name) classMap.set(cls.class_nick_name.toLowerCase().trim(), cls.class_id);
      }
    }
  } catch (e) {
    console.warn("Could not load Our_Classes during import:", e);
  }

  const validStudents: StudentRecord[] = [];
  const usersToCreate: { UserEmail: string; UserPassword: string; UserRole: string }[] = [];
  const seenEmails = new Set<string>();
  const seenAddNos = new Set<string>();

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];

    // Support flexible header names
    const addNo = String(row.AddNo || row["Admission No"] || row["Add No"] || row.AdmissionNumber || "").trim();
    const studentName = String(row.StudentName || row["Student Name"] || row.Name || "").trim();
    const studentEmail = String(row.StudentEmail || row["Student Email"] || row.Email || "").trim().toLowerCase();
    const fatherName = String(row.FatherName || row["Father Name"] || row.Father || "").trim();
    const collegeName = String(row.CollegeName || row["College Name"] || row.College || "").trim();
    const className = String(row.Class || row["Class Target"] || "").trim();
    const stnClassUuid = className ? classMap.get(className.toLowerCase().trim()) || null : null;
    const stnState = String(row.StnState || row.State || "Not Provided").trim();
    const stnDistrict = String(row.StnDistrict || row.District || "Not Provided").trim();

    if (!addNo || !studentEmail) {
      // Skip empty or invalid rows
      continue;
    }

    if (seenEmails.has(studentEmail) || seenAddNos.has(addNo)) {
      result.duplicatesSkipped++;
      continue;
    }

    seenEmails.add(studentEmail);
    seenAddNos.add(addNo);

    validStudents.push({
      AddNo: addNo,
      StudentName: studentName || "Unnamed Student",
      StudentEmail: studentEmail,
      FatherName: fatherName,
      CollegeName: collegeName,
      Class: className,
      Stn_Class: stnClassUuid || undefined,
      StnState: stnState,
      StnDistrict: stnDistrict,
      StnUserId: studentEmail,
      IsActive: true,
      Registration_Count: 0,
      Resluted_Count: 0,
      Total_Point_Anjuman: 0,
      OutReach_Count: 0,
      OutReach_Points: 0,
      Achievements_Counts: 0,
      Achievements_Points: 0,
      Grand_Total_Points: 0,
    });

    usersToCreate.push({
      UserEmail: studentEmail,
      UserPassword: addNo, // Default initial password is admission number
      UserRole: "Student",
    });
  }

  if (validStudents.length === 0) {
    result.errors.push("No valid student records with both Admission No and Email were found.");
    return result;
  }

  try {
    // 2. Batch upsert User accounts into UserTable (ignores existing users)
    const { error: userError } = await SupaBaseFunction
      .from("UserTable")
      .upsert(usersToCreate, { onConflict: "UserEmail", ignoreDuplicates: true });

    if (userError) {
      console.warn("UserTable sync notice:", userError.message);
    }

    // 3. Batch upsert Student records into StudentsBox
    let { error: studentError } = await SupaBaseFunction
      .from("StudentsBox")
      .upsert(validStudents, { onConflict: "AddNo", ignoreDuplicates: true });

    if (studentError && studentError.message?.toLowerCase().includes("class")) {
      const sanitized = validStudents.map(({ Class: _cls, ...rest }) => rest);
      const retry = await SupaBaseFunction
        .from("StudentsBox")
        .upsert(sanitized, { onConflict: "AddNo", ignoreDuplicates: true });
      studentError = retry.error;
    }

    if (studentError) {
      throw new Error(`StudentsBox ingestion failed: ${studentError.message}`);
    }

    result.successCount = validStudents.length;
  } catch (err: any) {
    result.errors.push(err.message || "Failed to commit batch records to database.");
  }

  return result;
}
