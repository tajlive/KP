import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = (await supabase
    .from("auto_trading_configs" as unknown)
    .select("*")
    .eq("user_id", userId)
    .single()) as unknown;

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Failed to get auto trading config:", error);
    throw new Error("Failed to get auto trading config");
  }

  return data as AutoTradingConfig;
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
    const { data, error } = (await supabase
      .from("auto_trading_configs" as unknown)
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single()) as unknown;

    if (error) {
      console.error("Failed to update auto trading config:", error);
      throw new Error("Failed to update auto trading config");
    }

    return data as AutoTradingConfig;
  } else {
    // Create
    const { data, error } = (await supabase
      .from("auto_trading_configs" as unknown)
      .insert({
        user_id: userId,
        enabled: config.enabled ?? false,
        mode: config.mode ?? "paper",
        risk_level: config.risk_level ?? "medium",
        max_trade_size_nok: config.max_trade_size_nok ?? 10000,
        ...config,
      })
      .select()
      .single()) as unknown;

    if (error) {
      console.error("Failed to create auto trading config:", error);
      throw new Error("Failed to create auto trading config");
    }

    return data as AutoTradingConfig;
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
      .from("auto_trading_configs")
      .update({ enabled, updated_at: new Date().toISOString() })
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

  const { data, error } = (await supabase
    .from("auto_trading_configs" as unknown)
    .select("*")
    .eq("enabled", true)) as unknown;

  if (error) {
    console.error("Failed to get active auto traders:", error);
    throw new Error("Failed to get active auto traders");
  }

  return data as AutoTradingConfig[];
}

/**
 * Get recent trading signals from AI
 */
export async function getRecentTradingSignals(
  limit: number = 10,
  minConfidence: number = 70,
): Promise<TradingSignal[]> {
  const supabase = await createClient();

  const { data, error } = (await supabase
    .from("ai_decision_log" as unknown)
    .select("*")
    .in("decision_type", ["BUY", "SELL"])
    .gte("confidence", minConfidence)
    .order("created_at", { ascending: false })
    .limit(limit)) as unknown;

  if (error) {
    console.error("Failed to get trading signals:", error);
    throw new Error("Failed to get trading signals");
  }

  return (data || []).map((item: unknown) => ({
    id: item.id,
    symbol: item.symbol,
    action: item.decision_type.toLowerCase() as "buy" | "sell",
    confidence: item.confidence,
    price: item.price || 0,
    reasoning: item.reasoning || "",
    created_at: item.created_at,
  }));
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

  const { error } = (await supabase.from("auto_trade_log" as unknown).insert({
    user_id: userId,
    signal_id: signal.id,
    symbol: signal.symbol,
    action: signal.action,
    confidence: signal.confidence,
    price: signal.price,
    mode: config.mode,
    success,
    error_message: errorMessage,
  })) as unknown;

  if (error) {
    console.error("Failed to log auto trade:", error);
  }
}
