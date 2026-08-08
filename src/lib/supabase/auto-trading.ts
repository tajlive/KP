import { createClient } from "@/lib/supabase/server";
import { getOptimizedRiskProfile } from "@/lib/config/optimized-risk-profiles";
import type { Tables } from "@/types/database.types";

export interface AutoTradingConfig {
  id: string;
  user_id: string;
  enabled: boolean;
  mode: "paper" | "live";
  risk_level: "low" | "medium" | "high";
  max_trade_size_nok: number;
  created_at: string;
  updated_at: string;
}

// DB stores risk_profile as conservative/moderate/aggressive,
// but the app interface uses low/medium/high.
const riskLevelToProfile = {
  low: "conservative",
  medium: "moderate",
  high: "aggressive",
} as const;

const riskProfileToLevel: Record<
  "conservative" | "moderate" | "aggressive",
  "low" | "medium" | "high"
> = {
  conservative: "low",
  moderate: "medium",
  aggressive: "high",
};

export interface TradingSignal {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  confidence: number;
  price: number;
  reasoning: string;
  created_at: string;
}

/**
 * Get auto trading config for a user
 */
export async function getAutoTradingConfig(
  userId: string,
): Promise<AutoTradingConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("auto_trade_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Failed to get auto trading config:", error);
    throw new Error("Failed to get auto trading config");
  }

  if (!data) return null;

  // Map auto_trade_settings to AutoTradingConfig interface
  return {
    id: data.id,
    user_id: data.user_id,
    enabled: data.auto_trading_enabled ?? false,
    mode: "paper",
    risk_level:
      riskProfileToLevel[
        (data.risk_profile as "conservative" | "moderate" | "aggressive") ||
          "moderate"
      ],
    max_trade_size_nok: (data.max_position_percent ?? 0) * 1000, // Approximate conversion
    created_at: data.created_at ?? "",
    updated_at: data.updated_at ?? "",
  };
}

/**
 * Create or update auto trading config
 */
