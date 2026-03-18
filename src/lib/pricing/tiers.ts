/**
 * KLARPAKKE PRICING TIERS
 * Aggressiv freemium-strategi med 14-dagers trial
 * Designet for rask revenue-generering
 */

export const TIERS = {
  student: {
    slug: "student" as const,
    priceNOK: 0,
    badge: "Student",
    popular: false,
    features: [
      "Ubegrenset Paper Trading",
      "14-dagers Full Auto-Trading Trial",
      "1 auto-trade-strategi (oppgrader for flere)",
      "Real-time markedsdata",
      "AI Krypto-Professor",
      "Community tilgang",
      "500 KLT tokens ved registrering",
    ],
    certificate: null,
    vip: false,
    kltMonthly: 0,
    kltSignup: 500,

    // Auto-trading limits – tilgjengelig for alle; student får 1, oppgrader for flere
    autoTradingStrategies: 1,
    paperTradingStrategies: -1, // Ubegrenset paper
    liveTrading: false, // Blokkert etter trial
    trialDays: 14, // 14-dagers full trial

    // Feature flags
    canCopyTraders: false, // Kan ikke kopiere tradere
    canBacktest: true, // Backtesting tillatt
    canUseLiveSignals: false, // Ingen VIP-signaler
    maxBacktestDays: 30, // 30 dagers historikk
  },

  bachelor: {
    slug: "bachelor" as const,
    priceNOK: 249,
    badge: "Bachelor",
    popular: false,
    features: [
      "Alt i Student",
      "3 Live Auto-Trading Strategier",
      "Kopier topp-tradere (paper mode)",
      "Teknisk Analyse Masterclass",
      "Backtesting 90 dager",
      "Ukentlige Live-Webinarer",
      "1 000 KLT tokens/mnd",
    ],
    certificate: null,
    vip: false,
    kltMonthly: 1000,
    kltSignup: 0,

    autoTradingStrategies: 3,
    paperTradingStrategies: -1,
    liveTrading: true,
    trialDays: 0,

    canCopyTraders: true, // Paper copy-trading
    canBacktest: true,
    canUseLiveSignals: false,
    maxBacktestDays: 90,
  },

  master: {
    slug: "master" as const,
    priceNOK: 499,
    badge: "Master",
    popular: true,
    features: [
      "Alt i Bachelor",
      "7 Live Auto-Trading Strategier",
      "Kopier topp-tradere (LIVE mode)",
      "Ubegrenset Backtesting (365+ dager)",
      "VIP Trading Signaler",
      "AI Porteføljeoptimalisering",
      "Bachelor-sertifikat ved bestått eksamen",
      "2 500 KLT tokens/mnd",
    ],
    certificate: "bachelor",
    vip: false,
    kltMonthly: 2500,
    kltSignup: 0,

    autoTradingStrategies: 7,
    paperTradingStrategies: -1,
    liveTrading: true,
    trialDays: 0,

    canCopyTraders: true, // Live copy-trading
    canBacktest: true,
    canUseLiveSignals: true, // VIP-signaler
    maxBacktestDays: -1, // Ubegrenset
  },

  phd: {
    slug: "phd" as const,
    priceNOK: 999,
    badge: "PhD",
    popular: false,
    features: [
      "Alt i Master",
      "Ubegrenset Auto-Trading Strategier",
      "Dedikert Trading Rådgiver (1:1)",
      "Private Alpha-Signaler",
      "AI Porteføljeoptimalisering (Advanced)",
      "Prioritert support (døgnet rundt)",
      "Master-sertifikat ved bestått eksamen",
      "5 000 KLT tokens/mnd",
    ],
    certificate: "master",
    vip: false,
    kltMonthly: 5000,
    kltSignup: 0,

    autoTradingStrategies: -1, // Ubegrenset
    paperTradingStrategies: -1,
    liveTrading: true,
    trialDays: 0,

    canCopyTraders: true,
    canBacktest: true,
    canUseLiveSignals: true,
    hasDedicatedAdvisor: true,
    maxBacktestDays: -1,
  },

  professor: {
    slug: "professor" as const,
    priceNOK: 1999,
    badge: "Professor",
    popular: false,
    features: [
      "Alt i PhD",
      "1:1 Coaching med Tom Jensen (ukentlig)",
      "Private Alpha-Strategier (eksklusivt)",
      "VIP Founder-Gruppe",
      "White-glove Support",
      "Professor-sertifikat",
      "Tidlig tilgang til nye funksjoner",
      "Custom trading-strategier",
      "10 000 KLT tokens/mnd",
    ],
    certificate: "professor",
    vip: true,
    kltMonthly: 10000,
    kltSignup: 0,

    autoTradingStrategies: -1,
    paperTradingStrategies: -1,
    liveTrading: true,
    trialDays: 0,

    canCopyTraders: true,
    canBacktest: true,
    canUseLiveSignals: true,
    hasDedicatedAdvisor: true,
    hasPrivateCoaching: true,
    maxBacktestDays: -1,
  },
} as const;

export type TierSlug = keyof typeof TIERS;
export type Tier = (typeof TIERS)[TierSlug];

/** Kun disse slug-ene er gyldige – én kilde til sannhet for tier */
export const VALID_TIER_SLUGS: readonly TierSlug[] = [
  "student",
  "bachelor",
  "master",
  "phd",
  "professor",
] as const;

/** Nivå for tier-gate (0=student, 1=bachelor, 2=master, 3=phd, 4=professor) */
const TIER_LEVEL_ORDER: Record<TierSlug, number> = {
  student: 0,
  bachelor: 1,
  master: 2,
  phd: 3,
  professor: 4,
};

export function getTierLevel(slug: string): number {
  if (VALID_TIER_SLUGS.includes(slug as TierSlug)) {
    return TIER_LEVEL_ORDER[slug as TierSlug];
  }
  return 0; // ukjent/gammel tier → student-nivå
}

/** Normaliserer DB/string tier til gyldig TierSlug (ukjente → student) */
export function normalizeTier(tier: string | null | undefined): TierSlug {
  if (tier && VALID_TIER_SLUGS.includes(tier as TierSlug)) {
    return tier as TierSlug;
  }
  return "student";
}
