/**
 * Market Regime Detection System
 * Detects bull, bear, sideways, and volatile markets
 * Prevents trading in unfavorable conditions
 */

import { createClient } from "@/lib/utils";

// Cast for supabase.from('market_data') when table is not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export type MarketRegime =
  | "bull"
  | "bear"
  | "sideways"
  | "volatile"
  | "uncertain";
export type TradingCondition =
  | "favorable"
  | "neutral"
  | "unfavorable"
  | "dangerous";

interface MarketIndicators {
  symbol: string;
  price: number;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  volatility20d: number; // 20-day volatility
  atr14: number; // Average True Range
  volumeProfile: "high" | "normal" | "low";
  priceVsATH: number; // % below all-time high
}

interface RegimeAnalysis {
  regime: MarketRegime;
  condition: TradingCondition;
  confidence: number; // 0-1
  indicators: MarketIndicators;
  recommendation: {
    shouldTrade: boolean;
    positionSizeMultiplier: number;
    maxLeverage: number;
    strategy: "normal" | "defensive" | "aggressive" | "avoid";
    reason: string;
  };
  lastUpdated: Date;
}

// Regime detection thresholds
const REGIME_THRESHOLDS = {
  // Trend determination
  bullTrend: {
    sma20AboveSma50: true,
    sma50AboveSma200: true,
    minConfidence: 0.7,
  },
  bearTrend: {
    sma20BelowSma50: true,
    sma50BelowSma200: true,
    priceVsSMA200: -0.05, // 5% below SMA200
  },
  // Volatility
  highVolatility: 0.04, // 4% daily volatility
  extremeVolatility: 0.08, // 8% daily volatility
  // RSI levels
  overbought: 70,
  oversold: 30,
};

/**
 * Calculate market regime based on technical indicators
 */
export function detectMarketRegime(
  indicators: MarketIndicators,
): RegimeAnalysis {
  const { sma20, sma50, sma200, rsi14, volatility20d, priceVsATH } = indicators;

  // Trend analysis
  const isBullTrend = sma20 > sma50 && sma50 > sma200;
  const isBearTrend = sma20 < sma50 && sma50 < sma200;
  const isSideways = !isBullTrend && !isBearTrend;

  // Volatility analysis
  const isHighVolatility = volatility20d > REGIME_THRESHOLDS.highVolatility;
  const isExtremeVolatility =
    volatility20d > REGIME_THRESHOLDS.extremeVolatility;

  // RSI context
  const isOverbought = rsi14 > REGIME_THRESHOLDS.overbought;
  const isOversold = rsi14 < REGIME_THRESHOLDS.oversold;

  // Distance from ATH (crash detection)
  const isPostCrash = priceVsATH < -0.5; // 50% below ATH
  const isDeepCorrection = priceVsATH < -0.3; // 30% below ATH

  // Determine regime
  let regime: MarketRegime;
  let confidence = 0.5;

  if (isExtremeVolatility) {
    regime = "volatile";
    confidence = 0.9;
  } else if (isBearTrend && (isPostCrash || isDeepCorrection)) {
    regime = "bear";
    confidence = 0.85;
  } else if (isBearTrend) {
    regime = "bear";
    confidence = 0.75;
  } else if (isBullTrend && !isHighVolatility) {
    regime = "bull";
    confidence = 0.8;
  } else if (isBullTrend && isHighVolatility) {
    regime = "volatile";
    confidence = 0.7;
  } else if (isSideways && isHighVolatility) {
    regime = "volatile";
    confidence = 0.6;
  } else {
    regime = "sideways";
    confidence = 0.6;
  }

  // Determine trading condition
  let condition: TradingCondition;

  if (regime === "volatile" && confidence > 0.8) {
    condition = "dangerous";
  } else if (regime === "bear" && confidence > 0.7) {
    condition = "unfavorable";
  } else if (
    regime === "volatile" ||
    (regime === "sideways" && isHighVolatility)
  ) {
    condition = "neutral";
  } else if (regime === "bull" || (regime === "sideways" && isOversold)) {
    condition = "favorable";
  } else {
    condition = "neutral";
  }

  // Generate recommendation
  const recommendation = generateRecommendation(
    regime,
    condition,
    confidence,
    indicators,
  );

  return {
    regime,
    condition,
    confidence,
    indicators,
    recommendation,
    lastUpdated: new Date(),
  };
}

