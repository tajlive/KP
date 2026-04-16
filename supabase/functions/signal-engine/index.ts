// Signal Engine Edge Function — Sprint 11
// Genererer kjøp/salg-signaler basert på tekniske indikatorer (SMA, RSI)
// Lagrer signaler i bot_signals og logger til bot_health
// MTF pre-filter: kun BUY/SELL når alignment score >= 2 / <= -2

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMTFAlignmentScore } from "../_shared/multi-timeframe.ts";
import { captureEdgeFunctionError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Tekniske indikatorer ─────────────────────────────────────────────────────

function sma(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return NaN;
    return (
      data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
    );
  });
}

function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length < period + 1) return out;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    out[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

// ── Binance public API ───────────────────────────────────────────────────────

async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 220,
): Promise<number[][]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Binance klines HTTP ${res.status} for ${symbol}`);
  return res.json();
}

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
  );
  if (!res.ok)
    throw new Error(`Binance price HTTP ${res.status} for ${symbol}`);
  const data = await res.json();
  return parseFloat(data.price);
}

// ── Signal-typer ─────────────────────────────────────────────────────────────

type Action = "BUY" | "SELL" | "HOLD";

interface Signal {
  strategy_type: string;
  symbol: string;
  action: Action;
  confidence: number;
  reason: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
}

function toTradingSignalAction(action: Action): "buy" | "sell" | "hold" {
  if (action === "BUY") return "buy";
  if (action === "SELL") return "sell";
  return "hold";
}

function toTradingSignalType(
  strategyType: string | undefined,
): "technical" | "ai" | "news" | "manual" {
  if (strategyType === "ai_copy") return "ai";
  if (strategyType === "manual") return "manual";
  return "technical";
}

// DCA: fast kjøp ukentlig (cron tar seg av timing, vi returnerer BUY alltid)
async function evaluateDCA(symbol = "BTCUSDT"): Promise<Signal> {
  const price = await fetchPrice(symbol);
  const sl = price * 0.95; // 5% stop-loss
  const tp = price * 1.1; // 10% take-profit
  return {
    strategy_type: "dca_trygg",
    symbol,
    action: "BUY",
    confidence: 1.0,
    reason: "DCA: ugentlig kjøp til markedspris",
    entry_price: price,
    stop_loss: sl,
    take_profit: tp,
  };
}

// Trend: Golden/Death Cross på MA50/MA200 med RSI-filter
async function evaluateTrend(symbol = "BTCUSDT"): Promise<Signal> {
  const klines = await fetchKlines(symbol, "1d", 220);
  const closes = klines.map((k) => parseFloat(String(k[4])));
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const rsiArr = rsi(closes);
  const i = closes.length - 1;
  const price = closes[i];

  const goldenCross = ma50[i] > ma200[i] && ma50[i - 1] <= ma200[i - 1];
  const deathCross = ma50[i] < ma200[i] && ma50[i - 1] >= ma200[i - 1];
  const rsiVal = rsiArr[i];

  if (goldenCross && rsiVal > 35 && rsiVal < 70) {
    return {
      strategy_type: "trend_balansert",
      symbol,
      action: "BUY",
      confidence: 0.8,
      reason: `Golden Cross MA50=${ma50[i].toFixed(0)} > MA200=${ma200[i].toFixed(0)}, RSI=${rsiVal.toFixed(1)}`,
      entry_price: price,
      stop_loss: price * 0.93,
      take_profit: price * 1.15,
    };
  }
  if (deathCross) {
    return {
      strategy_type: "trend_balansert",
      symbol,
      action: "SELL",
      confidence: 0.75,
      reason: `Death Cross MA50=${ma50[i].toFixed(0)} < MA200=${ma200[i].toFixed(0)}`,
      entry_price: price,
    };
  }
  return {
    strategy_type: "trend_balansert",
    symbol,
    action: "HOLD",
    confidence: 0.5,
    reason: `MA50=${ma50[i].toFixed(0)} MA200=${ma200[i].toFixed(0)} RSI=${rsiVal.toFixed(1)} – ingen kryss`,
  };
}

// Multi-signal: RSI oversold + 4h momentum
async function evaluateMultiSignal(symbol = "BTCUSDT"): Promise<Signal> {
  const klines = await fetchKlines(symbol, "4h", 50);
  const closes = klines.map((k) => parseFloat(String(k[4])));
  const rsiArr = rsi(closes);
  const i = closes.length - 1;
  const price = closes[i];
  const rsiVal = rsiArr[i];

  let score = 0;
  const reasons: string[] = [];

  if (rsiVal < 35) {
    score++;
    reasons.push(`RSI=${rsiVal.toFixed(1)} oversold`);
  }
  const change4h = ((closes[i] - closes[i - 4]) / closes[i - 4]) * 100;
  if (change4h > 0.5) {
    score++;
    reasons.push(`4h momentum +${change4h.toFixed(2)}%`);
  }
  const ma20 = sma(closes, 20);
  if (price > ma20[i]) {
    score++;
    reasons.push(`pris over MA20=${ma20[i].toFixed(0)}`);
  }

  if (score >= 2) {
    return {
      strategy_type: "multisignal_aktiv",
      symbol,
      action: "BUY",
      confidence: score / 3,
      reason: reasons.join(" | "),
      entry_price: price,
      stop_loss: price * 0.97,
      take_profit: price * 1.06,
    };
  }
  if (rsiVal > 70) {
    return {
      strategy_type: "multisignal_aktiv",
      symbol,
      action: "SELL",
      confidence: 0.65,
      reason: `RSI=${rsiVal.toFixed(1)} overkjøpt`,
      entry_price: price,
    };
  }
  return {
    strategy_type: "multisignal_aktiv",
    symbol,
    action: "HOLD",
    confidence: 0.5,
    reason: `Score ${score}/3 – utilstrekkelig bekreftelse`,
  };
}

// ── Hovedhandler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    supabase = createClient(supabaseUrl, serviceRoleKey);

    const upsertHealth = async (
      status: "ok" | "warning" | "error",
      message: string,
      metadata: Record<string, unknown>,
    ) => {
      const { error: healthErr } = await supabase.from("bot_health").upsert(
        {
          bot_name: "signal-engine",
          status,
          last_error: status === "error" ? message : null,
          last_heartbeat: new Date().toISOString(),
          metadata: {
            message,
            ...metadata,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "bot_name" },
      );
      if (healthErr) console.warn("bot_health upsert:", healthErr.message);
    };

    // Tidlig heartbeat: cron/timeout kan stoppe kjøring før siste upsert — da er feed fortsatt «fersk» nok til diagnose.
    await upsertHealth("warning", "Signal engine run started", {
      phase: "start",
    });

    // Støtter både cron-kall (uten body) og strategy-runner-kall (med strategy/user_id)
    let bodyStrategy: string | null = null;
    let bodyUserId: string | null = null;
    try {
      const body = await req.json();
      bodyStrategy = body.strategy ?? null;
      bodyUserId = body.user_id ?? null;
    } catch {
      /* cron-kall uten body */
    }

    type StrategyRow = {
      id: string;
      user_id: string | null;
      strategy_type: string;
      symbol: string;
      capital_allocation: number;
      trading_mode: "paper" | "live";
    };

    const strategies: StrategyRow[] = [];
    const strategyFilter = bodyStrategy ?? null;
    const userFilter = bodyUserId ?? null;

    // Primary source: user_strategies (remote canonical)
    {
      let userStrategiesQuery = supabase
        .from("user_strategies")
        .select("id,user_id,strategy_type,mode,config,is_active")
        .eq("is_active", true);

      if (strategyFilter)
        userStrategiesQuery = userStrategiesQuery.eq(
          "strategy_type",
          strategyFilter,
        );
      if (userFilter)
        userStrategiesQuery = userStrategiesQuery.eq("user_id", userFilter);

      const { data: userStrategies, error: userStrategiesError } =
        await userStrategiesQuery;
      if (!userStrategiesError) {
        for (const row of userStrategies ?? []) {
          const cfg = (row.config ?? {}) as Record<string, unknown>;
          const symbol =
            typeof cfg.symbol === "string" ? cfg.symbol : "BTCUSDT";
          const capitalAllocation =
            typeof cfg.capital_allocation === "number"
              ? cfg.capital_allocation
              : 100;
          const mode = row.mode === "live" ? "live" : "paper";
          strategies.push({
            id: row.id,
            user_id: row.user_id ?? null,
            strategy_type: row.strategy_type,
            symbol,
            capital_allocation: capitalAllocation,
            trading_mode: mode,
          });
        }
      }
    }

    // Fallback source: legacy auto_trading_strategies schema
    if (strategies.length === 0) {
      const { data: legacyStrategies, error: legacyError } = await supabase
        .from("auto_trading_strategies")
        .select("id,name,allowed_symbols,is_active")
        .eq("is_active", true);

      if (!legacyError) {
        for (const row of legacyStrategies ?? []) {
          const firstSymbol =
            Array.isArray(row.allowed_symbols) && row.allowed_symbols.length > 0
              ? String(row.allowed_symbols[0] ?? "BTCUSDT")
              : "BTCUSDT";
          strategies.push({
            id: row.id,
            user_id: null,
            strategy_type: row.name ?? "trend_balansert",
            symbol: firstSymbol,
            capital_allocation: 100,
            trading_mode: "paper",
          });
        }
      }
    }

    const actionSignals: Signal[] = [];
    const DEFAULT_SYMBOL = "BTCUSDT";

    // Evaluer indikatorer én gang per symbol for effektivitet
    const symbols = [
      ...new Set((strategies ?? []).map((s) => s.symbol ?? DEFAULT_SYMBOL)),
    ];
    const trendCache: Record<string, Signal> = {};
    const multiCache: Record<string, Signal> = {};

    for (const sym of symbols) {
      trendCache[sym] = await evaluateTrend(sym).catch(() => ({
        strategy_type: "trend_balansert",
        symbol: sym,
        action: "HOLD",
        confidence: 0,
        reason: "Feil ved henting av data",
      }));
      multiCache[sym] = await evaluateMultiSignal(sym).catch(() => ({
        strategy_type: "multisignal_aktiv",
        symbol: sym,
        action: "HOLD",
        confidence: 0,
        reason: "Feil ved henting av data",
      }));
    }

    for (const strategy of strategies ?? []) {
      const sym = strategy.symbol ?? DEFAULT_SYMBOL;
      let sig: Signal | null = null;

      if (strategy.strategy_type === "dca_trygg") {
        sig = await evaluateDCA(sym).catch(() => null);
      } else if (strategy.strategy_type === "trend_balansert") {
        sig = trendCache[sym] ?? null;
      } else if (strategy.strategy_type === "multisignal_aktiv") {
        sig = multiCache[sym] ?? null;
      } else {
        // grid_bot og ai_copy håndteres av egne Edge Functions fremover
        continue;
      }

      if (!sig || sig.action === "HOLD") continue;

      // MTF pre-filter: kun for trend og multisignal (ikke DCA)
      const useMTF =
        strategy.strategy_type === "trend_balansert" ||
        strategy.strategy_type === "multisignal_aktiv";
      if (useMTF) {
        const mtf = await getMTFAlignmentScore(sym).catch(() => null);
        if (mtf) {
          if (sig.action === "BUY" && mtf.score < 2) continue;
          if (sig.action === "SELL" && mtf.score > -2) continue;
          if (mtf.weakAlignment) {
            sig = {
              ...sig,
              confidence: Math.max(0.1, sig.confidence * 0.7),
              reason: `${sig.reason} [MTF svak]`,
            };
          }
        }
      }

      // Synk til trading_signals så dashboard SignalFeed viser noe (leser fra trading_signals)
      await supabase
        .from("trading_signals")
        .insert({
          symbol: sig.symbol,
          action: toTradingSignalAction(sig.action),
          confidence: Math.round((sig.confidence ?? 0) * 100),
          entry_price: sig.entry_price ?? null,
          stop_loss: sig.stop_loss ?? null,
          target_price: sig.take_profit ?? null,
          reasoning: sig.reason ?? null,
          signal_type: toTradingSignalType(sig.strategy_type),
          status: "active",
        })
        .then((r) => {
          if (r.error) console.warn("trading_signals insert:", r.error.message);
        });

      // Opprett trade automatisk (kun paper-modus) — unified trades-tabell (KLA-214)
      if (
        strategy.user_id &&
        strategy.trading_mode === "paper" &&
        sig.entry_price
      ) {
        const quantity = (strategy.capital_allocation ?? 100) / sig.entry_price;
        await supabase.from("trades").insert({
          user_id: strategy.user_id,
          trading_pair: sig.symbol,
          side: sig.action,
          price: sig.entry_price,
          quantity,
          total_value: strategy.capital_allocation ?? 100,
          mode: "paper",
          order_type: "market",
          status: "open",
          strategy_signal: {
            strategy_id: strategy.id,
            strategy_type: strategy.strategy_type,
            stop_loss: sig.stop_loss ?? null,
            take_profit: sig.take_profit ?? null,
            confidence: sig.confidence,
            reason: sig.reason,
          },
          created_at: new Date().toISOString(),
        });
      }

      actionSignals.push(sig);
    }

    // Fallback: hvis ingen strategier ga signaler, generer ett markedsignal (BTC) så feed ikke er tom
    if (actionSignals.length === 0 && (strategies ?? []).length === 0) {
      const fallbackSig = await evaluateTrend(DEFAULT_SYMBOL).catch(() => null);
      if (fallbackSig && fallbackSig.action !== "HOLD") {
        await supabase
          .from("trading_signals")
          .insert({
            symbol: fallbackSig.symbol,
            action: toTradingSignalAction(fallbackSig.action),
            confidence: Math.round((fallbackSig.confidence ?? 0) * 100),
            entry_price: fallbackSig.entry_price ?? null,
            stop_loss: fallbackSig.stop_loss ?? null,
            target_price: fallbackSig.take_profit ?? null,
            reasoning: fallbackSig.reason ?? null,
            signal_type: toTradingSignalType(fallbackSig.strategy_type),
            status: "active",
          })
          .then((r) => {
            if (r.error)
              console.warn("trading_signals fallback:", r.error.message);
          });
      }
    }

    await upsertHealth(
      actionSignals.length > 0 ? "ok" : "warning",
      `Signal engine: ${actionSignals.length} aktive signaler`,
      {
        signals: actionSignals.length,
        strategies_checked: strategies?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
    );

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: actionSignals.length,
        signals: actionSignals,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Signal engine error:", err);
    await captureEdgeFunctionError("signal-engine", err);
    if (supabase) {
      const { error: healthError } = await supabase.from("bot_health").upsert(
        {
          bot_name: "signal-engine",
          status: "error",
          last_error: String(err),
          last_heartbeat: new Date().toISOString(),
          metadata: { stack: err instanceof Error ? err.stack : null },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "bot_name" },
      );
      if (healthError)
        console.warn("bot_health error upsert:", healthError.message);
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
