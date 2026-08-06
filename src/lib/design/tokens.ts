// Klarpakke Design Tokens - Bruk DISSE overalt (samme stil på alle sider)
// Merke-farge: #0052FF (Coinbase-blå, kp-tokens.css --kp-accent)

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

/**
 * @deprecated Use `kp-*` Tailwind tokens instead. Skal fjernes når alle 14 gjenværende
 * referanser er migrert. Mapping: BG -> bg-kp-bg-primary etc.
 */
export const SURFACE = {
  BG: "bg-[#0a0b0d]", BG_SECONDARY: "bg-[#161719]", BG_TERTIARY: "bg-[#1a1c24]",
  BG_ELEVATED: "bg-[#1f2128]", BG_LIGHT: "bg-kp-bg-secondary", BG_CARD: "bg-[#161719]",
  BG_CARD_TRANSPARENT: "bg-[#161719]/90",
  BORDER: "border-white/[0.08]", BORDER_LIGHT: "border-white/[0.05]",
  BORDER_STRONG: "border-white/[0.15]", BORDER_BRAND: "border-brand-500/50",
  glass: {
    low: "bg-white/[0.03] backdrop-blur-md border border-white/[0.05]",
    medium: "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]",
    high: "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12]",
  },
  TEXT: "text-white", TEXT_SECONDARY: "text-gray-400",
  TEXT_MUTED: "text-gray-500", TEXT_SUBTLE: "text-gray-600",
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
  vipps: "bg-[#ff5b24] hover:bg-[#e54e1b] text-white",
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

/** Motion easing curves — consistent across all dashboard animations */
export const MOTION = {
  /** Standard ease-out for entrances */
  easeOut: [0.25, 0.46, 0.45, 0.94] as const,
  /** Spring config for interactive elements */
  spring: { type: "spring" as const, stiffness: 400, damping: 28 },
  /** Staggered children delay factor */
  staggerChildren: 0.06,
  /** Page transition duration */
  pageDuration: 0.35,
} as const;

/** Mobile-first design constraints */
export const MOBILE = {
  /** Minimum touch target (WCAG 2.5.5 Target Size) */
  touchTarget: "min-h-[44px] min-w-[44px]",
  /** Safe area padding for bottom nav */
  safeBottom: "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
  /** Tight padding for mobile, normal for desktop */
  responsivePadding: "px-3 sm:px-4 lg:px-8",
  /** Gap scaling */
  responsiveGap: "gap-3 sm:gap-4 lg:gap-6",
} as const;


