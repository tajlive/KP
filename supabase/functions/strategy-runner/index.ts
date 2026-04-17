import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { evaluatePositionExits } from "../_shared/risk-engine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Strategy {
  id: string;
  user_id: string;
  strategy_type: string;
  mode: "paper" | "live";
  config: Record<string, any>;
}

interface Portfolio {
  id: string;
  user_id: string;
  mode: "paper" | "live";
  cash_balance: number;
  invested_value: number;
}

// Get BTC price from Binance
async function getBTCPrice(): Promise<number> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
  );
  const data = await res.json();
  return parseFloat(data.price);
}

/**
 * Fetch current market regime from cache or default.
 */
async function getCurrentRegime(): Promise<MarketRegime> {
  const { data } = await supabase
    .from('regime_cache' as any)
    .select('regime')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return (data?.regime as MarketRegime) || 'unclear';
}

/**
 * Smart Yield Automation (Phase 3)
 * Moves idle cash to yield_balance during dangerous regimes.
 */
async function runSmartYieldAutomation(portfolio: Portfolio, regime: MarketRegime) {
  if (regime !== 'bear' && regime !== 'high-vol') return;
  
  // If cash > 1000 NOK, move 50% to yield to earn "simulated" interest
  if (portfolio.cash_balance > 1000) {
    const moveAmount = portfolio.cash_balance * 0.5;
    
    const { error } = await supabase
      .from('user_portfolios')
      .update({
        cash_balance: portfolio.cash_balance - moveAmount,
        yield_balance: (portfolio as any).yield_balance + moveAmount,
        last_yield_move: new Date().toISOString()
      } as any)
      .eq('id', portfolio.id);
      
    if (!error) {
      await supabase.from('bot_health').insert({
        event_type: 'YIELD_MOVE',
        user_id: portfolio.user_id,
        message: `Automatisk flytt av ${moveAmount.toFixed(0)} NOK til Smart Yield pga ${regime}-regime.`,
        details: { amount: moveAmount, regime }
      });
      console.log(`[strategy-runner] Smart Yield: Moved ${moveAmount} for user ${portfolio.user_id}`);
    }
  }
}

/**
 * Fetch historical performance for Kelly calculation.
 */
async function getKellyStats(userId: string, strategyId: string): Promise<KellyStats> {
  const { data } = await supabase
    .from('strategy_performance' as any)
    .select('win_rate, avg_win_pct, avg_loss_pct')
    .eq('user_id', userId)
    .eq('strategy_id', strategyId)
    .maybeSingle();
  
  if (!data) {
    return { winrate: 0.52, avgWin: 2.5, avgLoss: 1.5, sampleSize: 0 };
  }
  
  return {
    winrate: Number(data.win_rate),
    avgWin: Number(data.avg_win_pct),
    avgLoss: Number(data.avg_loss_pct),
    sampleSize: 0 // Not needed for calculation
  };
}

// Get NOK/USD rate (simplified - in production use a real forex API)
async function getNOKRate(): Promise<number> {
  return 10.7; // Approximate rate
}

