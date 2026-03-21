// Klarpakke Design Tokens - Bruk DISSE overalt (samme stil på alle sider)
// Merke-farge: #0052FF (Coinbase-blå, kp-tokens.css --kp-accent)

/** Merke-farge #0052FF – bruk overalt for primær CTA og accent */
export const BRAND_COLOR = {
  DEFAULT: "#0052FF",
  HOVER: "#0047E0",
  LIGHT: "#3d7aff",
  MUTED: "rgba(0, 82, 255, 0.1)",
  BORDER: "rgba(0, 82, 255, 0.2)",
} as const;

/** Dark/light theme bakgrunn/border – konsistent på landing, priser, dashboard */
export const SURFACE = {
  BG: "bg-slate-950", // #0f172a
  BG_LIGHT: "bg-[#F7F8FA]", // lys landing/dashboard
  BG_ELEVATED: "bg-slate-900", // kort
  BG_CARD: "bg-slate-900/80", // kort med subtil transparens
  BORDER: "border-slate-800",
  BORDER_MUTED: "border-slate-800/80",
  TEXT: "text-white",
  TEXT_MUTED: "text-slate-400",
  TEXT_SUBTLE: "text-slate-500",
} as const;

export const BRAND = {
  primary: "bg-[#0052FF] hover:bg-[#0047E0] text-white",
  primaryOutline:
    "border-2 border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF]/10 dark:hover:bg-[#0052FF]/10",
  link: "text-[#0052FF] hover:text-[#0047E0] transition-colors",
  focusRing:
    "focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:ring-offset-2",
  /** For Radix Switch etc. */
  dataChecked: "data-[state=checked]:bg-[#0052FF]",
  gradient: "bg-gradient-to-br from-[#0052FF] to-[#0047E0]",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
  vipps: "bg-[#FF5B24] hover:bg-[#E54E1B] text-white",
  bachelor: "bg-blue-600 hover:bg-blue-700 text-white",
  master: "bg-emerald-600 hover:bg-emerald-700 text-white",
  phd: "bg-indigo-600 hover:bg-indigo-700 text-white",
  professor: "bg-amber-600 hover:bg-amber-700 text-white",
} as const;

export const RADIUS = {
  button: "rounded-xl",
  card: "rounded-2xl",
  input: "rounded-lg",
  badge: "rounded-full",
} as const;

export const SHADOW = {
  card: "shadow-sm hover:shadow-md transition-shadow duration-200",
  cardBrand: "shadow-lg shadow-[#0052FF]/10",
  button: "shadow-sm active:shadow-none",
  modal: "shadow-2xl",
} as const;

export const BUTTON = {
  primary: `${BRAND.primary} ${RADIUS.button} px-6 py-3 font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]`,
  secondary: `${BRAND.secondary} ${RADIUS.button} px-6 py-3 font-semibold`,
  vipps: `${BRAND.vipps} ${RADIUS.button} px-6 py-3 font-semibold`,
  danger: `${BRAND.danger} ${RADIUS.button} px-6 py-3 font-semibold`,
  ghost:
    "bg-transparent hover:bg-white/5 text-white border border-slate-700 hover:border-slate-600",
} as const;

export const CARD = {
  default: `bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 shadow-sm p-6`,
  hover: `bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 p-6`,
  dark: `${SURFACE.BG_ELEVATED} ${RADIUS.card} border border-slate-800 shadow-sm p-6`,
  darkHover: `${SURFACE.BG_ELEVATED} ${RADIUS.card} border border-slate-800 shadow-sm hover:shadow-md hover:border-slate-700 transition-all duration-200 p-6`,
} as const;

/** Hero/landing – gradient og CTA (samme merke #0052FF) */
export const HERO = {
  gradient: "from-[#0052FF] via-[#0041CC] to-slate-900",
  /** Tittel-accent (h1 del 2) — merke-spesifikk, mindre «generisk AI-gradient» */
  titleAccent:
    "bg-gradient-to-r from-sky-100 via-white to-blue-100 bg-clip-text text-transparent",
  /** Svakere ledd i h1 linje 2 (f.eks. «for at» / «penger») — lavere kontrast mot gradient */
  titleMuted: "text-blue-100/45 font-black",
  badge:
    "bg-[#0052FF]/20 backdrop-blur-sm text-white border border-[#0052FF]/40 rounded-full",
  ctaPrimary:
    "px-8 py-4 bg-[#0052FF] hover:bg-[#0041CC] text-white rounded-xl font-bold text-lg shadow-2xl shadow-[#0052FF]/30 hover:shadow-[#0052FF]/40 hover:scale-[1.02] transition-all duration-200",
  ctaSecondary:
    "px-8 py-4 bg-white text-[#0052FF] rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all duration-200",
} as const;

/** Tabeller: tall alltid tabular-nums, rader med hover */
export const TABLE = {
  cell: "px-4 py-3 text-sm",
  cellNumeric: "px-4 py-3 text-sm tabular-nums text-right",
  row: "border-b border-slate-800 hover:bg-slate-800/50 transition-colors duration-150",
  header:
    "px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider",
} as const;
