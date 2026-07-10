
// import { useState,useEffect } from "react";
// import { SupaBaseFunction } from "../../lib/SupaBase";
// import { useParams } from "react-router-dom";


// export default function EditeAchievement(){
//     return(
//         // Achieve_Id will catch from urls 
//         // find the recode in the tabel and loade the record 
//         // save the canges 
//     )
// }


import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";
import { useParams, useNavigate } from "react-router-dom";

// Assume these constants are imported or shared from a common file
const ACHIEVEMENT_TYPES = ["Essay", "Story", "NewsPaper", "Speech", "Teaching", "Poem", "Book Review", "Research Papper", "Magazine", "Other"];
const POSITION_POINTS: Record<string, number> = { "First": 7, "Second": 5, "Third": 3, "Accepted": 5, "Magazine": 7, "Research Papper": 10, "NewsPaper": 7, "Speech teaching": 5, "Book Review": 5, "Qualified": 3, "TillFinalRound": 3, "Other": 3 };

export default function EditeAchievement() {
  const { Achieve_Id } = useParams<{ Achieve_Id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    stnAddNo: "",
    title: "",
    type: "Essay",
    position: "First",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Fetch current record on mount
  useEffect(() => {
    async function fetchAchievement() {
      if (!Achieve_Id) return;
      const { data, error } = await SupaBaseFunction
        .from("StudentsAchievements")
        .select("*")
        .eq("Achieve_Id", Achieve_Id)
        .single();

      if (error) {
        setError("Failed to load achievement.");
      } else {
        setFormData({
          stnAddNo: data.StnAddNo,
          title: data.Achievement_Title,
          type: data.Achievement_Type,
          position: data.Position_Achieved,
          description: data.Achieve_Descriptin,
        });
      }
      setLoading(false);
    }
    fetchAchievement();
  }, [Achieve_Id]);

  // 2. Handle Update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const pointsGained = POSITION_POINTS[formData.position] || 0;

    const { error } = await SupaBaseFunction
      .from("StudentsAchievements")
      .update({
        Achievement_Title: formData.title,
        Achievement_Type: formData.type,
        Position_Achieved: formData.position,
        Achieve_Descriptin: formData.description,
        Point_Obtained: pointsGained,
      })
      .eq("Achieve_Id", Achieve_Id);

    if (error) {
      setError("Failed to update record: " + error.message);
      setLoading(false);
    } else {
      alert("Updated successfully!");
      navigate(-1); // Go back
    }
  };

  if (loading) return <div className="p-10 text-center">Loading record...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow border">
      <h2 className="text-2xl font-bold mb-6">Edit Achievement</h2>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Title</label>
          <input 
            className="w-full p-3 border rounded-lg"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-1">Category</label>
          <select 
            className="w-full p-3 border rounded-lg"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            {ACHIEVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button 
          type="submit" 
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}