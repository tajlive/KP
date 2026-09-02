import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  badRequest,
  internalError,
  jsonSuccess,
  unauthorized,
} from "@/lib/api-response";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { createClient, createServerClient } from "@/lib/supabase/server";
import { betaPaymentsDisabled } from "@/lib/beta-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Beta-sperre (2026-08-12): kundeporter er ikke åpnet i beta. */
const BETA_PAYMENTS_ENABLED = false;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ikke satt");
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

/**
 * POST — oppretter Stripe Customer Portal-økt for innlogget bruker.
 * Krever rad i `subscriptions` med `stripe_customer_id` (typisk etter checkout).
 */
export async function POST(request: NextRequest) {
  // P0 kundevendt (2026-08-12): betaling er ikke åpnet i beta.
  if (!BETA_PAYMENTS_ENABLED) {
    return betaPaymentsDisabled();
  }
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return unauthorized();
    }

    let locale = "no";
    try {
      const body = (await request.json()) as { locale?: string };
      if (typeof body.locale === "string" && body.locale.length > 0) {
        locale = body.locale;
      }
    } catch {
      /* tom body OK */
    }

    const admin = createClient();
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error("[customer-portal] DB:", subErr.message);
      return internalError("Kunne ikke hente abonnementsdata");
    }

    const customerId = sub?.stripe_customer_id;
    if (!customerId || typeof customerId !== "string") {
      return badRequest(
        "Ingen Stripe-kunde funnet. Fullfør et kjøp i kassen først, eller kontakt support.",
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://www.klarpakke.no";
    const returnUrl = `${baseUrl.replace(/\/$/, "")}${hrefWithLocale(locale, "/dashboard/settings")}`;

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      return internalError("Stripe returnerte ingen portal-URL");
    }

    return jsonSuccess({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[customer-portal]", msg);
    if (
      msg.toLowerCase().includes("portal") ||
      msg.toLowerCase().includes("configuration")
    ) {
      return internalError(
        "Customer Portal er ikke aktivert i Stripe Dashboard. Be admin aktivere den under Settings → Customer portal.",
      );
    }
    return internalError(msg || "Kunne ikke åpne faktureringsportal");
  }
}
