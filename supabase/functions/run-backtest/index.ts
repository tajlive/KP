import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sma, rsi } from "../_shared/strategies.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BINANCE_API = "https://api.binance.com/api/v3";

// ── Types ────────────────────────────────────────────────────────────────────

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
  pnlPercent: number;
  pnlAbsolute: number;
  exitReason: "signal" | "stop_loss" | "take_profit" | "end_of_backtest";
}

type Action = "BUY" | "SELL" | "HOLD";

// ── Strategy Configuration ───────────────────────────────────────────────────

interface StrategyCfg {
  interval: string;
  lookback: number;
  stopLossPct: number;
  takeProfitPct: number;
}

const STRATEGY_DEFAULTS: Record<string, StrategyCfg> = {
  dca_trygg: {
    interval: "1d",
    lookback: 7,
    stopLossPct: 0,
    takeProfitPct: 0,
  },
  trend_balansert: {
    interval: "1d",
    lookback: 200,
    stopLossPct: 0.07,
    takeProfitPct: 0.15,
  },
  multisignal_aktiv: {
    interval: "4h",
    lookback: 20,
    stopLossPct: 0.03,
    takeProfitPct: 0.06,
  },
  grid_bot: {
    interval: "1h",
    lookback: 24,
    stopLossPct: 0.02,
    takeProfitPct: 0.03,
  },
  ai_copy: {
    interval: "1d",
    lookback: 14,
    stopLossPct: 0.05,
    takeProfitPct: 0.10,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function intervalToMs(interval: string): number {
  const map: Record<string, number> = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
    "1w": 604_800_000,
  };
  return map[interval] || 86_400_000;
}

function periodsPerYear(interval: string): number {
  const map: Record<string, number> = {
    "1h": 365 * 24,
    "4h": 365 * 6,
    "1d": 365,
    "1w": 52,
  };
  return map[interval] || 365;
}

// ── Binance Historical Data ──────────────────────────────────────────────────

async function fetchHistoricalKlines(
  symbol: string,
  interval: string,
  startMs: number,
  endMs: number,
): Promise<Candle[]> {
  const all: Candle[] = [];
  let cursor = startMs;
  let consecutiveRetries = 0;

  while (cursor < endMs) {
    const url =
      `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}` +
      `&startTime=${cursor}&endTime=${endMs}&limit=1000`;

    const res = await fetch(url);

    if (res.status === 429) {
      const wait = parseInt(res.headers.get("Retry-After") || "5", 10);
      console.warn(`Binance 429 – backing off ${wait}s`);
      await sleep(wait * 1000);
      consecutiveRetries++;
      if (consecutiveRetries > 5) {
        throw new Error("Binance rate limit exceeded after 5 retries");
      }
      continue;
    }

    if (res.status === 418) {
      throw new Error("IP banned by Binance (HTTP 418) – retry later");
    }

    if (!res.ok) {
      throw new Error(`Binance ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const k of data) {
      all.push({
        openTime: Number(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      });
    }

    cursor = Number(data[data.length - 1][6]) + 1;
    consecutiveRetries = 0;
    await sleep(100);
  }

  return all;
}

// ── Signal Generation ────────────────────────────────────────────────────────

function generateSignals(
  strategyType: string,
  candles: Candle[],
  lookbackStart: number,
): Action[] {
  const closes = candles.map((c) => c.close);
  const signals: Action[] = new Array(candles.length).fill("HOLD");

  switch (strategyType) {
    case "dca_trygg": {
      let counter = 0;
      for (let i = lookbackStart; i < candles.length; i++) {
        if (++counter >= 7) {
          signals[i] = "BUY";
          counter = 0;
        }
      }
      break;
    }

    case "trend_balansert": {
      const ma50 = sma(closes, 50);
      const ma200 = sma(closes, 200);
      const rsiArr = rsi(closes);

      for (let i = Math.max(lookbackStart, 1); i < candles.length; i++) {
        if (isNaN(ma50[i]) || isNaN(ma200[i]) || isNaN(rsiArr[i])) continue;

        const golden = ma50[i] > ma200[i] && ma50[i - 1] <= ma200[i - 1];
        const death = ma50[i] < ma200[i] && ma50[i - 1] >= ma200[i - 1];

        if (golden && rsiArr[i] > 35 && rsiArr[i] < 70) {
          signals[i] = "BUY";
        } else if (death) {
          signals[i] = "SELL";
        }
      }
      break;
    }

    case "multisignal_aktiv": {
      const ma20 = sma(closes, 20);
      const rsiArr = rsi(closes);

      for (let i = Math.max(lookbackStart, 4); i < candles.length; i++) {
        if (isNaN(rsiArr[i])) continue;
        let score = 0;
        if (rsiArr[i] < 35) score++;
        const mom = ((closes[i] - closes[i - 4]) / closes[i - 4]) * 100;
        if (mom > 0.5) score++;
        if (!isNaN(ma20[i]) && closes[i] > ma20[i]) score++;

        if (score >= 2) signals[i] = "BUY";
        else if (rsiArr[i] > 70) signals[i] = "SELL";
      }
      break;
    }

    case "grid_bot": {
      const ma24 = sma(closes, 24);
      const band = 0.015;
      for (let i = lookbackStart; i < candles.length; i++) {
        if (isNaN(ma24[i])) continue;
        const dev = (closes[i] - ma24[i]) / ma24[i];
        if (dev < -band) signals[i] = "BUY";
        else if (dev > band) signals[i] = "SELL";
      }
      break;
    }

    case "ai_copy": {
      const rsiArr = rsi(closes);
      for (let i = lookbackStart; i < candles.length; i++) {
        if (isNaN(rsiArr[i])) continue;
        if (rsiArr[i] < 30) signals[i] = "BUY";
        else if (rsiArr[i] > 70) signals[i] = "SELL";
      }
      break;
    }
  }

  return signals;
}

// ── DCA Backtest Engine ──────────────────────────────────────────────────────

interface SimResult {
  trades: Trade[];
  equityCurve: { time: number; equity: number }[];
  totalReturn: number;
  finalCapital: number;
  winRate: number;
  maxDrawdown: number;
  periodicReturns: number[];
}

function runDCABacktest(
  candles: Candle[],
  lookbackStart: number,
  initialCapital: number,
  signals: Action[],
): SimResult {
  const buyCount = signals.filter((s) => s === "BUY").length;
  if (buyCount === 0) {
    return {
      trades: [],
      equityCurve: [],
      totalReturn: 0,
      finalCapital: initialCapital,
      winRate: 0,
      maxDrawdown: 0,
      periodicReturns: [],
    };
  }

  const amountPerBuy = initialCapital / buyCount;
  let totalCoins = 0;
  let totalInvested = 0;
  const buys: { time: number; price: number; coins: number }[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let prevEquity = initialCapital;
  const periodicReturns: number[] = [];
  const step = Math.max(
    1,
    Math.floor((candles.length - lookbackStart) / 200),
  );

  for (let i = lookbackStart; i < candles.length; i++) {
    const price = candles[i].close;

    if (signals[i] === "BUY") {
      const coins = amountPerBuy / price;
      totalCoins += coins;
      totalInvested += amountPerBuy;
      buys.push({ time: candles[i].openTime, price, coins });
    }

    const equity = totalCoins * price + (initialCapital - totalInvested);

    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (prevEquity > 0) {
      periodicReturns.push((equity - prevEquity) / prevEquity);
    }
    prevEquity = equity;

    if ((i - lookbackStart) % step === 0) {
      equityCurve.push({
        time: candles[i].openTime,
        equity: Math.round(equity * 100) / 100,
      });
    }
  }

  const lastPrice = candles[candles.length - 1].close;
  const finalValue = totalCoins * lastPrice + (initialCapital - totalInvested);
  const totalReturn = (finalValue - initialCapital) / initialCapital;

  const trades: Trade[] = buys.map((b) => ({
    entryTime: b.time,
    entryPrice: b.price,
    exitTime: candles[candles.length - 1].openTime,
    exitPrice: lastPrice,
    pnlPercent: ((lastPrice - b.price) / b.price) * 100,
    pnlAbsolute: b.coins * (lastPrice - b.price),
    exitReason: "end_of_backtest" as const,
  }));

  const winRate =
    trades.length > 0
      ? trades.filter((t) => t.pnlPercent > 0).length / trades.length
      : 0;

  return {
    trades,
    equityCurve,
    totalReturn,
    finalCapital: Math.round(finalValue * 100) / 100,
    winRate,
    maxDrawdown,
    periodicReturns,
  };
}

// ── Signal-Based Backtest Engine ─────────────────────────────────────────────

function runSignalBacktest(
  candles: Candle[],
  signals: Action[],
  lookbackStart: number,
  initialCapital: number,
  stopLossPct: number,
  takeProfitPct: number,
): SimResult {
  let capital = initialCapital;
  let position: {
    entryPrice: number;
    entryTime: number;
    size: number;
  } | null = null;
  const trades: Trade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  const periodicReturns: number[] = [];
  let prevEquity = initialCapital;
  const step = Math.max(
    1,
    Math.floor((candles.length - lookbackStart) / 200),
  );

  function closeTrade(
    exitPrice: number,
    exitTime: number,
    reason: Trade["exitReason"],
  ) {
    if (!position) return;
    const pnl = (exitPrice - position.entryPrice) / position.entryPrice;
    const pnlAbs = position.size * pnl;
    capital += position.size + pnlAbs;
    trades.push({
      entryTime: position.entryTime,
      entryPrice: position.entryPrice,
      exitTime,
      exitPrice,
      pnlPercent: pnl * 100,
      pnlAbsolute: pnlAbs,
      exitReason: reason,
    });
    position = null;
  }

  for (let i = lookbackStart; i < candles.length; i++) {
    const c = candles[i];

    if (position) {
      const slPrice = position.entryPrice * (1 - stopLossPct);
      const tpPrice = position.entryPrice * (1 + takeProfitPct);

      if (stopLossPct > 0 && c.low <= slPrice) {
        closeTrade(slPrice, c.openTime, "stop_loss");
      } else if (takeProfitPct > 0 && c.high >= tpPrice) {
        closeTrade(tpPrice, c.openTime, "take_profit");
      }
    }

    if (signals[i] === "BUY" && !position && capital > 0) {
      const size = capital * 0.95;
      position = { entryPrice: c.close, entryTime: c.openTime, size };
      capital -= size;
    } else if (signals[i] === "SELL" && position) {
      closeTrade(c.close, c.openTime, "signal");
    }

    const unrealized = position
      ? position.size *
        ((c.close - position.entryPrice) / position.entryPrice)
      : 0;
    const equity = capital + (position ? position.size + unrealized : 0);

    if (equity > peakEquity) peakEquity = equity;
    const dd = (peakEquity - equity) / peakEquity;
    if (dd > maxDrawdown) maxDrawdown = dd;

    periodicReturns.push((equity - prevEquity) / prevEquity);
    prevEquity = equity;

    if ((i - lookbackStart) % step === 0) {
      equityCurve.push({
        time: c.openTime,
        equity: Math.round(equity * 100) / 100,
      });
    }
  }

  if (position) {
    closeTrade(
      candles[candles.length - 1].close,
      candles[candles.length - 1].openTime,
      "end_of_backtest",
    );
  }

  const totalReturn = (capital - initialCapital) / initialCapital;
  const winRate =
    trades.length > 0
      ? trades.filter((t) => t.pnlPercent > 0).length / trades.length
      : 0;

  return {
    trades,
    equityCurve,
    totalReturn,
    finalCapital: Math.round(capital * 100) / 100,
    winRate,
    maxDrawdown,
    periodicReturns,
  };
}

// ── Sharpe Ratio ─────────────────────────────────────────────────────────────

function computeSharpe(returns: number[], annFactor: number): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(annFactor);
}

// ── Main Handler ─────────────────────────────────────────────────────────────

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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      strategyId,
      days = 90,
      symbol: reqSymbol,
    } = (await req.json()) as BacktestRequest;

    const { data: strategy, error: strategyError } = await supabase
      .from("user_strategies")
      .select("*, strategy:strategy_type(*)")
      .eq("id", strategyId)
      .eq("user_id", user.id)
      .single();

    if (strategyError || !strategy) {
      return new Response(
        JSON.stringify({ error: "Strategy not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const strategyType: string =
      strategy.strategy_type || strategy.strategy?.slug || "trend_balansert";
    const symbol =
      (reqSymbol || strategy.symbol || "BTCUSDT")
        .replace(/USDT$/i, "")
        .toUpperCase() + "USDT";
    const initialCapital: number = strategy.initial_capital || 10000;
    const cfg =
      STRATEGY_DEFAULTS[strategyType] || STRATEGY_DEFAULTS.trend_balansert;

    const endDate = new Date();
    const simCandlesNeeded = Math.ceil(
      (days * 86_400_000) / intervalToMs(cfg.interval),
    );
    const totalCandlesNeeded = simCandlesNeeded + cfg.lookback;
    const startMs =
      endDate.getTime() - totalCandlesNeeded * intervalToMs(cfg.interval);

    console.log(
      `Backtest: ${strategyType} ${symbol} ${cfg.interval} ` +
        `${days}d – fetching ~${totalCandlesNeeded} candles`,
    );

    const candles = await fetchHistoricalKlines(
      symbol,
      cfg.interval,
      startMs,
      endDate.getTime(),
    );

    if (candles.length < cfg.lookback + 10) {
      throw new Error(
        `Insufficient data: got ${candles.length} candles, need at least ${cfg.lookback + 10}`,
      );
    }

    console.log(`Fetched ${candles.length} candles from Binance`);

    const signals = generateSignals(strategyType, candles, cfg.lookback);

    const result =
      strategyType === "dca_trygg"
        ? runDCABacktest(candles, cfg.lookback, initialCapital, signals)
        : runSignalBacktest(
            candles,
            signals,
            cfg.lookback,
            initialCapital,
            cfg.stopLossPct,
            cfg.takeProfitPct,
          );

    const sharpeRatio = computeSharpe(
      result.periodicReturns,
      periodsPerYear(cfg.interval),
    );

    const grossProfit = result.trades
      .filter((t) => t.pnlAbsolute > 0)
      .reduce((s, t) => s + t.pnlAbsolute, 0);
    const grossLoss = Math.abs(
      result.trades
        .filter((t) => t.pnlAbsolute < 0)
        .reduce((s, t) => s + t.pnlAbsolute, 0),
    );
    const profitFactor =
      grossLoss > 0
        ? Math.round((grossProfit / grossLoss) * 100) / 100
        : grossProfit > 0
          ? 999.99
          : 0;

    const confidenceScore = Math.min(
      100,
      Math.round(
        result.winRate * 30 +
          (1 - result.maxDrawdown) * 30 +
          (sharpeRatio > 1 ? 20 : sharpeRatio > 0 ? 10 : 0) +
          (result.trades.length > 20
            ? 20
            : result.trades.length > 10
              ? 10
              : 5),
      ),
    );

    let recommendation = "reject";
    if (
      confidenceScore >= 70 &&
      result.totalReturn > 0 &&
      sharpeRatio > 0.5
    ) {
      recommendation = "approve";
    } else if (confidenceScore >= 40 && result.totalReturn > -0.05) {
      recommendation = "review";
    }

    const simStartDate = new Date(
      startMs + cfg.lookback * intervalToMs(cfg.interval),
    );

    const backtestData = {
      user_id: user.id,
      strategy_id: strategyId,
      start_date: simStartDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      initial_capital: initialCapital,
      result: {
        final_capital: result.finalCapital,
        total_return: Math.round(result.totalReturn * 10000) / 100,
        win_rate: Math.round(result.winRate * 10000) / 100,
        max_drawdown: Math.round(result.maxDrawdown * 10000) / 100,
        sharpe_ratio: Math.round(sharpeRatio * 100) / 100,
        trades_count: result.trades.length,
        trades_per_month: Math.round(
          result.trades.length / Math.max(1, days / 30),
        ),
        avg_trade_pnl:
          result.trades.length > 0
            ? Math.round(
                (result.trades.reduce((s, t) => s + t.pnlAbsolute, 0) /
                  result.trades.length) *
                  100,
              ) / 100
            : 0,
        profit_factor: profitFactor,
        expectancy:
          result.trades.length > 0
            ? Math.round(
                (result.totalReturn / result.trades.length) * 10000,
              ) / 100
            : 0,
        candles_analyzed: candles.length,
        data_source: "binance_spot",
        interval: cfg.interval,
        equity_curve: result.equityCurve,
        trades: result.trades.slice(-100),
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
        message:
          `Backtest completed: ${candles.length} candles analyzed, ` +
          `${result.trades.length} trades executed`,
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
