
import { useState, useEffect, useMemo, useRef } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useNavigate, useParams } from "react-router-dom";
import { exportToExcel, parseSpreadsheet, downloadSampleTemplate } from "../../lib/excelService";
import { importStudentsBatch } from "./ImportStudent";
import { Download, Upload, FileSpreadsheet, PlusCircle } from "lucide-react";
import SafeImage from "../../lib/SafeImage";

interface StudentRecord {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
  Student_Photo_Urls: string;
  FatherName: string;
  CollegeName: string;
  Class: string;
  Total_Point_Anjuman: number;
  Achievements_Counts: number;
  Grand_Total_Points: number;
  IsActive?: boolean;
  StnState: string;
  StnDistrict: string;
}

export default function OurStudentsList() {
  const { actUser } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState("All");
  const [filterDistrict, setFilterDistrict] = useState("All");
  const [filterClass, setFilterClass] = useState("All");

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupaBaseFunction.from("StudentsBox")
        .select("*")
        .order("StudentName", { ascending: true });
      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const filteredStudents = useMemo(() => students.filter((stn) => {
    const matchesSearch = stn.StudentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stn.AddNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = filterState === "All" || stn.StnState === filterState;
    const matchesDistrict = filterDistrict === "All" || stn.StnDistrict === filterDistrict;
    const matchesClass = filterClass === "All" || stn.Class === filterClass;
    return matchesSearch && matchesState && matchesDistrict && matchesClass;
  }), [students, searchQuery, filterState, filterDistrict, filterClass]);

  const { uniqueStates, uniqueDistricts, uniqueClasses } = useMemo(() => {
    const valid = students.filter(s => (filterClass === "All" || s.Class === filterClass));
    return {
      uniqueStates: Array.from(new Set(valid.map(s => s.StnState).filter(Boolean))),
      uniqueDistricts: Array.from(new Set(valid.filter(s => filterState === "All" || s.StnState === filterState).map(s => s.StnDistrict).filter(Boolean))),
      uniqueClasses: Array.from(new Set(students.map(s => s.Class).filter(Boolean))),
    };
  }, [students, filterState, filterClass]);

  useEffect(() => { setFilterDistrict("All"); }, [filterState]);

  const toggleStudentSelection = (addNo: string) => {
    setSelectedStudents((prev) => prev.includes(addNo) ? prev.filter((id) => id !== addNo) : [...prev, addNo]);
  };

  const handleDeleteStudentRecord = async (stnAddNo: string, studentName: string) => {
    if (!window.confirm(`Delete profile for ${studentName}?`)) return;
    try {
      setActionLoading(stnAddNo);
      const { error } = await SupaBaseFunction.from("StudentsBox").delete().eq("AddNo", stnAddNo);
      if (error) throw error;
      setStudents((prev) => prev.filter((stn) => stn.AddNo !== stnAddNo));
    } catch (err: any) { alert(`Error: ${err.message}`); } finally { setActionLoading(null); }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAll = () => {
    exportToExcel(students, "Students_Directory.xlsx", "All Students");
  };

  const handleExportSelected = () => {
    const selected = students.filter(s => selectedStudents.includes(s.AddNo));
    if (selected.length === 0) {
      alert("Please select at least one student using the card checkboxes.");
      return;
    }
    exportToExcel(selected, `Students_Selected_${selected.length}.xlsx`, "Selected Students");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const rows = await parseSpreadsheet(file);
      const res = await importStudentsBatch(rows);
      alert(`✅ Batch import result: ${res.successCount} added/updated, ${res.duplicatesSkipped} duplicates skipped.`);
      await fetchStudents();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center text-sm font-semibold text-[#64748B]">Syncing directory...</div>;

  return (
    <div className="w-full space-y-6 p-1">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#E2E8F0] pb-3 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Registered Directory</h2>
          <p className="text-xs text-[#64748B] font-medium">{filteredStudents.length} Students found {selectedStudents.length > 0 && `(${selectedStudents.length} selected)`}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-50 transition cursor-pointer"
          >
            <Upload size={14} /> Import Excel
          </button>

          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-50 transition cursor-pointer"
          >
            <Download size={14} /> Export All
          </button>

          {selectedStudents.length > 0 && (
            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
            >
              <Download size={14} /> Export Selected ({selectedStudents.length})
            </button>
          )}

          <button
            onClick={() => downloadSampleTemplate("students")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition cursor-pointer"
          >
            <FileSpreadsheet size={14} /> Template
          </button>

          <button
            onClick={() => navigate(`/admin-panel/${actUser}/new-student`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] transition cursor-pointer"
          >
            <PlusCircle size={14} /> Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
        <input placeholder="Search Name or ID..." className="p-2 text-sm border border-[#CBD5E1] rounded-lg" onChange={(e) => setSearchQuery(e.target.value)} />
        <select className="p-2 text-sm border border-[#CBD5E1] rounded-lg" onChange={(e) => setFilterState(e.target.value)} value={filterState}>
          <option value="All">All States</option>
          {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="p-2 text-sm border border-[#CBD5E1] rounded-lg" onChange={(e) => setFilterDistrict(e.target.value)} value={filterDistrict}>
          <option value="All">All Districts</option>
          {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="p-2 text-sm border border-[#CBD5E1] rounded-lg" onChange={(e) => setFilterClass(e.target.value)} value={filterClass}>
          <option value="All">All Classes</option>
          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filteredStudents.map((student) => {
          const isSelected = selectedStudents.includes(student.AddNo);
          return (
            <div key={student.AddNo} className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 ${isSelected ? 'border-[#047857] ring-1 ring-[#047857]' : 'border-[#E2E8F0] hover:shadow-md'}`}>
                <div className="absolute top-4 right-4 z-10">
                  <input type="checkbox" className="h-5 w-5 rounded border-[#CBD5E1] text-[#047857] focus:ring-[#047857] cursor-pointer" checked={isSelected} onChange={() => toggleStudentSelection(student.AddNo)} />
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3.5 pr-8">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center relative">
                      <SafeImage
                        src={student.Student_Photo_Urls}
                        alt={student.StudentName}
                        fallbackCategory="student"
                        fallbackText={student.StudentName}
                        className="h-full w-full object-cover"
                      />
                      {student.IsActive !== undefined && <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${student.IsActive ? 'bg-green-500' : 'bg-gray-400'}`} />}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="inline-flex items-center rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-bold text-[#059669] uppercase tracking-wide">ID: {student.AddNo}</span>
                      <h3 className="truncate text-sm font-bold text-[#0F172A] tracking-tight">{student.StudentName}</h3>
                      <p className="truncate text-xs text-[#64748B] font-medium">{student.StudentEmail}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 border-t border-[#F1F5F9] pt-3 text-xs text-[#334155]">
                    <div className="flex items-center gap-1.5 truncate"><span className="font-semibold text-[#64748B]">Study Center:</span><span className="truncate font-medium text-[#0F172A]">{student.CollegeName || "Not assigned"}</span></div>
                    <div className="flex items-center gap-1.5"><span className="font-semibold text-[#64748B]">Father:</span><span className="truncate font-medium text-[#0F172A]">{student.FatherName || "N/A"}</span></div>
                    <div className="flex items-center gap-1.5"><span className="font-semibold text-[#64748B]">Class Target:</span><span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#475569]">{student.Class || "N/A"}</span></div>
                    <div className="flex items-center gap-1.5"><span className="font-semibold text-[#64748B]">State:</span><span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#475569]">{student.StnState || "N/A"}   {student.StnDistrict || "N/A"}</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] p-3 text-center">
                    <div><p className="text-[10px] font-bold uppercase tracking-tight text-[#64748B]">Anjuman</p><p className="text-sm font-bold text-[#047857] mt-0.5">{student.Total_Point_Anjuman || 0}</p></div>
                    <div className="border-x border-[#E2E8F0]"><p className="text-[10px] font-bold uppercase tracking-tight text-[#64748B]">Achieve</p><p className="text-sm font-bold text-[#0F172A] mt-0.5">{student.Achievements_Counts || 0}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-tight text-[#64748B]">Grand Total</p><p className="text-sm font-bold text-[#2563EB] mt-0.5">{student.Grand_Total_Points || 0}</p></div>
                  </div>
                </div>
                <div className="flex border-t border-[#E2E8F0] bg-[#F8FAFC] p-2 gap-2">
                  <button type="button" disabled={actionLoading === student.AddNo} onClick={() => handleDeleteStudentRecord(student.AddNo, student.StudentName)} className="flex-1 rounded-lg border border-red-200 bg-white py-2 text-center text-xs font-bold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50">{actionLoading === student.AddNo ? "Erasing..." : "Delete"}</button>
                  <button type="button" onClick={() => navigate(`/admin-panel/${actUser}/edite-student/${student.AddNo}`)} className="flex-1 rounded-lg bg-[#047857] py-2 text-center text-xs font-bold text-white shadow-sm hover:bg-[#065f46] transition-colors">Update Profile</button>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}