// ═══════════════════════════════════════════════════════════════
// Stripe Checkout - For Supabase Sync Engine
// Oppretter checkout session, webhook håndteres av Supabase
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  findTierBySubscriptionPriceId,
  getResolvedSubscriptionPriceId,
  getStripeCheckoutTrialDays,
  isPriceIdAllowedForTier,
  parseCheckoutCurrency,
  planParamToTier,
  type CurrencyCode,
} from "@/lib/pricing.config";
import { jsonSuccess, badRequest, internalError } from "@/lib/api-response";
import { trackCriticalAction } from "@/lib/sentry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY ikke satt");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
};

const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};

function isPlaceholderPriceId(id: string): boolean {
  return !id || id.includes("placeholder");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const tierRaw = body.tier;
    const directPriceId = body.priceId;
    const currencyIn = parseCheckoutCurrency(body.currency) as CurrencyCode;
    const userId = body.userId;
    const userEmail = body.userEmail;

    const hasExplicitCurrency =
      body.currency != null && String(body.currency).trim() !== "";

    if (typeof userId !== "string" || !userId) {
      return badRequest("Mangler userId");
    }
    if (typeof userEmail !== "string" || !userEmail) {
      return badRequest("Mangler userEmail");
    }

    let priceId = "";
    let tierMeta: string;

    const tierSlug =
      typeof tierRaw === "string" && tierRaw.length > 0
        ? planParamToTier(tierRaw)
        : null;

    if (tierSlug && tierSlug !== "student") {
      tierMeta = tierSlug;
      if (hasExplicitCurrency) {
        priceId = getResolvedSubscriptionPriceId(
          tierSlug,
          "monthly",
          currencyIn,
        );
      } else if (
        directPriceId &&
        typeof directPriceId === "string" &&
        directPriceId.startsWith("price_") &&
        !isPlaceholderPriceId(directPriceId) &&
        isPriceIdAllowedForTier(tierSlug, directPriceId)
      ) {
        priceId = directPriceId;
      } else {
        priceId = getResolvedSubscriptionPriceId(tierSlug, "monthly", "NOK");
      }
    } else if (
      directPriceId &&
      typeof directPriceId === "string" &&
      directPriceId.startsWith("price_")
    ) {
      if (isPlaceholderPriceId(directPriceId)) {
        return internalError("Ugyldig price ID");
      }
      const inferred = findTierBySubscriptionPriceId(directPriceId);
      if (!inferred) {
        return badRequest("Ukjent priceId");
      }
      priceId = directPriceId;
      tierMeta = inferred;
    } else if (tierSlug === "student") {
      return badRequest("Student krever ikke Stripe-checkout");
    } else {
      return badRequest("Mangler tier eller priceId");
    }

    if (!priceId || isPlaceholderPriceId(priceId)) {
      return internalError(
        `Price ID ikke konfigurert for ${tierMeta} (${currencyIn})`,
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://www.klarpakke.no";

    const supabase = getSupabase();
    let customerId: string | null = null;

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await getStripe().customers.create({
        email: userEmail,
        metadata: { supabaseUserId: userId },
      });
      customerId = customer.id;

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: "incomplete",
      });
    }

    const tierResolved = planParamToTier(tierMeta);
    const trialDays = getStripeCheckoutTrialDays(tierResolved);

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      {
        metadata: {
          tier: tierMeta,
          userId,
          currency: currencyIn,
        },
      };
    if (trialDays != null && trialDays > 0) {
      subscriptionData.trial_period_days = trialDays;
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/no/dashboard?session_id={CHECKOUT_SESSION_ID}&tier=${encodeURIComponent(tierMeta)}&welcome=true`,
      cancel_url: `${baseUrl}/no/priser?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      subscription_data: subscriptionData,
      metadata: {
        tier: tierMeta,
        userId,
        currency: currencyIn,
        source: "klarpakke_checkout",
      },
    });

    trackCriticalAction("checkout", { userId, requestId: undefined });
    return jsonSuccess({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error("[Stripe Checkout] Feil:", error);
    return internalError(
      (error as Error).message || "Kunne ikke opprette checkout",
    );
  }
}
