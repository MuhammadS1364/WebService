import { SupaBaseFunction } from "./SupaBase";
import { hydrateResultRecords } from "./resultService";
import type {
  OurBatchesRecord,
  OurClassesRecord,
  OurCategoryRecord,
  OurVenuesRecord,
  OurGroupsRecord,
  PointsTemplateRecord,
} from "./types";

/**
 * Robust cascading deletion service.
 * Handles foreign key constraints automatically so users can cleanly delete
 * programmes, batches, classes, categories, venues, and groups without foreign-key blocks.
 */

/**
 * Automatically reverts awarded points to students, squads, and wings,
 * and rolls back direct points for no-result-required events before deleting programmes.
 */
async function revertProgrammesPointsBeforeDelete(programCodes: string[]): Promise<void> {
  const codes = programCodes.map((c) => c.trim()).filter(Boolean);
  if (codes.length === 0) return;

  try {
    // 1. Fetch programmes details
    const { data: progRows } = await SupaBaseFunction
      .from("ProgrammesBox")
      .select("Program_Code, WingCode, is_result_required, IsResulted, points_template, is_group_program")
      .in("Program_Code", codes);

    if (!progRows || progRows.length === 0) return;

    // 2. Fetch associated ResultBox records
    const { data: rawResults } = await SupaBaseFunction
      .from("ResultBox")
      .select("*")
      .in("Program_Id", codes);

    const hydratedResults = rawResults && rawResults.length > 0 ? await hydrateResultRecords(rawResults) : [];
    const resultMap = new Map<string, any>();
    hydratedResults.forEach((r) => {
      if (r.Program_Id) resultMap.set(r.Program_Id, r);
    });

    // 3. Fetch Points_Templates if referenced
    const templateIds = Array.from(new Set(progRows.map((p) => p.points_template).filter(Boolean))) as string[];
    let templatesMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      const { data: tmplData } = await SupaBaseFunction
        .from("Points_Templates")
        .select("*")
        .in("p_template_id", templateIds);
      (tmplData || []).forEach((t: any) => {
        templatesMap[t.p_template_id] = t;
      });
    }

    const defaultTmpl = {
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

    // Wing deductions tracker
    const wingDeductions: Record<string, { points: number; resultedCount: number; regCount: number }> = {};
    const ensureWing = (wCode: string) => {
      if (!wingDeductions[wCode]) {
        wingDeductions[wCode] = { points: 0, resultedCount: 0, regCount: 0 };
      }
      return wingDeductions[wCode];
    };

    for (const prog of progRows) {
      const wCode = prog.WingCode;
      if (wCode) {
        const tracker = ensureWing(wCode);
        tracker.regCount += 1;

        // If programme was created with NO result required, +2 points were awarded -> revert it!
        if (prog.is_result_required === false) {
          tracker.points += 2;
        }
      }

      // If results were declared, revert student, squad, and wing points
      const result = resultMap.get(prog.Program_Code);
      if (result) {
        if (wCode) {
          const tracker = ensureWing(wCode);
          tracker.resultedCount += 1;
        }

        const tmpl = (prog.points_template && templatesMap[prog.points_template]) || defaultTmpl;
        const isGroup = Boolean(prog.is_group_program || result.is_group);

        const posConfigs = [
          { addNos: result.firstHolderAddNos || (result.First_Holder ? [result.First_Holder] : []), pts: tmpl.first_A_grade || 10 },
          { addNos: result.secondHolderAddNos || (result.Second_Holder ? [result.Second_Holder] : []), pts: tmpl.second_A_grade || 8 },
          { addNos: result.thirdHolderAddNos || (result.Third_Holder ? [result.Third_Holder] : []), pts: tmpl.third_A_grade || 6 },
          { addNos: result.aGradeAddNos || (result.AGrade ? [result.AGrade] : []), pts: tmpl.A_grade || 5 },
          { addNos: result.bGradeAddNos || (result.BGrade ? [result.BGrade] : []), pts: tmpl.B_grade || 3 },
        ];

        let progTotalPts = 0;

        for (const cfg of posConfigs) {
          for (const rawAddNo of cfg.addNos) {
            const addNo = String(rawAddNo).trim();
            if (!addNo || addNo.toLowerCase() === "none" || addNo.toLowerCase() === "no grade") continue;

            progTotalPts += cfg.pts;

            try {
              const { data: stn } = await SupaBaseFunction
                .from("StudentsBox")
                .select("AddNo, Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
                .eq("AddNo", addNo)
                .maybeSingle();

              if (stn) {
                await SupaBaseFunction
                  .from("StudentsBox")
                  .update({
                    Resluted_Count: Math.max(0, Number(stn.Resluted_Count || 0) - 1),
                    Total_Point_Anjuman: Math.max(0, Number(stn.Total_Point_Anjuman || 0) - cfg.pts),
                    Grand_Total_Points: Math.max(0, Number(stn.Grand_Total_Points || 0) - cfg.pts),
                  })
                  .eq("AddNo", addNo);
              }
            } catch (stnErr) {
              console.warn("Could not revert student points on delete:", addNo, stnErr);
            }
          }
        }

        if (isGroup) {
          const squadIds = [
            result["1st_holder_group"],
            result["2nd_holder_group"],
            result["3rd_holder_group"],
            result.grade_holder_group1,
            result.grade_holder_group2,
          ].filter(Boolean);

          for (const sId of squadIds) {
            try {
              const { data: sq } = await SupaBaseFunction
                .from("SquadMate")
                .select("squad_id, total_points, winning_rate")
                .eq("squad_id", sId)
                .maybeSingle();

              if (sq) {
                await SupaBaseFunction
                  .from("SquadMate")
                  .update({
                    total_points: Math.max(0, Number(sq.total_points || 0) - 10),
                    winning_rate: Math.max(0, Number(sq.winning_rate || 0) - 1),
                  })
                  .eq("squad_id", sId);
              }
            } catch (sqErr) {
              console.warn("Could not revert squad points on delete:", sId, sqErr);
            }
          }
        }

        // Notice: Candidate competition points were only assigned to students/squads, not to the Wing.
        // Therefore, we only track resultedCount for the Wing, which was already incremented above.
      }
    }

    // 4. Update Chs-WingS with deductions
    for (const [wCode, deduction] of Object.entries(wingDeductions)) {
      try {
        const { data: wingRow } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, Total_Points, Total_Resulted, Total_Registrations")
          .eq("WingCode", wCode)
          .maybeSingle();

        if (wingRow) {
          await SupaBaseFunction
            .from("Chs-WingS")
            .update({
              Total_Points: Math.max(0, Number(wingRow.Total_Points || 0) - deduction.points),
              Total_Resulted: Math.max(0, Number(wingRow.Total_Resulted || 0) - deduction.resultedCount),
              Total_Registrations: Math.max(0, Number(wingRow.Total_Registrations || 0) - deduction.regCount),
            })
            .eq("WingCode", wCode);
        }
      } catch (wErr) {
        console.warn("Could not adjust wing metrics on programme delete:", wCode, wErr);
      }
    }
  } catch (err) {
    console.warn("Error in revertProgrammesPointsBeforeDelete:", err);
  }
}

export async function deleteProgrammeCascade(programCode: string): Promise<void> {
  const code = programCode.trim();
  if (!code) throw new Error("Invalid program code");

  // Revert all awarded points (students, squads, wings) before deleting
  await revertProgrammesPointsBeforeDelete([code]);

  // 1. Delete associated Content_Table rows
  try {
    const { error } = await SupaBaseFunction.from("Content_Table").delete().eq("programe_code", code);
    if (error) console.warn("Could not delete from Content_Table:", error);
  } catch (err) {
    console.warn("Could not delete from Content_Table:", err);
  }

  // 2. Delete associated ResultBox rows
  try {
    const { error } = await SupaBaseFunction.from("ResultBox").delete().eq("Program_Id", code);
    if (error) console.warn("Could not delete from ResultBox:", error);
  } catch (err) {
    console.warn("Could not delete from ResultBox:", err);
  }

  // 3. Delete Candidate Registration rows
  try {
    const { error } = await SupaBaseFunction.from("CandidateRegistrationTable").delete().eq("Program_Code", code);
    if (error) console.warn("Could not delete from CandidateRegistrationTable:", error);
  } catch (err) {
    console.warn("Could not delete from CandidateRegistrationTable:", err);
  }

  // 4. Delete FeedBack rows
  try {
    const { error } = await SupaBaseFunction.from("FeedBack").delete().eq("program_uuid", code);
    if (error) console.warn("Could not delete from FeedBack:", error);
  } catch (err) {
    console.warn("Could not delete from FeedBack:", err);
  }

  // 4b. Delete Topics_Box rows
  try {
    const { error } = await SupaBaseFunction.from("Topics_Box").delete().eq("program_code", code);
    if (error) console.warn("Could not delete from Topics_Box:", error);
  } catch (err) {
    console.warn("Could not delete from Topics_Box:", err);
  }

  // 5. Delete the main programme record
  let { error } = await SupaBaseFunction.from("ProgrammesBox").delete().eq("Program_Code", code);
  if (error && programCode !== code) {
    const retry = await SupaBaseFunction.from("ProgrammesBox").delete().eq("Program_Code", programCode);
    error = retry.error;
  }
  if (error) throw error;
}

export async function deleteProgrammesBulkCascade(programCodes: string[]): Promise<void> {
  const codes = programCodes.filter(Boolean);
  if (codes.length === 0) return;

  // Revert all awarded points (students, squads, wings) before deleting
  await revertProgrammesPointsBeforeDelete(codes);

  // 1. Content_Table
  try {
    const { error } = await SupaBaseFunction.from("Content_Table").delete().in("programe_code", codes);
    if (error) console.warn("Bulk Content_Table delete:", error);
  } catch (err) {
    console.warn("Could not bulk delete from Content_Table:", err);
  }

  // 2. ResultBox
  try {
    const { error } = await SupaBaseFunction.from("ResultBox").delete().in("Program_Id", codes);
    if (error) console.warn("Bulk ResultBox delete:", error);
  } catch (err) {
    console.warn("Could not bulk delete from ResultBox:", err);
  }

  // 3. CandidateRegistrationTable
  try {
    const { error } = await SupaBaseFunction.from("CandidateRegistrationTable").delete().in("Program_Code", codes);
    if (error) console.warn("Bulk CandidateRegistrationTable delete:", error);
  } catch (err) {
    console.warn("Could not bulk delete from CandidateRegistrationTable:", err);
  }

  // 4. FeedBack
  try {
    const { error } = await SupaBaseFunction.from("FeedBack").delete().in("program_uuid", codes);
    if (error) console.warn("Bulk FeedBack delete:", error);
  } catch (err) {
    console.warn("Could not bulk delete from FeedBack:", err);
  }

  // 4b. Topics_Box
  try {
    const { error } = await SupaBaseFunction.from("Topics_Box").delete().in("program_code", codes);
    if (error) console.warn("Bulk Topics_Box delete:", error);
  } catch (err) {
    console.warn("Could not bulk delete from Topics_Box:", err);
  }

  // 5. Delete ProgrammesBox
  const { error } = await SupaBaseFunction.from("ProgrammesBox").delete().in("Program_Code", codes);
  if (error) throw error;
}

export async function deleteBatchCascade(batch: OurBatchesRecord): Promise<void> {
  if (!batch.batch_id) throw new Error("Missing batch ID");

  // 1. Unlink any classes referencing this batch via batch_uuid (violates Our_Classes_batch_uuid_fkey)
  try {
    const { error } = await SupaBaseFunction
      .from("Our_Classes")
      .update({ batch_uuid: null })
      .eq("batch_uuid", batch.batch_id);
    if (error) console.warn("Could not unlink classes from batch_uuid:", error);
  } catch (err) {
    console.warn("Could not unlink classes from batch_uuid:", err);
  }

  // 2. Unlink any programmes referencing this batch in Collaborator
  if (batch.batch_name) {
    try {
      const { error } = await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Collaborator: "No Collaboration" })
        .eq("Collaborator", batch.batch_name);
      if (error) console.warn("Could not unlink programmes Collaborator:", error);
    } catch (err) {
      console.warn("Could not unlink programmes Collaborator:", err);
    }
  }

  // 3. Delete from Our_Batches
  const { error } = await SupaBaseFunction
    .from("Our_Batches")
    .delete()
    .eq("batch_id", batch.batch_id);
  if (error) throw error;
}

