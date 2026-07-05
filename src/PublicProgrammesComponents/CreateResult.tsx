

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // Assumed path for useParams
import { SupaBaseFunction } from "../../src/lib/SupaBase";

export default function CreateResult() {
  const { WingEmailID } = useParams(); // Active Wing Email from URL params
  
  // State variables
  const [wingCode, setWingCode] = useState("");
  const [wingTitle, setWingTitle] = useState("");
  const [programmes, setProgrammes] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  
  // Holder States (Admission Numbers & Auto-Fetched Names)
  const [holders, setHolders] = useState({
    first: { addNo: "", name: "" },
    second: { addNo: "", name: "" },
    third: { addNo: "", name: "" },
    aGrade: { addNo: "", name: "" },
    bGrade: { addNo: "", name: "" },
  });

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // 1. Fetch Wing Code using the email parameter
  useEffect(() => {
    async function fetchWingData() {
      if (!WingEmailID) return;
      try {
        const { data: WCode, error: CodeError } = await SupaBaseFunction
          .from("Chs-WingS")
          .select("WingCode, WingEmail, WingTitle")
          .eq("WingEmail", WingEmailID)
          .maybeSingle();

        if (!CodeError && WCode) {
          setWingCode(WCode.WingCode);
          setWingTitle(WCode.WingTitle);
        }
      } catch (err) {
        console.error("Error fetching wing data:", err);
      }
    }
    fetchWingData();
  }, [WingEmailID]);

  // 2. Fetch unresulted programmes matching active wing code
  useEffect(() => {
    async function fetchProgrammes() {
      if (!wingCode) return;
      try {
        const { data, error } = await SupaBaseFunction
          .from("ProgrammesBox")
          .select("Program_Code, Programme_Title")
          .eq("Wing_Code", wingCode) // Adjust column name if named differently
          .eq("IsResulted", false);

        if (!error && data) setProgrammes(data);
      } catch (err) {
        console.error("Error fetching programmes:", err);
      }
    }
    fetchProgrammes();
  }, [wingCode]);

  // 3. Real-time name lookup tracking when an AddNo changes
  const handleAddNoChange = async (role, addNo) => {
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

      setHolders(prev => ({
        ...prev,
        [role]: { ...prev[role], name: (!error && data) ? data.Student_Name : "⚠️ Student Not Found" }
      }));
    } catch {
      setHolders(prev => ({ ...prev, [role]: { ...prev[role], name: "⚠️ Student Not Found" } }));
    }
  };

  // 4. Complete database pipeline on Form Submit
  const handleSubmit = async (e) => {
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
          AGrade: holders.aGrade.addNo || "No Grade",
          BGrade: holders.bGrade.addNo || null,
          creaded_At: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // Step B: Set up point tracking allocations (1st: 7, 2nd: 5, 3rd: 3)
      const pointSchema = [
        { addNo: holders.first.addNo, points: 7 },
        { addNo: holders.second.addNo, points: 5 },
        { addNo: holders.third.addNo, points: 3 },
        { addNo: holders.aGrade.addNo, points: 0 },
        { addNo: holders.bGrade.addNo, points: 0 }
      ];

      for (const holder of pointSchema) {
        if (holder.addNo && !holder.addNo.includes("Not Found")) {
          const { data: student } = await SupaBaseFunction
            .from("StudentsBox")
            .select("Resluted_Count, Total_Point_Anjuman, Grand_Total_Points")
            .eq("AddNo", holder.addNo)
            .single();

          if (student) {
            await SupaBaseFunction
              .from("StudentsBox")
              .update({
                Resluted_Count: (student.Resluted_Count || 0) + 1,
                Total_Point_Anjuman: (student.Total_Point_Anjuman || 0) + holder.points,
                Grand_Total_Points: (student.Grand_Total_Points || 0) + holder.points
              })
              .eq("AddNo", holder.addNo);
          }
        }
      }

      // Step C: Mark program as completed
      await SupaBaseFunction
        .from("ProgrammesBox")
        .update({ IsResulted: true })
        .eq("Program_Code", selectedProgram);

      setStatusMsg({ type: "success", text: "🎉 Result saved and student scores updated successfully!" });
      
      // Clean form state definitions
      setProgrammes(prev => prev.filter(p => p.Program_Code !== selectedProgram));
      setSelectedProgram("");
      setHolders({
        first: { addNo: "", name: "" },
        second: { addNo: "", name: "" },
        third: { addNo: "", name: "" },
        aGrade: { addNo: "", name: "" },
        bGrade: { addNo: "", name: "" },
      });

    } catch (err) {
      setStatusMsg({ type: "error", text: err.message || "An error occurred while saving." });
    } finally {
      setLoading(false);
    }
  };

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
              <input type="text" value={wingCode || "Loading..."} readOnly style={styles.inputReadOnly} />
            </div>

            <div style={{ ...styles.formGroup, flex: "1 1 200px" }}>
              <label style={styles.label}>Select Programme *</label>
              <select 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)} 
                required 
                disabled={!wingCode}
                style={styles.select}
              >
                <option value="">-- Choose Programme --</option>
                {programmes.map((p) => (
                  <option key={p.Program_Code} value={p.Program_Code}>
                    {p.Programme_Title || p.Program_Code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProgram && (
            <>
              <hr style={styles.divider} />
              
              {/* Positions Panel Fields Layout */}
              {[
                { id: "first", label: "🥇 First Holder (7 Pts)" },
                { id: "second", label: "🥈 Second Holder (5 Pts)" },
                { id: "third", label: "🥉 Third Holder (3 Pts)" },
                { id: "aGrade", label: "⭐ A Grade Holder" },
                { id: "bGrade", label: "⭐ B Grade Holder" },
              ].map((role) => (
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

const styles = {
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
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "12px",
    boxShadow: "0 2px 6px rgba(26, 115, 232, 0.2)"
  },
  alert: {
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center"
  }
};