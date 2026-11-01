import { SupaBaseFunction } from "./SupaBase";
import type { ResultBoxRecord } from "./types";

/**
 * Result Normalizer & Hydration Service for updated ResultBox schema
 */

export interface NormalizedResultRecord extends ResultBoxRecord {
  // Human-readable titles / AddNos for cards and displays
  firstHolderAddNos?: string[];
  secondHolderAddNos?: string[];
  thirdHolderAddNos?: string[];
  aGradeAddNos?: string[];
  bGradeAddNos?: string[];
  firstSquadTitle?: string | null;
  secondSquadTitle?: string | null;
  thirdSquadTitle?: string | null;
  aGradeSquadTitle?: string | null;
  bGradeSquadTitle?: string | null;
}

/**
 * Hydrates an array of raw ResultBox rows into populated records with
 * First_Holder, Second_Holder, Third_Holder, AGrade, and BGrade resolved.
 */
export async function hydrateResultRecords(
  rows: ResultBoxRecord[]
): Promise<NormalizedResultRecord[]> {
  if (!rows || rows.length === 0) return [];

  // Collect all CandidateUUiDs (individual) and Squad IDs (group)
  const candUuids = new Set<string>();
  const squadUuids = new Set<string>();

  rows.forEach((r) => {
    // Individual candidate UUIDs
    [r.First_Holder_uuid, r.Second_Holder_uuid, r.Third_Holder_uuid, r.Grade1_uuid, r.Grade2_uuid].forEach(
      (u) => {
        if (u && typeof u === "string" && u.trim()) {
          candUuids.add(u.trim());
        }
      }
    );

    // Group Squad UUIDs
    [
      r["1st_holder_group"],
      r["2nd_holder_group"],
      r["3rd_holder_group"],
      r.grade_holder_group1,
      r.grade_holder_group2,
    ].forEach((s) => {
      if (s && typeof s === "string" && s.trim()) {
        squadUuids.add(s.trim());
      }
    });
  });

  // Fetch CandidateRegistrationTable for candidate UUIDs
  const candUuidToCodeMap: Record<string, string> = {};
  if (candUuids.size > 0) {
    try {
      const { data: cData } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("CandidateUUiD, Candidate_Code")
        .in("CandidateUUiD", Array.from(candUuids));

      (cData || []).forEach((c: any) => {
        if (c.CandidateUUiD && c.Candidate_Code) {
          candUuidToCodeMap[c.CandidateUUiD] = c.Candidate_Code.trim();
        }
      });
    } catch (err) {
      console.warn("Could not load candidate registrations for results:", err);
    }
  }

  // Fetch SquadMate for squad UUIDs
  const squadMap: Record<string, { squad_title: string; members: string[] }> = {};
  if (squadUuids.size > 0) {
    try {
      const { data: sData } = await SupaBaseFunction
        .from("SquadMate")
        .select("squad_id, squad_title, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
        .in("squad_id", Array.from(squadUuids));

      (sData || []).forEach((sq: any) => {
        const members = [
          sq.member1_uuid,
          sq.member2_uuid,
          sq.member3_uuid,
          sq.member4_uuid,
          sq.member5_uuid,
          sq.member6_uuid,
          sq.member7_uuid,
        ].filter((m): m is string => Boolean(m && String(m).trim()));

        squadMap[sq.squad_id] = {
          squad_title: sq.squad_title || "Group",
          members,
        };
      });
    } catch (err) {
      console.warn("Could not load squads for results:", err);
    }
  }

  // Map each ResultBox row
  return rows.map((r) => {
    // Robust detection: explicit is_group boolean or presence of group position holders
    const hasGroupHolders = Boolean(
      r["1st_holder_group"] ||
      r["2nd_holder_group"] ||
      r["3rd_holder_group"] ||
      r.grade_holder_group1 ||
      r.grade_holder_group2
    );
    const isGroup = Boolean(r.is_group ?? hasGroupHolders);

    const resolvePosition = (
      groupSquadId?: string | null,
      candUuid?: string | null,
      legacyValue?: string | null
    ): { value: string | null; squadTitle: string | null; addNos: string[] } => {
      if (isGroup && groupSquadId) {
        const sq = squadMap[groupSquadId];
        if (sq) {
          return {
            value: sq.members.join(", ") || sq.squad_title,
            squadTitle: sq.squad_title,
            addNos: sq.members,
          };
        }
        return {
          value: groupSquadId,
          squadTitle: "Group Squad",
          addNos: [],
        };
      }

      if (!isGroup && candUuid) {
        const addNo = candUuidToCodeMap[candUuid];
        if (addNo) {
          return {
            value: addNo,
            squadTitle: null,
            addNos: [addNo],
          };
        }
        // If candUuid is already an AddNo format (non-UUID string)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candUuid)) {
          return {
            value: candUuid,
            squadTitle: null,
            addNos: [candUuid],
          };
        }
      }

      // Fallback to legacy string or raw value if already set
      if (legacyValue) {
        return {
          value: legacyValue,
          squadTitle: null,
          addNos: legacyValue.split(",").map((s) => s.trim()).filter(Boolean),
        };
      }

      return {
        value: null,
        squadTitle: null,
        addNos: [],
      };
    };

    const first = resolvePosition(r["1st_holder_group"], r.First_Holder_uuid, r.First_Holder);
    const second = resolvePosition(r["2nd_holder_group"], r.Second_Holder_uuid, r.Second_Holder);
    const third = resolvePosition(r["3rd_holder_group"], r.Third_Holder_uuid, r.Third_Holder);
    const aGrade = resolvePosition(r.grade_holder_group1, r.Grade1_uuid, r.AGrade);
    const bGrade = resolvePosition(r.grade_holder_group2, r.Grade2_uuid, r.BGrade);

    return {
      ...r,
      First_Holder: first.value,
      Second_Holder: second.value,
      Third_Holder: third.value,
      AGrade: aGrade.value,
      BGrade: bGrade.value,
      firstHolderAddNos: first.addNos,
      secondHolderAddNos: second.addNos,
      thirdHolderAddNos: third.addNos,
      aGradeAddNos: aGrade.addNos,
      bGradeAddNos: bGrade.addNos,
      firstSquadTitle: first.squadTitle,
      secondSquadTitle: second.squadTitle,
      thirdSquadTitle: third.squadTitle,
      aGradeSquadTitle: aGrade.squadTitle,
      bGradeSquadTitle: bGrade.squadTitle,
    };
  });
}

