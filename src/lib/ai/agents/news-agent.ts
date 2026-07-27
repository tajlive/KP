/**
 * News Pulse Agent — Genererer trading-signaler fra nyhetsanalyse.
 *
 * Kombinerer nyhets-sentiment, social sentiment, og urgency
 * for å gi tidlige signaler FØR markedet reagerer.
 *
 * Baseline weight: 0.15
 */

import type { TradingAgent, AgentSignal, AgentFeatures, AgentState } from "./types";
import { fetchCryptoNews, aggregateNewsSentiment, getNewsForSymbol } from "../news/news-pulse";
import { analyzeNewsForTrading } from "../news/news-analyzer";

export const newsAgent: TradingAgent = {
  id: "news",
  name: "News Pulse Agent",
  baselineWeight: 0.15,

  async run(
    _symbol: string,
    _features: AgentFeatures,
    _state?: AgentState
  ): Promise<AgentSignal> {
    try {
      // Hent nyheter for symbolet
      const news = await getNewsForSymbol(_symbol, 10);

      if (news.length === 0) {
        return {
          action: "hold",
          confidence: 0,
          reasoning: "Ingen relevante nyheter for dette symbolet",
        };
      }

      // Analyser nyhetssentiment
      const sentiment = aggregateNewsSentiment(news);

      // Critical news overstyrer alt
      const criticalNews = news.filter((n) => n.impact === "critical");
      if (criticalNews.length > 0) {
        const isPositive = criticalNews.every((n) => n.sentiment > 0);
        return {
          action: isPositive ? "buy" : "sell",
          confidence: 85,
          reasoning: `KRITISK: ${criticalNews[0].title} — ${criticalNews[0].category}`,
          meta: { newsCount: news.length, criticalCount: criticalNews.length },
        };
      }

      // High impact news
      const highNews = news.filter((n) => n.impact === "high");
      if (highNews.length >= 2 && Math.abs(sentiment.score) > 0.4) {
        return {
          action: sentiment.score > 0 ? "buy" : "sell",
          confidence: Math.round(Math.abs(sentiment.score) * 100),
          reasoning: `${highNews.length} high-impact nyheter. Sentiment: ${(sentiment.score * 100).toFixed(0)}%`,
          meta: { newsCount: news.length, sentimentScore: sentiment.score },
        };
      }

      // Moderate signal fra akkumulert sentiment
      if (Math.abs(sentiment.score) > 0.25 && sentiment.confidence > 0.3) {
        return {
          action: sentiment.score > 0 ? "buy" : "sell",
          confidence: Math.round(Math.abs(sentiment.score) * 60),
          reasoning: `Nyhets-sentiment ${(sentiment.score * 100).toFixed(0)}% basert på ${news.length} nyheter`,
          meta: { newsCount: news.length, sentimentScore: sentiment.score },
        };
      }

      return {
        action: "hold",
        confidence: 20,
        reasoning: `Svakt nyhets-signal. ${news.length} nyheter, sentiment ${(sentiment.score * 100).toFixed(0)}%`,
      };
    } catch (error) {
      return {
        action: "hold",
        confidence: 0,
        reasoning: `News agent error: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  },
};
