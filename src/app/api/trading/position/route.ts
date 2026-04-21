import { createClient, createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getTotalQuantity,
  getWeightedEntryPrice,
  type LedgerState,
  type Lot,
  migrateFromLegacy,
} from "@/lib/trading/position-ledger";

export const dynamic = "force-dynamic";

function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  return supabase.auth.getUser();
}

interface OpenPosition {
  side?: "long" | "short";
  lots?: Lot[];
  entry_price?: number;
  quantity?: number;
  entry_time?: string;
  highest_price?: number;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("trading_pair, open_position")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (sessionError) {
      console.error("[GET /api/trading/position]", sessionError.message);
      return NextResponse.json(
        { ok: false, error: sessionError.message },
        { status: 500 },
      );
    }

    if (!session || !session.open_position) {
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

    return NextResponse.json(
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
