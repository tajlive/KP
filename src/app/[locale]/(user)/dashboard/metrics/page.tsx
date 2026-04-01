"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";

interface BacktestMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
}

interface EquityPoint {
  timestamp: number;
  equity: number;
}

interface EnsembleSignal {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  scores: {
    ta: number;
    ai: number;
    regime: number;
  };
  metadata: {
    timestamp: string;
  };
}

export default function MetricsPage() {
  const [backtest, setBacktest] = useState<{
    metrics: BacktestMetrics;
    equityCurve: EquityPoint[];
    strategyName: string;
    symbol: string;
  } | null>(null);
  const [signals, setSignals] = useState<EnsembleSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("BTCUSDT");

  const runBacktest = async (sym: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          strategy: "ENSEMBLE_AI",
          interval: "1h",
          period: 90,
          initialCapital: 10000,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setBacktest({
          metrics: data.metrics,
          equityCurve: data.equityCurve,
          strategyName: data.strategyName || "Ensemble AI",
          symbol: data.symbol,
        });
      }

      // Fetch latest ensemble signals
      const sigRes = await fetch("/api/ai/ensemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });
      const sigData = await sigRes.json();
      if (!sigData.error) {
        setSignals([sigData]);
      }
    } catch (err) {
      console.error("Metrics load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBacktest(symbol);
  }, [symbol]);

  const equityData = useMemo(() => {
    if (!backtest?.equityCurve) return [];
    return backtest.equityCurve.map((p) => ({
      date: new Date(p.timestamp).toLocaleDateString(),
      equity: Number(p.equity.toFixed(2)),
    }));
  }, [backtest]);

  const scoreData = useMemo(() => {
    return signals.map((s) => ({
      name: s.symbol,
      TA: s.scores.ta,
      AI: s.scores.ai,
      Regime: s.scores.regime,
    }));
  }, [signals]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Profit Metrics</h1>
          <p className="text-muted-foreground">
            Ensemble backtests & live signal quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["BTCUSDT", "ETHUSDT", "SOLUSDT"].map((s) => (
            <Button
              key={s}
              variant={symbol === s ? "default" : "outline"}
              size="sm"
              onClick={() => setSymbol(s)}
            >
              {s.replace("USDT", "")}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && backtest && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Sharpe Ratio"
              value={backtest.metrics.sharpeRatio.toFixed(2)}
              goal=">1.5"
              good={backtest.metrics.sharpeRatio >= 1.5}
            />
            <MetricCard
              label="Win Rate"
              value={`${(backtest.metrics.winRate * 100).toFixed(1)}%`}
              goal=">80%"
              good={backtest.metrics.winRate >= 0.8}
            />
            <MetricCard
              label="Profit Factor"
              value={backtest.metrics.profitFactor.toFixed(2)}
              goal=">2.0"
              good={backtest.metrics.profitFactor >= 2.0}
            />
            <MetricCard
              label="Max Drawdown"
              value={`${backtest.metrics.maxDrawdownPct.toFixed(2)}%`}
              goal="<15%"
              good={backtest.metrics.maxDrawdownPct <= 15}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityData}>
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
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signal Composition</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="TA" fill="#3b82f6" />
                    <Bar dataKey="AI" fill="#8b5cf6" />
                    <Bar dataKey="Regime" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!loading && signals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Ensemble Signal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signals.map((s) => (
              <div
                key={s.symbol}
                className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      s.action === "BUY"
                        ? "default"
                        : s.action === "SELL"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {s.action}
                  </Badge>
                  <span className="font-semibold">{s.symbol}</span>
                  <span className="text-muted-foreground text-sm">
                    Confidence {s.confidence}%
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(s.metadata.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  goal,
  good,
}: {
  label: string;
  value: string;
  goal: string;
  good: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          <Badge variant={good ? "default" : "outline"}>{goal}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
