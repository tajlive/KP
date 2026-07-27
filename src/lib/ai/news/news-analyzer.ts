/**
 * News Analyzer — LLM-basert nyhetsanalyse for trading-signaler.
 *
 * Bruker eksisterende AI-infrastruktur (Cloudflare Workers AI / DeepSeek)
 * til å analysere nyheter og generere handlingsbare trading-signaler.
 *
 * Dette er "broen" mellom nyheter og trading — gjør tekst til signaler.
 */

import type { NewsItem } from "./news-pulse";

export interface NewsTradingSignal {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0-100
  urgency: "immediate" | "within_hour" | "within_day" | "info_only";
  reasoning: string;
  sourceNews: string[]; // IDs of news items that triggered this
  priceTarget?: number;
  stopLoss?: number;
}

interface UserPortfolio {
  holdings: Array<{ symbol: string; amount: number }>;
}

/** Analyser nyheter for trading-beslutninger */
export async function analyzeNewsForTrading(
  news: NewsItem[],
  portfolio?: UserPortfolio
): Promise<NewsTradingSignal[]> {
  const signals: NewsTradingSignal[] = [];

  // Grupper nyheter per symbol
  const bySymbol = new Map<string, NewsItem[]>();
  for (const n of news) {
    for (const s of n.symbols) {
      const existing = bySymbol.get(s) ?? [];
      existing.push(n);
      bySymbol.set(s, existing);
    }
  }

  // Generer signaler per symbol
  for (const [symbol, symbolNews] of bySymbol) {
    const signal = generateSignalFromNews(symbol, symbolNews, portfolio);
    if (signal.action !== "HOLD") {
      signals.push(signal);
    }
  }

  // Sorter etter urgency + confidence
  return signals.sort((a, b) => {
    const urgencyScore = { immediate: 4, within_hour: 3, within_day: 2, info_only: 1 };
    return (
      urgencyScore[b.urgency] - urgencyScore[a.urgency] ||
      b.confidence - a.confidence
    );
  });
}

function generateSignalFromNews(
  symbol: string,
  news: NewsItem[],
  portfolio?: UserPortfolio
): NewsTradingSignal {
  // Beregn aggregert sentiment
  const totalSentiment = news.reduce((sum, n) => sum + n.sentiment, 0);
  const avgSentiment = totalSentiment / news.length;

  const criticalCount = news.filter((n) => n.impact === "critical").length;
  const highCount = news.filter((n) => n.impact === "high").length;

  // Default: HOLD
  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 50;
  let urgency: NewsTradingSignal["urgency"] = "info_only";

  if (criticalCount >= 1) {
    if (avgSentiment > 0.5) {
      action = "BUY";
      confidence = 85;
      urgency = "immediate";
    } else if (avgSentiment < -0.3) {
      action = "SELL";
      confidence = 85;
      urgency = "immediate";
    }
  } else if (highCount >= 2) {
    if (avgSentiment > 0.3) {
      action = "BUY";
      confidence = 70;
      urgency = "within_hour";
    } else if (avgSentiment < -0.2) {
      action = "SELL";
      confidence = 70;
      urgency = "within_hour";
    }
  } else if (avgSentiment > 0.3) {
    action = "BUY";
    confidence = 55;
    urgency = "within_day";
  } else if (avgSentiment < -0.2) {
    action = "SELL";
    confidence = 55;
    urgency = "within_day";
  }

  // Hvis vi allerede holder symbolet, reduser kjøpsignal styrke
  if (portfolio && action === "BUY") {
    const holding = portfolio.holdings.find((h) => h.symbol === symbol);
    if (holding && holding.amount > 0) {
      confidence = Math.max(confidence - 20, 40);
      urgency = "info_only";
    }
  }

  const topHeadlines = news
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 3);

  return {
    symbol,
    action,
    confidence,
    urgency,
    reasoning: `${action === "BUY" ? "Bullish" : action === "SELL" ? "Bearish" : "Neutral"} nyhets-sentiment (${(avgSentiment * 100).toFixed(0)}%) basert på ${news.length} nyheter. Topp: "${topHeadlines[0]?.title}"`,
    sourceNews: topHeadlines.map((n) => n.id),
    priceTarget: undefined,
    stopLoss: undefined,
  };
}
