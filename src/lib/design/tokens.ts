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

/**
 * Mapping mellom Klarpakke tokens og CDS theme vars.
 * Brukes når CDS-komponenter trenger eksplisitt fargebinding.
 */
export const CDS_THEME_MAP = {
  primary: "var(--cds-colors-interactive)",
  primaryHover: "var(--cds-colors-interactive-hovered)",
  bgBase: "var(--cds-colors-background)",
  bgRaised: "var(--cds-colors-background-elevated)",
  textPrimary: "var(--cds-colors-foreground)",
  textMuted: "var(--cds-colors-foreground-muted)",
  borderDefault: "var(--cds-colors-line)",
} as const;

/** Coinbase-inspired dark theme surfaces */
export const SURFACE = {
  // Dark theme (default) - Coinbase CDS colors
  BG: "bg-[#0a0b0d]",              // Deepest background
  BG_SECONDARY: "bg-[#161719]",    // Card/surface
  BG_TERTIARY: "bg-[#1a1c24]",     // Elevated
  BG_ELEVATED: "bg-[#1f2128]",     // Hover/elevated states
  BG_LIGHT: "bg-kp-bg-secondary",  // Light theme fallback
  BG_CARD: "bg-[#161719]",         // Card background
  BG_CARD_TRANSPARENT: "bg-[#161719]/90",
  
  // Border colors - subtle white opacity
  BORDER: "border-white/[0.08]",
  BORDER_LIGHT: "border-white/[0.05]",
  BORDER_STRONG: "border-white/[0.15]",
  BORDER_BRAND: "border-brand-500/50",

  // Glass morphism - consistent across app
  glass: {
    low: "bg-white/[0.03] backdrop-blur-md border border-white/[0.05]",
    medium: "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]",
    high: "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12]",
  },
  
  // Text colors
  TEXT: "text-white",
  TEXT_SECONDARY: "text-gray-400",  // gray-400 for secondary
  TEXT_MUTED: "text-gray-500",      // gray-500 for muted
  TEXT_SUBTLE: "text-gray-600",     // gray-600 for very subtle
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
  gradient: "bg-linear-to-br from-brand-500 to-brand-600",
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
  // Primary: Solid brand color
  primary: `${BRAND.primary} ${RADIUS.button} px-6 py-3 font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]`,
  // Secondary: Subtle background
  secondary: `${BRAND.secondary} ${RADIUS.button} px-6 py-3 font-semibold`,
  // Ghost: Transparent with border (Coinbase style)
  ghost: `bg-transparent hover:bg-white/[0.05] text-white border ${SURFACE.BORDER} hover:border-white/[0.15] ${RADIUS.button} px-6 py-3 font-semibold transition-all duration-200`,
  // Vipps branded
  vipps: `${BRAND.vipps} ${RADIUS.button} px-6 py-3 font-semibold`,
  // Status buttons
  danger: `${BRAND.danger} ${RADIUS.button} px-6 py-3 font-semibold`,
  success: `${BRAND.success} ${RADIUS.button} px-6 py-3 font-semibold`,
} as const;

export const CARD = {
  default: `${SURFACE.BG_CARD} ${RADIUS.card} border ${SURFACE.BORDER} shadow-sm p-6`,
  hover: `${SURFACE.BG_CARD} ${RADIUS.card} border ${SURFACE.BORDER} shadow-sm hover:shadow-md hover:border-white/[0.12] transition-all duration-200 p-6`,
  elevated: `${SURFACE.BG_ELEVATED} ${RADIUS.card} border ${SURFACE.BORDER} shadow-lg p-6`,
  dark: `${SURFACE.BG_SECONDARY} ${RADIUS.card} border ${SURFACE.BORDER} shadow-sm p-6`,
  darkHover: `${SURFACE.BG_SECONDARY} ${RADIUS.card} border ${SURFACE.BORDER} shadow-sm hover:shadow-md hover:border-white/[0.12] transition-all duration-200 p-6`,
  // Light theme variants
  light: `bg-white ${RADIUS.card} border border-gray-200 shadow-sm p-6`,
  lightHover: `bg-white ${RADIUS.card} border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-6`,
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
