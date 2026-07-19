"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TradingSession } from "@/features/trading/paper/PaperTradingList";

interface RecentTradesProps {
  sessions: TradingSession[];
}

export function RecentTrades({ sessions }: RecentTradesProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.recentTrades");
  const recent = sessions.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#0A0D12] border border-[#1E2530] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{t("title")}</h3>
        <Link href={`/${locale}/trade`} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
          {t("viewAll")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map((s) => {
          const pnl = typeof s.realized_pnl === "number" ? s.realized_pnl : null;
          return (
            <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-[#1E2530]/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${s.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                  {s.side?.toUpperCase() ?? "—"}
                </span>
                <span className="text-sm text-white">{s.trading_pair}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-mono ${pnl !== null && pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pnl !== null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} kr` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
