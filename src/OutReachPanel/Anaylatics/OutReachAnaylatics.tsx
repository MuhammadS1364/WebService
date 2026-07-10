// import { useState,useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import { useParams } from "react-router-dom";

// // create table public."StudentsAchievements" (
// //   "Achieve_Id" uuid not null default gen_random_uuid (),
// //   "Achiever_Name" character varying null,
// //   "Achievement_Title" character varying null,
// //   "Achievement_Type" character varying null,
// //   "Position_Achieved" character varying null,
// //   "Achieve_Descriptin" text null,
// //   "Point_Obtained" integer null default 0,
// //   "StnAddNo" character varying null,
// //   constraint StudentsAchievements_pkey primary key ("Achieve_Id")
// // ) TABLESPACE pg_default;

// // create table public."StudentsOutReach" (
// //   "OutReach_Id" uuid not null default gen_random_uuid (),
// //   created_at time without time zone not null,
// //   "OutReach_Holder" character varying null,
// //   "OutReach_Title" character varying null,
// //   "OutReach_Type" character varying null,
// //   "Position_Achieved" character varying null,
// //   "OutReach_Descriptin" text null,
// //   "Point_Obtained" integer null default 0,
// //   "StnAddNo" character varying null,
// //   constraint StudentsOutReach_pkey primary key ("OutReach_Id")
// // ) TABLESPACE pg_default;

// // create table public."StudentsBox" (
// //   "AddNo" character varying not null,
// //   "StudentName" character varying null,
// //   "StudentEmail" character varying null,
// //   "FatherName" character varying null,
// //   "CollegeName" character varying null,
// //   "StnUserId" character varying null,
// //   "Class" character varying null,
// //   "Registration_Count" integer null default 0,
// //   "Resluted_Count" integer null default 0,
// //   "Total_Point_Anjuman" integer null default 0,
// //   "OutReach_Count" integer null default 0,
// //   "OutReach_Points" integer null default 0,
// //   "Achievements_Counts" integer null default 0,
// //   "Achievements_Points" integer null default 0,
// //   "Grand_Total_Points" integer null default 0,
// //   "IsActive" boolean null default true,
// //   "Student_Photo_Urls" character varying null default 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRO1QLsyDIL5S8tTQ5ZKXjFe9wxiVZ7O9-lOnJgJO3-Bg&s=10'::character varying,
// //   constraint StudentsBox_pkey primary key ("AddNo")
// // ) TABLESPACE pg_default;

// export default function OutReachAnaylatics(){
//     return(

// // full filter featrur we can filter the data by these colums : "Achievement_Type","Achiever_Name(display will name for uniqe vale of th colmn)", "Position_Achieved" in acchievemetn table 
// //  in outreach tabel colum : "OutReach_Holder(unique value of colums )", "Position_Achieved",OutReach_Type"
// // can import and export data in these two table 

// // multiple selection futede and appaly action like delete export the selection rows from table (n row exported)
// // for import column order in both "StnAddNo" match the add no to student table and update the point  
// //  for outreach import "OutReach_Count" updat vie each matched entry wiht +1 and "OutReach_Points" update with the vale that obtainde in ourt reach table : "Point_Obtained" and at last update the 
// //  "Grand_Total_Points" in student 
// // for achievmetn impot: "Achievements_Counts" updat vie each matched entry wiht +1 and "Achievements_Points" update with the vale that obtainde in ourt reach table : "Point_Obtained" and at last update the 
// //  "Grand_Total_Points" in student 

// // ourt Reach tabel impoort column order : "StnAddNo","OutReach_Title","OutReach_Type","Position_Achieved","OutReach_Descriptin","Point_Obtained", show in small text in header
// // achievme tbale impot coumn order : "StnAddNo","Achievement_Title","Achievement_Type","Position_Achieved","Achieve_Descriptin","Point_Obtained", shwo in small text 
// // set a preview for the importing data befor saving ot data base 

//     )
// }

import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Edit2,} from "lucide-react";

export default function OutReachAnaylatics() {
  const { actOutReach } = useParams<{ actOutReach: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"achievements" | "outreach">("achievements");
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const table = activeTab === "achievements" ? "StudentsAchievements" : "StudentsOutReach";
    const { data } = await SupaBaseFunction.from(table).select("*");
    setData(data || []);
  };

  // Helper for column headers based on active tab
  const getColumns = () => {
    return activeTab === "achievements" 
      ? ["AddNo", "Title", "Type", "Position", "Description", "Points"]
      : ["AddNo", "Title", "Type", "Position", "Description", "Points"];
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analytics Panel</h1>
        <div className="flex bg-white rounded-lg border p-1 shadow-sm">
          {["achievements", "outreach"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-md capitalize transition ${activeTab === tab ? "bg-blue-600 text-white shadow-md" : "hover:text-blue-600"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-4">Select</th>
              {getColumns().map((col) => <th key={col} className="p-4 font-semibold">{col}</th>)}
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const id = row.Achieve_Id || row.OutReach_Id;
              const route = activeTab === "achievements" 
                ? `/outreach-panel/${actOutReach}/edite-achievement/${id}`
                : `/outreach-panel/${actOutReach}/edite-outreach/${id}`;

              return (
                <tr key={id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-4"><input type="checkbox" /></td>
                  <td className="p-4 text-sm">{row.StnAddNo}</td>
                  <td className="p-4 text-sm font-medium">{row.Achievement_Title || row.OutReach_Title}</td>
                  <td className="p-4 text-sm">{row.Achievement_Type || row.OutReach_Type}</td>
                  <td className="p-4 text-sm">{row.Position_Achieved}</td>
                  <td className="p-4 text-xs text-gray-400 truncate max-w-[150px]">{row.Achieve_Descriptin || row.OutReach_Descriptin}</td>
                  <td className="p-4 text-sm font-bold text-blue-600">{row.Point_Obtained}</td>
                  <td className="p-4 flex justify-center gap-3">
                    <button 
                      onClick={() => navigate(route)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}