/**
 * Generate trading recommendation based on regime
 */
function generateRecommendation(
  regime: MarketRegime,
  condition: TradingCondition,
  confidence: number,
  indicators: MarketIndicators,
): RegimeAnalysis["recommendation"] {
  const { rsi14 } = indicators;

  switch (regime) {
    case "bull":
      return {
        shouldTrade: true,
        positionSizeMultiplier: 1.0,
        maxLeverage: 1.5,
        strategy: "normal",
        reason: "Bull marked - trenden er din venn",
      };

    case "bear":
      if (confidence > 0.8) {
        return {
          shouldTrade: false,
          positionSizeMultiplier: 0,
          maxLeverage: 0,
          strategy: "avoid",
          reason: "Bear marked påvist - trading stoppet for å beskytte kapital",
        };
      }
      return {
        shouldTrade: true,
        positionSizeMultiplier: 0.3,
        maxLeverage: 1.0,
        strategy: "defensive",
        reason: "Svak bear signal - redusert eksponering",
      };

    case "sideways":
      if (rsi14 < 35) {
        return {
          shouldTrade: true,
          positionSizeMultiplier: 0.7,
          maxLeverage: 1.0,
          strategy: "normal",
          reason:
            "Sideways marked med oversold RSI - mulighet for mean reversion",
        };
      }
      return {
        shouldTrade: true,
        positionSizeMultiplier: 0.5,
        maxLeverage: 1.0,
        strategy: "defensive",
        reason: "Sideways marked - vent på breakout",
      };

    case "volatile":
      if (confidence > 0.85) {
        return {
          shouldTrade: false,
          positionSizeMultiplier: 0,
          maxLeverage: 0,
          strategy: "avoid",
          reason: "Ekstrem volatilitet - trading stoppet for sikkerhet",
        };
      }
      return {
        shouldTrade: true,
        positionSizeMultiplier: 0.4,
        maxLeverage: 1.0,
        strategy: "defensive",
        reason: "Høy volatilitet - redusert posisjonsstørrelse",
      };

    default:
      return {
        shouldTrade: false,
        positionSizeMultiplier: 0,
        maxLeverage: 0,
        strategy: "avoid",
        reason: "Usikkert marked - venter på klarere signal",
      };
  }
}

/**
 * Fetch real-time market data and calculate regime
 */
export async function analyzeCurrentMarket(
  symbol: string = "BTC",
): Promise<RegimeAnalysis> {
  const supabase = createClient();

  // Fetch latest market data from database (market_data table not in generated types)
  const { data: marketData, error } = await (supabase as AnySupabase)
    .from("market_data")
    .select("*")
    .eq("symbol", symbol)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error || !marketData) {
    // Return uncertain regime if no data
    return {
      regime: "uncertain",
      condition: "neutral",
      confidence: 0,
      indicators: {} as MarketIndicators,
      recommendation: {
        shouldTrade: false,
        positionSizeMultiplier: 0,
        maxLeverage: 0,
        strategy: "avoid",
        reason: "Ingen markeddata tilgjengelig",
      },
      lastUpdated: new Date(),
    };
  }

  // Calculate indicators from price history
  const indicators = await calculateIndicators(symbol);
  return detectMarketRegime(indicators);
}

/**
 * Calculate technical indicators from price history
 */
