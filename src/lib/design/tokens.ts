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
  BG_LIGHT: "bg-kp-bg-secondary", // #F7F8FA — theme, ikke arbitrary hex
  BG_ELEVATED: "bg-slate-900", // kort
  BG_CARD: "bg-slate-900/80", // kort med subtil transparens
  BORDER: "border-slate-800",
  BORDER_MUTED: "border-slate-800/80",
  TEXT: "text-white",
  TEXT_MUTED: "text-slate-400",
  TEXT_SUBTLE: "text-slate-500",
} as const;

export const BRAND = {
  primary: "bg-brand-500 hover:bg-brand-600 text-white",
  primaryOutline:
    "border-2 border-brand-500 text-brand-500 hover:bg-brand-500/10 dark:hover:bg-brand-500/10",
  link: "text-brand-500 hover:text-brand-600 transition-colors",
  focusRing:
    "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
  /** For Radix Switch etc. */
  dataChecked: "data-[state=checked]:bg-brand-500",
  gradient: "bg-gradient-to-br from-brand-500 to-brand-600",
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
  cardBrand: "shadow-lg shadow-brand-500/10",
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
  gradient: "from-brand-500 via-brand-600 to-slate-900",
  /** Tittel-accent (h1 del 2) — merke-spesifikk, mindre «generisk AI-gradient» */
  titleAccent:
    "bg-gradient-to-r from-sky-100 via-white to-blue-100 bg-clip-text text-transparent",
  /** Svakere ledd i h1 linje 2 (f.eks. «for at» / «penger») — lavere kontrast mot gradient */
  titleMuted: "text-blue-100/45 font-black",
  badge:
    "bg-brand-500/20 backdrop-blur-sm text-white border border-brand-500/40 rounded-full",
  ctaPrimary:
    "px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/40 hover:scale-[1.02] transition-all duration-200",
  ctaSecondary:
    "px-8 py-4 bg-white text-brand-500 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all duration-200",
} as const;

/** Tabeller: tall alltid tabular-nums, rader med hover */
export const TABLE = {
  cell: "px-4 py-3 text-sm",
  cellNumeric: "px-4 py-3 text-sm tabular-nums text-right",
  row: "border-b border-slate-800 hover:bg-slate-800/50 transition-colors duration-150",
  header:
    "px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider",
} as const;
