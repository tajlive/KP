export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { createClient, createServerClient } from "@/lib/supabase/server";
import {
  getTotalQuantity,
  getWeightedEntryPrice,
  type LedgerState,
  type Lot,
  migrateFromLegacy,
} from "@/lib/trading/position-ledger";

export const dynamic = "force-dynamic";

interface OpenPosition {
  side?: "long" | "short";
  lots?: Lot[];
  entry_price?: number;
  quantity?: number;
  entry_time?: string;
  highest_price?: number;
  [key: string]: unknown;
}

async function GETHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    // Create a response object to capture refreshed auth cookies
    const authResponse = NextResponse.next();
    const authSupabase = createServerClient(request, authResponse);
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      console.error("[GET /api/trading/position] Auth failed:", authError?.message || "No user");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Supabase REST API will be used directly via fetch

    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("trading_pair, open_position")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error("[GET /api/trading/position] Session query error:", sessionError.message);
      return NextResponse.json(
        { ok: false, error: sessionError.message },
        { status: 500 },
      );
    }

    if (!session || !session.open_position) {
      // No active position — this is a normal state, not an error
      return NextResponse.json(
        {
          ok: true,
          symbol: null,
          currentPrice: null,
          lots: [],
          totalQuantity: 0,
          weightedEntryPrice: 0,
          totalUnrealizedPnl: 0,
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    const symbol = (session.trading_pair as string).replace("/", "");

    let currentPrice = 0;
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = (await res.json()) as { price: string };
        currentPrice = parseFloat(data.price);
      }
    } catch (e) {
      console.error("[GET /api/trading/position] Binance price error:", e);
    }

    const openPos = (session.open_position ?? null) as unknown as OpenPosition | null;

    let ledger: LedgerState;
    if (
      openPos &&
      openPos.lots &&
      Array.isArray(openPos.lots) &&
      openPos.lots.length > 0
    ) {
      ledger = { side: openPos.side || "long", lots: openPos.lots };
    } else if (
      openPos &&
      typeof openPos.entry_price === "number" &&
      typeof openPos.quantity === "number"
    ) {
      ledger = migrateFromLegacy({
        side: openPos.side || "long",
        entry_price: openPos.entry_price,
        quantity: openPos.quantity,
        entry_time: openPos.entry_time || new Date().toISOString(),
      });
    } else {
      ledger = { side: "long", lots: [] };
    }

    const lotsWithPnl = ledger.lots.map((lot) => {
      const unrealizedPnl =
        ledger.side === "long"
          ? (currentPrice - lot.entryPrice) * lot.quantity
          : (lot.entryPrice - currentPrice) * lot.quantity;
      return {
        ...lot,
        unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
      };
    });

    const totalQuantity = getTotalQuantity(ledger);
    const weightedEntryPrice = getWeightedEntryPrice(ledger);
    const totalUnrealizedPnl = lotsWithPnl.reduce(
      (sum, lot) => sum + lot.unrealizedPnl,
      0,
    );

    const jsonResponse = NextResponse.json(
      {
        ok: true,
        symbol,
        currentPrice,
        lots: lotsWithPnl,
        totalQuantity,
        weightedEntryPrice,
        totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );

    // Copy any refreshed auth cookies to the JSON response so the browser
    // receives updated session tokens (critical for auto-refresh flow)
    authResponse.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return jsonResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const stack = e instanceof Error ? e.stack : "";
    console.error("[GET /api/trading/position] CRITICAL ERROR:", msg, stack);
    return NextResponse.json({ ok: false, error: msg, stack }, { status: 500 });
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
