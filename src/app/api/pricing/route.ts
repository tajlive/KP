import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { betaPaymentsDisabled } from "@/lib/beta-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache i 60 sekunder

/** Beta-sperre (2026-08-12): prisdata er ikke kundevendt i beta. */
const BETA_PAYMENTS_ENABLED = false;

// Fallback-priser hvis databasen ikke er tilgjengelig
const FALLBACK_PRICES = {
  bachelor: {
    tier: "bachelor",
    name: { no: "Bachelor", en: "Bachelor" },
    description: {
      no: "Bygg et solid fundament for fremtiden",
      en: "Build a solid foundation",
    },
    price: 24900, // 249 kr/mnd
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_BACHELOR ||
      "price_1T4QVJCGsVawsLofgt9uuOcU",
    interval: "month",
  },
  master: {
    tier: "master",
    name: { no: "Master", en: "Master" },
    description: {
      no: "Akselerer din vekst med autotrading",
      en: "Accelerate with autotrading",
    },
    price: 49900, // 499 kr/mnd
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER ||
      "price_1T4QVKCGsVawsLofr8NPcL6g",
    interval: "month",
  },
  phd: {
    tier: "phd",
    name: { no: "PhD", en: "PhD" },
    description: {
      no: "For seriøse tradere med avanserte strategier",
      en: "For serious traders",
    },
    price: 99900, // 999 kr/mnd
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PHD ||
      "price_1T4QVKCGsVawsLofz1US0uVZ",
    interval: "month",
  },
  professor: {
    tier: "professor",
    name: { no: "Professor", en: "Professor" },
    description: {
      no: "Det ultimate programmet for profesjonelle tradere",
      en: "Ultimate for professionals",
    },
    price: 199900, // 1999 kr/mnd
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR ||
      "price_1T4QVLCGsVawsLofgMEbOBJA",
    interval: "month",
  },
};

// Environment-aware Supabase client
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // Bruk service role key på server for å lese alle produkter
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key);
};

export async function GET() {
  // P0 kundevendt (2026-08-12): prisdata er ikke kundevendt i beta.
  if (!BETA_PAYMENTS_ENABLED) {
    return betaPaymentsDisabled();
  }
  try {
    const supabase = getSupabase();

    // Prøv å hente fra databasen først
    const { data: products, error } = await supabase
      .from("stripe_products")
      .select(
        "tier_slug, name_no, name_en, description_no, description_en, amount_nok, stripe_price_id, interval, is_active",
      )
      .eq("is_active", true)
      .order("amount_nok", { ascending: true });

    if (error) {
      console.warn("Database error, using fallback:", error.message);
      // Returner fallback
      return NextResponse.json({
        success: true,
        source: "fallback",
        products: Object.values(FALLBACK_PRICES),
      });
    }

    if (!products || products.length === 0) {
      console.warn("No products in database, using fallback");
      return NextResponse.json({
        success: true,
        source: "fallback",
        products: Object.values(FALLBACK_PRICES),
      });
    }

    // Formater produktene
    const formatted = products.map((p) => ({
      tier: p.tier_slug,
      name: { no: p.name_no, en: p.name_en },
      description: { no: p.description_no, en: p.description_en },
      price: p.amount_nok,
      priceId:
        p.stripe_price_id ||
        FALLBACK_PRICES[p.tier_slug as keyof typeof FALLBACK_PRICES]?.priceId ||
        "",
      interval: p.interval,
    }));

    return NextResponse.json({
      success: true,
      source: "database",
      products: formatted,
    });
  } catch (err: unknown) {
    console.error("Pricing API error:", err);
    // Returner fallback ved feil
    return NextResponse.json({
      success: true,
      source: "fallback-error",
      products: Object.values(FALLBACK_PRICES),
    });
  }
}
