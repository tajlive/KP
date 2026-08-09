/**
 * MAX LEVERAGE PANEL — Dashboard UI
 * 
 * Viser 5x leveraged grid status på klarpakke.no.
 * Stor, tydelig visning av leverage, liquidation, P&L.
 * 
 * @module features/dashboard
 * @version 1.0.0
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, TrendingUp, TrendingDown, Zap } from "lucide-react";

interface MaxLeveragePanelProps {
  sessionId: string;
}

export function MaxLeveragePanel({ sessionId }: MaxLeveragePanelProps) {
  const t = useTranslations("dashboard.maxLeverage");
  
  const { data, isLoading } = useQuery({
    queryKey: ["max-leverage", sessionId],
    queryFn: () => fetch(`/api/trading/max-leverage/${sessionId}`).then(r => r.json()),
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="p-4 text-center">Laster...</div>;

  const { position, leverage, liquidationPrice, dailyPnl, killSwitch } = data;

  const isNearLiquidation = liquidationPrice && 
    Math.abs(position?.current_price - liquidationPrice) / position?.current_price < 0.05;
  
  const pnlColor = dailyPnl >= 0 ? "text-green-500" : "text-red-500";
  const pnlIcon = dailyPnl >= 0 ? <TrendingUp /> : <TrendingDown />;

  return (
    <div className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-orange-700 text-xl font-bold">
          <Zap className="h-6 w-6" />
          {t("title")} — {leverage}x
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isNearLiquidation ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {isNearLiquidation ? t("nearLiquidation") : t("active")}
        </span>
      </div>
      
      {/* Leverage + Liquidation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">{t("leverage")}</div>
          <div className="text-3xl font-bold text-orange-600">{leverage}x</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">{t("liquidation")}</div>
          <div className={`text-2xl font-bold ${isNearLiquidation ? "text-red-600" : "text-gray-700"}`}>
            {liquidationPrice?.toFixed(2) || "—"}
          </div>
        </div>
      </div>

      {/* P&L */}
      <div className="text-center p-6 bg-white rounded-lg border">
        <div className="text-sm text-gray-500">{t("dailyPnl")}</div>
        <div className={`text-4xl font-bold flex items-center justify-center gap-2 ${pnlColor}`}>
          {pnlIcon}
          {dailyPnl?.toFixed(2) || "0.00"}%
        </div>
      </div>

      {/* Kill Switch */}
      {killSwitch?.triggered && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">{t("killSwitchActive")}</span>
        </div>
      )}

      {/* Stopp-knapp */}
      <button 
        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-lg transition-colors"
        onClick={() => fetch(`/api/trading/max-leverage/${sessionId}/stop`, { method: "POST" })}
      >
        {t("stopAll")}
      </button>
    </div>
  );
}
