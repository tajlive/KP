"use client";

import { useTranslations } from "next-intl";
import { useTradingStore } from "@/store/tradingStore";
import { Button } from "@/shared/ui/button";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { motion } from "framer-motion";

export default function PositionsTable() {
  const t = useTranslations("trading.positions");
  const { positions, closePosition, marketData } = useTradingStore();

  if (positions.length === 0) {
    return (
      <div className="bg-kp-bg-secondary rounded-2xl border border-kp-border p-8 text-center">
        <div className="w-16 h-16 bg-kp-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-kp-text-muted" />
        </div>
        <h3 className="text-lg font-bold text-kp-text-primary mb-2">
          {t("empty.title")}
        </h3>
        <p className="text-kp-text-muted">
          {t("empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-kp-bg-secondary rounded-2xl border border-kp-border overflow-hidden">
      <div className="p-4 border-b border-kp-border">
        <h3 className="text-lg font-bold text-kp-text-primary">
          {t("titleCount", { count: positions.length })}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-kp-bg-tertiary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.symbol")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.side")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.size")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.entry")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.current")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.pnl")}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-kp-text-muted uppercase">
                {t("columns.action")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kp-border">
            {positions.map((position, index) => (
              <motion.tr
                key={position.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="hover:bg-kp-bg-hover"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-kp-text-primary">
                      {position.symbol}
                    </span>
                    <span className="text-xs text-kp-text-muted" aria-label={`Leverage ${position.leverage}x`}>
                      {position.leverage}x
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      position.side === "long"
                        ? "bg-kp-success-bg text-kp-success"
                        : "bg-kp-danger-bg text-kp-danger"
                    }`}
                  >
                    {position.side === "long" ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {position.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-mono text-kp-text-primary">
                    {(position.quantity ?? 0).toFixed(4)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-mono text-kp-text-muted">
                    ${position.entryPrice.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <motion.span
                    key={position.currentPrice}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-mono font-medium text-kp-text-primary"
                  >
                    ${position.currentPrice.toLocaleString()}
                  </motion.span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div
                    className={`font-mono font-bold ${
                      position.pnl >= 0 ? "text-kp-success" : "text-kp-danger"
                    }`}
                  >
                    {position.pnl >= 0 ? "+" : ""}
                    ${(position.pnl ?? 0).toFixed(2)}
                    <span className="text-xs ml-1">
                      ({position.pnlPercent >= 0 ? "+" : ""}
                      {(position.pnlPercent ?? 0).toFixed(2)}%)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closePosition(position.id)}
                    aria-label={t("closeAria", { symbol: position.symbol })}
                    className="text-kp-danger border-kp-danger/30 hover:bg-kp-danger-bg min-h-[36px]"
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t("close")}
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total P&L */}
      <div className="p-4 border-t border-kp-border bg-kp-bg-tertiary">
        <div className="flex justify-between items-center">
          <span className="text-sm text-kp-text-muted">
            {t("totalUnrealizedPnL")}
          </span>
          <span
            className={`text-xl font-bold font-mono ${
              positions.reduce((sum, p) => sum + p.pnl, 0) >= 0
                ? "text-kp-success"
                : "text-kp-danger"
            }`}
          >
            {positions.reduce((sum, p) => sum + p.pnl, 0) >= 0 ? "+" : ""}
            ${positions.reduce((sum, p) => sum + p.pnl, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
