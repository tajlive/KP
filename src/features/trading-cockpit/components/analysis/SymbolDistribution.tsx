"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { cn } from "@/lib/utils";
import { SURFACE, SEMANTIC_COLORS, BRAND_COLOR } from "@/lib/design/tokens";
import { BarChart3 } from "lucide-react";

interface SymbolDataPoint {
  symbol: string;
  pnl: number;
  trades: number;
}

type SymbolMetric = "pnl" | "trades";

interface SymbolDistributionProps {
  data: SymbolDataPoint[];
  className?: string;
}

export function SymbolDistribution({ data, className }: SymbolDistributionProps) {
  const t = useTranslations("trading");
  const [metric, setMetric] = React.useState<SymbolMetric>("pnl");

  const sortedData = React.useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => b[metric] - a[metric]);
    return copy;
  }, [data, metric]);

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
            {t("cockpit.analysis.chart.symbolTitle")}
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

  return (
    <Card
      className={cn(
        SURFACE.BG_CARD,
        "border-white/[0.06] rounded-2xl",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-white">
          {t("cockpit.analysis.chart.symbolTitle")}
        </CardTitle>
        <ToggleGroup
          type="single"
          value={metric}
          onValueChange={(value) => value && setMetric(value as SymbolMetric)}
          variant="outline"
          size="sm"
          className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5"
          aria-label={t("cockpit.analysis.chart.symbolTitle")}
        >
          <ToggleGroupItem
            value="pnl"
            className="text-xs text-gray-400 data-[state=on]:bg-white/[0.08] data-[state=on]:text-white border-0 rounded-md px-2.5 py-1 h-auto"
          >
            {t("cockpit.analysis.chart.togglePnl")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="trades"
            className="text-xs text-gray-400 data-[state=on]:bg-white/[0.08] data-[state=on]:text-white border-0 rounded-md px-2.5 py-1 h-auto"
          >
            {t("cockpit.analysis.chart.toggleTrades")}
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ChartWrapper height={300}>
          <BarChart data={sortedData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="symbol"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              interval={0}
              angle={sortedData.length > 6 ? 30 : 0}
              textAnchor={sortedData.length > 6 ? "start" : "middle"}
              height={sortedData.length > 6 ? 60 : 30}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) =>
                metric === "trades"
                  ? Number(value).toLocaleString("nb-NO")
                  : `kr ${Number(value).toLocaleString("nb-NO")}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161719",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                color: "#f8fafc",
              }}
              formatter={(value) => [
                metric === "trades"
                  ? Number(value ?? 0).toLocaleString("nb-NO")
                  : `kr ${Number(value ?? 0).toLocaleString("nb-NO")}`,
                t(metric === "trades" ? "cockpit.analysis.chart.trades" : "cockpit.analysis.chart.pnl"),
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey={metric} radius={[4, 4, 0, 0]} maxBarSize={48}>
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    metric === "trades"
                      ? BRAND_COLOR.DEFAULT
                      : entry.pnl >= 0
                        ? SEMANTIC_COLORS.positive
                        : SEMANTIC_COLORS.negative
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}
