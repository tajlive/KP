import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED inline backtest engine.
 *
 * This edge function now delegates to the canonical Next.js backtest API
 * (`/api/backtest`) which uses the same shared strategy registry, fill model,
 * FIFO ledger and risk limits as live/paper trading. Keeping the edge function
 * as a thin proxy avoids breaking existing callers while the canonical engine
 * becomes the single source of truth.
 */

// Map legacy user_strategies.strategy_type values to the canonical /api/backtest
// strategy enum and interval. Risk profile is supplied where the canonical engine
// has matching position-size defaults.
const STRATEGY_API_MAP: Record<
  string,
  { strategy: string; interval: "1d" | "4h" | "1h"; riskProfile?: string }
> = {
  dca_trygg: { strategy: "DCA", interval: "1d" },
  trend_balansert: {
    strategy: "SMA_CROSSOVER",
    interval: "1d",
    riskProfile: "balansert",
  },
  multisignal_aktiv: { strategy: "MULTI_SIGNAL", interval: "4h" },
  grid_bot: { strategy: "GRID", interval: "1h" },
  ai_copy: { strategy: "AI_SIGNALS", interval: "1d" },
};

interface BacktestRequest {
  strategyId: string;
  days?: number;
  symbol?: string;
}

interface ApiBacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: "LONG" | "SHORT";
  size: number;
  pnl: number;
  pnlPct: number;
  fee: number;
}

interface ApiBacktestMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
}

interface ApiBacktestResult {
  trades: ApiBacktestTrade[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: ApiBacktestMetrics;
  buyHoldReturn: number;
  symbol: string;
  period: number;
  candlesAnalyzed?: number;
  monteCarlo?: unknown;
}

function normalizeSymbol(symbol?: string): string {
  return (symbol || "BTCUSDT").replace(/USDT$/i, "").toUpperCase() + "USDT";
}

function getAppUrl(req: Request): string {
  const envUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_URL");
  if (envUrl) return envUrl.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  return "https://www.klarpakke.no";
}

function computeConfidenceScore(metrics: ApiBacktestMetrics): number {
  return Math.min(
    100,
    Math.round(
      (metrics.winRate / 100) * 30 +
        (1 - Math.abs(metrics.maxDrawdownPct) / 100) * 30 +
        (metrics.sharpeRatio > 1 ? 20 : metrics.sharpeRatio > 0 ? 10 : 0) +
        (metrics.totalTrades > 20 ? 20 : metrics.totalTrades > 10 ? 10 : 5),
    ),
  );
}

function computeRecommendation(
  confidenceScore: number,
  totalReturnPct: number,
  sharpeRatio: number,
): "approve" | "review" | "reject" {
  if (confidenceScore >= 70 && totalReturnPct > 0 && sharpeRatio > 0.5) {
    return "approve";
  }
  if (confidenceScore >= 40 && totalReturnPct > -5) {
    return "review";
  }
  return "reject";
}

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
      .select("id, strategy_type, config")
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

    const strategyType = strategy.strategy_type || "trend_balansert";
    const apiParams = STRATEGY_API_MAP[strategyType] ??
      { strategy: "SMA_CROSSOVER", interval: "1d", riskProfile: "balansert" };

    // Support symbol/initialCapital overrides stored in config JSONB.
    const config = (strategy.config ?? {}) as Record<string, unknown>;
    const symbol = normalizeSymbol(
      reqSymbol || (typeof config.symbol === "string" ? config.symbol : undefined),
    );
    const initialCapital = typeof config.initialCapital === "number"
      ? config.initialCapital
      : 10_000;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 86_400_000);

    const appUrl = getAppUrl(req);

    console.log(
      `Backtest proxy: ${strategyType} -> ${apiParams.strategy} ${symbol} ${apiParams.interval} ${days}d`,
    );

    const apiResponse = await fetch(`${appUrl}/api/backtest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol,
        interval: apiParams.interval,
        strategy: apiParams.strategy,
        initialCapital,
        period: days,
        riskProfile: apiParams.riskProfile,
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error("Canonical backtest API error:", apiResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: `Backtest engine error: ${apiResponse.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiResult = (await apiResponse.json()) as ApiBacktestResult;
    const metrics = apiResult.metrics;
    const totalReturnPct = metrics.totalReturnPct;
    const finalCapital = initialCapital * (1 + totalReturnPct / 100);

    const avgTradePnl = apiResult.trades.length > 0
      ? apiResult.trades.reduce((sum, t) => sum + t.pnl, 0) / apiResult.trades.length
      : 0;

    const confidenceScore = computeConfidenceScore(metrics);
    const recommendation = computeRecommendation(
      confidenceScore,
      totalReturnPct,
      metrics.sharpeRatio,
    );

    const candlesAnalyzed = apiResult.candlesAnalyzed ??
      apiResult.equityCurve.length;

    const backtestData = {
      user_id: user.id,
      strategy_id: strategyId,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      initial_capital: initialCapital,
      symbols: [symbol],
      result: {
        final_capital: Math.round(finalCapital * 100) / 100,
        total_return: Math.round(totalReturnPct * 100) / 100,
        win_rate: Math.round(metrics.winRate * 100) / 100,
        max_drawdown: Math.round(Math.abs(metrics.maxDrawdownPct) * 100) / 100,
        sharpe_ratio: Math.round(metrics.sharpeRatio * 100) / 100,
        trades_count: metrics.totalTrades,
        trades_per_month: Math.round(metrics.totalTrades / Math.max(1, days / 30)),
        avg_trade_pnl: Math.round(avgTradePnl * 100) / 100,
        profit_factor: Math.round(metrics.profitFactor * 100) / 100,
        expectancy:
          metrics.totalTrades > 0
            ? Math.round((totalReturnPct / metrics.totalTrades) * 100) / 100
            : 0,
        candles_analyzed: candlesAnalyzed,
        data_source: "binance_spot",
        interval: apiParams.interval,
        equity_curve: apiResult.equityCurve.map((p) => ({
          time: p.timestamp,
          equity: Math.round(p.equity * 100) / 100,
        })),
        trades: apiResult.trades.slice(-100).map((t) => ({
          entryTime: t.entryTime,
          entryPrice: t.entryPrice,
          exitTime: t.exitTime,
          exitPrice: t.exitPrice,
          pnlPercent: Math.round(t.pnlPct * 100) / 100,
          pnlAbsolute: Math.round(t.pnl * 100) / 100,
          exitReason: "signal" as const,
        })),
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
          `Backtest completed: ${candlesAnalyzed} candles analyzed, ` +
          `${metrics.totalTrades} trades executed`,
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
