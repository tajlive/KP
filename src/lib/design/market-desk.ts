/**
 * Premium «markedsdesk» — mørk glass, én visuell familie på tvers av
 * landing, dashboard og paper-trading signal-feed.
 */
export const MARKET_DESK = {
  /** Ytre panel (dashboard desk, kan nestes) */
  panel: [
    "rounded-2xl border border-slate-700/50",
    "bg-slate-900/75 backdrop-blur-md",
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
  ].join(" "),
  /** Landing / frittstående kort (litt lysere kant) */
  panelLanding: [
    "rounded-2xl border border-slate-700/50",
    "bg-slate-900/60 backdrop-blur-sm",
    "overflow-hidden relative",
  ].join(" "),
  headerBar: "border-b border-slate-700/40 px-4 py-3 md:px-5",
  section: "p-4 md:p-5 space-y-4",
  title:
    "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-2",
  subtitle: "text-[11px] text-slate-500 mt-0.5",
  row: [
    "group rounded-xl border border-slate-700/50",
    "bg-slate-800/45 px-3 py-2.5 md:px-3.5 md:py-3",
    "hover:border-[#0052FF]/35 hover:bg-slate-800/70",
    "transition-all duration-200",
  ].join(" "),
  rowHighlight:
    "ring-2 ring-[#0052FF]/45 ring-offset-2 ring-offset-slate-900 animate-pulse",
  rowDemo: "border-dashed border-slate-600/60 bg-slate-800/25",
  innerCard: [
    "rounded-xl border border-slate-700/40",
    "bg-slate-800/30 p-4",
    "hover:border-slate-600/50 transition-colors duration-200",
  ].join(" "),
} as const;
