import { useMemo } from "react";
import SafeImage from "../lib/SafeImage";

interface ActiveUserCardProps {
  Panel: string;
  UserName: string;
  userPhoto?: string;
  roleType?: "student" | "wing" | "treasurer" | "outreach";
}

export default function ActiveUserCard({ Panel, UserName, userPhoto, roleType = "student" }: ActiveUserCardProps) {
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "☀️ Good Morning";
    if (hours < 17) return "🌤️ Good Afternoon";
    return "🌙 Good Evening";
  }, []);

  return (
    <div className="relative overflow-hidden bg-white border border-slate-200/90 p-4 sm:p-6 md:p-7 shadow-xs rounded-3xl mb-4 sm:mb-6">
      
      {/* Subtle Light Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl pointer-events-none" />

      {/* Responsive layout: stacks on mobile (< 640px), row on tablet/desktop */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {greeting}
            </span>

            <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide text-slate-700">
              {Panel}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
            Welcome back,{" "}
            <span className="text-indigo-600">
              {UserName}
            </span>
          </h2>

          <p className="mt-1 sm:mt-1.5 text-xs text-slate-500 font-medium line-clamp-1">
            Darul Huda Islamic University — National Institute of Islamic & Contemporary Studies
          </p>
        </div>

        {/* Real User Photo Avatar */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <div className="h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs overflow-hidden shrink-0 select-none p-1">
            {userPhoto ? (
              <SafeImage
                src={userPhoto}
                alt={UserName}
                fallbackCategory={roleType === "wing" ? "wing" : "student"}
                fallbackText={UserName}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg sm:text-2xl">
                {(UserName || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
