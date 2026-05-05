/**
 * CRON: Binance Sync
 * Synkroniserer Binance Futures Leaderboard og posisjoner for fulgte tradere.
 *
 * Kjøres av pg_cron hvert 5. minutt (leaderboard) og
 * hvert 2. minutt (posisjoner), eller manuelt via POST.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncBinanceLeaderboard,
  syncBinancePositions,
} from "@/lib/copy-trading/binance-sync";
import { executeBinanceMirrorTrades } from "@/lib/copy-trading/auto-execute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && cronSecret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const db = createClient();

  try {
    // Sync leaderboard (top 100)
    const leaderboardResult = await syncBinanceLeaderboard(db, 100);

    // Sync positions for followed traders
    const positionsResult = await syncBinancePositions(db);

    // Execute mirror trades for detected position changes
    let mirrorResults: Awaited<ReturnType<typeof executeBinanceMirrorTrades>> = [];
    if (positionsResult.changes.length > 0) {
      mirrorResults = await executeBinanceMirrorTrades(db, positionsResult.changes);
    }

    return NextResponse.json({
      ok: true,
      leaderboard: leaderboardResult,
      positions: positionsResult,
      mirror_trades: mirrorResults,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[Binance Sync Cron] Error:", err);
    return NextResponse.json(
      { error: "Sync failed", details: (err as Error).message },
      { status: 500 },
    );
  }
}

export const POST = GET;
