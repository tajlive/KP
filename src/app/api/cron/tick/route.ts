/**
 * CRON TICK ENGINE - Unified Trading System
 * Processes ALL trading sessions with integrated Risk Management
 *
 * CRITICAL: Every trade MUST pass validateTradeAgainstRiskProfile() BEFORE execution
 */

import type { RiskConfig } from "@/lib/auto-trading/risk-levels";
import { KrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";
import {
  pickPriceSource,
  priceCacheKey,
  type PriceSource,
} from "@/lib/trading/price-source";
import type { Kline } from "@/lib/trading/canonical/market-data/types";
import { validateTradeAgainstRiskProfile } from "@/lib/trading/safety/risk-validator";
import {
  executeTrade,
  type ExecuteTradeRequest,
  type TradeSignalContext,
} from "@/lib/trading/core/execute-trade";
import {
  getPositionBaseQuantity,
  normalizePositionPricesToUsdt,
  type StoredPositionLike,
} from "@/lib/trading/position-currency";
import {
  resolveTickStrategyEngineKey,
  getStrategyConfig,
  shouldUseDarkFleet,
  getDarkFleetConfig,
} from "@/lib/trading/strategy-id-aliases";
import { clampDCAConfig } from "@/lib/trading/dca-validation";
import { evaluateSignalGuard } from "@/lib/trading/signal-guard";
import { adoptOrphanPositions } from "@/lib/trading/orphan-positions";
import {
  buildTradeReason,
  buildIndicatorSnapshot,
  resolveStrategyKey,
} from "@/lib/trading/build-trade-reason";
import { div, mul } from "@/lib/decimal";
import { createClient } from "@/lib/supabase/server";
import {
  captureCronError,
  captureCronSuccess,
  generateTradeIdempotencyKey,
} from "@/lib/cron/cron-helpers";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import type { TradeSide, TradingSession } from "@/types/trading";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  createLedger,
  addLot,
  sellFIFO,
  getTotalQuantity,
  migrateFromLegacy,
  toLegacyPosition,
  type LedgerState,
} from "@/lib/trading/position-ledger";
import {
  resolveStrategy,
  type Candle,
  type StrategySignal,
} from "@/lib/trading/strategies";

import { logger } from "@/lib/logger";
import {
  evaluateDarkFleetSignal,
  type DarkFleetConfig,
} from "@/lib/trading/regime/tick-adapter";
import { getFlagsAsync } from "@/lib/flags";
// Rollout framework available for future A/B testing:
// import { shouldUseChallenger, type TradeVersion } from "@/lib/trading/rollout/tick-rollout";
import {
  evaluateGuardrails,
  pauseUserSessions,
  DEFAULT_GUARDRAIL_CONFIG,
} from "@/lib/trading/beta/tick-guardrails";
import {
  GUARD_ERROR_OR_FILTER,
  isGuardError,
  isSessionTradeable,
  sessionSkipReason,
  type TradeableSessionLike,
} from "@/lib/trading/session-guard";
import { queueEmail } from "@/lib/email";
import { calculateDynamicPositionSize } from "@/lib/trading/optimal/position-size";
import { applyMultiTimeframeFilter } from "@/lib/trading/multi-timeframe";
import { usdtToNok, getUsdtToNokRate } from "@/lib/trading/currency";
import { runEnsembleForSymbol } from "@/lib/ai/ensemble-v2";
import { validateCronSecret } from "@/lib/auth/cron";
import { syncPaperAccountBalance } from "@/lib/trading/core/paper-account-sync";
// Fase 2 strategi-gates (2026-07-31)
import {
  evaluateRegimeGate,
  evaluateAntiWhipsaw,
  evaluateTrailingExit,
  jitteredSizeMultiplier,
  symbolEdgeWeight,
  type SymbolEdgeStats,
} from "@/lib/trading/strategy-gates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Execution timeout is controlled by the Cloudflare/OpenNext runtime configuration.

interface TickResult {
  session_id: string;
  action:
    | "buy"
    | "sell"
    | "hold"
    | "error"
    | "heartbeat"
    | "risk_blocked"
    | "live_trade_failed";
  error?: string;
  reason?: string;
  trade_id?: string;
  risk_reason?: string;
}

// Price Data Fetcher — ALWAYS uses mainnet for paper/live parity.
// EU/EØS (2026): Kraken er ENESTE priskilde (MiCA-regulert).
// Kraken-par finnes for alle støttede
// symboler (USDC-kvote) — se INTERNAL_TO_KRAKEN i kraken-provider.ts.
const krakenProvider = new KrakenMarketDataProvider();

