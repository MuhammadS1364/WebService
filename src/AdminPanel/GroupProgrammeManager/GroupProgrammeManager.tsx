import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { resolveWingProfile } from "../../lib/wingResolver";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { exportToExcel } from "../../lib/excelService";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
import {
  Users,
  UserPlus,
  PlusCircle,
  Trash2,
  Trophy,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  MapPin,
  FileSpreadsheet,
  X,
  ExternalLink,
  Clock,
  BookOpen,
} from "lucide-react";

interface ProgrammeItem {
  Program_Code: string;
  Program_Title: string;
  Category?: string | null;
  WingCode?: string | null;
  Date?: string | null;
  Venue?: string | null;
  Group?: string | null;
  Total_Registration?: number | null;
  is_group_program?: boolean;
  IsResulted?: boolean;
  IsResultPublished?: boolean;
  IsConducted?: boolean;
  points_template?: string | null;
  Expected_Time?: string | null;
  is_limitation?: boolean;
  individual_limit_count?: number | null;
  group_limit_count?: number | null;
  is_topic?: boolean;
  topic_title?: string | null;
  drive_link?: string | null;
}

interface SquadItem {
  squad_id: string;
  squad_title: string;
  member1_uuid: string | null;
  member2_uuid: string | null;
  member3_uuid: string | null;
  member4_uuid: string | null;
  member5_uuid: string | null;
  member6_uuid: string | null;
  member7_uuid: string | null;
  is_active: boolean;
  total_points?: number;
}

interface StudentInfo {
  AddNo: string;
  StudentName: string;
  Stn_Class: string | null;
  Class?: string | null;
  CollegeName: string | null;
  Student_Photo_Urls: string | null;
  resolvedClass?: string;
}

interface RegisteredEntry {
  CandidateUUiD: string;
  Program_Code: string;
  Candidate_Code: string;
  squad_uuid?: string | null;
  student?: StudentInfo;
  squadTitle?: string;
}

