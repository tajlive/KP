// src/lib/pricing.ts - 3-tier pricing model (Student/Master/Professor)

export type TierType = 'gratis' | 'student' | 'master' | 'professor';

export interface TierConfig {
  name: TierType;
  displayName: string;
  price: number;
  priceAnnual: number;
  currency: string;
  stripeMonthlyId: string;
  stripeAnnualId: string;
  featured: boolean;
  description: string;
  ctaText: string;
  features: FeatureGroup[];
  support: {
    responseHours: number | null;
    email: boolean;
    priority: 'none' | 'standard' | 'priority' | 'vip';
  };
  limits: {
    simulatorTrades: number;
    coursesAccess: string[];
    hasWebinars: boolean;
    hasCertification: boolean;
    has1on1: boolean;
    communityAccess: boolean;
  };
}

export interface FeatureGroup {
  category: string;
  items: string[];
}

export const PRICING_TIERS: Record<TierType, TierConfig> = {
  gratis: {
    name: 'gratis',
    displayName: 'Gratis',
    price: 0,
    priceAnnual: 0,
    currency: 'NOK',
    stripeMonthlyId: '',
    stripeAnnualId: '',
    featured: false,
    description: 'Test Klarpakke uten risiko',
    ctaText: 'Start gratis',
    features: [
      {
        category: 'Læring',
        items: [
          'Krypto 101 - Modul 1',
          '1 quiz',
          'Gratis simulator (5 trades)',
        ],
      },
    ],
    support: {
      responseHours: null,
      email: false,
      priority: 'none',
    },
    limits: {
      simulatorTrades: 5,
      coursesAccess: ['krypto-101-module-1'],
      hasWebinars: false,
      hasCertification: false,
      has1on1: false,
      communityAccess: false,
    },
  },

  student: {
    name: 'student',
    displayName: 'Student',
    price: 199,
    priceAnnual: 1990,
    currency: 'NOK',
    stripeMonthlyId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID || '',
    stripeAnnualId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL || '',
    featured: false,
    description: 'For nybegynnere som vil lære grundig',
    ctaText: 'Velg Student',
    features: [
      {
        category: 'Læring',
        items: [
          'Alle grunnkurs (Krypto 101, Teknisk analyse)',
          'Alle quiz',
          'Ubegrenset simulator',
        ],
      },
      {
        category: 'Support',
        items: ['E-post support (48 timer responstid)'],
      },
      {
        category: 'Gamifikasjon',
        items: ['Badges, streaks, rank'],
      },
    ],
    support: {
      responseHours: 48,
      email: true,
      priority: 'standard',
    },
    limits: {
      simulatorTrades: 999999,
      coursesAccess: ['krypto-101', 'technical-analysis-basic', 'risk-management-intro'],
      hasWebinars: false,
      hasCertification: false,
      has1on1: false,
      communityAccess: false,
    },
  },

  master: {
    name: 'master',
    displayName: 'Master',
    price: 399,
    priceAnnual: 3990,
    currency: 'NOK',
    stripeMonthlyId: process.env.NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID || '',
    stripeAnnualId: process.env.NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL || '',
    featured: true,
    description: 'Komplett læring med sertifikering',
    ctaText: 'Velg Master',
    features: [
      {
        category: 'Læring',
        items: [
          'Alle grunnkurs + avanserte kurs',
          'Psykologi & porteføljestyring',
          'Alle quiz',
          'Ubegrenset simulator',
        ],
      },
      {
        category: 'Sertifikering',
        items: [
          'Sertifikat-eksamen',
          'Digitalt diplom',
          'LinkedIn-integrasjon',
        ],
      },
      {
        category: 'Webinarer',
        items: [
          '1x månedlig live Q&A',
          'Opptak tilgjengelig',
          'Møte grunnleggeren',
        ],
      },
      {
        category: 'Support',
        items: ['Prioritert e-post (24 timer)'],
      },
    ],
    support: {
      responseHours: 24,
      email: true,
      priority: 'priority',
    },
    limits: {
      simulatorTrades: 999999,
      coursesAccess: ['all-basic', 'all-advanced', 'portfolio-management', 'psychology'],
      hasWebinars: true,
      hasCertification: true,
      has1on1: false,
      communityAccess: false,
    },
  },

  professor: {
    name: 'professor',
    displayName: 'Professor',
    price: 999,
    priceAnnual: 9990,
    currency: 'NOK',
    stripeMonthlyId: process.env.NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID || '',
    stripeAnnualId: process.env.NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL || '',
    featured: false,
    description: 'Premium: VIP-gruppe med personlig coaching',
    ctaText: 'Velg Professor',
    features: [
      {
        category: 'Læring',
        items: [
          'ALT i Master',
          'Eksklusiv premium-forskning',
          'Tidlig tilgang til nytt innhold',
        ],
      },
      {
        category: '1–1 Coaching',
        items: [
          '1 time per kvartal (Zoom)',
          'Personlig læringsplan',
          'Strategi-review',
        ],
      },
      {
        category: 'Eksklusiv Community',
        items: [
          'Privat Discord/Slack',
          'VIP-badge på profil',
          'Nettverk med andre seriøse tradere',
        ],
      },
      {
        category: 'Support',
        items: [
          'VIP e-post & Slack (12 timer)',
          'Priority tilgang til deg',
        ],
      },
    ],
    support: {
      responseHours: 12,
      email: true,
      priority: 'vip',
    },
    limits: {
      simulatorTrades: 999999,
      coursesAccess: ['all-basic', 'all-advanced', 'all-premium', 'exclusive-research'],
      hasWebinars: true,
      hasCertification: true,
      has1on1: true,
      communityAccess: true,
    },
  },
};

export const PRICING_ORDER: TierType[] = ['gratis', 'student', 'master', 'professor'];

export function getPricingTier(tier: TierType): TierConfig {
  return PRICING_TIERS[tier];
}

export function getAnnualSavings(tier: TierType): number {
  const config = PRICING_TIERS[tier];
  const monthlyTotal = config.price * 12;
  const annualPrice = config.priceAnnual;
  return monthlyTotal - annualPrice;
}

export function canAccess(tier: TierType, requiredFeature: string): boolean {
  const featureMatrix: Record<string, TierType[]> = {
    'advanced-courses': ['master', 'professor'],
    'certification': ['master', 'professor'],
    'webinars': ['master', 'professor'],
    '1on1-coaching': ['professor'],
    'exclusive-community': ['professor'],
    'unlimited-simulator': ['student', 'master', 'professor'],
    'basic-simulator': ['gratis', 'student', 'master', 'professor'],
  };
  return featureMatrix[requiredFeature]?.includes(tier) ?? false;
}

export function getSimulatorLimit(tier: TierType): number {
  const limits: Record<TierType, number> = {
    'gratis': 5,
    'student': 999999,
    'master': 999999,
    'professor': 999999,
  };
  return limits[tier];
}
