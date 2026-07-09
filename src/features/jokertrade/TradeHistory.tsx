"use client";

import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface TradeRecord {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number | null;
  pnl_percent: number | null;
  closed_at: string;
  created_at: string;
}

interface TradeHistoryProps {
  trades: TradeRecord[];
}

function formatNOK(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("no-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}${formatted} kr`;
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A2D35] bg-[#1A1D26]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Trade History
        </h2>
        <div className="flex flex-col items-center justify-center py-8">
          <Clock className="mb-2 h-8 w-8 text-[#6B7280]" />
          <p className="font-sans text-sm text-[#6B7280]">
            Ingen trade-historikk ennå
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A2D35] bg-[#1A1D26]/80 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Trade History
        </h2>
        <span className="font-mono text-xs text-[#6B7280]">
          Siste {trades.length}
        </span>
      </div>

      <div className="space-y-2">
        {trades.map((trade) => {
          const isLong = trade.side === "buy";
          const pnlNum = Number(trade.pnl ?? 0);
          const isProfit = pnlNum >= 0;

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between rounded-lg border border-[#2A2D35] bg-[#15171B] px-4 py-3 transition-colors hover:border-[#3B82F6]/20"
            >
              {/* Left: symbol + side */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-[#F9FAFB]">
                  {trade.symbol}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    isLong
                      ? "bg-[#064E3B] text-[#10B981]"
                      : "bg-[#7F1D1D] text-[#EF4444]"
                  }`}
                >
                  {isLong ? "LONG" : "SHORT"}
                </span>
              </div>

              {/* Center: time + entry */}
              <div className="hidden text-center sm:block">
                <p className="font-sans text-xs text-[#6B7280]">
                  {formatDistanceToNow(new Date(trade.closed_at ?? trade.created_at), {
                    addSuffix: true,
                    locale: nb,
                  })}
                </p>
                <p className="font-mono text-[10px] tabular-nums text-[#6B7280]">
                  @ {Number(trade.price).toLocaleString("no-NO", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* Right: P&L */}
              <div className="text-right">
                <p
                  className={`font-mono text-sm font-bold tabular-nums ${
                    isProfit ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {formatNOK(pnlNum)}
                </p>
                {trade.pnl_percent !== null && (
                  <p
                    className={`font-mono text-[10px] tabular-nums ${
                      isProfit ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {Number(trade.pnl_percent) >= 0 ? "+" : ""}
                    {Number(trade.pnl_percent).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
