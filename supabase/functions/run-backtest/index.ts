import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sma, rsi } from "../_shared/strategies.ts";
import type { StrategyType, Action } from "../_shared/strategies.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface BacktestRequest {
  strategyId: string;
  days?: number;
  symbol?: string;
}

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
}

interface StrategyBacktestConfig {
  interval: string;
  warmupCandles: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  dcaIntervalCandles?: number;
}

// ── Strategy Configuration ─────────────────────────────────────────────────

const STRATEGY_CONFIGS: Record<StrategyType, StrategyBacktestConfig> = {
  dca_trygg: {
    interval: "1d",
    warmupCandles: 0,
    stopLossPercent: 0.05,
    takeProfitPercent: 0.10,
    dcaIntervalCandles: 7,
  },
  trend_balansert: {
    interval: "1d",
    warmupCandles: 200,
    stopLossPercent: 0.07,
    takeProfitPercent: 0.15,
  },
  multisignal_aktiv: {
    interval: "4h",
    warmupCandles: 50,
    stopLossPercent: 0.03,
    takeProfitPercent: 0.06,
  },
  grid_bot: {
    interval: "1h",
    warmupCandles: 50,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.03,
  },
  ai_copy: {
    interval: "4h",
    warmupCandles: 50,
    stopLossPercent: 0.04,
    takeProfitPercent: 0.08,
  },
};

const CANDLES_PER_DAY: Record<string, number> = {
  "1m": 1440,
  "5m": 288,
  "15m": 96,
  "30m": 48,
  "1h": 24,
  "4h": 6,
  "1d": 1,
  "1w": 1 / 7,
};

const PERIODS_PER_YEAR: Record<string, number> = {
  "1h": 252 * 24,
  "4h": 252 * 6,
  "1d": 252,
  "1w": 52,
};

// ── Binance Historical Klines ──────────────────────────────────────────────

const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";

async function fetchHistoricalKlines(
  symbol: string,
  interval: string,
  startTimeMs: number,
  endTimeMs: number,
): Promise<Candle[]> {
  const allCandles: Candle[] = [];
  let currentStart = startTimeMs;
  let consecutiveRetries = 0;

  while (currentStart < endTimeMs) {
    const url =
      `${BINANCE_KLINES_URL}?symbol=${symbol}&interval=${interval}` +
      `&startTime=${currentStart}&endTime=${endTimeMs}&limit=1000`;

    const res = await fetch(url);

    if (res.status === 429) {
      consecutiveRetries++;
      if (consecutiveRetries > 3) {
        throw new Error("Binance rate limit exceeded after 3 retries");
      }
      const backoffMs = Math.min(
        2000 * Math.pow(2, consecutiveRetries),
        30000,
      );
      console.warn(`Rate limited, backing off ${backoffMs}ms…`);
      await sleep(backoffMs);
      continue;
    }

    if (res.status === 418) {
      throw new Error("IP banned by Binance — wait before retrying");
    }

    if (!res.ok) {
      throw new Error(`Binance API ${res.status}: ${await res.text()}`);
    }

    const data: unknown[][] = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const k of data) {
      allCandles.push({
        openTime: Number(k[0]),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      });
    }

    currentStart = Number(data[data.length - 1][6]) + 1;
    consecutiveRetries = 0;
    await sleep(100);
  }

  console.info(`Fetched ${allCandles.length} ${interval} candles for ${symbol}`);
  return allCandles;
}

// ── Signal Evaluation on Historical Data ───────────────────────────────────

interface PrecomputedIndicators {
  sma20: number[];
  sma50: number[];
  sma200: number[];
  rsi14: number[];
}

function precomputeIndicators(closes: number[]): PrecomputedIndicators {
  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    rsi14: rsi(closes),
  };
}

