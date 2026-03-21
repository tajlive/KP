import type { TierSlug } from "@/lib/pricing/tiers";
import { normalizeTier } from "@/lib/pricing/tiers";

/** Én kilde til sannhet: student | bachelor | master | phd | professor */
export type { TierSlug };

/** Plan query param → TierSlug (ukjent/gammel → student) */
export function planParamToTier(plan: string | null): TierSlug {
  if (!plan) return "student";
  return normalizeTier(plan);
}
export type BillingPeriod = "monthly" | "annual";

/** Synk med checkout-UI for planer som har prøveperiode i Stripe (Master, PhD, Professor). */
export const TRIAL_DAYS = 14;

/** Stripe Checkout: Bachelor har ingen prøveperiode; øvrige betalte planer bruker `TRIAL_DAYS`. */
export function getStripeCheckoutTrialDays(tier: TierSlug): number | undefined {
  if (tier === "bachelor") return undefined;
  if (tier === "student") return undefined;
  return TRIAL_DAYS;
}

export interface TierFeatures {
  coursesIncluded: string[];
  maxSimulatorTrades: number;
  hasAdvancedCourses: boolean;
  hasCertification: boolean;
  hasWebinars: boolean;
  hasExtraResources: boolean;
  supportResponseHours: number | null;
  prioritySupport: boolean;
}

export type CurrencyCode = "NOK" | "EUR" | "USD";
export const VALID_CURRENCIES: CurrencyCode[] = ["NOK", "EUR", "USD"];

export interface PriceConfig {
  amount: number;
  currency: CurrencyCode;
  priceId: string;
}

export interface TierConfig {
  name: TierSlug;
  displayName: Record<string, string>;
  description: Record<string, string>;
  prices: Record<
    CurrencyCode,
    {
      monthly: PriceConfig;
      annual: PriceConfig;
    }
  >;
  isRecommended: boolean;
  color: "slate" | "blue" | "emerald" | "amber";
  features: TierFeatures;
  ctaText: Record<string, string>;
  ctaVariant: "default" | "primary" | "ghost";
}

export const CURRENCY_MAP: Record<string, CurrencyCode> = {
  no: "NOK",
  en: "EUR", // Default for international English
  us: "USD",
};

