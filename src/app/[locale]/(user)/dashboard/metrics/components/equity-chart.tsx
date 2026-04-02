"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";

interface EquityPoint {
  date: string;
  equity: number;
}

interface EquityChartProps {
  data: EquityPoint[];
}

/**
 * Client-only equity curve chart.
 * SSR: false er påkrevd fordi Recharts bruker DOM-målinger som ikke finnes på server.
 */
export function EquityChart({ data }: EquityChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card data-testid="equity-chart">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Ingen data tilgjengelig</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="equity-chart">
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ChartWrapper height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={30} />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}
