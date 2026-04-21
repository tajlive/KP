"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";
import { useTranslations } from "next-intl";

interface MonteCarloData {
  probabilityOfProfit: number;
  probabilityOfRuin: number;
  medianReturn: number;
  meanReturn: number;
  confidenceInterval95: [number, number];
  percentiles: Record<number, number>;
  maxConsecutiveLosses: number;
  avgMaxConsecutiveLosses: number;
  simulationsRun: number;
  executionTimeMs: number;
}

interface MonteCarloPanelProps {
  data: MonteCarloData;
}

export function MonteCarloPanel({ data }: MonteCarloPanelProps) {
  const t = useTranslations("trading.monteCarlo");

  const profitPct = data.probabilityOfProfit * 100;
  const ruinPct = data.probabilityOfRuin * 100;
  const ci = data.confidenceInterval95;

  const percentileData = [
    { name: "P5", value: data.percentiles[5] ?? 0 },
    { name: "P25", value: data.percentiles[25] ?? 0 },
    { name: "P50", value: data.percentiles[50] ?? 0 },
    { name: "P75", value: data.percentiles[75] ?? 0 },
    { name: "P95", value: data.percentiles[95] ?? 0 },
  ];

  const barColors = ["#94a3b8", "#64748b", "#3b82f6", "#64748b", "#94a3b8"];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t("probabilityOfProfit")}</div>
            <div
              className={`mt-1 text-3xl font-bold ${
                profitPct > 50 ? "text-green-400" : "text-red-400"
              }`}
            >
              {profitPct.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t("probabilityOfRuin")}</div>
            <div
              className={`mt-1 text-3xl font-bold ${
                ruinPct > 5 ? "text-red-400" : "text-green-400"
              }`}
            >
              {ruinPct.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t("medianReturn")}</div>
            <div className="mt-1 text-3xl font-bold">
              {data.medianReturn.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t("meanReturn")}</div>
            <div className="mt-1 text-3xl font-bold">
              {data.meanReturn.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("confidenceInterval")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ChartWrapper height={256}>
              <BarChart data={percentileData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, t("return")]}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {percentileData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("riskSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-muted-foreground">{t("ci95Range")}</span>
              <span className="font-medium">
                [{ci[0].toFixed(1)}%, {ci[1].toFixed(1)}%]
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-muted-foreground">{t("maxConsecutiveLosses")}</span>
              <span className="font-medium">{data.maxConsecutiveLosses}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-muted-foreground">
                {t("avgMaxConsecutiveLosses")}
              </span>
              <span className="font-medium">
                {data.avgMaxConsecutiveLosses.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("simulationsRun")}</span>
              <span className="font-medium">
                {data.simulationsRun.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
