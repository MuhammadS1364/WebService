import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SupaBaseFunction } from "../../src/lib/SupaBase";

// Define the blueprint for individual holders
interface HolderState {
  addNo: string;
  name: string;
}

// Define the blueprint for the entire holders object
interface Holders {
  first: HolderState;
  second: HolderState;
  third: HolderState;
  aGrade: HolderState;
  bGrade: HolderState;
}

// Define data shapes for your fetched items
interface Programme {
  Program_Code: string;
  Program_Title?: string;
}

interface Participant {
  Candidate_Code?: string;
  CandidateUUiD?: string;
}

interface StatusMsg {
  type: string;
  text: string;
}

// Abstracted for clean state resets, strictly typed
const INITIAL_HOLDERS: Holders = {
  first: { addNo: "", name: "" },
  second: { addNo: "", name: "" },
  third: { addNo: "", name: "" },
  aGrade: { addNo: "", name: "" },
  bGrade: { addNo: "", name: "" },
};

export default function CreateResult() {
  const { actWing } = useParams<{ actWing: string }>();

  // State variables
  const [WingCode, setWingCode] = useState<string>("");
  const [wingTitle, setWingTitle] = useState<string>("");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  
  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState<boolean>(false);
  
  // Holder States
  const [holders, setHolders] = useState<Holders>(INITIAL_HOLDERS);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg>({ type: "", text: "" });

  // 1. Fetch Wing Code
  useEffect(() => {
    async function fetchWingData() {
      if (!actWing) return;
      try {
        const { data: WCode, error } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, WingEmail, WingTitle")
          .eq("WingEmail", actWing)
          .maybeSingle();

        if (!error && WCode) {
          setWingCode(WCode.WingCode);
          setWingTitle(WCode.WingTitle);
        }
      } catch (err) {
        console.error("Error fetching wing data:", err);
      }
    }
    fetchWingData();
  }, [actWing]);

  // 2. Fetch unresulted programmes
  useEffect(() => {
    async function fetchProgrammes() {
      if (!WingCode) return;
      try {
        const { data, error } = await SupaBaseFunction
          .from("ProgrammesBox") // <- Check Table Name
          .select("Program_Code, Program_Title") // <- Check Column Names
          .eq("WingCode", WingCode) // <- Change "WingCode" if needed (e.g., to "WingCode")
          .eq("IsResulted", false); // <- Check Column Name

        if (error) {
          console.error("Supabase Error Details:", error.message); 
          return; // Add this log to catch future DB errors easily
        }
        
        if (data) setProgrammes(data);
      } catch (err) {
        console.error("Error fetching programmes:", err);
      }
    }
    fetchProgrammes();
  }, [WingCode]);

  // 3. Fetch participants
  useEffect(() => {
    async function fetchParticipants() {
      if (!selectedProgram) {
        setParticipants([]);
        return;
      }
      setLoadingParticipants(true);
      try {
        const { data, error } = await SupaBaseFunction
          .from("CandidateRegistrationTable")
          .select("Candidate_Code, CandidateUUiD")
          .eq("Program_Code", selectedProgram);

        if (!error && data) {
          setParticipants(data);
        }
      } catch (err) {
        console.error("Error fetching participants:", err);
      } finally {
        setLoadingParticipants(false);
      }
    }
    fetchParticipants();
  }, [selectedProgram]);

  // 4. Real-time name lookup (with Race Condition Protection)
  // role is strongly typed to match the exact keys of Holders
  const handleAddNoChange = async (role: keyof Holders, addNo: string) => {
    // Optimistic UI Update
    setHolders(prev => ({
      ...prev,
      [role]: { ...prev[role], addNo: addNo, name: addNo ? "Searching..." : "" }
    }));

    if (!addNo) return;

    try {
      const { data, error } = await SupaBaseFunction
        .from("StudentsBox")
        .select("Student_Name")
        .eq("AddNo", addNo)
        .single();

      // Guard against race conditions (if user typed a new number before this resolved)
      setHolders(prev => {
        if (prev[role].addNo !== addNo) return prev; 
        return {
          ...prev,
          [role]: { ...prev[role], name: (!error && data) ? data.Student_Name : "⚠️ Student Not Found" }
        };
      });
    } catch {
      setHolders(prev => {
        if (prev[role].addNo !== addNo) return prev;
        return { ...prev, [role]: { ...prev[role], name: "⚠️ Student Not Found" } };
      });
    }
  };

  // 5. Complete database pipeline
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProgram) return alert("Please select a programme");
    
    setLoading(true);
    setStatusMsg({ type: "", text: "" });

    try {
      // Step A: Insert into ResultBox
      const { error: insertError } = await SupaBaseFunction
        .from("ResultBox")
        .insert([{
          Program_Id: selectedProgram,
          First_Holder: holders.first.addNo || null,
          Second_Holder: holders.second.addNo || null,
          Third_Holder: holders.third.addNo || null,
          AGrade: holders.aGrade.addNo || null, // Changed from "No Grade" to null for DB consistency
          BGrade: holders.bGrade.addNo || null,
          creaded_At: new Date().toISOString() // Note: Double-check if your DB column is actually spelled 'creaded_At'
        }]);

      if (insertError) throw insertError;

      // Step B: Set up point tracking allocations
      const pointSchema = [
        { addNo: holders.first.addNo, name: holders.first.name, points: 7 },
        { addNo: holders.second.addNo, name: holders.second.name, points: 5 },
        { addNo: holders.third.addNo, name: holders.third.name, points: 3 },
        { addNo: holders.aGrade.addNo, name: holders.aGrade.name, points: 0 },
        { addNo: holders.bGrade.addNo, name: holders.bGrade.name, points: 0 }
      ];

      // Step C: Safely update student points
      for (const holder of pointSchema) {
        // Validate that an AddNo exists AND the auto-resolver didn't flag it as Not Found
        if (holder.addNo && !holder.name.includes("⚠️")) {
          const { data: student } = await SupaBaseFunction
            .from("StudentsBox")
            .select("Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
            .eq("AddNo", holder.addNo)
            .single();

          if (student) {
            await SupaBaseFunction
              .from("StudentsBox")
              .update({
                Resluted_Count: (student.Resluted_Count || 0) + 1, // Note: Typo matching your schema
                Total_Point_Anjuman: (student.Total_Point_Anjuman || 0) + holder.points,
                Grand_Total_Points: (student.Grand_Total_Points || 0) + holder.points
              })
              .eq("AddNo", holder.addNo);
          }
        }
      }

      // Step D: Mark program as completed
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ IsResulted: true })
        .eq("Program_Code", selectedProgram);

      // Success UI update
      setStatusMsg({ type: "success", text: "🎉 Result saved and student scores updated successfully!" });
      
      // Clean form state definitions
      setProgrammes(prev => prev.filter(p => p.Program_Code !== selectedProgram));
      setSelectedProgram("");
      setHolders(INITIAL_HOLDERS);
      setParticipants([]);

    } catch (err) {
      const error = err as Error;
      setStatusMsg({ type: "error", text: error.message || "An error occurred while saving." });
    } finally {
      setLoading(false);
    }
  };

  // Define keys for mapping to ensure type safety in JSX
  const positionKeys: { id: keyof Holders; label: string }[] = [
    { id: "first", label: "🥇 First Holder (7 Pts)" },
    { id: "second", label: "🥈 Second Holder (5 Pts)" },
    { id: "third", label: "🥉 Third Holder (3 Pts)" },
    { id: "aGrade", label: "⭐ A Grade Holder" },
    { id: "bGrade", label: "⭐ B Grade Holder" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Programme Result</h2>
        {wingTitle && <p style={styles.subtitle}>{wingTitle} Panel</p>}

        {statusMsg.text && (
          <div style={{ 
            ...styles.alert, 
            backgroundColor: statusMsg.type === "success" ? "#e6f4ea" : "#fce8e6", 
            color: statusMsg.type === "success" ? "#137333" : "#c5221f" 
          }}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Header Wing Metadata */}
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: "1 1 200px" }}>
              <label style={styles.label}>Wing Code</label>
              <input type="text" value={WingCode || "Loading..."} readOnly style={styles.inputReadOnly} />
            </div>

            <div style={{ ...styles.formGroup, flex: "1 1 200px" }}>
              <label style={styles.label}>Select Programme *</label>
              <select 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)} 
                required 
                disabled={!WingCode}
                style={styles.select}
              >
                <option value="">-- Choose Programme --</option>
                {programmes.map((p) => (
                  <option key={p.Program_Code} value={p.Program_Code}>
                    {p.Program_Title || p.Program_Code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProgram && (
            <>
              <hr style={styles.divider} />
              
              {/* Participants List UI */}
              <div style={styles.participantsBox}>
                <label style={styles.label}>Registered Candidates (AddNo)</label>
                {loadingParticipants ? (
                  <p style={styles.participantsText}>Loading...</p>
                ) : participants.length > 0 ? (
                  <div style={styles.participantsList}>
                    {participants.map((p) => (
                      <span key={p.CandidateUUiD || p.Candidate_Code} style={styles.participantBadge}>
                        {p.Candidate_Code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={styles.participantsText}>No candidates found for this programme.</p>
                )}
              </div>

              {/* Positions Panel Fields Layout */}
              {positionKeys.map((role) => (
                <div style={styles.row} key={role.id}>
                  <div style={{ ...styles.formGroup, flex: "1 1 180px" }}>
                    <label style={styles.label}>{role.label} AddNo</label>
                    <input 
                      type="text" 
                      placeholder="Enter Admission No" 
                      value={holders[role.id].addNo}
                      onChange={(e) => handleAddNoChange(role.id, e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, flex: "1 1 250px" }}>
                    <label style={styles.label}>{role.label} Name</label>
                    <input 
                      type="text" 
                      value={holders[role.id].name} 
                      placeholder="Student Name auto-resolves..." 
                      readOnly 
                      style={styles.inputReadOnly} 
                    />
                  </div>
                </div>
              ))}

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Processing transactional logs..." : "Publish Result & Update Points"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// Strongly type the styles object for React
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px 12px",
    display: "flex",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "28px",
    width: "100%",
    maxWidth: "680px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    height: "fit-content"
  },
  title: {
    marginTop: 0,
    marginBottom: "4px",
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center"
  },
  subtitle: {
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b",
    marginTop: 0,
    marginBottom: "24px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  row: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap"
  },
  label: {
    fontWeight: "600",
    fontSize: "13px",
    color: "#4a5568"
  },
  input: {
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#334155",
    outline: "none",
    backgroundColor: "#ffffff"
  },
  inputReadOnly: {
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    outline: "none"
  },
  select: {
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#334155",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    outline: "none"
  },
  divider: {
    border: 0,
    borderTop: "1px solid #e2e8f0",
    margin: "12px 0"
  },
  button: {
    padding: "14px",
    backgroundColor: "#1a73e8",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "12px",
    boxShadow: "0 2px 6px rgba(26, 115, 232, 0.2)"
  },
  alert: {
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    fontWeight: 500,
    textAlign: "center"
  },
  participantsBox: {
    backgroundColor: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "8px"
  },
  participantsText: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0 0 0"
  },
  participantsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px"
  },
  participantBadge: {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "4px 10px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 600
  }
};