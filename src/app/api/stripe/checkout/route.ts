// ═══════════════════════════════════════════════════════════════
// Stripe Checkout - For Supabase Sync Engine
// Oppretter checkout session, webhook håndteres av Supabase
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe client
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY ikke satt");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
};

// Supabase admin client
const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};

// Price IDs fra env
const getPriceIds = () => ({
  bachelor: process.env.NEXT_PUBLIC_STRIPE_PRICE_BACHELOR || "",
  master: process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER || "",
  phd: process.env.NEXT_PUBLIC_STRIPE_PRICE_PHD || "",
  professor: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR || "",
});

export async function POST(request: Request) {
  try {
    const {
      tier,
      priceId: directPriceId,
      userId,
      userEmail,
    } = await request.json();

    let priceId: string;

    // Støtt både direkte priceId (fra dynamisk API) eller tier (fra env)
    if (directPriceId && directPriceId.startsWith("price_")) {
      priceId = directPriceId;
    } else if (tier) {
      const priceIds = getPriceIds();
      priceId = priceIds[tier as keyof typeof priceIds];
      if (!priceId || priceId.startsWith("price_placeholder")) {
        return NextResponse.json(
          { error: `Price ID ikke konfigurert for ${tier}` },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Mangler tier eller priceId" },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://www.klarpakke.no";

    // Opprett Stripe customer hvis ikke eksisterer
    const supabase = getSupabase();
    let customerId: string | null = null;

    // Sjekk om bruker allerede har Stripe customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id" as unknown, userId)
      .single() as unknown;

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      // Opprett ny Stripe customer
      const customer = await getStripe().customers.create({
        email: userEmail,
        metadata: { supabaseUserId: userId },
      });
      customerId = customer.id;

      // Lagre customer ID i databasen
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: "incomplete",
      });
    }

    // Opprett checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId || undefined,
      line_items: [{ price: priceId as string, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/no/dashboard?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&welcome=true`,
      cancel_url: `${baseUrl}/no/priser?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      subscription_data: {
        trial_period_days: 14, // 14 dager prøveperiode
        metadata: {
          tier,
          userId,
        },
      },
      metadata: {
        tier,
        userId,
        source: "klarpakke_checkout",
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    console.error("[Stripe Checkout] Feil:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Kunne ikke opprette checkout" },
      { status: 500 },
    );
  }
}
