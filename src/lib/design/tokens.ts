// Klarpakke Design Tokens - Bruk DISSE overalt

export const BRAND = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  primaryOutline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  
  // Vipps branding
  vipps: 'bg-[#FF5B24] hover:bg-[#E54E1B] text-white',
  
  // Tiers
  bachelor: 'bg-blue-600 hover:bg-blue-700 text-white',
  master: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  phd: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  professor: 'bg-amber-600 hover:bg-amber-700 text-white',
} as const;

export const RADIUS = {
  button: 'rounded-xl',       // Alle knapper
  card: 'rounded-2xl',        // Alle kort
  input: 'rounded-lg',        // Alle input-felt
  badge: 'rounded-full',      // Badges og tags
} as const;

export const SHADOW = {
  card: 'shadow-sm hover:shadow-md transition-shadow',
  button: 'shadow-sm active:shadow-none',
  modal: 'shadow-2xl',
} as const;

// Standardiserte Tailwind klasser for konsistent design
export const BUTTON = {
  primary: `${BRAND.primary} ${RADIUS.button} px-6 py-3 font-semibold shadow-sm transition-all duration-150 active:scale-95`,
  secondary: `${BRAND.secondary} ${RADIUS.button} px-6 py-3 font-semibold`,
  vipps: `${BRAND.vipps} ${RADIUS.button} px-6 py-3 font-semibold`,
  danger: `${BRAND.danger} ${RADIUS.button} px-6 py-3 font-semibold`,
} as const;

export const CARD = {
  default: `bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 shadow-sm p-6`,
  hover: `bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow p-6`,
} as const;
