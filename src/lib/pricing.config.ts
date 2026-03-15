// Internal keys; URLs can use student|bachelor|master|phd (see PLAN_PARAM_TO_TIER)
export type TierName = "gratis" | "basis" | "komplett" | "pro";
export type PlanParam = TierName | "student" | "bachelor" | "master" | "phd";

export const PLAN_PARAM_TO_TIER: Record<string, TierName> = {
  gratis: "gratis",
  basis: "basis",
  komplett: "komplett",
  pro: "pro",
  student: "gratis",
  bachelor: "basis",
  master: "komplett",
  phd: "pro",
};
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
  name: TierName;
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

export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  gratis: {
    name: "gratis",
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

  basis: {
    name: "basis",
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

  komplett: {
    name: "komplett",
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

  pro: {
    name: "pro",
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
};

export const TIER_ORDER: TierName[] = ["gratis", "basis", "komplett", "pro"];

export function getTierConfig(tier: TierName): TierConfig {
  return TIER_CONFIGS[tier];
}

/** Normalize plan query param (student|bachelor|master|phd or legacy gratis|basis|komplett|pro) to TierName */
export function planParamToTier(plan: string | null): TierName {
  if (!plan) return "basis";
  const normalized = plan.toLowerCase();
  return PLAN_PARAM_TO_TIER[normalized] ?? "basis";
}

export function getDisplayName(tier: TierName, locale: string = "en"): string {
  return (
    TIER_CONFIGS[tier].displayName[locale] ||
    TIER_CONFIGS[tier].displayName["en"]
  );
}

export function getDescription(tier: TierName, locale: string = "en"): string {
  return (
    TIER_CONFIGS[tier].description[locale] ||
    TIER_CONFIGS[tier].description["en"]
  );
}

export function getCtaText(tier: TierName, locale: string = "en"): string {
  return TIER_CONFIGS[tier].ctaText[locale] || TIER_CONFIGS[tier].ctaText["en"];
}

export function getPrice(
  tier: TierName,
  period: BillingPeriod,
  currency: CurrencyCode = "NOK",
): number {
  const config = TIER_CONFIGS[tier];
  return period === "monthly"
    ? config.prices[currency].monthly.amount
    : config.prices[currency].annual.amount;
}

export function getPriceId(
  tier: TierName,
  period: BillingPeriod,
  currency: CurrencyCode = "NOK",
): string {
  const config = TIER_CONFIGS[tier];
  return period === "monthly"
    ? config.prices[currency].monthly.priceId
    : config.prices[currency].annual.priceId;
}

export function getAnnualSavings(
  tier: TierName,
  currency: CurrencyCode = "NOK",
): number {
  const config = TIER_CONFIGS[tier];
  const monthlyPrice = config.prices[currency].monthly.amount;
  const annualPrice = config.prices[currency].annual.amount;

  if (monthlyPrice === 0) return 0;
  const monthlyTotal = monthlyPrice * 12;
  return monthlyTotal - annualPrice;
}

export function canAccessFeature(tier: TierName, feature: string): boolean {
  const featureMatrix: Record<string, TierName[]> = {
    "advanced-courses": ["komplett", "pro"],
    certification: ["komplett", "pro"],
    webinars: ["komplett", "pro"],
    "extra-resources": ["pro"],
    "priority-support": ["pro"],
    "unlimited-simulator": ["basis", "komplett", "pro"],
  };
  return featureMatrix[feature]?.includes(tier) ?? false;
}