/**
 * Ensure a candidate has a row in CandidateRegistrationTable and return their CandidateUUiD
 */
export async function ensureCandidateRegistrationUuid(
  programCode: string,
  candidateAddNo: string
): Promise<string | null> {
  if (!programCode || !candidateAddNo) return null;
  const cleanCode = candidateAddNo.trim();

  try {
    // If candidateAddNo is ALREADY a valid UUID, verify if it exists in CandidateRegistrationTable
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode)) {
      const { data: directCheck } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("CandidateUUiD")
        .eq("CandidateUUiD", cleanCode)
        .maybeSingle();
      if (directCheck?.CandidateUUiD) {
        return directCheck.CandidateUUiD;
      }
    }

    // 1. Check existing individual registration
    // Note: for individual programs, squad_uuid is NULL and Candidate_Code holds the AddNo
    const { data: existing } = await SupaBaseFunction
      .from("CandidateRegistrationTable")
      .select("CandidateUUiD")
      .eq("Program_Code", programCode)
      .ilike("Candidate_Code", cleanCode)
      .maybeSingle();

    if (existing?.CandidateUUiD) {
      return existing.CandidateUUiD;
    }

    // 2. Verify candidate exists in StudentsBox to satisfy foreign key CandidateRegistrationTable_Candidate_Code_fkey
    const { data: student } = await SupaBaseFunction
      .from("StudentsBox")
      .select("AddNo")
      .ilike("AddNo", cleanCode)
      .maybeSingle();

    const verifiedAddNo = student?.AddNo || cleanCode;

    // 3. Insert registration row: Candidate_Code = AddNo, squad_uuid = null (as required for individual)
    const { data: created, error } = await SupaBaseFunction
      .from("CandidateRegistrationTable")
      .insert([
        {
          Program_Code: programCode,
          Candidate_Code: verifiedAddNo,
          squad_uuid: null,
        },
      ])
      .select("CandidateUUiD")
      .single();

    if (error) {
      console.warn("Could not insert CandidateRegistrationTable row:", error);
      // If concurrent insert occurred, attempt re-fetch
      const { data: retry } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("CandidateUUiD")
        .eq("Program_Code", programCode)
        .ilike("Candidate_Code", verifiedAddNo)
        .maybeSingle();
      return retry?.CandidateUUiD || null;
    }

    return created?.CandidateUUiD || null;
  } catch (err) {
    console.error("Error ensuring CandidateRegistrationTable entry:", err);
    return null;
  }
}

