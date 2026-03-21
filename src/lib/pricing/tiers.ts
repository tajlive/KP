/**
 * KLARPAKKE PRICING TIERS
 * Aggressiv freemium-strategi med 14-dagers trial
 * Designet for rask revenue-generering
 *
 * Kanonisk prisplan (produkt + Linear): docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md · Linear KLA-236
 */

import type { TierSlug } from "./tier-level";

export type { TierSlug } from "./tier-level";
export { getTierLevel, normalizeTier, VALID_TIER_SLUGS } from "./tier-level";

export const TIERS = {
  student: {
    slug: "student" as const,
    priceNOK: 0,
    badge: "Student",
    popular: false,
    features: [
      "Ubegrenset Paper Trading (100 000 kr lekepenger)",
      "14 dagers full prøveperiode på auto-trading",
      "Deretter 1 auto-trade-strategi på Student",
      "Real-time markedsdata og AI-læringsassistent",
      "Community og markedsoppdateringer",
      "500 KLT ved registrering",
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
      "Live trading på Binance",
      "3 live auto-trading-strategier",
      "Skatterapport (CSV/HTML for Skatteetaten)",
      "Kopier topp-tradere i paper-modus",
      "Teknisk analyse-masterclass + ukentlige webinarer",
      "Backtesting inntil 90 dager · 1 000 KLT/mnd",
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
      "7 live auto-trading-strategier",
      "Kopier topp-tradere i live-modus",
      "VIP trading-signaler og AI porteføljeoptimalisering",
      "Ubegrenset backtesting (365+ dager)",
      "Skatterapport inkludert",
      "Bachelor-sertifikat ved bestått eksamen · 2 500 KLT/mnd",
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
      "Ubegrenset live auto-trading-strategier",
      "Dedikert trading-rådgiver (1:1) og private alpha-signaler",
      "Avansert portefølje-AI og prioritert døgn-support",
      "Skatterapport inkludert",
      "Master-sertifikat ved bestått eksamen · 5 000 KLT/mnd",
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
      "Ukentlig 1:1-coaching med Tom Jensen",
      "Eksklusive alpha-strategier og skreddersydde strategier",
      "VIP founder-gruppe, white-glove support og tidlig tilgang",
      "Skatterapport inkludert",
      "Professor-sertifikat · 10 000 KLT/mnd",
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

export type Tier = (typeof TIERS)[TierSlug];

/** Sikrer at TIERS og tier-level.TierSlug holder seg i synk */
type _TierKeys = keyof typeof TIERS;
const _tierKeysAlign: TierSlug extends _TierKeys
  ? _TierKeys extends TierSlug
    ? true
    : never
  : never = true;
void _tierKeysAlign;
