import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/portfolio/rebalance — smart-portefølje (rebalance-autopilot).
 *
 * KLA-auth: SmartPortfolioDashboard leste wallets/config/orders og
 * INSERTET default-config + oppdaterte is_active via browser-supabase
 * (alltid anon — stille brudd). Server-ruta gjoer alt user_id-scopet.
 *
 * GET   → wallets + config (auto-opprettes med default hvis mangler)
 *         + aktive orders (pending/partial)
 * PATCH {is_active: boolean} → autopilot av/paa
 */

const DEFAULT_ALLOCATIONS = {
  BTC: 0.5,
  ETH: 0.3,
  SOL: 0.1,
  BNB: 0.05,
  XRP: 0.05,
} as const;

async function getAuthedSupabase() {
  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    const [walletsRes, configRes, ordersRes] = await Promise.all([
      supabase
        .from("wallets")
        .select("id, currency, balance, created_at, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("portfolio_rebalance_configs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("portfolio_rebalance_orders")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "partial"]),
    ]);

    let config = configRes.data;
    if (!config) {
      // Auto-opprett default-config (tidligere gjort i browser — brød stille)
      const { data: newConfig, error: insertError } = await supabase
        .from("portfolio_rebalance_configs")
        .insert({
          user_id: user.id,
          is_active: false,
          threshold_percent: 5,
          target_allocations: DEFAULT_ALLOCATIONS,
        })
        .select()
        .single();
      if (!insertError) config = newConfig;
    }

    return NextResponse.json({
      ok: true,
      wallets: walletsRes.data ?? [],
      config,
      activeOrders: ordersRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "is_active (boolean) kreves" },
        { status: 400 },
      );
    }

    // user_id-filter: kun egen config
    const { data, error } = await supabase
      .from("portfolio_rebalance_configs")
      .update({
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, config: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