export default function GroupProgrammeManager() {
  const { actUser, actWing, actController } = useParams<{
    actUser?: string;
    actWing?: string;
    actController?: string;
  }>();

  const navigate = useNavigate();
  const meta = useProgrammeMeta();

  // Role Detection
  const isAdmin = Boolean(actUser);
  const isWing = Boolean(actWing);
  const isController = Boolean(actController);

  // Core Data
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [selectedProgramCode, setSelectedProgramCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [programFilter, setProgramFilter] = useState<"all" | "group" | "individual">("group");
  const [programSearch, setProgramSearch] = useState<string>("");

  // Existing Registrations for Selected Programme
  const [registeredEntries, setRegisteredEntries] = useState<RegisteredEntry[]>([]);
  const [allSquads, setAllSquads] = useState<SquadItem[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, StudentInfo>>({});

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"registered" | "assignSquad" | "createSquad" | "assignIndividual">("registered");

  // Create Squad Form State
  const [newSquadTitle, setNewSquadTitle] = useState<string>("");
  const [squadMemberAddNos, setSquadMemberAddNos] = useState<string[]>([""]);
  const [memberLookupMap, setMemberLookupMap] = useState<Record<string, StudentInfo | null>>({});
  const [isSubmittingSquad, setIsSubmittingSquad] = useState<boolean>(false);
  const [squadFormMsg, setSquadFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Assign Squad to Programme State
  const [selectedSquadIdToAssign, setSelectedSquadIdToAssign] = useState<string>("");
  const [isAssigningSquad, setIsAssigningSquad] = useState<boolean>(false);
  const [assignSquadMsg, setAssignSquadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Assign Individual Candidate State
  const [individualAddNo, setIndividualAddNo] = useState<string>("");
  const [individualStudent, setIndividualStudent] = useState<StudentInfo | null>(null);
  const [isLookingUpIndividual, setIsLookingUpIndividual] = useState<boolean>(false);
  const [isAssigningIndividual, setIsAssigningIndividual] = useState<boolean>(false);
  const [individualMsg, setIndividualMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deletion Modals
  const [squadToDelete, setSquadToDelete] = useState<{ squadId: string; title: string; count: number } | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<{ uuid: string; addNo: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Helper: Resolve student class name
  const resolveStudentClass = useCallback(
    (stn?: Partial<StudentInfo> | null): string => {
      if (!stn) return "Unassigned Class";
      const rawClass = stn.Stn_Class || stn.Class;
      if (!rawClass) return "Unassigned Class";

      const matched = meta.classes?.find(
        (c) => c.class_id === rawClass || c.standard_name === rawClass || c.class_nick_name === rawClass
      );
      if (matched) {
        return matched.standard_name && matched.class_nick_name
          ? `${matched.standard_name} (${matched.class_nick_name})`
          : matched.standard_name || matched.class_nick_name || "Standard Class";
      }
      if (meta.classStandardNameMap?.[rawClass]) return meta.classStandardNameMap[rawClass];
      if (meta.classMap?.[rawClass]) return meta.classMap[rawClass];
      if (/^[0-9a-f-]{36}$/i.test(rawClass.trim())) return "Assigned Class";
      return rawClass;
    },
    [meta.classes, meta.classStandardNameMap, meta.classMap]
  );

  // 1. Fetch Initial Programmes and Squads
  const fetchProgrammesAndSquads = useCallback(async () => {
    try {
      setLoading(true);

      let progQuery = SupaBaseFunction
        .from("ProgrammesBox")
        .select("Program_Code, Program_Title, Category, WingCode, Date, Venue, Group, Total_Registration, is_group_program, IsResulted, IsResultPublished, IsConducted, points_template, Expected_Time, is_limitation, individual_limit_count, group_limit_count, is_topic, topic_title, drive_link")
        .order("Date", { ascending: false });

      // If Wing panel, filter strictly by resolved WingCode
      if (isWing && actWing) {
        const wing = await resolveWingProfile(actWing);
        if (wing?.WingCode) {
          progQuery = progQuery.eq("WingCode", wing.WingCode);
        }
      }

      // If Controller, filter by Category
      if (isController && actController) {
        const { data: cRow } = await SupaBaseFunction
          .from("Category_Controller")
          .select("category_uuid")
          .or(`controller_email.ilike.${actController},controller_user_id.ilike.${actController}`)
          .maybeSingle();

        if (cRow?.category_uuid) {
          progQuery = progQuery.eq("Category", cRow.category_uuid);
        }
      }

      const [progsRes, squadsRes] = await Promise.all([
        progQuery,
        SupaBaseFunction.from("SquadMate").select("*").eq("is_active", true).order("squad_title", { ascending: true }),
      ]);

      const progs = (progsRes.data as ProgrammeItem[]) || [];
      const squads = (squadsRes.data as SquadItem[]) || [];

      setProgrammes(progs);
      setAllSquads(squads);

      // Pre-select first program if not selected
      if (!selectedProgramCode && progs.length > 0) {
        const firstGroup = progs.find((p) => p.is_group_program);
        setSelectedProgramCode(firstGroup ? firstGroup.Program_Code : progs[0].Program_Code);
      }
    } catch (err) {
      console.error("Error loading programmes/squads:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isWing, actWing, isController, actController, selectedProgramCode]);

  useEffect(() => {
    fetchProgrammesAndSquads();
  }, [fetchProgrammesAndSquads]);

  // Selected Programme Details
  const selectedProgram = useMemo(() => {
    return programmes.find((p) => p.Program_Code === selectedProgramCode) || null;
  }, [programmes, selectedProgramCode]);

  // Filtered Programme Dropdown List
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      if (programFilter === "group" && !p.is_group_program) return false;
      if (programFilter === "individual" && p.is_group_program) return false;

      if (programSearch.trim()) {
        const q = programSearch.toLowerCase();
        const title = (p.Program_Title || "").toLowerCase();
        const code = p.Program_Code.toLowerCase();
        return title.includes(q) || code.includes(q);
      }
      return true;
    });
  }, [programmes, programFilter, programSearch]);

  // 2. Fetch Registrations for Selected Programme
  const fetchRegistrationsForProgram = useCallback(async () => {
    if (!selectedProgramCode) {
      setRegisteredEntries([]);
      return;
    }

    try {
      setRefreshing(true);
      const { data: regRows, error } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("CandidateUUiD, Program_Code, Candidate_Code, squad_uuid")
        .eq("Program_Code", selectedProgramCode);

      if (error) throw error;
      const regs = regRows || [];

      // Extract unique AddNos
      const addNos = Array.from(new Set(regs.map((r) => r.Candidate_Code).filter(Boolean))) as string[];

      // Hydrate students
      let localStudentsMap = { ...studentsMap };
      const missingAddNos = addNos.filter((no) => !localStudentsMap[no]);

      if (missingAddNos.length > 0) {
        const { data: stnRows } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class, Class, CollegeName, Student_Photo_Urls")
          .in("AddNo", missingAddNos);

        (stnRows || []).forEach((s: any) => {
          localStudentsMap[s.AddNo] = {
            ...s,
            resolvedClass: resolveStudentClass(s),
          };
        });
        setStudentsMap(localStudentsMap);
      }

      // Map squad titles
      const squadTitleMap: Record<string, string> = {};
      allSquads.forEach((sq) => {
        squadTitleMap[sq.squad_id] = sq.squad_title;
      });

      const enriched: RegisteredEntry[] = regs.map((r) => ({
        ...r,
        student: localStudentsMap[r.Candidate_Code] || {
          AddNo: r.Candidate_Code,
          StudentName: `Candidate #${r.Candidate_Code}`,
          Stn_Class: null,
          CollegeName: null,
          Student_Photo_Urls: null,
          resolvedClass: "Standard Class",
        },
        squadTitle: r.squad_uuid ? squadTitleMap[r.squad_uuid] || "Registered Squad" : undefined,
      }));

      setRegisteredEntries(enriched);
    } catch (err) {
      console.error("Error loading program registrations:", err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedProgramCode, allSquads, studentsMap, resolveStudentClass]);

  useEffect(() => {
    fetchRegistrationsForProgram();
  }, [fetchRegistrationsForProgram]);

  // Grouped Registrations (Squads vs Individuals)
  const { registeredSquadGroups, individualCandidates } = useMemo(() => {
    const squadsMap: Record<string, { squadId: string; title: string; members: RegisteredEntry[] }> = {};
    const individuals: RegisteredEntry[] = [];

    registeredEntries.forEach((entry) => {
      if (entry.squad_uuid) {
        if (!squadsMap[entry.squad_uuid]) {
          squadsMap[entry.squad_uuid] = {
            squadId: entry.squad_uuid,
            title: entry.squadTitle || "Registered Squad",
            members: [],
          };
        }
        squadsMap[entry.squad_uuid].members.push(entry);
      } else {
        individuals.push(entry);
      }
    });

    return {
      registeredSquadGroups: Object.values(squadsMap),
      individualCandidates: individuals,
    };
  }, [registeredEntries]);

  // Lookup student dynamically for squad creation
  const handleLookupMember = async (index: number, addNo: string) => {
    const cleanAddNo = addNo.trim().toUpperCase();
    const updated = [...squadMemberAddNos];
    updated[index] = cleanAddNo;
    setSquadMemberAddNos(updated);

    if (!cleanAddNo) {
      setMemberLookupMap((prev) => ({ ...prev, [index]: null }));
      return;
    }

    try {
      const { data } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName, Stn_Class, Class, CollegeName, Student_Photo_Urls")
        .ilike("AddNo", cleanAddNo)
        .maybeSingle();

      if (data) {
        const hydrated: StudentInfo = {
          ...data,
          resolvedClass: resolveStudentClass(data),
        };
        setMemberLookupMap((prev) => ({ ...prev, [index]: hydrated }));
      } else {
        setMemberLookupMap((prev) => ({ ...prev, [index]: null }));
      }
    } catch {
      setMemberLookupMap((prev) => ({ ...prev, [index]: null }));
    }
  };

  const handleAddMemberSlot = () => {
    if (squadMemberAddNos.length < 7) {
      setSquadMemberAddNos([...squadMemberAddNos, ""]);
    }
  };

  const handleRemoveMemberSlot = (index: number) => {
    if (squadMemberAddNos.length <= 1) return;
    const updated = squadMemberAddNos.filter((_, i) => i !== index);
    setSquadMemberAddNos(updated);

    const newMap: Record<string, StudentInfo | null> = {};
    updated.forEach((_, i) => {
      newMap[i] = memberLookupMap[i] || null;
    });
    setMemberLookupMap(newMap);
  };

  // Submit Create Squad
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setSquadFormMsg(null);

    const title = newSquadTitle.trim();
    if (!title) {
      setSquadFormMsg({ type: "error", text: "Please enter a valid Squad Title / Group Name." });
      return;
    }

    const validMembers = squadMemberAddNos
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);

    if (validMembers.length < 2) {
      setSquadFormMsg({ type: "error", text: "A group/squad must have at least 2 member students." });
      return;
    }

    // Check duplicate members
    const uniqueMembers = new Set(validMembers);
    if (uniqueMembers.size !== validMembers.length) {
      setSquadFormMsg({ type: "error", text: "Duplicate student admission numbers detected in this squad." });
      return;
    }

    setIsSubmittingSquad(true);
    try {
      const payload: Partial<SquadItem> = {
        squad_title: title,
        member1_uuid: validMembers[0] || null,
        member2_uuid: validMembers[1] || null,
        member3_uuid: validMembers[2] || null,
        member4_uuid: validMembers[3] || null,
        member5_uuid: validMembers[4] || null,
        member6_uuid: validMembers[5] || null,
        member7_uuid: validMembers[6] || null,
        is_active: true,
      };

      const { data, error } = await SupaBaseFunction.from("SquadMate").insert([payload]).select().single();
      if (error) throw error;

      setSquadFormMsg({ type: "success", text: `Squad "${title}" successfully created and saved to directory!` });
      setNewSquadTitle("");
      setSquadMemberAddNos(["", ""]);
      setMemberLookupMap({});

      if (data) {
        setAllSquads((prev) => [data as SquadItem, ...prev]);
        setSelectedSquadIdToAssign(data.squad_id);
      }
    } catch (err: any) {
      setSquadFormMsg({ type: "error", text: `Failed to create squad: ${err.message}` });
    } finally {
      setIsSubmittingSquad(false);
    }
  };

  // Assign Squad to Selected Programme
  const handleAssignSquadToProgramme = async () => {
    if (!selectedProgramCode) return alert("Please select a programme first.");
    if (!selectedSquadIdToAssign) return alert("Please select a squad to assign.");

    const squad = allSquads.find((s) => s.squad_id === selectedSquadIdToAssign);
    if (!squad) return alert("Squad record not found.");

    // Check if already registered
    const isAlreadyAssigned = registeredSquadGroups.some((g) => g.squadId === squad.squad_id);
    if (isAlreadyAssigned) {
      setAssignSquadMsg({ type: "error", text: `Squad "${squad.squad_title}" is already registered in this programme.` });
      return;
    }

    const memberAddNos = [
      squad.member1_uuid,
      squad.member2_uuid,
      squad.member3_uuid,
      squad.member4_uuid,
      squad.member5_uuid,
      squad.member6_uuid,
      squad.member7_uuid,
    ].filter((m): m is string => Boolean(m && m.trim()));

    if (memberAddNos.length === 0) {
      setAssignSquadMsg({ type: "error", text: "This squad has no member admission numbers." });
      return;
    }

    setIsAssigningSquad(true);
    setAssignSquadMsg(null);

    try {
      const rowsToInsert = memberAddNos.map((addNo) => ({
        Program_Code: selectedProgramCode,
        Candidate_Code: addNo,
        squad_uuid: squad.squad_id,
      }));

      const { error: insErr } = await SupaBaseFunction.from("CandidateRegistrationTable").insert(rowsToInsert);
      if (insErr) throw insErr;

      // Update total registrations in ProgrammesBox
      const newTotal = (selectedProgram?.Total_Registration || 0) + memberAddNos.length;
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgramCode);

      setAssignSquadMsg({
        type: "success",
        text: `Successfully registered Squad "${squad.squad_title}" (${memberAddNos.length} members) into ${selectedProgram?.Program_Title || selectedProgramCode}!`,
      });

      // Update local programmes state
      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgramCode ? { ...p, Total_Registration: newTotal } : p))
      );

      fetchRegistrationsForProgram();
      setActiveTab("registered");
    } catch (err: any) {
      setAssignSquadMsg({ type: "error", text: `Failed to assign squad: ${err.message}` });
    } finally {
      setIsAssigningSquad(false);
    }
  };

  // Lookup Individual Candidate
  const handleLookupIndividual = async (addNo: string) => {
    const clean = addNo.trim().toUpperCase();
    setIndividualAddNo(clean);
    setIndividualStudent(null);
    if (!clean) return;

    setIsLookingUpIndividual(true);
    try {
      const { data } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName, Stn_Class, Class, CollegeName, Student_Photo_Urls")
        .ilike("AddNo", clean)
        .maybeSingle();

      if (data) {
        setIndividualStudent({
          ...data,
          resolvedClass: resolveStudentClass(data),
        });
      }
    } finally {
      setIsLookingUpIndividual(false);
    }
  };

  // Assign Individual Candidate
  const handleAssignIndividualCandidate = async () => {
    if (!selectedProgramCode) return alert("Select a programme.");
    if (!individualStudent) return alert("Please look up a valid student.");

    const isAlreadyRegistered = registeredEntries.some((r) => r.Candidate_Code === individualStudent.AddNo);
    if (isAlreadyRegistered) {
      setIndividualMsg({ type: "error", text: `Student ${individualStudent.StudentName} is already registered.` });
      return;
    }

    setIsAssigningIndividual(true);
    setIndividualMsg(null);

    try {
      const payload = {
        Program_Code: selectedProgramCode,
        Candidate_Code: individualStudent.AddNo,
        squad_uuid: null,
      };

      const { error } = await SupaBaseFunction.from("CandidateRegistrationTable").insert([payload]);
      if (error) throw error;

      const newTotal = (selectedProgram?.Total_Registration || 0) + 1;
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgramCode);

      setIndividualMsg({
        type: "success",
        text: `Candidate ${individualStudent.StudentName} (${individualStudent.AddNo}) successfully registered!`,
      });

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgramCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setIndividualAddNo("");
      setIndividualStudent(null);
      fetchRegistrationsForProgram();
      setActiveTab("registered");
    } catch (err: any) {
      setIndividualMsg({ type: "error", text: `Registration failed: ${err.message}` });
    } finally {
      setIsAssigningIndividual(false);
    }
  };

  // Remove Entire Squad from Programme
  const handleConfirmRemoveSquad = async () => {
    if (!squadToDelete || !selectedProgramCode) return;

    setIsDeleting(true);
    try {
      const { error } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .delete()
        .eq("Program_Code", selectedProgramCode)
        .eq("squad_uuid", squadToDelete.squadId);

      if (error) throw error;

      const newTotal = Math.max(0, (selectedProgram?.Total_Registration || 0) - squadToDelete.count);
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgramCode);

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgramCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setSquadToDelete(null);
      fetchRegistrationsForProgram();
    } catch (err: any) {
      alert(`Failed to remove squad: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Remove Individual Candidate
  const handleConfirmRemoveCandidate = async () => {
    if (!candidateToDelete || !selectedProgramCode) return;

    setIsDeleting(true);
    try {
      const { error } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .delete()
        .eq("CandidateUUiD", candidateToDelete.uuid);

      if (error) throw error;

      const newTotal = Math.max(0, (selectedProgram?.Total_Registration || 0) - 1);
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgramCode);

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgramCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setCandidateToDelete(null);
      fetchRegistrationsForProgram();
    } catch (err: any) {
      alert(`Failed to remove candidate: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Registered Roster to Excel (Guarantees NO raw UUIDs)
  const handleExportRoster = () => {
    if (registeredEntries.length === 0) {
      alert("No registered entries to export for this programme.");
      return;
    }

    const rows = registeredEntries.map((r, idx) => ({
      "Sl No": idx + 1,
      "Admission No": r.Candidate_Code,
      "Student Name": r.student?.StudentName || r.Candidate_Code,
      "Class": r.student?.resolvedClass || "Standard Class",
      "College / Study Center": r.student?.CollegeName || "Campus",
      "Format": r.squad_uuid ? "Squad Member" : "Individual",
      "Squad / Group Name": r.squadTitle || "Individual Candidate",
      "Programme Code": selectedProgram?.Program_Code || selectedProgramCode,
      "Programme Title": selectedProgram?.Program_Title || "Competition Programme",
      "Wing": selectedProgram?.WingCode ? (meta.wingMap[selectedProgram.WingCode] || selectedProgram.WingCode) : "General Wing",
      "Category": meta.getCategoryName(selectedProgram?.Category, "General Category"),
      "Venue": meta.getVenueName(selectedProgram?.Venue, "Campus Facility"),
      "Event Date": selectedProgram?.Date || "TBA",
    }));

    exportToExcel(
      rows,
      `${selectedProgram?.Program_Code || "Programme"}_Roster_Export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Registered Roster"
    );
  };

  // Navigate to Result Creation / Edit (Editable by Wing & Admin Only)
  const handleNavigateToResult = () => {
    if (!selectedProgramCode) return;
    if (isAdmin && actUser) {
      navigate(`/admin-panel/${actUser}/create-result?code=${selectedProgramCode}`);
    } else if (isWing && actWing) {
      navigate(`/wing-panel/${actWing}/create-result?code=${selectedProgramCode}`);
    } else if (isController && actController) {
      navigate(`/controller/${actController}/create-result?code=${selectedProgramCode}`);
    } else {
      navigate(`/create-result?code=${selectedProgramCode}`);
    }
  };

  if (loading && programmes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Group & Programme Manager...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6 pb-20 font-sans max-w-7xl">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
              <Users size={13} />
              <span>{isAdmin ? "Admin Authority" : isWing ? "Wing Administration" : "Operations Hub"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Group & Candidate Programme Manager
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Create student squads, register groups and candidates to competition programmes, manage entries, and access official results.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportRoster}
              disabled={registeredEntries.length === 0}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-2 border border-white/15 disabled:opacity-50 cursor-pointer shadow-xs"
              title="Export roster with resolved human-readable titles (never raw UUIDs)"
            >
              <FileSpreadsheet size={15} />
              <span>Export Roster (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                fetchProgrammesAndSquads();
                fetchRegistrationsForProgram();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/15 cursor-pointer shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Programme Selection & Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Step 1</span>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              Select Target Programme
            </h2>
          </div>

          {/* Format filters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setProgramFilter("group")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                programFilter === "group" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Group Events ({programmes.filter((p) => p.is_group_program).length})
            </button>
            <button
              type="button"
              onClick={() => setProgramFilter("individual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                programFilter === "individual" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Individual Events ({programmes.filter((p) => !p.is_group_program).length})
            </button>
            <button
              type="button"
              onClick={() => setProgramFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                programFilter === "all" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({programmes.length})
            </button>
          </div>
        </div>

        {/* Dropdown & Search selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Choose Programme</label>
            <select
              value={selectedProgramCode}
              onChange={(e) => setSelectedProgramCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              {filteredProgrammes.length === 0 ? (
                <option value="">No programmes match the filter</option>
              ) : (
                filteredProgrammes.map((p) => {
                  const catName = meta.getCategoryName(p.Category, "General");
                  const status = p.IsResultPublished
                    ? "Result Published"
                    : p.IsResulted
                    ? "Result Declared"
                    : p.is_group_program
                    ? "Group Event (Pending)"
                    : "Pending";
                  return (
                    <option key={p.Program_Code} value={p.Program_Code}>
                      {catName}, {p.Program_Title || "Untitled"}, {status}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Search Programme Title/Code</label>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                placeholder="Filter dropdown..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Selected Programme Summary Strip */}
        {selectedProgram && (
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black">
                  {selectedProgram.Program_Code}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">
                  {meta.getCategoryName(selectedProgram.Category, "General Category")}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-700 text-xs font-bold">
                  {selectedProgram.WingCode ? (meta.wingMap[selectedProgram.WingCode] || selectedProgram.WingCode) : "General Wing"}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  selectedProgram.is_group_program ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {selectedProgram.is_group_program ? "👥 Squad / Group Event" : "👤 Individual Event"}
                </span>
                {selectedProgram.Expected_Time && meta.expectedTimeMap[selectedProgram.Expected_Time] && (
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1">
                    <Clock size={12} /> {meta.expectedTimeMap[selectedProgram.Expected_Time]}
                  </span>
                )}
                {selectedProgram.is_limitation && (
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border flex items-center gap-1 ${
                    registeredEntries.length >= (selectedProgram.is_group_program ? (selectedProgram.group_limit_count || 7) : (selectedProgram.individual_limit_count || 15))
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}>
                    <Users size={12} />
                    <span>
                      Limit: {registeredEntries.length} / {selectedProgram.is_group_program ? (selectedProgram.group_limit_count || 7) : (selectedProgram.individual_limit_count || 15)}
                    </span>
                  </span>
                )}
                {selectedProgram.IsResulted ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                    <CheckCircle2 size={12} /> Result Declared
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1">
                    <AlertCircle size={12} /> Points On Hold (Awaiting Result)
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-slate-900">{selectedProgram.Program_Title}</h3>

              {/* Common Assigned Topic */}
              {selectedProgram.is_topic && selectedProgram.topic_title && (
                <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl text-xs flex items-center gap-2 text-teal-900">
                  <BookOpen size={14} className="text-teal-600 shrink-0" />
                  <span><strong>Assigned Topic:</strong> "{selectedProgram.topic_title}"</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  {selectedProgram.Date ? formatResultDate(selectedProgram.Date) : "Date TBA"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  {meta.getVenueName(selectedProgram.Venue, "Campus Facility")}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-slate-400" />
                  {registeredEntries.length} Candidates Registered
                </span>
                {selectedProgram.drive_link && (
                  <a
                    href={selectedProgram.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
                  >
                    <ExternalLink size={12} />
                    <span>Study Material Drive</span>
                  </a>
                )}
              </div>
            </div>

            {/* Editable Result Action for Wing & Admin Only */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleNavigateToResult}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  selectedProgram.IsResulted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
                title="Only Wing and Admin are authorized to enter or modify competition results"
              >
                <Trophy size={15} />
                <span>{selectedProgram.IsResulted ? "Edit Official Result & Points" : "Declare Competition Result"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Hub Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/70 p-2 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("registered")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "registered"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={15} />
            <span>Registered Roster ({registeredEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignSquad")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "assignSquad"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus size={15} />
            <span>Assign Group to Programme</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("createSquad")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "createSquad"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PlusCircle size={15} />
            <span>Create New Student Squad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignIndividual")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "assignIndividual"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={15} />
            <span>Assign Individual Candidate</span>
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: REGISTERED ROSTER */}
          {activeTab === "registered" && (
            <div className="space-y-6">
              {registeredEntries.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users size={28} />
                  </div>
                  <h4 className="font-black text-slate-800 text-base">No Candidates Registered Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Assign an existing group of students or register individual candidates to this programme using the tabs above.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("assignSquad")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      Assign Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Registered Groups Section */}
                  {registeredSquadGroups.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Users size={16} className="text-purple-600" />
                          Registered Student Groups / Squads ({registeredSquadGroups.length})
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          Admin and Wing can remove entire groups if needed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {registeredSquadGroups.map((group) => (
                          <div
                            key={group.squadId}
                            className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-xs space-y-3 hover:border-purple-300 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                                  Group / Squad
                                </span>
                                <h5 className="font-black text-base text-slate-900 mt-1">{group.title}</h5>
                                <p className="text-xs text-slate-500 font-medium">
                                  {group.members.length} participating students
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setSquadToDelete({
                                    squadId: group.squadId,
                                    title: group.title,
                                    count: group.members.length,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-rose-200/60"
                                title="Remove entire group from programme"
                              >
                                <Trash2 size={13} />
                                <span>Remove Group</span>
                              </button>
                            </div>

                            {/* Teammates List */}
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              {group.members.map((member) => (
                                <div
                                  key={member.CandidateUUiD}
                                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/70 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-500">{member.Candidate_Code}</span>
                                    <span className="font-bold text-slate-800">{member.student?.StudentName}</span>
                                  </div>
                                  <span className="text-slate-500 text-[11px] font-medium">
                                    {member.student?.resolvedClass}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Individual Candidates Section */}
                  {individualCandidates.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Layers size={16} className="text-blue-600" />
                          Individual Registered Candidates ({individualCandidates.length})
                        </h4>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Admission No</th>
                              <th className="py-3 px-4">Student Name</th>
                              <th className="py-3 px-4">Class</th>
                              <th className="py-3 px-4">College</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {individualCandidates.map((entry, idx) => (
                              <tr key={entry.CandidateUUiD} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-800">{entry.Candidate_Code}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{entry.student?.StudentName}</td>
                                <td className="py-3 px-4 text-slate-600">{entry.student?.resolvedClass}</td>
                                <td className="py-3 px-4 text-slate-500">{entry.student?.CollegeName || "Campus"}</td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCandidateToDelete({
                                        uuid: entry.CandidateUUiD,
                                        addNo: entry.Candidate_Code,
                                        name: entry.student?.StudentName || entry.Candidate_Code,
                                      })
                                    }
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Remove candidate"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGN SQUAD TO PROGRAMME */}
          {activeTab === "assignSquad" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h4 className="text-base font-black text-slate-900">Assign Group of Students to Programme</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Select an existing squad from the directory to register all its teammates into{" "}
                  <strong className="text-slate-800">[{selectedProgram?.Program_Code}] {selectedProgram?.Program_Title}</strong>.
                </p>
              </div>

              {assignSquadMsg && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    assignSquadMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {assignSquadMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{assignSquadMsg.text}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Squad / Group</label>
                  <select
                    value={selectedSquadIdToAssign}
                    onChange={(e) => setSelectedSquadIdToAssign(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  >
                    <option value="">-- Choose Squad from Directory --</option>
                    {allSquads.map((sq) => {
                      const isAssigned = registeredSquadGroups.some((g) => g.squadId === sq.squad_id);
                      return (
                        <option key={sq.squad_id} value={sq.squad_id}>
                          {sq.squad_title} {isAssigned ? "(Already Registered)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Squad Teammates Preview */}
                {selectedSquadIdToAssign && (() => {
                  const sq = allSquads.find((s) => s.squad_id === selectedSquadIdToAssign);
                  if (!sq) return null;
                  const members = [
                    sq.member1_uuid,
                    sq.member2_uuid,
                    sq.member3_uuid,
                    sq.member4_uuid,
                    sq.member5_uuid,
                    sq.member6_uuid,
                    sq.member7_uuid,
                  ].filter((m): m is string => Boolean(m && m.trim()));

                  const isAlreadyAssigned = registeredSquadGroups.some((g) => g.squadId === sq.squad_id);

                  return (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-black text-slate-900">{sq.squad_title}</h5>
                          <p className="text-xs text-slate-500">{members.length} members configured</p>
                        </div>
                        {isAlreadyAssigned && (
                          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                            Already Registered
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {members.map((addNo) => (
                          <div
                            key={addNo}
                            className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-slate-200/80 text-xs font-semibold"
                          >
                            <span className="font-mono text-indigo-700">{addNo}</span>
                            <span className="text-slate-600">
                              {studentsMap[addNo]?.StudentName || "Student " + addNo}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAssignSquadToProgramme}
                        disabled={isAssigningSquad || isAlreadyAssigned}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isAssigningSquad ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        <span>Register This Group to Programme</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="pt-2 text-center">
                  <p className="text-xs text-slate-500">
                    Need a brand new group?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("createSquad")}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Create a new squad here
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE NEW SQUAD */}
          {activeTab === "createSquad" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h4 className="text-base font-black text-slate-900">Create New Student Group / Squad</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Define a new squad title and add 2 to 7 student members by their Admission Number.
                </p>
              </div>

              {squadFormMsg && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    squadFormMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {squadFormMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{squadFormMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateSquad} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Squad Title / Group Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSquadTitle}
                    onChange={(e) => setNewSquadTitle(e.target.value)}
                    placeholder="e.g. Phoenix Debaters, Alpha Quiz Masters..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Member Students (Min 2, Max 7) <span className="text-rose-500">*</span>
                    </label>
                    {squadMemberAddNos.length < 7 && (
                      <button
                        type="button"
                        onClick={handleAddMemberSlot}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle size={13} />
                        <span>Add Member Slot</span>
                      </button>
                    )}
                  </div>

                  {squadMemberAddNos.map((addNo, index) => {
                    const student = memberLookupMap[index];
                    return (
                      <div
                        key={index}
                        className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={addNo}
                            onChange={(e) => handleLookupMember(index, e.target.value)}
                            placeholder="Student Admission No (e.g. U1448)"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {squadMemberAddNos.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMemberSlot(index)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Remove slot"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>

                        {/* Instant Lookup Preview */}
                        {student ? (
                          <div className="flex items-center gap-2.5 pl-8 text-xs">
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              {student.StudentName}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{student.resolvedClass}</span>
                          </div>
                        ) : addNo.trim() ? (
                          <div className="pl-8 text-[11px] text-amber-700 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Looking up student record...
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSquad}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSquad ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={15} />}
                  <span>Save Squad to Directory</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: ASSIGN INDIVIDUAL CANDIDATE */}
          {activeTab === "assignIndividual" && (
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h4 className="text-base font-black text-slate-900">Assign Individual Candidate</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Look up a candidate by Admission Number to assign directly to{" "}
                  <strong className="text-slate-800">[{selectedProgram?.Program_Code}] {selectedProgram?.Program_Title}</strong>.
                </p>
              </div>

              {individualMsg && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    individualMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {individualMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{individualMsg.text}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Student Admission Number</label>
                  <input
                    type="text"
                    value={individualAddNo}
                    onChange={(e) => handleLookupIndividual(e.target.value)}
                    placeholder="Enter AddNo (e.g. U1448)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                {isLookingUpIndividual && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <RefreshCw size={13} className="animate-spin text-indigo-600" />
                    Looking up candidate details...
                  </p>
                )}

                {individualStudent && (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                      {individualStudent.StudentName.charAt(0)}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <h5 className="font-black text-sm text-slate-900">{individualStudent.StudentName}</h5>
                      <p className="text-xs text-slate-600 font-medium">
                        AddNo: <span className="font-mono font-bold text-indigo-700">{individualStudent.AddNo}</span> | Class: {individualStudent.resolvedClass}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAssignIndividualCandidate}
                  disabled={isAssigningIndividual || !individualStudent}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAssigningIndividual ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>Register Candidate to Programme</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Squad Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(squadToDelete)}
        title="Remove Group from Programme"
        message={`Are you sure you want to remove Group "${squadToDelete?.title}" from this programme? This will withdraw all ${squadToDelete?.count} registered teammate candidates.`}
        confirmText="Remove Group"
        isDeleting={isDeleting}
        onCancel={() => setSquadToDelete(null)}
        onConfirm={handleConfirmRemoveSquad}
      />

      {/* Delete Candidate Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(candidateToDelete)}
        title="Remove Candidate from Programme"
        message={`Are you sure you want to remove candidate ${candidateToDelete?.name} (${candidateToDelete?.addNo}) from this programme?`}
        confirmText="Remove Candidate"
        isDeleting={isDeleting}
        onCancel={() => setCandidateToDelete(null)}
        onConfirm={handleConfirmRemoveCandidate}
      />
    </div>
  );
}
