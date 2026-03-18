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

export const TRIAL_DAYS = 7;

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
          priceId: "price_1T0xPuCGsVawsLofpoqCMBIS",
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
          priceId: "price_1T0xPvCGsVawsLof7TSfsQ55",
        },
        annual: {
          amount: 220,
          currency: "EUR",
          priceId: "price_1T0xPwCGsVawsLofs1fWvZZC",
        },
      },
      USD: {
        monthly: {
          amount: 25,
          currency: "USD",
          priceId: "price_1T0xPxCGsVawsLofc25kLyRJ",
        },
        annual: {
          amount: 250,
          currency: "USD",
          priceId: "price_1T0xPyCGsVawsLofMBgJ7VY1",
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
          priceId: "price_1T0xPzCGsVawsLofqHC9B6AX",
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
          priceId: "price_1T0xQ1CGsVawsLofJAX2uKip",
        },
        annual: {
          amount: 450,
          currency: "EUR",
          priceId: "price_1T0xQ2CGsVawsLof5WzjMR99",
        },
      },
      USD: {
        monthly: {
          amount: 49,
          currency: "USD",
          priceId: "price_1T0xQ3CGsVawsLofgb0k2MsK",
        },
        annual: {
          amount: 490,
          currency: "USD",
          priceId: "price_1T0xQ3CGsVawsLof1mdO2Iiy",
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
          amount: 1249,
          currency: "NOK",
          priceId: "price_1T0xQ5CGsVawsLofkTF2KKPu",
        },
        annual: {
          amount: 12490,
          currency: "NOK",
          priceId: "price_1T0xQ6CGsVawsLof9WRQKEk8",
        },
      },
      EUR: {
        monthly: {
          amount: 110,
          currency: "EUR",
          priceId: "price_1T0xQ7CGsVawsLofAbXglvOp",
        },
        annual: {
          amount: 1100,
          currency: "EUR",
          priceId: "price_1T0xQ8CGsVawsLofm3hJi4nn",
        },
      },
      USD: {
        monthly: {
          amount: 120,
          currency: "USD",
          priceId: "price_1T0xQ9CGsVawsLofWlktK0mr",
        },
        annual: {
          amount: 1200,
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
        monthly: { amount: 1999, currency: "NOK", priceId: "" },
        annual: { amount: 19990, currency: "NOK", priceId: "" },
      },
      EUR: {
        monthly: { amount: 175, currency: "EUR", priceId: "" },
        annual: { amount: 1750, currency: "EUR", priceId: "" },
      },
      USD: {
        monthly: { amount: 190, currency: "USD", priceId: "" },
        annual: { amount: 1900, currency: "USD", priceId: "" },
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
    "advanced-courses": ["master", "phd", "professor"],
    certification: ["master", "phd", "professor"],
    webinars: ["master", "phd", "professor"],
    "extra-resources": ["phd", "professor"],
    "priority-support": ["phd", "professor"],
    "unlimited-simulator": ["bachelor", "master", "phd", "professor"],
  };
  return featureMatrix[feature]?.includes(tier) ?? false;
}
