"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Clock, Info } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { tradeStatusColor } from "./TradeTable";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradeCardsProps {
  trades: Trade[];
  isLoading?: boolean;
  onCardClick?: (trade: Trade) => void;
  className?: string;
}

function pnlColor(value: number | null): string {
  if (value === null || value === 0) return "text-zinc-500";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

function sideIcon(side: string) {
  return side === "buy" ? (
    <ArrowDownRight className="size-4 text-blue-400" />
  ) : (
    <ArrowUpRight className="size-4 text-rose-400" />
  );
}

export function TradeCards({ trades, isLoading = false, onCardClick, className }: TradeCardsProps) {
  const t = useTranslations("trading");
  const locale = useLocale();

  const fmtNok = (v: number | null) =>
    v === null ? "—" : new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(v);

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    const now = new Date();
    const diffMin = (now.getTime() - date.getTime()) / 60000;
    if (diffMin < 1) return "Nå";
    if (diffMin < 60) return `${Math.floor(diffMin)}m siden`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}t siden`;
    return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  };

  if (isLoading && trades.length === 0) {
    return (
      <div className={cn("md:hidden space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
            <Skeleton variant="text" className="h-5 w-24" />
            <Skeleton variant="text" className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("md:hidden space-y-2.5", className)} data-testid="trade-cards">
      {trades.map((trade) => {
        const isBuy = trade.side === "buy";
        const hasPnl = trade.effective_pnl !== null && trade.effective_pnl !== 0;

        return (
          <button
            key={trade.id}
            onClick={() => onCardClick?.(trade)}
            className={cn(
              "w-full text-left rounded-2xl p-4 transition-all duration-200",
              "bg-gradient-to-br from-white/[0.04] to-white/[0.01]",
              "border border-white/[0.06] hover:border-white/[0.12]",
              "active:scale-[0.98] shadow-sm hover:shadow-md",
            )}
          >
            {/* Top row: pair + time */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{trade.trading_pair}</span>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                  isBuy ? "bg-blue-400/10 text-blue-400" : "bg-rose-400/10 text-rose-400"
                )}>
                  {sideIcon(trade.side)}
                  {isBuy ? "Kjøp" : "Salg"}
                </span>
              </div>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="size-3" />
                {fmtDate(trade.executed_at)}
              </span>
            </div>

            {/* Middle: price + quantity */}
            <div className="flex items-center gap-4 mb-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Pris</span>
                <p className="text-sm font-medium text-white">{fmtNok(trade.price)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Antall</span>
                <p className="text-sm font-medium text-white">{trade.quantity ?? "—"}</p>
              </div>
              <div className="ml-auto text-right">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {hasPnl ? "Gevinst/tap" : "Status"}
                </span>
                {hasPnl ? (
                  <p className={cn("text-sm font-bold", pnlColor(trade.effective_pnl))}>
                    {trade.effective_pnl! > 0 ? "+" : ""}{fmtNok(trade.effective_pnl)}
                  </p>
                ) : (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                    tradeStatusColor(trade.status)
                  )}>
                    {trade.status === "filled" ? "✓ Utført" : trade.status}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom: PnL detail (only for sell trades with profit) */}
            {hasPnl && (
              <div className="flex items-center gap-1 text-xs text-zinc-600">
                <Info className="size-3" />
                {trade.effective_pnl! > 0 ? "Tjente penger på dette salget" : "Tapte penger på dette salget"}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