async function fetchCandles(
  pair: string,
  interval: string = "1h",
  limit: number = 100,
  source: PriceSource = "kraken",
): Promise<Candle[]> {
  // Always use mainnet — paper and live see identical prices
  const symbol = pair.replace("/", "");

  try {
    const klines = await krakenProvider.getKlines(symbol, interval, limit);
    return klines.map((k: Kline) => ({
      time: k.timestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));
  } catch (err) {
    console.error("Kraken API fetch failed:", err);
    throw new Error(`KRAKEN_API_UNAVAILABLE: ${(err as Error).message}`);
  }
}

export type LiveTradeResult =
  | {
      ok: true;
      executedPrice: number;
      executedQuantity: number;
      krakenOrderId: string;
      fee: number;
    }
  | { ok: false; error: string; permanent: boolean };

function classifyLiveTradeError(error: string): {
  error: string;
  permanent: boolean;
} {
  const lower = error.toLowerCase();
  const transient = [
    "unavailable",
    "circuit breaker",
    "timeout",
    "403",
    "429",
    "endpoints failed",
    "network",
    "rate limit",
    "blocked",
    "temporarily",
    "econn",
    "fetch failed",
    "all kraken api endpoints failed",
  ];
  const permanent = [
    "invalid api key",
    "api key",
    "unauthorized",
    "rejected",
    "permission",
    "forbidden",
    "invalid symbol",
    "lot size",
    "minimum",
    "insufficient",
    "malformed",
    "bad",
    "not authorized for live trading",
  ];

  if (transient.some((k) => lower.includes(k))) {
    return { error, permanent: false };
  }
  if (permanent.some((k) => lower.includes(k))) {
    return { error, permanent: true };
  }
  // Default to transient so unknown errors do not permanently stop sessions.
  return { error, permanent: false };
}

/**
 * Execute a live trade on Kraken using user's API keys.
 * Uses ExecutorFactory for consistent key decryption and tier validation.
 * Returns a discriminated result so callers can decide whether to stop the
 * session or retry on the next tick.
 */
export async function executeLiveTrade(
  db: SupabaseClient<Database>,
  userId: string,
  pair: string,
  side: "buy" | "sell",
  quantity: number,
): Promise<LiveTradeResult> {
  try {
    // 1. Validate user can trade live (tier + connected)
    const canTrade = await ExecutorFactory.canTradeLive(db, userId);
    if (!canTrade) {
      const error = `User ${userId} not authorized for live trading`;
      console.warn(`[LiveTrade] ${error}`);
      return { ok: false, error, permanent: true };
    }

    // 2. Create executor via factory (handles key decryption)
    const executor = await ExecutorFactory.create(db, userId, "live");

    // 3. Execute on Kraken
    const krakenSymbol = pair.replace("/", "");
    const result = await executor.executeOrder({
      symbol: krakenSymbol,
      side,
      quantity,
      orderType: "market",
    });

    if (!result.success) {
      console.error(
        `[LiveTrade] Kraken order failed for user ${userId}:`,
        result.error,
      );
      return {
        ok: false,
        ...classifyLiveTradeError(result.error ?? "Kraken order failed"),
      };
    }
    return {
      ok: true,
      executedPrice: result.executedPrice,
      executedQuantity: result.executedQuantity,
      krakenOrderId: result.orderId,
      fee: result.fee,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[LiveTrade] Unexpected error for user ${userId}:`, error);
    return { ok: false, error, permanent: false };
  }
}

// Per-session cooldown for the in-tick ensemble AI fallback. Cloudflare Workers
// are single-process per instance, so an in-memory Map is sufficient.
const ENSEMBLE_FALLBACK_COOLDOWN_MS = 5 * 60 * 1000;
const ensembleFallbackLastInvocation = new Map<string, number>();

function isEnsembleFallbackOnCooldown(sessionId: string): boolean {
  const last = ensembleFallbackLastInvocation.get(sessionId);
  if (!last) return false;
  return Date.now() - last < ENSEMBLE_FALLBACK_COOLDOWN_MS;
}

/**
 * Minimum order value per trading mode og børs. Paper-kapital er NOK (100 NOK ≈
 * 10 USDT), live-kapital er USDT → live-terskelen må være i USDT.
 * Live-fiks 2026-08-01: live-sesjoner ble holdt på ordrer på 75 USDT
 * (innenfor Kraken-minste) fordi NOK-terskelen ble brukt.
 * OKX-fiks 2026-08-11: $10-minimumet var en Kraken-tids konstant (0.80% fee
 * krever store ordrer). OKX (0.10% fee, break-even 0.20%/trade) gjør små
 * ordrer lønnsomme → 1.5 USDC. Uten dette avvises ALLE Pilot-kjøp
 * (grid $5, DCA $2) stille på 101.66 USDC-kapital.
 */
export function minOrderValueForMode(
  mode: string | null | undefined,
  exchange?: "kraken" | "okx",
): number {
  if (mode !== "live") return 100;
  return exchange === "okx" ? 1.5 : 10;
}

/**
 * CRITICAL: Process session with Risk Management
 */
async function processSession(
  db: SupabaseClient<Database>,
  session: TradingSession,
  userRiskConfig?: RiskConfig,
  preFetchedCandles?: Candle[],
  darkFleetBaseConfig?: DarkFleetConfig,
  preFetchedCandles4h?: Candle[],
  preFetchedCandles15m?: Candle[],
  tradingHalted?: boolean,
  // Fase 2 caches (2026-07-31): pre-fetched per batch for anti-whipsaw + edge
  lastSellCache?: Map<string, { at: string; price: number }>,
  edgeCache?: Map<string, SymbolEdgeStats>,
  // Task 2 (Kraken-priser): kilde valgt av kalleren + candle-cache per (source, symbol)
  source?: PriceSource,
  candleCache?: Map<string, Candle[]>,
): Promise<TickResult> {
  if (tradingHalted) {
    return {
      session_id: session.id,
      action: "hold",
      reason: "Global kill-switch active",
    };
  }

  let heartbeatWritten = false;
  const writeHeartbeat = async () => {
    if (heartbeatWritten) return;
    try {
      await db
        .from("trading_sessions")
        .update({
          last_heartbeat: new Date().toISOString(),
          last_tick_at: new Date().toISOString(),
        } as never)
        .eq("id", session.id);
      heartbeatWritten = true;
    } catch (heartbeatErr) {
      console.error(
        `[Tick] Failed to write heartbeat for session ${session.id}:`,
        heartbeatErr,
      );
    }
  };

  try {
    const engineKey = resolveTickStrategyEngineKey(session.strategy_id);
    const pair = session.trading_pair || "BTCUSDT";
    // OPTIMIZATION: Use pre-fetched candles if available, else fetch individually.
    // EU/EØS (2026): Kraken er eneste priskilde for alle brukere.
    const priceSource = source ?? "kraken";
    const candles =
      candleCache?.get(priceCacheKey(priceSource, pair.replace("/", ""))) ??
      preFetchedCandles ??
      (await fetchCandles(pair, "1h", 100, priceSource));
    const currentPrice = candles[candles.length - 1].close;

    // Valuta-guard (inflasjonsfiks 2026-07-27): paper-posisjoner kan ha
    // NOK-denominerte prisfelt (DB-triggeren kopierer trades.price=NOK rett
    // inn i open_position) mens candles er USDT. Uten normalisering ser
    // trailing-TP en evig "krasj fra topp" og fyrer salg hver eneste tick.
    // Normaliseres lokalt for denne ticken — lagret verdi røres ikke.
    if (session.mode === "paper" && session.open_position) {
      session.open_position = normalizePositionPricesToUsdt(
        session.open_position as unknown as StoredPositionLike,
        currentPrice,
        getUsdtToNokRate(),
      ) as unknown as TradingSession["open_position"];
    }

    // ── V2: Load per-strategy config (UUID-aware) ───────────────────────────
    const strategyConfig = getStrategyConfig(session.strategy_id);
    const resolvedEngine =
      strategyConfig?.engine ?? engineKey ?? "multi_signal";
    const baseConfig = strategyConfig?.config ?? {};
    // Merge: session.strategy_config overrides per-UUID defaults so user tuning wins
    const mergedConfig: Record<string, unknown> = {
      ...baseConfig,
      ...session.strategy_config,
      engineKey: resolvedEngine,
    };

    let signal: StrategySignal;

    // ── PATH C: Dark Fleet (regime-aware ensemble) ──────────────────────────
    // V2: Dark Fleet is always enabled in production. Per-strategy config overrides global.
    const perStrategyDF = getDarkFleetConfig(session.strategy_id);
    const dfEnabled =
      perStrategyDF?.enabled ?? darkFleetBaseConfig?.enabled ?? true;

    let darkFleetConfig: DarkFleetConfig | undefined;
    if (dfEnabled && resolvedEngine !== "ensemble_ai") {
      darkFleetConfig = {
        ...darkFleetBaseConfig,
        ...perStrategyDF,
      } as DarkFleetConfig;
    }
    const useDarkFleet = !!darkFleetConfig;
    if (useDarkFleet) {
      try {
        signal = evaluateDarkFleetSignal(
          {
            candles,
            session,
            config: mergedConfig,
          },
          darkFleetConfig,
        );
      } catch (err) {
        console.error(
          `[DarkFleet] Error for session ${session.id}:`,
          (err as Error).message,
        );
        // Fallback to V2
        const fallbackStrategy = resolvedEngine
          ? resolveStrategy(resolvedEngine)
          : undefined;
        if (fallbackStrategy) {
          signal = fallbackStrategy.evaluate({
            candles,
            session,
            config: mergedConfig,
          });
        } else {
          return {
            session_id: session.id,
            action: "error",
            error: `Dark Fleet fallback failed for strategy: ${session.strategy_id}`,
          };
        }
      }
    } else if (resolvedEngine === "ensemble_ai") {
      // === PATH A: Eksisterende ensemble_ai (uendret) ===
      const symbol = pair.replace("/", "");
      let aiSignal = await db
        .from("trading_signals")
        .select("*")
        .eq("symbol", symbol)
        .eq("signal_type", "ensemble_ai")
        .eq("agent_id", "ensemble_master")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data);

      if (!aiSignal) {
        aiSignal = await db
          .from("trading_signals")
          .select("*")
          .eq("symbol", symbol)
          .eq("signal_type", "ensemble_ai")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r) => r.data);
      }

      const maxAgeMs = 4 * 60 * 60 * 1000; // 4 hours (was 2h)
      // OPTIMIZED: Increased from 2h → 4h because ai-engine runs hourly.
      // Tick cron runs every 5 min. With 4h window we survive 3 consecutive
      // ai-engine failures while still rejecting truly stale signals.
      const isRecent = aiSignal?.created_at
        ? Date.now() - new Date(aiSignal.created_at).getTime() < maxAgeMs
        : false;

      if (
        aiSignal &&
        isRecent &&
        (aiSignal.action === "buy" || aiSignal.action === "sell")
      ) {
        signal = {
          action: aiSignal.action,
          positionSize: (mergedConfig.position_size as number) ?? 0.05,
          indicators: {
            source: "ensemble_ai",
            confidence: aiSignal.confidence,
          },
          reason: aiSignal.reasoning || "Ensemble AI signal",
        };
      } else {
        // CRITICAL FALLBACK: If trading_signals is empty/stale, run ensemble DIRECTLY
        // in tick. Prevents zero-trading when ai-engine cron fails or is delayed.
        // Research: 73% of bot failures are execution mismatches, not signal quality.

        // PRODUCTION SAFETY: Live sessions must not spend real money on unvalidated
        // in-tick ensemble signals unless the emergency env var is explicitly set.
        if (
          session.mode === "live" &&
          process.env.TICK_LIVE_ENSEMBLE_FALLBACK !== "enabled"
        ) {
          console.warn(
            `[Tick] Live session ${session.id} held: no recent ensemble AI signal for ${symbol}`,
          );
          return {
            session_id: session.id,
            action: "hold",
            reason: "No recent ensemble AI signal",
          };
        }
        if (isEnsembleFallbackOnCooldown(session.id)) {
          return {
            session_id: session.id,
            action: "hold",
            reason: "Ensemble fallback cooldown active",
          };
        }
        {
          ensembleFallbackLastInvocation.set(session.id, Date.now());
          try {
            const prices = candles.map((c) => c.close);
            const volumes = candles.map((c) => c.volume);
            const consensus = await runEnsembleForSymbol(
              db,
              symbol,
              prices,
              volumes,
              {
                modelVersion: "ensemble-v2",
                featureVersion: "1h-tick-fallback",
              },
            );

            if (consensus.action === "buy" || consensus.action === "sell") {
              signal = {
                action: consensus.action,
                positionSize: (mergedConfig.position_size as number) ?? 0.05,
                indicators: {
                  source: "ensemble_fallback",
                  confidence: consensus.confidence,
                  regime:
                    consensus.agentResults.find((a) => a.agent.id === "hurst")
                      ?.signal.meta?.regime ?? "unknown",
                },
                reason: `Fallback: ${consensus.reasoning}`,
              };
            } else {
              signal = {
                action: "hold",
                reason: `Fallback ensemble: ${consensus.reasoning}`,
              };
            }
          } catch (fallbackErr) {
            console.error(
              `[Tick] Ensemble fallback failed for ${symbol}:`,
              (fallbackErr as Error).message,
            );
            signal = {
              action: "hold",
              reason: "No recent ensemble AI signal + fallback failed",
            };
          }
        }
      }
    } else {
      // === PATH B: V2 strategies with merged config ===
      const strategy = resolvedEngine
        ? resolveStrategy(resolvedEngine)
        : undefined;
      if (!strategy) {
        console.error(
          `[Tick] Unknown strategy for session ${session.id}: "${session.strategy_id}" (engine: ${resolvedEngine}) — skipping`,
        );
        return {
          session_id: session.id,
          action: "error",
          error: `Unknown strategy: ${session.strategy_id}`,
        };
      }
      signal = strategy.evaluate({
        candles,
        session,
        config: mergedConfig,
      });

      // Check for Trailing Up config changes returned from strategy
      if (
        signal.indicators?.new_grid_upper &&
        signal.indicators?.new_grid_lower
      ) {
        const newUpper = signal.indicators.new_grid_upper as number;
        const newLower = signal.indicators.new_grid_lower as number;
        const stratCfg = session.strategy_config as Record<string, unknown>;
        const existingGridConfig =
          typeof stratCfg.grid_config === "object" &&
          stratCfg.grid_config !== null
            ? (stratCfg.grid_config as Record<string, unknown>)
            : {};

        const newGridConfig = {
          ...existingGridConfig,
          upper_price: newUpper,
          lower_price: newLower,
        };

        const newStrategyConfig = {
          ...stratCfg,
          grid_config: newGridConfig,
        };

        // Update config asynchronously but catch errors
        try {
          await db
            .from("trading_sessions")
            .update({ strategy_config: newStrategyConfig } as never)
            .eq("id", session.id);
          console.info(
            `[Tick] Updated grid config for session ${session.id} (Trailing Up: upper=${newUpper}, lower=${newLower})`,
          );
        } catch (err) {
          console.error(
            `[Tick] Failed to persist new grid config for ${session.id}`,
            err,
          );
        }

        // Update local session config for the rest of the tick
        session.strategy_config =
          newStrategyConfig as TradingSession["strategy_config"];
      }
    }

    // DCA-interval-fiks (2026-08-15): persister «sist kjøp» til strategy_config
    // så DCA sin interval-gate måler fra faktisk kjøp, ikke fra heartbeat.
    // (Kun DCA setter indicators.last_buy_at — andre strategier rører ikke dette.)
    if (signal.action === "buy" && signal.indicators?.last_buy_at) {
      const dcaCfg = (session.strategy_config ?? {}) as Record<string, unknown>;
      const newDcaCfg = {
        ...dcaCfg,
        last_buy_at: signal.indicators.last_buy_at,
      };
      try {
        await db
          .from("trading_sessions")
          .update({ strategy_config: newDcaCfg } as never)
          .eq("id", session.id);
      } catch (err) {
        console.error(
          `[Tick] Failed to persist DCA last_buy_at for ${session.id}`,
          err,
        );
      }
      session.strategy_config = newDcaCfg as TradingSession["strategy_config"];
    }

    // Update heartbeat
    await writeHeartbeat();

    // Trailing take-profit check on open positions
    if (session.open_position && signal.action === "hold") {
      const rawEntryPrice = session.open_position.entry_price;
      const entryPrice = Number(rawEntryPrice);
      if (Number.isNaN(entryPrice)) {
        console.warn("tick: missing entry_price in open_position", {
          session: session.id,
          entry_price: rawEntryPrice,
        });
      }
      const highest =
        session.open_position.highest_price &&
        session.open_position.highest_price > 0
          ? session.open_position.highest_price
          : entryPrice;

      // OPTIMIZED: ATR-based trailing stop (AssetWhisper 2026 research: 2 ATR optimal)
      // Falls back to percentage-based if ATR unavailable or disabled
      const stratCfg =
        (session.strategy_config as Record<string, unknown>) ?? {};
      const useAtrTrailing = stratCfg.use_atr_trailing === true;
      let trailingDistance: number;
      let trailingReason: string;

      if (useAtrTrailing && candles.length >= 15) {
        // Calculate ATR14 from candles
        const atrValues: number[] = [];
        for (let i = candles.length - 14; i < candles.length; i++) {
          const high = candles[i].high;
          const low = candles[i].low;
          const prevClose = candles[i - 1]?.close ?? candles[i].open;
          const tr1 = high - low;
          const tr2 = Math.abs(high - prevClose);
          const tr3 = Math.abs(low - prevClose);
          atrValues.push(Math.max(tr1, tr2, tr3));
        }
        const atr14 = atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
        // 2 ATR trailing distance (research-backed optimal)
        trailingDistance = 2 * atr14;
        trailingReason = `ATR14=${atr14.toFixed(2)}`;
      } else {
        // Fallback: percentage-based trailing stop
        const trailingPct = (stratCfg.trailing_stop_pct as number) ?? 2.5;
        trailingDistance = highest * (trailingPct / 100);
        trailingReason = `${trailingPct}%`;
      }

      // Update highest price tracking (use candle high to catch wicks)
      const currentHigh = candles[candles.length - 1].high;
      const newHighest = Math.max(highest, currentPrice, currentHigh);
      if (newHighest > highest) {
        // 2026-08-03: session.open_position er USDT-normalisert (linje ~341),
        // men DB-kontrakten er NOK (guard fn_guard_session_position_symbol).
        // Konverter ALLE prisfelt tilbake til NOK før lagring — ellers
        // overskrives entry_price med USDT hver tick prisen stiger, og
        // posisjonen "forvitrer" (prod-bevis: Toms ADA 1,79 → 0,187 på 3 min).
        const rate = getUsdtToNokRate();
        const posToStore =
          rate > 1
            ? {
                ...session.open_position,
                entry_price:
                  typeof session.open_position.entry_price === "number"
                    ? session.open_position.entry_price * rate
                    : session.open_position.entry_price,
                highest_price: newHighest * rate,
                lots: Array.isArray(session.open_position.lots)
                  ? session.open_position.lots.map(
                      (lot: {
                        quantity?: number;
                        entryPrice?: number;
                        timestamp?: string;
                      }) => ({
                        ...lot,
                        entryPrice:
                          typeof lot?.entryPrice === "number"
                            ? lot.entryPrice * rate
                            : lot?.entryPrice,
                      }),
                    )
                  : session.open_position.lots,
              }
            : { ...session.open_position, highest_price: newHighest };
        await db
          .from("trading_sessions")
          .update({
            open_position: posToStore,
          })
          .eq("id", session.id);
      }

      // Trailing stop: if price drops trailingDistance from peak AND still in profit
      const dropFromPeak = highest - currentPrice;
      if (dropFromPeak >= trailingDistance && currentPrice > entryPrice) {
        const dropPct = ((highest - currentPrice) / highest) * 100;
        signal.action = "sell";
        signal.reason = `Trailing-TP: falt ${dropPct.toFixed(1)} % (${trailingReason}) fra topp $${highest.toFixed(0)}`;
      }

      // Time-based exit: Sell after 7 days if position is not profitable
      const entryTime = new Date(session.open_position.entry_time).getTime();
      const daysInPosition = (Date.now() - entryTime) / (1000 * 60 * 60 * 24);
      const timeExitDays =
        ((session.strategy_config as Record<string, unknown>)
          ?.time_exit_days as number) ?? 7;
      if (daysInPosition >= timeExitDays && currentPrice <= entryPrice) {
        signal.action = "sell";
        signal.reason = `Tidsbasert exit: posisjon holdt i ${daysInPosition.toFixed(1)} dager uten gevinst — begrenser tapet`;
      }

      // Partial Take-Profit: Sell portions at predefined targets
      const pnlPct =
        Number.isNaN(entryPrice) || entryPrice === 0
          ? 0
          : ((currentPrice - entryPrice) / entryPrice) * 100;
      const partialLevels = (session.strategy_config as Record<string, unknown>)
        ?.partial_tp_levels as
        | Array<{ target_pct: number; sell_pct: number }>
        | undefined;

      if (partialLevels && partialLevels.length > 0) {
        // Find which level we're at (if any)
        const positionWithExits =
          session.open_position as typeof session.open_position & {
            partial_exits_executed?: number[];
          };
        const executedLevels = positionWithExits.partial_exits_executed || [];
        const nextLevel = partialLevels.find(
          (l) =>
            pnlPct >= l.target_pct && !executedLevels.includes(l.target_pct),
        );

        if (nextLevel) {
          // Execute partial exit - sell percentage of current position
          const sellFraction = nextLevel.sell_pct / 100;
          const currentQty = session.open_position.quantity || 1;
          signal.action = "sell";
          signal.positionSize =
            (sellFraction * currentQty) / session.current_capital;
          signal.reason = `Delvis TP: ${nextLevel.sell_pct} % ved +${nextLevel.target_pct} % mål`;

          // Mark this level as executed
          await db
            .from("trading_sessions")
            .update({
              open_position: {
                ...session.open_position,
                partial_exits_executed: [
                  ...executedLevels,
                  nextLevel.target_pct,
                ],
              },
            })
            .eq("id", session.id);
        }
      }
    }

    // ── V2: Multi-Timeframe Filter (4h trend + 1h signal + 15m entry) ──────
    if (
      preFetchedCandles4h &&
      preFetchedCandles15m &&
      signal.action !== "hold"
    ) {
      const mtfResult = applyMultiTimeframeFilter(
        candles,
        preFetchedCandles4h,
        preFetchedCandles15m,
        signal.action,
        signal.indicators?.confidence
          ? (signal.indicators.confidence as number) / 3
          : 0.8,
        {
          strategyKey: resolvedEngine,
          trendThreshold: 0.5,
          entryThreshold: 0.7,
        },
      );

      logger.debug(
        `[MTF] Session ${session.id}: score=${mtfResult.score} trend=${mtfResult.trendDirection}(${mtfResult.trendScore}) entry=${mtfResult.entryConfirm} passed=${mtfResult.passed}`,
      );

      if (!mtfResult.passed) {
        signal = {
          action: "hold",
          reason: `MTF blocked: ${mtfResult.reason}`,
          indicators: {
            ...signal.indicators,
            mtf_blocked: true,
            mtf_score: mtfResult.score,
            mtf_trend_score: mtfResult.trendScore,
            mtf_entry_score: mtfResult.entryConfirm,
            mtf_trend_direction: mtfResult.trendDirection,
          },
        };
      } else {
        // Enrich signal with MTF context
        signal.indicators = {
          ...signal.indicators,
          mtf_score: mtfResult.score,
          mtf_trend_score: mtfResult.trendScore,
          mtf_entry_score: mtfResult.entryConfirm,
          mtf_trend_direction: mtfResult.trendDirection,
        };
      }
    }

    // If hold, just return heartbeat
    if (signal.action === "hold") {
      // Diagnostikk (2026-08-02): logg hvorfor grid-signaler blir hold
      if (resolvedEngine === "grid") {
        try {
          await db.from("trading_logs").insert({
            session_id: session.id,
            user_id: session.user_id,
            action: "grid_hold_diagnostic",
            details: {
              signal_reason: signal.reason ?? null,
              signal_indicators: signal.indicators ?? null,
              strategy_id: session.strategy_id,
              resolved_engine: resolvedEngine,
              current_price: currentPrice,
              has_open_position: !!session.open_position,
            } as never,
          } as never);
        } catch {
          /* non-critical */
        }
      }
      return { session_id: session.id, action: "heartbeat" };
    }

    // For grid strategy: cap positionSize by maxPositionSizePercent
    const stratCfg = (session.strategy_config as Record<string, unknown>) ?? {};
    const DEFAULTS: RiskConfig = {
      maxPositionSizePercent: 10,
      stopLossPercent: 1,
      trailingStopLossPercent: 1.5,
      maxDailyLossPercent: 5,
      maxDailyTrades: 20, // Increased from 10 → 20 with 15-min signal frequency
      maxDrawdownPercent: 15,
      maxLeverage: 1,
    };
    let riskConfig: RiskConfig =
      userRiskConfig || (stratCfg.risk_config as RiskConfig) || DEFAULTS;

    // Grid strategy needs more trades per day — apply multiplier based on grid levels
    if (engineKey === "grid") {
      const gridCfg = stratCfg.grid_config as
        | Record<string, number>
        | undefined;
      const gridLevels = gridCfg?.levels ?? 10;
      // Grid needs at least 2 trades per level (buy + sell) per day.
      // Risk-profiles (5/10/day) are tuned for signal-trading, not grid —
      // always raise to gridMin without warning noise (expected, not anomalous).
      const gridMinTrades = gridLevels * 2;
      if (riskConfig.maxDailyTrades < gridMinTrades) {
        riskConfig = { ...riskConfig, maxDailyTrades: gridMinTrades };
      }
    }

    if (engineKey === "grid" && signal.positionSize) {
      const maxGridPos = riskConfig.maxPositionSizePercent / 100;
      signal.positionSize = Math.min(signal.positionSize, maxGridPos);
    }

    // ── V2: Dynamic Position Sizing (Kelly + ATR + Regime + Drawdown) ──────
    let positionSize = signal.positionSize ?? 0.1;
    let positionSizeReason = "static fallback";
    let kellyFraction: number | undefined;
    let dynamicExpectancy: number | undefined;
    const regime = (signal.indicators?.regime as string) ?? "unknown";

    if (signal.action === "buy" || signal.action === "sell") {
      // Grid-unntak (2026-08-02): grid har egen mekanisk sizing (amountPerGrid).
      // Dynamic/Kelly-sizing basert på historisk win-rate skal ikke overstyre grid —
      // det halverte Tom sin size til 0.54% (54 NOK < 100 NOK min) og blokkerte ALT.
      const isGridForDynamicSize =
        (signal.reason ?? "").includes("Grid buy") ||
        (signal.reason ?? "").includes("Grid sell") ||
        (signal.reason ?? "").includes("DCA buy");
      if (isGridForDynamicSize) {
        logger.debug(
          `[PositionSize] Session ${session.id}: grid-size bevart (${(positionSize * 100).toFixed(2)}% — dynamic sizing hoppet over)`,
        );
      } else {
        try {
          const dynamicSize = await calculateDynamicPositionSize(db, {
            userId: session.user_id,
            sessionId: session.id,
            strategyId: session.strategy_id,
            currentCapital: session.current_capital,
            initialCapital: session.initial_capital,
            candles,
            regime,
            signalAction: signal.action,
            basePositionSize: positionSize,
            riskProfile: "balanced",
          });
          positionSize = dynamicSize.positionSize;
          positionSizeReason = dynamicSize.reason;
          kellyFraction = dynamicSize.kellyFraction;
          dynamicExpectancy = dynamicSize.expectancy;
          logger.debug(
            `[PositionSize] Session ${session.id}: ${(positionSize * 100).toFixed(2)}% (${dynamicSize.reason})`,
          );
        } catch (err) {
          logger.warn(
            `[PositionSize] Failed for session ${session.id}, using fallback:`,
            (err as Error).message,
          );
        }
      }
    }

    // ── Engine-nivå signal-guard (produktkrav 2026-07-25) ──────────────────
    // Avvis ALLE kjøp med expectancy < 0 ELLER confidence = 0.
    // Salg blokkeres aldri — exits skal alltid gjennomføres.
    //
    // Klarpakke-fiks 2026-08-02: Grid-signaler er MEKANISKE nivå-ordre, ikke
    // prediksjoner. Expectancy beregnet fra gamle multi-signal/DCA-trades er
    // irrelevant for grid — grid har egen gevinstlogikk (+2% per nivå).
    // Uten unntak ble brukere med tidligere tap (f.eks. fra DCA) permanent
    // utestengt fra grid, mens nye brukere slapp gjennom — urettferdig og feil.
    const isGridSignalForGuard =
      (signal.reason ?? "").includes("Grid buy") ||
      (signal.reason ?? "").includes("Grid sell") ||
      (signal.reason ?? "").includes("DCA buy");
    {
      const guard = evaluateSignalGuard({
        action: signal.action,
        exitReason: signal.exitReason ?? "auto",
        confidence:
          (signal.indicators?.confidence as number | null | undefined) ?? null,
        expectancy: isGridSignalForGuard ? null : (dynamicExpectancy ?? null),
      });
      if (!guard.allowed) {
        try {
          await db.from("trading_logs").insert({
            session_id: session.id,
            user_id: session.user_id,
            action: "signal_guard_blocked",
            details: {
              signal_action: signal.action,
              confidence: signal.indicators?.confidence ?? null,
              expectancy: dynamicExpectancy ?? null,
              reason: guard.reason,
              strategy_id: session.strategy_id,
            } as never,
          } as never);
        } catch {
          // Ikke kritisk: logging skal ikke stoppe tick
        }
        console.info(`[Tick] ${guard.reason} (session ${session.id})`);
        return { session_id: session.id, action: "hold", reason: guard.reason };
      }
    }

    // ── Fase 2: Trailing exit + buy-side gates (2026-07-31) ──────────────

    // 2.2 Trailing exit: overstyr signal hvis posisjon har nådd aktivering
    // og deretter falt trailPct fra topp. Kjører FØR buy-gates fordi
    // en lønnsom posisjon skal selges, ikke forsterkes med nye kjøp.
    if (session.open_position?.quantity && session.open_position.quantity > 0) {
      const pos = session.open_position;
      const entryPrice =
        typeof pos.entry_price === "number" && pos.entry_price > 0
          ? pos.entry_price
          : null;
      const peakPrice =
        typeof pos.highest_price === "number" && pos.highest_price > 0
          ? pos.highest_price
          : (entryPrice ?? currentPrice);

      if (entryPrice !== null) {
        const trail = evaluateTrailingExit({
          entryPrice,
          peakPrice,
          currentPrice,
        });

        // Oppdater peak i DB hvis ny topp (uansett action)
        if (trail.newPeak > peakPrice) {
          try {
            await db
              .from("trading_sessions")
              .update({
                open_position: {
                  ...(pos as unknown as Record<string, unknown>),
                  highest_price: trail.newPeak,
                } as never,
              })
              .eq("id", session.id);
          } catch {
            /* non-critical */
          }
        }

        if (trail.action === "trailing_exit") {
          console.info(
            `[Tick] Fase2 trailing-exit: ${trail.reason} (session ${session.id})`,
          );
          // Overstyr signalet — tvunget sell med positionSize=1 (full exit)
          signal = {
            action: "sell",
            reason: `Trailing exit: ${trail.reason}`,
            positionSize: 1.0,
            indicators: {
              exit_reason: "trailing_take_profit",
              entry_price: entryPrice,
              peak_price: trail.newPeak,
              current_price: currentPrice,
              regime: regime,
            },
          };
        }
      }
    }

    // 2.1 + 2.3–2.5: Buy-side gates (kun når signal fortsatt er buy)
    if (signal.action === "buy") {
      // 2.1 Regime-gate: blokker kjøp i crash/sterk trend_down
      const closes = candles.map((c) => c.close);
      const regimeGate = evaluateRegimeGate(closes);
      if (!regimeGate.allowed) {
        // Grid-unntak (2026-08-02): grid har egen 25% katastrofe-SL + DCA.
        // Mekaniske nivå-kjøp skal ikke stoppes av SMA-regime — men vi logger det.
        // simple_grid-unntak (2026-08-11): har egen dd-gate (>20% fra 30d-topp),
        // posisjons-tak 60% og «slipp posene»-likvidering — sterkere bremser enn
        // Fase2-gaten. Uten unntak blokkeres ALLE Pilot-kjøp i trend_down.
        const isGrid =
          (signal.reason ?? "").includes("Grid buy") ||
          (signal.reason ?? "").includes("DCA buy") ||
          resolvedEngine === "simple_grid";
        if (!isGrid) {
          try {
            await db.from("trading_logs").insert({
              session_id: session.id,
              user_id: session.user_id,
              action: "regime_gate_blocked",
              details: {
                reason: regimeGate.reason,
                regime: regimeGate.regime,
                signal_reason: signal.reason ?? null,
                strategy_id: session.strategy_id,
              } as never,
            } as never);
          } catch {
            /* non-critical */
          }
          console.info(
            `[Tick] Fase2 regime-gate: ${regimeGate.reason} (session ${session.id})`,
          );
          return {
            session_id: session.id,
            action: "hold",
            reason: regimeGate.reason,
          };
        }
      }
      signal.indicators = { ...signal.indicators, regime: regimeGate.regime };

      // 2.3 Anti-whipsaw: ikke kjøp rett etter salg av samme symbol
      // (kun hvis vi IKKE allerede har en posisjon — exits går alltid)
      if (!session.open_position && lastSellCache) {
        const sellKey = `${session.id}:${pair}`;
        const lastSell = lastSellCache.get(sellKey);
        if (lastSell) {
          const whipsaw = evaluateAntiWhipsaw({
            lastSellAt: lastSell.at,
            lastSellPrice: lastSell.price,
            currentPrice,
          });
          if (!whipsaw.allowed) {
            console.info(
              `[Tick] Fase2 anti-whipsaw: ${whipsaw.reason} (session ${session.id})`,
            );
            return {
              session_id: session.id,
              action: "hold",
              reason: whipsaw.reason,
            };
          }
        }
      }

      // 2.4 + 2.5: Per-bruker jitter + symbol-edge-vekting
      const jitterFactor = jitteredSizeMultiplier(
        session.user_id,
        pair.replace("/", ""),
      );
      const edgeStats: SymbolEdgeStats = edgeCache?.get(pair) ?? {
        trades: 0,
        expectancyPct: null,
        profitFactor: null,
      };
      const edgeFactor = symbolEdgeWeight(edgeStats);
      positionSize =
        Math.round(positionSize * jitterFactor * edgeFactor * 10000) / 10000;
    }

    // FIKS (2026-07-30): tradeAmount er NOK for paper (current_capital er
    // NOK-denominert), men executedPrice er USDT fra candles. Uten
    // rate-konvertering ble kvantum ~9,6× for stort → balanse-debet ×rate
    // → milliard-inflasjon på paper-kontoer (prod-bevis: 5,7 mrd NOK).
    // Live-sesjoner har USDT-kapital og skal IKKE konverteres.
    const tradeAmount = session.current_capital * positionSize;

    // Exchange-aware minimum (2026-08-11): OKX (0.10% fee) gjør små ordrer
    // lønnsomme — resolve børsen samme vei som ExecutorFactory.
    const liveExchange =
      session.mode === "live"
        ? await ExecutorFactory.resolveLiveExchange(db, session.user_id)
        : undefined;

    // Minimum order value — 10 USD ≈ 100 NOK (var kommentert $10 men
    // sammenlignet NOK → reell terskel ~1 USD). Paper-kapital er NOK,
    // live-kapital er USDT → terskelen må følge kapitalens valuta.
    if (tradeAmount < minOrderValueForMode(session.mode, liveExchange)) {
      // Diagnostikk: logg hvorfor trade stoppes på minsteverdi
      if (resolvedEngine === "grid") {
        try {
          await db.from("trading_logs").insert({
            session_id: session.id,
            user_id: session.user_id,
            action: "grid_below_min_order",
            details: {
              trade_amount: tradeAmount,
              min_order: minOrderValueForMode(session.mode, liveExchange),
              position_size: positionSize,
              capital: session.current_capital,
              signal_reason: signal.reason ?? null,
            } as never,
          } as never);
        } catch {
          /* non-critical */
        }
      }
      return { session_id: session.id, action: "hold" };
    }

    // Apply slippage (0.05%) — same for paper and live
    const slippage = 0.0005;
    const executedPrice =
      signal.action === "buy"
        ? mul(currentPrice, 1 + slippage)
        : mul(currentPrice, 1 - slippage);

    const tradeAmountUsdt =
      session.mode === "paper"
        ? div(tradeAmount, getUsdtToNokRate())
        : tradeAmount;
    let quantity = div(tradeAmountUsdt, executedPrice);

    if (quantity <= 0) {
      return { session_id: session.id, action: "hold" };
    }

    // ── Paper sell-side guard (inflasjonsfiks 2026-07-27) ───────────────
    // Selg aldri mer enn faktisk beholdning. DB-triggeren krediterer
    // total_value UBETINGET — uten denne clampen printer falske
    // salgssignaler (f.eks. fra valuta-forvirrede posisjoner) penger.
    if (session.mode === "paper" && signal.action === "sell") {
      const heldQty = getPositionBaseQuantity(
        session.open_position as unknown as StoredPositionLike | null,
      );
      if (heldQty <= 0) {
        try {
          await db.from("trading_logs").insert({
            session_id: session.id,
            user_id: session.user_id,
            action: "sell_blocked_no_position",
            details: {
              signal: "sell",
              signal_reason: signal.reason ?? null,
              strategy_id: session.strategy_id,
            } as never,
          } as never);
        } catch {
          // Ikke kritisk: logging skal ikke stoppe tick
        }
        return {
          session_id: session.id,
          action: "hold",
          reason: "Salg blokkert: ingen beholdning å selge",
        };
      }
      if (quantity > heldQty) {
        console.info(
          `[Tick] Paper-salg clampet til beholdning: ${quantity} → ${heldQty} (session ${session.id})`,
        );
        quantity = heldQty;
      }
    }

    // Tick-route risk gate is kept for live path only. Paper trades are routed
    // through executeTrade() which performs the canonical risk validation.
    if (session.mode === "live") {
      const riskResult = await validateTradeAgainstRiskProfile(db, {
        userId: session.user_id,
        sessionId: session.id,
        symbol: pair.replace("/", ""),
        side: signal.action as "buy" | "sell",
        quantity,
        price: currentPrice,
        orderType: "market",
        tradingMode: "live",
      });

      if (!riskResult.allowed) {
        // Log risk block to database - using correct table schema
        const riskLogDetails = {
          reason: riskResult.rejectionReason,
          signal: signal.action,
          requested_amount: tradeAmount,
          current_capital: session.current_capital,
          risk_config: { ...riskConfig },
        } as Database["public"]["Tables"]["trading_logs"]["Insert"]["details"];

        await db.from("trading_logs").insert({
          session_id: session.id,
          user_id: session.user_id,
          action: "risk_blocked",
          details: riskLogDetails,
        } as never);

        console.warn("Trade blocked by risk validator:", {
          session_id: session.id,
          reason: riskResult.rejectionReason,
        });

        return {
          session_id: session.id,
          action: "risk_blocked",
          risk_reason: riskResult.rejectionReason,
        };
      }
    }

    // ─── BETA GUARDRAILS ─────────────────────────────────────────────────
    const isBetaUser =
      process.env.BETA_USER_IDS?.split(",").includes(session.user_id) || false;
    if (isBetaUser) {
      const guardrails = await evaluateGuardrails(
        db,
        session.user_id,
        session.current_capital,
        session.initial_capital,
        DEFAULT_GUARDRAIL_CONFIG,
      );

      if (!guardrails.allowed) {
        console.warn(
          `[Guardrails] User ${session.user_id} blocked: ${guardrails.reason}`,
        );

        if (guardrails.action === "pause" || guardrails.action === "kill") {
          await pauseUserSessions(
            db,
            session.user_id,
            guardrails.reason || "Guardrail triggered",
          );
        }

        return {
          session_id: session.id,
          action: "risk_blocked",
          risk_reason: guardrails.reason,
        };
      }

      if (guardrails.action === "warn") {
        console.warn(
          `[Guardrails] Warning for ${session.user_id}: ${guardrails.reason}`,
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Calculate stop loss
    const stopLossPercent = riskConfig.stopLossPercent ?? 1;
    const stopLossPrice =
      signal.action === "buy"
        ? currentPrice * (1 - stopLossPercent / 100)
        : currentPrice * (1 + stopLossPercent / 100);

    // Build common trade context for explanation and canonical execution
    const strategyKey = resolveStrategyKey(session.strategy_id);
    const { reasonCode, reasonParams } = buildTradeReason({
      side: signal.action as TradeSide,
      strategyKey,
      indicators:
        ((signal.indicators || {}) as unknown as Record<string, unknown>) ||
        null,
      currentPrice,
      candles,
      entryPrice: session.open_position?.entry_price,
    });
    const indicatorSnapshot = buildIndicatorSnapshot(
      candles,
      (signal.indicators as unknown as Record<string, unknown>) || null,
    );

    const signalContext: TradeSignalContext = {
      action: signal.action,
      confidence: (signal.indicators?.confidence as number) ?? 0,
      regime: (signal.indicators?.regime as string) ?? "unknown",
      strategy: strategyKey,
      reason: signal.reason,
      sizingPct: positionSize,
      stopLossPrice,
      indicators: {
        ...signal.indicators,
        stop_loss: stopLossPrice,
        position_size: Math.round(positionSize * 10000) / 10000,
        position_size_reason: positionSizeReason,
        kelly_fraction: kellyFraction ?? null,
      },
    };

    // ─── PAPER TRADING EXECUTION ─────────────────────────────────────────
    // Route paper trades through the canonical execution pipeline so they share
    // identical market-data, risk, and balance logic with live trading.
    if (session.mode === "paper") {
      const executeRequest: ExecuteTradeRequest = {
        userId: session.user_id,
        sessionId: session.id,
        symbol: pair.replace("/", ""),
        side: signal.action as "buy" | "sell",
        quantity,
        price: currentPrice,
        orderType: "market",
        mode: "paper",
        signalContext,
        idempotencyKey: generateTradeIdempotencyKey(
          session.id,
          pair,
          signal.action,
        ),
        reasonCode,
        reasonParams,
        indicatorSnapshot: indicatorSnapshot as unknown as Record<
          string,
          unknown
        >,
        metadata: { maxSlippageBps: 5 },
      };

      const result = await executeTrade(db, executeRequest);

      if (!result.success) {
        console.warn(
          `[Tick] Paper trade failed for session ${session.id}:`,
          result.error,
        );

        await db.from("trading_logs").insert({
          session_id: session.id,
          user_id: session.user_id,
          action: result.rejectionReason ? "risk_blocked" : "live_trade_failed",
          details: {
            reason: result.rejectionReason || result.error,
            signal: signal.action,
            requested_amount: tradeAmount,
          } as never,
        } as never);

        return {
          session_id: session.id,
          action: result.rejectionReason ? "risk_blocked" : "error",
          risk_reason: result.rejectionReason || result.error,
        };
      }

      // ── Grid-state persistens (v2): oppdater bought/empty etter trade ──
      if (resolvedEngine === "grid" && result.success) {
        try {
          const stratCfg = session.strategy_config as Record<string, unknown>;
          const gridLevels =
            (stratCfg.grid_levels as
              | Array<Record<string, unknown>>
              | undefined) ?? [];
          const signalLevel = signal.indicators?.grid_level as
            | number
            | undefined;
          const dcaLevel = signal.indicators?.dca_level as number | undefined;

          if (signalLevel !== undefined) {
            const updatedLevels = gridLevels.map((l) => {
              if (
                l.level === signalLevel &&
                (dcaLevel === undefined || l.dcaLevel === dcaLevel)
              ) {
                return {
                  ...l,
                  status: signal.action === "buy" ? "bought" : "empty",
                };
              }
              return l;
            });

            await db
              .from("trading_sessions")
              .update({
                strategy_config: {
                  ...stratCfg,
                  grid_levels: updatedLevels,
                } as never,
              })
              .eq("id", session.id);
          }
        } catch (gridErr) {
          console.error(
            `[Tick] Failed to persist grid state for ${session.id}:`,
            gridErr,
          );
        }
      }

      // Log Dark Fleet / regime metadata for every trade
      if (signal.action === "buy" || signal.action === "sell") {
        try {
          await db.from("trading_logs").insert({
            session_id: session.id,
            user_id: session.user_id,
            action: "regime_signal",
            details: {
              trade_id: result.tradeId,
              regime: signal.indicators?.regime ?? "unknown",
              ensemble_score: signal.indicators?.ensembleScore ?? null,
              dark_fleet: useDarkFleet,
              engine: resolvedEngine,
              strategy_id: session.strategy_id,
            } as never,
          } as never);
        } catch {
          // Non-critical: don't fail the tick if logging fails
        }
      }

      // AUDIT TRAIL (B1.4): Log every executed trade for compliance & debugging
      // executeTrade returns USDT-denominated paper fill values; convert to NOK for
      // audit parity with the NOK values stored in trades.price/total_value/fee.
      if (result.tradeId) {
        try {
          const rate = getUsdtToNokRate();
          const executedQty = result.executedQuantity ?? quantity;
          const executedUsdt = result.executedPrice ?? currentPrice;
          const totalUsdt = executedQty * executedUsdt;
          const nokPrice = usdtToNok(executedUsdt, rate);
          const nokTotalValue = usdtToNok(totalUsdt, rate);
          const nokFee = usdtToNok(result.fee ?? 0, rate);

          await db.from("trading_logs").insert({
            session_id: session.id,
            user_id: session.user_id,
            action: "trade_executed",
            details: {
              trade_id: result.tradeId,
              mode: "paper",
              side: signal.action,
              symbol: pair.replace("/", ""),
              quantity: executedQty,
              price: nokPrice,
              total_value: nokTotalValue,
              fee: nokFee,
              usdt_price: executedUsdt,
              usdt_total_value: totalUsdt,
              usdt_fee: result.fee,
              usdt_nok_rate: rate,
              strategy_id: session.strategy_id,
              engine: resolvedEngine,
              dark_fleet: useDarkFleet,
            } as never,
          } as never);
        } catch {
          // Non-critical: audit logging must not fail the trade
        }
      }

      // ── AI-forklaring (2026-08-03): generer brukervennlig forklaring ──────
      // Kalles ETTER executeTrade — feil skal ALDRI stoppe trading.
      // Lagres i trades.pilot_explanation slik at UI kan vise den.
      if (
        result.tradeId &&
        (signal.action === "buy" || signal.action === "sell")
      ) {
        try {
          const { generateTradeExplanation } =
            await import("@/lib/trading/ai-explanations");
          const rate = getUsdtToNokRate();
          const execPrice = result.executedPrice ?? currentPrice;
          const execQty = result.executedQuantity ?? quantity;
          const explanation = await generateTradeExplanation({
            symbol: pair.replace("/", ""),
            side: signal.action,
            priceNok: usdtToNok(execPrice, rate),
            amountNok: usdtToNok(execQty * execPrice, rate),
            strategy: resolvedEngine,
            reason: signal.reason,
            indicators: {
              rsi: signal.indicators?.rsi as number | undefined,
              regime: signal.indicators?.regime as string | undefined,
              grid_level: signal.indicators?.grid_level as number | undefined,
              buy_price: signal.indicators?.buy_price as number | undefined,
              sell_price: signal.indicators?.sell_price as number | undefined,
              profit_pct: signal.indicators?.profit_pct as number | undefined,
              confidence: signal.indicators?.confidence as number | undefined,
              ensemble_score: signal.indicators?.ensembleScore as
                | number
                | undefined,
            },
          });

          // Oppdater trade med AI-forklaringen
          await db
            .from("trades")
            .update({ pilot_explanation: explanation.text } as never)
            .eq("id", result.tradeId);
        } catch (explErr) {
          // Non-critical: AI-forklaring er nice-to-have, ikke kritisk
          console.warn(
            `[Tick] AI-forklaring feilet for ${result.tradeId}:`,
            (explErr as Error).message,
          );
        }
      }

      return {
        session_id: session.id,
        action: signal.action,
        trade_id: result.tradeId,
      };
    }

    // ─── LIVE TRADING EXECUTION ──────────────────────────────────────────
    const liveResult = await executeLiveTrade(
      db,
      session.user_id,
      pair,
      signal.action as "buy" | "sell",
      quantity,
    );

    if (!liveResult.ok) {
      console.warn(
        `[Tick] Live trade blocked for session ${session.id}: ${liveResult.error}`,
      );

      // Log failure to trading_logs so user sees it
      await db.from("trading_logs").insert({
        session_id: session.id,
        user_id: session.user_id,
        action: "live_trade_failed",
        details: {
          reason: liveResult.error,
          signal: signal.action,
          requested_amount: tradeAmount,
        } as never,
      } as never);

      if (liveResult.permanent) {
        // Stop the session permanently for non-recoverable errors (bad keys, permissions, etc.)
        await db
          .from("trading_sessions")
          .update({ status: "stopped", last_status_message: liveResult.error })
          .eq("id", session.id);
        return {
          session_id: session.id,
          action: "error",
          error: liveResult.error,
        };
      }

      // Transient feil (429 rate limit, timeout, nettverk) → backoff for å
      // unngå å spamme exchange-en hver tick. session-guard hopper over
      // sesjonen til next_expected_action_at utløper.
      const isRateLimit = /429|rate limit|lockout/i.test(liveResult.error);
      if (isRateLimit) {
        const backoffUntil = new Date(
          Date.now() + 15 * 60 * 1000,
        ).toISOString();
        await db
          .from("trading_sessions")
          .update({
            next_expected_action_at: backoffUntil,
            last_status_message: liveResult.error,
          })
          .eq("id", session.id);
      }

      return {
        session_id: session.id,
        action: "error",
        error: liveResult.error,
      };
    }

    // Calculate realized P&L for sell trades using FIFO cost basis
    let realizedPnl: number | undefined;
    let updatedLedgerState: LedgerState | null = null;

    if (signal.action === "sell" && session.open_position) {
      // Build FIFO ledger: use lots if available, otherwise migrate from legacy
      const ledger: LedgerState = session.open_position.lots
        ? {
            side: session.open_position.side || "long",
            lots: session.open_position.lots as LedgerState["lots"],
          }
        : migrateFromLegacy(session.open_position);

      const positionQty = getTotalQuantity(ledger);
      const matchedQty = Math.min(quantity, positionQty);
      if (matchedQty > 0) {
        try {
          // LOT_ID-FIKS (2026-08-11): strategien (simple_grid) velger DEN
          // profitable loten som skal selges — ikke eldste FIFO. Samme bug-
          // klasse som backtest-simulatoren (falske tap, feil nivå-sporing).
          const ønsketLotId = signal.indicators?.lot_id as string | undefined;
          const valgtLot = ønsketLotId
            ? ledger.lots.find((l) => l.id === ønsketLotId)
            : undefined;

          if (valgtLot) {
            const solgtKvantum = Math.min(matchedQty, valgtLot.quantity);
            realizedPnl = (currentPrice - valgtLot.entryPrice) * solgtKvantum;
            updatedLedgerState = {
              ...ledger,
              lots: ledger.lots
                .map((l) =>
                  l.id === valgtLot.id
                    ? { ...l, quantity: l.quantity - solgtKvantum }
                    : l,
                )
                .filter((l) => l.quantity > 1e-10),
            };
          } else {
            const sellResult = sellFIFO(ledger, matchedQty, currentPrice);
            realizedPnl = sellResult.realizedPnl;
            updatedLedgerState = { ...ledger, lots: sellResult.remainingLots };
          }
        } catch {
          // Fallback to simple P&L if FIFO fails (e.g., insufficient quantity edge case)
          const rawEntryPrice = session.open_position?.entry_price;
          const entryPrice = Number(rawEntryPrice);
          if (Number.isNaN(entryPrice)) {
            console.warn(
              "tick: missing entry_price in open_position for fallback P&L",
              {
                session: session.id,
                entry_price: rawEntryPrice,
              },
            );
          }
          realizedPnl = Number.isNaN(entryPrice)
            ? 0
            : Math.round((currentPrice - entryPrice) * matchedQty * 100) / 100;
        }
      }
    }

    // Execute trade
    const finalExecutedPrice = liveResult.executedPrice;
    const finalFee = liveResult.fee;
    const totalValue = mul(quantity, finalExecutedPrice);
    const idempotencyKey = generateTradeIdempotencyKey(
      session.id,
      pair,
      signal.action,
    );

    const { data: trade, error: tradeError } = await db
      .from("trades")
      .insert({
        session_id: session.id,
        user_id: session.user_id,
        idempotency_key: idempotencyKey,
        mode: session.mode,
        trading_pair: session.trading_pair,
        // Ingen "symbol"-nøkkel — kolonnen finnes ikke i trades i prod
        // (PGRST204, E2E-funn F4). trading_pair er tilstrekkelig.
        side: signal.action as TradeSide,
        order_type: "market",
        quantity,
        filled_quantity: liveResult.executedQuantity,
        price: finalExecutedPrice,
        total_value: totalValue,
        fee: finalFee,
        status: "filled",
        realized_pnl: realizedPnl,
        binance_order_id: liveResult.krakenOrderId,
        strategy_signal: signalContext.indicators,
        // Explanation data
        reason_code: reasonCode,
        reason_params: reasonParams as unknown as Json,
        indicator_snapshot: indicatorSnapshot as unknown as Json,
        executed_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();

    if (tradeError) {
      console.error("Trade insert failed:", {
        session_id: session.id,
        error: tradeError.message,
        code: tradeError.code,
      });

      throw new Error(`Trade insert failed: ${tradeError.message}`);
    }

    // ── LIVE CAPITAL UPDATE (B1.3) ───────────────────────────────────────────
    // Live capital MUST be updated here.
    if (trade?.id) {
      try {
        const netValueUsdt =
          signal.action === "buy"
            ? totalValue + finalFee
            : totalValue - finalFee;
        // Live-kapital er USDT-denominert (current_capital er USDT).
        // FIX 2026-08-01: usdtToNok-konvertering her ga ×rate-inflasjon
        // (47 USDT-kjøp trakk 453 NOK fra 10000 USDT → kapital 99546).
        // RPC-ene decrement/increment_capital oppdaterer current_capital_nok
        // og triggeren synker current_capital 1:1 → send USDT-beløpet direkte.
        const { error: capitalError } = await db.rpc(
          signal.action === "buy" ? "decrement_capital" : "increment_capital",
          {
            p_session_id: session.id,
            p_amount: Math.abs(netValueUsdt),
            p_user_id: session.user_id,
          },
        );
        if (capitalError) {
          console.error(
            `[Tick] Live capital update failed for session ${session.id}:`,
            capitalError.message,
          );
        }
      } catch (capitalErr) {
        console.error(
          `[Tick] Live capital update exception for session ${session.id}:`,
          capitalErr,
        );
      }
    }

    // Update session position state with FIFO lots
    if (signal.action === "buy") {
      // Build ledger from current position (or create new)
      const ledger: LedgerState = session.open_position?.lots
        ? {
            side: session.open_position.side || "long",
            lots: session.open_position.lots as LedgerState["lots"],
          }
        : session.open_position
          ? migrateFromLegacy(session.open_position)
          : createLedger("long");

      // For live trades, use actual Kraken executed price as cost basis
      const entryPriceForLot = liveResult.executedPrice;
      const updatedLedger = addLot(ledger, quantity, entryPriceForLot);
      const legacyPos = toLegacyPosition(updatedLedger);

      if (legacyPos) {
        await db
          .from("trading_sessions")
          .update({
            open_position: {
              ...legacyPos,
              highest_price:
                session.open_position?.highest_price &&
                session.open_position.highest_price > 0
                  ? session.open_position.highest_price
                  : entryPriceForLot,
            },
          } as never)
          .eq("id", session.id);
      }
    } else if (signal.action === "sell" && updatedLedgerState) {
      // Update with remaining lots after FIFO sell
      const legacyPos = toLegacyPosition(updatedLedgerState);
      await db
        .from("trading_sessions")
        .update({
          open_position: legacyPos
            ? {
                ...legacyPos,
                highest_price:
                  session.open_position?.highest_price &&
                  session.open_position.highest_price > 0
                    ? session.open_position.highest_price
                    : legacyPos.entry_price,
              }
            : null,
        } as never)
        .eq("id", session.id);
    }

    // Log Dark Fleet / regime metadata for every trade
    if (signal.action === "buy" || signal.action === "sell") {
      try {
        await db.from("trading_logs").insert({
          session_id: session.id,
          user_id: session.user_id,
          action: "regime_signal",
          details: {
            trade_id: trade?.id,
            regime: signal.indicators?.regime ?? "unknown",
            ensemble_score: signal.indicators?.ensembleScore ?? null,
            dark_fleet: useDarkFleet,
            engine: resolvedEngine,
            strategy_id: session.strategy_id,
          } as never,
        } as never);
      } catch {
        // Non-critical: don't fail the tick if logging fails
      }
    }

    // AUDIT TRAIL (B1.4): Log every executed trade for compliance & debugging
    if (trade?.id) {
      try {
        await db.from("trading_logs").insert({
          session_id: session.id,
          user_id: session.user_id,
          action: "trade_executed",
          details: {
            trade_id: trade.id,
            mode: session.mode,
            side: signal.action,
            symbol: pair.replace("/", ""),
            quantity,
            price: finalExecutedPrice,
            total_value: totalValue,
            fee: finalFee,
            realized_pnl: realizedPnl ?? null,
            binance_order_id: liveResult.krakenOrderId,
            idempotency_key: idempotencyKey,
            strategy_id: session.strategy_id,
            engine: resolvedEngine,
            dark_fleet: useDarkFleet,
          } as never,
        } as never);
      } catch {
        // Non-critical: audit logging must not fail the trade
      }
    }

    // Log successful trade
    return {
      session_id: session.id,
      action: signal.action,
      trade_id: trade?.id,
    };
  } finally {
    await writeHeartbeat();
  }
}

/**
 * Mirror a trade to all copy trading sessions
 */
async function mirrorTradeToFollowers(
  db: SupabaseClient<Database>,
  sourceSessionId: string,
  trade: Record<string, unknown>,
): Promise<void> {
  try {
    // Find all active followers of this session
    const { data: followers } = await db
      .from("trading_sessions")
      .select("*")
      .eq("copy_source_session_id", sourceSessionId)
      .eq("status", "active");

    if (!followers || followers.length === 0) return;

    for (const followerSession of followers) {
      // Calculate follower's position size based on capital ratio
      const tradeValue = (trade.total_value as number) || 0;
      const sourceCapital =
        ((trade.session as Record<string, unknown>)
          ?.current_capital as number) || 1;
      const sourceCapitalRatio = tradeValue / sourceCapital;
      const followerTradeAmount =
        followerSession.current_capital * sourceCapitalRatio;

      if (followerTradeAmount <= 0) continue;

      const tradePrice = (trade.price as number) || 1;
      const followerQuantity = div(followerTradeAmount, tradePrice);

      // Insert mirrored trade - matching actual trades table schema
      const tradeRecord = trade as Record<string, unknown>;
      const sourceRealizedPnl = tradeRecord.realized_pnl as number | undefined;
      const sourceTotalValue = (tradeRecord.total_value as number) || 1;
      const followerRealizedPnl = sourceRealizedPnl
        ? Math.round(
            sourceRealizedPnl * (followerTradeAmount / sourceTotalValue) * 100,
          ) / 100
        : undefined;
      const { error: mirrorError } = await db.from("trades").insert({
        session_id: followerSession.id,
        user_id: followerSession.user_id,
        idempotency_key: generateTradeIdempotencyKey(
          followerSession.id,
          tradeRecord.trading_pair as string,
          tradeRecord.side as string,
        ),
        mode: followerSession.mode,
        trading_pair: tradeRecord.trading_pair as string,
        side: tradeRecord.side as string,
        order_type: "market",
        quantity: followerQuantity,
        price: tradePrice,
        total_value: followerTradeAmount,
        fee: mul(followerTradeAmount, 0.001),
        status: "filled",
        realized_pnl: followerRealizedPnl,
        strategy_signal: {
          ...(tradeRecord.strategy_signal as Record<string, unknown>),
          copied_from: tradeRecord.id as string,
        },
        executed_at: new Date().toISOString(),
        is_copy: true,
        leader_trade_id: tradeRecord.id as string,
      } as never);

      if (mirrorError) {
        console.warn(
          `Failed to mirror trade ${trade.id} to follower ${followerSession.id}:`,
          mirrorError.message,
        );
      }
    }
  } catch (err) {
    console.error("Error mirroring trade to followers:", err);
  }
}

/**
 * Find users with auto-trading enabled and ensure each has at least one active
 * paper session. This routes auto-trading users through the canonical tick
 * pipeline even when they have no manually created session.
 */
async function getAutoTradingUsers(
  db: SupabaseClient<Database>,
): Promise<string[]> {
  const { data, error } = await db
    .from("auto_trade_settings")
    .select("user_id")
    .eq("auto_trading_enabled", true);

  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.user_id as string))];
}

/**
 * Ensure every auto-trading user has an active paper session. Creates default
 * paper sessions only for users who do not already have an active session of
 * any kind, then appends them to the list for tick processing.
 */
async function ensureAutoTradingSessions(
  db: SupabaseClient<Database>,
  sessions: TradingSession[],
): Promise<TradingSession[]> {
  const autoUserIds = await getAutoTradingUsers(db);
  if (autoUserIds.length === 0) return sessions;

  const representedUserIds = new Set(sessions.map((s) => s.user_id));
  const usersNeedingSession = autoUserIds.filter(
    (userId) => !representedUserIds.has(userId),
  );
  if (usersNeedingSession.length === 0) return sessions;

  // Guard against duplicate active paper sessions that may have been created
  // concurrently since the initial fetch.
  const { data: existingSessions } = await db
    .from("trading_sessions")
    .select("user_id")
    .in("user_id", usersNeedingSession)
    .eq("status", "active")
    .eq("mode", "paper");

  const existingUserIds = new Set(
    (existingSessions ?? []).map((s) => s.user_id as string),
  );
  const usersToCreate = usersNeedingSession.filter(
    (userId) => !existingUserIds.has(userId),
  );

  // FIKS (2026-07-28): Gjenbruk nyeste ikke-aktive paper-sesjon i stedet for
  // å opprette en ny hver gang. Tidligere ble det opprettet én sesjon per
  // tick etter at forrige ble stoppet — prod-bevis: 178 sesjoner på 24 dager
  // for én bruker, alle med 100 000 NOK "kapital" hver.
  const usersToReactivate = usersToCreate;
  if (usersToReactivate.length > 0) {
    // 🛡️ Task 0.3: GUARD-deaktiverte sesjoner reaktiveres ALDRI. Guarden
    // setter error_message='GUARD:…' — en auto-reaktivering her ville
    // omgjort guard-enforcement (prod-bevis: sesjoner fortsatte å kjøpe
    // etter "auto-deaktivering").
    const { data: reusable } = await db
      .from("trading_sessions")
      .select("id, user_id, error_message")
      .in("user_id", usersToReactivate)
      .eq("mode", "paper")
      .eq("trading_pair", "BTCUSDT")
      // 'paused' er bevisst bruker-valg — kun stopped/crashed reaktiveres.
      .in("status", ["stopped", "crashed"])
      .or(GUARD_ERROR_OR_FILTER)
      .order("updated_at", { ascending: false });

    const latestByUser = new Map<string, string>();
    for (const row of reusable ?? []) {
      const uid = row.user_id as string;
      // JS-forsvar i tillegg til or()-filteret: aldri reaktiver guard-stoppet.
      if (isGuardError(row.error_message as string | null)) {
        console.warn(
          `[Tick] Reaktivering hoppet over for ${uid}: sesjon ${row.id} er GUARD-deaktivert`,
        );
        continue;
      }
      if (!latestByUser.has(uid)) latestByUser.set(uid, row.id as string);
    }

    const now = new Date().toISOString();
    const reactivated: TradingSession[] = [];
    for (const [uid, sessionRowId] of latestByUser) {
      const { data: reactivatedRow, error: reactivateError } = await db
        .from("trading_sessions")
        .update({
          status: "active",
          last_heartbeat: now,
          last_tick_at: now,
          updated_at: now,
        } as never)
        .eq("id", sessionRowId)
        .in("status", ["stopped", "crashed"]) // race-guard: kun hvis fortsatt inaktiv
        .select("*")
        .maybeSingle();
      if (reactivateError) {
        console.warn(
          "[Tick] Reaktivering feilet for",
          uid,
          reactivateError.message,
        );
        continue;
      }
      if (reactivatedRow) {
        reactivated.push(reactivatedRow as unknown as TradingSession);
        usersToCreate.splice(usersToCreate.indexOf(uid), 1);
      }
    }
    if (reactivated.length > 0) {
      console.info(
        `[Tick] Reaktiverte ${reactivated.length} sesjoner i stedet for å opprette nye`,
      );
      sessions.push(...reactivated);
    }
  }

  if (usersToCreate.length === 0) return sessions;

  const now = new Date().toISOString();
  const baseSession = {
    trading_pair: "BTCUSDT",
    mode: "paper" as const,
    strategy_id: "dca",
    status: "active" as const,
    starting_capital_nok: 100000,
    current_capital_nok: 100000,
    initial_capital: 100000,
    current_capital: 100000,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    total_pnl: 0,
    strategy_config: clampDCAConfig({
      position_size: undefined,
      interval_minutes: undefined,
    }),
    started_at: now,
    last_heartbeat: now,
    last_tick_at: now,
    created_at: now,
    updated_at: now,
  };

  const inserts: Database["public"]["Tables"]["trading_sessions"]["Insert"][] =
    usersToCreate.map((user_id) => ({ ...baseSession, user_id }));

  // The unique partial index idx_unique_active_session on (user_id, trading_pair)
  // WHERE status = 'active' prevents duplicate active paper sessions for the same
  // user. In a race between concurrent cron workers, one insert will win and the
  // other will fail with Postgres error 23505 (unique violation), which is expected
  // and safe to ignore.
  const { data: newSessions, error: insertError } = await db
    .from("trading_sessions")
    .insert(inserts)
    .select("*");

  if (insertError) {
    if (insertError.code === "23505") {
      console.debug(
        "[Tick] Race-condition: auto-trading session already created, skipping",
      );
    } else {
      console.error(
        "[Tick] Failed to create auto-trading sessions:",
        insertError,
      );
      throw insertError;
    }
  }

  if (newSessions) {
    sessions.push(...(newSessions as unknown as TradingSession[]));
  }
  return sessions;
}

/**
 * Main Cron Handler - Unified Trading System for Paper, Live, and Copy Modes
 */
export async function GET(req: NextRequest) {
  // Auth check
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const db = (await createClient()) as SupabaseClient<Database>;

  // Dark Fleet feature flags (hetes en gang per cron-run)
  const flags = await getFlagsAsync().catch(() => ({
    darkFleetPhase1: false,
    darkFleetKillSwitch: false,
    signalEngineKillSwitch: false,
  }));

  // GLOBAL KILL-SWITCH: Stop all trading if signal engine is halted
  if (flags.signalEngineKillSwitch) {
    console.warn(
      "[Tick] GLOBAL KILL-SWITCH ACTIVE — signalEngineKillSwitch is true. All trading halted.",
    );
    await captureCronError("tick", new Error("KILL_SWITCH_ACTIVE"), {
      reason: "signalEngineKillSwitch",
    });
    return NextResponse.json(
      { error: "Trading halted", reason: "Global kill-switch active" },
      { status: 503 },
    );
  }

  // P0-2-fiks (2026-08-06): Emergency stop fra global_settings (admin-dashboard
  // / MCP panic_close_all → activateEmergencyStop). Tidligere hadde denne
  // bremsen 0 kallere — nødstoppet stoppet IKKE tick.
  try {
    const { data: emergencyRow, error: emergencyError } = await db
      .from("global_settings")
      .select("emergency_stop, emergency_reason, emergency_triggered_at")
      .maybeSingle();

    if (!emergencyError && emergencyRow?.emergency_stop) {
      console.warn("[Tick] EMERGENCY STOP ACTIVE — all trading halted.", {
        reason: emergencyRow.emergency_reason ?? null,
        triggeredAt: emergencyRow.emergency_triggered_at,
      });
      await captureCronError("tick", new Error("EMERGENCY_STOP_ACTIVE"), {
        reason: emergencyRow.emergency_reason ?? "admin_panic",
      });
      return NextResponse.json(
        { error: "Trading halted", reason: "Emergency stop active" },
        { status: 503 },
      );
    }
  } catch (emergencyErr) {
    // Best effort: lesefeil må IKKE stoppe tick. Logg og fortsett —
    // signalEngineKillSwitch er fortsatt første forsvarslinje.
    console.error(
      "[Tick] Failed to read global_settings.emergency_stop:",
      emergencyErr,
    );
  }

  // ============================================================
  // AUTO-RECOVERY: Gjenopprett stalled sessions (paused + crashed)
  // ============================================================
  try {
    await db.rpc("heal_stale_sessions" as never);
  } catch {
    /* ignore — best effort */
  }

  const darkFleetBaseConfig: DarkFleetConfig | undefined =
    flags.darkFleetPhase1 && !flags.darkFleetKillSwitch
      ? {
          enabled: true,
          technicalWeight: parseFloat(
            process.env.DARK_FLEET_TECH_WEIGHT || "0.5",
          ),
          narrativeWeight: parseFloat(
            process.env.DARK_FLEET_NARRATIVE_WEIGHT || "0.25",
          ),
          regimeWeight: parseFloat(
            process.env.DARK_FLEET_REGIME_WEIGHT || "0.25",
          ),
          threshold: parseFloat(process.env.DARK_FLEET_THRESHOLD || "0.3"),
          maxPositionSize: parseFloat(
            process.env.DARK_FLEET_MAX_POSITION || "0.12",
          ),
        }
      : undefined;

  const tradingHalted = flags.signalEngineKillSwitch ?? false;

  try {
    // Fetch ALL active sessions (paper, live, and copy trading)
    // Increased from 50 → 500 to avoid starving sessions when many users are active
    //
    // 🛡️ Forsvar i dybden (Task 0.3): kun TRADEBARE sesjoner. Guarden
    // (pilot_health_guard) setter status='stopped' + stopped_at, og
    // eldre guard-utløsninger satte error_message='GUARD:…' mens status
    // forble 'active' → tick fortsatte å kjøpe (prod-bevis: kjøp 06:08 og
    // 07:45 etter guard 05:04). GUARD-feilfilteret fanger begge.
    //
    // ⚠️ IKKE filtrer på smart_trader_enabled her (regresjonsfiks
    // 2026-07-31 kveld): kolonnen har DB-default false og DCA-/
    // CryptoPilot-sesjoner skal trades av tick-motoren. 24 sesjoner
    // frøs da filteret feilaktig krevde enabled=true.
    const { data: sessions, error } = await db
      .from("trading_sessions")
      .select("*")
      .eq("status", "active")
      .or(GUARD_ERROR_OR_FILTER)
      .order("last_tick_at", { ascending: true, nullsFirst: true })
      .limit(500);

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 },
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ processed: 0, message: "No active sessions" });
    }

    // JS-side forsvar: ekskluder alt som glapp gjennom query-filtrene
    // (f.eks. racer mellom guard og tick) og logg hvorfor de ble hoppet over.
    const nonTradeable = (sessions as unknown[]).filter(
      (s) => !isSessionTradeable(s as TradeableSessionLike),
    );
    for (const s of nonTradeable) {
      const reason = sessionSkipReason(s as TradeableSessionLike);
      console.warn(
        `[Tick] Hoppet over ikke-tradebar sesjon ${(s as { id?: string }).id} (${reason})`,
      );
    }
    const tradeableSessions = (sessions as unknown[]).filter((s) =>
      isSessionTradeable(s as TradeableSessionLike),
    ) as unknown as typeof sessions;
    sessions.splice(0, sessions.length, ...tradeableSessions);

    // Route auto-trading users through the canonical tick pipeline even if they
    // do not currently have an active session.
    const sessionsWithAuto = await ensureAutoTradingSessions(
      db,
      sessions as unknown as TradingSession[],
    );

    // ── Task 2 (Kraken-priser): hent kraken-tilkoblede brukere ÉN gang per
    // tick. Alle brukere får priser fra Kraken (EU/EØS 2026).
    // Feil her er ikke-kritisk — tomt sett = alle bruker kraken.
    const krakenUserIds = new Set<string>();
    try {
      const { data: krakenRows } = await db
        .from("user_kraken_keys")
        .select("user_id")
        .eq("is_active", true);
      for (const row of krakenRows ?? []) {
        krakenUserIds.add(row.user_id as string);
      }
    } catch (err) {
      console.warn(
        "[Tick] Klarte ikke hente kraken-tilkoblede brukere:",
        (err as Error).message,
      );
    }

    // ── Fase 2 pre-fetch: anti-whipsaw + symbol edge (2026-07-31) ─────────
    // Batch-hent siste salg per sesjon+symbol for anti-whipsaw.
    const lastSellCache = new Map<string, { at: string; price: number }>();
    try {
      const sessionIds = sessionsWithAuto.map((s) => s.id);
      const { data: recentSells } = await db
        .from("trades")
        .select("session_id, trading_pair, price, executed_at")
        .eq("side", "sell")
        .in("session_id", sessionIds.length > 0 ? sessionIds : ["__none__"])
        .gt(
          "executed_at",
          new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        )
        .order("executed_at", { ascending: false });

      for (const sell of recentSells ?? []) {
        const key = `${sell.session_id}:${sell.trading_pair}`;
        if (!lastSellCache.has(key)) {
          lastSellCache.set(key, {
            at: sell.executed_at as string,
            price: sell.price as number,
          });
        }
      }
    } catch (err) {
      console.warn(
        "[Tick] Fase2 last-sell pre-fetch failed (non-critical):",
        (err as Error).message,
      );
    }

    // Hent per-symbol edge-statistikk (global, siste 30 dager)
    const edgeCache = new Map<string, SymbolEdgeStats>();
    try {
      const { data: edgeRows } = await db
        .from("trades")
        .select("trading_pair, realized_pnl, price, quantity")
        .eq("side", "sell")
        .not("realized_pnl", "is", null)
        .gt(
          "executed_at",
          new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
        );

      const perSymbol = new Map<string, { pnlPcts: number[] }>();
      for (const row of edgeRows ?? []) {
        const sym = row.trading_pair as string;
        const entry = perSymbol.get(sym) ?? { pnlPcts: [] };
        // Omtrentlig P&L %: realized_pnl / (price * quantity) * 100
        const costBasis = (row.price as number) * (row.quantity as number);
        if (costBasis > 0 && row.realized_pnl != null) {
          entry.pnlPcts.push(((row.realized_pnl as number) / costBasis) * 100);
        }
        perSymbol.set(sym, entry);
      }

      for (const [sym, data] of perSymbol) {
        const avgPnl =
          data.pnlPcts.length > 0
            ? data.pnlPcts.reduce((a, b) => a + b, 0) / data.pnlPcts.length
            : null;
        // Profit factor: positive sum / |negative sum|
        const wins = data.pnlPcts
          .filter((p) => p > 0)
          .reduce((a, b) => a + b, 0);
        const losses = Math.abs(
          data.pnlPcts.filter((p) => p < 0).reduce((a, b) => a + b, 0),
        );
        const pf = losses > 0 ? wins / losses : wins > 0 ? 99 : null;
        edgeCache.set(sym, {
          trades: data.pnlPcts.length,
          expectancyPct: avgPnl,
          profitFactor: pf,
        });
      }
    } catch (err) {
      console.warn(
        "[Tick] Fase2 edge pre-fetch failed (non-critical):",
        (err as Error).message,
      );
    }

    // Portfolio-level circuit breaker: stop ALL trading if user's equity
    // (cash + market value of open positions) has dropped 15% or more from initial.
    // Fetches the latest 1h close per pair (1 candle) to value open positions.
    const userPortfolioMap = new Map<
      string,
      { initial: number; equity: number }
    >();

    const pairPriceMap = new Map<string, number>();
    await Promise.all(
      [
        ...new Set(
          sessionsWithAuto.map(
            (s) => s.trading_pair?.replace("/", "") || "BTCUSDT",
          ),
        ),
      ].map(async (symbol) => {
        try {
          const candles = await fetchCandles(symbol, "1h", 1);
          const price =
            candles.length > 0 ? candles[candles.length - 1].close : 0;
          pairPriceMap.set(symbol, price);
        } catch (err) {
          console.error(
            `[PortfolioStop] Failed to fetch price for ${symbol}:`,
            err,
          );
          pairPriceMap.set(symbol, 0);
        }
      }),
    );

    // Orphan-redning: stoppede sesjoner etterlater åpne posisjoner som ellers
    // ALDRI selges (exit-logikken kjører kun på aktive sesjoner). Adopter dem
    // til den aktive sesjonen for samme bruker+par. Idempotent.
    // Inflasjonsfiks 2026-07-27: kjøres ETTER pairPriceMap slik at adopsjonen
    // kan verifisere/normalisere orphan-priser mot faktisk marked — korrupte
    // posisjoner (f.eks. entry 4,5k mot marked 64,5k) droppes i stedet for å
    // sirkuleres videre og utløse falske trailing-salg.
    for (const s of sessionsWithAuto) {
      try {
        const symbol = s.trading_pair?.replace("/", "") || "BTCUSDT";
        await adoptOrphanPositions(
          db,
          {
            id: s.id,
            user_id: s.user_id,
            trading_pair: s.trading_pair,
          },
          {
            currentPriceUsdt: pairPriceMap.get(symbol) ?? 0,
            usdtNokRate: getUsdtToNokRate(),
          },
        );
      } catch (orphanErr) {
        console.error(
          `[Orphan] Adopsjon feilet for sesjon ${s.id} (ikke-kritisk):`,
          (orphanErr as Error).message,
        );
      }
    }

    for (const s of sessionsWithAuto) {
      const symbol = s.trading_pair?.replace("/", "") || "BTCUSDT";
      const currentPriceUsdt = pairPriceMap.get(symbol) ?? 0;
      const positionValueNok =
        s.open_position && currentPriceUsdt > 0
          ? s.open_position.quantity *
            usdtToNok(currentPriceUsdt, getUsdtToNokRate())
          : 0;
      // NOK-denominert equity: current_capital_nok er rate-konvertert for
      // live (USDC→NOK) og lik current_capital for paper (NOK). Å blande
      // rå current_capital (USDC for live) mot NOK-initial ga 93%-fantom-
      // drawdown og stoppet Toms OKX-live-sesjon 2026-08-11 20:10.
      const equity =
        (s.current_capital_nok ?? s.current_capital) + positionValueNok;

      const existing = userPortfolioMap.get(s.user_id) || {
        initial: 0,
        equity: 0,
      };
      existing.initial += s.starting_capital_nok ?? s.initial_capital;
      existing.equity += equity;
      userPortfolioMap.set(s.user_id, existing);
    }

    for (const [userId, portfolio] of userPortfolioMap) {
      const drawdown =
        ((portfolio.initial - portfolio.equity) / portfolio.initial) * 100;
      if (drawdown >= 15) {
        console.warn(
          `[PORTFOLIO STOP] User ${userId}: drawdown ${drawdown.toFixed(2)}% ≥ 15%. Stopping ALL sessions.`,
        );
        await db.from("trading_logs").insert({
          user_id: userId,
          action: "portfolio_stop",
          details: {
            drawdown,
            initial: portfolio.initial,
            current: portfolio.equity,
            reason: "Portfolio drawdown ≥ 15%",
          } as never,
        } as never);
        // Stop all sessions for this user with reason
        const { data: stoppedSessions } = await db
          .from("trading_sessions")
          .update({
            status: "stopped",
            last_status_message: `Circuit breaker: portfolio drawdown ${drawdown.toFixed(1)}%`,
          })
          .eq("user_id", userId)
          .eq("status", "active")
          .select("id");

        // Notify user via email
        try {
          const sessionsStopped = stoppedSessions?.length ?? 0;
          await queueEmail({
            userId,
            type: "circuit_breaker",
            data: {
              name: "",
              drawdown: `${drawdown.toFixed(1)}%`,
              sessionsStopped,
              portfolioValue: `${portfolio.equity.toLocaleString("no-NO")} NOK`,
              restartUrl: `https://www.klarpakke.no/no/dashboard/portfolio`,
            },
          });
        } catch (notifyErr) {
          console.error(
            `[PORTFOLIO STOP] Failed to email user ${userId}:`,
            notifyErr,
          );
        }

        // Notify user via push notification
        try {
          const cronSecret = process.env.CRON_SECRET;
          if (cronSecret) {
            await fetch(
              `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.klarpakke.no"}/api/notifications/send`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${cronSecret}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userIds: [userId],
                  notification: {
                    title: "⚠️ Trading stoppet",
                    body: `Portfolio drawdown ${drawdown.toFixed(1)}%. ${stoppedSessions?.length ?? 0} session(s) stoppet. Based on equity including open positions.`,
                    url: "/no/dashboard/portfolio",
                    requireInteraction: true,
                  },
                }),
              },
            );
          }
        } catch (pushErr) {
          console.error(
            `[PORTFOLIO STOP] Failed to push notify user ${userId}:`,
            pushErr,
          );
        }
      }
    }

    // Fetch user risk configs in one query to avoid N+1
    const userIds = [...new Set(sessionsWithAuto.map((s) => s.user_id))];
    const { data: autoSettings } = await db
      .from("auto_trade_settings")
      .select(
        "user_id, risk_profile, max_position_percent, daily_loss_limit_percent, daily_trade_limit",
      )
      .in("user_id", userIds);

    const riskConfigMap = new Map<string, RiskConfig>();
    for (const setting of autoSettings || []) {
      const maxPos = (setting.max_position_percent as number) ?? 10;
      const dailyLoss = (setting.daily_loss_limit_percent as number) ?? 5;
      const dailyTrades = (setting.daily_trade_limit as number) ?? 10;
      riskConfigMap.set(setting.user_id as string, {
        maxPositionSizePercent: maxPos,
        stopLossPercent: 1,
        trailingStopLossPercent: 1.5,
        maxDailyLossPercent: dailyLoss,
        maxDailyTrades: dailyTrades,
        maxDrawdownPercent: 15,
        maxLeverage: 1,
      });
    }

    // OPTIMIZATION 1: Pre-fetch candles for all unique symbols (1h + 4h + 15m)
    const uniqueSymbols = new Map<string, Candle[]>();
    const uniqueSymbols4h = new Map<string, Candle[]>();
    const uniqueSymbols15m = new Map<string, Candle[]>();
    const symbolList = [
      ...new Set(
        sessionsWithAuto.map(
          (s) => s.trading_pair?.replace("/", "") || "BTCUSDT",
        ),
      ),
    ];

    await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const [candles1h, candles4h, candles15m] = await Promise.all([
            fetchCandles(symbol, "1h", 100),
            fetchCandles(symbol, "4h", 50),
            fetchCandles(symbol, "15m", 100),
          ]);
          uniqueSymbols.set(symbol, candles1h);
          uniqueSymbols4h.set(symbol, candles4h);
          uniqueSymbols15m.set(symbol, candles15m);
        } catch (err) {
          console.error(`[Tick] Failed to fetch candles for ${symbol}:`, err);
        }
      }),
    );

    // ── EU/EØS (2026): candle-cache per (source, symbol) — Kraken eneste kilde ─
    // unik per (kilde, symbol) for kompatibilitet; alle brukere får kraken-lys.
    // Hvis kraken-kallet feiler mangler cache-entry og processSession gjør
    // direkte fetch (processOne-fallbacken sikrer at tick aldri dør på priskilde).
    const candleCache = new Map<string, Candle[]>();
    for (const [symbol, candles] of uniqueSymbols) {
      candleCache.set(priceCacheKey("kraken", symbol), candles);
    }
    const krakenSymbols = [
      ...new Set(
        sessionsWithAuto
          .filter((s) => pickPriceSource(s.user_id, krakenUserIds) === "kraken")
          .map((s) => s.trading_pair?.replace("/", "") || "BTCUSDT"),
      ),
    ];
    if (krakenSymbols.length > 0) {
      await Promise.all(
        krakenSymbols.map(async (symbol) => {
          try {
            candleCache.set(
              priceCacheKey("kraken", symbol),
              await fetchCandles(symbol, "1h", 100, "kraken"),
            );
          } catch (err) {
            console.warn(
              `[Tick] Kraken fetch feilet for ${symbol}:`,
              (err as Error).message,
            );
          }
        }),
      );
    }
    const results: TickResult[] = [];

    // Parallelliser tick: sekvensiell prosessering av 300+ sesjoner overskrider
    // Cloudflares 60s CPU-grense (HTTP 000 fra klient). Batches av 25 kjører
    // samtidig — hvert batch har egen timeout-guard. Manuell-sesjoner og
    // heartbeat-on-error er beholdt likt.
    const TICK_BATCH_SIZE = 25;
    const processOne = async (
      session: (typeof sessionsWithAuto)[number],
    ): Promise<TickResult> => {
      if (session.strategy_id === "manual") {
        return { session_id: session.id, action: "heartbeat" };
      }
      try {
        const symbolKey = session.trading_pair?.replace("/", "") || "BTCUSDT";
        const priceSource = pickPriceSource(session.user_id, krakenUserIds);
        const result = await processSession(
          db,
          session,
          riskConfigMap.get(session.user_id),
          uniqueSymbols.get(symbolKey),
          darkFleetBaseConfig,
          uniqueSymbols4h.get(symbolKey),
          uniqueSymbols15m.get(symbolKey),
          tradingHalted,
          lastSellCache,
          edgeCache,
          priceSource,
          candleCache,
        );

        // Mirror real trades to copy sessions
        if (
          (result.action === "buy" || result.action === "sell") &&
          result.trade_id
        ) {
          const { data: trade } = await db
            .from("trades")
            .select("*")
            .eq("id", result.trade_id)
            .single();

          if (trade) {
            await mirrorTradeToFollowers(db, session.id, trade);
          }
        }
        return result;
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error(`Error processing session ${session.id}:`, errorMessage);

        // Update heartbeat even on processing errors so transient failures
        // (e.g. Kraken API-feil) do not mark the session as crashed.
        try {
          await db
            .from("trading_sessions")
            .update({
              last_heartbeat: new Date().toISOString(),
              last_tick_at: new Date().toISOString(),
            } as never)
            .eq("id", session.id);
        } catch (heartbeatErr) {
          console.error(
            `[Tick] Failed to update heartbeat for session ${session.id}:`,
            heartbeatErr,
          );
        }

        return {
          session_id: session.id,
          action: "error",
          error: errorMessage,
        };
      }
    };

    for (let i = 0; i < sessionsWithAuto.length; i += TICK_BATCH_SIZE) {
      // Timeout protection — stop starting new batches near the CPU limit
      if (Date.now() - startTime > 55_000) {
        console.warn(
          `Cron tick timeout approaching, processed ${results.length}/${sessionsWithAuto.length}`,
        );
        break;
      }
      const batch = sessionsWithAuto.slice(i, i + TICK_BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(processOne));
      results.push(...batchResults);
    }

    // Sync paper_accounts for alle berørte brukere
    // (smart-trader-v3 trades går via Supabase direkte — her fanges alle)
    const syncedUsers = new Set<string>();
    for (const s of sessionsWithAuto) {
      if (!syncedUsers.has(s.user_id)) {
        syncedUsers.add(s.user_id);
        syncPaperAccountBalance(db, s.user_id).catch(() => {});
      }
    }

    const summary = {
      processed: results.length,
      total_active: sessionsWithAuto.length,
      trades_executed: results.filter(
        (r) => r.action === "buy" || r.action === "sell",
      ).length,
      risk_blocked: results.filter((r) => r.action === "risk_blocked").length,
      errors: results.filter((r) => r.action === "error").length,
      heartbeats: results.filter((r) => r.action === "heartbeat").length,
      duration_ms: Date.now() - startTime,
      results,
    };

    await captureCronSuccess("tick", new Date(startTime), new Date());

    return NextResponse.json(summary);
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error("Cron tick unexpected error:", err);
    captureCronError("tick", err as Error, {
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Internal error", details: errorMessage },
      { status: 500 },
    );
  }
}

// Also support POST for manual triggering
export const POST = GET;
