import { subMonths } from "date-fns";

// Minimal logger to avoid dependency issues during implementation
const logger = {
  info: (msg: string, meta?: unknown) =>
    console.info(`[BACKTEST:INFO] ${msg}`, JSON.stringify(meta)),
  warn: (msg: string, meta?: unknown) =>
    console.warn(`[BACKTEST:WARN] ${msg}`, JSON.stringify(meta)),
  error: (msg: string, meta?: unknown) =>
    console.error(`[BACKTEST:ERROR] ${msg}`, JSON.stringify(meta)),
};

interface BacktestCandle {
  timestamp: number;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestState {
  cash: number;
  positions: Map<string, { quantity: number; avgPrice: number }>;
  portfolioValue: number;
  trades: BacktestResult["trades"];
  equityCurve: BacktestResult["equityCurve"];
  dailyPnL: number;
  consecutiveLosses: number;
}

interface StrategySignal {
  side: "BUY" | "SELL";
  orderValue: number; // Changed to required for simulation simplicity or handled in signals
  reason: string;
}

export interface BacktestInput {
  initialCapital: number; // 100000 NOK
  monthsAgo: number; // 6
  riskProfile: "conservative" | "balanced" | "aggressive";
  strategyId: string; // 'sma-crossover', 'rsi-momentum', etc.
  symbols: string[]; // ['BTCUSDT', 'ETHUSDT']
  rebalanceFrequency?: "daily" | "weekly" | "monthly";
}

export interface BacktestResult {
  // Hovedtall
  initialCapital: number;
  finalCapital: number;
  totalReturn: number; // %
  totalReturnNOK: number;

  // Performance metrics
  sharpeRatio: number;
  maxDrawdown: number; // %
  winRate: number; // %
  profitFactor: number;

  // Trading stats
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;

  // Timeline data (for chart)
  equityCurve: Array<{
    timestamp: Date;
    portfolioValue: number;
    buyHoldValue: number; // Sammenligning
    drawdown: number;
  }>;

  // Trade log
  trades: Array<{
    timestamp: Date;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    pnl: number;
    reason: string;
  }>;

  // Risk metrics
  maxPositionSize: number;
  avgPositionSize: number;
  largestLoss: number;
  consecutiveLosses: number;

  // Sammenligning
  vsHodlReturn: number; // % bedre/verre enn å bare holde BTC
}

export class BacktestEngine {
  private riskParams = {
    conservative: {
      maxPositionSizePct: 2, // 2% per trade
      stopLossPct: 3,
      takeProfitPct: 6,
      maxDailyLossPct: 1,
    },
    balanced: {
      maxPositionSizePct: 5,
      stopLossPct: 5,
      takeProfitPct: 10,
      maxDailyLossPct: 2,
    },
    aggressive: {
      maxPositionSizePct: 10,
      stopLossPct: 8,
      takeProfitPct: 16,
      maxDailyLossPct: 5,
    },
  };

  async runBacktest(input: BacktestInput): Promise<BacktestResult> {
    const startTime = Date.now();
    logger.info("backtest_started", { input });

    // 1. Hent historiske data fra Binance
    const endDate = new Date();
    const startDate = subMonths(endDate, input.monthsAgo);

    const historicalData: BacktestCandle[] = await this.fetchHistoricalData(
      input.symbols,
      startDate,
      endDate,
      "1h", // 1-time candles for accuracy
    );

    // 2. Initialiser backtest state
    const state: BacktestState = {
      cash: input.initialCapital,
      positions: new Map<string, { quantity: number; avgPrice: number }>(),
      portfolioValue: input.initialCapital,
      trades: [] as BacktestResult["trades"],
      equityCurve: [] as BacktestResult["equityCurve"],
      dailyPnL: 0,
      consecutiveLosses: 0,
    };

    // 3. Kjør backtest time-by-time
    const riskProfile = this.riskParams[input.riskProfile];
    const strategy = await this.loadStrategy(input.strategyId);

    for (let i = 0; i < historicalData.length; i++) {
      const candle = historicalData[i];

      // Generate trading signals
      const signals = await strategy.generateSignals(
        historicalData.slice(Math.max(0, i - 100), i + 1), // 100 candles lookback
      );

      for (const signal of signals) {
        // Risk check
        const riskApproved = this.checkRisk(state, signal, riskProfile);
        if (!riskApproved.allowed) continue;

        // Execute trade (simulated)
        const trade = await this.executeTrade(state, signal, candle);
        if (trade) {
          state.trades.push(trade);

          // Update daily P&L
          state.dailyPnL += trade.pnl;

          // Track consecutive losses
          if (trade.pnl < 0) {
            state.consecutiveLosses++;
          } else {
            state.consecutiveLosses = 0;
          }
        }
      }

      // Update portfolio value
      state.portfolioValue = this.calculatePortfolioValue(state, candle);

      // Record equity curve point (hver 24. time = 1 gang per dag)
      if (i % 24 === 0) {
        const buyHoldValue = this.calculateBuyHoldValue(
          input.initialCapital,
          historicalData[0],
          candle,
        );

        state.equityCurve.push({
          timestamp: new Date(candle.timestamp),
          portfolioValue: state.portfolioValue,
          buyHoldValue,
          drawdown: this.calculateDrawdown(
            state.equityCurve,
            state.portfolioValue,
          ),
        });
      }

      // Reset daily P&L hver dag
      if (i % 24 === 0) {
        state.dailyPnL = 0;
      }

      // Stop hvis daily loss limit nådd
      if (
        Math.abs(state.dailyPnL) >
        (state.portfolioValue * riskProfile.maxDailyLossPct) / 100
      ) {
        logger.warn("backtest_daily_loss_limit_hit", {
          date: candle.timestamp,
          loss: state.dailyPnL,
        });
        // Pause trading for rest av dagen
        continue;
      }
    }

    // 4. Beregn metrics
    const result = this.calculateMetrics(state, input);

    const duration = Date.now() - startTime;
    logger.info("backtest_completed", {
      duration,
      totalTrades: result.totalTrades,
      finalReturn: result.totalReturn,
    });

    return result;
  }

