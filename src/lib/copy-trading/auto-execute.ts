/**
 * Auto-Execution Engine for Copy-Trading
 * Kopierer trades fra fulgte Binance-tradere til brukerens Klarpakke-sessions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;
type ExternalFollowRow = Database["public"]["Tables"]["copy_trading_external_follows"]["Row"];
type TradingSessionRow = Database["public"]["Tables"]["trading_sessions"]["Row"];

type ExecuteTradeRpcParams = {
  p_user_id: string;
  p_symbol: string;
  p_type: "buy" | "sell";
  p_side: "market";
  p_quantity: number;
  p_price: number;
};

type RpcError = { message: string } | null;
type ExecuteTradeRpcFn = (
  fn: "execute_trade",
  params: ExecuteTradeRpcParams,
) => Promise<{ data: unknown; error: RpcError }>;

export interface MirrorTradeResult {
  follow_id: string;
  session_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  status: "filled" | "failed";
  error?: string;
}

/**
 * Execute copied trades for all active Binance follows.
 * Called from cron/tick or binance-sync after position changes detected.
 */
export async function executeBinanceMirrorTrades(
  db: DbClient,
  positionChanges: Array<{
    encrypted_uid: string;
    symbol: string;
    side: "LONG" | "SHORT";
    change: "opened" | "closed";
    entry_price: number;
    quantity: number;
  }>,
): Promise<MirrorTradeResult[]> {
  const results: MirrorTradeResult[] = [];

  for (const change of positionChanges) {
    // Find all active follows for this trader
    const { data: follows } = await db
      .from("copy_trading_external_follows")
      .select("id, follower_id, scale_factor, allocation_percent, max_trade_amount")
      .eq("external_leader_id", change.encrypted_uid)
      .eq("is_active", true);

    if (!follows || follows.length === 0) continue;

    for (const follow of follows as ExternalFollowRow[]) {
      try {
        // Find or create a paper trading session for this follower
        const session = await getOrCreateMirrorSession(db, follow.follower_id, change.symbol);
        if (!session) {
          console.warn(`[MirrorTrade] No session for follower ${follow.follower_id}`);
          continue;
        }

        // Determine trade side
        const tradeSide = change.change === "opened" ? "buy" : "sell";

        // Calculate trade amount based on allocation and scale
        const capital = session.current_capital || session.initial_capital || 100000;
        const allocation = (follow.allocation_percent || 10) / 100;
        const scale = follow.scale_factor || 1.0;
        const tradeAmount = capital * allocation * scale;

        // Cap by max_trade_amount if set
        const maxAmount = follow.max_trade_amount;
        const finalAmount = maxAmount && maxAmount > 0 ? Math.min(tradeAmount, maxAmount) : tradeAmount;

        // Minimum order value check ($10)
        if (finalAmount < 10) {
          console.warn(`[MirrorTrade] Trade amount ${finalAmount} below minimum for follow ${follow.id}`);
          continue;
        }

        const price = change.entry_price || 1;
        const quantity = finalAmount / price;

        // Execute trade via RPC
        const { data: _tradeResult, error: tradeError } = await (
          db as unknown as { rpc: ExecuteTradeRpcFn }
        ).rpc("execute_trade", {
          p_user_id: follow.follower_id,
          p_symbol: change.symbol,
          p_type: tradeSide,
          p_side: "market",
          p_quantity: quantity,
          p_price: price,
        });

        void _tradeResult; // unused

        // Log the mirror trade
        const status = tradeError ? "failed" : "filled";
        await db.from("copy_trading_mirror_trades").insert({
          follow_id: follow.id,
          session_id: session.id,
          original_symbol: change.symbol,
          original_side: change.side,
          copied_side: tradeSide,
          copied_quantity: quantity,
          copied_price: price,
          scale_factor: scale,
          status,
          error_message: tradeError?.message || null,
        });

        results.push({
          follow_id: follow.id,
          session_id: session.id,
          symbol: change.symbol,
          side: tradeSide,
          quantity,
          price,
          status: status as "filled" | "failed",
          error: tradeError?.message,
        });

        if (tradeError) {
          console.error(`[MirrorTrade] Failed for follow ${follow.id}:`, tradeError.message);
        }
      } catch (err) {
        console.error(`[MirrorTrade] Unexpected error for follow ${follow.id}:`, (err as Error).message);
      }
    }
  }

  return results;
}

/**
 * Get or create a paper trading session for mirror trades.
 * Uses a dedicated "mirror" strategy for copy-traded positions.
 */
async function getOrCreateMirrorSession(
  db: DbClient,
  userId: string,
  symbol: string,
): Promise<Pick<TradingSessionRow, "id" | "current_capital" | "initial_capital"> | null> {
  // Look for existing active mirror session for this user
  const { data: existing } = await db
    .from("trading_sessions")
    .select("id, current_capital, initial_capital")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("strategy_id", "mirror_binance")
    .maybeSingle();

  if (existing) {
    return existing as Pick<TradingSessionRow, "id" | "current_capital" | "initial_capital">;
  }

  // Create new mirror session
  const { data: session, error } = await db
    .from("trading_sessions")
    .insert({
      user_id: userId,
      name: `Copy: ${symbol}`,
      strategy_id: "mirror_binance",
      trading_pair: symbol,
      mode: "paper",
      status: "active",
      initial_capital: 100000,
      current_capital: 100000,
      phase: "paper",
      strategy_config: {},
    } as Database["public"]["Tables"]["trading_sessions"]["Insert"])
    .select("id, current_capital, initial_capital")
    .single();

  if (error) {
    console.error("[MirrorTrade] Failed to create session:", error.message);
    return null;
  }

  return session as Pick<TradingSessionRow, "id" | "current_capital" | "initial_capital"> | null;
}
