"use client";

import { Card } from "@/components/ui/card";
import { BacktestResult } from "@/lib/backtest/backtest-engine";

export function BacktestMetrics({ result }: { result: BacktestResult }) {
  if (!result) return null;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4 text-center">
          Trading Stats
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Trades</span>
            <span className="font-bold">{result.totalTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Winning Trades</span>
            <span className="font-bold text-green-600">
              {result.winningTrades}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Losing Trades</span>
            <span className="font-bold text-red-600">
              {result.losingTrades}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Profit Factor</span>
            <span className="font-bold">{result.profitFactor?.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4 text-center">
          Risk Metrics
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Max Drawdown</span>
            <span className="font-bold text-red-600">
              {result.maxDrawdown?.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Max Pos Size</span>
            <span className="font-bold">
              {result.maxPositionSize?.toFixed(0)} NOK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Pos Size</span>
            <span className="font-bold">
              {result.avgPositionSize?.toFixed(0)} NOK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Consec. Losses</span>
            <span className="font-bold">{result.consecutiveLosses}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4 text-center">
          Performance
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Win</span>
            <span className="font-bold text-green-600">
              {result.avgWin?.toFixed(0)} NOK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Loss</span>
            <span className="font-bold text-red-600">
              {result.avgLoss?.toFixed(0)} NOK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Return (NOK)</span>
            <span className="font-bold">
              {(result.totalReturnNOK / 1000).toFixed(1)}k
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">vs HODL</span>
            <span
              className={`font-bold ${result.vsHodlReturn > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {result.vsHodlReturn?.toFixed(1)}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