// Execute trade
async function executeTrade(
  strategy: Strategy,
  portfolio: Portfolio,
  price: number,
  nokRate: number,
  side: "buy" | "sell",
  reason: string,
) {
  const config = strategy.config;
  let amountNOK = 0;
  let amountBTC = 0;

  // Initialize Position Sizing
  const regime = await getCurrentRegime();
  const stats = await getKellyStats(strategy.user_id, strategy.id);
  const kellyFraction = calculateKelly(stats, strategy.config.riskProfile || 'balanced', regime);

  console.log(`[strategy-runner] Regime: ${regime}, Kelly Fraction: ${(kellyFraction * 100).toFixed(2)}%`);

  switch (strategy.strategy_type) {
    case "dca_trygg":
      amountNOK = config.weeklyAmount || 1000;
      break;
    case "trend_balansert":
      // Use Dynamic Kelly Sizing
      amountNOK = portfolio.cash_balance * kellyFraction;
      // Safety clamp: Ensure minimum trade size
      if (amountNOK < 500 && portfolio.cash_balance > 500) amountNOK = 500;
      break;
    case "grid_bot":
      amountNOK = (config.capital || 5000) / (config.levels || 10);
      break;
    default:
      amountNOK = portfolio.cash_balance * kellyFraction;
  }

  // Ensure we don't exceed cash balance
  if (side === "buy" && amountNOK > portfolio.cash_balance) {
    amountNOK = portfolio.cash_balance * 0.95;
  }

  amountBTC = amountNOK / nokRate / price;

  // Create trade
  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      user_id: strategy.user_id,
      strategy_id: strategy.id,
      mode: strategy.mode,
      symbol: "BTCUSDT",
      side,
      amount: amountBTC,
      amount_nok: amountNOK,
      entry_price: price,
      strategy_type: strategy.strategy_type,
      signal_reason: reason,
      status: "open",
    })
    .select()
    .single();

  if (tradeError) throw tradeError;

  // Update portfolio atomically via RPC
  const { error: portfolioError } = await supabase.rpc(
    "update_portfolio_after_trade",
    {
      p_user_id: strategy.user_id,
      p_mode: strategy.mode,
      p_amount_nok: amountNOK,
      p_side: side,
    },
  );

  if (portfolioError) throw portfolioError;

  // Update strategy trade count
  await supabase.rpc("increment_strategy_trades", { strategy_id: strategy.id });

  return trade;
}

