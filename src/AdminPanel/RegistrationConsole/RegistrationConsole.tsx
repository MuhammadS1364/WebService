import React, { useState, useEffect, useMemo, useCallback } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import { exportToExcel } from "../../lib/excelService";
import SafeImage from "../../lib/SafeImage";
import PrintCandidateSheetModal from "../../components/PrintCandidateSheetModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import formatResultDate from "../../PublicProgrammesComponents/DateFormatConvertor";
import {
  UserCheck,
  UserPlus,
  Users,
  Search,
  Trash2,
  Edit,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  X,
  Lock,
  Unlock,
  ShieldCheck,
  Layers,
} from "lucide-react";

interface ProgrammeRow {
  Program_Code: string;
  Program_Title: string;
  Category?: string | null;
  WingCode?: string | null;
  Date?: string | null;
  Venue?: string | null;
  Group?: string | null;
  Total_Registration?: number | null;
  is_group_program?: boolean;
  is_topic_required?: boolean;
  IsOpenRegistration?: boolean;
  IsResulted?: boolean;
}

interface RegisteredCandidate {
  CandidateUUiD: string;
  Program_Code: string;
  Candidate_Code: string;
  squad_uuid?: string | null;
  created_at?: string;
  // Hydrated student info
  studentName?: string;
  studentPhoto?: string | null;
  studentClass?: string | null;
  studentCollege?: string | null;
  squadTitle?: string | null;
  squadMembers?: { addNo: string; name: string }[];
  topicTitle?: string | null;
  isTopicApproved?: boolean;
}

interface StudentSearchResult {
  AddNo: string;
  StudentName: string;
  Stn_Class: string | null;
  CollegeName: string | null;
  Student_Photo_Urls: string | null;
}

interface SquadOption {
  squad_id: string;
  squad_title: string;
  member1_uuid?: string | null;
  member2_uuid?: string | null;
  member3_uuid?: string | null;
  member4_uuid?: string | null;
  member5_uuid?: string | null;
  member6_uuid?: string | null;
  member7_uuid?: string | null;
  memberNames?: string[];
}

