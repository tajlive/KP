/**
 * MAKS AGGRESSIV PANEL — Dashboard UI
 * 
 * Viser 5x leveraged grid SOL status på klarpakke.no.
 * Ekstremt tydelig visning — høy risiko krever høy synlighet.
 * 
 * @module features/dashboard
 * @version 1.0.0
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, TrendingUp, TrendingDown, Zap, Flame } from "lucide-react";

interface MaxAggressivePanelProps {
  sessionId: string;
}

export function MaxAggressivePanel({ sessionId }: MaxAggressivePanelProps) {
  const t = useTranslations("dashboard.maxAggressive");
  
  const { data, isLoading } = useQuery({
    queryKey: ["max-aggressive", sessionId],
    queryFn: () => fetch(`/api/trading/max-aggressive/${sessionId}`).then(r => r.json()),
    refetchInterval: 2000, // Oppdater hvert 2. sekund — ekstremt aktivt
  });

  if (isLoading) return <div className="p-6 text-center text-lg">Laster...</div>;

  const { 
    position, 
    leverage, 
    symbol = "SOL",
    gridRange = 1.5,
    liquidationPrice, 
    dailyPnl, 
    tradesToday = 0,
    killSwitch,
    autoReduced = false
  } = data || {};

  const isNearLiquidation = liquidationPrice && position?.current_price && 
    Math.abs(position.current_price - liquidationPrice) / position.current_price < 0.05;
  
  const pnlColor = dailyPnl >= 0 ? "text-green-500" : "text-red-500";
  const pnlIcon = dailyPnl >= 0 ? <TrendingUp /> : <TrendingDown />;

  return (
    <div className="border-4 border-red-500 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 space-y-6">
      {/* Header — MAKS AGGRESSIV */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-8 w-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-red-700">
              {t("title")} — {symbol}
            </h2>
            <p className="text-red-600 font-medium">
              {t("subtitle")}: {leverage}x | ±{gridRange}%
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full text-lg font-bold ${
          isNearLiquidation ? "bg-red-600 text-white" : 
          killSwitch?.triggered ? "bg-orange-500 text-white" : 
          "bg-green-500 text-white"
        }`}>
          {isNearLiquidation ? t("nearLiquidation") : 
           killSwitch?.triggered ? t("killSwitch") : 
           t("active")}
        </div>
      </div>

      {/* Auto-redusert varsling */}
      {autoReduced && (
        <div className="p-4 bg-orange-100 border-2 border-orange-400 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          <div>
            <div className="font-bold text-orange-800">{t("autoReduced")}</div>
            <div className="text-orange-700">{t("leverageReduced")}: 5x → 3x</div>
          </div>
        </div>
      )}

      {/* Hovedmetrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white rounded-lg border-2 border-red-200">
          <div className="text-sm text-gray-600">{t("leverage")}</div>
          <div className="text-4xl font-bold text-red-600">{leverage}x</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border-2 border-red-200">
          <div className="text-sm text-gray-600">{t("liquidation")}</div>
          <div className={`text-2xl font-bold ${isNearLiquidation ? "text-red-600" : "text-gray-800"}`}>
            {liquidationPrice?.toFixed(2) || "—"}
          </div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border-2 border-red-200">
          <div className="text-sm text-gray-600">{t("tradesToday")}</div>
          <div className="text-3xl font-bold text-blue-600">{tradesToday}</div>
        </div>
      </div>

      {/* P&L — stor visning */}
      <div className="text-center p-8 bg-white rounded-lg border-2 border-red-200">
        <div className="text-lg text-gray-600 mb-2">{t("dailyPnl")}</div>
        <div className={`text-6xl font-bold flex items-center justify-center gap-4 ${pnlColor}`}>
          {pnlIcon}
          {dailyPnl?.toFixed(2) || "0.00"}%
        </div>
      </div>

      {/* Kill Switch aktiv */}
      {killSwitch?.triggered && (
        <div className="p-4 bg-red-600 text-white rounded-lg text-center">
          <div className="text-xl font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            {t("killSwitchActive")}
          </div>
          <div className="text-red-100 mt-1">
            {t("killSwitchReason")}: {killSwitch.daily_loss}% {t("dailyLoss")}
          </div>
        </div>
      )}

      {/* STOPP ALT — svært stor knapp */}
      <button 
        className="w-full py-6 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded-xl transition-colors shadow-lg"
        onClick={() => fetch(`/api/trading/max-aggressive/${sessionId}/stop`, { method: "POST" })}
      >
        🛑 {t("stopAll")}
      </button>

      {/* Parametere */}
      <div className="text-center text-sm text-gray-500">
        {t("parameters")}: {symbol} | {leverage}x | ±{gridRange}% | Kill: 3% | Rebalance: 2t
      </div>
    </div>
  );
}