export const TIER_CONFIGS: Record<TierSlug, TierConfig> = {
  student: {
    name: "student",
    displayName: {
      no: "Student",
      en: "Student",
    },
    description: {
      no: "Prøv før du kjøper",
      en: "Try before you buy",
    },
    prices: {
      NOK: {
        monthly: { amount: 0, currency: "NOK", priceId: "" },
        annual: { amount: 0, currency: "NOK", priceId: "" },
      },
      EUR: {
        monthly: { amount: 0, currency: "EUR", priceId: "" },
        annual: { amount: 0, currency: "EUR", priceId: "" },
      },
      USD: {
        monthly: { amount: 0, currency: "USD", priceId: "" },
        annual: { amount: 0, currency: "USD", priceId: "" },
      },
    },
    isRecommended: false,
    color: "slate",
    ctaText: {
      no: "Start gratis",
      en: "Start Free",
    },
    ctaVariant: "ghost",
    features: {
      coursesIncluded: ["krypto-101-modul-1"],
      maxSimulatorTrades: 5,
      hasAdvancedCourses: false,
      hasCertification: false,
      hasWebinars: false,
      hasExtraResources: false,
      supportResponseHours: null,
      prioritySupport: false,
    },
  },

  bachelor: {
    name: "bachelor",
    displayName: {
      no: "Bachelor",
      en: "Bachelor",
    },
    description: {
      no: "Perfekt for nybegynnere",
      en: "Perfect for beginners",
    },
    prices: {
      NOK: {
        monthly: {
          amount: 249,
          currency: "NOK",
          priceId: "price_1T4QVJCGsVawsLofgt9uuOcU",
        },
        annual: {
          amount: 2490,
          currency: "NOK",
          priceId: "price_1T0xPuCGsVawsLofpjwMiqBx",
        },
      },
      EUR: {
        monthly: {
          amount: 22,
          currency: "EUR",
          priceId: "price_1TD5UECGsVawsLof3Zq0XC0N",
        },
        annual: {
          amount: 220,
          currency: "EUR",
          priceId: "price_1TD5XUCGsVawsLofXlcxk5A1",
        },
      },
      USD: {
        monthly: {
          amount: 25,
          currency: "USD",
          priceId: "price_1TD5UECGsVawsLofmqsT6zeV",
        },
        annual: {
          amount: 250,
          currency: "USD",
          priceId: "price_1TD5XVCGsVawsLofOqWoAoyR",
        },
      },
    },
    isRecommended: false,
    color: "slate",
    ctaText: {
      no: "Start Bachelor",
      en: "Start Bachelor",
    },
    ctaVariant: "default",
    features: {
      coursesIncluded: ["krypto-101", "intro-teknisk-analyse"],
      maxSimulatorTrades: 999999,
      hasAdvancedCourses: false,
      hasCertification: false,
      hasWebinars: false,
      hasExtraResources: false,
      supportResponseHours: 48,
      prioritySupport: false,
    },
  },

  master: {
    name: "master",
    displayName: {
      no: "Master",
      en: "Master",
    },
    description: {
      no: "Alt du trenger for å mestre trading",
      en: "Everything you need to master trading",
    },
    prices: {
      NOK: {
        monthly: {
          amount: 499,
          currency: "NOK",
          priceId: "price_1T4QVKCGsVawsLofr8NPcL6g",
        },
        annual: {
          amount: 4990,
          currency: "NOK",
          priceId: "price_1T0xQ0CGsVawsLof0rCLtxhV",
        },
      },
      EUR: {
        monthly: {
          amount: 45,
          currency: "EUR",
          priceId: "price_1TD5UECGsVawsLofd2IVqjqz",
        },
        annual: {
          amount: 450,
          currency: "EUR",
          priceId: "price_1TD5XWCGsVawsLoftCdFoaKP",
        },
      },
      USD: {
        monthly: {
          amount: 49,
          currency: "USD",
          priceId: "price_1TD5UECGsVawsLofRg6WfI78",
        },
        annual: {
          amount: 490,
          currency: "USD",
          priceId: "price_1TD5XWCGsVawsLofbDiSzmj1",
        },
      },
    },
    isRecommended: true,
    color: "blue",
    ctaText: {
      no: "Start Master",
      en: "Start Master",
    },
    ctaVariant: "primary",
    features: {
      coursesIncluded: [
        "krypto-101",
        "teknisk-analyse",
        "risk-management",
        "portfolio-management",
        "trading-psykologi",
      ],
      maxSimulatorTrades: 999999,
      hasAdvancedCourses: true,
      hasCertification: true,
      hasWebinars: true,
      hasExtraResources: false,
      supportResponseHours: 24,
      prioritySupport: false,
    },
  },

  phd: {
    name: "phd",
    displayName: {
      no: "PhD",
      en: "PhD",
    },
    description: {
      no: "For seriøse studenter",
      en: "For serious students",
    },
    prices: {
      NOK: {
        monthly: {
          amount: 999,
          currency: "NOK",
          priceId: "price_1T4QVKCGsVawsLofz1US0uVZ",
        },
        annual: {
          amount: 9990,
          currency: "NOK",
          priceId: "price_1TD5XaCGsVawsLof2WPouGjI",
        },
      },
      EUR: {
        monthly: {
          amount: 89,
          currency: "EUR",
          priceId: "price_1T0xQ7CGsVawsLofAbXglvOp",
        },
        annual: {
          amount: 890,
          currency: "EUR",
          priceId: "price_1T0xQ8CGsVawsLofm3hJi4nn",
        },
      },
      USD: {
        monthly: {
          amount: 99,
          currency: "USD",
          priceId: "price_1TD5UHCGsVawsLofVsnaqzju",
        },
        annual: {
          amount: 990,
          currency: "USD",
          priceId: "price_1T0xQ9CGsVawsLofDqN4ZkPH",
        },
      },
    },
    isRecommended: false,
    color: "amber",
    ctaText: {
      no: "Velg PhD",
      en: "Choose PhD",
    },
    ctaVariant: "default",
    features: {
      coursesIncluded: [
        "krypto-101",
        "teknisk-analyse",
        "risk-management",
        "portfolio-management",
        "trading-psykologi",
        "avanserte-strategier",
        "markedsmakro",
      ],
      maxSimulatorTrades: 999999,
      hasAdvancedCourses: true,
      hasCertification: true,
      hasWebinars: true,
      hasExtraResources: true,
      supportResponseHours: 12,
      prioritySupport: true,
    },
  },

  professor: {
    name: "professor",
    displayName: { no: "Professor", en: "Professor" },
    description: { no: "VIP og 1:1 coaching", en: "VIP and 1:1 coaching" },
    prices: {
      NOK: {
        monthly: {
          amount: 1999,
          currency: "NOK",
          priceId: "price_1T4QVLCGsVawsLofgMEbOBJA",
        },
        annual: {
          amount: 19990,
          currency: "NOK",
          priceId: "price_1TD5XdCGsVawsLofXPUaShSU",
        },
      },
      EUR: {
        monthly: {
          amount: 175,
          currency: "EUR",
          priceId: "price_1TD5UHCGsVawsLofU8a1xR2R",
        },
        annual: {
          amount: 1750,
          currency: "EUR",
          priceId: "price_1TD5XdCGsVawsLofPJufBcMk",
        },
      },
      USD: {
        monthly: {
          amount: 190,
          currency: "USD",
          priceId: "price_1TD5UHCGsVawsLof59k680pJ",
        },
        annual: {
          amount: 1900,
          currency: "USD",
          priceId: "price_1TD5XdCGsVawsLof8pKnV12d",
        },
      },
    },
    isRecommended: false,
    color: "amber",
    ctaText: { no: "Velg Professor", en: "Choose Professor" },
    ctaVariant: "default",
    features: {
      coursesIncluded: [
        "krypto-101",
        "teknisk-analyse",
        "risk-management",
        "portfolio-management",
        "trading-psykologi",
        "avanserte-strategier",
        "markedsmakro",
      ],
      maxSimulatorTrades: 999999,
      hasAdvancedCourses: true,
      hasCertification: true,
      hasWebinars: true,
      hasExtraResources: true,
      supportResponseHours: 0,
      prioritySupport: true,
    },
  },
};

