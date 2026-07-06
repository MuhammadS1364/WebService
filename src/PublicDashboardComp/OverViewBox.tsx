
export default function OverviewClipBox({ 
  BoxTitle, 
  BoxValue, 
  BoxSvgLogo, 
  variant = "emerald" 
}) {
  
  // Dynamic color configuration mapper
  // Note: Boosted dark mode opacities slightly for better contrast against slate-900
  const colorThemes = {
    emerald: "from-emerald-100/60 to-emerald-50/40 text-emerald-600 dark:from-emerald-900/40 dark:to-emerald-900/20 dark:text-emerald-400",
    blue: "from-blue-100/60 to-blue-50/40 text-blue-600 dark:from-blue-900/40 dark:to-blue-900/20 dark:text-blue-400",
    amber: "from-amber-100/60 to-amber-50/40 text-amber-600 dark:from-amber-900/40 dark:to-amber-900/20 dark:text-amber-400",
    rose: "from-rose-100/60 to-rose-50/40 text-rose-600 dark:from-rose-900/40 dark:to-rose-900/20 dark:text-rose-400",
  };

  // Fallback to emerald if an invalid variant is passed
  const activeTheme = colorThemes[variant] || colorThemes.emerald;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-slate-900/50">
      <div className="flex items-center justify-between gap-4">
        
        {/* Text Container */}
        <div className="flex min-w-0 flex-col space-y-1">
          <h3 className="truncate text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {BoxTitle}
          </h3>
          <p className="truncate text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {BoxValue}
          </p>
        </div>

        {/* Dynamic BoxSvgLogo Container Wrapper */}
        <div 
          aria-hidden="true" 
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 ${activeTheme}`}
        >
          {/* Ensure SVGs passed as BoxSvgLogos have standardized sizes (e.g., w-6 h-6) */}
          {BoxSvgLogo}
        </div>
        
      </div>
    </article>
  );
}