async function calculateIndicators(symbol: string): Promise<MarketIndicators> {
  const supabase = createClient();

  // Get last 200 days of price data
  const res = await (supabase as AnySupabase)
    .from("market_data")
    .select("price, high, low, volume, timestamp")
    .eq("symbol", symbol)
    .order("timestamp", { ascending: false })
    .limit(200);
  const prices = (res.data ?? []) as unknown as {
    price: number;
    high: number;
    low: number;
    volume?: number;
  }[];

  if (!prices || prices.length < 200) {
    throw new Error("Insufficient price data");
  }

  const priceArray = prices.map((p) => p.price);
  const currentPrice = priceArray[0];

  // Calculate SMAs
  const sma20 = calculateSMA(priceArray, 20);
  const sma50 = calculateSMA(priceArray, 50);
  const sma200 = calculateSMA(priceArray, 200);

  // Calculate RSI
  const rsi14 = calculateRSI(priceArray, 14);

  // Calculate volatility
  const volatility20d = calculateVolatility(priceArray.slice(0, 20));

  // Calculate ATR
  const atr14 = calculateATR(prices.slice(0, 14));

  // Get ATH (simplified - in production fetch from historical data)
  const ath = Math.max(...priceArray);
  const priceVsATH = (currentPrice - ath) / ath;

  // Volume profile (simplified)
  const avgVolume =
    prices.slice(0, 20).reduce((sum, p) => sum + (p.volume || 0), 0) / 20;
  const currentVolume = prices[0]?.volume ?? 0;
  const volumeRatio = currentVolume / avgVolume;

  let volumeProfile: "high" | "normal" | "low";
  if (volumeRatio > 1.5) volumeProfile = "high";
  else if (volumeRatio < 0.5) volumeProfile = "low";
  else volumeProfile = "normal";

  return {
    symbol,
    price: currentPrice,
    sma20,
    sma50,
    sma200,
    rsi14,
    volatility20d,
    atr14,
    volumeProfile,
    priceVsATH,
  };
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    const change = prices[i] - prices[i + 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 0; i < prices.length - 1; i++) {
    returns.push((prices[i] - prices[i + 1]) / prices[i + 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

  return Math.sqrt(variance);
}

function calculateATR(
  candles: { high: number; low: number; price: number }[],
): number {
  if (candles.length < 2) return 0;

  const trValues: number[] = [];

  for (let i = 0; i < candles.length - 1; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i + 1].price;

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    trValues.push(Math.max(tr1, tr2, tr3));
  }

  return trValues.reduce((a, b) => a + b, 0) / trValues.length;
}

/**
 * Check if trading should be paused for a symbol
 */
export async function shouldPauseTrading(symbol: string = "BTC"): Promise<{
  paused: boolean;
  reason?: string;
  resumeConditions?: string[];
}> {
  const analysis = await analyzeCurrentMarket(symbol);

  if (!analysis.recommendation.shouldTrade) {
    return {
      paused: true,
      reason: analysis.recommendation.reason,
      resumeConditions: getResumeConditions(analysis.regime),
    };
  }

  return { paused: false };
}

function getResumeConditions(regime: MarketRegime): string[] {
  switch (regime) {
    case "bear":
      return [
        "SMA 20 krysser over SMA 50 (golden cross)",
        "Prisen holder seg over SMA 200 i 3 dager",
        "RSI kommer seg over 40",
      ];
    case "volatile":
      return [
        "20-dagers volatilitet faller under 4%",
        "ATR reduseres med 30% fra toppen",
        "Ingen +/-10% bevegelser siste 5 dager",
      ];
    default:
      return ["Marked stabiliserer seg"];
  }
}

/**
 * Get position size adjustment based on market condition
 */
export function getPositionSizeAdjustment(
  baseSize: number,
  regime: MarketRegime,
  confidence: number,
): number {
  const multipliers: Record<MarketRegime, number> = {
    bull: 1.0,
    bear: 0.2,
    sideways: 0.6,
    volatile: 0.3,
    uncertain: 0,
  };

  const multiplier = multipliers[regime] * confidence;
  return baseSize * multiplier;
}

/**
 * Monitor multiple markets and return overall market health
 */
export async function getOverallMarketHealth(
  symbols: string[] = ["BTC", "ETH", "SOL"],
): Promise<{
  health: "strong" | "moderate" | "weak" | "dangerous";
  averageConfidence: number;
  details: Record<string, RegimeAnalysis>;
}> {
  const analyses: Record<string, RegimeAnalysis> = {};

  for (const symbol of symbols) {
    analyses[symbol] = await analyzeCurrentMarket(symbol);
  }

  const regimes = Object.values(analyses).map((a) => a.regime);
  const avgConfidence =
    Object.values(analyses).reduce((sum, a) => sum + a.confidence, 0) /
    regimes.length;

  const bearCount = regimes.filter((r) => r === "bear").length;
  const volatileCount = regimes.filter((r) => r === "volatile").length;
  const bullCount = regimes.filter((r) => r === "bull").length;

  let health: "strong" | "moderate" | "weak" | "dangerous";

  if (volatileCount >= 2 || bearCount >= 2) {
    health = "dangerous";
  } else if (bearCount >= 1) {
    health = "weak";
  } else if (bullCount >= 2) {
    health = "strong";
  } else {
    health = "moderate";
  }

  return {
    health,
    averageConfidence: avgConfidence,
    details: analyses,
  };
}
