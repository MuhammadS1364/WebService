
export default function OverViewClipBox({ BoxTitle, BoxValue, BoxSvgLogo }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 lg:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5">
      <div className="flex items-center justify-between gap-4">
        
        {/* Text Container */}
        <div className="flex flex-col space-y-1 sm:space-y-2 overflow-hidden">
          <p className="truncate text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {BoxTitle}
          </p>
          <p className="truncate text-2xl sm:text-3xl font-bold font-display text-foreground">
            {BoxValue}
          </p>
        </div>

        {/* Icon Container */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100/60 to-emerald-50/40 text-emerald-600 dark:from-emerald-900/20 dark:to-emerald-900/10 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110">
          {BoxSvgLogo}
        </div>
        
      </div>
    </div>
  );
}