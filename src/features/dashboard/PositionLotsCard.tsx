"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { formatRelativeTimeShort } from "@/lib/format/relative-time-short";
import { cn } from "@/lib/utils";

interface Lot {
  id: string;
  quantity: number;
  entryPrice: number;
  timestamp: string;
  originalQuantity: number;
  unrealizedPnl: number;
}

interface PositionData {
  ok: boolean;
  symbol: string | null;
  currentPrice: number | null;
  lots: Lot[];
  totalQuantity: number;
  weightedEntryPrice: number;
  totalUnrealizedPnl: number;
}

interface PositionLotsCardProps {
  locale: string;
}

export function PositionLotsCard({ locale }: PositionLotsCardProps) {
  const t = useTranslations("trading.positionLots");
  const [data, setData] = useState<PositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPosition() {
      try {
        const res = await fetch("/api/trading/position", {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as PositionData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPosition();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        <p className="text-slate-400">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-red-700/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300">{t("error")}</p>
        </div>
        <p className="text-xs text-red-400/60 font-mono">{error}</p>
      </div>
    );
  }

  if (!data || data.lots.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-500">{t("noPosition")}</p>
      </div>
    );
  }

  const isPositive = data.totalUnrealizedPnl >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">{t("title")}</h2>
          {data.symbol && data.currentPrice != null && (
            <p className="text-xs text-slate-500 mt-0.5">
              {data.symbol} @ $
              {data.currentPrice.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            isPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {t("totalUnrealizedPnL")}: {isPositive ? "+" : ""}
          {data.totalUnrealizedPnl.toFixed(2)}
        </div>
      </div>

      {/* Lots table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-800">
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t("lot")}
              </th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                {t("entryPrice")}
              </th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                {t("quantity")}
              </th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                {t("age")}
              </th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                {t("unrealizedPnL")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.lots.map((lot) => {
              const lotPositive = lot.unrealizedPnl >= 0;
              const age = formatRelativeTimeShort(
                new Date(lot.timestamp),
                locale,
              );
              return (
                <tr key={lot.id}>
                  <td className="py-3 text-slate-300 font-mono text-xs">
                    {lot.id.slice(0, 12)}…
                  </td>
                  <td className="py-3 text-right text-slate-300 tabular-nums">
                    ${lot.entryPrice.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-slate-300 tabular-nums">
                    {lot.quantity.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-slate-400 tabular-nums">
                    {age}
                  </td>
                  <td
                    className={cn(
                      "py-3 text-right font-semibold tabular-nums",
                      lotPositive ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {lotPositive ? "+" : ""}
                    {lot.unrealizedPnl.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      <div className="pt-2 border-t border-slate-800">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t("totalQuantity")}
            </p>
            <p className="text-sm font-semibold text-white tabular-nums">
              {data.totalQuantity.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t("weightedEntry")}
            </p>
            <p className="text-sm font-semibold text-white tabular-nums">
              ${data.weightedEntryPrice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t("totalUnrealizedPnL")}
            </p>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                isPositive ? "text-emerald-400" : "text-red-400",
              )}
            >
              {isPositive ? "+" : ""}
              {data.totalUnrealizedPnl.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