  private async fetchHistoricalData(
    symbols: string[],
    startDate: Date,
    endDate: Date,
    interval: string,
  ) {
    const data = [];

    for (const symbol of symbols) {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startDate.getTime()}&endTime=${endDate.getTime()}&limit=1000`;

      const response = await fetch(url);
      const klines = await response.json();

      // Parse Binance format
      if (Array.isArray(klines)) {
        for (const k of klines) {
          data.push({
            timestamp: k[0],
            symbol,
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          });
        }
      }
    }

    // Sort by timestamp
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateMetrics(
    state: BacktestState,
    input: BacktestInput,
  ): BacktestResult {
    const finalCapital = state.portfolioValue;
    const totalReturnNOK = finalCapital - input.initialCapital;
    const totalReturn = (totalReturnNOK / input.initialCapital) * 100;

    // Win rate
    const winningTrades = state.trades.filter((t) => t.pnl > 0);
    const losingTrades = state.trades.filter((t) => t.pnl < 0);
    const winRate =
      state.trades.length > 0
        ? (winningTrades.length / state.trades.length) * 100
        : 0;

    // Profit factor
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < state.equityCurve.length; i++) {
      const prev = state.equityCurve[i - 1].portfolioValue;
      const ret =
        prev > 0 ? (state.equityCurve[i].portfolioValue - prev) / prev : 0;
      returns.push(ret);
    }
    const avgReturn =
      returns.length > 0
        ? returns.reduce((a, b) => a + b, 0) / returns.length
        : 0;
    const stdDev =
      returns.length > 0
        ? Math.sqrt(
            returns.reduce(
              (sum, ret) => sum + Math.pow(ret - avgReturn, 2),
              0,
            ) / returns.length,
          )
        : 0;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualisert

    // Max drawdown
    let peak = state.equityCurve[0]?.portfolioValue || input.initialCapital;
    let maxDD = 0;
    for (const point of state.equityCurve) {
      if (point.portfolioValue > peak) peak = point.portfolioValue;
      const dd = peak > 0 ? ((peak - point.portfolioValue) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    // HODL sammenligning (buy & hold BTC)
    const hodlReturn =
      state.equityCurve.length > 0
        ? ((state.equityCurve[state.equityCurve.length - 1].buyHoldValue -
            input.initialCapital) /
            input.initialCapital) *
          100
        : 0;

    return {
      initialCapital: input.initialCapital,
      finalCapital,
      totalReturn,
      totalReturnNOK,

      sharpeRatio,
      maxDrawdown: maxDD,
      winRate,
      profitFactor,

      totalTrades: state.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,

      equityCurve: state.equityCurve,
      trades: state.trades,

      maxPositionSize:
        state.trades.length > 0
          ? Math.max(...state.trades.map((t) => t.quantity * t.price))
          : 0,
      avgPositionSize:
        state.trades.length > 0
          ? state.trades.reduce((sum, t) => sum + t.quantity * t.price, 0) /
            state.trades.length
          : 0,
      largestLoss:
        state.trades.length > 0
          ? Math.min(...state.trades.map((t) => t.pnl))
          : 0,
      consecutiveLosses:
        state.trades.length > 0
          ? Math.max(
              ...state.trades.map((_t, i) => {
                let count = 0;
                for (let j = i; j >= 0 && state.trades[j].pnl < 0; j--) count++;
                return count;
              }),
            )
          : 0,

      vsHodlReturn: totalReturn - hodlReturn,
    };
  }

  private checkRisk(
    state: BacktestState,
    signal: StrategySignal,
    riskProfile: { maxDailyLossPct: number; maxPositionSizePct: number },
  ) {
    // Daily loss check
    if (
      Math.abs(state.dailyPnL) >
      (state.portfolioValue * riskProfile.maxDailyLossPct) / 100
    ) {
      return { allowed: false, reason: "Daily loss limit exceeded" };
    }

    // Position size check
    const maxPositionValue =
      state.portfolioValue * (riskProfile.maxPositionSizePct / 100);
    if (signal.orderValue > maxPositionValue) {
      return { allowed: false, reason: "Position too large" };
    }

    // Consecutive losses check
    if (state.consecutiveLosses >= 5) {
      return {
        allowed: false,
        reason: "Too many consecutive losses - cooling off",
      };
    }

    return { allowed: true };
  }

  private executeTrade(
    state: BacktestState,
    signal: StrategySignal,
    candle: BacktestCandle,
  ) {
    const slippage = 0.0005;
    const executionPrice =
      signal.side === "BUY"
        ? candle.close * (1 + slippage)
        : candle.close * (1 - slippage);

    const commission = 0.001;

    if (signal.side === "BUY") {
      const quantity = (signal.orderValue / executionPrice) * (1 - commission);
      state.cash -= signal.orderValue;

      const existing = state.positions.get(candle.symbol);
      if (existing) {
        const totalQty = existing.quantity + quantity;
        const avgPrice =
          (existing.avgPrice * existing.quantity + executionPrice * quantity) /
          totalQty;
        state.positions.set(candle.symbol, { quantity: totalQty, avgPrice });
      } else {
        state.positions.set(candle.symbol, {
          quantity,
          avgPrice: executionPrice,
        });
      }

      return {
        timestamp: new Date(candle.timestamp),
        symbol: candle.symbol,
        side: "BUY" as const,
        quantity,
        price: executionPrice,
        pnl: 0,
        reason: signal.reason,
      };
    } else {
      // SELL
      const position = state.positions.get(candle.symbol);
      if (!position) return null;

      const proceeds = position.quantity * executionPrice * (1 - commission);
      const cost = position.quantity * position.avgPrice;
      const pnl = proceeds - cost;

      state.cash += proceeds;
      state.positions.delete(candle.symbol);

      return {
        timestamp: new Date(candle.timestamp),
        symbol: candle.symbol,
        side: "SELL" as const,
        quantity: position.quantity,
        price: executionPrice,
        pnl,
        reason: signal.reason,
      };
    }
  }

  private calculatePortfolioValue(
    state: BacktestState,
    currentCandle: BacktestCandle,
  ) {
    let total = state.cash;

    for (const [symbol, position] of state.positions) {
      if (currentCandle.symbol === symbol) {
        total += position.quantity * currentCandle.close;
      }
    }

    return total;
  }

  private calculateBuyHoldValue(
    initialCapital: number,
    firstCandle: BacktestCandle,
    currentCandle: BacktestCandle,
  ) {
    const btcQuantity = initialCapital / firstCandle.close;
    return btcQuantity * currentCandle.close;
  }

  private calculateDrawdown(
    equityCurve: BacktestResult["equityCurve"],
    currentValue: number,
  ) {
    if (equityCurve.length === 0) return 0;

    const peak = Math.max(
      ...equityCurve.map((p) => p.portfolioValue),
      currentValue,
    );
    return peak > 0 ? ((peak - currentValue) / peak) * 100 : 0;
  }

  private async loadStrategy(_strategyId: string) {
    return {
      async generateSignals(candles: BacktestCandle[]) {
        if (candles.length < 50) return [];

        const sma20 = this.calculateSMA(candles, 20);
        const sma50 = this.calculateSMA(candles, 50);

        const signals = [];

        // Golden cross (buy signal)
        if (
          sma20[sma20.length - 2] < sma50[sma50.length - 2] &&
          sma20[sma20.length - 1] > sma50[sma50.length - 1]
        ) {
          signals.push({
            side: "BUY" as const,
            orderValue: 5000,
            reason: "SMA Golden Cross",
          });
        }

        // Death cross (sell signal)
        if (
          sma20[sma20.length - 2] > sma50[sma50.length - 2] &&
          sma20[sma20.length - 1] < sma50[sma50.length - 1]
        ) {
          signals.push({
            side: "SELL" as const,
            orderValue: 0, // Sell all
            reason: "SMA Death Cross",
          });
        }

        return signals;
      },

      calculateSMA(candles: BacktestCandle[], period: number) {
        const sma = [];
        for (let i = period - 1; i < candles.length; i++) {
          const sum = candles
            .slice(i - period + 1, i + 1)
            .reduce((s, c) => s + c.close, 0);
          sma.push(sum / period);
        }
        return sma;
      },
    };
  }
}
