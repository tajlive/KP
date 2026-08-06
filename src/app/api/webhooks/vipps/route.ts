import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vipps MobilePay Webhook Handler
 *
 * Receives payment events from Vipps and updates order/subscription status.
 * Events: payment.created, payment.captured, payment.cancelled, payment.refunded
 *
 * P0-6-fiks (2026-08-06): Tidligere validerte rutene INGENTING (alltid 200).
 * Nå fail-closed i henhold til Vipps' offisielle HMAC-spesifikasjon:
 * https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication
 *
 * 1. `x-ms-content-sha256` må matche base64(SHA256(raw body)).
 * 2. `Authorization` må matche
 *    `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=...`
 *    der Signature = base64(HMAC-SHA256(secret,
 *    `${method}\n${pathAndQuery}\n${date};${host};${contentHash}`)).
 * 3. Mangler `VIPPS_WEBHOOK_SECRET` → 503. Aldri prosesser uverifiserte
 *    betalingshendelser.
 */

export function verifyVippsSignature(params: {
  method: string;
  pathAndQuery: string;
  host: string;
  date: string;
  contentHash: string;
  authorization: string;
  rawBody: string;
  secret: string;
}): { ok: true } | { ok: false; reason: string } {
  const { method, pathAndQuery, host, date, contentHash, authorization, rawBody, secret } = params;

  // 1. Innholdssjekk: body må være uendret
  const expectedContentHash = createHash("sha256").update(rawBody).digest("base64");
  if (!timingSafeEqualStrings(expectedContentHash, contentHash)) {
    return { ok: false, reason: "content-hash mismatch" };
  }

  // 2. Signatur: HMAC-SHA256 over metode, sti, dato, host og innholdshash
  const signedString = `${method}\n${pathAndQuery}\n${date};${host};${contentHash}`;
  const expectedSignature = createHmac("sha256", secret).update(signedString).digest("base64");

  const expectedAuth = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${expectedSignature}`;
  if (!timingSafeEqualStrings(expectedAuth, authorization)) {
    return { ok: false, reason: "authorization mismatch" };
  }

  return { ok: true };
}

/** Timing-safe strengsammenligning (normaliserer lengdeforskjell via hash). */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

async function getVippsAccessToken(): Promise<string> {
  const clientId = process.env.VIPPS_CLIENT_ID;
  const clientSecret = process.env.VIPPS_CLIENT_SECRET;
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
  if (!clientId || !clientSecret || !subscriptionKey) {
    throw new Error("Missing Vipps credentials");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("https://api.vipps.no/accesstoken/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        client_id: clientId,
        client_secret: clientSecret,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Vipps auth failed: ${res.status}`);
    return (await res.json()).access_token;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.VIPPS_WEBHOOK_SECRET;

    // Fail-closed: uten secret kan ingen betalingshendelse verifiseres.
    if (!secret) {
      console.error("[Vipps Webhook] VIPPS_WEBHOOK_SECRET mangler — avviser hendelse");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 503 },
      );
    }

    // Les RAW body — request.json() ville konsumert strømmen før signatur-sjekk
    const rawBody = await request.text();
    const url = new URL(request.url);
    const pathAndQuery = `${url.pathname}${url.search}`;
    const host = request.headers.get("host") || url.host;
    const date = request.headers.get("x-ms-date") || "";
    const contentHash = request.headers.get("x-ms-content-sha256") || "";
    const authorization = request.headers.get("authorization") || "";

    if (!date || !contentHash || !authorization) {
      return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 401 });
    }

    const verification = verifyVippsSignature({
      method: "POST",
      pathAndQuery,
      host,
      date,
      contentHash,
      authorization,
      rawBody,
      secret,
    });

    if (!verification.ok) {
      console.warn(`[Vipps Webhook] Signaturverifisering feilet: ${verification.reason}`);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = request.headers.get("X-Vipps-Event-Type") || body.eventType || "unknown";
    const orderId = body.orderId || body.merchantSerialNumber + "-" + Date.now();

    console.info(`[Vipps Webhook] ${eventType} — order: ${orderId}`);

    switch (eventType) {
      case "payment.captured":
      case "reservation.captured":
        // Payment successful — activate subscription/order
        console.info(`[Vipps] ✅ Payment captured: ${orderId}`);
        break;

      case "payment.cancelled":
      case "reservation.cancelled":
        // Payment cancelled — revert
        console.info(`[Vipps] ❌ Payment cancelled: ${orderId}`);
        break;

      case "payment.refunded":
      case "reservation.refunded":
        // Payment refunded
        console.info(`[Vipps] ↩️ Payment refunded: ${orderId}`);
        break;

      default:
        console.info(`[Vipps] ℹ️ Event: ${eventType}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Vipps Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "Vipps webhook endpoint active" });
}
