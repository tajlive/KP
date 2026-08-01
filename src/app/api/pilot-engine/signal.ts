/** 🎭 PilotTrade signalstrategi — RSI + MACD + Bollinger + SMA-crossover */
export type MarketData = {
  currentPrice: number;
  rsi: number;
  macd: { histogram: number; signal: number; macd: number };
  bollinger: { upper: number; middle: number; lower: number };
  sma10: number;
  sma30: number;
  volatility: number;
  trend: "up" | "down" | "flat";
};

export type SignalResult = {
  action: "BUY" | "SELL" | "WAIT";
  confidence: number;
  reason: string;
};

/** Generer handelssignal basert på RSI, MACD, Bollinger Bands og SMA-crossover */
export function generatePilotSignal(market: MarketData, winMultiplier = 1): SignalResult {
  const { rsi, macd, bollinger, sma10, sma30, currentPrice, volatility, trend } = market;

  // === SIGNAL 1: RSI + MACD combo (størst vekt) ===
  const rsiOversold = rsi < 30;
  const rsiOverbought = rsi > 70;
  const macdBullish = macd.histogram > 0;
  const macdBearish = macd.histogram < 0;

  // MACD-signal cross (histogram snur = momentum endres)
  const prevHist = macd.histogram - macd.macd * 0.01; // tilnærmet forrige histogram
  const macdTurningUp = !macdBullish && Math.abs(macd.histogram) < Math.abs(macd.macd) * 0.5;
  const macdTurningDown = macdBullish && macd.histogram < macd.macd * 0.5;

  // === SIGNAL 2: Bollinger Bands ===
  const belowLowerBand = bollinger.lower > 0 && currentPrice < bollinger.lower;
  const aboveUpperBand = bollinger.upper > 0 && currentPrice > bollinger.upper;

  // === SIGNAL 3: SMA-crossover ===
  const smaBullish = sma10 > sma30;
  const smaBearish = sma10 < sma30;

  // === Kombinert scoring ===
  let score = 50; // nøytral
  const reasons: string[] = [];

  // RSI (0-30 poeng)
  if (rsiOversold) { score += 25; reasons.push(`RSI ${rsi.toFixed(0)} — oversolgt`); }
  else if (rsi > 50 && rsi < 65) { score += 10; reasons.push(`RSI ${rsi.toFixed(0)} — moderat bullish`); }
  else if (rsiOverbought) { score -= 25; reasons.push(`RSI ${rsi.toFixed(0)} — overkjøpt`); }
  else if (rsi < 50 && rsi > 35) { score -= 10; reasons.push(`RSI ${rsi.toFixed(0)} — moderat bearish`); }

  // MACD (0-25 poeng)
  if (macdBullish && smaBullish) { score += 20; reasons.push("MACD bullish"); }
  else if (macdBullish && !smaBullish) { score += 10; reasons.push("MACD bullish, SMA bearish"); }
  else if (macdBearish && smaBearish) { score -= 20; reasons.push("MACD bearish"); }
  else if (macdBearish) { score -= 10; reasons.push("MACD bearish, SMA bullish"); }

  // Bollinger (0-20 poeng)
  if (belowLowerBand && trend !== "down") { score += 15; reasons.push("pris under Bollinger lower"); }
  else if (aboveUpperBand && trend !== "up") { score -= 15; reasons.push("pris over Bollinger upper"); }

  // SMA-crossover (0-15 poeng)
  if (smaBullish && trend === "up") { score += 10; reasons.push("SMA10 > SMA30 i opptrend"); }
  else if (smaBearish && trend === "down") { score -= 10; reasons.push("SMA10 < SMA30 i nedtrend"); }

  // Volatilitet — høy volatilitet demper confidence
  const volDiscount = Math.min(20, Math.max(-10, (50 - volatility) / 5));
  score += volDiscount;

  // Win-rate multiplier (fra getCoinWinRate — 0.7-1.3 range)
  score = Math.round(score * winMultiplier);

  // Normaliser
  const confidence = Math.max(0, Math.min(99, score));

  // Beslutning
  if (confidence >= 65) {
    const action = score >= 50 ? "BUY" as const : "SELL" as const;
    return { action, confidence, reason: reasons.join("; ") || "Kombinert signal" };
  }
  if (confidence <= 35) {
    const action = score < 50 ? "SELL" as const : "BUY" as const;
    return { action, confidence, reason: reasons.join("; ") || "Kombinert signal" };
  }
  
  return {
    action: "WAIT",
    confidence,
    reason: reasons.length > 0
      ? reasons.join("; ") + " — avventer sterkere signal"
      : `RSI ${rsi.toFixed(0)}, ${trend}-trend — nøytral sone`,
  };
}