export async function deleteClassCascade(cls: OurClassesRecord): Promise<void> {
  if (!cls.class_id) throw new Error("Missing class ID");

  // 1. Unlink Our_Category class_1, class_2, class_3 (RESTRICT)
  try {
    await SupaBaseFunction.from("Our_Category").update({ class_1: null }).eq("class_1", cls.class_id);
    await SupaBaseFunction.from("Our_Category").update({ class_2: null }).eq("class_2", cls.class_id);
    await SupaBaseFunction.from("Our_Category").update({ class_3: null }).eq("class_3", cls.class_id);
  } catch (err) {
    console.warn("Could not unlink categories from class:", err);
  }

  // 2. Unlink StudentsBox Stn_Class
  try {
    await SupaBaseFunction.from("StudentsBox").update({ Stn_Class: null }).eq("Stn_Class", cls.class_id);
  } catch (err) {
    console.warn("Could not unlink students from class:", err);
  }

  // 3. Delete Our_Classes
  const { error } = await SupaBaseFunction
    .from("Our_Classes")
    .delete()
    .eq("class_id", cls.class_id);
  if (error) throw error;
}

export async function deleteCategoryCascade(cat: OurCategoryRecord): Promise<void> {
  if (!cat.category_id) throw new Error("Missing category ID");

  // 1. Unlink Category from ProgrammesBox
  try {
    await SupaBaseFunction.from("ProgrammesBox").update({ Category: null }).eq("Category", cat.category_id);
  } catch (err) {
    console.warn("Could not unlink Category from ProgrammesBox:", err);
  }

  // 2. Delete Our_Category
  const { error } = await SupaBaseFunction
    .from("Our_Category")
    .delete()
    .eq("category_id", cat.category_id);
  if (error) throw error;
}