export async function upsertAutoTradingConfig(
  userId: string,
  config: Partial<AutoTradingConfig>,
): Promise<AutoTradingConfig> {
  const supabase = await createClient();

  // Check if config exists
  const existing = await getAutoTradingConfig(userId);

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("auto_trade_settings")
      .update({
        auto_trading_enabled: config.enabled,
        risk_profile:
          riskLevelToProfile[(config.risk_level as "low" | "medium" | "high") || "medium"],
        max_position_percent: config.max_trade_size_nok
          ? config.max_trade_size_nok / 1000
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update auto trading config:", error);
      throw new Error("Failed to update auto trading config");
    }

    return {
      id: data.id,
      user_id: data.user_id,
      enabled: data.auto_trading_enabled ?? false,
      mode: "paper",
      risk_level:
        riskProfileToLevel[
          (data.risk_profile as "conservative" | "moderate" | "aggressive") ||
            "moderate"
        ],
      max_trade_size_nok: (data.max_position_percent ?? 0) * 1000,
      created_at: data.created_at ?? "",
      updated_at: data.updated_at ?? "",
    };
  } else {
    // Create — derive defaults from optimized risk profile
    const profileKey =
      riskLevelToProfile[(config.risk_level as "low" | "medium" | "high") || "medium"];
    const profile = getOptimizedRiskProfile(profileKey as "conservative" | "moderate" | "aggressive" | "dynamic");

    const { data, error } = await supabase
      .from("auto_trade_settings")
      .insert({
        user_id: userId,
        auto_trading_enabled: config.enabled ?? false,
        risk_profile: profileKey,
        max_position_percent: config.max_trade_size_nok
          ? config.max_trade_size_nok / 1000
          : profile.maxPositionSizePercent,
        daily_loss_limit_percent: profile.maxDailyLossPercent,
        daily_trade_limit: profile.maxTradesPerDay,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create auto trading config:", error);
      throw new Error("Failed to create auto trading config");
    }

    return {
      id: data.id,
      user_id: data.user_id,
      enabled: data.auto_trading_enabled ?? false,
      mode: "paper",
      risk_level:
        riskProfileToLevel[
          (data.risk_profile as "conservative" | "moderate" | "aggressive") ||
            "moderate"
        ],
      max_trade_size_nok: (data.max_position_percent ?? 0) * 1000,
      created_at: data.created_at ?? "",
      updated_at: data.updated_at ?? "",
    };
  }
}

/**
 * Toggle auto trading on/off
 */
export async function toggleAutoTrading(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const supabase = await createClient();

  const config = await getAutoTradingConfig(userId);

  if (config) {
    const { error } = await supabase
      .from("auto_trade_settings")
      .update({
        auto_trading_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    if (error) {
      console.error("Failed to toggle auto trading:", error);
      throw new Error("Failed to toggle auto trading");
    }
  } else {
    // Create with enabled = true
    await upsertAutoTradingConfig(userId, { enabled });
  }
}

/**
 * Get all users with auto trading enabled
 */
export async function getActiveAutoTraders(): Promise<AutoTradingConfig[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("auto_trade_settings")
    .select("*")
    .eq("auto_trading_enabled", true);

  if (error) {
    console.error("Failed to get active auto traders:", error);
    throw new Error("Failed to get active auto traders");
  }

  return (data || []).map((item: Tables<"auto_trade_settings">) => ({
    id: item.id,
    user_id: item.user_id,
    enabled: item.auto_trading_enabled ?? false,
    mode: "paper",
    risk_level:
      riskProfileToLevel[
        (item.risk_profile as "conservative" | "moderate" | "aggressive") ||
          "moderate"
      ],
    max_trade_size_nok: (item.max_position_percent ?? 0) * 1000,
    created_at: item.created_at ?? "",
    updated_at: item.updated_at ?? "",
  }));
}

/**
 * Get recent trading signals from AI
 */
export async function getRecentTradingSignals(
  limit: number = 10,
  minConfidence: number = 70,
): Promise<TradingSignal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_decision_log")
    .select("*")
    .in("decision_type", ["BUY", "SELL"])
    .gte("sentiment_score", minConfidence)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get trading signals:", error);
    throw new Error("Failed to get trading signals");
  }

  // Extract prices from adjustments where ai-engine stores them,
  // then batch-fetch any missing prices (Kraken — EU/EØS 2026).
  // ai_decision_log-kolonner: adjustments(Json), sentiment_classification,
  // sentiment_value, explanation — symbol ligger i adjustments-json.
  const signals = (data || []).map((item: Tables<"ai_decision_log">) => {
    const analysisData = item.adjustments as Record<string, unknown> | null;
    const storedPrice = analysisData?.current_price as number | undefined;
    return {
      id: item.id,
      symbol: (analysisData?.symbol as string | undefined) ?? "UNKNOWN",
      action: String(item.sentiment_classification ?? "hold").toLowerCase() as "buy" | "sell",
      confidence: item.sentiment_value ?? 0,
      price: storedPrice ?? 0,
      reasoning: item.explanation || "",
      created_at: item.created_at ?? "",
    };
  });

  // Fetch missing prices from Kraken (via egen rute — EU/EØS 2026) for signals
  const symbolsNeedingPrice = [...new Set(
    signals.filter((s) => s.price === 0).map((s) => s.symbol),
  )];

  if (symbolsNeedingPrice.length > 0) {
    const priceMap = new Map<string, number>();
    // Batch: én rute for alle symboler
    try {
      const res = await fetch(
        `/api/market/binance-prices?symbols=${encodeURIComponent(symbolsNeedingPrice.join(","))}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          prices?: Array<{ symbol: string; price: number }>;
        };
        for (const p of json.prices ?? []) {
          priceMap.set(p.symbol, p.price);
        }
      }
    } catch {
      console.warn("Failed to batch-fetch prices from Kraken");
    }

    for (const signal of signals) {
      if (signal.price === 0) {
        signal.price = priceMap.get(signal.symbol) ?? 0;
      }
    }
  }

  return signals.filter((s) => s.price > 0);
}

/**
 * Log auto trade execution
 */
export async function logAutoTrade(
  userId: string,
  signal: TradingSignal,
  config: AutoTradingConfig,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("auto_trade_log").insert({
    user_id: userId,
    symbol: signal.symbol,
    action: signal.action.toLowerCase(),
    amount_nok: signal.price * (signal.confidence / 100),
    price_at_action: signal.price,
    reason: signal.reasoning,
    sentiment_score: signal.confidence,
    is_paper: config.mode === "paper",
    status: success ? "executed" : "failed",
    error_message: errorMessage,
  });

  if (error) {
    console.error("Failed to log auto trade:", error);
  }
}
