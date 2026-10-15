import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AdminProgrammesList from "../../AdminPanel/AdminProgrammesList/AdminProgrammesList";
import { resolveControllerProfile, type LoggedInControllerProfile } from "../../lib/controllerResolver";
import { Loader2 } from "lucide-react";

export default function ControllerProgrammesWrapper() {
  const { actController } = useParams<{ actController: string }>();
  const [controller, setController] = useState<LoggedInControllerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const profile = await resolveControllerProfile(actController);
        if (profile) setController(profile);
      } catch (err) {
        console.error("Error loading controller in wrapper:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [actController]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-bold text-slate-600">Loading Category Programmes Suite...</p>
      </div>
    );
  }

  return (
    <AdminProgrammesList
      controllerCategoryUuid={controller?.category_uuid || undefined}
      controllerCategoryName={controller?.category_title || "Assigned Category"}
      isControllerMode={true}
    />
  );
}
