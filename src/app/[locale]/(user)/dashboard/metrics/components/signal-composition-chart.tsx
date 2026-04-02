"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";

interface ScoreData {
  name: string;
  TA: number;
  AI: number;
  Regime: number;
}

interface SignalCompositionChartProps {
  data: ScoreData[];
}

/**
 * Client-only signal composition bar chart.
 * SSR: false er påkrevd fordi Recharts bruker DOM-målinger som ikke finnes på server.
 */
export function SignalCompositionChart({ data }: SignalCompositionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signal Composition</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Ingen signaldata tilgjengelig</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Composition</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ChartWrapper height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="TA" fill="#3b82f6" />
            <Bar dataKey="AI" fill="#8b5cf6" />
            <Bar dataKey="Regime" fill="#10b981" />
          </BarChart>
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}
