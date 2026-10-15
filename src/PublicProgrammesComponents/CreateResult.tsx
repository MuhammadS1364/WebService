import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { SupaBaseFunction } from "../../src/lib/SupaBase";
import { useProgrammeMeta } from "../../src/lib/programmeMeta";
import SafeImage from "../lib/SafeImage";
import type { PointsTemplateRecord } from "../../src/lib/types";
import PrintCandidateSheetModal from "../components/PrintCandidateSheetModal";
import {
  Trophy,
  Award,
  Users,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Printer,
  FileText,
} from "lucide-react";

interface RegisteredCandidate {
  addNo: string;
  name: string;
  photoUrl?: string | null;
  className?: string | null;
  topicTitle?: string | null;
}

export interface TeammateInfo {
  addNo: string;
  name: string;
  photoUrl?: string | null;
  className?: string | null;
}

export interface RegisteredSquad {
  squad_id: string;
  squad_title: string; // Group Name
  members: TeammateInfo[];
  isRegisteredForProgram: boolean;
  topicTitle?: string | null;
}

type GradeSelection = "none" | "A" | "B";

interface HolderEntry {
  addNo: string; // AddNo if individual, or squad_id if group
  name: string; // Student name if individual, or Group Name if group
  grade: GradeSelection;
  squadMembers?: TeammateInfo[];
}

interface HoldersState {
  first: HolderEntry;
  second: HolderEntry;
  third: HolderEntry;
  aGrade: HolderEntry;
  bGrade: HolderEntry;
}

interface ProgrammeDetails {
  Program_Code: string;
  Program_Title?: string;
  Date?: string;
  Venue?: string;
  WingCode?: string;
  is_group_program?: boolean;
  points_template?: string | null;
  AccademicYear?: string | null;
}

const DEFAULT_POINTS_FALLBACK: PointsTemplateRecord = {
  p_template_id: "default",
  point_template_title: "Default Competition Template",
  first_only: 5,
  second_only: 3,
  third_only: 1,
  first_A_grade: 10,
  first_B_grade: 8,
  second_A_grade: 8,
  second_B_grade: 6,
  third_A_grade: 6,
  third_B_grade: 4,
  A_grade: 5,
  B_grade: 3,
};

const INITIAL_HOLDERS: HoldersState = {
  first: { addNo: "", name: "", grade: "none" },
  second: { addNo: "", name: "", grade: "none" },
  third: { addNo: "", name: "", grade: "none" },
  aGrade: { addNo: "", name: "", grade: "A" },
  bGrade: { addNo: "", name: "", grade: "B" },
};

