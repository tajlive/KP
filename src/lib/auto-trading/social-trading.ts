/**
 * Social Trading & Copy-Trading Engine
 * Håndterer kobling mellom "Strategy Creators" og "Followers"
 */

import { createClient } from "../supabase/client";
import { executeTrade } from "./binance-executor";
import type {
  AutoTradingTrade,
  TradingSignal,
  UserAutoTradingConfig,
} from "./types";

/**
 * Følg en strategi
 */
export async function followStrategy(
  userId: string,
  strategyId: string,
  capitalNok: number,
) {
  const supabase = createClient();

  // 1. Opprett en ny auto-trading config for brukeren
  const { data: config, error: configError } = await supabase
    .from("user_auto_trading_configs")
    .insert({
      user_id: userId,
      strategy_id: strategyId,
      trading_capital_nok: capitalNok,
      is_enabled: true,
      phase: "paper", // Start alltid i paper trading for nye følgere
    })
    .select()
    .single();

  if (configError) throw configError;

  // 2. Start en sesjon
  const { data: session, error: sessionError } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: userId,
      config_id: config.id,
      strategy_name: "Followed Strategy", // Bør hentes fra strategy tabellen
      starting_capital_nok: capitalNok,
      current_capital_nok: capitalNok,
      status: "ACTIVE",
    } as any);

  if (sessionError) throw sessionError;

  return { config, session };
}

/**
 * Kopier en handel fra en strategi-skaper til alle følgere
 */
export async function copyTrade(originalTrade: AutoTradingTrade) {
  const supabase = createClient();

  // 1. Finn alle aktive sesjoner som følger denne strategien
  // (Dette krever en join eller at vi vet hvilken strategi trade-en tilhører)
  const { data: followers, error: followersError } = await supabase
    .from("trading_sessions")
    .select("*, user_auto_trading_configs!inner(*)")
    .eq(
      "user_auto_trading_configs.strategy_id",
      originalTrade.strategy_used ?? "",
    )
    .eq("status", "ACTIVE");

  if (followersError || !followers) return;

  console.info(`Copying trade for ${followers.length} followers`);

  for (const follower of followers as {
    user_id: string;
    id: string;
    user_auto_trading_configs?: { max_position_size_pct?: number };
  }[]) {
    try {
      const config = follower.user_auto_trading_configs;
      // 2. Opprett et signal som speiler original trade
      const copySignal: TradingSignal = {
        symbol: originalTrade.symbol,
        side: originalTrade.side,
        entry_price: originalTrade.entry_price,
        stop_loss_price: originalTrade.stop_loss_price || 0,
        take_profit_price: originalTrade.take_profit_price,
        position_size_pct: config?.max_position_size_pct ?? 5,
        leverage: originalTrade.leverage,
        confidence: originalTrade.ml_confidence || 100,
        risk_score: originalTrade.risk_score || 50,
        market_volatility_pct: originalTrade.market_volatility_pct || 0,
        reason: `Kopiert fra strategi: ${originalTrade.strategy_used}`,
      };

      // 3. Hent config og credentials for følger
      const { data: followerConfig } = await supabase
        .from("user_auto_trading_configs")
        .select("*")
        .eq("user_id", follower.user_id)
        .single();

      if (!followerConfig) continue;

      const { data: apiKeys } = await supabase
        .from("trading_api_keys")
        .select("*")
        .eq("user_id", follower.user_id)
        .eq("exchange", "binance")
        .single();

      if (!apiKeys) continue;

      // 4. Utfør handel for følger
      await executeTrade({
        userId: follower.user_id,
        sessionId: follower.id,
        signal: copySignal,
        config: followerConfig as UserAutoTradingConfig,
        credentials: {
          apiKey:
            (
              apiKeys as {
                api_key?: string;
                api_secret?: string;
                is_testnet?: boolean;
              }
            ).api_key ?? "",
          apiSecret: (apiKeys as { api_secret?: string }).api_secret ?? "",
          isTestnet: (apiKeys as { is_testnet?: boolean }).is_testnet ?? false,
        },
      });
    } catch (err) {
      console.error(`Failed to copy trade for user ${follower.user_id}:`, err);
    }
  }
}
