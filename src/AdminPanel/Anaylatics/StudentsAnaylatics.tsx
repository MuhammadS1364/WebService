
// export default function StudentsAnaylaticsGeneral(){
//     return(

//     )
// }

// create table public."StudentsBox" (
//   "AddNo" character varying not null,
//   "StudentName" character varying null,
//   "StudentEmail" character varying null,
//   "FatherName" character varying null,
//   "CollegeName" character varying null,
//   "StnUserId" character varying null,
//   "Class" character varying null,
//   "Registration_Count" integer null default 0,
//   "Resluted_Count" integer null default 0,
//   "Total_Point_Anjuman" integer null default 0,
//   "OutReach_Count" integer null default 0,
//   "OutReach_Points" integer null default 0,
//   "Achievements_Counts" integer null default 0,
//   "Achievements_Points" integer null default 0,
//   "Grand_Total_Points" integer null default 0,
//   "IsActive" boolean null default true,
//   "Student_Photo_Urls" character varying null default 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRO1QLsyDIL5S8tTQ5ZKXjFe9wxiVZ7O9-lOnJgJO3-Bg&s=10'::character varying,
//   "StnState" character varying null default 'No Provided'::character varying,
//   "StnDistrict" character varying null default 'No Provided'::character varying,
//   constraint StudentsBox_pkey primary key ("AddNo")
// ) TABLESPACE pg_default;
// create table public."StudentsAchievements" (
//   "Achieve_Id" uuid not null default gen_random_uuid (),
//   "Achiever_Name" character varying null,
//   "Achievement_Title" character varying null,
//   "Achievement_Type" character varying null,
//   "Position_Achieved" character varying null,
//   "Achieve_Descriptin" text null,
//   "Point_Obtained" integer null default 0,
//   "StnAddNo" character varying null,
//   constraint StudentsAchievements_pkey primary key ("Achieve_Id")
// ) TABLESPACE pg_default;

// create table public."StudentsOutReach" (
//   "OutReach_Id" uuid not null default gen_random_uuid (),
//   created_at time without time zone not null,
//   "OutReach_Holder" character varying null,
//   "OutReach_Title" character varying null,
//   "OutReach_Type" character varying null,
//   "Position_Achieved" character varying null,
//   "OutReach_Descriptin" text null,
//   "Point_Obtained" integer null default 0,
//   "StnAddNo" character varying null,
//   constraint StudentsOutReach_pkey primary key ("OutReach_Id")
// ) TABLESPACE pg_default;

// create table public."ResultBox" (
//   "Result_id" uuid not null default gen_random_uuid (),
//   "creaded_At" time without time zone null,
//   "Program_Id" character varying null,
//   "First_Holder" character varying null,
//   "Second_Holder" character varying null,
//   "Third_Holder" character varying null,
//   "AGrade" character varying null default 'No Grade'::character varying,
//   "BGrade" character varying null,
//   constraint ResultBox_pkey primary key ("Result_id")
// ) TABLESPACE pg_default;

// create table public."CandidateRegistrationTable" (
//   "CandidateUUiD" uuid not null default gen_random_uuid (),
//   "Program_Code" character varying null,
//   "Candidate_Code" character varying null,
//   constraint CandidateRegistrationTable_pkey primary key ("CandidateUUiD")
// ) TABLESPACE pg_default;

// // these table for student data , 

// // creater filter for these coluns , 
// //  class, state, district, 
// // and that y feel need to filte in colun , data export featu , as in the abouve comont 


import React, { useState, useEffect, useMemo } from "react";
// @ts-ignore
import { SupaBaseFunction } from "../../lib/SupaBase";
import SafeImage from "../../lib/SafeImage";
import { useProgrammeMeta } from "../../lib/programmeMeta";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Line, Area
} from "recharts";
import {
  LayoutGrid,
  List,
  Trophy,
  Calendar,
  Building2,
  X,
  Zap,
  Clock,
  Eye,
} from "lucide-react";

export interface Student {
  AddNo: string;
  StudentName: string | null;
  StudentEmail: string | null;
  FatherName: string | null;
  CollegeName: string | null;
  StnUserId: string | null;
  Class?: string | null;
  Stn_Class?: string | null;
  Registration_Count: number | null;
  Resluted_Count: number | null;
  Total_Point_Anjuman: number | null;
  OutReach_Count: number | null;
  OutReach_Points: number | null;
  Achievements_Counts: number | null;
  Achievements_Points: number | null;
  Grand_Total_Points: number | null;
  IsActive: boolean | null;
  Student_Photo_Urls: string | null;
  StnState: string | null;
  StnDistrict: string | null;
  resolvedClassName?: string;
  resolvedCategoryName?: string;
}

