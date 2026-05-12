export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";

async function GETHandler(request: Request, env: Env)(_request: NextRequest) {
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
        { status: 502 },
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


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
