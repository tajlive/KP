import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface ReconciliationResult {
  tradesChecked: number;
  divergences: number;
  errors: number;
  details: Array<{ tradeId: string; localState: string; exchangeState: string; diff: string }>;
}

export interface ReconciliationTrade {
  id: string;
  user_id: string;
  binance_order_id: string | null;
  trading_pair: string;
  status: string | null;
  quantity: number;
  filled_quantity: number | null;
}

const TERMINAL_LOCAL_STATUSES = ["filled", "cancelled", "failed"] as const;

function mapExchangeStatus(exchangeStatus: string): string {
  switch (exchangeStatus) {
    case "NEW":
      return "pending";
    case "PARTIALLY_FILLED":
      return "partially_filled";
    case "FILLED":
      return "filled";
    case "CANCELED":
      return "cancelled";
    case "EXPIRED":
      return "cancelled";
    case "REJECTED":
      return "failed";
    default:
      return exchangeStatus.toLowerCase();
  }
}

export async function reconcileLiveTrades(
  db: SupabaseClient<Database>,
  fetchExchangeOrder: (trade: ReconciliationTrade) => Promise<{ status: string; filled: number } | null>,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { tradesChecked: 0, divergences: 0, errors: 0, details: [] };

  const { data: trades, error } = await db
    .from("trades")
    .select("id, user_id, binance_order_id, trading_pair, status, quantity, filled_quantity")
    .eq("mode", "live")
    .in("status", ["pending", "partially_filled"])
    .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw error;

  for (const trade of (trades ?? []) as ReconciliationTrade[]) {
    result.tradesChecked++;
    try {
      const exchange = await fetchExchangeOrder(trade);
      if (!exchange) {
        result.divergences++;
        result.details.push({
          tradeId: trade.id,
          localState: trade.status ?? "unknown",
          exchangeState: "not_found",
          diff: "missing",
        });
        continue;
      }

      const localStatus = trade.status ?? "unknown";
      const localDone = TERMINAL_LOCAL_STATUSES.includes(localStatus as typeof TERMINAL_LOCAL_STATUSES[number]);
      const exchangeLocalStatus = mapExchangeStatus(exchange.status);
      const exchangeDone = TERMINAL_LOCAL_STATUSES.includes(exchangeLocalStatus as typeof TERMINAL_LOCAL_STATUSES[number]);
      const localFilled = trade.filled_quantity ?? trade.quantity;
      const EPSILON = 1e-8;
      const quantityDiffers = Math.abs(localFilled - exchange.filled) > EPSILON;

      if (
        localStatus !== exchangeLocalStatus ||
        localDone !== exchangeDone ||
        quantityDiffers
      ) {
        result.divergences++;
        result.details.push({
          tradeId: trade.id,
          localState: localStatus,
          exchangeState: exchange.status,
          diff:
            localStatus !== exchangeLocalStatus
              ? "status mismatch"
              : localDone !== exchangeDone
                ? "state mismatch"
                : quantityDiffers
                  ? "quantity mismatch"
                  : "unknown mismatch",
        });
      }
    } catch (err) {
      result.errors++;
      result.details.push({
        tradeId: trade.id,
        localState: trade.status ?? "unknown",
        exchangeState: "error",
        diff: String(err),
      });
    }
  }

  return result;
}
