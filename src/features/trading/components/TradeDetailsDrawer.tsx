"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  TrendingDown,
  Bot,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Brain,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import type { Trade, TradingMode } from "@/lib/trading-api";
import { useCurrency } from "@/hooks/useCurrency";
import {
  buildTradeExplanation,
  getLearnMoreTitle,
  type TradeExplanation,
} from "@/lib/trading/explanations";

interface TradeDetailsDrawerProps {
  tradeId: string | null;
  onClose: () => void;
}

interface TradeWithDetails extends Trade {
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  exitReason?: string;
  aiReasoning?: string;
  aiConfidence?: number;
  aiDecisionType?: string;
  strategyParams?: Record<string, unknown>;
}

export function TradeDetailsDrawer({ tradeId, onClose }: TradeDetailsDrawerProps) {
  const [trade, setTrade] = useState<TradeWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<TradeExplanation | null>(null);

  const t = useTranslations("trading.tradeDetails");
  const tCommon = useTranslations("trading");
  const isNorwegian = useLocale() === "no";
  const { formatByMode } = useCurrency();
  const dateLocale = isNorwegian ? nb : enUS;

  useEffect(() => {
    if (!tradeId) {
      setTrade(null);
      return;
    }

    const fetchTradeDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try API route first (server-side join with AI decision)
        const apiResponse = await fetch(`/api/trades/${tradeId}`);

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          const enrichedTrade: TradeWithDetails = {
            id: data.id,
            session_id: data.id,
            symbol: data.symbol,
            side: data.side,
            quantity: data.quantity,
            price: data.price,
            total_value: data.total_value,
            fee: data.fee,
            realized_pnl: data.realized_pnl,
            status: data.status as Trade["status"],
            mode: data.mode,
            is_copy: false,
            strategy_signal: data.strategy_signal,
            executed_at: data.executed_at,
            created_at: data.created_at,
            entryPrice: data.entryPrice,
            exitPrice: data.exitPrice,
            stopLoss: data.stopLoss,
            takeProfit: data.takeProfit,
            exitReason: data.exitReason,
            aiReasoning: data.ai_decision?.sentiment_reasoning,
            aiConfidence: data.ai_decision?.sentiment_confidence,
            aiDecisionType: data.ai_decision?.sentiment_recommendation,
            strategyParams: data.strategy_signal,
          };
          setTrade(enrichedTrade);
          return;
        }

        // KLA-auth: anon supabase-fallback fjernet — browser-klienten er
        // alltid anon (RLS → stille 0 rader). /api/trades/[id] er eneste
        // kilde; ved feil vises feilmelding i stedet for falsk fallback.
        setError(tCommon("analysisError"));
      } catch (err) {
        console.error("Failed to fetch trade details:", err);
        setError(tCommon("analysisError"));
      } finally {
        setLoading(false);
      }
    };

    fetchTradeDetails();
  }, [tradeId, t, tCommon]);

  // Build explanation when trade data is loaded
  useEffect(() => {
    if (!trade) {
      setExplanation(null);
      return;
    }

    const decision = trade.aiDecisionType
      ? {
          decision_type: trade.aiDecisionType,
          sentiment_confidence: trade.aiConfidence ?? undefined,
          decision_reason: trade.aiReasoning ?? undefined,
        }
      : null;

    const exp = buildTradeExplanation(
      {
        side: trade.side,
        mode: trade.mode,
        realized_pnl: trade.realized_pnl,
        exit_reason: trade.exitReason,
        strategy_signal: trade.strategyParams,
      },
      decision,
      isNorwegian ? "no" : "en"
    );
    setExplanation(exp);
  }, [trade, isNorwegian]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Format time with locale
  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d. MMMM yyyy, HH:mm:ss", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  // Format PnL
  const formatPnL = (pnl: number | null, mode: TradingMode | "paper" | "live") => {
    if (pnl === null || pnl === undefined) return "—";
    const isProfit = pnl >= 0;
    const sign = isProfit ? "+" : "";
    return (
      <span className={`text-2xl font-bold ${isProfit ? "text-kp-success" : "text-kp-danger"}`}>
        {sign}
        {formatByMode(Math.abs(pnl), mode)}
      </span>
    );
  };

  // Get strategy name
  const getStrategyName = (tradeData: TradeWithDetails): string => {
    return (
      (tradeData.strategyParams?.strategy_type as string) ??
      (tradeData.strategyParams?.name as string) ??
      t("automatic")
    );
  };

  // Get strategy parameters
  const getStrategyParams = (tradeData: TradeWithDetails): string => {
    const params = tradeData.strategyParams;
    if (!params) return "";

    const parts: string[] = [];
    if (params.fast_length && params.slow_length) {
      parts.push(`SMA ${params.fast_length}/${params.slow_length}`);
    }
    if (params.risk_level) {
      parts.push(`${tCommon("riskLevel")}: ${params.risk_level}`);
    }
    return parts.join(" • ");
  };

  return (
    <AnimatePresence>
      {tradeId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer - Responsive width for mobile */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:max-w-lg bg-kp-bg-secondary border-l border-kp-border z-50 overflow-y-auto pt-[max(1rem,env(safe-area-inset-top))]"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kp-brand" />
              </div>
            ) : error || !trade ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <AlertTriangle className="w-12 h-12 text-kp-warning mb-4" />
                <p className="text-kp-text-secondary text-center">{error || t("notFound")}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-kp-bg-tertiary hover:bg-kp-brand-hover rounded-lg text-kp-text-primary transition-colors"
                >
                  {t("close")}
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-kp-text-primary">{trade.symbol}</h2>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trade.mode === "live"
                            ? "bg-kp-success text-kp-success"
                            : "bg-kp-brand-subtle text-kp-brand"
                        }`}
                      >
                        {trade.mode === "live" ? t("live") : t("paper")}
                      </span>
                    </div>
                    <p className="text-kp-text-muted text-sm">{formatTime(trade.created_at)}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-3 h-12 w-12 hover:bg-kp-brand-hover rounded-lg transition-colors flex items-center justify-center"
                    aria-label={t("close")}
                  >
                    <X className="w-5 h-5 text-kp-text-muted" />
                  </button>
                </div>

                {/* PnL Summary */}
                <div className="bg-kp-bg-tertiary rounded-xl p-4 border border-kp-border">
                  <p className="text-kp-text-muted text-sm mb-1">{t("result")}</p>
                  {formatPnL(trade.realized_pnl, trade.mode as TradingMode)}
                </div>

                {/* Trade Overview */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-kp-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {t("overview")}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-kp-bg-tertiary/50 rounded-lg p-3 border border-kp-light">
                      <p className="text-kp-text-muted text-xs mb-1">{t("type")}</p>
                      <div className="flex items-center gap-1.5">
                        {trade.side === "buy" ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-kp-success" />
                            <span className="text-kp-success font-medium">{t("buy")}</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-kp-danger" />
                            <span className="text-kp-danger font-medium">{t("sell")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-kp-bg-tertiary/50 rounded-lg p-3 border border-kp-light">
                      <p className="text-kp-text-muted text-xs mb-1">{t("strategy")}</p>
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-kp-brand" />
                        <span className="text-kp-text-primary font-medium">{getStrategyName(trade)}</span>
                      </div>
                    </div>
                    <div className="bg-kp-bg-tertiary/50 rounded-lg p-3 border border-kp-light">
                      <p className="text-kp-text-muted text-xs mb-1">{t("quantity")}</p>
                      <p className="text-kp-text-primary font-medium tabular-nums">
                        {trade.quantity.toLocaleString(isNorwegian ? "nb-NO" : "en-US", {
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    </div>
                    <div className="bg-kp-bg-tertiary/50 rounded-lg p-3 border border-kp-light">
                      <p className="text-kp-text-muted text-xs mb-1">{t("totalValue")}</p>
                      <p className="text-kp-text-primary font-medium tabular-nums">
                        {formatByMode(trade.total_value, trade.mode as TradingMode)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Paper Mode Notice */}
                {trade.mode === "paper" && (
                  <section className="bg-kp-brand-subtle border border-kp-brand/30 rounded-xl p-4">
                    <p className="text-kp-brand-light text-sm flex items-start gap-2">
                      <Bot className="w-4 h-4 shrink-0 mt-0.5" />
                      {t("paperNotice")}
                    </p>
                  </section>
                )}

                {/* Why Buy Explanation */}
                {explanation && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-kp-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Brain className="w-4 h-4 text-kp-brand-light" />
                      {t("whyBuy")}
                    </h3>
                    <div className="bg-kp-brand-subtle border border-kp-brand/20 rounded-xl p-4">
                      <p className="text-kp-text-primary leading-relaxed">{explanation.whyBuy}</p>
                      {trade.aiConfidence && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-kp-text-muted text-sm">{t("confidence")}:</span>
                          <div className="flex-1 h-2 bg-kp-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-kp-brand rounded-full"
                              style={{ width: `${trade.aiConfidence * 100}%` }}
                            />
                          </div>
                          <span className="text-kp-brand text-sm font-medium">
                            {Math.round(trade.aiConfidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Why Sell Explanation */}
                {explanation && trade.side === "sell" && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-kp-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-kp-success" />
                      {t("whySell")}
                    </h3>
                    <div className="bg-kp-success border border-kp-success/20 rounded-xl p-4">
                      <p className="text-kp-text-primary leading-relaxed">{explanation.whySell}</p>
                    </div>
                  </section>
                )}

                {/* Learn More */}
                {explanation?.learnMoreUrl && (
                  <section className="bg-kp-bg-tertiary/50 rounded-xl p-4 border border-kp-border">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-kp-brand shrink-0 mt-0.5" />
                      <div>
                        <p className="text-kp-text-secondary text-sm mb-2">{t("learnMore")}</p>
                        <Link
                          href={explanation.learnMoreUrl}
                          className="text-kp-brand hover:text-kp-brand text-sm font-medium underline underline-offset-2"
                          onClick={onClose}
                        >
                          {t("readMore")} {getLearnMoreTitle(explanation.learnMoreKey, isNorwegian ? "no" : "en")}
                        </Link>
                      </div>
                    </div>
                  </section>
                )}

                {/* Numbers */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-kp-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t("numbers")}
                  </h3>
                  <div className="bg-kp-bg-tertiary/50 rounded-xl overflow-hidden border border-kp-border">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-kp-border">
                        <tr>
                          <td className="px-4 py-3 text-kp-text-muted">{t("entryPrice")}</td>
                          <td className="px-4 py-3 text-right text-kp-text-primary font-medium tabular-nums">
                            {trade.entryPrice ? formatByMode(trade.entryPrice, trade.mode as TradingMode) : "—"}
                          </td>
                        </tr>
                        {trade.exitPrice && trade.side === "sell" && (
                          <tr>
                            <td className="px-4 py-3 text-kp-text-muted">{t("exitPrice")}</td>
                            <td className="px-4 py-3 text-right text-kp-text-primary font-medium tabular-nums">
                              {formatByMode(trade.exitPrice, trade.mode as TradingMode)}
                            </td>
                          </tr>
                        )}
                        {trade.stopLoss && (
                          <tr>
                            <td className="px-4 py-3 text-kp-text-muted">{t("stopLoss")}</td>
                            <td className="px-4 py-3 text-right text-kp-danger font-medium tabular-nums">
                              {formatByMode(trade.stopLoss, trade.mode as TradingMode)}
                            </td>
                          </tr>
                        )}
                        {trade.takeProfit && (
                          <tr>
                            <td className="px-4 py-3 text-kp-text-muted">{t("takeProfit")}</td>
                            <td className="px-4 py-3 text-right text-kp-success font-medium tabular-nums">
                              {formatByMode(trade.takeProfit, trade.mode as TradingMode)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-4 py-3 text-kp-text-muted">{t("fee")}</td>
                          <td className="px-4 py-3 text-right text-kp-text-secondary tabular-nums">
                            {trade.fee ? formatByMode(trade.fee, trade.mode as TradingMode) : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Strategy Parameters */}
                {getStrategyParams(trade) && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-kp-text-secondary uppercase tracking-wider">
                      {t("strategyParams")}
                    </h3>
                    <div className="bg-kp-bg-tertiary/50 rounded-lg p-3 border border-kp-border">
                      <p className="text-kp-text-secondary text-sm">{getStrategyParams(trade)}</p>
                    </div>
                  </section>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-kp-border">
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-kp-bg-tertiary hover:bg-kp-brand-hover rounded-xl text-kp-text-primary font-medium transition-colors"
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
