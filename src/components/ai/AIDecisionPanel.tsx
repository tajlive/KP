"use client";

/**
 * AI Decision Panel - AI MVP Seksjon 6
 * Viser AI-beslutninger og forklaringer i dashboardet
 * Ingen black box - brukeren ser alltid hva som ble gjort og hvorfor
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  analyzeMarketSentiment,
  formatSentiment,
  type SentimentAnalysis,
} from "@/lib/ai/sentiment-service";
import {
  calculateAdaptiveAdjustments,
  getInitialParameters,
  type AdaptiveAdjustment,
} from "@/lib/ai/adaptive-parameters";

interface AIDecisionPanelProps {
  userId: string;
  strategyId: string;
  locale?: string;
}

interface AIDecisionState {
  sentiment: SentimentAnalysis | null;
  adjustments: AdaptiveAdjustment[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export default function AIDecisionPanel({
  userId,
  strategyId,
  locale = "no",
}: AIDecisionPanelProps) {
  const [state, setState] = useState<AIDecisionState>({
    sentiment: null,
    adjustments: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const lang = locale === "en" ? "en" : "no";

  useEffect(() => {
    const fetchAIDecisions = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Hent sentiment-analyse
        const sentiment = await analyzeMarketSentiment();

        // Hent adaptive justeringer
        const initialParams = getInitialParameters(strategyId);
        const { adjustments, explanation } = await calculateAdaptiveAdjustments(
          userId,
          strategyId,
          initialParams
        );

        setState({
          sentiment,
          adjustments,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } catch (error) {
        console.error("Failed to fetch AI decisions:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: lang === "en" ? "Failed to load AI analysis" : "Kunne ikke laste AI-analyse",
        }));
      }
    };

    fetchAIDecisions();

    // Oppdater hver 15. minutt
    const interval = setInterval(fetchAIDecisions, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, strategyId, lang]);

  if (state.loading) {
    return (
      <Card className="bg-gradient-to-br from-violet-900/10 via-slate-900 to-slate-900 border-violet-500/20 rounded-3xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            {lang === "en" ? "Analyzing market conditions..." : "Analyserer markedsforhold..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="bg-gradient-to-br from-red-900/10 via-slate-900 to-slate-900 border-red-500/20 rounded-3xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {state.error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sentimentFormatted = state.sentiment
    ? formatSentiment(state.sentiment.classification, lang)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-violet-900/10 via-slate-900 to-slate-900 border-violet-500/20 rounded-3xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">
                  {lang === "en" ? "AI Insights" : "AI Innsikt"}
                </CardTitle>
                <p className="text-xs text-slate-400">
                  {state.lastUpdated
                    ? `${lang === "en" ? "Updated" : "Oppdatert"} ${state.lastUpdated.toLocaleTimeString(
                        lang === "en" ? "en-US" : "no-NO",
                        { hour: "2-digit", minute: "2-digit" }
                      )}`
                    : ""}
                </p>
              </div>
            </div>
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1.5" />
              {lang === "en" ? "Active" : "Aktiv"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Fear & Greed Gauge */}
          {state.sentiment && (
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-300">
                  {lang === "en" ? "Market Sentiment" : "Markedssentiment"}
                </span>
                {sentimentFormatted && (
                  <span className={`text-sm font-bold ${sentimentFormatted.color}`}>
                    {sentimentFormatted.emoji} {sentimentFormatted.label}
                  </span>
                )}
              </div>

              {/* Gauge */}
              <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-500"
                  style={{ left: `${state.sentiment.currentValue}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>{lang === "en" ? "Fear" : "Frykt"}</span>
                <span className="font-mono">{state.sentiment.currentValue}/100</span>
                <span>{lang === "en" ? "Greed" : "Grådighet"}</span>
              </div>

              {state.sentiment.reasoning && (
                <p className="mt-3 text-sm text-slate-400">
                  {state.sentiment.reasoning}
                </p>
              )}
            </div>
          )}

          {/* AI Adjustments */}
          {state.adjustments.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {lang === "en" ? "Strategy Adjustments" : "Strategi-justeringer"}
              </h4>

              {state.adjustments.map((adjustment, index) => (
                <motion.div
                  key={adjustment.parameter}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">
                        {formatParameterName(adjustment.parameter, lang)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatAdjustment(adjustment, lang)}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {adjustment.reason}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
              <div className="flex items-center gap-3 text-slate-400">
                <Info className="w-5 h-5" />
                <p className="text-sm">
                  {lang === "en"
                    ? "No adjustments needed. Strategy is performing well in current market conditions."
                    : "Ingen justeringer nødvendig. Strategien fungerer godt i nåværende markedsforhold."}
                </p>
              </div>
            </div>
          )}

          {/* Confidence Score */}
          {state.sentiment && (
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl">
              <span className="text-sm text-slate-400">
                {lang === "en" ? "AI Confidence" : "AI-konfidens"}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${state.sentiment.confidence * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-sm font-medium text-white">
                  {Math.round(state.sentiment.confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-slate-500 text-center">
            {lang === "en"
              ? "AI signals are educational tools, not investment advice. Always do your own research."
              : "AI-signaler er pedagogiske verktøy, ikke investeringsråd. Gjør alltid din egen research."}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Hjelpefunksjoner
function formatParameterName(parameter: string, lang: string): string {
  const names: Record<string, Record<string, string>> = {
    no: {
      dcaInterval: "DCA-intervall",
      dcaAmount: "DCA-beløp",
      dcaMultiplier: "DCA-multiplikator",
      maxPositionSize: "Maks posisjonsstørrelse",
      stopLossPercent: "Stop-loss %",
      takeProfitPercent: "Take-profit %",
      minConfidence: "Minimum konfidens",
      volatilityThreshold: "Volatilitet terskel",
    },
    en: {
      dcaInterval: "DCA Interval",
      dcaAmount: "DCA Amount",
      dcaMultiplier: "DCA Multiplier",
      maxPositionSize: "Max Position Size",
      stopLossPercent: "Stop-loss %",
      takeProfitPercent: "Take-profit %",
      minConfidence: "Min Confidence",
      volatilityThreshold: "Volatility Threshold",
    },
  };

  return names[lang]?.[parameter] || parameter;
}

function formatAdjustment(adjustment: AdaptiveAdjustment, lang: string): string {
  const { oldValue, newValue } = adjustment;
  const change = ((newValue - oldValue) / oldValue) * 100;
  const direction = change > 0 ? "↑" : "↓";

  if (lang === "en") {
    return `${oldValue} → ${newValue} (${direction} ${Math.abs(change).toFixed(0)}%)`;
  }

  return `${oldValue} → ${newValue} (${direction} ${Math.abs(change).toFixed(0)}%)`;
}
