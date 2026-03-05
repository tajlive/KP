import Stripe from 'stripe'

// Lazy initialization to avoid errors during build
let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      // Return a mock during build time
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return {} as Stripe
      }
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
    })
  }
  return stripeClient
}

// Backward-compatible export — lazy via Proxy to avoid build-time errors
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

// KLARPAKKE UNIVERSITET - 4-nivå læringsmodell
// UI: Gratis/Basis/Komplett/Pro
// Stripe: price_student_199 / price_master_399 / price_professor_999

export const STRIPE_PLANS = {
  free: {
    name: 'Gratis',
    description: 'Prøv før du kjøper',
    price: 0,
    features: [
      'Krypto 101 - Modul 1',
      '1 quiz',
      '5 simulator-trades',
      'Community support',
    ],
    limitations: ['Kun smakebit av innhold'],
    popular: false,
  },
  // Basis = Student i Stripe (199 kr)
  basis: {
    name: 'Basis',
    description: 'Perfekt for nybegynnere',
    price: 199,
    priceAnnual: 1990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY,
    priceAnnualId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL,
    features: [
      'Alle grunnkurs',
      'Krypto 101 (full)',
      'Intro til teknisk analyse',
      'Ubegrenset simulator',
      'E-postsupport (48t)',
    ],
    popular: false,
  },
  // Komplett = Master i Stripe (399 kr)
  komplett: {
    name: 'Komplett',
    description: 'Alt du trenger for å mestre trading',
    price: 399,
    priceAnnual: 3990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY,
    priceAnnualId: process.env.NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL,
    features: [
      'Alt i Basis',
      'Avanserte kurs',
      'Risk management',
      'Trading psykologi',
      'Offisielt sertifikat',
      'Månedlige webinarer',
      'Prioritert support (24t)',
    ],
    popular: true,
  },
  // Pro = Professor i Stripe (999 kr)
  pro: {
    name: 'Pro',
    description: 'For seriøse studenter',
    price: 999,
    priceAnnual: 9990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY,
    priceAnnualId: process.env.NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL,
    features: [
      'Alt i Komplett',
      'Alle ekstra ressurser',
      'Dypdykk og case-studier',
      'Maler og verktøy',
      'Prioritert support (12t)',
    ],
    popular: false,
  },
} as const

export type PlanType = keyof typeof STRIPE_PLANS