function evaluateSignal(
  strategyType: StrategyType,
  closes: number[],
  index: number,
  ind: PrecomputedIndicators,
): Action {
  switch (strategyType) {
    case "dca_trygg":
      return "BUY";

    case "trend_balansert": {
      if (index < 200 || isNaN(ind.sma200[index]) || isNaN(ind.sma50[index]))
        return "HOLD";
      const goldenCross =
        ind.sma50[index] > ind.sma200[index] &&
        ind.sma50[index - 1] <= ind.sma200[index - 1];
      const deathCross =
        ind.sma50[index] < ind.sma200[index] &&
        ind.sma50[index - 1] >= ind.sma200[index - 1];
      const r = ind.rsi14[index];
      if (goldenCross && r > 35 && r < 70) return "BUY";
      if (deathCross) return "SELL";
      return "HOLD";
    }

    case "multisignal_aktiv": {
      if (index < 20) return "HOLD";
      const r = ind.rsi14[index];
      if (isNaN(r)) return "HOLD";
      let score = 0;
      if (r < 35) score++;
      if (index >= 4) {
        const mom =
          ((closes[index] - closes[index - 4]) / closes[index - 4]) * 100;
        if (mom > 0.5) score++;
      }
      if (!isNaN(ind.sma20[index]) && closes[index] > ind.sma20[index])
        score++;
      if (score >= 2) return "BUY";
      if (r > 70) return "SELL";
      return "HOLD";
    }

    case "grid_bot": {
      if (index < 20) return "HOLD";
      const r = ind.rsi14[index];
      if (isNaN(r)) return "HOLD";
      if (r < 30) return "BUY";
      if (r > 70) return "SELL";
      return "HOLD";
    }

    case "ai_copy": {
      if (index < 20) return "HOLD";
      const r = ind.rsi14[index];
      if (isNaN(r)) return "HOLD";
      let score = 0;
      if (r < 35) score++;
      if (index >= 4) {
        const mom =
          ((closes[index] - closes[index - 4]) / closes[index - 4]) * 100;
        if (mom > 0.5) score++;
      }
      if (!isNaN(ind.sma20[index]) && closes[index] > ind.sma20[index])
        score++;
      if (score >= 2) return "BUY";
      if (r > 70) return "SELL";
      return "HOLD";
    }

    default:
      return "HOLD";
  }
}

// ── Backtest Engines ───────────────────────────────────────────────────────

function runSignalBacktest(
  candles: Candle[],
  closes: number[],
  strategyType: StrategyType,
  config: StrategyBacktestConfig,
  initialCapital: number,
): { trades: Trade[]; equityCurve: number[] } {
  const ind = precomputeIndicators(closes);
  const trades: Trade[] = [];
  const equityCurve: number[] = [];

  let capital = initialCapital;
  let inPosition = false;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;

  for (let i = config.warmupCandles; i < candles.length; i++) {
    const price = closes[i];
    const candle = candles[i];

    if (inPosition) {
      const hitSL = candle.low <= stopLoss;
      const hitTP = candle.high >= takeProfit;

      if (hitSL || hitTP) {
        // Conservative: if both hit in same candle, assume SL triggered first
        const exitPrice = hitSL ? stopLoss : takeProfit;
        const pnlFrac = (exitPrice - entryPrice) / entryPrice;
        const tradePnl = capital * pnlFrac;
        capital += tradePnl;

        trades.push({
          entryTime,
          entryPrice,
          exitTime: candle.openTime,
          exitPrice,
          pnl: tradePnl,
          pnlPercent: pnlFrac * 100,
          reason: hitSL ? "stop-loss" : "take-profit",
        });

        inPosition = false;
        equityCurve.push(capital);
        continue;
      }
    }

    const signal = evaluateSignal(strategyType, closes, i, ind);

    if (signal === "BUY" && !inPosition) {
      inPosition = true;
      entryPrice = price;
      entryTime = candle.openTime;
      stopLoss = price * (1 - config.stopLossPercent);
      takeProfit = price * (1 + config.takeProfitPercent);
    } else if (signal === "SELL" && inPosition) {
      const pnlFrac = (price - entryPrice) / entryPrice;
      const tradePnl = capital * pnlFrac;
      capital += tradePnl;

      trades.push({
        entryTime,
        entryPrice,
        exitTime: candle.openTime,
        exitPrice: price,
        pnl: tradePnl,
        pnlPercent: pnlFrac * 100,
        reason: "signal-sell",
      });

      inPosition = false;
    }

    if (inPosition) {
      const unrealizedPnl = (price - entryPrice) / entryPrice;
      equityCurve.push(capital * (1 + unrealizedPnl));
    } else {
      equityCurve.push(capital);
    }
  }

  // Close any remaining position at last price
  if (inPosition && closes.length > 0) {
    const lastPrice = closes[closes.length - 1];
    const pnlFrac = (lastPrice - entryPrice) / entryPrice;
    const tradePnl = capital * pnlFrac;
    capital += tradePnl;

    trades.push({
      entryTime,
      entryPrice,
      exitTime: candles[candles.length - 1].openTime,
      exitPrice: lastPrice,
      pnl: tradePnl,
      pnlPercent: pnlFrac * 100,
      reason: "backtest-end",
    });

    equityCurve[equityCurve.length - 1] = capital;
  }

  return { trades, equityCurve };
}