export const TIER_ORDER: TierSlug[] = [
  "student",
  "bachelor",
  "master",
  "phd",
  "professor",
];

export function getTierConfig(tier: TierSlug): TierConfig {
  return TIER_CONFIGS[tier];
}

export function getDisplayName(tier: TierSlug, locale: string = "en"): string {
  const c = TIER_CONFIGS[tier];
  return c?.displayName[locale] ?? c?.displayName["en"] ?? tier;
}

export function getDescription(tier: TierSlug, locale: string = "en"): string {
  const c = TIER_CONFIGS[tier];
  return c?.description[locale] ?? c?.description["en"] ?? "";
}

export function getCtaText(tier: TierSlug, locale: string = "en"): string {
  const c = TIER_CONFIGS[tier];
  return c?.ctaText[locale] ?? c?.ctaText["en"] ?? "";
}

export function getPrice(
  tier: TierSlug,
  period: BillingPeriod,
  currency: CurrencyCode = "NOK",
): number {
  const config = TIER_CONFIGS[tier];
  if (!config) return 0;
  return period === "monthly"
    ? config.prices[currency].monthly.amount
    : config.prices[currency].annual.amount;
}

export function getPriceId(
  tier: TierSlug,
  period: BillingPeriod,
  currency: CurrencyCode = "NOK",
): string {
  const config = TIER_CONFIGS[tier];
  if (!config) return "";
  return period === "monthly"
    ? config.prices[currency].monthly.priceId
    : config.prices[currency].annual.priceId;
}