export default function CreateResult() {
  const { actWing } = useParams<{ actWing: string }>();
  const meta = useProgrammeMeta();

  // State
  const [wingCode, setWingCode] = useState<string>("");
  const [wingTitle, setWingTitle] = useState<string>("");
  const [programmes, setProgrammes] = useState<ProgrammeDetails[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  // Points Template State
  const [allTemplates, setAllTemplates] = useState<PointsTemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<PointsTemplateRecord>(DEFAULT_POINTS_FALLBACK);

  // Registered candidates & squads
  const [registeredCandidates, setRegisteredCandidates] = useState<RegisteredCandidate[]>([]);
  const [registeredSquads, setRegisteredSquads] = useState<RegisteredSquad[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState<boolean>(false);

  // Holders
  const [holders, setHolders] = useState<HoldersState>(INITIAL_HOLDERS);
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "";
    text: string;
    details?: string[];
  }>({ type: "", text: "" });

  // 1. Fetch Wing details if actWing param exists
  useEffect(() => {
    async function fetchWingData() {
      if (!actWing) return;
      try {
        const { data: wData, error } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, WingEmail, WingTitle")
          .eq("WingEmail", actWing)
          .maybeSingle();

        if (!error && wData) {
          setWingCode(wData.WingCode);
          setWingTitle(wData.WingTitle || wData.WingCode);
        }
      } catch (err) {
        console.error("Error fetching wing data:", err);
      }
    }
    fetchWingData();
  }, [actWing]);

  // 2. Fetch all Points Templates for selection/customization
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data, error } = await SupaBaseFunction
          .from("Points_Templates")
          .select("*")
          .order("point_template_title", { ascending: true });

        if (!error && data && data.length > 0) {
          setAllTemplates(data as PointsTemplateRecord[]);
        }
      } catch (err) {
        console.error("Error loading points templates:", err);
      }
    }
    fetchTemplates();
  }, []);

  const [searchParams] = useSearchParams();
  const urlProgramCode = searchParams.get("program") || searchParams.get("code");

  // 3. Fetch unresulted programmes (and include urlProgramCode if requested)
  useEffect(() => {
    async function fetchProgrammes() {
      try {
        let query = SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Date, Venue, WingCode, is_group_program, points_template, AccademicYear, IsResulted")
          .order("Date", { ascending: false });

        if (wingCode) {
          query = query.eq("WingCode", wingCode);
        }

        const { data, error } = await query;
        if (!error && data) {
          // If a specific programme code was passed in the URL, make sure it is available
          let progs = data as ProgrammeDetails[];
          setProgrammes(progs);

          if (urlProgramCode && progs.some((p) => p.Program_Code === urlProgramCode)) {
            setSelectedProgram(urlProgramCode);
          } else if (progs.length > 0 && !selectedProgram) {
            // keep existing or leave empty
          }
        }
      } catch (err) {
        console.error("Error fetching programmes:", err);
      }
    }
    fetchProgrammes();
  }, [wingCode, urlProgramCode]);

  // 4. When a programme is chosen: load template and load registered candidates / squads
  useEffect(() => {
    async function onProgramChange() {
      if (!selectedProgram) {
        setRegisteredCandidates([]);
        setRegisteredSquads([]);
        setHolders(INITIAL_HOLDERS);
        return;
      }

      const prog = programmes.find((p) => p.Program_Code === selectedProgram);
      const isGroup = Boolean(prog?.is_group_program);

      if (prog?.points_template) {
        setSelectedTemplateId(prog.points_template);
        const match = allTemplates.find((t) => t.p_template_id === prog.points_template);
        if (match) {
          setActiveTemplate(match);
        }
      } else if (allTemplates.length > 0) {
        setSelectedTemplateId(allTemplates[0].p_template_id);
        setActiveTemplate(allTemplates[0]);
      } else {
        setActiveTemplate(DEFAULT_POINTS_FALLBACK);
      }

      setLoadingCandidates(true);
      setStatusMsg({ type: "", text: "" });
      setHolders(INITIAL_HOLDERS);

      try {
        if (isGroup) {
          // GROUP PROGRAMME: Fetch CandidateRegistrationTable with squad_uuids
          const { data: regRows, error: regError } = await SupaBaseFunction
            .from("CandidateRegistrationTable")
            .select("Candidate_Code, squad_uuid")
            .eq("Program_Code", selectedProgram);

          if (regError) throw regError;

          const squadIds = Array.from(
            new Set(
              (regRows || [])
                .map((r) => r.squad_uuid)
                .filter((id): id is string => Boolean(id && id.trim()))
            )
          );

          const directCandidateCodes = Array.from(
            new Set(
              (regRows || [])
                .map((r) => r.Candidate_Code)
                .filter((c): c is string => Boolean(c && c.trim()))
            )
          );

          // Fetch Squads referenced, and also fetch all active squads so user can declare any competing group
          let fetchedSquads: any[] = [];
          if (squadIds.length > 0) {
            const { data: sqData } = await SupaBaseFunction
              .from("SquadMate")
              .select("*")
              .in("squad_id", squadIds);
            if (sqData) fetchedSquads = [...sqData];
          }

          const { data: allActiveSquads } = await SupaBaseFunction
            .from("SquadMate")
            .select("*")
            .eq("is_active", true)
            .order("squad_title", { ascending: true });

          if (allActiveSquads) {
            const existingIds = new Set(fetchedSquads.map((s) => s.squad_id));
            allActiveSquads.forEach((sq) => {
              if (!existingIds.has(sq.squad_id)) {
                fetchedSquads.push(sq);
              }
            });
          }

          // Collect all teammate member AddNos across squads and direct registrations
          const allMemberAddNos = new Set<string>();
          fetchedSquads.forEach((sq) => {
            [
              sq.member1_uuid,
              sq.member2_uuid,
              sq.member3_uuid,
              sq.member4_uuid,
              sq.member5_uuid,
              sq.member6_uuid,
              sq.member7_uuid,
            ]
              .filter((m): m is string => Boolean(m && m.trim()))
              .forEach((m) => allMemberAddNos.add(m.trim()));
          });
          directCandidateCodes.forEach((c) => allMemberAddNos.add(c));

          // Fetch student details from StudentsBox
          const studentMap: Record<
            string,
            { name: string; photoUrl: string | null; className: string | null }
          > = {};

          if (allMemberAddNos.size > 0) {
            const { data: studentRows, error: stnError } = await SupaBaseFunction
              .from("StudentsBox")
              .select("AddNo, StudentName, Stn_Class, Student_Photo_Urls")
              .in("AddNo", Array.from(allMemberAddNos));

            if (stnError) throw stnError;

            (studentRows || []).forEach((s: any) => {
              const matchedClass = meta.classes.find(
                (c: any) =>
                  c.class_id === s.Stn_Class ||
                  c.standard_name === s.Stn_Class ||
                  c.class_nick_name === s.Stn_Class
              );
              studentMap[s.AddNo] = {
                name: s.StudentName || s.AddNo,
                photoUrl: s.Student_Photo_Urls || null,
                className:
                  matchedClass?.class_nick_name ||
                  matchedClass?.standard_name ||
                  s.Stn_Class ||
                  null,
              };
            });
          }

          // Query Topics_Box for topic registrations
          const { data: topicData } = await SupaBaseFunction
            .from("Topics_Box")
            .select("student_addNo, team_uuid, topic_title")
            .eq("program_code", selectedProgram);

          const topicByStudent: Record<string, string> = {};
          const topicBySquad: Record<string, string> = {};
          (topicData || []).forEach((t: any) => {
            if (t.student_addNo && t.topic_title) {
              const s = String(t.student_addNo).trim();
              topicByStudent[s] = t.topic_title;
              topicByStudent[s.toUpperCase()] = t.topic_title;
            }
            if (t.team_uuid && t.topic_title) {
              topicBySquad[String(t.team_uuid).trim()] = t.topic_title;
            }
          });

          // Build mapped registered squad objects
          const squadsMapped: RegisteredSquad[] = fetchedSquads.map((sq) => {
            const memberCodes = [
              sq.member1_uuid,
              sq.member2_uuid,
              sq.member3_uuid,
              sq.member4_uuid,
              sq.member5_uuid,
              sq.member6_uuid,
              sq.member7_uuid,
            ].filter((m): m is string => Boolean(m && m.trim()));

            const members: TeammateInfo[] = memberCodes.map((mCode) => {
              const info = studentMap[mCode];
              return {
                addNo: mCode,
                name: info ? info.name : `Teammate (${mCode})`,
                photoUrl: info?.photoUrl || null,
                className: info?.className || null,
              };
            });

            return {
              squad_id: sq.squad_id,
              squad_title: sq.squad_title || "Unnamed Group",
              members,
              isRegisteredForProgram: squadIds.includes(sq.squad_id),
              topicTitle: topicBySquad[sq.squad_id] || null,
            };
          });

          // Sort squads: registered first, then alphabetically by title
          squadsMapped.sort((a, b) => {
            if (a.isRegisteredForProgram && !b.isRegisteredForProgram) return -1;
            if (!a.isRegisteredForProgram && b.isRegisteredForProgram) return 1;
            return a.squad_title.localeCompare(b.squad_title);
          });

          setRegisteredSquads(squadsMapped);
          setRegisteredCandidates([]);
        } else {
          // INDIVIDUAL PROGRAMME: Fetch individual candidate registrations
          const { data: regRows, error: regError } = await SupaBaseFunction
            .from("CandidateRegistrationTable")
            .select("Candidate_Code")
            .eq("Program_Code", selectedProgram);

          if (regError) throw regError;

          const candidateCodes = Array.from(
            new Set(
              (regRows || [])
                .map((r) => r.Candidate_Code)
                .filter((c): c is string => Boolean(c && c.trim()))
            )
          );

          if (candidateCodes.length === 0) {
            setRegisteredCandidates([]);
            setRegisteredSquads([]);
            return;
          }

          // Query StudentsBox
          const { data: studentRows, error: stnError } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName, Stn_Class, Student_Photo_Urls")
            .in("AddNo", candidateCodes);

          if (stnError) throw stnError;

          // Query Topics_Box for individual candidate topics
          const { data: candTopicData } = await SupaBaseFunction
            .from("Topics_Box")
            .select("student_addNo, topic_title")
            .eq("program_code", selectedProgram);

          const candTopicMap: Record<string, string> = {};
          (candTopicData || []).forEach((t: any) => {
            if (t.student_addNo && t.topic_title) {
              const s = String(t.student_addNo).trim();
              candTopicMap[s] = t.topic_title;
              candTopicMap[s.toUpperCase()] = t.topic_title;
            }
          });

          const mapped: RegisteredCandidate[] = (studentRows || []).map((s: any) => {
            const matchedClass = meta.classes.find(
              (c: any) =>
                c.class_id === s.Stn_Class ||
                c.standard_name === s.Stn_Class ||
                c.class_nick_name === s.Stn_Class
            );
            return {
              addNo: s.AddNo,
              name: s.StudentName || "Unnamed Student",
              photoUrl: s.Student_Photo_Urls || null,
              className:
                matchedClass?.class_nick_name ||
                matchedClass?.standard_name ||
                s.Stn_Class ||
                null,
              topicTitle: candTopicMap[s.AddNo] || null,
            };
          });

          const foundAddNos = new Set(mapped.map((m) => m.addNo));
          candidateCodes.forEach((code) => {
            if (!foundAddNos.has(code)) {
              mapped.push({
                addNo: code,
                name: `Candidate (${code})`,
                topicTitle: candTopicMap[code] || null,
              });
            }
          });

          mapped.sort((a, b) => a.name.localeCompare(b.name));
          setRegisteredCandidates(mapped);
          setRegisteredSquads([]);
        }
      } catch (err: any) {
        console.error("Error loading candidates/squads:", err);
        setStatusMsg({ type: "error", text: "Could not load candidate registrations: " + err.message });
      } finally {
        setLoadingCandidates(false);
      }
    }

    onProgramChange();
  }, [selectedProgram, programmes, allTemplates]);

  // When selectedTemplateId changes, update activeTemplate
  useEffect(() => {
    if (!selectedTemplateId) return;
    const match = allTemplates.find((t) => t.p_template_id === selectedTemplateId);
    if (match) {
      setActiveTemplate(match);
    }
  }, [selectedTemplateId, allTemplates]);

  // Calculate points for each position dynamically
  const calculatePoints = (pos: keyof HoldersState, grade: GradeSelection): number => {
    const t = activeTemplate;
    if (pos === "first") {
      if (grade === "A") return t.first_A_grade ?? 10;
      if (grade === "B") return t.first_B_grade ?? 8;
      return t.first_only ?? 5;
    }
    if (pos === "second") {
      if (grade === "A") return t.second_A_grade ?? 8;
      if (grade === "B") return t.second_B_grade ?? 6;
      return t.second_only ?? 3;
    }
    if (pos === "third") {
      if (grade === "A") return t.third_A_grade ?? 6;
      if (grade === "B") return t.third_B_grade ?? 4;
      return t.third_only ?? 1;
    }
    if (pos === "aGrade") {
      return t.A_grade ?? 5;
    }
    if (pos === "bGrade") {
      return t.B_grade ?? 3;
    }
    return 0;
  };

  const selectedProgDetails = programmes.find((p) => p.Program_Code === selectedProgram);
  const isGroupProgram = Boolean(selectedProgDetails?.is_group_program);

  // Track assigned positions to avoid duplicate candidate/group assignments
  const assignedPositions = useMemo(() => {
    const map: Record<string, keyof HoldersState> = {};
    (Object.keys(holders) as (keyof HoldersState)[]).forEach((pos) => {
      const selectedId = holders[pos].addNo;
      if (selectedId) {
        map[selectedId] = pos;
      }
    });
    return map;
  }, [holders]);

  // Position selection handler (Candidate if individual, Group/Squad if grouped programme)
  const handleCandidateSelect = (posKey: keyof HoldersState, selectedId: string) => {
    setStatusMsg({ type: "", text: "" });

    if (!selectedId) {
      setHolders((prev) => ({
        ...prev,
        [posKey]: { ...prev[posKey], addNo: "", name: "", squadMembers: undefined },
      }));
      return;
    }

    const currentOwner = assignedPositions[selectedId];
    if (currentOwner && currentOwner !== posKey) {
      setStatusMsg({
        type: "error",
        text: `⚠️ Conflict: ${isGroupProgram ? "Group" : "Candidate"} is already assigned to another position in this result!`,
      });
      return;
    }

    if (isGroupProgram) {
      const squad = registeredSquads.find((s) => s.squad_id === selectedId);
      const groupName = squad ? squad.squad_title : selectedId;
      setHolders((prev) => ({
        ...prev,
        [posKey]: {
          ...prev[posKey],
          addNo: selectedId,
          name: groupName,
          squadMembers: squad?.members || [],
        },
      }));
    } else {
      const candidate = registeredCandidates.find((c) => c.addNo === selectedId);
      const candidateName = candidate ? candidate.name : selectedId;
      setHolders((prev) => ({
        ...prev,
        [posKey]: {
          ...prev[posKey],
          addNo: selectedId,
          name: candidateName,
          squadMembers: undefined,
        },
      }));
    }
  };

  // Grade selection handler
  const handleGradeSelect = (posKey: keyof HoldersState, grade: GradeSelection) => {
    setHolders((prev) => ({
      ...prev,
      [posKey]: { ...prev[posKey], grade },
    }));
  };

  // Computed point allocations summary:
  // If individual: each candidate gets position points
  // If grouped: group is resulted, group name listed down, and EQUAL position points assigned to each teammate!
  const allocationsSummary = useMemo(() => {
    const list: {
      positionKey: keyof HoldersState;
      label: string;
      addNo: string;
      name: string;
      groupName?: string;
      gradeLabel: string;
      points: number;
    }[] = [];

    const configs: { key: keyof HoldersState; label: string }[] = [
      { key: "first", label: "1st Place Winner" },
      { key: "second", label: "2nd Place Runner-Up" },
      { key: "third", label: "3rd Place" },
      { key: "aGrade", label: "A-Grade Recognition" },
      { key: "bGrade", label: "B-Grade Recognition" },
    ];

    configs.forEach(({ key, label }) => {
      const h = holders[key];
      if (h.addNo) {
        const pts = calculatePoints(key, h.grade);
        const gradeText =
          key === "aGrade"
            ? "A Grade"
            : key === "bGrade"
            ? "B Grade"
            : h.grade === "A"
            ? "A Grade"
            : h.grade === "B"
            ? "B Grade"
            : "Position Only (No Grade)";

        if (isGroupProgram) {
          const sq = registeredSquads.find((s) => s.squad_id === h.addNo);
          const squadTitle = sq ? sq.squad_title : h.name;
          const members = sq?.members || h.squadMembers || [];

          if (members.length > 0) {
            // Assign EQUAL position point to each teammate!
            members.forEach((m) => {
              list.push({
                positionKey: key,
                label: `${label} (Group: ${squadTitle})`,
                addNo: m.addNo,
                name: m.name,
                groupName: squadTitle,
                gradeLabel: gradeText,
                points: pts, // Equal position point!
              });
            });
          } else {
            list.push({
              positionKey: key,
              label: `${label} (Group: ${squadTitle})`,
              addNo: h.addNo,
              name: squadTitle,
              groupName: squadTitle,
              gradeLabel: gradeText,
              points: pts,
            });
          }
        } else {
          list.push({
            positionKey: key,
            label,
            addNo: h.addNo,
            name: h.name,
            gradeLabel: gradeText,
            points: pts,
          });
        }
      }
    });

    return list;
  }, [holders, activeTemplate, isGroupProgram, registeredSquads]);

  const totalPointsAwarded = allocationsSummary.reduce((sum, a) => sum + a.points, 0);

  // Submit official result and assign points to students and wing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) {
      setStatusMsg({ type: "error", text: "Please select a programme first." });
      return;
    }

    if (allocationsSummary.length === 0) {
      setStatusMsg({
        type: "error",
        text: `Please assign at least one ${isGroupProgram ? "group" : "candidate"} position before publishing.`,
      });
      return;
    }

    if (isGroupProgram) {
      const assignedGroupIds = (["first", "second", "third", "aGrade", "bGrade"] as (keyof HoldersState)[])
        .map((k) => holders[k].addNo)
        .filter(Boolean);
      if (new Set(assignedGroupIds).size !== assignedGroupIds.length) {
        setStatusMsg({
          type: "error",
          text: "Duplicate group detected across positions. Each group can hold at most ONE position.",
        });
        return;
      }
    } else {
      // Verify candidate uniqueness in individual mode
      const uniqueAddNos = new Set(allocationsSummary.map((a) => a.addNo));
      if (uniqueAddNos.size !== allocationsSummary.length) {
        setStatusMsg({
          type: "error",
          text: "Duplicate candidate detected across positions. Each candidate can hold at most ONE position.",
        });
        return;
      }
    }

    try {
      setLoadingSubmit(true);
      setStatusMsg({ type: "", text: "" });

      const progWingCode = selectedProgDetails?.WingCode || wingCode;

      // 1. Insert into ResultBox
      const getHolderValue = (key: keyof HoldersState): string | null => {
        const h = holders[key];
        if (!h.addNo) return null;
        if (isGroupProgram) {
          const sq = registeredSquads.find((s) => s.squad_id === h.addNo);
          if (sq && sq.members.length > 0) {
            return sq.members.map((m) => m.addNo).join(", ");
          }
          return h.addNo;
        }
        return h.addNo;
      };

      const resultPayload = {
        Program_Id: selectedProgram,
        First_Holder: getHolderValue("first"),
        Second_Holder: getHolderValue("second"),
        Third_Holder: getHolderValue("third"),
        AGrade: getHolderValue("aGrade"),
        BGrade: getHolderValue("bGrade"),
        creaded_At: new Date().toTimeString().split(" ")[0],
      };

      const { error: insertError } = await SupaBaseFunction.from("ResultBox").insert([resultPayload]);
      if (insertError) throw insertError;

      // 2. ASSIGN EQUAL POINTS TO EACH STUDENT/TEAMMATE in StudentsBox
      const studentFeedbackLines: string[] = [];
      for (const allocation of allocationsSummary) {
        const { data: stn, error: stnFetchError } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
          .eq("AddNo", allocation.addNo)
          .maybeSingle();

        if (stnFetchError) {
          console.warn("Could not fetch student:", allocation.addNo, stnFetchError);
        }

        const currentResulted = Number(stn?.Resluted_Count || 0);
        const currentAnjumanPts = Number(stn?.Total_Point_Anjuman || 0);
        const currentGrandPts = Number(stn?.Grand_Total_Points || 0);

        const newAnjumanPts = currentAnjumanPts + allocation.points;
        const newGrandPts = currentGrandPts + allocation.points;

        const { error: updateStnErr } = await SupaBaseFunction
          .from("StudentsBox")
          .update({
            Resluted_Count: currentResulted + 1,
            Total_Point_Anjuman: newAnjumanPts,
            Grand_Total_Points: newGrandPts,
          })
          .eq("AddNo", allocation.addNo);

        if (updateStnErr) {
          console.error("Error updating student points:", allocation.addNo, updateStnErr);
        } else {
          studentFeedbackLines.push(
            `• ${allocation.groupName ? `[Group: ${allocation.groupName}] ` : ""}${allocation.name} (${allocation.addNo}): +${allocation.points} PTS [${allocation.label} - ${allocation.gradeLabel}]`
          );
        }
      }

      // 3. UPDATE SQUAD TOTAL POINTS in SquadMate for group programmes
      if (isGroupProgram) {
        for (const posKey of ["first", "second", "third", "aGrade", "bGrade"] as (keyof HoldersState)[]) {
          const h = holders[posKey];
          if (h.addNo) {
            const sq = registeredSquads.find((s) => s.squad_id === h.addNo);
            if (sq) {
              const pts = calculatePoints(posKey, h.grade);
              try {
                const { data: currentSquad } = await SupaBaseFunction
                  .from("SquadMate")
                  .select("total_points, winning_rate")
                  .eq("squad_id", sq.squad_id)
                  .maybeSingle();

                if (currentSquad) {
                  await SupaBaseFunction
                    .from("SquadMate")
                    .update({
                      total_points: (currentSquad.total_points || 0) + pts,
                      winning_rate: (currentSquad.winning_rate || 0) + 1,
                    })
                    .eq("squad_id", sq.squad_id);
                }
              } catch (sqErr) {
                console.warn("Could not credit squad points:", sqErr);
              }
            }
          }
        }
      }

      // 4. MUST ASSIGN POINTS TO WING in Chs-WingS
      if (progWingCode) {
        try {
          const { data: wingRow } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("WingCode, Total_Points, Total_Resulted")
            .eq("WingCode", progWingCode)
            .maybeSingle();

          if (wingRow) {
            await SupaBaseFunction
              .from("Chs-WingS")
              .update({
                Total_Points: (wingRow.Total_Points || 0) + totalPointsAwarded,
                Total_Resulted: (wingRow.Total_Resulted || 0) + 1,
              })
              .eq("WingCode", progWingCode);
          }
        } catch (wingErr) {
          console.warn("Could not credit wing points:", wingErr);
        }
      }

      // 5. Mark ProgrammeBox as Resulted
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({
          IsResulted: true,
          IsResultPublished: true,
          IsConducted: true,
          points_template: activeTemplate.p_template_id !== "default" ? activeTemplate.p_template_id : null,
        })
        .eq("Program_Code", selectedProgram);

      // 6. Update Accademic_Info total_resulted metrics
      if (selectedProgDetails?.AccademicYear) {
        try {
          const { data: acad } = await SupaBaseFunction
            .from("Accademic_Info")
            .select("total_resulted")
            .eq("accademic_id", selectedProgDetails.AccademicYear)
            .maybeSingle();

          if (acad) {
            await SupaBaseFunction
              .from("Accademic_Info")
              .update({ total_resulted: (acad.total_resulted || 0) + 1 })
              .eq("accademic_id", selectedProgDetails.AccademicYear);
          }
        } catch (acadErr) {
          console.warn("Could not update Accademic_Info:", acadErr);
        }
      }

      // 7. Success notification
      setStatusMsg({
        type: "success",
        text: `Official result published successfully for ${isGroupProgram ? "group" : "individual"} programme ${selectedProgram}! Equal position points credited to teammates and added to wing standings.`,
        details: [
          `Programme Type: ${isGroupProgram ? "Group Event (Team Results Declared)" : "Individual Event"}`,
          `Points Scheme Applied: "${activeTemplate.point_template_title}"`,
          `Total Points Disbursed: ${totalPointsAwarded} PTS`,
          ...studentFeedbackLines,
        ],
      });

      // Clear selection
      setProgrammes((prev) => prev.filter((p) => p.Program_Code !== selectedProgram));
      setSelectedProgram("");
      setHolders(INITIAL_HOLDERS);
      setRegisteredCandidates([]);
      setRegisteredSquads([]);
    } catch (err: any) {
      console.error("Failed to publish result:", err);
      setStatusMsg({
        type: "error",
        text: "Failed to publish result: " + (err.message || "Database error occurred"),
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Trophy className="w-6 h-6 text-amber-300" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              {wingTitle ? `${wingTitle} Wing` : "Results Office & Points Engine"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Generate Programme Result
          </h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">
            Declare official winners from registered candidates and automatically assign competition points based on the active Points Template.
          </p>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {statusMsg.text && (
        <div
          className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-sm font-bold block">{statusMsg.text}</span>
              {statusMsg.details && statusMsg.details.length > 0 && (
                <div className="mt-2 space-y-1 text-xs font-medium text-emerald-800 bg-white/80 p-3 rounded-xl border border-emerald-200">
                  {statusMsg.details.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: SELECT PROGRAMME */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-slate-900">
              1. Select Programme for Result Declaration
            </label>
            <span className="text-xs font-bold text-slate-500">
              {programmes.length} Unresulted Events
            </span>
          </div>

          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">-- Choose an Unresulted Programme --</option>
            {programmes.map((p) => (
              <option key={p.Program_Code} value={p.Program_Code}>
                {p.Program_Code} {p.Program_Title || "Untitled"} {p.is_group_program ? "Group" : "Individual"}
              </option>
            ))}
          </select>

          {selectedProgDetails && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-indigo-950 text-sm block">
                  {selectedProgDetails.Program_Title}
                </span>
                <span className="text-indigo-600 font-mono font-semibold">
                  {selectedProgDetails.Program_Code}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-white text-indigo-800 font-bold rounded-lg shadow-2xs border border-indigo-200">
                  {selectedProgDetails.is_group_program ? "👥 Group Event" : "👤 Individual Event"}
                </span>
                <span className="px-2.5 py-1 bg-white text-slate-700 font-medium rounded-lg border border-slate-200">
                  Venue: {meta.venueMap[selectedProgDetails.Venue || ""] || selectedProgDetails.Venue || "Campus Venue"}
                </span>
                <span className="px-2.5 py-1 bg-white text-amber-700 font-bold rounded-lg border border-amber-200">
                  Wing: {meta.wingMap[selectedProgDetails.WingCode || ""] || selectedProgDetails.WingCode || "General"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: POINTS TEMPLATE CONFIGURATION */}
        {selectedProgram && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-black text-slate-900">
                  2. Points Template & Point Rules
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Governs points credited to students upon result submission
              </span>
            </div>

            {/* Enhanced Template Selector & Breakdown */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Active Points Template Scheme:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Defines points awarded to students and calculated for wing standings based on positions and grades.
                  </p>
                </div>
                <div className="sm:w-72 shrink-0">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer transition"
                  >
                    {allTemplates.map((t) => (
                      <option key={t.p_template_id} value={t.p_template_id}>
                        {t.point_template_title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visual Template Breakdown Matrix */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    <span>Template Scoring Breakdown — {activeTemplate.point_template_title}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Auto-Applied on Publish
                  </span>
                </div>

                {/* 3 Positions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1st Place Card */}
                  <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                          🥇
                        </div>
                        <span className="text-xs font-black text-amber-950">1st Place</span>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {activeTemplate.first_only} pts base
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                      <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ A-Grade</span>
                        <span className="font-mono font-black text-amber-900 text-xs">{activeTemplate.first_A_grade} pts</span>
                      </div>
                      <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ B-Grade</span>
                        <span className="font-mono font-black text-amber-900 text-xs">{activeTemplate.first_B_grade} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* 2nd Place Card */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs">
                          🥈
                        </div>
                        <span className="text-xs font-black text-slate-900">2nd Place</span>
                      </div>
                      <span className="text-xs font-mono font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        {activeTemplate.second_only} pts base
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ A-Grade</span>
                        <span className="font-mono font-black text-slate-900 text-xs">{activeTemplate.second_A_grade} pts</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ B-Grade</span>
                        <span className="font-mono font-black text-slate-900 text-xs">{activeTemplate.second_B_grade} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* 3rd Place Card */}
                  <div className="bg-white rounded-2xl p-3.5 border border-orange-200/80 shadow-2xs space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs">
                          🥉
                        </div>
                        <span className="text-xs font-black text-orange-950">3rd Place</span>
                      </div>
                      <span className="text-xs font-mono font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        {activeTemplate.third_only} pts base
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                      <div className="bg-orange-50/60 p-1.5 rounded-lg border border-orange-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ A-Grade</span>
                        <span className="font-mono font-black text-orange-900 text-xs">{activeTemplate.third_A_grade} pts</span>
                      </div>
                      <div className="bg-orange-50/60 p-1.5 rounded-lg border border-orange-100 text-center">
                        <span className="text-slate-500 block font-semibold">+ B-Grade</span>
                        <span className="font-mono font-black text-orange-900 text-xs">{activeTemplate.third_B_grade} pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Standalone Grades Banner */}
                <div className="bg-white rounded-xl p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                    <Award size={13} className="text-indigo-600" /> Non-Position Standalone Grades:
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                      A-Grade Only: <span className="font-mono font-black">{activeTemplate.A_grade} pts</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                      B-Grade Only: <span className="font-mono font-black">{activeTemplate.B_grade} pts</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTERED CANDIDATES / REGISTERED GROUPS */}
        {selectedProgram && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-900">
                  {isGroupProgram
                    ? `3. Registered Groups & Squads (${registeredSquads.length})`
                    : `3. Registered Candidates (${registeredCandidates.length})`}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {isGroupProgram
                    ? "Groups compete as teams; teammates receive equal position points"
                    : "Only verified candidates can be awarded positions"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPrintSheetOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Print Official Registered Candidate Sheet (A4)"
                >
                  <Printer size={13} /> Print Sheet (A4)
                </button>
              </div>
            </div>

            {loadingCandidates ? (
              <div className="py-8 text-center text-slate-400 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                Loading {isGroupProgram ? "registered groups..." : "registered candidates..."}
              </div>
            ) : isGroupProgram ? (
              registeredSquads.length === 0 ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-amber-900">
                    No groups registered for this programme yet.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Squads or group participants must be registered before official results can be published.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                  {registeredSquads.map((sq, idx) => {
                    const assignedPosKey = assignedPositions[sq.squad_id];
                    const isAssigned = Boolean(assignedPosKey);

                    return (
                      <div
                        key={`${sq.squad_id}_${idx}`}
                        className={`p-3.5 rounded-2xl border transition ${
                          isAssigned
                            ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                              👥
                            </span>
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm block">
                                {sq.squad_title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {sq.members.length} Registered Teammates
                              </span>
                              {sq.topicTitle && (
                                <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1 truncate block mt-0.5" title={sq.topicTitle}>
                                  <FileText size={10} className="shrink-0" />
                                  <span className="truncate">{sq.topicTitle}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          {isAssigned ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white shrink-0 shadow-2xs">
                              Assigned
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                              Eligible Group
                            </span>
                          )}
                        </div>

                        {/* List down teammates */}
                        <div className="space-y-1.5 pt-1">
                          {sq.members.map((m) => (
                            <div
                              key={m.addNo}
                              className="flex items-center justify-between text-xs bg-white p-1.5 rounded-xl border border-slate-200/70"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
                                  <SafeImage
                                    src={m.photoUrl}
                                    alt={m.name}
                                    fallbackCategory="student"
                                    fallbackText={m.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="font-bold text-slate-800 truncate text-[11px]">
                                  {m.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-indigo-700 font-bold shrink-0 ml-2">
                                {m.addNo}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : registeredCandidates.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-900">
                  No candidates registered for this programme yet.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Candidates must be registered in the system before official results can be published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                {registeredCandidates.map((c, idx) => {
                  const assignedPosKey = assignedPositions[c.addNo];
                  const isAssigned = Boolean(assignedPosKey);

                  return (
                    <div
                      key={`${c.addNo}_${idx}`}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition ${
                        isAssigned
                          ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400 font-semibold"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white shadow-2xs">
                          <SafeImage
                            src={c.photoUrl}
                            alt={c.name}
                            fallbackCategory="student"
                            fallbackText={c.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 truncate">
                          <span className="font-mono font-bold text-indigo-700 block text-[11px]">
                            {c.addNo}
                          </span>
                          <span className="text-slate-900 font-bold truncate block">{c.name}</span>
                          {c.topicTitle && (
                            <span className="text-[10px] font-semibold text-indigo-700 flex items-center gap-1 truncate block mt-0.5" title={c.topicTitle}>
                              <FileText size={10} className="shrink-0" />
                              <span className="truncate">{c.topicTitle}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white shrink-0 shadow-2xs">
                          Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          Eligible
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: ASSIGN POSITIONS & GRADES */}
        {selectedProgram && ((isGroupProgram && registeredSquads.length > 0) || (!isGroupProgram && registeredCandidates.length > 0)) && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-0.5">
                4. Award Positions, Grades & Points
              </h2>
              <p className="text-xs text-slate-500">
                {isGroupProgram
                  ? "Select the winning group for each position. Equal position points will be credited to all teammates in that group!"
                  : "Each position calculates points automatically. Points are instantly credited to the student's record and wing total."}
              </p>
            </div>

            <div className="space-y-4">
              {/* 1st Place */}
              <PositionRow
                icon="🥇"
                label="1st Place Winner"
                posKey="first"
                holders={holders}
                registeredCandidates={registeredCandidates}
                registeredSquads={registeredSquads}
                isGroupProgram={isGroupProgram}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("first", holders.first.grade)}
                hasGradeOptions={true}
              />

              {/* 2nd Place */}
              <PositionRow
                icon="🥈"
                label="2nd Place Runner-Up"
                posKey="second"
                holders={holders}
                registeredCandidates={registeredCandidates}
                registeredSquads={registeredSquads}
                isGroupProgram={isGroupProgram}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("second", holders.second.grade)}
                hasGradeOptions={true}
              />

              {/* 3rd Place */}
              <PositionRow
                icon="🥉"
                label="3rd Place"
                posKey="third"
                holders={holders}
                registeredCandidates={registeredCandidates}
                registeredSquads={registeredSquads}
                isGroupProgram={isGroupProgram}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("third", holders.third.grade)}
                hasGradeOptions={true}
              />

              {/* A-Grade Recognition */}
              <PositionRow
                icon="⭐"
                label="A-Grade Special Recognition"
                posKey="aGrade"
                holders={holders}
                registeredCandidates={registeredCandidates}
                registeredSquads={registeredSquads}
                isGroupProgram={isGroupProgram}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("aGrade", "A")}
                hasGradeOptions={false}
              />

              {/* B-Grade Recognition */}
              <PositionRow
                icon="✨"
                label="B-Grade Recognition"
                posKey="bGrade"
                holders={holders}
                registeredCandidates={registeredCandidates}
                registeredSquads={registeredSquads}
                isGroupProgram={isGroupProgram}
                assignedPositions={assignedPositions}
                onCandidateSelect={handleCandidateSelect}
                onGradeSelect={handleGradeSelect}
                calculatedPoints={calculatePoints("bGrade", "B")}
                hasGradeOptions={false}
              />
            </div>

            {/* LIVE RECEIPT PREVIEW */}
            {allocationsSummary.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    Points Crediting Summary ({allocationsSummary.length} Recipients)
                  </span>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Total: +{totalPointsAwarded} PTS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {allocationsSummary.map((item, idx) => (
                    <div
                      key={`${item.positionKey}_${item.addNo}_${idx}`}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-900 block truncate">
                          {item.name} ({item.addNo})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.label} • {item.gradeLabel}
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                        +{item.points} PTS
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBMIT BUTTONS */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setHolders(INITIAL_HOLDERS)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Reset Positions
              </button>

              <button
                type="submit"
                disabled={loadingSubmit || allocationsSummary.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {loadingSubmit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Assigning Equal Points & Publishing...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" /> Publish Result & Assign Points (+{totalPointsAwarded} PTS)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Print Candidate Sheet Modal (A4) */}
      {selectedProgram && (
        <PrintCandidateSheetModal
          isOpen={isPrintSheetOpen}
          programCode={selectedProgram}
          initialProgramTitle={
            programmes.find((p) => p.Program_Code === selectedProgram)?.Program_Title || selectedProgram
          }
          onClose={() => setIsPrintSheetOpen(false)}
        />
      )}
    </div>
  );
}

// Subcomponent: Position Row
function PositionRow({
  icon,
  label,
  posKey,
  holders,
  registeredCandidates,
  registeredSquads,
  isGroupProgram,
  assignedPositions,
  onCandidateSelect,
  onGradeSelect,
  calculatedPoints,
  hasGradeOptions,
}: {
  icon: string;
  label: string;
  posKey: keyof HoldersState;
  holders: HoldersState;
  registeredCandidates: RegisteredCandidate[];
  registeredSquads: RegisteredSquad[];
  isGroupProgram: boolean;
  assignedPositions: Record<string, keyof HoldersState>;
  onCandidateSelect: (posKey: keyof HoldersState, id: string) => void;
  onGradeSelect: (posKey: keyof HoldersState, grade: GradeSelection) => void;
  calculatedPoints: number;
  hasGradeOptions: boolean;
}) {
  const currentSelection = holders[posKey].addNo;
  const currentGrade = holders[posKey].grade;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col gap-3 hover:border-slate-300 transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title & Icon */}
        <div className="flex items-center gap-3 md:w-5/12">
          <span className="text-2xl shrink-0">{icon}</span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
              {label}
            </span>
            <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md border mt-0.5 bg-amber-50 text-amber-900 border-amber-200">
              +{calculatedPoints} Points {isGroupProgram ? "to Each Teammate" : "to Student"}
            </span>
          </div>
        </div>

        {/* Selection Dropdown & Grade Options */}
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
          {/* Individual Avatar preview if individual */}
          {!isGroupProgram && currentSelection && (
            (() => {
              const selectedCand = registeredCandidates.find((c) => c.addNo === currentSelection);
              return (
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-indigo-200 bg-white shadow-2xs">
                  <SafeImage
                    src={selectedCand?.photoUrl}
                    alt={selectedCand?.name || currentSelection}
                    fallbackCategory="student"
                    fallbackText={selectedCand?.name || currentSelection}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })()
          )}

          {isGroupProgram ? (
            /* GROUP SELECT */
            <select
              value={currentSelection}
              onChange={(e) => onCandidateSelect(posKey, e.target.value)}
              className={`w-full p-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                currentSelection
                  ? "bg-white border-indigo-400 text-indigo-950 ring-2 ring-indigo-100"
                  : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              <option value="">-- No Winning Group Awarded --</option>
              {registeredSquads.map((sq) => {
                const isAssignedElsewhere =
                  assignedPositions[sq.squad_id] && assignedPositions[sq.squad_id] !== posKey;

                return (
                  <option
                    key={sq.squad_id}
                    value={sq.squad_id}
                    disabled={Boolean(isAssignedElsewhere)}
                  >
                    👥 {sq.squad_title} ({sq.members.length} Teammates: {sq.members.map((m) => m.name).join(", ")}) {isAssignedElsewhere ? " ⚠️ (Assigned)" : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            /* INDIVIDUAL CANDIDATE SELECT */
            <select
              value={currentSelection}
              onChange={(e) => onCandidateSelect(posKey, e.target.value)}
              className={`w-full p-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                currentSelection
                  ? "bg-white border-indigo-400 text-indigo-950 ring-2 ring-indigo-100"
                  : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              <option value="">-- No Candidate Awarded --</option>
              {registeredCandidates.map((c, idx) => {
                const isAssignedElsewhere =
                  assignedPositions[c.addNo] && assignedPositions[c.addNo] !== posKey;

                return (
                  <option
                    key={`${c.addNo}_${idx}`}
                    value={c.addNo}
                    disabled={Boolean(isAssignedElsewhere)}
                  >
                    [{c.addNo}] {c.name} {isAssignedElsewhere ? " ⚠️ (Assigned)" : ""}
                  </option>
                );
              })}
            </select>
          )}

          {/* Grade Options (for 1st, 2nd, 3rd) */}
          {hasGradeOptions && currentSelection && (
            <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase sm:hidden">Grade:</span>
              <button
                type="button"
                onClick={() => onGradeSelect(posKey, "none")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentGrade === "none"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title="Position Only (No Grade)"
              >
                Position Only
              </button>
              <button
                type="button"
                onClick={() => onGradeSelect(posKey, "A")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentGrade === "A"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title="A Grade"
              >
                A Grade
              </button>
              <button
                type="button"
                onClick={() => onGradeSelect(posKey, "B")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentGrade === "B"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title="B Grade"
              >
                B Grade
              </button>
            </div>
          )}
        </div>
      </div>

      {/* If Group Program and Group is Selected: List down the Group Name and all Teammates */}
      {isGroupProgram && currentSelection && (() => {
        const selectedSquad = registeredSquads.find((s) => s.squad_id === currentSelection);
        if (!selectedSquad) return null;

        return (
          <div className="w-full mt-1 p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">👥</span>
                <span className="font-extrabold text-indigo-950 text-sm">
                  Group Winner: {selectedSquad.squad_title}
                </span>
              </div>
              <span className="text-[11px] font-black text-indigo-800 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {selectedSquad.members.length} Teammates • +{calculatedPoints} PTS Each
              </span>
            </div>

            {/* List down teammates with equal position point badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {selectedSquad.members.map((m) => (
                <div
                  key={m.addNo}
                  className="p-2 bg-white rounded-xl border border-indigo-100 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
                      <SafeImage
                        src={m.photoUrl}
                        alt={m.name}
                        fallbackCategory="student"
                        fallbackText={m.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 truncate">
                      <span className="font-bold text-slate-900 block truncate text-[11px]">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {m.addNo}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    +{calculatedPoints} PTS
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-indigo-700 font-semibold italic pt-1">
              ⚡ Equal Position Points Rule: All {selectedSquad.members.length} teammates in group &quot;{selectedSquad.squad_title}&quot; receive equal position points (+{calculatedPoints} PTS) credited directly to their student profile.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
