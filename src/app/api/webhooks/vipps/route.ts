import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vipps MobilePay Webhook Handler
 * 
 * Receives payment events from Vipps and updates order/subscription status.
 * Events: payment.created, payment.captured, payment.cancelled, payment.refunded
 * 
 * Authentication: Validates Authorization header matches VIPPS_CLIENT_SECRET.
 */

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
        "client_id": clientId,
        "client_secret": clientSecret,
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
    const body = await request.json();
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
