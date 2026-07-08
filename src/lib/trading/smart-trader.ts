/**
 * Klarpakke Smart Auto-Trader v2.0
 * 
 * Hedge fund-grade trading engine for retail users.
 * 
 * Features:
 * - Market regime detection (trending / mean-reverting / volatile)
 * - Ensemble signal voting (trend + momentum + mean-reversion + volatility)
 * - Dynamic Kelly position sizing
 * - ATR-based stop-loss
 * - Anti-correlation filter
 * - Adverse selection protection
 * 
 * Usage: Called from /api/cron/tick every 5 minutes
 */

export type MarketRegime = "trending_up" | "trending_down" | "ranging" | "volatile";

export interface TradeSignal {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;       // 0-1
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  regime: MarketRegime;
}

export interface Position {
  symbol: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  pnlPercent: number;
  ageHours: number;
}

interface KellyResult {
  fraction: number;  // 0-1, portion of capital to risk
  sizeNok: number;   // absolute NOK amount
}

// ═══════════════════════════════════════════════════════════════
// 1. MARKET REGIME DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectMarketRegime(prices: number[]): MarketRegime {
  const n = prices.length;
  if (n < 20) return "ranging";

  // Calculate 20-period returns
  const returns: number[] = [];
  for (let i = 1; i < n; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  // Trend: linear regression slope over last 20 periods
  const recent20 = prices.slice(-20);
  const xMean = 9.5; // mean of 0..19
  const yMean = recent20.reduce((a, b) => a + b, 0) / 20;
  let num = 0, den = 0;
  for (let i = 0; i < 20; i++) {
    num += (i - xMean) * (recent20[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = num / den;
  const slopePercent = (slope / yMean) * 100;

  // Volatility: standard deviation of returns
  const recentReturns = returns.slice(-20);
  const meanReturn = recentReturns.reduce((a, b) => a + b, 0) / 20;
  const variance = recentReturns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / 20;
  const volatility = Math.sqrt(variance);

  // ADX-like: ratio of directional movement
  let upMoves = 0, downMoves = 0;
  for (const r of recentReturns) {
    if (r > 0) upMoves += r;
    else downMoves += Math.abs(r);
  }
  const trendStrength = Math.abs(upMoves - downMoves) / (upMoves + downMoves + 0.0001);

  if (volatility > 0.04) return "volatile";           // >4% daily vol
  if (trendStrength > 0.3 && slopePercent > 0.5) return "trending_up";
  if (trendStrength > 0.3 && slopePercent < -0.5) return "trending_down";
  return "ranging";
}

// ═══════════════════════════════════════════════════════════════
// 2. ENSEMBLE SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════

export interface ModelScore {
  model: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reason: string;
}

export function ensembleVote(scores: ModelScore[]): TradeSignal["action"] {
  let buyWeight = 0, sellWeight = 0;

  for (const s of scores) {
    if (s.signal === "BUY") buyWeight += s.confidence;
    if (s.signal === "SELL") sellWeight += s.confidence;
  }

  const total = buyWeight + sellWeight;
  if (total < 1.5) return "HOLD";  // Not enough conviction

  if (buyWeight > sellWeight * 1.3) return "BUY";   // 30% more buy conviction
  if (sellWeight > buyWeight * 1.3) return "SELL";
  return "HOLD";
}

/**
 * Generate ensemble signal from 4 models:
 * - Trend: SMA50/SMA200 golden/death cross
 * - Momentum: MACD + RSI
 * - Mean-reversion: Bollinger Bands
 * - Volatility: ADX + ATR
 */
export function generateEnsembleSignals(
  closes: number[],
  highs: number[],
  lows: number[],
  regime: MarketRegime,
): ModelScore[] {
  const scores: ModelScore[] = [];
  const n = closes.length;
  const price = closes[n - 1];

  // ── SMA ──
  const sma = (data: number[], period: number): number[] => {
    return data.map((_, i) => {
      if (i < period - 1) return NaN;
      return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    });
  };

  // ── RSI ──
  const rsi = (data: number[], period = 14): number => {
    if (data.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  };

  // ── MACD ──
  const ema12 = sma(closes, 12);
  const ema26 = sma(closes, 26);
  const macdLine = ema12[n - 1] - ema26[n - 1];
  const signalLine = ema12.slice(-9).reduce((a, b) => a + b, 0) / 9 - 
                     ema26.slice(-9).reduce((a, b) => a + b, 0) / 9;

  // ── Bollinger Bands ──
  const sma20 = sma(closes, 20);
  const ma20 = sma20[n - 1];
  const std20 = Math.sqrt(
    closes.slice(-20).reduce((sum, c) => sum + (c - ma20) ** 2, 0) / 20
  );
  const bbLower = ma20 - 2 * std20;
  const bbUpper = ma20 + 2 * std20;

  // ── ATR ──
  let atr = 0;
  for (let i = n - 14; i < n; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atr += tr;
  }
  atr /= 14;

  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsiVal = rsi(closes);
  const ma50 = sma50[n - 1];
  const ma200 = sma200[n - 1];

  // 1. Trend Model (weight: 1.0)
  const goldenCross = ma50 > ma200 && sma50[n - 2] <= sma200[n - 2];
  const deathCross = ma50 < ma200 && sma50[n - 2] >= sma200[n - 2];
  const aboveMA50 = price > ma50;
  const trendStrength = Math.abs(ma50 - ma200) / ma200;

  if (goldenCross) {
    scores.push({ model: "trend", signal: "BUY", confidence: 0.85, reason: "Golden Cross" });
  } else if (deathCross) {
    scores.push({ model: "trend", signal: "SELL", confidence: 0.80, reason: "Death Cross" });
  } else if (aboveMA50 && trendStrength > 0.02) {
    scores.push({ model: "trend", signal: "BUY", confidence: 0.55, reason: "Over MA50" });
  } else {
    scores.push({ model: "trend", signal: "HOLD", confidence: 0.3, reason: "No trend signal" });
  }

  // 2. Momentum Model (weight: 0.8)
  const macdBuy = macdLine > signalLine && macdLine > 0;
  const macdSell = macdLine < signalLine && macdLine < 0;
  const rsiOversold = rsiVal < 35;
  const rsiOverbought = rsiVal > 70;
  const momentumUp = closes[n - 1] > closes[n - 5];

  let momentumConf = 0;
  let momentumSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  if (macdBuy && rsiVal < 60 && momentumUp) {
    momentumSignal = "BUY";
    momentumConf = 0.7;
  } else if (macdSell && rsiVal > 40) {
    momentumSignal = "SELL";
    momentumConf = 0.65;
  } else if (rsiOversold) {
    momentumSignal = "BUY";
    momentumConf = 0.55;
  } else if (rsiOverbought) {
    momentumSignal = "SELL";
    momentumConf = 0.55;
  }
  scores.push({ model: "momentum", signal: momentumSignal, confidence: momentumConf, 
    reason: `MACD=${macdLine.toFixed(1)} RSI=${rsiVal.toFixed(0)}` });

  // 3. Mean-Reversion Model (weight: 0.7)
  const nearLowerBand = price <= bbLower * 1.02;
  const nearUpperBand = price >= bbUpper * 0.98;
  
  if (nearLowerBand && rsiVal < 50) {
    scores.push({ model: "mean-rev", signal: "BUY", confidence: 0.75, 
      reason: `Nær nedre BB (${bbLower.toFixed(0)})` });
  } else if (nearUpperBand && rsiVal > 50) {
    scores.push({ model: "mean-rev", signal: "SELL", confidence: 0.70, 
      reason: `Nær øvre BB (${bbUpper.toFixed(0)})` });
  } else {
    // Price relative to MA20
    const distFromMA = (price - ma20) / ma20;
    if (distFromMA < -0.03) {
      scores.push({ model: "mean-rev", signal: "BUY", confidence: 0.5, 
        reason: `${(distFromMA*100).toFixed(1)}% under MA20` });
    } else if (distFromMA > 0.05) {
      scores.push({ model: "mean-rev", signal: "SELL", confidence: 0.5, 
        reason: `${(distFromMA*100).toFixed(1)}% over MA20` });
    } else {
      scores.push({ model: "mean-rev", signal: "HOLD", confidence: 0.2, reason: "Innenfor bands" });
    }
  }

  // 4. Volatility Model (weight: 0.6)
  const atrPct = atr / price;
  const volModerate = atrPct > 0.01 && atrPct < 0.04;
  
  if (regime === "volatile") {
    scores.push({ model: "volatility", signal: "HOLD", confidence: 0.8, 
      reason: `ATR=${(atrPct*100).toFixed(1)}% — for volatilt` });
  } else if (regime === "trending_up" && volModerate) {
    scores.push({ model: "volatility", signal: "BUY", confidence: 0.6, 
      reason: "Trend + moderat volatilitet" });
  } else if (regime === "trending_down") {
    scores.push({ model: "volatility", signal: "SELL", confidence: 0.6, 
      reason: "Nedtrend" });
  } else {
    scores.push({ model: "volatility", signal: "HOLD", confidence: 0.3, reason: "Nøytral" });
  }

  return scores;
}

// ═══════════════════════════════════════════════════════════════
// 3. DYNAMIC POSITION SIZING (KELLY CRITERION)
// ═══════════════════════════════════════════════════════════════

/**
 * Kelly Criterion: f* = (bp - q) / b
 * 
 * b = win/loss ratio (avg win / avg loss)
 * p = win probability (from historical performance or signal confidence)
 * q = 1 - p
 * 
 * We use HALF-KELLY (fractional Kelly) for safety: f = f* / 2
 */
export function kellyPositionSize(
  capital: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  winProbability: number,
  maxRiskPercent = 0.02,   // Max 2% risk per trade (professional standard)
): KellyResult {
  // Risk/reward ratio
  const risk = (entryPrice - stopLoss) / entryPrice;    // % loss if stopped
  const reward = (takeProfit - entryPrice) / entryPrice; // % gain if target hit
  const b = reward / (risk + 0.0001);  // Win/loss ratio

  const p = Math.max(0.4, Math.min(0.8, winProbability)); // Clamp 0.4-0.8
  const q = 1 - p;

  // Full Kelly
  let kellyFraction = (b * p - q) / b;
  
  // Half-Kelly (conservative)
  kellyFraction = Math.max(0, Math.min(maxRiskPercent, kellyFraction / 2));

  // Convert to NOK
  const sizeNok = capital * kellyFraction;
  const roundedSize = Math.round(sizeNok / 100) * 100; // Round to nearest 100 kr
  const finalNok = Math.max(100, Math.min(capital * maxRiskPercent * 2, roundedSize));

  return { fraction: kellyFraction, sizeNok: finalNok };
}

// ═══════════════════════════════════════════════════════════════
// 4. ATR-BASED STOP-LOSS
// ═══════════════════════════════════════════════════════════════

export function atrStopLoss(
  entryPrice: number,
  atr: number,
  direction: "BUY" | "SELL",
  multiplier = 2.0,     // 2x ATR = standard
): { stopLoss: number; takeProfit: number } {
  const atrPct = atr / entryPrice;
  const minSl = 0.02;   // Minimum 2% stop-loss
  const maxSl = 0.10;   // Maximum 10% stop-loss
  
  let slPct = Math.max(minSl, Math.min(maxSl, atrPct * multiplier));
  
  if (direction === "BUY") {
    return {
      stopLoss: entryPrice * (1 - slPct),
      takeProfit: entryPrice * (1 + slPct * 2), // R:R 1:2
    };
  } else {
    return {
      stopLoss: entryPrice * (1 + slPct),
      takeProfit: entryPrice * (1 - slPct * 2),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. ANTI-CORRELATION FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Simple correlation check. If user already has positions in highly
 * correlated coins, reduce or skip new buy in same cluster.
 */
const CORRELATION_CLUSTERS: Record<string, string[]> = {
  "BTCUSDT": ["ETHUSDT", "BNBUSDT"],
  "ETHUSDT": ["BTCUSDT"],
  "SOLUSDT": [],
  "BNBUSDT": ["BTCUSDT"],
  "XRPUSDT": [],
  "ADAUSDT": ["SOLUSDT"],
  "DOGEUSDT": [],
};

export function correlationCheck(
  newSymbol: string,
  existingPositions: Position[],
): { allowed: boolean; reduceSize: number } {
  const cluster = CORRELATION_CLUSTERS[newSymbol] || [];
  const correlated = existingPositions.filter(
    (p) => cluster.includes(p.symbol) && p.pnlPercent < 5
  );

  if (correlated.length >= 2) {
    return { allowed: false, reduceSize: 0 }; // Too concentrated
  }
  if (correlated.length === 1) {
    return { allowed: true, reduceSize: 0.5 }; // Reduce size by 50%
  }
  return { allowed: true, reduceSize: 1.0 };
}

// ═══════════════════════════════════════════════════════════════
// 6. ADVERSE SELECTION PROTECTION
// ═══════════════════════════════════════════════════════════════

export async function checkAdverseSelection(
  symbol: string,
  side: "BUY" | "SELL",
  price: number,
): Promise<{ safe: boolean; reason: string }> {
  try {
    // Fetch order book depth
    const res = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`
    );
    const book = await res.json();
    
    if (!book.bids || !book.asks) {
      return { safe: true, reason: "Order book unavailable — proceeding" };
    }

    // Calculate bid/ask imbalance
    const bidVolume = book.bids.slice(0, 5).reduce(
      (sum: number, b: string[]) => sum + parseFloat(b[1]), 0
    );
    const askVolume = book.asks.slice(0, 5).reduce(
      (sum: number, b: string[]) => sum + parseFloat(b[1]), 0
    );
    const totalVolume = bidVolume + askVolume;
    const bidRatio = totalVolume > 0 ? bidVolume / totalVolume : 0.5;

    // Spread check
    const bestBid = parseFloat(book.bids[0][0]);
    const bestAsk = parseFloat(book.asks[0][0]);
    const spread = (bestAsk - bestBid) / bestBid;

    if (spread > 0.005) {
      return { safe: false, reason: `Spread too wide (${(spread*100).toFixed(2)}%)` };
    }

    if (side === "BUY" && bidRatio < 0.35) {
      return { safe: false, reason: "Sell-side dominant — high slippage risk" };
    }
    if (side === "SELL" && bidRatio > 0.65) {
      return { safe: false, reason: "Buy-side dominant — high slippage risk" };
    }

    return { safe: true, reason: `Spread ${(spread*100).toFixed(2)}%, bid ratio ${(bidRatio*100).toFixed(0)}%` };
  } catch {
    return { safe: true, reason: "Order book check failed — proceeding" };
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. COIN RANKING ENGINE
// ═══════════════════════════════════════════════════════════════

export interface CoinRank {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  score: number;        // 0-10, higher = better opportunity
  confidence: number;
  rrRatio: number;      // Risk/Reward ratio
  regime: MarketRegime;
  reason: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export async function rankCoins(
  symbols: string[],
  existingPositions: Position[],
  capital: number,
  lookbackCandles: Record<string, { closes: number[]; highs: number[]; lows: number[] }>,
): Promise<CoinRank[]> {
  const ranks: CoinRank[] = [];

  for (const symbol of symbols) {
    const candles = lookbackCandles[symbol];
    if (!candles || candles.closes.length < 50) continue;

    const { closes, highs, lows } = candles;
    const price = closes[closes.length - 1];

    // 1. Detect regime
    const regime = detectMarketRegime(closes);

    // 2. Generate ensemble signals
    const scores = generateEnsembleSignals(closes, highs, lows, regime);
    const action = ensembleVote(scores);
    if (action === "HOLD") continue;

    // 3. Calculate ATR for dynamic stops
    let atr = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      atr += tr;
    }
    atr /= 14;

    // 4. ATR-based stops
    const { stopLoss, takeProfit } = atrStopLoss(price, atr, action);

    // 5. Correlation check
    const { allowed, reduceSize } = correlationCheck(symbol, existingPositions);
    if (!allowed) continue;

    // 6. Score calculation
    const totalConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length;
    const rrRatio = Math.abs(takeProfit - price) / Math.abs(price - stopLoss);
    
    // Composite score (0-10)
    let score = totalConfidence * 5;                    // 0-5 from signals
    score += Math.min(rrRatio, 3);                     // 0-3 from risk/reward
    score += regime === "trending_up" ? 1.5 : 0;       // +1.5 for uptrend
    score += regime === "volatile" ? -1 : 0;           // -1 for volatile
    score *= reduceSize;                                // Reduce for correlated coins

    // 7. Kelly sizing
    const kelly = kellyPositionSize(capital, price, stopLoss, takeProfit, totalConfidence);

    ranks.push({
      symbol,
      action,
      score: Math.round(score * 10) / 10,
      confidence: Math.round(totalConfidence * 100) / 100,
      rrRatio: Math.round(rrRatio * 10) / 10,
      regime,
      reason: scores.filter(s => s.signal === action).map(s => s.reason).join(" | "),
      entryPrice: price,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
    });
  }

  // Sort by score descending
  return ranks.sort((a, b) => b.score - a.score);
}

export const SMART_TRADER_VERSION = "2.0.0";
export const SMART_TRADER_FEATURES = [
  "market_regime_detection",
  "ensemble_voting_4_models",
  "dynamic_kelly_sizing",
  "atr_stop_loss",
  "correlation_filter",
  "adverse_selection_check",
  "coin_ranking_engine",
];
