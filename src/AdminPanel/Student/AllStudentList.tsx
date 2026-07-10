import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useNavigate, useParams } from "react-router-dom";

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
  const {actUser} = useParams();

  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState<boolean>(false);

  // --- Highly Efficient Single Fetch Flow ---
  const fetchStudents = async () => {
    try {
      setLoading(true);

      const { data: supabaseData, error: dbError } = await SupaBaseFunction
        .from("StudentsBox")
        .select(`
          AddNo, StudentName, StudentEmail, Student_Photo_Urls,
          FatherName, CollegeName, Class, Total_Point_Anjuman, 
          Achievements_Counts, Grand_Total_Points, IsActive, StnState, StnDistrict 
        `)
        .order("StudentName", { ascending: true });

      if (dbError) throw dbError;

      setStudents(supabaseData || []);
    } catch (err) {
      const error = err as Error;
      alert(`Sync Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDirectImageUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("drive.google.com/file/d/")) {
      const fileId = url.split("/d/")[1].split("/")[0];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    if (url.includes("drive.google.com/open?id=")) {
      const fileId = url.split("id=")[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // --- Selection Handlers ---
  const toggleStudentSelection = (addNo: string) => {
    setSelectedStudents((prev) =>
      prev.includes(addNo) ? prev.filter((id) => id !== addNo) : [...prev, addNo]
    );
  };

  const toggleAllSelection = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]); 
    } else {
      setSelectedStudents(students.map((stn) => stn.AddNo)); 
    }
  };

  // --- Actions Handlers ---
  const handleBulkDelete = async () => {
    const confirmDelete = window.confirm(`⚠️ Are you sure you want to delete ${selectedStudents.length} student(s)?`);
    if (!confirmDelete) return;
    try {
      setIsBulkLoading(true);
      const { error } = await SupaBaseFunction.from("StudentsBox").delete().in("AddNo", selectedStudents);
      if (error) throw error;
      setStudents((prev) => prev.filter((stn) => !selectedStudents.includes(stn.AddNo)));
      setSelectedStudents([]); 
      alert("Deleted successfully.");
    } catch (err) {
      const error = err as Error;
      alert(`Failed: ${error.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    try {
      setIsBulkLoading(true);
      const { error } = await SupaBaseFunction.from("StudentsBox").update({ IsActive: isActive }).in("AddNo", selectedStudents);
      if (error) throw error;
      setStudents((prev) => prev.map((stn) => selectedStudents.includes(stn.AddNo) ? { ...stn, IsActive: isActive } : stn));
      setSelectedStudents([]); 
    } catch (err) {
      const error = err as Error;
      alert(`Update Failed: ${error.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleDeleteStudentRecord = async (stnAddNo: string, studentName: string) => {
    if (!window.confirm(`Delete profile for ${studentName}?`)) return;
    try {
      setActionLoading(stnAddNo);
      const { error } = await SupaBaseFunction.from("StudentsBox").delete().eq("AddNo", stnAddNo);
      if (error) throw error;
      setStudents((prev) => prev.filter((stn) => stn.AddNo !== stnAddNo));
    } catch (err) {
      const error = err as Error;
      alert(`Error: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-sm font-semibold text-[#64748B]">
        Syncing directory database records...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-1">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#E2E8F0] pb-3 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Registered Directory</h2>
          <p className="text-xs text-[#64748B] font-medium">{students.length} Students live synced from Cloud Storage</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[#334155] cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#CBD5E1] text-[#047857] focus:ring-[#047857]"
              checked={selectedStudents.length === students.length && students.length > 0}
              onChange={toggleAllSelection}
              disabled={students.length === 0}
            />
            Select All
          </label>

          {selectedStudents.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkStatusUpdate(true)} disabled={isBulkLoading} className="px-3 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded-md transition-colors">Activate</button>
              <button onClick={() => handleBulkStatusUpdate(false)} disabled={isBulkLoading} className="px-3 py-1.5 text-xs font-bold text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-md transition-colors">Deactivate</button>
              <button onClick={handleBulkDelete} disabled={isBulkLoading} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors">Delete</button>
            </div>
          )}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-white">
          <p className="text-sm font-semibold text-[#64748B]">No student profiles tracked found.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => {
            const isSelected = selectedStudents.includes(student.AddNo);
            
            return (
              <div 
                key={student.AddNo} 
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 
                  ${isSelected ? 'border-[#047857] ring-1 ring-[#047857]' : 'border-[#E2E8F0] hover:shadow-md'}`}
              >
                <div className="absolute top-4 right-4 z-10">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-[#CBD5E1] text-[#047857] focus:ring-[#047857] cursor-pointer"
                    checked={isSelected}
                    onChange={() => toggleStudentSelection(student.AddNo)}
                  />
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3.5 pr-8">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center relative">
                      {student.Student_Photo_Urls ? (
                        <img 
                          src={getDirectImageUrl(student.Student_Photo_Urls)} 
                          alt={student.StudentName} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg className="h-6 w-6 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {student.IsActive !== undefined && (
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${student.IsActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      )}
                    </div>
                    
                    <div className="space-y-0.5 min-w-0">
                      <span className="inline-flex items-center rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-bold text-[#059669] uppercase tracking-wide">
                        ID: {student.AddNo}
                      </span>
                      <h3 className="truncate text-sm font-bold text-[#0F172A] tracking-tight">{student.StudentName}</h3>
                      <p className="truncate text-xs text-[#64748B] font-medium">{student.StudentEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-[#F1F5F9] pt-3 text-xs text-[#334155]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-[#64748B]">Study Center:</span>
                      <span className="truncate font-medium text-[#0F172A]">{student.CollegeName || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#64748B]">Father:</span>
                      <span className="truncate font-medium text-[#0F172A]">{student.FatherName || "N/A"}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#64748B]">Class Target:</span>
                      <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#475569]">{student.Class || "N/A"}</span>
                    </div>
                    

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#64748B]">State:</span>
                      <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#475569]">{student.StnState || "N/A"}   {student.StnDistrict || "N/A"}</span>
                    </div>

                    

                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] p-3 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-[#64748B]">Anjuman</p>
                      <p className="text-sm font-bold text-[#047857] mt-0.5">{student.Total_Point_Anjuman || 0}</p>
                    </div>
                    <div className="border-x border-[#E2E8F0]">
                      <p className="text-[10px] font-bold uppercase tracking-tight text-[#64748B]">Achieve</p>
                      <p className="text-sm font-bold text-[#0F172A] mt-0.5">{student.Achievements_Counts || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-[#64748B]">Grand Total</p>
                      <p className="text-sm font-bold text-[#2563EB] mt-0.5">{student.Grand_Total_Points || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex border-t border-[#E2E8F0] bg-[#F8FAFC] p-2 gap-2">
                  <button
                    type="button"
                    disabled={actionLoading === student.AddNo || isBulkLoading}
                    onClick={() => handleDeleteStudentRecord(student.AddNo, student.StudentName)}
                    className="flex-1 rounded-lg border border-red-200 bg-white py-2 text-center text-xs font-bold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === student.AddNo ? "Erasing..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin-panel/${actUser}/edite-student/${student.AddNo}`)}
                    className="flex-1 rounded-lg bg-[#047857] py-2 text-center text-xs font-bold text-white shadow-sm hover:bg-[#065f46] transition-colors"
                  >
                    Update Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}