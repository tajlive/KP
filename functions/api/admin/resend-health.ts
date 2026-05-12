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

    // Sjekk Resend API
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "RESEND_API_KEY mangler",
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.resend.com/api-keys", {
      headers: {
        Authorization: `Bearer ${resendKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `Resend API feil: ${response.status}`,
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const apiKeys = data.data || [];

    return NextResponse.json({
      status: "ok",
      message: `Resend tilkoblet, ${apiKeys.length} API-nøkler funnet`,
      latencyMs: Math.round(performance.now() - start),
      details: {
        apiKeyCount: apiKeys.length,
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
