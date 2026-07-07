export default function SiteFooter() {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-900 font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold tracking-wider text-white text-sm uppercase">Panel</span>
          </div>
          <p className="text-xs line-height-relaxed text-slate-500">
            Secure back-office management infrastructure for donor accounting and ledger integrity.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#dashboard" className="hover:text-emerald-400 transition-colors">Dashboard Overview</a></li>
            <li><a href="#donors" className="hover:text-emerald-400 transition-colors">Donor Registry</a></li>
          </ul>
        </div>

        {/* System Health */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Data Node Status</h4>
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800/80 px-3 py-1.5 rounded-lg text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Supabase Synced
          </div>
        </div>

        {/* Legal Sign-off */}
        <div className="space-y-3 text-xs text-slate-500 md:text-right">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest md:hidden">Legal</h4>
          <p>© {new Date().getFullYear()} Darul Huda Islamic University.</p>
          <p className="text-[10px]">Confidential Internal Access Only.</p>
        </div>

      </div>
    </footer>
  );
}