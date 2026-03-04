"use client";

import { useBotStore } from "@/store/bot-store";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";

type Period = "day" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  day: "24t",
  week: "7d",
  month: "30d",
  all: "Totalt",
};

function formatNOK(value: number): string {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AggregatePnLWidget() {
  const [period, setPeriod] = useState<Period>("all");
  const aggregatePnl = useBotStore((s) => s.aggregatePnl);
  const bots = useBotStore((s) => s.bots);

  const pnl = aggregatePnl[period];
  const isPositive = pnl >= 0;

  const totalCapital = bots.reduce((sum, b) => sum + b.currentCapitalNok, 0);
  const totalStarting = bots.reduce((sum, b) => sum + b.startingCapitalNok, 0);
  const pnlPct =
    totalStarting > 0
      ? ((totalCapital - totalStarting) / totalStarting) * 100
      : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total P&L
          </span>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <p
            className={`text-3xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
          >
            {formatNOK(pnl)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
            >
              {pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </span>
            <span className="text-xs text-gray-400">
              {PERIOD_LABELS[period]}
            </span>
          </div>
        </div>

        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Total kapital
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatNOK(totalCapital)}
          </p>
        </div>
      </div>
    </div>
  );
}
