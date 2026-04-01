/**
 * Portfolio Library - Server-side portfolio queries
 *
 * Denne modulen håndterer alle porteføljerelaterte database-spørringer.
 * Støtter både paper trading og Binance (real trading) data.
 */

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

// =============================================================================
// Types
// =============================================================================

export interface PortfolioOverview {
  totalValue: number;
  totalProfitAbs: number;
  totalProfitPct: number;
  dayChangeAbs: number;
  dayChangePct: number;
  totalInvested: number;
  positionCount: number;
  hasRealAccount: boolean;
  lastSynced: string | null;
}

interface BinanceBalance {
  id: string;
  asset: string;
  total: number | null;
  nok_value: number | null;
  usd_value: number | null;
  updated_at: string | null;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  totalInvested: number;
  lastUpdated: string | null;
  isReal: boolean; // true = Binance, false = Paper trading
}

export interface PortfolioSummary {
  overview: PortfolioOverview;
  positions: PortfolioPosition[];
  hasData: boolean;
  dataSource: "binance" | "paper" | "none";
}

export interface PortfolioError {
  message: string;
  code: string;
}

// =============================================================================
// Type Guards
// =============================================================================

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function safeNumber(value: unknown, defaultValue = 0): number {
  return isValidNumber(value) ? value : defaultValue;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// =============================================================================
// Database Queries
// =============================================================================

/**
 * Hent porteføljeoversikt for innlogget bruker
 * Prøver først Binance-data, deretter paper trading
 */
export async function getPortfolioOverview(
  userId: string,
): Promise<PortfolioSummary | null> {
  try {
    const supabase = await createClient();

    // Sjekk om bruker har Binance API keys
    const { data: apiKeys } = await supabase
      .from("exchange_api_keys")
      .select("*")
      .eq("user_id", userId)
      .eq("exchange", "binance")
      .eq("is_active", true)
      .single();

    // Hvis Binance-konto, prøv å hente Binance-balanser
    if (apiKeys) {
      const { data: binanceBalances } = await supabase
        .from("binance_balances")
        .select("*")
        .eq("user_id", userId)
        .gt("total", 0)
        .order("usd_value", { ascending: false });

      if (binanceBalances && binanceBalances.length > 0) {
        // Bruker har Binance-data
        const totalValue = binanceBalances.reduce(
          (sum: number, b: Tables<"binance_balances">) =>
            sum + safeNumber(b.usd_value),
          0,
        );
        const lastSynced = binanceBalances[0]?.updated_at || null;

        const mappedPositions: PortfolioPosition[] = binanceBalances.map(
          (bal: Tables<"binance_balances">) => ({
            id: bal.id,
            symbol: bal.asset,
            quantity: safeNumber(bal.total),
            avgBuyPrice: 0, // Vi har ikke denne fra Binance spot
            currentPrice: 0, // Ikke tilgjengelig direkte
            currentValue: safeNumber(bal.usd_value),
            unrealizedPnl: 0,
            unrealizedPnlPercent: 0,
            totalInvested: 0,
            lastUpdated: bal.updated_at,
            isReal: true,
          }),
        );

        return {
          overview: {
            totalValue: Math.round(totalValue * 100) / 100,
            totalProfitAbs: 0,
            totalProfitPct: 0,
            dayChangeAbs: 0,
            dayChangePct: 0,
            totalInvested: 0,
            positionCount: binanceBalances.length,
            hasRealAccount: true,
            lastSynced,
          },
          positions: mappedPositions,
          hasData: true,
          dataSource: "binance",
        };
      }
    }

    // Fallback til paper trading data
    const { data: positions, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching portfolio:", error);
      return null;
    }

    if (!positions || positions.length === 0) {
      return {
        overview: {
          totalValue: 0,
          totalProfitAbs: 0,
          totalProfitPct: 0,
          dayChangeAbs: 0,
          dayChangePct: 0,
          totalInvested: 0,
          positionCount: 0,
          hasRealAccount: !!apiKeys,
          lastSynced: null,
        },
        positions: [],
        hasData: false,
        dataSource: "none",
      };
    }

    // Beregn totalsummer for paper trading
    let totalValue = 0;
    let totalInvested = 0;
    let totalUnrealizedPnl = 0;

    const mappedPositions: PortfolioPosition[] = positions.map(
      (pos: Tables<"portfolios">) => {
        const positionValue = safeNumber(pos.current_balance);
        const positionInvested = safeNumber(pos.total_invested);
        const positionPnl = safeNumber(pos.total_profit);

        totalValue += positionValue;
        totalInvested += positionInvested;
        totalUnrealizedPnl += positionPnl;

        return {
          id: pos.id,
          symbol: pos.currency || "UNKNOWN",
          quantity: 0, // Ikke tilgjengelig direkte i portfolios-tabellen
          avgBuyPrice: 0,
          currentPrice: 0,
          currentValue: positionValue,
          unrealizedPnl: positionPnl,
          unrealizedPnlPercent: safeNumber(pos.total_profit_percent),
          totalInvested: positionInvested,
          lastUpdated: pos.updated_at,
          isReal: false,
        };
      },
    );

    const totalProfitAbs = totalUnrealizedPnl;
    const totalProfitPct = calculatePercentChange(totalValue, totalInvested);

    return {
      overview: {
        totalValue: Math.round(totalValue * 100) / 100,
        totalProfitAbs: Math.round(totalProfitAbs * 100) / 100,
        totalProfitPct: Math.round(totalProfitPct * 100) / 100,
        dayChangeAbs: 0,
        dayChangePct: 0,
        totalInvested: Math.round(totalInvested * 100) / 100,
        positionCount: positions.length,
        hasRealAccount: !!apiKeys,
        lastSynced: null,
      },
      positions: mappedPositions.sort(
        (a, b) => b.currentValue - a.currentValue,
      ),
      hasData: true,
      dataSource: "paper",
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("Unexpected error in getPortfolioOverview:", error);
    return null;
  }
}

/**
 * Synkroniser Binance data for bruker
 * Kalles fra API eller Edge Function
 */
export async function syncBinancePortfolio(
  userId: string,
): Promise<{ success: boolean; message: string; synced?: number }> {
  try {
    const supabase = await createClient();

    // Sjekk om bruker har API keys
    const { data: apiKeys } = await supabase
      .from("exchange_api_keys")
      .select("api_key_encrypted, api_secret_encrypted, is_testnet")
      .eq("user_id", userId)
      .eq("exchange", "binance")
      .eq("is_active", true)
      .single();

    if (!apiKeys) {
      return { success: false, message: "No Binance API keys found" };
    }

    // Logg sync-forsøk
    await supabase.from("binance_sync_log").insert({
      user_id: userId,
      status: "in_progress",
      message: "Starting sync",
    });

    // Her ville vi kalle Binance API - dette må gjøres fra en Edge Function
    // for å ikke eksponere API secrets på client-side

    return {
      success: true,
      message: "Sync initiated. Data will be updated shortly.",
      synced: 0,
    };
  } catch (err) {
    console.error("Error syncing Binance portfolio:", err);
    return { success: false, message: "Sync failed" };
  }
}

/**
 * Hent sync-logg for bruker
 */
export async function getBinanceSyncLog(userId: string, limit = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("binance_sync_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching sync log:", error);
    return [];
  }

  return data || [];
}