function runDCABacktest(
  candles: Candle[],
  closes: number[],
  intervalCandles: number,
  initialCapital: number,
): { trades: Trade[]; equityCurve: number[] } {
  const trades: Trade[] = [];
  const equityCurve: number[] = [];

  const numBuys = Math.max(1, Math.floor(candles.length / intervalCandles));
  const buyAmount = initialCapital / numBuys;
  let totalAssets = 0;
  let cashRemaining = initialCapital;

  for (let i = 0; i < candles.length; i++) {
    const price = closes[i];

    if (i % intervalCandles === 0 && cashRemaining >= buyAmount) {
      const quantity = buyAmount / price;
      totalAssets += quantity;
      cashRemaining -= buyAmount;

      trades.push({
        entryTime: candles[i].openTime,
        entryPrice: price,
        exitTime: candles[i].openTime,
        exitPrice: price,
        pnl: 0,
        pnlPercent: 0,
        reason: "dca-buy",
      });
    }

    equityCurve.push(totalAssets * price + cashRemaining);
  }

  // Update each DCA trade with final P&L
  if (candles.length > 0) {
    const finalPrice = closes[closes.length - 1];
    const finalTime = candles[candles.length - 1].openTime;
    for (const trade of trades) {
      trade.exitPrice = finalPrice;
      trade.exitTime = finalTime;
      trade.pnlPercent =
        ((finalPrice - trade.entryPrice) / trade.entryPrice) * 100;
      trade.pnl =
        (buyAmount / trade.entryPrice) * (finalPrice - trade.entryPrice);
    }
  }

  return { trades, equityCurve };
}

// ── Metrics ────────────────────────────────────────────────────────────────

function calculateMetrics(
  trades: Trade[],
  equityCurve: number[],
  initialCapital: number,
  interval: string,
) {
  const finalCapital =
    equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1]
      : initialCapital;

  const totalReturn = (finalCapital - initialCapital) / initialCapital;
  const wins = trades.filter((t) => t.pnlPercent > 0).length;
  const winRate = trades.length > 0 ? wins / trades.length : 0;

  let peak = initialCapital;
  let maxDrawdown = 0;
  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  let sharpeRatio = 0;
  if (equityCurve.length > 1) {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push(
        (equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1],
      );
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);
    const annFactor = Math.sqrt(PERIODS_PER_YEAR[interval] ?? 252);
    if (stdDev > 0) {
      sharpeRatio = (meanReturn / stdDev) * annFactor;
    }
  }

  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0),
  );
  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? Infinity
        : 0;

  const avgTradePnl =
    trades.length > 0
      ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
      : 0;

  return {
    finalCapital,
    totalReturn,
    winRate,
    maxDrawdown,
    sharpeRatio,
    profitFactor,
    avgTradePnl,
    numTrades: trades.length,
  };
}