/**
 * Reverts points previously awarded for a programme's result from StudentsBox and SquadMate.
 * Strictly calculates original points awarded before any edit or deletion.
 */
export async function revertResultPoints(programCode: string): Promise<{
  success: boolean;
  revertedStudentsCount: number;
  revertedSquadsCount: number;
  error?: string;
}> {
  if (!programCode) return { success: false, revertedStudentsCount: 0, revertedSquadsCount: 0, error: "Missing program code" };

  try {
    // 1. Fetch the existing ResultBox row
    const { data: rawResult, error: rError } = await SupaBaseFunction
      .from("ResultBox")
      .select("*")
      .eq("Program_Id", programCode)
      .maybeSingle();

    if (rError || !rawResult) {
      return { success: true, revertedStudentsCount: 0, revertedSquadsCount: 0 };
    }

    // 2. Fetch the Programme details
    const { data: prog } = await SupaBaseFunction
      .from("ProgrammesBox")
      .select("Program_Code, is_group_program, points_template, WingCode, AccademicYear")
      .eq("Program_Code", programCode)
      .maybeSingle();

    // 3. Fetch the Points Template
    let template = {
      first_only: 5,
      first_A_grade: 10,
      first_B_grade: 8,
      second_only: 3,
      second_A_grade: 8,
      second_B_grade: 6,
      third_only: 1,
      third_A_grade: 6,
      third_B_grade: 4,
      A_grade: 5,
      B_grade: 3,
    };

    if (prog?.points_template) {
      const { data: tmpl } = await SupaBaseFunction
        .from("Points_Templates")
        .select("*")
        .eq("p_template_id", prog.points_template)
        .maybeSingle();
      if (tmpl) {
        template = {
          first_only: tmpl.first_only ?? 5,
          first_A_grade: tmpl.first_A_grade ?? 10,
          first_B_grade: tmpl.first_B_grade ?? 8,
          second_only: tmpl.second_only ?? 3,
          second_A_grade: tmpl.second_A_grade ?? 8,
          second_B_grade: tmpl.second_B_grade ?? 6,
          third_only: tmpl.third_only ?? 1,
          third_A_grade: tmpl.third_A_grade ?? 6,
          third_B_grade: tmpl.third_B_grade ?? 4,
          A_grade: tmpl.A_grade ?? 5,
          B_grade: tmpl.B_grade ?? 3,
        };
      }
    }

    const isGroup = Boolean(
      rawResult.is_group ??
      prog?.is_group_program ??
      (rawResult["1st_holder_group"] || rawResult["2nd_holder_group"] || rawResult["3rd_holder_group"])
    );

    const studentPointDeductions: Record<string, number> = {};
    const squadPointDeductions: Record<string, number> = {};

    const addStudentDeduction = (addNo?: string | null, pts?: number) => {
      if (!addNo || !pts || pts <= 0) return;
      const clean = addNo.trim();
      studentPointDeductions[clean] = (studentPointDeductions[clean] || 0) + pts;
    };

    const addSquadDeduction = (squadId?: string | null, pts?: number) => {
      if (!squadId || !pts || pts <= 0) return;
      const clean = squadId.trim();
      squadPointDeductions[clean] = (squadPointDeductions[clean] || 0) + pts;
    };

    if (isGroup) {
      // Group Programme Reversion
      const g1 = rawResult["1st_holder_group"];
      const g2 = rawResult["2nd_holder_group"];
      const g3 = rawResult["3rd_holder_group"];
      const ga = rawResult.grade_holder_group1;
      const gb = rawResult.grade_holder_group2;

      const groupIds = [g1, g2, g3, ga, gb].filter((id): id is string => Boolean(id && typeof id === "string" && id.trim()));
      const uniqueGroupIds = Array.from(new Set(groupIds));

      const squadMap: Record<string, string[]> = {};
      if (uniqueGroupIds.length > 0) {
        const { data: squadRows } = await SupaBaseFunction
          .from("SquadMate")
          .select("squad_id, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
          .in("squad_id", uniqueGroupIds);

        (squadRows || []).forEach((sq: any) => {
          const members = [
            sq.member1_uuid,
            sq.member2_uuid,
            sq.member3_uuid,
            sq.member4_uuid,
            sq.member5_uuid,
            sq.member6_uuid,
            sq.member7_uuid,
          ].filter((m): m is string => Boolean(m && typeof m === "string" && m.trim()));
          squadMap[sq.squad_id] = members;
        });
      }

      // 1st Place
      if (g1) {
        const grade = ga === g1 ? "A" : gb === g1 ? "B" : "none";
        const pts = grade === "A" ? template.first_A_grade : grade === "B" ? template.first_B_grade : template.first_only;
        addSquadDeduction(g1, pts);
        const members = squadMap[g1] || [];
        members.forEach((m) => addStudentDeduction(m, pts));
      }

      // 2nd Place
      if (g2) {
        const grade = ga === g2 ? "A" : gb === g2 ? "B" : "none";
        const pts = grade === "A" ? template.second_A_grade : grade === "B" ? template.second_B_grade : template.second_only;
        addSquadDeduction(g2, pts);
        const members = squadMap[g2] || [];
        members.forEach((m) => addStudentDeduction(m, pts));
      }

      // 3rd Place
      if (g3) {
        const grade = ga === g3 ? "A" : gb === g3 ? "B" : "none";
        const pts = grade === "A" ? template.third_A_grade : grade === "B" ? template.third_B_grade : template.third_only;
        addSquadDeduction(g3, pts);
        const members = squadMap[g3] || [];
        members.forEach((m) => addStudentDeduction(m, pts));
      }

      // Separate A Grade Squad
      if (ga && ga !== g1 && ga !== g2 && ga !== g3) {
        const pts = template.A_grade;
        addSquadDeduction(ga, pts);
        const members = squadMap[ga] || [];
        members.forEach((m) => addStudentDeduction(m, pts));
      }

      // Separate B Grade Squad
      if (gb && gb !== g1 && gb !== g2 && gb !== g3) {
        const pts = template.B_grade;
        addSquadDeduction(gb, pts);
        const members = squadMap[gb] || [];
        members.forEach((m) => addStudentDeduction(m, pts));
      }
    } else {
      // Individual Programme Reversion
      const u1 = rawResult.First_Holder_uuid;
      const u2 = rawResult.Second_Holder_uuid;
      const u3 = rawResult.Third_Holder_uuid;
      const ua = rawResult.Grade1_uuid;
      const ub = rawResult.Grade2_uuid;

      const candUuids = [u1, u2, u3, ua, ub].filter((u): u is string => Boolean(u && typeof u === "string" && u.trim()));
      const candUuidToCodeMap: Record<string, string> = {};

      if (candUuids.length > 0) {
        const { data: regRows } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("CandidateUUiD, Candidate_Code")
          .in("CandidateUUiD", candUuids);

        (regRows || []).forEach((r: any) => {
          if (r.CandidateUUiD && r.Candidate_Code) {
            candUuidToCodeMap[r.CandidateUUiD] = String(r.Candidate_Code).trim();
          }
        });
      }

      const resolveCandidateAddNo = (uuid?: string | null, legacyVal?: string | null): string | null => {
        if (uuid && candUuidToCodeMap[uuid]) return candUuidToCodeMap[uuid];
        if (uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
          return uuid;
        }
        if (legacyVal) return legacyVal.split(",")[0].trim();
        return null;
      };

      const c1 = resolveCandidateAddNo(u1, rawResult.First_Holder);
      const c2 = resolveCandidateAddNo(u2, rawResult.Second_Holder);
      const c3 = resolveCandidateAddNo(u3, rawResult.Third_Holder);
      const ca = resolveCandidateAddNo(ua, rawResult.AGrade);
      const cb = resolveCandidateAddNo(ub, rawResult.BGrade);

      if (c1) {
        const grade = (ua && ua === u1) ? "A" : (ub && ub === u1) ? "B" : "none";
        const pts = grade === "A" ? template.first_A_grade : grade === "B" ? template.first_B_grade : template.first_only;
        addStudentDeduction(c1, pts);
      }

      if (c2) {
        const grade = (ua && ua === u2) ? "A" : (ub && ub === u2) ? "B" : "none";
        const pts = grade === "A" ? template.second_A_grade : grade === "B" ? template.second_B_grade : template.second_only;
        addStudentDeduction(c2, pts);
      }

      if (c3) {
        const grade = (ua && ua === u3) ? "A" : (ub && ub === u3) ? "B" : "none";
        const pts = grade === "A" ? template.third_A_grade : grade === "B" ? template.third_B_grade : template.third_only;
        addStudentDeduction(c3, pts);
      }

      if (ca && ca !== c1 && ca !== c2 && ca !== c3) {
        addStudentDeduction(ca, template.A_grade);
      }

      if (cb && cb !== c1 && cb !== c2 && cb !== c3) {
        addStudentDeduction(cb, template.B_grade);
      }
    }

    // Execute rollback in StudentsBox
    const studentAddNos = Object.keys(studentPointDeductions);
    for (const addNo of studentAddNos) {
      const deductPts = studentPointDeductions[addNo];
      try {
        const { data: stn } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
          .eq("AddNo", addNo)
          .maybeSingle();

        if (stn) {
          const currentResulted = Number(stn.Resluted_Count || 0);
          const currentAnjuman = Number(stn.Total_Point_Anjuman || 0);
          const currentGrand = Number(stn.Grand_Total_Points || 0);

          await SupaBaseFunction
            .from("StudentsBox")
            .update({
              Resluted_Count: Math.max(0, currentResulted - 1),
              Total_Point_Anjuman: Math.max(0, currentAnjuman - deductPts),
              Grand_Total_Points: Math.max(0, currentGrand - deductPts),
            })
            .eq("AddNo", addNo);
        }
      } catch (err) {
        console.warn(`Failed to revert points for student ${addNo}:`, err);
      }
    }

    // Execute rollback in SquadMate
    const squadIds = Object.keys(squadPointDeductions);
    for (const sqId of squadIds) {
      const deductPts = squadPointDeductions[sqId];
      try {
        const { data: sq } = await SupaBaseFunction
          .from("SquadMate")
          .select("squad_id, total_points, winning_rate")
          .eq("squad_id", sqId)
          .maybeSingle();

        if (sq) {
          const currentPts = Number(sq.total_points || 0);
          const currentWins = Number(sq.winning_rate || 0);

          await SupaBaseFunction
            .from("SquadMate")
            .update({
              total_points: Math.max(0, currentPts - deductPts),
              winning_rate: Math.max(0, currentWins - 1),
            })
            .eq("squad_id", sqId);
        }
      } catch (err) {
        console.warn(`Failed to revert points for squad ${sqId}:`, err);
      }
    }

    return {
      success: true,
      revertedStudentsCount: studentAddNos.length,
      revertedSquadsCount: squadIds.length,
    };
  } catch (err: any) {
    console.error("Error reverting result points:", err);
    return {
      success: false,
      revertedStudentsCount: 0,
      revertedSquadsCount: 0,
      error: err?.message || "Error reverting result points",
    };
  }
}

import { syncAllStudentAndSquadPoints } from "./pointAuditService";

/**
 * Delete official result with full point rollback for Wing and Admin.
 * 1. Deletes row from ResultBox.
 * 2. Resets ProgrammesBox flags (IsResulted = false, IsResultPublished = false, is_freezed = false).
 * 3. Authoritatively recalibrates all student, squad, and wing points from remaining published results.
 */
export async function deleteOfficialResult(programCode: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!programCode) return { success: false, message: "Missing programme code" };

  try {
    // 1. Delete from ResultBox
    const { error: delError } = await SupaBaseFunction
      .from("ResultBox")
      .delete()
      .eq("Program_Id", programCode);

    if (delError) {
      throw new Error(delError.message || "Failed to delete from ResultBox");
    }

    // 2. Reset ProgrammesBox flags
    const { error: progUpdateError } = await SupaBaseFunction
      .from("ProgrammesBox")
      .update({
        IsResulted: false,
        IsResultPublished: false,
        is_freezed: false,
      })
      .eq("Program_Code", programCode);

    if (progUpdateError) {
      console.warn("Warning updating ProgrammesBox after result deletion:", progUpdateError);
    }

    // 3. Authoritatively recalculate and synchronize points for all students, squads, and wings
    const syncOutcome = await syncAllStudentAndSquadPoints();

    return {
      success: true,
      message: `Result successfully deleted and all student points authoritatively reconciled (${syncOutcome.studentsUpdated} student profile(s) recalibrated).`,
    };
  } catch (err: any) {
    console.error("Error deleting official result:", err);
    return {
      success: false,
      message: err?.message || "Failed to delete result record.",
    };
  }
}
