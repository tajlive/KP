export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * Cron: Update USDT/NOK rate in global_settings (USDT ≈ USD).
 * Call daily from Vercel Cron or external scheduler.
 * Secured with CRON_SECRET.
 */


export const dynamic = "force-dynamic";
export const maxDuration = 15;

const EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest/USD";

async function GETHandler(request: Request, env: Env)(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  try {
    const res = await fetch(EXCHANGE_RATE_URL, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Exchange API ${res.status}`);
    const data = (await res.json()) as { rates?: { NOK?: number } };
    const usdToNok = data.rates?.NOK;
    if (typeof usdToNok !== "number" || usdToNok <= 0) {
      throw new Error("Invalid NOK rate");
    }

    // Supabase REST API will be used directly via fetch
    const { error } = await supabase
      .from("global_settings")
      .update({
        usdt_nok_rate: usdToNok,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("[update-usdt-nok]", error);
      return new Response(JSON.stringify({ error: error.message }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
    }

    return NextResponse.json({
      ok: true,
      usdt_nok_rate: usdToNok,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[update-usdt-nok]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
