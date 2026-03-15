"use client";

/**
 * StrategyDetailPage — Full-screen strategy detail view
 * App Store-style with performance chart, reviews, and action button.
 */

import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface StrategyDetailPageProps {
  strategy: {
    id: string;
    name: string;
    description: string;
    creatorName: string;
    creatorAvatar?: string;
    rating: number;
    reviewCount: number;
    subscriberCount: number;
    strategyType: string;
    avgReturn: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    timeframe: string;
    riskLevel: "low" | "medium" | "high";
    features: string[];
    monthlyPrice?: number;
    backtestMonths: number;
  };
  reviews?: {
    id: string;
    userName: string;
    rating: number;
    text: string;
    createdAt: string;
  }[];
  onBack: () => void;
  onSubscribe: () => void;
}

const RISK_COLORS = {
  low: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Lav",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    label: "Moderat",
  },
  high: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    label: "Høy",
  },
};

function formatNOK(n: number) {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function StrategyDetailPage({
  strategy,
  reviews = [],
  onBack,
  onSubscribe,
}: StrategyDetailPageProps) {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const risk = RISK_COLORS[strategy.riskLevel];
  const isPositive = strategy.avgReturn >= 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/10 dark:from-cyan-500/5 dark:via-blue-500/3 dark:to-indigo-500/5" />
        <div className="relative z-10 px-5 pt-[env(safe-area-inset-top,12px)] pb-6">
          {/* Back button */}
          <button
            onClick={onBack}
            className="p-2 -ml-2 mb-4 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-colors"
            aria-label="Tilbake til oversikt"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Strategy header */}
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600
                           flex items-center justify-center shrink-0
                           shadow-[0_4px_16px_rgba(59,130,246,0.25)]"
            >
              <BarChart3 className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight mb-1">
                {strategy.name}
              </h1>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-2">
                av {strategy.creatorName} · {strategy.strategyType}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star
                    className="w-4 h-4 text-amber-500 fill-amber-500"
                    aria-hidden="true"
                  />
                  <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
                    {strategy.rating.toFixed(1)}
                  </span>
                  <span className="text-[13px] text-gray-400">
                    ({strategy.reviewCount})
                  </span>
                </div>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <div className="flex items-center gap-1 text-[13px] text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  {strategy.subscriberCount} brukere
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance stats */}
      <div className="px-5 py-4">
        <div
          className="grid grid-cols-4 gap-3 p-4 rounded-2xl
                       bg-gray-50 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50"
        >
          <div className="text-center">
            <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-wider">
              Snitt
            </p>
            <p
              className={`text-[20px] font-bold tabular-nums ${isPositive ? "text-emerald-500" : "text-rose-500"}`}
            >
              {isPositive ? "+" : ""}
              {strategy.avgReturn}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-wider">
              Drawdown
            </p>
            <p className="text-[20px] font-bold tabular-nums text-rose-500">
              -{strategy.maxDrawdown}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-wider">
              Win
            </p>
            <p className="text-[20px] font-bold tabular-nums text-gray-900 dark:text-white">
              {strategy.winRate}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-wider">
              Trades
            </p>
            <p className="text-[20px] font-bold tabular-nums text-gray-900 dark:text-white">
              {strategy.totalTrades}
            </p>
          </div>
        </div>
      </div>

      {/* Info tags */}
      <div className="px-5 flex flex-wrap gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ${risk.bg} ${risk.text}`}
        >
          <Shield className="w-3.5 h-3.5" />
          Risiko: {risk.label}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Clock className="w-3.5 h-3.5" />
          {strategy.timeframe}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          <Zap className="w-3.5 h-3.5" />
          {strategy.backtestMonths}mnd backtest
        </span>
      </div>

      {/* Description */}
      <div className="px-5 mb-6">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-2">
          Beskrivelse
        </h3>
        <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
          {strategy.description}
        </p>
      </div>

      {/* Features */}
      <div className="px-5 mb-6">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-3">
          Funksjoner
        </h3>
        <div className="space-y-2">
          {(showAllFeatures
            ? strategy.features
            : strategy.features.slice(0, 4)
          ).map((feat, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
              <span className="text-[15px] text-gray-600 dark:text-gray-400">
                {feat}
              </span>
            </div>
          ))}
          {strategy.features.length > 4 && (
            <button
              onClick={() => setShowAllFeatures(!showAllFeatures)}
              className="flex items-center gap-1 text-[13px] font-medium text-blue-600 dark:text-blue-400 mt-1"
            >
              {showAllFeatures
                ? "Vis mindre"
                : `Vis alle (${strategy.features.length})`}
              {showAllFeatures ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-3">
            Anmeldelser ({reviews.length})
          </h3>
          <div className="space-y-3">
            {reviews.slice(0, 3).map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[15px] text-gray-900 dark:text-white">
                    {review.userName}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-600"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer for sticky CTA */}
      <div className="h-24" />

      {/* Sticky CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40
                     px-5 pt-4 pb-[max(env(safe-area-inset-bottom,16px),16px)]
                     bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl
                     border-t border-gray-200/50 dark:border-gray-800/50"
      >
        <div className="flex items-center gap-4">
          {strategy.monthlyPrice && (
            <div className="text-left">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                Pris
              </p>
              <p className="text-[17px] font-bold text-gray-900 dark:text-white tabular-nums">
                {formatNOK(strategy.monthlyPrice)}/mnd
              </p>
            </div>
          )}
          <button
            onClick={onSubscribe}
            className="flex-1 min-h-[52px] px-6
                       bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500
                       text-white font-semibold text-[17px]
                       rounded-2xl
                       shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                       active:scale-[0.97]
                       transition-all duration-200"
          >
            {strategy.monthlyPrice ? "Abonner" : "Bruk gratis"}
          </button>
        </div>
      </div>
    </div>
  );
}
