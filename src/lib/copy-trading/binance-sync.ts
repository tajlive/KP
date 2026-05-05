/**
 * Binance Sync Engine
 * Synkroniserer leaderboard-data og posisjoner fra Binance Futures API
 * til Klarpakke-databasen for copy-trading.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;
type BinanceTraderRow = Database["public"]["Tables"]["binance_traders"]["Row"];
type BinancePositionRow = Database["public"]["Tables"]["binance_trader_positions"]["Row"];
type ExternalFollowRow = Database["public"]["Tables"]["copy_trading_external_follows"]["Row"];

const BINANCE_FAPI = "https://fapi.binance.com";

export interface BinanceLeaderboardEntry {
  encryptedUid: string;
  nickName: string;
  rank: number;
  avatar?: string;
  value: string;
  dailyROI: string;
  weeklyROI: string;
  monthlyROI: string;
  sharpeRatio: string;
  winRate: string;
  maxDrawdown: string;
  tradeCount: number;
  followerCount: number;
  daysSinceCreated: number;
}

export interface BinancePosition {
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  markPrice: number;
  pnl: number;
  roe: number;
  updateTime: string;
}

/**
 * Fetch leaderboard from Binance Futures API
 */
export async function fetchBinanceLeaderboardRaw(
  period: "ALL" | "DAILY" | "WEEKLY" | "MONTHLY" = "ALL",
  limit: number = 100,
): Promise<BinanceLeaderboardEntry[]> {
  const url = `${BINANCE_FAPI}/fapi/v1/leaderboard?period=${period}&tradeType=PERPETUAL&isIsolated=false&isShared=false&limit=${limit}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Binance leaderboard API error: ${res.status}`);
  }

  const json = (await res.json()) as { data?: unknown };
  if (!json.data || !Array.isArray(json.data)) {
    throw new Error("Invalid Binance leaderboard response");
  }

  return json.data as BinanceLeaderboardEntry[];
}

/**
 * Fetch open positions for a specific trader
 */
export async function fetchBinanceTraderPositions(
  encryptedUid: string,
): Promise<BinancePosition[]> {
  const url = `${BINANCE_FAPI}/fapi/v1/leaderboardPosition?encryptedUid=${encryptedUid}&tradeType=PERPETUAL`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    throw new Error(`Binance positions API error: ${res.status}`);
  }

  const json = (await res.json()) as { data?: unknown };
  return (json.data || []) as BinancePosition[];
}

/**
 * Sync leaderboard data to database
 */
export async function syncBinanceLeaderboard(
  db: DbClient,
  limit: number = 100,
): Promise<{ synced: number; errors: number }> {
  const entries = await fetchBinanceLeaderboardRaw("ALL", limit);
  let synced = 0;
  let errors = 0;

  for (const entry of entries) {
    const { error } = await db.from("binance_traders").upsert(
      {
        encrypted_uid: entry.encryptedUid,
        nick_name: entry.nickName || "Anonymous",
        avatar: entry.avatar || null,
        rank: entry.rank,
        total_return: parseFloat(entry.value) || 0,
        sharpe_ratio: parseFloat(entry.sharpeRatio) || 0,
        win_rate: (parseFloat(entry.winRate) || 0) * 100,
        max_drawdown: parseFloat(entry.maxDrawdown) || 0,
        trade_count: entry.tradeCount || 0,
        follower_count: entry.followerCount || 0,
        days_since_created: entry.daysSinceCreated || 0,
        synced_at: new Date().toISOString(),
      } satisfies Partial<BinanceTraderRow>,
      { onConflict: "encrypted_uid" },
    );

    if (error) {
      console.error(`[syncBinanceLeaderboard] Failed to upsert ${entry.encryptedUid}:`, error.message);
      errors++;
    } else {
      synced++;
    }
  }

  return { synced, errors };
}

export interface PositionChange {
  encrypted_uid: string;
  symbol: string;
  side: "LONG" | "SHORT";
  change: "opened" | "closed";
  entry_price: number;
  quantity: number;
}

/**
 * Sync positions for all followed Binance traders
 * Returns list of position changes (new/closed/modified)
 */
export async function syncBinancePositions(
  db: DbClient,
): Promise<{
  checked: number;
  synced: number;
  changes: PositionChange[];
}> {
  // Get all unique traders that are being followed
  const { data: follows } = await db
    .from("copy_trading_external_follows")
    .select("external_leader_id")
    .eq("is_active", true);

  const uniqueUids = [
    ...new Set((follows || []).map((f) => f.external_leader_id)),
  ];

  let checked = 0;
  let synced = 0;
  const changes: PositionChange[] = [];

  for (const uid of uniqueUids) {
    checked++;
    try {
      const positions = await fetchBinanceTraderPositions(uid);

      // Get previous positions for comparison
      const { data: previousPositions } = await db
        .from("binance_trader_positions")
        .select("symbol, side, entry_price, quantity")
        .eq("encrypted_uid", uid);

      const prevMap = new Map(
        (previousPositions || []).map((p: Pick<BinancePositionRow, "symbol" | "side" | "entry_price" | "quantity">) => [`${p.symbol}:${p.side}`, p]),
      );
      const currentMap = new Map(
        positions.map((p) => [`${p.symbol}:${p.side}`, p]),
      );

      // Detect changes
      for (const pos of positions) {
        const key = `${pos.symbol}:${pos.side}`;
        const prev = prevMap.get(key);

        if (!prev) {
          changes.push({
            encrypted_uid: uid,
            symbol: pos.symbol,
            side: pos.side,
            change: "opened",
            entry_price: pos.entryPrice,
            quantity: pos.roe ? Math.abs(pos.pnl / pos.roe / pos.entryPrice) : 0,
          });
        }
      }

      for (const prev of (previousPositions || []) as Pick<BinancePositionRow, "symbol" | "side" | "entry_price" | "quantity">[]) {
        const key = `${prev.symbol}:${prev.side}`;
        if (!currentMap.has(key)) {
          changes.push({
            encrypted_uid: uid,
            symbol: prev.symbol,
            side: prev.side as "LONG" | "SHORT",
            change: "closed",
            entry_price: prev.entry_price ?? 0,
            quantity: prev.quantity ?? 0,
          });
        }
      }

      // Delete old positions and insert new ones
      await db.from("binance_trader_positions").delete().eq("encrypted_uid", uid);

      if (positions.length > 0) {
        const inserts: Database["public"]["Tables"]["binance_trader_positions"]["Insert"][] = positions.map((pos) => ({
          encrypted_uid: uid,
          symbol: pos.symbol,
          side: pos.side,
          entry_price: pos.entryPrice,
          mark_price: pos.markPrice,
          pnl: pos.pnl,
          roe: pos.roe,
          quantity: pos.roe ? Math.abs(pos.pnl / pos.roe / pos.entryPrice) : 0,
          synced_at: new Date().toISOString(),
        }));

        const { error } = await db.from("binance_trader_positions").insert(inserts);
        if (error) {
          console.error(`[syncBinancePositions] Failed to insert positions for ${uid}:`, error.message);
        } else {
          synced++;
        }
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`[syncBinancePositions] Error for ${uid}:`, (err as Error).message);
    }
  }

  return { checked, synced, changes };
}
