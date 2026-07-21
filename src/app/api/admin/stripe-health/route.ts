import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const start = performance.now();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json(
        {
          status: "error",
          message:
            auth.status === 401 ? "Ikke autentisert" : "Krever admin-tilgang",
          latencyMs: 0,
        },
        { status: auth.status },
      );
    }

    // Sjekk Stripe API og webhooks
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "STRIPE_SECRET_KEY mangler",
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 500 },
      );
    }

    // Test Stripe API-tilkobling
    const response = await fetch("https://api.stripe.com/v1/account", , { signal: controller.signal }
  clearTimeout(timeoutId);
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `Stripe API feil: ${response.status}`,
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 502 },
      );
    }

    const account = await response.json();

    // Sjekk webhook-konfigurasjon
    const webhooksResponse = await fetch, { signal: controller.signal }
      "https://api.stripe.com/v1/webhook_endpoints",
      {
        headers: {
          Authorization: `Bearer ${stripeKey}`,
        },
      },
    );

    let webhookStatus = "ukjent";
    if (webhooksResponse.ok) {
      const webhooks = await webhooksResponse.json();
      const activeWebhooks = webhooks.data?.filter(
        (wh: { status: string }) => wh.status === "enabled",
      );
      webhookStatus = `${activeWebhooks?.length || 0} aktive`;
    }

    return NextResponse.json({
      status: "ok",
      message: `Stripe-konto: ${account.settings?.dashboard?.display_name || account.id}, Webhooks: ${webhookStatus}`,
      latencyMs: Math.round(performance.now() - start),
      details: {
        accountId: account.id,
        accountEmail: account.email,
        webhookStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
        latencyMs: Math.round(performance.now() - start),
      },
      { status: 500 },
    );
  }
}
