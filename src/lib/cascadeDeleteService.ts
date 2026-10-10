import { SupaBaseFunction } from "./SupaBase";
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

export async function deleteProgrammeCascade(programCode: string): Promise<void> {
  const code = programCode.trim();
  if (!code) throw new Error("Invalid program code");

  // 1. Delete associated Content_Table rows (references ProgrammesBox)
  try {
    const { error } = await SupaBaseFunction.from("Content_Table").delete().eq("programe_code", code);
    if (error) console.warn("Could not delete from Content_Table:", error);
  } catch (err) {
    console.warn("Could not delete from Content_Table:", err);
  }

  // 2. Delete associated ResultBox rows (references ProgrammesBox)
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

  // 4b. Delete Topics_Box rows (references ProgrammesBox with RESTRICT)
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
