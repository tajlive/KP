"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cn } from "@/lib/utils";
import { SURFACE, BRAND_COLOR } from "@/lib/design/tokens";
import { BarChart3 } from "lucide-react";

interface PnLDataPoint {
  date: string;
  pnl: number;
  trades: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
  className?: string;
}

export function PnLChart({ data, className }: PnLChartProps) {
  const t = useTranslations("trading");
  const locale = useLocale();

  const chartData = React.useMemo(
    () =>
      data.map((item) => {
        const date = new Date(item.date);
        const displayDate = Number.isNaN(date.getTime())
          ? item.date
          : date.toLocaleDateString(locale, { month: "short", day: "numeric" });
        return { ...item, displayDate };
      }),
    [data, locale],
  );

  if (data.length === 0) {
    return (
      <Card
        className={cn(
          SURFACE.BG_CARD,
          "border-white/[0.06] rounded-2xl",
          className,
        )}
      >
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">
            {t("cockpit.analysis.chart.pnlTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BarChart3 className="w-8 h-8 text-gray-500" />}
            title={t("cockpit.analysis.empty.title")}
            description={t("cockpit.analysis.empty.description")}
          />
        </CardContent>
      </Card>
    );
  }

  const gradientId = "pnlAreaGradient";

  return (
    <Card
      className={cn(
        SURFACE.BG_CARD,
        "border-white/[0.06] rounded-2xl",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">
          {t("cockpit.analysis.chart.pnlTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartWrapper height={300}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND_COLOR.DEFAULT} stopOpacity={0.35} />
                <stop offset="95%" stopColor={BRAND_COLOR.DEFAULT} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `kr ${Number(value).toLocaleString("nb-NO")}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161719",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                color: "#f8fafc",
              }}
              formatter={(value) => [
                `kr ${Number(value ?? 0).toLocaleString("nb-NO")}`,
                t("cockpit.analysis.chart.pnl"),
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={BRAND_COLOR.DEFAULT}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, strokeWidth: 0, fill: BRAND_COLOR.DEFAULT }}
            />
          </AreaChart>
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}