export async function deleteVenueCascade(ven: OurVenuesRecord): Promise<void> {
  if (!ven.venue_id) throw new Error("Missing venue ID");

  // 1. Unlink Venue from ProgrammesBox
  try {
    await SupaBaseFunction.from("ProgrammesBox").update({ Venue: null }).eq("Venue", ven.venue_id);
  } catch (err) {
    console.warn("Could not unlink Venue from ProgrammesBox:", err);
  }

  // 2. Delete Our_Venues
  const { error } = await SupaBaseFunction
    .from("Our_Venues")
    .delete()
    .eq("venue_id", ven.venue_id);
  if (error) throw error;
}

export async function deleteGroupCascade(grp: OurGroupsRecord): Promise<void> {
  if (!grp.group_id) throw new Error("Missing group ID");

  // 1. Unlink Group from ProgrammesBox
  try {
    await SupaBaseFunction.from("ProgrammesBox").update({ Group: null }).eq("Group", grp.group_id);
  } catch (err) {
    console.warn("Could not unlink Group from ProgrammesBox:", err);
  }

  // 2. Delete Our_Groups
  const { error } = await SupaBaseFunction
    .from("Our_Groups")
    .delete()
    .eq("group_id", grp.group_id);
  if (error) throw error;
}

export async function deletePointsTemplateCascade(tmpl: PointsTemplateRecord): Promise<void> {
  if (!tmpl.p_template_id) throw new Error("Missing points template ID");

  // 1. Unlink points_template from ProgrammesBox
  try {
    await SupaBaseFunction.from("ProgrammesBox").update({ points_template: null }).eq("points_template", tmpl.p_template_id);
  } catch (err) {
    console.warn("Could not unlink points_template from ProgrammesBox:", err);
  }

  // 2. Delete Points_Templates
  const { error } = await SupaBaseFunction
    .from("Points_Templates")
    .delete()
    .eq("p_template_id", tmpl.p_template_id);
  if (error) throw error;
}