const TIER_STRIPE_ENV_SLUG: Record<Exclude<TierSlug, "student">, string> = {
  bachelor: "BACHELOR",
  master: "MASTER",
  phd: "PHD",
  professor: "PROFESSOR",
};

function readStripePriceEnv(key: string): string {
  if (typeof process === "undefined") return "";
  const v = process.env[key];
  return typeof v === "string" && v.startsWith("price_") ? v : "";
}

/** Env-nøkler i prioritert rekkefølge (første treff vinner). */
export function subscriptionStripePriceEnvKeys(
  tier: TierSlug,
  currency: CurrencyCode,
): string[] {
  if (tier === "student") return [];
  const slug = TIER_STRIPE_ENV_SLUG[tier];
  if (!slug) return [];
  if (currency === "NOK") {
    return [
      `NEXT_PUBLIC_STRIPE_PRICE_${slug}_NOK`,
      `NEXT_PUBLIC_STRIPE_PRICE_${slug}`,
    ];
  }
  return [`NEXT_PUBLIC_STRIPE_PRICE_${slug}_${currency}`];
}

/**
 * Stripe Price ID for abonnement: env overstyrer `TIER_CONFIGS` (for Vercel uten å committe price_).
 */
export function getResolvedSubscriptionPriceId(
  tier: TierSlug,
  period: BillingPeriod,
  currency: CurrencyCode,
): string {
  if (tier === "student") return "";
  for (const key of subscriptionStripePriceEnvKeys(tier, currency)) {
    const id = readStripePriceEnv(key);
    if (id) return id;
  }
  return getPriceId(tier, period, currency);
}

export function listSubscriptionPriceIdsForTier(tier: TierSlug): string[] {
  const ids: string[] = [];
  if (tier === "student") return ids;
  for (const cur of VALID_CURRENCIES) {
    for (const per of ["monthly", "annual"] as BillingPeriod[]) {
      const id = getResolvedSubscriptionPriceId(tier, per, cur);
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

export function isPriceIdAllowedForTier(
  tier: TierSlug,
  priceId: string,
): boolean {
  if (!priceId.startsWith("price_")) return false;
  return listSubscriptionPriceIdsForTier(tier).includes(priceId);
}

export function findTierBySubscriptionPriceId(
  priceId: string,
): TierSlug | null {
  if (!priceId.startsWith("price_")) return null;
  for (const tier of TIER_ORDER) {
    if (tier === "student") continue;
    if (isPriceIdAllowedForTier(tier, priceId)) return tier;
  }
  return null;
}

export function parseCheckoutCurrency(raw: unknown): CurrencyCode {
  const u = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (u === "EUR" || u === "USD" || u === "NOK") return u;
  return "NOK";
}

/** Visningsformat for kasse (monthly amount). */
export function formatTierMoneyDisplay(
  amount: number,
  currency: CurrencyCode,
  locale: string,
): string {
  const intlLocale = locale === "no" ? "nb-NO" : "en-US";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAnnualSavings(
  tier: TierSlug,
  currency: CurrencyCode = "NOK",
): number {
  const config = TIER_CONFIGS[tier];
  if (!config) return 0;
  const monthlyPrice = config.prices[currency].monthly.amount;
  const annualPrice = config.prices[currency].annual.amount;
  if (monthlyPrice === 0) return 0;
  return monthlyPrice * 12 - annualPrice;
}

export function canAccessFeature(tier: TierSlug, feature: string): boolean {
  const featureMatrix: Record<string, TierSlug[]> = {
    "tax-report": ["bachelor", "master", "phd", "professor"],
    "advanced-courses": ["master", "phd", "professor"],
    certification: ["master", "phd", "professor"],
    webinars: ["master", "phd", "professor"],
    "extra-resources": ["phd", "professor"],
    "priority-support": ["phd", "professor"],
    "unlimited-simulator": ["bachelor", "master", "phd", "professor"],
  };
  return featureMatrix[feature]?.includes(tier) ?? false;
}
