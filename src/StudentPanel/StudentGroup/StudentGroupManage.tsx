import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveStudentProfile } from "../../lib/accountResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import {
  Users,
  UserPlus,
  Trash2,
  LogOut,
  Plus,
  CheckCircle2,
  AlertCircle,
  Crown,
  Award,
  AlertTriangle,
  X
} from "lucide-react";

interface StudentProfile {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
}

interface SquadItem {
  squad_id: string;
  created_at: string;
  squad_title: string;
  member1_uuid: string | null; // Leader / Creator
  member2_uuid: string | null;
  member3_uuid: string | null;
  member4_uuid: string | null;
  member5_uuid: string | null;
  member6_uuid: string | null;
  member7_uuid: string | null;
  is_active: boolean;
  total_particiations: number;
  total_points: number;
  winning_rate: number;
}

interface OpenProgramItem {
  Program_Code: string;
  Program_Title: string | null;
  Category?: string | null;
  Date: string | null;
  Venue: string | null;
  is_group_program?: boolean;
}

interface ConfirmDialogState {
  type: "disband" | "leave" | "remove_member";
  badge: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  isDestructive: boolean;
  onConfirm: () => Promise<void>;
}

export default function StudentGroupManage() {
  const { actStn } = useParams<{ actStn: string }>();
  const meta = useProgrammeMeta();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [squads, setSquads] = useState<SquadItem[]>([]);
  const [squadRegistrations, setSquadRegistrations] = useState<Record<string, string[]>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [openGroupPrograms, setOpenGroupPrograms] = useState<OpenProgramItem[]>([]);

  const [activeTab, setActiveTab] = useState<"my-squads" | "create-squad">("my-squads");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // In-app Caution Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Create Form State
  const [newSquadTitle, setNewSquadTitle] = useState("");
  const [teammateAddNos, setTeammateAddNos] = useState<string[]>(["", ""]);

  // Quick Registration modal state for a squad
  const [registerSquadModal, setRegisterSquadModal] = useState<SquadItem | null>(null);
  const [selectedProgramCode, setSelectedProgramCode] = useState("");

  // 1. Load current student profile
  useEffect(() => {
    async function loadStudent() {
      try {
        const data = await resolveStudentProfile(actStn);
        if (data) {
          setStudent(data as StudentProfile);
        }
      } catch (err) {
        console.error("Error loading student:", err);
      }
    }
    loadStudent();
  }, [actStn]);

  // 2. Load squads and open group programmes
  const loadSquadsData = async () => {
    try {
      setLoading(true);
      // Fetch all active squads
      const { data: squadsData, error: squadsError } = await SupaBaseFunction
        .from("SquadMate")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (squadsError) throw squadsError;
      const allList = (squadsData as SquadItem[]) || [];

      // Collect all student AddNos mentioned in squads to look up their names
      const allAddNos = new Set<string>();
      allList.forEach((s) => {
        [s.member1_uuid, s.member2_uuid, s.member3_uuid, s.member4_uuid, s.member5_uuid, s.member6_uuid, s.member7_uuid]
          .filter(Boolean)
          .forEach((id) => allAddNos.add(id as string));
      });

      if (allAddNos.size > 0) {
        const { data: studentsData } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName")
          .in("AddNo", Array.from(allAddNos));

        if (studentsData) {
          const map: Record<string, string> = {};
          studentsData.forEach((stn) => {
            map[stn.AddNo] = stn.StudentName || stn.AddNo;
          });
          setStudentNames(map);
        }
      }

      // Filter squads where current student is a member or creator
      if (student?.AddNo) {
        const userAddNo = student.AddNo.trim().toUpperCase();
        const my = allList.filter((s) => {
          return [
            s.member1_uuid,
            s.member2_uuid,
            s.member3_uuid,
            s.member4_uuid,
            s.member5_uuid,
            s.member6_uuid,
            s.member7_uuid,
          ].some((m) => m && m.trim().toUpperCase() === userAddNo);
        });
        setSquads(my);

        // Fetch which events these squads are already registered for
        const squadIds = my.map((s) => s.squad_id).filter(Boolean);
        if (squadIds.length > 0) {
          const { data: squadRegRows } = await SupaBaseFunction
            .from("CandidateRegistrationTable")
            .select("Program_Code, squad_uuid")
            .in("squad_uuid", squadIds);

          const regMap: Record<string, string[]> = {};
          (squadRegRows || []).forEach((row: any) => {
            if (row.squad_uuid && row.Program_Code) {
              if (!regMap[row.squad_uuid]) regMap[row.squad_uuid] = [];
              if (!regMap[row.squad_uuid].includes(row.Program_Code)) {
                regMap[row.squad_uuid].push(row.Program_Code);
              }
            }
          });
          setSquadRegistrations(regMap);
        } else {
          setSquadRegistrations({});
        }
      } else {
        setSquads([]);
        setSquadRegistrations({});
      }

      // Fetch open group programmes
      const { data: progData } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Program_Code, Program_Title, Category, Date, Venue, is_group_program")
        .eq("IsOpenRegistration", true)
        .eq("is_group_program", true)
        .eq("IsConducted", false);

      if (progData) {
        setOpenGroupPrograms(progData as OpenProgramItem[]);
      }
    } catch (err: any) {
      console.error("Error loading squads:", err);
      setStatusMsg({ type: "error", text: "Failed to load squads: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student) {
      loadSquadsData();
    }
  }, [student]);

  // Teammate input handlers
  const handleTeammateChange = (index: number, value: string) => {
    const updated = [...teammateAddNos];
    updated[index] = value.trim().toUpperCase();
    setTeammateAddNos(updated);
  };

  const addTeammateSlot = () => {
    if (teammateAddNos.length < 6) {
      setTeammateAddNos([...teammateAddNos, ""]);
    }
  };

  const removeTeammateSlot = (index: number) => {
    if (teammateAddNos.length > 1) {
      setTeammateAddNos(teammateAddNos.filter((_, i) => i !== index));
    }
  };

  // CREATE SQUAD with strict teammate uniqueness in one row
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ type: "", text: "" });

    if (!student) {
      setStatusMsg({ type: "error", text: "Student identity not verified." });
      return;
    }

    const trimmedTitle = newSquadTitle.trim();
    if (!trimmedTitle) {
      setStatusMsg({ type: "error", text: "Please enter a unique squad/group title." });
      return;
    }

    const filledTeammates = teammateAddNos.map((m) => m.trim().toUpperCase()).filter(Boolean);
    if (filledTeammates.length === 0) {
      setStatusMsg({ type: "error", text: "Please add at least 1 teammate (minimum 2 members in group)." });
      return;
    }

    // CHECK 1: Creator cannot add themselves as a teammate
    if (filledTeammates.includes(student.AddNo)) {
      setStatusMsg({
        type: "error",
        text: `Violation: You (${student.AddNo}) are already the Group Creator (Leader). You cannot add yourself as a teammate in the same group!`,
      });
      return;
    }

    // CHECK 2: Teammates in the row must be unique
    const uniqueTeammates = new Set(filledTeammates);
    if (uniqueTeammates.size !== filledTeammates.length) {
      setStatusMsg({
        type: "error",
        text: "Violation: Duplicate teammate detected! All teammates in the group must be unique in this row.",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Verify all teammates exist in StudentsBox
      const { data: validStudents, error: stnError } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName")
        .in("AddNo", filledTeammates);

      if (stnError) throw stnError;

      const foundAddNos = new Set((validStudents || []).map((s) => s.AddNo));
      const invalidAddNos = filledTeammates.filter((id) => !foundAddNos.has(id));

      if (invalidAddNos.length > 0) {
        throw new Error(`The following student AddNos do not exist in the Students directory: ${invalidAddNos.join(", ")}`);
      }

      // Check if squad title is already taken
      const { data: existingSquad } = await SupaBaseFunction
        .from("SquadMate")
        .select("squad_id, squad_title")
        .ilike("squad_title", trimmedTitle)
        .maybeSingle();

      if (existingSquad) {
        throw new Error(`A squad with the title "${trimmedTitle}" already exists. Please choose a unique name.`);
      }

      // Insert new SquadMate row
      const payload: any = {
        squad_title: trimmedTitle,
        member1_uuid: student.AddNo, // Creator is Leader
        member2_uuid: filledTeammates[0] || null,
        member3_uuid: filledTeammates[1] || null,
        member4_uuid: filledTeammates[2] || null,
        member5_uuid: filledTeammates[3] || null,
        member6_uuid: filledTeammates[4] || null,
        member7_uuid: filledTeammates[5] || null,
        is_active: true,
        total_particiations: 0,
        total_points: 0,
        winning_rate: 0,
      };

      const { error: insertError } = await SupaBaseFunction
        .from("SquadMate")
        .insert([payload]);

      if (insertError) throw insertError;

      setStatusMsg({
        type: "success",
        text: `🎉 Squad "${trimmedTitle}" formed successfully with ${filledTeammates.length + 1} members!`,
      });

      setNewSquadTitle("");
      setTeammateAddNos(["", ""]);
      setActiveTab("my-squads");
      await loadSquadsData();
    } catch (err: any) {
      console.error("Squad creation error:", err);
      setStatusMsg({ type: "error", text: err.message || "Failed to create squad." });
    } finally {
      setSubmitting(false);
    }
  };

  // FEATURE: Any member of the group (teammate or leader) can leave the squad
  const promptLeaveGroup = (squad: SquadItem) => {
    if (!student) return;
    const isLeader = squad.member1_uuid === student.AddNo;
    setConfirmDialog({
      type: "leave",
      badge: isLeader ? "CAUTION: LEAVING AS LEADER" : "CAUTION: LEAVE SQUAD",
      title: isLeader
        ? `Leave & Transfer Leadership of "${squad.squad_title}"?`
        : `Leave Squad "${squad.squad_title}"?`,
      description: isLeader
        ? `You are the Leader and Creator of group "${squad.squad_title}". Leaving will promote the first teammate to Leader, or permanently disband the group if you are the last member. Are you sure you want to proceed? If yes, you will leave; otherwise no action will be taken.`
        : `Are you sure you want to leave group "${squad.squad_title}"? You will be removed from team participation in upcoming group events for this squad. If yes, you will leave; otherwise no action will be taken.`,
      confirmLabel: isLeader ? "Yes, Leave & Transfer" : "Yes, Leave Group",
      cancelLabel: "No, Stay in Group",
      isDestructive: true,
      onConfirm: async () => {
        await executeLeaveGroup(squad);
      },
    });
  };

  const executeLeaveGroup = async (squad: SquadItem) => {
    if (!student) return;

    try {
      setSubmitting(true);
      setStatusMsg({ type: "", text: "" });

      const isLeader = squad.member1_uuid === student.AddNo;
      const userUpper = student.AddNo.trim().toUpperCase();

      if (isLeader) {
        // Collect all remaining teammates
        const remainingTeammates = [
          squad.member2_uuid,
          squad.member3_uuid,
          squad.member4_uuid,
          squad.member5_uuid,
          squad.member6_uuid,
          squad.member7_uuid,
        ].filter(Boolean) as string[];

        if (remainingTeammates.length === 0) {
          // If no other members remain, delete/disband squad
          if (squad.squad_id) {
            try {
              await SupaBaseFunction
                .from("CandidateRegistrationTable")
                .delete()
                .eq("squad_uuid", squad.squad_id);
            } catch (candErr) {
              console.warn("Could not clear candidate registrations:", candErr);
            }
          }

          const { error: delErr } = await SupaBaseFunction
            .from("SquadMate")
            .delete()
            .eq("squad_id", squad.squad_id);

          if (delErr) throw delErr;

          setStatusMsg({
            type: "success",
            text: `You have left group "${squad.squad_title}". As you were the only member, the group has been deleted.`,
          });
          await loadSquadsData();
          return;
        }

        // Promote first teammate to Leader and shift the rest
        const slotUpdates: any = {
          member1_uuid: remainingTeammates[0],
          member2_uuid: remainingTeammates[1] || null,
          member3_uuid: remainingTeammates[2] || null,
          member4_uuid: remainingTeammates[3] || null,
          member5_uuid: remainingTeammates[4] || null,
          member6_uuid: remainingTeammates[5] || null,
          member7_uuid: null,
        };

        const { error } = await SupaBaseFunction
          .from("SquadMate")
          .update(slotUpdates)
          .eq("squad_id", squad.squad_id);

        if (error) throw error;
      } else {
        const slotUpdates: any = {};
        if (squad.member2_uuid && squad.member2_uuid.trim().toUpperCase() === userUpper) slotUpdates.member2_uuid = null;
        else if (squad.member3_uuid && squad.member3_uuid.trim().toUpperCase() === userUpper) slotUpdates.member3_uuid = null;
        else if (squad.member4_uuid && squad.member4_uuid.trim().toUpperCase() === userUpper) slotUpdates.member4_uuid = null;
        else if (squad.member5_uuid && squad.member5_uuid.trim().toUpperCase() === userUpper) slotUpdates.member5_uuid = null;
        else if (squad.member6_uuid && squad.member6_uuid.trim().toUpperCase() === userUpper) slotUpdates.member6_uuid = null;
        else if (squad.member7_uuid && squad.member7_uuid.trim().toUpperCase() === userUpper) slotUpdates.member7_uuid = null;
        else {
          throw new Error("You are not registered as an active member of this group.");
        }

        const { error } = await SupaBaseFunction
          .from("SquadMate")
          .update(slotUpdates)
          .eq("squad_id", squad.squad_id);

        if (error) throw error;
      }

      // Clean up event candidate registrations for this student under this squad
      if (squad.squad_id) {
        try {
          await SupaBaseFunction
            .from("CandidateRegistrationTable")
            .delete()
            .eq("squad_uuid", squad.squad_id)
            .eq("Candidate_Code", student.AddNo);
        } catch (candErr) {
          console.warn("Notice: could not clear squad candidate registration:", candErr);
        }
      }

      setStatusMsg({
        type: "success",
        text: `You have successfully left the group "${squad.squad_title}".`,
      });
      await loadSquadsData();
    } catch (err: any) {
      console.error("Error leaving squad:", err);
      setStatusMsg({ type: "error", text: err.message || "Could not leave group." });
    } finally {
      setSubmitting(false);
    }
  };

  // FEATURE: Group creator can remove members one by one
  const promptRemoveMember = (squad: SquadItem, memberSlotKey: string, memberAddNo: string) => {
    const memberName = studentNames[memberAddNo] || memberAddNo;
    setConfirmDialog({
      type: "remove_member",
      badge: "CAUTION: REMOVE TEAMMATE",
      title: `Remove ${memberName} from "${squad.squad_title}"?`,
      description: `Are you sure you want to remove teammate ${memberName} (${memberAddNo}) from this group? They will no longer participate with this group in upcoming events. If yes, they will be removed; otherwise no changes will be made.`,
      confirmLabel: "Yes, Remove Member",
      cancelLabel: "No, Keep Member",
      isDestructive: true,
      onConfirm: async () => {
        await executeRemoveMember(squad, memberSlotKey, memberAddNo);
      },
    });
  };

  const executeRemoveMember = async (squad: SquadItem, memberSlotKey: string, memberAddNo: string) => {
    const memberName = studentNames[memberAddNo] || memberAddNo;
    try {
      setSubmitting(true);
      setStatusMsg({ type: "", text: "" });

      if (squad.squad_id && memberAddNo) {
        try {
          await SupaBaseFunction
            .from("CandidateRegistrationTable")
            .delete()
            .eq("squad_uuid", squad.squad_id)
            .eq("Candidate_Code", memberAddNo);
        } catch (regDelErr) {
          console.warn("Could not delete candidate registration:", regDelErr);
        }
      }

      const { error } = await SupaBaseFunction
        .from("SquadMate")
        .update({ [memberSlotKey]: null })
        .eq("squad_id", squad.squad_id);

      if (error) throw error;

      setStatusMsg({
        type: "success",
        text: `Teammate ${memberName} (${memberAddNo}) was removed from "${squad.squad_title}".`,
      });
      await loadSquadsData();
    } catch (err: any) {
      console.error("Error removing member:", err);
      setStatusMsg({ type: "error", text: err.message || "Could not remove member." });
    } finally {
      setSubmitting(false);
    }
  };

  // Disband / Delete squad (Only Creator)
  const promptDisbandSquad = (squad: SquadItem) => {
    setConfirmDialog({
      type: "disband",
      badge: "CAUTION: PERMANENT DELETION",
      title: `Delete Group "${squad.squad_title}"?`,
      description: `CAUTION: Are you sure you want to permanently delete and disband "${squad.squad_title}"? All group information, member affiliations, and registrations for group programmes under this squad will be permanently deleted. This action cannot be undone. If yes, the group will be deleted; otherwise no action will be taken.`,
      confirmLabel: "Yes, Delete Group",
      cancelLabel: "No, Keep Group",
      isDestructive: true,
      onConfirm: async () => {
        await executeDisbandSquad(squad.squad_id, squad.squad_title);
      },
    });
  };

  const executeDisbandSquad = async (squadId: string, squadTitle: string) => {
    try {
      setSubmitting(true);
      setStatusMsg({ type: "", text: "" });

      if (squadId) {
        try {
          await SupaBaseFunction
            .from("CandidateRegistrationTable")
            .delete()
            .eq("squad_uuid", squadId);
        } catch (delCandErr) {
          console.warn("Could not delete candidate registrations for squad:", delCandErr);
        }
      }

      const { error } = await SupaBaseFunction
        .from("SquadMate")
        .delete()
        .eq("squad_id", squadId);

      if (error) throw error;

      setStatusMsg({
        type: "success",
        text: `Group "${squadTitle}" has been permanently deleted.`,
      });
      await loadSquadsData();
    } catch (err: any) {
      console.error("Error disbanding squad:", err);
      setStatusMsg({ type: "error", text: err.message || "Could not delete group." });
    } finally {
      setSubmitting(false);
    }
  };

  // Assign this squad to an open group programme
  const handleAssignSquadToProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerSquadModal || !selectedProgramCode) {
      setStatusMsg({ type: "error", text: "Please select an open group programme." });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMsg({ type: "", text: "" });

      const squadMembers = [
        registerSquadModal.member1_uuid,
        registerSquadModal.member2_uuid,
        registerSquadModal.member3_uuid,
        registerSquadModal.member4_uuid,
        registerSquadModal.member5_uuid,
        registerSquadModal.member6_uuid,
        registerSquadModal.member7_uuid,
      ].filter(Boolean) as string[];

      if (squadMembers.length === 0) {
        throw new Error("Squad has no members.");
      }

      // Check if squad is already registered
      const { data: existingRegs } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("Candidate_Code")
        .eq("Program_Code", selectedProgramCode)
        .in("Candidate_Code", squadMembers);

      if (existingRegs && existingRegs.length > 0) {
        const dupes = existingRegs.map((r) => r.Candidate_Code).join(", ");
        throw new Error(`Members (${dupes}) are already registered for this programme!`);
      }

      // Insert all squad members to CandidateRegistrationTable
      const candidateInserts = squadMembers.map((m) => ({
        Program_Code: selectedProgramCode,
        Candidate_Code: m,
        squad_uuid: registerSquadModal.squad_id || null,
      }));

      const { error: regError } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert(candidateInserts);

      if (regError) throw regError;

      // Increment participation count
      await SupaBaseFunction
        .from("SquadMate")
        .update({ total_particiations: (registerSquadModal.total_particiations || 0) + 1 })
        .eq("squad_id", registerSquadModal.squad_id);

      // Increment program Total_Registration
      const { data: prog } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Total_Registration")
        .eq("Program_Code", selectedProgramCode)
        .maybeSingle();

      if (prog) {
        await SupaBaseFunction
          .from("ProgrammesBox")
          .update({ Total_Registration: (prog.Total_Registration || 0) + squadMembers.length })
          .eq("Program_Code", selectedProgramCode);
      }

      setStatusMsg({
        type: "success",
        text: `🎉 Squad "${registerSquadModal.squad_title}" (${squadMembers.length} members) registered for programme ${selectedProgramCode}!`,
      });

      setRegisterSquadModal(null);
      setSelectedProgramCode("");
      await loadSquadsData();
    } catch (err: any) {
      console.error("Squad registration error:", err);
      setStatusMsg({ type: "error", text: err.message || "Failed to register squad." });
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberList = (squad: SquadItem) => {
    return [
      { key: "member1_uuid", addNo: squad.member1_uuid, isLeader: true },
      { key: "member2_uuid", addNo: squad.member2_uuid, isLeader: false },
      { key: "member3_uuid", addNo: squad.member3_uuid, isLeader: false },
      { key: "member4_uuid", addNo: squad.member4_uuid, isLeader: false },
      { key: "member5_uuid", addNo: squad.member5_uuid, isLeader: false },
      { key: "member6_uuid", addNo: squad.member6_uuid, isLeader: false },
      { key: "member7_uuid", addNo: squad.member7_uuid, isLeader: false },
    ].filter((m) => Boolean(m.addNo));
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-8 font-sans pb-28 overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-indigo-950 rounded-3xl p-5 sm:p-8 text-white shadow-xl mb-6 sm:mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Squad & Group Hub
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Create & Manage Group Squads</h1>
          <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Team up for group competitions. Group creators manage teammates, and members can freely leave squads.
          </p>
          {student && (
            <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl text-xs font-semibold backdrop-blur-md border border-white/10 flex-wrap">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Logged in as: <strong>{student.StudentName}</strong> ({student.AddNo})</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {statusMsg.text && (
        <div
          className={`p-4 rounded-2xl mb-6 flex items-start gap-3 border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs (Responsive: Stack on small mobile, row on tablet+) */}
      <div className="flex flex-col sm:flex-row gap-2 bg-slate-200/70 p-1.5 rounded-2xl mb-6 sm:mb-8 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("my-squads")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "my-squads"
              ? "bg-white text-indigo-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={14} /> My Squads ({squads.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("create-squad")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "create-squad"
              ? "bg-white text-indigo-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <UserPlus size={14} /> Form New Group
        </button>
      </div>

      {/* TAB 1: MY SQUADS */}
      {activeTab === "my-squads" && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm font-semibold">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              Loading your squads...
            </div>
          ) : squads.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">You are not in any squad yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Form a new squad with unique teammates or get invited by a squad leader to participate in group competitions.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("create-squad")}
                className="mt-5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                + Form New Group Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {squads.map((squad) => {
                const isCreator = squad.member1_uuid === student?.AddNo;
                const members = getMemberList(squad);

                return (
                  <div
                    key={squad.squad_id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-lg text-slate-900">{squad.squad_title}</span>
                            {isCreator ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                <Crown size={11} /> You are Creator
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                Teammate
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Participations: {squad.total_particiations || 0} • Points: {squad.total_points || 0}
                          </span>
                        </div>

                        {/* Action buttons for Squad header */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => promptLeaveGroup(squad)}
                            disabled={submitting}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                            title="Leave this group"
                          >
                            <LogOut size={13} /> Leave Group
                          </button>
                          {isCreator && (
                            <button
                              type="button"
                              onClick={() => promptDisbandSquad(squad)}
                              disabled={submitting}
                              className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                              title="Delete this group"
                            >
                              <Trash2 size={13} /> Delete Group
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Teammates List with One-by-One Removal for Creator & Leave option */}
                      <div className="mb-5">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                          Squad Members ({members.length}/7)
                        </label>

                        <div className="space-y-2">
                          {members.map((m, mIdx) => {
                            const isCurrentStudent = m.addNo === student?.AddNo;
                            const displayName = studentNames[m.addNo!] || m.addNo;

                            return (
                              <div
                                key={`${squad.squad_id}_${m.key}_${m.addNo}_${mIdx}`}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                                  m.isLeader
                                    ? "bg-amber-50/60 border-amber-200 font-semibold"
                                    : "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  {m.isLeader ? (
                                    <Crown size={14} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <Users size={14} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-mono font-bold text-indigo-700">{m.addNo}</span>
                                  <span className="text-slate-800 truncate">
                                    {displayName} {isCurrentStudent ? "(You)" : ""}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Direct Leave button for the current user */}
                                  {isCurrentStudent && (
                                    <button
                                      type="button"
                                      onClick={() => promptLeaveGroup(squad)}
                                      disabled={submitting}
                                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                      title="Leave this group"
                                    >
                                      <LogOut size={11} /> Leave
                                    </button>
                                  )}

                                  {/* One-by-One Removal: Creator can remove individual non-leader teammates */}
                                  {isCreator && !m.isLeader && !isCurrentStudent && (
                                    <button
                                      type="button"
                                      onClick={() => promptRemoveMember(squad, m.key, m.addNo!)}
                                      disabled={submitting}
                                      className="px-2 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                      title={`Remove ${displayName} from group`}
                                    >
                                      <Trash2 size={12} /> Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Registered Events Badges */}
                    {squadRegistrations[squad.squad_id] && squadRegistrations[squad.squad_id].length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Registered Programmes ({squadRegistrations[squad.squad_id].length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {squadRegistrations[squad.squad_id].map((code, cIdx) => {
                            const prog = openGroupPrograms.find((p) => p.Program_Code === code);
                            const catName = prog?.Category ? (meta.categoryMap[prog.Category] || prog.Category) : "General";
                            return (
                              <span
                                key={`${squad.squad_id}_${code}_${cIdx}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                              >
                                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                <span>{prog?.Program_Title || code}, Category({catName})</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Register this Squad for an Open Group Event */}
                    {(() => {
                      const regCodes = squadRegistrations[squad.squad_id] || [];
                      const availableProgs = openGroupPrograms.filter((p) => !regCodes.includes(p.Program_Code));

                      return (
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400">
                            {availableProgs.length} open group event(s) available
                          </span>
                          {availableProgs.length === 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              <span>Registered for Open Events</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRegisterSquadModal(squad);
                                setSelectedProgramCode(availableProgs[0]?.Program_Code || "");
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                              <Award size={14} /> Register for Event
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE NEW GROUP */}
      {activeTab === "create-squad" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm max-w-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-900">Form a New Group Squad</h2>
            <p className="text-xs text-slate-500 mt-1">
              Group title and all teammates in this row must be unique. You are automatically set as the Squad Creator & Leader.
            </p>
          </div>

          <form onSubmit={handleCreateSquad} className="space-y-5">
            {/* Squad Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Group / Squad Title * (Must be Unique)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Phoenix Champions, Code Knights, etc."
                value={newSquadTitle}
                onChange={(e) => setNewSquadTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Leader / Creator Field (Read Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Squad Creator & Leader (Slot 1)
              </label>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-amber-600" />
                  <span className="font-mono font-bold text-amber-900">{student?.AddNo}</span>
                  <span className="font-semibold text-amber-800">- {student?.StudentName} (You)</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 uppercase">Leader</span>
              </div>
            </div>

            {/* Teammates List (Slots 2-7) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Teammate Admission Numbers (Slots 2-7)
                </label>
                <span className="text-[11px] text-slate-400">
                  Must be unique • Cannot repeat
                </span>
              </div>

              <div className="space-y-2.5">
                {teammateAddNos.map((addNo, idx) => (
                  <div key={`teammate-slot-${idx}`} className="flex items-center gap-2">
                    <span className="w-14 text-xs font-bold text-slate-400">Slot {idx + 2}:</span>
                    <input
                      type="text"
                      placeholder={`e.g. STN${idx + 2}00`}
                      value={addNo}
                      onChange={(e) => handleTeammateChange(idx, e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {teammateAddNos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTeammateSlot(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Remove Slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {teammateAddNos.length < 6 && (
                <button
                  type="button"
                  onClick={addTeammateSlot}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <Plus size={14} /> Add Another Teammate Slot (Up to 7 Total)
                </button>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("my-squads")}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Forming Group Squad..." : "Form Group Squad"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Caution Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            {/* Caution Banner */}
            <div className={`p-5 ${confirmDialog.isDestructive ? "bg-red-50/80" : "bg-amber-50/80"} border-b border-slate-100`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-xl ${confirmDialog.isDestructive ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${confirmDialog.isDestructive ? "text-red-700" : "text-amber-800"}`}>
                    {confirmDialog.badge}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  disabled={submitting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                {confirmDialog.title}
              </h3>
            </div>

            {/* Content & Options */}
            <div className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {confirmDialog.description}
              </p>

              {/* Action Buttons: Yes / No */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  {confirmDialog.cancelLabel || "No, Cancel"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    if (action) {
                      await action();
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                    confirmDialog.isDestructive
                      ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                  }`}
                >
                  {submitting ? "Processing..." : confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Event Registration Modal for Squad */}
      {registerSquadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Register Squad for Programme
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Assign all members of "{registerSquadModal.squad_title}" to an open group event.
            </p>

            <form onSubmit={handleAssignSquadToProgram} className="space-y-4">
              {(() => {
                const modalRegCodes = registerSquadModal ? (squadRegistrations[registerSquadModal.squad_id] || []) : [];
                const modalAvailableProgs = openGroupPrograms.filter((p) => !modalRegCodes.includes(p.Program_Code));

                return (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Select Open Group Programme
                      </label>
                      <select
                        required
                        value={selectedProgramCode}
                        onChange={(e) => setSelectedProgramCode(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Programme --</option>
                        {modalAvailableProgs.map((p) => {
                          const catName = p.Category ? (meta.categoryMap[p.Category] || p.Category) : "General";
                          return (
                            <option key={p.Program_Code} value={p.Program_Code}>
                              {p.Program_Title || "Program"}, Category({catName})
                            </option>
                          );
                        })}
                      </select>
                      {modalAvailableProgs.length === 0 && (
                        <p className="text-[11px] text-amber-600 font-medium mt-1">
                          All open group events are already registered for this squad.
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900">
                      Squad members who will be registered:{" "}
                      <strong>{getMemberList(registerSquadModal).map((m) => m.addNo).join(", ")}</strong>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRegisterSquadModal(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || modalAvailableProgs.length === 0 || !selectedProgramCode}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? "Assigning Squad..." : "Confirm Squad Registration"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
