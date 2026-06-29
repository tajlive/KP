/**
 * Stripe Price IDs for Klarpakke
 *
 * Price IDs leses fra environment variables.
 * Sett NEXT_PUBLIC_PRICE_* i Cloudflare Workers env/secrets.
 * Hent verdiene fra: https://dashboard.stripe.com/products
 * Format: price_xxxxxxxxxxxxx
 */

// ============================================
// TEST MODE (Development)
// ============================================
export const STRIPE_PRICES_TEST = {
  // Kurs - Engangsbetaling
  CRYPTO_COURSE:
    process.env.NEXT_PUBLIC_PRICE_CRYPTO_COURSE_TEST ||
    "price_test_crypto_course",
  TRADING_COURSE:
    process.env.NEXT_PUBLIC_PRICE_TRADING_COURSE_TEST ||
    "price_test_trading_course",

  // Kurs - Abonnement
  CRYPTO_SUBSCRIPTION:
    process.env.NEXT_PUBLIC_PRICE_CRYPTO_SUB_TEST || "price_test_crypto_sub",
  TRADING_SUBSCRIPTION:
    process.env.NEXT_PUBLIC_PRICE_TRADING_SUB_TEST || "price_test_trading_sub",

  // VIP Medlemskap
  VIP_BASIC:
    process.env.NEXT_PUBLIC_PRICE_VIP_BASIC_TEST || "price_test_vip_basic",
  VIP_PRO: process.env.NEXT_PUBLIC_PRICE_VIP_PRO_TEST || "price_test_vip_pro",
  VIP_EXTREME:
    process.env.NEXT_PUBLIC_PRICE_VIP_EXTREME_TEST || "price_test_vip_extreme",
} as const;

// ============================================
// LIVE MODE (Production)
// ============================================
export const STRIPE_PRICES_LIVE = {
  // Kurs - Engangsbetaling
  CRYPTO_COURSE: process.env.NEXT_PUBLIC_PRICE_CRYPTO_COURSE || "",
  TRADING_COURSE: process.env.NEXT_PUBLIC_PRICE_TRADING_COURSE || "",

  // Kurs - Abonnement
  CRYPTO_SUBSCRIPTION: process.env.NEXT_PUBLIC_PRICE_CRYPTO_SUB || "",
  TRADING_SUBSCRIPTION: process.env.NEXT_PUBLIC_PRICE_TRADING_SUB || "",

  // VIP Medlemskap
  VIP_BASIC: process.env.NEXT_PUBLIC_PRICE_VIP_BASIC || "",
  VIP_PRO: process.env.NEXT_PUBLIC_PRICE_VIP_PRO || "",
  VIP_EXTREME: process.env.NEXT_PUBLIC_PRICE_VIP_EXTREME || "",
} as const;

// ============================================
// HJELPEFUNKSJONER
// ============================================

/**
 * Hent riktig pris basert på miljø
 */
export function getPriceId(priceKey: keyof typeof STRIPE_PRICES_LIVE): string {
  const isLive = process.env.NODE_ENV === "production";
  const prices = isLive ? STRIPE_PRICES_LIVE : STRIPE_PRICES_TEST;
  return prices[priceKey];
}

/**
 * Produktinformasjon for visning
 */
export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  currency: string;
  type: "one_time" | "recurring";
  interval?: "month" | "year";
  features: string[];
  popular?: boolean;
}

/**
 * Alle produkter for prisingsside
 */
export function getProducts(): ProductInfo[] {
  const isLive = process.env.NODE_ENV === "production";
  const prices = isLive ? STRIPE_PRICES_LIVE : STRIPE_PRICES_TEST;

  return [
    {
      id: "crypto-course",
      name: "Krypto for Småsparere",
      description: "Fra 0 til trygg investor på 4 uker",
      price: 999,
      priceId: prices.CRYPTO_COURSE,
      currency: "NOK",
      type: "one_time",
      features: [
        "12 moduler med video",
        "AI Professor veiledning",
        "Quiz og sertifikat",
        "Livstids tilgang",
      ],
      popular: true,
    },
    {
      id: "crypto-subscription",
      name: "Krypto Kurs + VIP",
      description: "Kurs + VIP medlemskap",
      price: 299,
      priceId: prices.CRYPTO_SUBSCRIPTION,
      currency: "NOK",
      type: "recurring",
      interval: "month",
      features: [
        "Alle kursmoduler",
        "AI Professor tilgang",
        "VIP Discord kanal",
        "Månedlige webinarer",
        "Kanseller når som helst",
      ],
    },
    {
      id: "trading-course",
      name: "Trading Masterclass",
      description: "Avanserte trading-strategier",
      price: 1499,
      priceId: prices.TRADING_COURSE,
      currency: "NOK",
      type: "one_time",
      features: [
        "16 avanserte moduler",
        "Teknisk analyse dybde",
        "Risk management",
        "Livstids tilgang",
      ],
    },
    {
      id: "vip-basic",
      name: "VIP Basic",
      description: "Perfekt for nybegynnere",
      price: 199,
      priceId: prices.VIP_BASIC,
      currency: "NOK",
      type: "recurring",
      interval: "month",
      features: [
        "Basic signaler",
        "Felles Discord",
        "Ukentlige oppdateringer",
        "Community støtte",
      ],
    },
    {
      id: "vip-pro",
      name: "VIP Pro",
      description: "For seriøse tradere",
      price: 499,
      priceId: prices.VIP_PRO,
      currency: "NOK",
      type: "recurring",
      interval: "month",
      features: [
        "Pro signaler",
        "Private Discord kanaler",
        "Daglige markedstips",
        "Webinarer 2x/mnd",
        "Portefølje-tracking",
      ],
      popular: true,
    },
    {
      id: "vip-extreme",
      name: "VIP Ekstrem",
      description: "Full tilgang til alt",
      price: 999,
      priceId: prices.VIP_EXTREME,
      currency: "NOK",
      type: "recurring",
      interval: "month",
      features: [
        "Alle Pro funksjoner",
        "1-on-1 AI trading coach",
        "Auto-trading bot",
        "Personlig porteføljestrategi",
        "Prioritet support",
      ],
    },
  ];
}

/**
 * Hent produkt for kurs (knyttet til kurs-slug)
 */
export function getCourseProduct(courseSlug: string): ProductInfo | undefined {
  const products = getProducts();

  const courseMap: { [key: string]: string } = {
    "krypto-for-smaasparere": "crypto-course",
    "trading-masterclass": "trading-course",
    "trading-grunnkurs": "trading-course",
  };

  const productId = courseMap[courseSlug];
  return products.find((p) => p.id === productId);
}

/**
 * Formater pris for visning
 */
export function formatPrice(price: number, currency: string = "NOK"): string {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(price);
}
