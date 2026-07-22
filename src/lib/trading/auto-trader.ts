/**
 * Auto-trader entry point — refactored 2026-07-08
 * Temporær stub mens SmartTrader v2 debugges.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AutoTradingConfig, TradingSignal } from "@/lib/supabase/auto-trading";

type Supa = SupabaseClient<Database>;

export interface TradingResult {
  userId: string;
  trades: number;
  buys: number;
  sells: number;
  skipped: number;
}

const CONFIDENCE_THRESHOLDS: Record<AutoTradingConfig["risk_level"], number> = {
  low: 75,
  medium: 60,
  high: 40,
};

const MAX_SIGNAL_AGE_MS = 15 * 60 * 1000; // 15 minutes

export class AutoTrader {
  private config: AutoTradingConfig;

  constructor(config: AutoTradingConfig) {
    this.config = config;
  }

  /** Decide whether a signal should be executed based on risk level, confidence, and freshness. */
  async shouldExecute(signal: TradingSignal): Promise<boolean> {
    const age = Date.now() - new Date(signal.created_at).getTime();
    if (age > MAX_SIGNAL_AGE_MS) {
      return false;
    }

    const threshold = CONFIDENCE_THRESHOLDS[this.config.risk_level] ?? 60;
    return signal.confidence >= threshold;
  }

  /** Calculate quantity to trade based on confidence fraction of max trade size. */
  calculateTradeSize(signal: TradingSignal): number {
    const fraction = Math.min(signal.confidence / 100, 1);
    const tradeValueNok = this.config.max_trade_size_nok * fraction;
    return tradeValueNok / signal.price;
  }
}

export async function runNextGenAutoTrading(
  _supabase: Supa,
): Promise<TradingResult[]> {
  // SmartTrader v2 under aktiv utvikling — returner tomt resultat
  return [];
}
