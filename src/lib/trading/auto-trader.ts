/**
 * Auto-trader entry point — refactored 2026-07-08
 * Temporær stub mens SmartTrader v2 debugges.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supa = SupabaseClient<Database>;

export interface TradingResult {
  userId: string;
  trades: number;
  buys: number;
  sells: number;
  skipped: number;
}

export async function runNextGenAutoTrading(
  _supabase: Supa,
): Promise<TradingResult[]> {
  // SmartTrader v2 under aktiv utvikling — returner tomt resultat
  return [];
}
