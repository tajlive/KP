/**
 * Next-gen Auto Trader — uses SmartTrader engine
 * Replaces the naive signal-following auto-trader with hedge fund-grade logic.
 */

import { 
  type AutoTradingConfig,
  getActiveAutoTraders,
  getRecentTradingSignals,
  logAutoTrade 
} from '@/lib/supabase/auto-trading';
import { executePaperTrade } from '@/lib/supabase/paper-trading';
import {
  rankCoins,
  checkAdverseSelection,
  type CoinRank,
  type Position,
  SMART_TRADER_VERSION,
} from '@/lib/trading/smart-trader';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Supa = SupabaseClient<Database>;

// Track coins: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK, MATIC
const TRACKED_COINS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT",
];

interface TradingResult {
  userId: string;
  trades: number;
  buys: number;
  sells: number;
  skipped: number;
}

export class NextGenAutoTrader {
  constructor(
    private config: AutoTradingConfig,
    private supabase: Supa,
  ) {}

  async getUserPositions(): Promise<Position[]> {
    const { data: trades } = await this.supabase
      .from("trades")
      .select("trading_pair, side, price, quantity, status, executed_at")
      .eq("user_id", this.config.user_id)
      .eq("status", "filled")
      .order("executed_at", { ascending: false })
      .limit(100);

    if (!trades) return [];

    // Group by symbol to get net position
    const positions = new Map<string, { totalQty: number; totalCost: number; firstBuy: string }>();
    
    for (const t of trades) {
      const sym = t.trading_pair;
      const qty = t.quantity || 0;
      const cost = (t.price || 0) * qty;
      const existing = positions.get(sym) || { totalQty: 0, totalCost: 0, firstBuy: t.executed_at! };
      
      if (t.side === "buy") {
        existing.totalQty += qty;
        existing.totalCost += cost;
      } else {
        existing.totalQty -= qty;
        existing.totalCost -= cost;
      }
      positions.set(sym, existing);
    }

    // Only return positions with positive quantity
    return Array.from(positions.entries())
      .filter(([_, p]) => p.totalQty > 0.00001)
      .map(([sym, p]) => ({
        symbol: sym,
        entryPrice: p.totalQty > 0 ? p.totalCost / p.totalQty : 0,
        quantity: p.totalQty,
        currentPrice: p.totalQty > 0 ? p.totalCost / p.totalQty : 0, // Will be updated with live prices
        pnlPercent: 0,
        ageHours: (Date.now() - new Date(p.firstBuy).getTime()) / 3600000,
      }));
  }

  async fetchCandles(symbols: string[]): Promise<Record<string, { closes: number[]; highs: number[]; lows: number[] }>> {
    const result: Record<string, { closes: number[]; highs: number[]; lows: number[] }> = {};

    for (const symbol of symbols) {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`
        );
        const klines = await res.json();
        if (!Array.isArray(klines)) continue;

        const closes: number[] = [];
        const highs: number[] = [];
        const lows: number[] = [];

        for (const k of klines) {
          closes.push(parseFloat(k[4]));  // close
          highs.push(parseFloat(k[2]));   // high
          lows.push(parseFloat(k[3]));    // low
        }

        result[symbol] = { closes, highs, lows };
      } catch (err) {
        console.warn(`[NextGenTrader] Failed to fetch ${symbol}:`, err);
      }
    }

    return result;
  }

  async executeTrade(rank: CoinRank, capital: number): Promise<boolean> {
    try {
      // Adverse selection check
      const { safe, reason } = await checkAdverseSelection(
        rank.symbol, rank.action as "BUY" | "SELL", rank.entryPrice
      );
      if (!safe) {
        console.log(`[NextGenTrader] Skipping ${rank.symbol}: ${reason}`);
        return false;
      }

      // Calculate quantity
      const quantity = rank.action === "BUY"
        ? capital / rank.entryPrice
        : Math.abs(capital / rank.entryPrice); // For sells, use existing position

      const { data: trade, error } = await this.supabase
        .from("trades")
        .insert({
          user_id: this.config.user_id,
          trading_pair: rank.symbol,
          side: rank.action.toLowerCase(),
          price: rank.entryPrice,
          quantity,
          total_value: capital,
          mode: "paper",
          order_type: "market",
          status: "filled",
          executed_at: new Date().toISOString(),
          metadata: {
            trader_version: SMART_TRADER_VERSION,
            regime: rank.regime,
            score: rank.score,
            rr_ratio: rank.rrRatio,
            stop_loss: rank.stopLoss,
            take_profit: rank.takeProfit,
            reason: rank.reason,
          },
        })
        .select("id")
        .single();

      if (error) {
        console.error("[NextGenTrader] Trade insert error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("[NextGenTrader] Execute error:", err);
      return false;
    }
  }

  async run(): Promise<TradingResult> {
    const result: TradingResult = {
      userId: this.config.user_id,
      trades: 0,
      buys: 0,
      sells: 0,
      skipped: 0,
    };

    try {
      // 1. Get existing positions
      const positions = await this.getUserPositions();
      const existingSymbols = new Set(positions.map(p => p.symbol));

      // 2. Determine capital
      const maxPositions = 5; // Maximum concurrent positions
      const availableSlots = maxPositions - positions.length;
      if (availableSlots <= 0) {
        console.log(`[NextGenTrader] ${this.config.user_id}: max positions (${maxPositions}) reached`);
        return result;
      }

      // Get portfolio value
      const { data: portfolio } = await this.supabase
        .from("paper_accounts")
        .select("current_balance")
        .eq("user_id", this.config.user_id)
        .single();

      const capital = portfolio?.current_balance || 100000;
      const perTradeCapital = Math.min(capital * 0.02, capital / maxPositions);

      // 3. Fetch candles for tracked coins
      const candles = await this.fetchCandles(TRACKED_COINS);

      // 4. Rank all coins
      const ranks = await rankCoins(TRACKED_COINS, positions, capital, candles);

      // 5. Execute top-ranked trades
      let tradesThisCycle = 0;
      for (const rank of ranks) {
        if (tradesThisCycle >= availableSlots) break;
        if (rank.score < 4.0) break; // Minimum quality threshold
        
        // Skip if buying a coin we already hold
        if (rank.action === "BUY" && existingSymbols.has(rank.symbol)) {
          result.skipped++;
          continue;
        }

        // Check for sell opportunities on existing positions
        if (rank.action === "SELL" && !existingSymbols.has(rank.symbol)) {
          result.skipped++;
          continue;
        }

        const success = await this.executeTrade(rank, perTradeCapital);
        if (success) {
          result.trades++;
          if (rank.action === "BUY") result.buys++;
          else result.sells++;
          tradesThisCycle++;
        }
      }
    } catch (err) {
      console.error("[NextGenTrader] Cycle error:", err);
    }

    return result;
  }
}

/**
 * Run next-gen auto trading for all active users
 */
export async function runNextGenAutoTrading(
  supabase: Supa,
): Promise<TradingResult[]> {
  const results: TradingResult[] = [];
  const activeTraders = await getActiveAutoTraders();

  if (activeTraders.length === 0) return results;

  for (const config of activeTraders) {
    const trader = new NextGenAutoTrader(config, supabase);
    const result = await trader.run();
    results.push(result);
    console.log(`[NextGenTrader] ${result.userId}: ${result.buys}B/${result.sells}S (${result.skipped} skipped)`);
  }

  return results;
}
