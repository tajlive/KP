import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const start = performance.now();

  try {
    // Sjekk admin-tilgang
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "Ikke autentisert", latencyMs: 0 },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id" as unknown, user.id)
      .single() as unknown;

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Krever admin-tilgang", latencyMs: 0 },
        { status: 403 }
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
        { status: 500 }
      );
    }

    // Test Stripe API-tilkobling
    const response = await fetch("https://api.stripe.com/v1/account", {
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
        { status: 502 }
      );
    }

    const account = await response.json();

    // Sjekk webhook-konfigurasjon
    const webhooksResponse = await fetch(
      "https://api.stripe.com/v1/webhook_endpoints",
      {
        headers: {
          Authorization: `Bearer ${stripeKey}`,
        },
      }
    );

    let webhookStatus = "ukjent";
    if (webhooksResponse.ok) {
      const webhooks = await webhooksResponse.json();
      const activeWebhooks = webhooks.data?.filter(
        (wh: { status: string }) => wh.status === "enabled"
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
      { status: 500 }
    );
  }
}