function downsampleArray(arr: number[], maxPoints: number): number[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const result: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.floor(i * step)]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Edge Function ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BacktestRequest;
    const { strategyId, days = 90 } = body;

    const { data: strategy, error: strategyError } = await supabase
      .from("user_strategies")
      .select("*, strategy:strategy_type(*)")
      .eq("id", strategyId)
      .eq("user_id", user.id)
      .single();

    if (strategyError || !strategy) {
      return new Response(JSON.stringify({ error: "Strategy not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const strategyType = strategy.strategy_type as StrategyType;
    const config = STRATEGY_CONFIGS[strategyType];
    if (!config) {
      return new Response(
        JSON.stringify({
          error: `Unsupported strategy type: ${strategyType}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const symbol = (
      body.symbol ||
      strategy.symbol ||
      "BTCUSDT"
    )
      .toUpperCase()
      .replace(/USDT$/i, "") + "USDT";

    const initialCapital = strategy.initial_capital || 10000;

    // Time range: backtest period + warmup for indicators
    const endDate = new Date();
    const candlesPerDay = CANDLES_PER_DAY[config.interval] ?? 1;
    const warmupDays = Math.ceil(config.warmupCandles / candlesPerDay);
    const totalDays = days + warmupDays;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - totalDays);

    console.info(
      `Backtest: ${strategyType} on ${symbol}, ${days}d (+${warmupDays}d warmup), ${config.interval} candles`,
    );

    const candles = await fetchHistoricalKlines(
      symbol,
      config.interval,
      startDate.getTime(),
      endDate.getTime(),
    );

    if (candles.length < config.warmupCandles + 10) {
      return new Response(
        JSON.stringify({
          error: `Insufficient data: got ${candles.length} candles, need at least ${config.warmupCandles + 10}`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const closes = candles.map((c) => c.close);

    // Run the appropriate backtest engine
    const { trades, equityCurve } =
      strategyType === "dca_trygg"
        ? runDCABacktest(
            candles,
            closes,
            config.dcaIntervalCandles ?? 7,
            initialCapital,
          )
        : runSignalBacktest(
            candles,
            closes,
            strategyType,
            config,
            initialCapital,
          );

    const metrics = calculateMetrics(
      trades,
      equityCurve,
      initialCapital,
      config.interval,
    );

    // Confidence score based on real backtest quality
    const confidenceScore = Math.min(
      100,
      Math.round(
        metrics.winRate * 30 +
          (1 - metrics.maxDrawdown) * 30 +
          (metrics.sharpeRatio > 1 ? 20 : metrics.sharpeRatio > 0 ? 10 : 0) +
          (metrics.numTrades > 20 ? 20 : metrics.numTrades > 10 ? 10 : 5),
      ),
    );

    let recommendation = "reject";
    if (
      confidenceScore >= 70 &&
      metrics.totalReturn > 0 &&
      metrics.sharpeRatio > 0.5
    ) {
      recommendation = "approve";
    } else if (confidenceScore >= 40 && metrics.totalReturn > -0.05) {
      recommendation = "review";
    }

    const backtestEndDate = new Date();
    const backtestStartDate = new Date();
    backtestStartDate.setDate(backtestStartDate.getDate() - days);

    const backtestData = {
      user_id: user.id,
      strategy_id: strategyId,
      start_date: backtestStartDate.toISOString().split("T")[0],
      end_date: backtestEndDate.toISOString().split("T")[0],
      initial_capital: initialCapital,
      result: {
        final_capital: round2(metrics.finalCapital),
        total_return: round2(metrics.totalReturn * 100),
        win_rate: round2(metrics.winRate * 100),
        max_drawdown: round2(metrics.maxDrawdown * 100),
        sharpe_ratio: round2(metrics.sharpeRatio),
        trades_count: metrics.numTrades,
        trades_per_month: Math.round(metrics.numTrades / (days / 30)),
        avg_trade_pnl: round2(metrics.avgTradePnl),
        profit_factor: round2(
          metrics.profitFactor === Infinity ? 99.99 : metrics.profitFactor,
        ),
        expectancy:
          metrics.numTrades > 0
            ? round2(
                (metrics.totalReturn * initialCapital) / metrics.numTrades,
              )
            : 0,
        equity_curve: downsampleArray(equityCurve, 100).map(round2),
        candles_analyzed: candles.length,
        symbol,
        interval: config.interval,
      },
      is_valid: true,
      confidence_score: confidenceScore,
      recommendation,
    };

    const { data: backtest, error: insertError } = await supabase
      .from("auto_trading_backtests")
      .insert(backtestData)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert backtest:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        backtest,
        message: `Backtest completed: ${metrics.numTrades} trades over ${days} days using real ${symbol} data`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Backtest error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