export default function RegistrationConsole() {
  const meta = useProgrammeMeta();

  // Core Data
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [selectedProgCode, setSelectedProgCode] = useState<string>("");
  const [candidates, setCandidates] = useState<RegisteredCandidate[]>([]);
  const [_loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter programmes list
  const [progSearch, setProgSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "group">("all");
  const [wingFilter, setWingFilter] = useState("all");

  // Filter within candidate table
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidateUuids, setSelectedCandidateUuids] = useState<Set<string>>(new Set());

  // Add Candidate (Individual) State
  const [inputAddNo, setInputAddNo] = useState("");
  const [verifiedStudent, setVerifiedStudent] = useState<StudentSearchResult | null>(null);
  const [studentSuggestions, setStudentSuggestions] = useState<StudentSearchResult[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ type: "success" | "error" | "warning" | ""; text: string }>({
    type: "",
    text: "",
  });

  // Add Squad (Group) State
  const [availableSquads, setAvailableSquads] = useState<SquadOption[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState("");
  const [isSubmittingSquad, setIsSubmittingSquad] = useState(false);

  // Edit Candidate Modal
  const [editModalCandidate, setEditModalCandidate] = useState<RegisteredCandidate | null>(null);
  const [editSwapAddNo, setEditSwapAddNo] = useState("");
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [editTopicApproved, setEditTopicApproved] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modals
  const [candidateToDelete, setCandidateToDelete] = useState<RegisteredCandidate | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Print Sheet Modal
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // 1. Load All Programmes & Squads
  const loadProgrammes = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [progsRes, squadsRes] = await Promise.all([
        SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Program_Title, Category, WingCode, Date, Venue, Group, Total_Registration, is_group_program, is_topic_required, IsOpenRegistration, IsResulted")
          .order("Program_Code", { ascending: true }),
        SupaBaseFunction
          .from("SquadMate")
          .select("squad_id, squad_title, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
          .order("squad_title", { ascending: true }),
      ]);

      const progs = (progsRes.data || []) as ProgrammeRow[];
      setProgrammes(progs);

      const squads = (squadsRes.data || []) as SquadOption[];
      setAvailableSquads(squads);

      // Auto-select first programme if none selected
      if (!selectedProgCode && progs.length > 0) {
        setSelectedProgCode(progs[0].Program_Code);
      }
    } catch (err: any) {
      console.error("Error loading registration console programmes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProgCode]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  // Selected Programme Record
  const currentProg = useMemo(() => {
    return programmes.find((p) => p.Program_Code === selectedProgCode) || null;
  }, [programmes, selectedProgCode]);

  // 2. Load Candidates for the selected programme
  const loadCandidates = useCallback(async (progCode: string) => {
    if (!progCode) {
      setCandidates([]);
      setSelectedCandidateUuids(new Set());
      return;
    }

    setLoadingCandidates(true);
    setSelectedCandidateUuids(new Set());

    try {
      const { data: regRows, error: regErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("*")
        .eq("Program_Code", progCode);

      if (regErr) throw regErr;
      const rawRegs = (regRows as RegisteredCandidate[]) || [];

      // Collect AddNos
      const addNos = Array.from(new Set(rawRegs.map((r) => r.Candidate_Code).filter(Boolean)));
      let studentMap: Record<string, StudentSearchResult> = {};

      if (addNos.length > 0) {
        const { data: stnRows } = await SupaBaseFunction
          .from("StudentsBox")
          .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
          .in("AddNo", addNos);

        (stnRows || []).forEach((s: any) => {
          studentMap[s.AddNo] = s;
        });
      }

      // Collect Squads
      const squadIds = Array.from(new Set(rawRegs.map((r) => r.squad_uuid).filter(Boolean))) as string[];
      let squadMap: Record<string, { title: string; members: { addNo: string; name: string }[] }> = {};

      if (squadIds.length > 0) {
        const { data: sqRows } = await SupaBaseFunction
          .from("SquadMate")
          .select("squad_id, squad_title, member1_uuid, member2_uuid, member3_uuid, member4_uuid, member5_uuid, member6_uuid, member7_uuid")
          .in("squad_id", squadIds);

        const memberCodes: string[] = [];
        (sqRows || []).forEach((sq: any) => {
          [
            sq.member1_uuid,
            sq.member2_uuid,
            sq.member3_uuid,
            sq.member4_uuid,
            sq.member5_uuid,
            sq.member6_uuid,
            sq.member7_uuid,
          ]
            .filter(Boolean)
            .forEach((m) => memberCodes.push(String(m).trim()));
        });

        let memberNamesMap: Record<string, string> = {};
        if (memberCodes.length > 0) {
          const { data: mRows } = await SupaBaseFunction
            .from("StudentsBox")
            .select("AddNo, StudentName")
            .in("AddNo", Array.from(new Set(memberCodes)));

          (mRows || []).forEach((s: any) => {
            memberNamesMap[s.AddNo] = s.StudentName || s.AddNo;
          });
        }

        (sqRows || []).forEach((sq: any) => {
          const members = [
            sq.member1_uuid,
            sq.member2_uuid,
            sq.member3_uuid,
            sq.member4_uuid,
            sq.member5_uuid,
            sq.member6_uuid,
            sq.member7_uuid,
          ]
            .filter(Boolean)
            .map((m: string) => ({
              addNo: m,
              name: memberNamesMap[m] || m,
            }));

          squadMap[sq.squad_id] = {
            title: sq.squad_title || "Squad",
            members,
          };
        });
      }

      // Collect Topics
      let topicsMap: Record<string, { title: string; is_approved: boolean }> = {};
      if (addNos.length > 0) {
        const { data: tRows } = await SupaBaseFunction
          .from("Topics_Box")
          .select("student_addNo, topic_title, is_approved")
          .eq("program_code", progCode)
          .in("student_addNo", addNos);

        (tRows || []).forEach((t: any) => {
          if (t.student_addNo) {
            topicsMap[t.student_addNo] = {
              title: t.topic_title,
              is_approved: Boolean(t.is_approved),
            };
          }
        });
      }

      // Hydrate candidate records
      const hydrated: RegisteredCandidate[] = rawRegs.map((r) => {
        const stn = studentMap[r.Candidate_Code];
        const sq = r.squad_uuid ? squadMap[r.squad_uuid] : undefined;
        const topic = topicsMap[r.Candidate_Code];

        const rawClass = stn?.Stn_Class;
        const matchedClass = meta.classes?.find(
          (c) => c.class_id === rawClass || c.standard_name === rawClass || c.class_nick_name === rawClass
        );
        const resolvedClass = matchedClass
          ? matchedClass.standard_name || matchedClass.class_nick_name
          : rawClass || null;

        return {
          ...r,
          studentName: stn?.StudentName || (sq ? sq.title : r.Candidate_Code),
          studentPhoto: stn?.Student_Photo_Urls || null,
          studentClass: resolvedClass,
          studentCollege: stn?.CollegeName || null,
          squadTitle: sq?.title || null,
          squadMembers: sq?.members,
          topicTitle: topic?.title || null,
          isTopicApproved: topic?.is_approved,
        };
      });

      setCandidates(hydrated);
    } catch (err: any) {
      console.error("Error loading candidates for program:", err);
    } finally {
      setLoadingCandidates(false);
    }
  }, [meta.classes]);

  useEffect(() => {
    if (selectedProgCode) {
      loadCandidates(selectedProgCode);
      setVerifiedStudent(null);
      setInputAddNo("");
      setAddFeedback({ type: "", text: "" });
    }
  }, [selectedProgCode, loadCandidates]);

  // 3. Search & Lookup Student by AddNo or Name for adding individual candidate
  const handleStudentLookup = async (term: string) => {
    setInputAddNo(term);
    if (!term || term.trim().length < 2) {
      setStudentSuggestions([]);
      setVerifiedStudent(null);
      return;
    }

    setIsLookingUp(true);
    try {
      const clean = term.trim();
      const { data, error } = await SupaBaseFunction
        .from("StudentsBox")
        .select("AddNo, StudentName, Stn_Class, CollegeName, Student_Photo_Urls")
        .or(`AddNo.ilike.%${clean}%,StudentName.ilike.%${clean}%`)
        .limit(6);

      if (error) throw error;
      setStudentSuggestions(data || []);

      const exact = (data || []).find(
        (s) => s.AddNo.toLowerCase() === clean.toLowerCase() || s.StudentName.toLowerCase() === clean.toLowerCase()
      );
      if (exact) {
        setVerifiedStudent(exact);
      }
    } catch (err) {
      console.error("Student lookup error:", err);
    } finally {
      setIsLookingUp(false);
    }
  };

  const selectStudentSuggestion = (stn: StudentSearchResult) => {
    setVerifiedStudent(stn);
    setInputAddNo(stn.AddNo);
    setStudentSuggestions([]);
  };

  // 4. Add Candidate to Programme
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgCode || !verifiedStudent) {
      setAddFeedback({ type: "error", text: "Please select a valid verified student." });
      return;
    }

    const candidateAddNo = verifiedStudent.AddNo.trim();

    // Duplicate check
    const isAlreadyRegistered = candidates.some(
      (c) => c.Candidate_Code?.toLowerCase() === candidateAddNo.toLowerCase()
    );
    if (isAlreadyRegistered) {
      setAddFeedback({
        type: "error",
        text: `Candidate ${verifiedStudent.StudentName} (${candidateAddNo}) is already registered for #${selectedProgCode}.`,
      });
      return;
    }

    try {
      setIsSubmittingAdd(true);
      setAddFeedback({ type: "", text: "" });

      // Insert into CandidateRegistrationTable
      const { error: regErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert([
          {
            Program_Code: selectedProgCode,
            Candidate_Code: candidateAddNo,
            squad_uuid: null,
          },
        ]);

      if (regErr) throw regErr;

      // If topic provided or required, insert into Topics_Box
      if (topicInput.trim()) {
        await SupaBaseFunction.from("Topics_Box").insert([
          {
            program_code: selectedProgCode,
            student_addNo: candidateAddNo,
            topic_title: topicInput.trim(),
            is_approved: true,
          },
        ]);
      }

      // Increment Total_Registration count in ProgrammesBox
      const newTotal = candidates.length + 1;
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgCode);

      // Update local state
      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setAddFeedback({
        type: "success",
        text: `Candidate ${verifiedStudent.StudentName} (${candidateAddNo}) successfully registered!`,
      });

      setVerifiedStudent(null);
      setInputAddNo("");
      setTopicInput("");
      setStudentSuggestions([]);

      // Reload candidates list
      await loadCandidates(selectedProgCode);
    } catch (err: any) {
      console.error("Failed to add candidate:", err);
      setAddFeedback({ type: "error", text: "Error: " + (err.message || "Failed to register candidate") });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // 5. Add Squad / Group to Programme
  const handleAddSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgCode || !selectedSquadId) {
      setAddFeedback({ type: "error", text: "Please select a squad from the list." });
      return;
    }

    const squad = availableSquads.find((s) => s.squad_id === selectedSquadId);
    if (!squad) return;

    // Duplicate check
    const isAlreadyReg = candidates.some((c) => c.squad_uuid === selectedSquadId);
    if (isAlreadyReg) {
      setAddFeedback({
        type: "error",
        text: `Squad "${squad.squad_title}" is already registered for #${selectedProgCode}.`,
      });
      return;
    }

    try {
      setIsSubmittingSquad(true);
      setAddFeedback({ type: "", text: "" });

      // Determine leader / representative code
      const leaderAddNo = squad.member1_uuid || "SQUAD";

      const { error: insErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .insert([
          {
            Program_Code: selectedProgCode,
            Candidate_Code: leaderAddNo,
            squad_uuid: selectedSquadId,
          },
        ]);

      if (insErr) throw insErr;

      // Increment Total_Registration
      const newTotal = candidates.length + 1;
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgCode);

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setAddFeedback({
        type: "success",
        text: `Squad "${squad.squad_title}" successfully registered!`,
      });

      setSelectedSquadId("");
      await loadCandidates(selectedProgCode);
    } catch (err: any) {
      console.error("Failed to add squad:", err);
      setAddFeedback({ type: "error", text: "Error: " + (err.message || "Failed to register squad") });
    } finally {
      setIsSubmittingSquad(false);
    }
  };

  // 6. Delete Candidate Registration (Single)
  const handleDeleteSingleCandidate = async () => {
    if (!candidateToDelete || !selectedProgCode) return;

    try {
      setIsDeletingSingle(true);

      // 1. Delete from CandidateRegistrationTable
      const { error: delErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .delete()
        .eq("CandidateUUiD", candidateToDelete.CandidateUUiD);

      if (delErr) throw delErr;

      // 2. Delete topic if any
      await SupaBaseFunction
        .from("Topics_Box")
        .delete()
        .eq("program_code", selectedProgCode)
        .eq("student_addNo", candidateToDelete.Candidate_Code);

      // 3. Decrement Total_Registration
      const newTotal = Math.max(0, candidates.length - 1);
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgCode);

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setCandidateToDelete(null);
      await loadCandidates(selectedProgCode);
    } catch (err: any) {
      console.error("Error deleting candidate registration:", err);
      alert("Failed to delete candidate: " + err.message);
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // 7. Bulk Delete Candidates
  const handleBulkDelete = async () => {
    if (selectedCandidateUuids.size === 0 || !selectedProgCode) return;

    try {
      setIsDeletingBulk(true);
      const uuidList = Array.from(selectedCandidateUuids);

      const { error: delErr } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .delete()
        .in("CandidateUUiD", uuidList);

      if (delErr) throw delErr;

      const newTotal = Math.max(0, candidates.length - uuidList.length);
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ Total_Registration: newTotal })
        .eq("Program_Code", selectedProgCode);

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === selectedProgCode ? { ...p, Total_Registration: newTotal } : p))
      );

      setIsBulkDeleteOpen(false);
      setSelectedCandidateUuids(new Set());
      await loadCandidates(selectedProgCode);
    } catch (err: any) {
      console.error("Failed bulk candidate delete:", err);
      alert("Failed to delete selected candidates: " + err.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // 8. Edit / Swap Candidate or Update Topic
  const handleSaveEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalCandidate || !selectedProgCode) return;

    try {
      setIsSavingEdit(true);

      const targetAddNo = (editSwapAddNo || editModalCandidate.Candidate_Code).trim();

      // If AddNo changed, update CandidateRegistrationTable
      if (targetAddNo !== editModalCandidate.Candidate_Code) {
        const { error: updErr } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .update({ Candidate_Code: targetAddNo })
          .eq("CandidateUUiD", editModalCandidate.CandidateUUiD);

        if (updErr) throw updErr;
      }

      // Upsert Topics_Box
      if (editTopicTitle.trim()) {
        const { data: existingTopic } = await SupaBaseFunction
          .from("Topics_Box")
          .select("id")
          .eq("program_code", selectedProgCode)
          .eq("student_addNo", targetAddNo)
          .maybeSingle();

        if (existingTopic?.id) {
          await SupaBaseFunction
            .from("Topics_Box")
            .update({ topic_title: editTopicTitle.trim(), is_approved: editTopicApproved })
            .eq("id", existingTopic.id);
        } else {
          await SupaBaseFunction.from("Topics_Box").insert([
            {
              program_code: selectedProgCode,
              student_addNo: targetAddNo,
              topic_title: editTopicTitle.trim(),
              is_approved: editTopicApproved,
            },
          ]);
        }
      }

      setEditModalCandidate(null);
      await loadCandidates(selectedProgCode);
    } catch (err: any) {
      console.error("Failed to edit candidate:", err);
      alert("Failed to update candidate: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 9. Toggle Registration Open / Closed
  const handleToggleRegistrationStatus = async () => {
    if (!currentProg) return;
    const newStatus = !currentProg.IsOpenRegistration;

    try {
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ IsOpenRegistration: newStatus })
        .eq("Program_Code", currentProg.Program_Code);

      setProgrammes((prev) =>
        prev.map((p) => (p.Program_Code === currentProg.Program_Code ? { ...p, IsOpenRegistration: newStatus } : p))
      );
    } catch (err: any) {
      console.error("Failed to toggle registration status:", err);
    }
  };

  // 10. Export to Excel
  const handleExportExcel = () => {
    if (!currentProg || candidates.length === 0) return;

    const exportRows = candidates.map((c, idx) => ({
      "SL No": idx + 1,
      "Programme Code": currentProg.Program_Code,
      "Programme Title": currentProg.Program_Title,
      "Candidate Code / Roll": c.Candidate_Code,
      "Candidate Name": c.studentName || c.Candidate_Code,
      "Class / Nickname": c.studentClass || "Standard Class",
      College: c.studentCollege || "Darul Huda Islamic University",
      "Squad / Group": c.squadTitle || "N/A",
      "Topic Title": c.topicTitle || "N/A",
      "Topic Approved": c.isTopicApproved ? "Approved" : "Pending",
    }));

    exportToExcel(exportRows, `Candidate_Registrations_${currentProg.Program_Code}`);
  };

  // Filtered Candidates inside table
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const q = candidateSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        c.Candidate_Code.toLowerCase().includes(q) ||
        c.studentName?.toLowerCase().includes(q) ||
        c.studentClass?.toLowerCase().includes(q) ||
        c.squadTitle?.toLowerCase().includes(q) ||
        c.topicTitle?.toLowerCase().includes(q)
      );
    });
  }, [candidates, candidateSearch]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedCandidateUuids.size === filteredCandidates.length) {
      setSelectedCandidateUuids(new Set());
    } else {
      setSelectedCandidateUuids(new Set(filteredCandidates.map((c) => c.CandidateUUiD)));
    }
  };

  const handleToggleSelectCandidate = (uuid: string) => {
    setSelectedCandidateUuids((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  // Filtered Programmes list for left selector
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const q = progSearch.toLowerCase().trim();
      if (q) {
        const matchesCode = p.Program_Code.toLowerCase().includes(q);
        const matchesTitle = p.Program_Title?.toLowerCase().includes(q);
        const matchesWing = p.WingCode?.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesWing) return false;
      }

      if (typeFilter === "individual" && p.is_group_program) return false;
      if (typeFilter === "group" && !p.is_group_program) return false;
      if (wingFilter !== "all" && p.WingCode !== wingFilter) return false;

      return true;
    });
  }, [programmes, progSearch, typeFilter, wingFilter]);

  const uniqueWings = Array.from(new Set(programmes.map((p) => p.WingCode).filter(Boolean))) as string[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold mb-2.5">
            <ShieldCheck size={14} className="text-teal-400" />
            <span>Admin Authority • Candidate Registration Console (Reg-Console)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
            <UserCheck className="w-8 h-8 text-teal-400" />
            <span>Reg-Console: Candidate Management</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl">
            Complete registration control center: add individual candidates or squads, swap students, edit topic approvals, and bulk-manage enrolments across all programmes.
          </p>
        </div>

        {currentProg && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleRegistrationStatus}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer ${
                currentProg.IsOpenRegistration
                  ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-rose-500/20 border border-rose-400/30 text-rose-300 hover:bg-rose-500/30"
              }`}
            >
              {currentProg.IsOpenRegistration ? <Unlock size={14} /> : <Lock size={14} />}
              <span>{currentProg.IsOpenRegistration ? "Registration: OPEN" : "Registration: CLOSED"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintSheetOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Export Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* WORKSPACE LAYOUT: LEFT SIDEBAR SELECTOR + RIGHT CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PROGRAMMES SELECTOR (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers size={14} className="text-teal-600" />
                <span>Select Programme ({filteredProgrammes.length})</span>
              </span>
              <button
                type="button"
                onClick={() => loadProgrammes(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
                title="Refresh Programmes"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={progSearch}
                  onChange={(e) => setProgSearch(e.target.value)}
                  placeholder="Search code, title, wing..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={typeFilter}
                  onChange={(e: any) => setTypeFilter(e.target.value)}
                  className="p-1.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="all">All Types</option>
                  <option value="individual">Individual</option>
                  <option value="group">Group / Squad</option>
                </select>

                <select
                  value={wingFilter}
                  onChange={(e) => setWingFilter(e.target.value)}
                  className="p-1.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="all">All Wings</option>
                  {uniqueWings.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PROGRAMMES LIST */}
            <div className="max-h-[550px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {filteredProgrammes.map((p) => {
                const isSelected = p.Program_Code === selectedProgCode;
                return (
                  <button
                    key={p.Program_Code}
                    type="button"
                    onClick={() => setSelectedProgCode(p.Program_Code)}
                    className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-teal-50/90 border-teal-500 shadow-xs"
                        : "bg-white border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-teal-700 text-[10px]">#{p.Program_Code}</span>
                        {p.is_group_program ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-purple-100 text-purple-800">
                            GROUP
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-blue-100 text-blue-800">
                            INDIV
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 text-xs truncate mt-0.5">{p.Program_Title}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Wing: {p.WingCode || "General"}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 block">
                        {p.Total_Registration || 0}
                      </span>
                      <span className="text-[9px] text-slate-400">Enrolled</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE PROGRAMME REGISTRATION WORKSPACE (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {currentProg ? (
            <>
              {/* SELECTED PROGRAMME DETAIL BANNER */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-teal-600 text-xs block">#{currentProg.Program_Code}</span>
                    <h2 className="text-xl font-black text-slate-900">{currentProg.Program_Title}</h2>
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Wing: <strong>{currentProg.WingCode || "Wing"}</strong></span>
                      <span>•</span>
                      <span>Category: <strong>{currentProg.Category || "General"}</strong></span>
                      <span>•</span>
                      <span>{formatResultDate(currentProg.Date)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                        currentProg.is_group_program
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {currentProg.is_group_program ? "👥 Group / Squad Event" : "👤 Individual Event"}
                    </span>

                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-800 border border-teal-200">
                      <Users size={13} className="text-teal-600" />
                      <span>{candidates.length} Registered</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ADD CANDIDATE / SQUAD FORM CARD */}
              <div className="bg-white rounded-3xl border border-teal-200/90 p-5 shadow-xs space-y-4 bg-gradient-to-br from-white via-teal-50/20 to-white">
                <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <UserPlus size={16} className="text-teal-600" />
                    <span>
                      {currentProg.is_group_program
                        ? "Register Squad / Group to Event"
                        : "Register Candidate to Event"}
                    </span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {currentProg.is_group_program ? "Group Mode" : "Direct AddNo Search"}
                  </span>
                </div>

                {/* FEEDBACK ALERT */}
                {addFeedback.text && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                      addFeedback.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <span>{addFeedback.text}</span>
                    <button type="button" onClick={() => setAddFeedback({ type: "", text: "" })}>
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* INDIVIDUAL FORM */}
                {!currentProg.is_group_program ? (
                  <form onSubmit={handleAddCandidate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      {/* Search Student */}
                      <div className="sm:col-span-2 relative">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Search Student by AddNo or Name
                        </label>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={inputAddNo}
                            onChange={(e) => handleStudentLookup(e.target.value)}
                            placeholder="Type AddNo (e.g. U1364) or Name..."
                            className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                          />
                          {isLookingUp && (
                            <RefreshCw size={13} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          )}
                        </div>

                        {/* Suggestions Dropdown */}
                        {studentSuggestions.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100">
                            {studentSuggestions.map((stn) => (
                              <button
                                key={stn.AddNo}
                                type="button"
                                onClick={() => selectStudentSuggestion(stn)}
                                className="w-full p-2.5 text-left hover:bg-slate-50 transition flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">{stn.StudentName}</span>
                                  <span className="font-mono text-teal-600 ml-1.5 font-bold">#{stn.AddNo}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{stn.CollegeName || "Campus"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Topic Input if applicable */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Assigned Topic Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          placeholder="Topic / Presentation title..."
                          className="w-full p-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>

                    {/* Verified Student Preview Card */}
                    {verifiedStudent && (
                      <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-teal-200 shrink-0">
                            <SafeImage
                              src={verifiedStudent.Student_Photo_Urls}
                              alt={verifiedStudent.StudentName}
                              fallbackCategory="student"
                              fallbackText={verifiedStudent.StudentName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {verifiedStudent.StudentName}
                            </span>
                            <span className="font-mono text-xs font-bold text-teal-700">
                              #{verifiedStudent.AddNo} | {verifiedStudent.CollegeName || "Darul Huda"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingAdd}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <UserPlus size={14} />
                          <span>{isSubmittingAdd ? "Enrolling..." : "Register Candidate"}</span>
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                  /* GROUP / SQUAD FORM */
                  <form onSubmit={handleAddSquad} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Choose Squad from Master SquadMate Registry
                        </label>
                        <select
                          value={selectedSquadId}
                          onChange={(e) => setSelectedSquadId(e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                        >
                          <option value="">-- Select Squad to Register --</option>
                          {availableSquads.map((sq) => {
                            const isAlready = candidates.some((c) => c.squad_uuid === sq.squad_id);
                            return (
                              <option key={sq.squad_id} value={sq.squad_id} disabled={isAlready}>
                                👥 {sq.squad_title} {isAlready ? " (Already Enrolled)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <button
                          type="submit"
                          disabled={!selectedSquadId || isSubmittingSquad}
                          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Users size={14} />
                          <span>{isSubmittingSquad ? "Registering..." : "Register Squad"}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* REGISTERED CANDIDATES TABLE & MANAGEMENT */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Enrolled Candidates / Squads ({filteredCandidates.length})
                    </h3>
                    <p className="text-slate-400 text-xs">
                      Manage participants, swap student AddNos, or delete registrations with ease.
                    </p>
                  </div>

                  {/* BULK ACTIONS & SEARCH */}
                  <div className="flex items-center gap-2">
                    {selectedCandidateUuids.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsBulkDeleteOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Delete Selected ({selectedCandidateUuids.size})</span>
                      </button>
                    )}

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        placeholder="Search candidate..."
                        className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 w-44"
                      />
                    </div>
                  </div>
                </div>

                {/* TABLE */}
                {loadingCandidates ? (
                  <div className="p-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold">Loading registered candidates...</p>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
                    <Users size={32} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-600">No candidates enrolled yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the search box above to enroll students or squads.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedCandidateUuids.size > 0 && selectedCandidateUuids.size === filteredCandidates.length}
                              onChange={handleToggleSelectAll}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </th>
                          <th className="py-2.5 px-3">Candidate / Squad Details</th>
                          <th className="py-2.5 px-3">Class / College</th>
                          <th className="py-2.5 px-3">Topic Title</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCandidates.map((c) => {
                          const isSelected = selectedCandidateUuids.has(c.CandidateUUiD);

                          return (
                            <tr key={c.CandidateUUiD} className={`hover:bg-slate-50/60 transition ${isSelected ? "bg-teal-50/40" : ""}`}>
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectCandidate(c.CandidateUUiD)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  {c.squadTitle ? (
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 font-bold flex items-center justify-center border border-purple-200">
                                      👥
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                      <SafeImage
                                        src={c.studentPhoto}
                                        alt={c.studentName}
                                        fallbackCategory="student"
                                        fallbackText={c.studentName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 block truncate">
                                      {c.studentName}
                                    </span>
                                    <span className="font-mono text-[10px] text-teal-700 font-bold">
                                      {c.squadTitle ? `Group: ${c.squadTitle}` : `#${c.Candidate_Code}`}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className="text-slate-800 font-semibold block">{c.studentClass || "Standard Class"}</span>
                                <span className="text-[10px] text-slate-400 block">{c.studentCollege || "Campus"}</span>
                              </td>

                              <td className="py-3 px-3 max-w-xs truncate">
                                {c.topicTitle ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-slate-800 font-medium">{c.topicTitle}</span>
                                    {c.isTopicApproved ? (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-100 text-emerald-800">
                                        Approved
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-800">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">No topic submitted</span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditModalCandidate(c);
                                      setEditSwapAddNo(c.Candidate_Code);
                                      setEditTopicTitle(c.topicTitle || "");
                                      setEditTopicApproved(Boolean(c.isTopicApproved));
                                    }}
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                                    title="Edit Candidate / Swap Student"
                                  >
                                    <Edit size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setCandidateToDelete(c)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                                    title="Delete Registration"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
              <UserCheck size={40} className="text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">Please choose a programme</h3>
              <p className="text-xs text-slate-400 mt-1">Select any programme on the left to inspect or control registrations.</p>
            </div>
          )}
        </div>
      </div>

      {/* EDIT / SWAP CANDIDATE MODAL */}
      {editModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit size={16} className="text-indigo-600" />
                <span>Edit Candidate Registration</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalCandidate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCandidate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Candidate Admission Number (AddNo)
                </label>
                <input
                  type="text"
                  value={editSwapAddNo}
                  onChange={(e) => setEditSwapAddNo(e.target.value)}
                  placeholder="e.g. U1364"
                  className="w-full p-2.5 text-xs sm:text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Change AddNo to swap this registration to another student.
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  value={editTopicTitle}
                  onChange={(e) => setEditTopicTitle(e.target.value)}
                  placeholder="Enter presentation or debate topic title..."
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="topicApproved"
                  checked={editTopicApproved}
                  onChange={(e) => setEditTopicApproved(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="topicApproved" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mark Topic as Officially Approved
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalCandidate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM SINGLE DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(candidateToDelete)}
        title="Delete Candidate Registration"
        message={`Are you sure you want to remove "${candidateToDelete?.studentName || candidateToDelete?.Candidate_Code}" from #${selectedProgCode}? This candidate will be unenrolled.`}
        confirmText="Yes, Unenroll"
        cancelText="Cancel"
        isDeleting={isDeletingSingle}
        onConfirm={handleDeleteSingleCandidate}
        onCancel={() => setCandidateToDelete(null)}
      />

      {/* CONFIRM BULK DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteOpen}
        title="Delete Multiple Registrations"
        message={`Are you sure you want to delete ${selectedCandidateUuids.size} selected candidate registrations from #${selectedProgCode}? This action cannot be undone.`}
        confirmText={`Delete ${selectedCandidateUuids.size} Candidates`}
        cancelText="Cancel"
        isDeleting={isDeletingBulk}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />

      {/* PRINT SHEET MODAL */}
      {currentProg && (
        <PrintCandidateSheetModal
          isOpen={isPrintSheetOpen}
          onClose={() => setIsPrintSheetOpen(false)}
          programCode={currentProg.Program_Code}
          initialProgramTitle={currentProg.Program_Title}
        />
      )}
    </div>
  );
}