interface StudentProgramItem {
  Program_Code: string;
  Program_Title: string;
  WingCode?: string | null;
  Category?: string | null;
  Group?: string | null;
  Date?: string | null;
  Venue?: string | null;
  IsConducted?: boolean;
  positionWon?: string | null;
  pointsEarned?: number;
}

interface FilterState {
  Class: string;
  Category: string;
  StnState: string;
  StnDistrict: string;
  CollegeName: string;
  IsActive: string;
}

interface FilterOptions {
  classes: string[];
  categories: string[];
  states: string[];
  districts: string[];
  colleges: string[];
}

const COLORS: string[] = ['#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4'];

export default function StudentsAnalyticsGeneral() {
  const meta = useProgrammeMeta();
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
  const [loading, setLoading] = useState<boolean>(true);

  // Student Detail Modal & Programmes
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPrograms, setStudentPrograms] = useState<StudentProgramItem[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState<boolean>(false);
  const [programViewMode, setProgramViewMode] = useState<"card" | "table">("card");

  const [filters, setFilters] = useState<FilterState>({
    Class: "", Category: "", StnState: "", StnDistrict: "", CollegeName: "", IsActive: "true"
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    classes: [], categories: [], states: [], districts: [], colleges: []
  });

  // Helper to resolve student class name from Our_Classes
  const getResolvedClassName = (s: Student): string => {
    if (s.Stn_Class && meta.classMap[s.Stn_Class]) {
      return meta.classMap[s.Stn_Class];
    }
    if (s.Class) {
      const matched = meta.classes.find(
        (c) => c.standard_name === s.Class || c.class_nick_name === s.Class
      );
      if (matched) return matched.standard_name;
      return s.Class;
    }
    return "Unassigned";
  };

  // Helper to resolve student category name from Our_Category bonding
  const getResolvedCategoryName = (s: Student): string => {
    const classId = s.Stn_Class;
    const className = s.Class;
    const matchedClass = meta.classes.find(
      (c) =>
        (classId && c.class_id === classId) ||
        (className && (c.standard_name === className || c.class_nick_name === className))
    );
    const resolvedClassId = matchedClass?.class_id || classId;

    if (resolvedClassId) {
      const cat = meta.categories.find(
        (c) =>
          c.class_1 === resolvedClassId ||
          c.class_2 === resolvedClassId ||
          c.class_3 === resolvedClassId
      );
      if (cat) return cat.category_title;
    }

    if (className) {
      const cat = meta.categories.find(
        (c) => c.category_title.toLowerCase().trim() === className.toLowerCase().trim()
      );
      if (cat) return cat.category_title;
    }

    return "General";
  };

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
        if (error) throw error;

        const rawData = (data as Student[]) || [];
        setStudents(rawData);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Hydrate students with resolved class and category names
  const hydratedStudents = useMemo(() => {
    return students.map((s) => ({
      ...s,
      resolvedClassName: getResolvedClassName(s),
      resolvedCategoryName: getResolvedCategoryName(s),
    }));
  }, [students, meta.classMap, meta.classes, meta.categories]);

  // Extract filter options
  useEffect(() => {
    if (hydratedStudents.length > 0) {
      const classNames = Array.from(
        new Set(
          hydratedStudents
            .map((s) => s.resolvedClassName)
            .filter((v): v is string => Boolean(v && v !== "Unassigned"))
        )
      ).sort();

      const catNames = Array.from(
        new Set(
          hydratedStudents
            .map((s) => s.resolvedCategoryName)
            .filter((v): v is string => Boolean(v && v !== "General"))
        )
      ).sort();

      const extractUnique = (key: keyof Student): string[] => {
        const values = hydratedStudents
          .map((s) => s[key])
          .filter((v): v is string => typeof v === "string" && v !== "No Provided");
        return Array.from(new Set(values)).sort();
      };

      setFilterOptions({
        classes: classNames.length > 0 ? classNames : meta.classes.map((c) => c.standard_name),
        categories: catNames.length > 0 ? catNames : meta.categories.map((c) => c.category_title),
        states: extractUnique("StnState"),
        districts: extractUnique("StnDistrict"),
        colleges: extractUnique("CollegeName"),
      });
    }
  }, [hydratedStudents, meta.classes, meta.categories]);

  // When a student is selected, fetch their enrolled programmes & result positions
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setLoadingPrograms(true);
    setStudentPrograms([]);

    try {
      // 1. Fetch Candidate Registrations
      const { data: regRows } = await SupaBaseFunction
        .from("CandidateRegistrationTable")
        .select("Program_Code")
        .eq("Candidate_Code", student.AddNo);

      const progCodes = Array.from(
        new Set((regRows || []).map((r: any) => r.Program_Code).filter(Boolean))
      );

      if (progCodes.length === 0) {
        setStudentPrograms([]);
        return;
      }

      // 2. Fetch Programmes Details
      const { data: progRows } = await SupaBaseFunction
        .from("ProgrammesBox")
        .select("Program_Code, Program_Title, WingCode, Category, Group, Date, Venue, IsConducted")
        .in("Program_Code", progCodes);

      // 3. Fetch ResultBox for this student
      const { data: results } = await SupaBaseFunction
        .from("ResultBox")
        .select("*")
        .or(
          `First_Holder.eq.${student.AddNo},Second_Holder.eq.${student.AddNo},Third_Holder.eq.${student.AddNo},AGrade.eq.${student.AddNo},BGrade.eq.${student.AddNo}`
        );

      const resultMap = new Map<string, { position: string; points: number }>();
      (results || []).forEach((r: any) => {
        if (!r.Program_Id) return;
        if (r.First_Holder === student.AddNo) {
          resultMap.set(r.Program_Id, { position: "1st Place Winner", points: 10 });
        } else if (r.Second_Holder === student.AddNo) {
          resultMap.set(r.Program_Id, { position: "2nd Runner-Up", points: 7 });
        } else if (r.Third_Holder === student.AddNo) {
          resultMap.set(r.Program_Id, { position: "3rd Place", points: 5 });
        } else if (r.AGrade === student.AddNo) {
          resultMap.set(r.Program_Id, { position: "A-Grade", points: 5 });
        } else if (r.BGrade === student.AddNo) {
          resultMap.set(r.Program_Id, { position: "B-Grade", points: 3 });
        }
      });

      const mapped: StudentProgramItem[] = (progRows || []).map((p: any) => {
        const res = resultMap.get(p.Program_Code);
        return {
          Program_Code: p.Program_Code,
          Program_Title: p.Program_Title || "Untitled",
          WingCode: p.WingCode,
          Category: p.Category,
          Group: p.Group,
          Date: p.Date,
          Venue: p.Venue,
          IsConducted: Boolean(p.IsConducted),
          positionWon: res?.position || null,
          pointsEarned: res?.points || 0,
        };
      });

      setStudentPrograms(mapped);
    } catch (err) {
      console.error("Failed to load student programmes:", err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Memoize filteredData to prevent cascading render loops
  const filteredData = useMemo(() => {
    let result = [...hydratedStudents];
    if (filters.Class) result = result.filter(s => s.resolvedClassName === filters.Class || s.Class === filters.Class);
    if (filters.Category) result = result.filter(s => s.resolvedCategoryName === filters.Category);
    if (filters.StnState) result = result.filter(s => s.StnState === filters.StnState);
    if (filters.StnDistrict) result = result.filter(s => s.StnDistrict === filters.StnDistrict);
    if (filters.CollegeName) result = result.filter(s => s.CollegeName === filters.CollegeName);
    if (filters.IsActive !== "all") {
      const isActiveBool = filters.IsActive === "true";
      result = result.filter(s => s.IsActive === isActiveBool);
    }
    return result;
  }, [filters, hydratedStudents]);

  const handleExport = () => {
    const isFiltered = Object.values(filters).some(val => val !== "" && val !== "all");
    const message = isFiltered 
      ? `You have active filters. Export ${filteredData.length} filtered students?`
      : `Export all ${filteredData.length} students?`;

    if (window.confirm(message)) {
      const headers = [
        "AddNo", "StudentName", "StudentEmail", "CollegeName", "Class", "Category", 
        "State", "District", "Registrations", "Total_Anjuman_Points", 
        "OutReach_Points", "Achievement_Points", "Grand_Total_Points", "IsActive"
      ];
      const csvContent = [
        headers.join(","),
        ...filteredData.map(row => [
          `"${row.AddNo || ''}"`, `"${row.StudentName || ''}"`, `"${row.StudentEmail || ''}"`,
          `"${row.CollegeName || ''}"`, `"${row.resolvedClassName || row.Class || ''}"`,
          `"${row.resolvedCategoryName || 'General'}"`, `"${row.StnState || ''}"`,
          `"${row.StnDistrict || ''}"`, row.Registration_Count || 0, row.Total_Point_Anjuman || 0,
          row.OutReach_Points || 0, row.Achievements_Points || 0, row.Grand_Total_Points || 0,
          row.IsActive ? "Yes" : "No"
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Students_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const pointsByClass = Object.values(filteredData.reduce<Record<string, {name: string; totalPoints: number; studentCount: number}>>((acc, curr) => {
    const className = curr.resolvedClassName || "Unassigned";
    acc[className] = acc[className] || { name: className, totalPoints: 0, studentCount: 0 };
    acc[className].totalPoints += (curr.Grand_Total_Points || 0);
    acc[className].studentCount += 1;
    return acc;
  }, {})).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

  const studentsByCategory = Object.values(filteredData.reduce<Record<string, {name: string; value: number; totalPoints: number}>>((acc, curr) => {
    const catName = curr.resolvedCategoryName || "General";
    acc[catName] = acc[catName] || { name: catName, value: 0, totalPoints: 0 };
    acc[catName].value += 1;
    acc[catName].totalPoints += (curr.Grand_Total_Points || 0);
    return acc;
  }, {})).sort((a, b) => b.value - a.value);

  const studentsByDistrict = Object.values(filteredData.reduce<Record<string, {name: string; value: number}>>((acc, curr) => {
    const district = curr.StnDistrict && curr.StnDistrict !== 'No Provided' ? curr.StnDistrict : "Unknown";
    acc[district] = acc[district] || { name: district, value: 0 };
    acc[district].value += 1;
    return acc;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 6);

  const topStudents = [...filteredData]
    .sort((a, b) => (b.Grand_Total_Points || 0) - (a.Grand_Total_Points || 0))
    .slice(0, 5)
    .map(s => ({
      name: s.StudentName || s.AddNo, total: s.Grand_Total_Points || 0,
      achievements: s.Achievements_Points || 0, outreach: s.OutReach_Points || 0
    }));

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-semibold animate-pulse">Loading Student Analytics...</div>;

  return (
    <div className="min-h-screen bg-teal-50 p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 sm:p-6 rounded-2xl shadow-sm mb-6 gap-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-teal-700 m-0">Student Performance Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Monitor achievements, outreach, and engagement across all students.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-stretch sm:items-center">
          <div className="flex bg-slate-100 rounded-lg p-1 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab("List")} 
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === "List" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Directory
            </button>
            <button 
              onClick={() => setActiveTab("Analytics")} 
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === "Analytics" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Analytics
            </button>
          </div>
          <button 
            onClick={handleExport} 
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-teal-600/20 transition-all text-center"
          >
            Export CSV ({filteredData.length})
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm">
        <select name="Class" value={filters.Class} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Classes</option>
          {filterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="Category" value={filters.Category} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Categories</option>
          {filterOptions.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select name="CollegeName" value={filters.CollegeName} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Colleges</option>
          {filterOptions.colleges.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="StnState" value={filters.StnState} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All States</option>
          {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="StnDistrict" value={filters.StnDistrict} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Districts</option>
          {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="all">Status: All</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {activeTab === "Analytics" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-700 mb-5">Total Points by Class (Top 10)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pointsByClass} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f0fdfa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="totalPoints" name="Total Points" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-700 mb-5">Students by Academic Category</h3>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={studentsByCategory} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value" nameKey="name">
                    {studentsByCategory.map((_, index) => <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 pt-2 max-h-16 overflow-y-auto">
              {studentsByCategory.map((c, idx) => (
                <span key={c.name} className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-700 mb-5">Student Distribution by District</h3>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={studentsByDistrict} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value">
                    {studentsByDistrict.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 pt-2 max-h-16 overflow-y-auto">
              {studentsByDistrict.map((d, idx) => (
                <span key={d.name} className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-700 mb-5">Top 5 Outstanding Students</h3>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={topStudents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Area type="monotone" dataKey="total" name="Grand Total" fill="#cffafe" stroke="#0ea5e9" />
                  <Bar dataKey="achievements" name="Achievement Pts" barSize={30} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="outreach" name="Outreach Pts" stroke="#8b5cf6" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-2">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" /> Grand Total</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> Achievement Pts</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Outreach Pts</span>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-4 border-b border-slate-200">Student Info</th>
                  <th className="p-4 border-b border-slate-200">Class / Category</th>
                  <th className="p-4 border-b border-slate-200">Location</th>
                  <th className="p-4 border-b border-slate-200">Engagement</th>
                  <th className="p-4 border-b border-slate-200">Total Points</th>
                  <th className="p-4 border-b border-slate-200 text-right">Programmes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.map((student, idx) => (
                  <tr
                    key={student.AddNo}
                    onClick={() => handleSelectStudent(student)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                          <SafeImage 
                            src={student.Student_Photo_Urls} 
                            alt={student.StudentName || "Student"} 
                            fallbackCategory="student"
                            fallbackText={student.StudentName || "Student"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate group-hover:text-teal-700 transition-colors">
                            {student.StudentName}
                          </div>
                          <div className="text-xs text-slate-500 truncate">#{student.AddNo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                        <span>{student.resolvedClassName || 'Unassigned'}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {student.resolvedCategoryName || 'General'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{student.CollegeName || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{student.StnDistrict === 'No Provided' ? 'N/A' : student.StnDistrict}</div>
                      <div className="text-xs text-slate-500">{student.StnState === 'No Provided' ? '' : student.StnState}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs">Reg: <span className="font-bold text-slate-800">{student.Registration_Count}</span></div>
                      <div className="text-xs">Outreach: <span className="font-bold text-slate-800">{student.OutReach_Count}</span></div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                        {student.Grand_Total_Points || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStudent(student);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-xl border border-teal-200 transition cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View ({student.Registration_Count || 0})</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">No students match your current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT PROGRAMMES MODAL (WITH CARD VIEW & TABLE ROW VIEW) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-white p-1 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                  <SafeImage
                    src={selectedStudent.Student_Photo_Urls}
                    alt={selectedStudent.StudentName || "Student"}
                    fallbackCategory="student"
                    fallbackText={selectedStudent.StudentName || "Student"}
                    className="w-full h-full rounded-xl object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                      #{selectedStudent.AddNo}
                    </span>
                    <span className="text-xs text-slate-700 font-semibold">{selectedStudent.resolvedClassName || selectedStudent.Class || "Class"}</span>
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {selectedStudent.resolvedCategoryName || "General"} Category
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate mt-0.5">
                    {selectedStudent.StudentName}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{selectedStudent.CollegeName || "Campus"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl">
                  <Zap size={14} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-900">{selectedStudent.Grand_Total_Points || 0} PTS</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header: Controls & View Mode Toggle */}
            <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Participated Programmes ({studentPrograms.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Toggle between visual cards or compact tabular rows
                </p>
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setProgramViewMode("card")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    programViewMode === "card"
                      ? "bg-white text-teal-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid size={13} />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProgramViewMode("table")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    programViewMode === "table"
                      ? "bg-white text-teal-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Table Row View"
                >
                  <List size={13} />
                  <span>Table</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Programmes Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {loadingPrograms ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold">Loading student programmes...</p>
                </div>
              ) : studentPrograms.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Programme Registrations Found</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    This student has not enrolled in any registered programmes yet.
                  </p>
                </div>
              ) : programViewMode === "card" ? (
                /* --- CARD VIEW --- */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {studentPrograms.map((p) => (
                    <div
                      key={p.Program_Code}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-teal-200 hover:shadow-md transition space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          #{p.Program_Code}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {p.WingCode || "General"}
                        </span>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={p.Program_Title}>
                          {p.Program_Title}
                        </h5>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {p.Date && (
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                              <Calendar size={11} /> {p.Date}
                            </span>
                          )}
                          {p.Venue && (
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                              <Building2 size={11} /> {p.Venue}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Position / Points Result Banner */}
                      {p.positionWon ? (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <Trophy size={13} className="text-amber-500" /> {p.positionWon}
                          </span>
                          <span className="font-black text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md text-[11px]">
                            +{p.pointsEarned} PTS
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-500 font-medium">
                          <span>Participant Entry</span>
                          <span className={p.IsConducted ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                            {p.IsConducted ? "Conducted" : "Upcoming"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* --- TABLE ROW VIEW --- */
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3.5">Code & Title</th>
                        <th className="py-3 px-3">Wing & Group</th>
                        <th className="py-3 px-3">Date & Venue</th>
                        <th className="py-3 px-3">Result / Position</th>
                        <th className="py-3 px-3 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentPrograms.map((p) => (
                        <tr key={p.Program_Code} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-bold text-indigo-600 text-[11px] block">
                              #{p.Program_Code}
                            </span>
                            <span className="font-bold text-slate-900 block truncate max-w-xs" title={p.Program_Title}>
                              {p.Program_Title}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <span className="font-semibold block">{p.WingCode || "General"}</span>
                            <span className="text-[11px] text-slate-400 block">{p.Group || "Assembly"}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <span className="block font-medium">{p.Date || "TBA"}</span>
                            <span className="text-[11px] text-slate-400 block">{p.Venue || "Campus Venue"}</span>
                          </td>
                          <td className="py-3 px-3">
                            {p.positionWon ? (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px]">
                                <Trophy size={11} className="text-amber-500" />
                                {p.positionWon}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Enrolled Candidate</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black">
                            {p.pointsEarned ? (
                              <span className="text-emerald-600 font-bold">+{p.pointsEarned} PTS</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}