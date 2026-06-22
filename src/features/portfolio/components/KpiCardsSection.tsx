import { KpiCard } from "./KpiCard";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { AnalyticsPayload } from "../TradingResultsDashboard";

interface KpiCardsSectionProps {
  data: AnalyticsPayload;
  totalPnl: number;
  pnlPositive: boolean;
  formatDisplay: (v: number) => string;
  t: (key: string) => string;
}

export function KpiCardsSection({
  data,
  totalPnl,
  pnlPositive,
  formatDisplay,
  t,
}: KpiCardsSectionProps) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={pnlPositive ? TrendingUp : TrendingDown}
          label={t("kpi.totalPnl")}
          value={formatDisplay(totalPnl)}
          positive={pnlPositive}
          index={0}
        />
        <KpiCard
          icon={BarChart3}
          label={t("kpi.winRate")}
          value={
            data.aggregates.winRateRealizedPct != null
              ? `${data.aggregates.winRateRealizedPct}%`
              : "—"
          }
          positive={
            data.aggregates.winRateRealizedPct == null
              ? true
              : data.aggregates.winRateRealizedPct >= 50
          }
          index={1}
        />
        <KpiCard
          icon={Activity}
          label={t("kpi.trades")}
          value={String(data.tradeCount)}
          positive
          index={2}
        />
        <KpiCard
          icon={ArrowUpRight}
          label={t("kpi.bestDay")}
          value={
            data.bestDay
              ? `${data.bestDay.day} · ${formatDisplay(data.bestDay.pnl)}`
              : "—"
          }
          positive
          index={3}
        />
      </section>

      {data.tradeCount > 0 &&
      data.aggregates.totalRealizedPnl === 0 &&
      data.aggregates.noRealizedPnlCount > 0 ? (
        <p className="text-xs text-slate-500 -mt-4 max-w-3xl">
          {t("kpi.totalPnlHint")}
        </p>
      ) : null}
    </>
  );
}