// DCA Strategy Logic
async function runDCA(
  strategy: Strategy,
  portfolio: Portfolio,
  price: number,
  nokRate: number,
) {
  const lastTrade = await supabase
    .from("trades")
    .select("created_at")
    .eq("strategy_id", strategy.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const lastTradeTime = lastTrade.data?.created_at;
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Buy if no trade in last 7 days
  if (!lastTradeTime || lastTradeTime < oneWeekAgo) {
    const dipMultiplier = price < 40000 ? 2 : 1; // Double on big dips
    const modifiedConfig = {
      ...strategy.config,
      weeklyAmount: strategy.config.weeklyAmount * dipMultiplier,
    };

    return await executeTrade(
      { ...strategy, config: modifiedConfig },
      portfolio,
      price,
      nokRate,
      "buy",
      dipMultiplier > 1 ? "DCA weekly + dip bonus" : "DCA weekly purchase",
    );
  }
  return null;
}

// Trend Strategy Logic
async function runTrend(
  strategy: Strategy,
  portfolio: Portfolio,
  price: number,
  nokRate: number,
) {
  // Simple trend following using price history
  const { data: prices } = await supabase
    .from("price_history")
    .select("price")
    .eq("symbol", "BTCUSDT")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (!prices || prices.length < 50) return null;

  const prices50 = prices.map((p) => p.price);
  const prices200 = prices.slice(0, 200).map((p) => p.price);

  const ma50 = prices50.reduce((a, b) => a + b, 0) / prices50.length;
  const ma200 =
    prices200.length >= 200
      ? prices200.reduce((a, b) => a + b, 0) / prices200.length
      : ma50;

  // Golden cross: MA50 > MA200
  if (ma50 > ma200 && price > ma50) {
    // Check if we already have a position
    const openTrades = await supabase
      .from("trades")
      .select("id")
      .eq("strategy_id", strategy.id)
      .eq("status", "open")
      .eq("side", "buy");

    if (!openTrades.data?.length) {
      // REGIME SAFETY GATE (Phase 2)
      const regime = await getCurrentRegime();
      if (regime === 'bear' || regime === 'high-vol') {
        console.log(`[strategy-runner] Trend SKIP: Blocking buy entry due to ${regime} regime`);
        return null;
      }

      return await executeTrade(
        strategy,
        portfolio,
        price,
        nokRate,
        "buy",
        "Trend: MA50 > MA200 golden cross",
      );
    }
  }

  // Death cross: Sell signal
  if (ma50 < ma200) {
    const openTrades = await supabase
      .from("trades")
      .select("*")
      .eq("strategy_id", strategy.id)
      .eq("status", "open")
      .eq("side", "buy");

    for (const trade of openTrades.data || []) {
      const pnlPct = ((price - trade.entry_price) / trade.entry_price) * 100;
      const strategySignal = trade.strategy_signal as any || {};

      // Check centralized risk engine (ATR levels + Trailing Stop)
      const { shouldExit, reason } = evaluatePositionExits({
        side: 'long', 
        entryPrice: trade.entry_price,
        currentPrice: price,
        stopLoss: strategySignal.stop_loss || strategy.config.stopLoss || 10,
        takeProfit: strategySignal.take_profit || strategy.config.takeProfit || 20,
        trailingStop: strategySignal.trailing_stop || null,
        highestPrice: trade.metadata?.highest_price || trade.entry_price,
        lowestPrice: trade.metadata?.lowest_price || trade.entry_price,
      });

      if (shouldExit || ma50 < ma200) {
        await closeTrade(trade, price, nokRate, pnlPct, shouldExit ? reason : "Trend: Death cross");
      }
    }
  }
  return null;
}

// Close a trade
async function closeTrade(
  trade: any,
  exitPrice: number,
  nokRate: number,
  pnlPct: number,
  exitReason: string = "Signal Exit"
) {
  const pnl = trade.amount_nok * (pnlPct / 100);

  await supabase
    .from("trades")
    .update({
      status: "closed",
      exit_price: exitPrice,
      pnl,
      pnl_pct: pnlPct,
      closed_at: new Date().toISOString(),
      exit_reason: exitReason
    })
    .eq("id", trade.id);

  // Update strategy P&L
  await supabase.rpc("update_strategy_pnl", {
    strategy_id: trade.strategy_id,
    pnl,
  });
}

// Grid Bot Logic
async function runGridBot(
  strategy: Strategy,
  portfolio: Portfolio,
  price: number,
  nokRate: number,
) {
  const config = strategy.config;
  const levels = config.levels || 10;
  const lowerPrice = config.lowerPrice || 50000;
  const upperPrice = config.upperPrice || 70000;
  const step = (upperPrice - lowerPrice) / levels;

  // Find nearest grid levels
  const gridLevels = Array.from(
    { length: levels + 1 },
    (_, i) => lowerPrice + step * i,
  );

  // Get open grid trades
  const { data: openTrades } = await supabase
    .from("trades")
    .select("*")
    .eq("strategy_id", strategy.id)
    .eq("status", "open");

  const buyTrades = openTrades?.filter((t) => t.side === "buy") || [];
  const sellTrades = openTrades?.filter((t) => t.side === "sell") || [];

  // Check for buy triggers
  for (let i = 0; i < gridLevels.length - 1; i++) {
    const level = gridLevels[i];
    const nextLevel = gridLevels[i + 1];

    // If price dropped into this level and we don't have a buy here
    if (price >= level && price < nextLevel) {
      const hasBuyHere = buyTrades.some(
        (t) => Math.abs(t.entry_price * nokRate - level * nokRate) < 100,
      );

      if (!hasBuyHere && portfolio.cash_balance > 1000) {
        return await executeTrade(
          strategy,
          portfolio,
          price,
          nokRate,
          "buy",
          `Grid level ${i + 1}/${levels}`,
        );
      }
    }
  }

  // Check for sell triggers
  for (const trade of buyTrades) {
    const profitTarget = trade.entry_price * 1.02; // 2% profit
    if (price >= profitTarget) {
      const pnlPct = ((price - trade.entry_price) / trade.entry_price) * 100;
      await closeTrade(trade, price, nokRate, pnlPct);

      // Create sell trade record
      await executeTrade(
        strategy,
        portfolio,
        price,
        nokRate,
        "sell",
        `Grid profit @ ${pnlPct.toFixed(1)}%`,
      );
    }
  }

  return null;
}

// Multi-Signal Strategy
async function runMultiSignal(
  strategy: Strategy,
  portfolio: Portfolio,
  price: number,
  nokRate: number,
) {
  // Simplified: use RSI + MACD signals
  // In production, calculate real indicators
  const { data: prices } = await supabase
    .from("price_history")
    .select("price")
    .eq("symbol", "BTCUSDT")
    .order("timestamp", { ascending: false })
    .limit(14);

  if (!prices || prices.length < 14) return null;

  const priceArray = prices.map((p) => p.price);
  const rsi = calculateRSI(priceArray);
  const aggressiveness = strategy.config.aggressiveness || "normal";

  // RSI oversold + uptrend = buy
  const rsiThreshold =
    aggressiveness === "aggressiv"
      ? 40
      : aggressiveness === "forsiktig"
        ? 25
        : 30;

  if (rsi < rsiThreshold) {
    const openTrades = await supabase
      .from("trades")
      .select("id")
      .eq("strategy_id", strategy.id)
      .eq("status", "open");

    if (!openTrades.data?.length) {
      return await executeTrade(
        strategy,
        portfolio,
        price,
        nokRate,
        "buy",
        `RSI ${rsi.toFixed(0)} oversold`,
      );
    }
  }

  // RSI overbought = sell
  if (rsi > 70) {
    const openTrades = await supabase
      .from("trades")
      .select("*")
      .eq("strategy_id", strategy.id)
      .eq("status", "open")
      .eq("side", "buy");

    for (const trade of openTrades.data || []) {
      const pnlPct = ((price - trade.entry_price) / trade.entry_price) * 100;
      if (pnlPct > 2) {
        // Take profit
        await closeTrade(trade, price, nokRate, pnlPct);
      }
    }
  }

  return null;
}

// Simple RSI calculation
function calculateRSI(prices: number[]): number {
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Main handler
serve(async (req) => {
  const startTime = Date.now();

  try {
    // Get all active strategies
    const { data: strategies, error: stratError } = await supabase
      .from("user_strategies")
      .select("*")
      .eq("is_active", true);

    if (stratError) throw stratError;
    if (!strategies?.length) {
      return new Response(JSON.stringify({ message: "No active strategies" }), {
        status: 200,
      });
    }

    // Get current prices and regime (once per run)
    const [btcPrice, nokRate, currentRegime] = await Promise.all([
      getBTCPrice(),
      getNOKRate(),
      getCurrentRegime(),
    ]);

    // Execute each strategy
    const results = [];
    for (const strategy of strategies) {
      try {
        // Get portfolio
        const { data: portfolio } = await supabase
          .from("user_portfolios")
          .select("*")
          .eq("user_id", strategy.user_id)
          .eq("mode", strategy.mode)
          .single();

        if (!portfolio) continue;

        // Smart Yield Check (Phase 3)
        await runSmartYieldAutomation(portfolio, currentRegime);

        let trade = null;
        switch (strategy.strategy_type) {
          case "dca_trygg":
            trade = await runDCA(strategy, portfolio, btcPrice, nokRate);
            break;
          case "trend_balansert":
            // Pass the already fetched regime to avoid double-fetching inside executeTrade
            trade = await runTrend(strategy, portfolio, btcPrice, nokRate);
            break;
          case "grid_bot":
            trade = await runGridBot(strategy, portfolio, btcPrice, nokRate);
            break;
          case "multisignal_aktiv":
            trade = await runMultiSignal(
              strategy,
              portfolio,
              btcPrice,
              nokRate,
            );
            break;
          case "ai_copy":
            // AI Copy strategy requires Binance Leaderboard data
            // For now, skip or use simplified logic
            break;
        }

        if (trade) {
          results.push({
            strategy: strategy.strategy_type,
            user_id: strategy.user_id,
            trade_id: trade.id,
          });
        }
      } catch (err) {
        console.error(`Strategy error for ${strategy.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: strategies.length,
        trades: results.length,
        results,
        duration_ms: Date.now() - startTime,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Strategy runner error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
