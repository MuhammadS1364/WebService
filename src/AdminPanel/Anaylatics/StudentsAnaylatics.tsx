
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


import React, { useState, useEffect } from "react";
// @ts-ignore
import { SupaBaseFunction } from "../../lib/SupaBase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Line, Area
} from "recharts";

export interface Student {
  AddNo: string;
  StudentName: string | null;
  StudentEmail: string | null;
  FatherName: string | null;
  CollegeName: string | null;
  StnUserId: string | null;
  Class: string | null;
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
}

interface FilterState {
  Class: string;
  StnState: string;
  StnDistrict: string;
  CollegeName: string;
  IsActive: string;
}

interface FilterOptions {
  classes: string[];
  states: string[];
  districts: string[];
  colleges: string[];
}

const COLORS: string[] = ['#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4'];

export default function StudentsAnalyticsGeneral() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredData, setFilteredData] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<"Analytics" | "List">("Analytics");
  const [loading, setLoading] = useState<boolean>(true);

  const [filters, setFilters] = useState<FilterState>({
    Class: "", StnState: "", StnDistrict: "", CollegeName: "", IsActive: "true"
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    classes: [], states: [], districts: [], colleges: []
  });

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data, error } = await SupaBaseFunction.from("StudentsBox").select("*");
        if (error) throw error;

        const studentData = (data as Student[]) || [];
        setStudents(studentData);
        
        const extractUnique = (key: keyof Student): string[] => {
          const values = studentData.map((s) => s[key]).filter((v): v is string => typeof v === 'string' && v !== 'No Provided');
          return Array.from(new Set(values)).sort();
        };
        
        setFilterOptions({
          classes: extractUnique("Class"),
          states: extractUnique("StnState"),
          districts: extractUnique("StnDistrict"),
          colleges: extractUnique("CollegeName")
        });
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    let result = [...students];
    if (filters.Class) result = result.filter(s => s.Class === filters.Class);
    if (filters.StnState) result = result.filter(s => s.StnState === filters.StnState);
    if (filters.StnDistrict) result = result.filter(s => s.StnDistrict === filters.StnDistrict);
    if (filters.CollegeName) result = result.filter(s => s.CollegeName === filters.CollegeName);
    if (filters.IsActive !== "all") {
      const isActiveBool = filters.IsActive === "true";
      result = result.filter(s => s.IsActive === isActiveBool);
    }
    setFilteredData(result);
  }, [filters, students]);

  const handleExport = () => {
    const isFiltered = Object.values(filters).some(val => val !== "" && val !== "all");
    const message = isFiltered 
      ? `You have active filters. Export ${filteredData.length} filtered students?`
      : `Export all ${filteredData.length} students?`;

    if (window.confirm(message)) {
      const headers = [
        "AddNo", "StudentName", "StudentEmail", "CollegeName", "Class", 
        "State", "District", "Registrations", "Total_Anjuman_Points", 
        "OutReach_Points", "Achievement_Points", "Grand_Total_Points", "IsActive"
      ];
      const csvContent = [
        headers.join(","),
        ...filteredData.map(row => [
          `"${row.AddNo || ''}"`, `"${row.StudentName || ''}"`, `"${row.StudentEmail || ''}"`,
          `"${row.CollegeName || ''}"`, `"${row.Class || ''}"`, `"${row.StnState || ''}"`,
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
    const className = curr.Class || "Unassigned";
    acc[className] = acc[className] || { name: className, totalPoints: 0, studentCount: 0 };
    acc[className].totalPoints += (curr.Grand_Total_Points || 0);
    acc[className].studentCount += 1;
    return acc;
  }, {})).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm">
        <select name="Class" value={filters.Class} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Classes</option>
          {filterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="CollegeName" value={filters.CollegeName} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Colleges</option>
          {filterOptions.colleges.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="StnState" value={filters.StnState} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All States</option>
          {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="StnDistrict" value={filters.StnDistrict} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
          <option value="">All Districts</option>
          {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select name="IsActive" value={filters.IsActive} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
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
            <h3 className="text-base font-bold text-slate-700 mb-5">Student Distribution by District</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={studentsByDistrict} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value">
                    {studentsByDistrict.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="text-base font-bold text-slate-700 mb-5">Top 5 Outstanding Students</h3>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={topStudents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Legend wrapperStyle={{fontSize: '12px'}} />
                  <Area type="monotone" dataKey="total" name="Grand Total" fill="#cffafe" stroke="#0ea5e9" />
                  <Bar dataKey="achievements" name="Achievement Pts" barSize={30} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="outreach" name="Outreach Pts" stroke="#8b5cf6" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
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
                  <th className="p-4 border-b border-slate-200">Class / College</th>
                  <th className="p-4 border-b border-slate-200">Location</th>
                  <th className="p-4 border-b border-slate-200">Engagement</th>
                  <th className="p-4 border-b border-slate-200">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.map((student, idx) => (
                  <tr key={student.AddNo} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={student.Student_Photo_Urls || 'https://via.placeholder.com/40'} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.src = 'https://via.placeholder.com/40'; }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{student.StudentName}</div>
                          <div className="text-xs text-slate-500 truncate">#{student.AddNo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700">{student.Class || 'N/A'}</div>
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
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">No students match your current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}