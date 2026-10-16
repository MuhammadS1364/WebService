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
    const isGroup = Boolean(r.is_group);

    const resolvePosition = (
      groupSquadId?: string | null,
      candUuid?: string | null,
      legacyValue?: string | null
    ): { value: string | null; squadTitle: string | null; addNos: string[] } => {
      if (isGroup && groupSquadId && squadMap[groupSquadId]) {
        const sq = squadMap[groupSquadId];
        return {
          value: sq.members.join(", ") || sq.squad_title,
          squadTitle: sq.squad_title,
          addNos: sq.members,
        };
      }

      if (!isGroup && candUuid && candUuidToCodeMap[candUuid]) {
        const addNo = candUuidToCodeMap[candUuid];
        return {
          value: addNo,
          squadTitle: null,
          addNos: [addNo],
        };
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
    // 1. Check existing registration
    const { data: existing } = await SupaBaseFunction
      .from("CandidateRegistrationTable")
      .select("CandidateUUiD")
      .eq("Program_Code", programCode)
      .ilike("Candidate_Code", cleanCode)
      .maybeSingle();

    if (existing?.CandidateUUiD) {
      return existing.CandidateUUiD;
    }

    // 2. If not registered, create registration row to satisfy Foreign Key
    const { data: created, error } = await SupaBaseFunction
      .from("CandidateRegistrationTable")
      .insert([
        {
          Program_Code: programCode,
          Candidate_Code: cleanCode,
          squad_uuid: null,
        },
      ])
      .select("CandidateUUiD")
      .single();

    if (error) {
      console.warn("Could not insert CandidateRegistrationTable row:", error);
      return null;
    }

    return created?.CandidateUUiD || null;
  } catch (err) {
    console.error("Error ensuring CandidateRegistrationTable entry:", err);
    return null;
  }
}
