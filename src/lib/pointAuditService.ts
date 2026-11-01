import { SupaBaseFunction } from "./SupaBase";

/**
 * Authoritative Point Synchronization & Recalibration Engine
 * 
 * Guarantees that:
 * 1. Students ONLY have points that were ACTUALLY achieved in valid, published results.
 * 2. When a result is deleted or edited, NO default points, leftovers, or phantom 5-point residues remain.
 * 3. Grand_Total_Points strictly equals Total_Point_Anjuman + OutReach_Points + Achievements_Points.
 */

export interface PointSyncReport {
  studentsUpdated: number;
  squadsUpdated: number;
  wingsUpdated: number;
  details: string[];
}

/**
 * Authoritatively calculates and synchronizes points for all students, squads, and wings
 * directly from the database's true records (ResultBox, StudentsOutReach, StudentsAchievements).
 */
export async function syncAllStudentAndSquadPoints(): Promise<PointSyncReport> {
  const report: PointSyncReport = {
    studentsUpdated: 0,
    squadsUpdated: 0,
    wingsUpdated: 0,
    details: [],
  };

  try {
    // 1. Fetch published results from ResultBox
    const { data: rawResults } = await SupaBaseFunction
      .from("ResultBox")
      .select("*")
      .eq("is_published", true);

    // 2. Fetch all programmes, points templates, candidate registrations, and squads
    const [
      { data: progs },
      { data: templates },
      { data: regs },
      { data: squads },
      { data: allStudents },
      { data: allOutreach },
      { data: allAchievements },
      { data: allWings },
    ] = await Promise.all([
      SupaBaseFunction.from("ProgrammesBox").select("Program_Code, WingCode, points_template, is_group_program, IsResulted"),
      SupaBaseFunction.from("Points_Templates").select("*"),
      SupaBaseFunction.from("CandidateRegistrationTable").select("CandidateUUiD, Candidate_Code, Program_Code"),
      SupaBaseFunction.from("SquadMate").select("squad_id, squad_title, total_points, winning_rate, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid"),
      SupaBaseFunction.from("StudentsBox").select("AddNo, StudentName, Total_Point_Anjuman, Grand_Total_Points, Resluted_Count, OutReach_Points, Achievements_Points"),
      SupaBaseFunction.from("StudentsOutReach").select("StnAddNo, Point_Obtained"),
      SupaBaseFunction.from("StudentsAchievements").select("StnAddNo, Point_Obtained"),
      SupaBaseFunction.from("Chs-WingS").select("WingCode, Total_Resulted"),
    ]);

    const progMap = new Map<string, any>();
    (progs || []).forEach((p: any) => progMap.set(p.Program_Code, p));

    const tmplMap = new Map<string, any>();
    (templates || []).forEach((t: any) => tmplMap.set(t.p_template_id, t));

    const regMap = new Map<string, string>();
    (regs || []).forEach((r: any) => {
      if (r.CandidateUUiD && r.Candidate_Code) {
        regMap.set(r.CandidateUUiD.trim().toLowerCase(), r.Candidate_Code.trim());
      }
    });

    const squadMap = new Map<string, any>();
    (squads || []).forEach((s: any) => {
      if (s.squad_id) {
        squadMap.set(s.squad_id.trim().toLowerCase(), s);
      }
    });

    // Default template fallback if not specified on programme
    const defaultTmpl = templates?.[0] || {
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

    // Tracking real student points
    const realStudentAnjumanPoints: Record<string, number> = {};
    const realStudentResultedProgrammes: Record<string, Set<string>> = {};

    const addStudentPoints = (rawAddNo: string | null | undefined, progCode: string, pts: number) => {
      if (!rawAddNo || !pts || pts <= 0) return;
      const clean = String(rawAddNo).trim();
      realStudentAnjumanPoints[clean] = (realStudentAnjumanPoints[clean] || 0) + pts;
      if (!realStudentResultedProgrammes[clean]) {
        realStudentResultedProgrammes[clean] = new Set<string>();
      }
      realStudentResultedProgrammes[clean].add(progCode);
    };

    // Tracking real squad points
    const realSquadPoints: Record<string, number> = {};
    const realSquadWins: Record<string, number> = {};

    // Process every valid result in ResultBox
    (rawResults || []).forEach((r: any) => {
      const progCode = r.Program_Id;
      if (!progCode) return;

      const prog = progMap.get(progCode);
      const tmpl = (prog?.points_template && tmplMap.get(prog.points_template)) || defaultTmpl;

      const isGroup = Boolean(
        r.is_group ??
        prog?.is_group_program ??
        (r["1st_holder_group"] || r["2nd_holder_group"] || r["3rd_holder_group"])
      );

      if (isGroup) {
        // Group Programme: Teammates receive equal position points
        const g1 = r["1st_holder_group"]?.trim().toLowerCase();
        const g2 = r["2nd_holder_group"]?.trim().toLowerCase();
        const g3 = r["3rd_holder_group"]?.trim().toLowerCase();
        const ga = r.grade_holder_group1?.trim().toLowerCase();
        const gb = r.grade_holder_group2?.trim().toLowerCase();

        const awardSquad = (sqId?: string | null, pts?: number) => {
          if (!sqId || !pts || pts <= 0) return;
          realSquadPoints[sqId] = (realSquadPoints[sqId] || 0) + pts;
          realSquadWins[sqId] = (realSquadWins[sqId] || 0) + 1;

          const sq = squadMap.get(sqId);
          if (!sq) return;
          const members = [
            sq.member1_uuid,
            sq.member2_uuid,
            sq.member3_uuid,
            sq.member4_uuid,
            sq.member5_uuid,
            sq.member6_uuid,
            sq.member7_uuid,
          ].filter((m): m is string => Boolean(m && String(m).trim()));

          members.forEach((m) => addStudentPoints(m, progCode, pts));
        };

        if (g1) {
          const grade = ga === g1 ? "A" : gb === g1 ? "B" : "none";
          const pts = grade === "A" ? (tmpl.first_A_grade ?? 10) : grade === "B" ? (tmpl.first_B_grade ?? 8) : (tmpl.first_only ?? 5);
          awardSquad(g1, pts);
        }

        if (g2) {
          const grade = ga === g2 ? "A" : gb === g2 ? "B" : "none";
          const pts = grade === "A" ? (tmpl.second_A_grade ?? 8) : grade === "B" ? (tmpl.second_B_grade ?? 6) : (tmpl.second_only ?? 3);
          awardSquad(g2, pts);
        }

        if (g3) {
          const grade = ga === g3 ? "A" : gb === g3 ? "B" : "none";
          const pts = grade === "A" ? (tmpl.third_A_grade ?? 6) : grade === "B" ? (tmpl.third_B_grade ?? 4) : (tmpl.third_only ?? 1);
          awardSquad(g3, pts);
        }

        if (ga && ga !== g1 && ga !== g2 && ga !== g3) {
          awardSquad(ga, tmpl.A_grade ?? 5);
        }

        if (gb && gb !== g1 && gb !== g2 && gb !== g3) {
          awardSquad(gb, tmpl.B_grade ?? 3);
        }
      } else {
        // Individual Programme
        const u1 = r.First_Holder_uuid?.trim().toLowerCase();
        const u2 = r.Second_Holder_uuid?.trim().toLowerCase();
        const u3 = r.Third_Holder_uuid?.trim().toLowerCase();
        const ua = r.Grade1_uuid?.trim().toLowerCase();
        const ub = r.Grade2_uuid?.trim().toLowerCase();

        const resolveAddNo = (uuid?: string, fallback?: string): string | null => {
          if (uuid && regMap.has(uuid)) return regMap.get(uuid)!;
          if (uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
            return uuid;
          }
          if (fallback) return fallback.split(",")[0].trim();
          return null;
        };

        const c1 = resolveAddNo(u1, r.First_Holder);
        const c2 = resolveAddNo(u2, r.Second_Holder);
        const c3 = resolveAddNo(u3, r.Third_Holder);
        const ca = resolveAddNo(ua, r.AGrade);
        const cb = resolveAddNo(ub, r.BGrade);

        if (c1) {
          const grade = (ua && ua === u1) ? "A" : (ub && ub === u1) ? "B" : "none";
          const pts = grade === "A" ? (tmpl.first_A_grade ?? 10) : grade === "B" ? (tmpl.first_B_grade ?? 8) : (tmpl.first_only ?? 5);
          addStudentPoints(c1, progCode, pts);
        }

        if (c2) {
          const grade = (ua && ua === u2) ? "A" : (ub && ub === u2) ? "B" : "none";
          const pts = grade === "A" ? (tmpl.second_A_grade ?? 8) : grade === "B" ? (tmpl.second_B_grade ?? 6) : (tmpl.second_only ?? 3);
          addStudentPoints(c2, progCode, pts);
        }

        if (c3) {
          const grade = (ua && ua === u3) ? "A" : (ub && ub === u3) ? "B" : "none";
          const pts = grade === "A" ? (tmpl.third_A_grade ?? 6) : grade === "B" ? (tmpl.third_B_grade ?? 4) : (tmpl.third_only ?? 1);
          addStudentPoints(c3, progCode, pts);
        }

        if (ca && ca !== c1 && ca !== c2 && ca !== c3) {
          addStudentPoints(ca, progCode, tmpl.A_grade ?? 5);
        }

        if (cb && cb !== c1 && cb !== c2 && cb !== c3) {
          addStudentPoints(cb, progCode, tmpl.B_grade ?? 3);
        }
      }
    });

    // Outreach sums
    const outreachPointsMap: Record<string, number> = {};
    const outreachCountMap: Record<string, number> = {};
    (allOutreach || []).forEach((o: any) => {
      if (o.StnAddNo) {
        const clean = String(o.StnAddNo).trim();
        outreachPointsMap[clean] = (outreachPointsMap[clean] || 0) + Number(o.Point_Obtained || 0);
        outreachCountMap[clean] = (outreachCountMap[clean] || 0) + 1;
      }
    });

    // Achievements sums
    const achievementsPointsMap: Record<string, number> = {};
    const achievementsCountMap: Record<string, number> = {};
    (allAchievements || []).forEach((ac: any) => {
      if (ac.StnAddNo) {
        const clean = String(ac.StnAddNo).trim();
        achievementsPointsMap[clean] = (achievementsPointsMap[clean] || 0) + Number(ac.Point_Obtained || 0);
        achievementsCountMap[clean] = (achievementsCountMap[clean] || 0) + 1;
      }
    });

    // Reconcile and fix StudentsBox
    for (const stn of (allStudents || [])) {
      const addNo = stn.AddNo;
      const trueAnjuman = realStudentAnjumanPoints[addNo] || 0;
      const trueResulted = realStudentResultedProgrammes[addNo]?.size || 0;
      const trueOutreach = outreachPointsMap[addNo] || 0;
      const trueAchievements = achievementsPointsMap[addNo] || 0;
      const trueGrand = trueAnjuman + trueOutreach + trueAchievements;

      const needsUpdate =
        Number(stn.Total_Point_Anjuman || 0) !== trueAnjuman ||
        Number(stn.Grand_Total_Points || 0) !== trueGrand ||
        Number(stn.Resluted_Count || 0) !== trueResulted;

      if (needsUpdate) {
        const { error: updError } = await SupaBaseFunction
          .from("StudentsBox")
          .update({
            Total_Point_Anjuman: trueAnjuman,
            Grand_Total_Points: trueGrand,
            Resluted_Count: trueResulted,
          })
          .eq("AddNo", addNo);

        if (!updError) {
          report.studentsUpdated++;
          report.details.push(
            `Student ${addNo} (${stn.StudentName}): Anjuman ${stn.Total_Point_Anjuman || 0} -> ${trueAnjuman}, Grand ${stn.Grand_Total_Points || 0} -> ${trueGrand}, Resulted ${stn.Resluted_Count || 0} -> ${trueResulted}`
          );
        }
      }
    }

    // Reconcile and fix SquadMate
    for (const sq of (squads || [])) {
      const sqId = sq.squad_id?.trim().toLowerCase();
      const trueSquadPts = realSquadPoints[sqId] || 0;
      const trueSquadWins = realSquadWins[sqId] || 0;

      const needsSquadUpdate =
        Number(sq.total_points || 0) !== trueSquadPts ||
        Number(sq.winning_rate || 0) !== trueSquadWins;

      if (needsSquadUpdate) {
        const { error: sqUpdError } = await SupaBaseFunction
          .from("SquadMate")
          .update({
            total_points: trueSquadPts,
            winning_rate: trueSquadWins,
          })
          .eq("squad_id", sq.squad_id);

        if (!sqUpdError) {
          report.squadsUpdated++;
          report.details.push(
            `Squad ${sq.squad_title} (${sq.squad_id}): Points ${sq.total_points || 0} -> ${trueSquadPts}, Wins ${sq.winning_rate || 0} -> ${trueSquadWins}`
          );
        }
      }
    }

    // Reconcile and fix Chs-WingS Total_Resulted
    const wingResultedCountMap: Record<string, number> = {};
    (progs || []).forEach((p: any) => {
      if (p.WingCode && (p.IsResulted === true || p.IsResultPublished === true)) {
        wingResultedCountMap[p.WingCode] = (wingResultedCountMap[p.WingCode] || 0) + 1;
      }
    });

    for (const w of (allWings || [])) {
      const trueResulted = wingResultedCountMap[w.WingCode] || 0;
      if (Number(w.Total_Resulted || 0) !== trueResulted) {
        await SupaBaseFunction
          .from("Chs-WingS")
          .update({ Total_Resulted: trueResulted })
          .eq("WingCode", w.WingCode);
        report.wingsUpdated++;
      }
    }

    // Invalidate local in-memory profile caches so UI updates seamlessly
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cached_student_profile");
        localStorage.removeItem("cached_stn_stats");
        window.dispatchEvent(new CustomEvent("student-profile-synced"));
      } catch {
        // ignore storage access errors in worker context
      }
    }

    return report;
  } catch (err: any) {
    console.error("Error running syncAllStudentAndSquadPoints:", err);
    return report;
  }
}
