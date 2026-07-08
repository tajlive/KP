"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Clock, Info } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Trade } from "@/features/trading-cockpit/types";

interface TradeTableProps {
  trades: Trade[];
  isLoading?: boolean;
  error?: { message: string } | null;
  onRowClick?: (trade: Trade) => void;
  className?: string;
}

export function tradeStatusColor(status: string): string {
  switch (status) {
    case "filled": return "bg-emerald-400/10 text-emerald-400";
    case "pending": return "bg-amber-400/10 text-amber-400";
    case "failed":  return "bg-rose-400/10 text-rose-400";
    default:        return "bg-zinc-500/10 text-zinc-400";
  }
}

export function pnlClass(value: number | null): string {
  if (value === null || value === 0) return "text-zinc-500";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

export function sidePill(side: string, label: string) {
  return side === "buy" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-400/10 text-blue-400">
      <ArrowDownRight className="size-3" />{label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-400/10 text-rose-400">
      <ArrowUpRight className="size-3" />{label}
    </span>
  );
}

export function TradeTable({ trades, isLoading = false, error = null, onRowClick, className }: TradeTableProps) {
  const t = useTranslations("trading");
  const locale = useLocale();

  const fmtNok = (v: number | null) =>
    v === null ? "—" : new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(v);

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading && trades.length === 0) {
    return <div className={cn("hidden md:block space-y-2", className)} data-testid="trade-table-skeleton">
      {[1,2,3,4,5].map(i => <Skeleton key={i} variant="text" className="h-12 w-full rounded-xl" />)}
    </div>;
  }

  if (error && trades.length === 0) {
    return <div className={cn("hidden md:block text-center py-12 text-zinc-500", className)}>{error.message}</div>;
  }

  return (
    <div className={cn("hidden md:block", className)} data-testid="trade-table">
      {/* Glassmorphism card */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {[
                  { label: "Par", info: "Hvilket kryptopar som ble handlet" },
                  { label: "Handling", info: "Kjøp eller salg" },
                  { label: "Pris", info: "Pris per enhet" },
                  { label: "Antall", info: "Hvor mange enheter" },
                  { label: "Gevinst/tap", info: "Resultat ved salg. Kjøp har ingen gevinst/tap før de selges." },
                  { label: "Tid", info: "Når handelen skjedde" },
                ].map((col) => (
                  <th key={col.label} className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1 group/tip cursor-help" title={col.info}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {col.label}
                      </span>
                      <Info className="size-3 text-zinc-700 group-hover/tip:text-zinc-400 transition-colors" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isBuy = trade.side === "buy";
                const hasPnl = trade.effective_pnl !== null && trade.effective_pnl !== 0;

                return (
                  <tr
                    key={trade.id}
                    onClick={() => onRowClick?.(trade)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-white">{trade.trading_pair}</span>
                    </td>
                    <td className="px-4 py-3">
                      {sidePill(trade.side, isBuy ? "Kjøp" : "Salg")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-zinc-200">{fmtNok(trade.price)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">{trade.quantity ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {hasPnl ? (
                        <span className={cn("text-sm font-bold", pnlClass(trade.effective_pnl))}>
                          {trade.effective_pnl! > 0 ? "+" : ""}{fmtNok(trade.effective_pnl)}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-600">
                          {isBuy ? "—" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-zinc-500">
                        <Clock className="size-3" />
                        {fmtDate(trade.executed_at)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
