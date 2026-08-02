import type { Json } from "@/types/database.types";

export interface Trade {
  id: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  realized_pnl: number | null;
  mode?: string | null;
  status: string;
  created_at: string;
  executed_at: string | null;
  strategy_signal: Json | null;
}

export interface TradeDecisionRow {
  id: string;
  decision_type: string;
  trading_mode: string;
  symbol: string;
  side: string;
  requested_quantity: number;
  requested_price: number;
  rejection_reason: string | null;
  created_at: string;
}

export function parseStrategySignal(
  raw: Json | null
): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}
