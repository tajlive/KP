"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/shared/ui/skeleton";
import { SymbolToggles } from "./components";

// Dynamisk import av chart-komponenter med SSR: false
// Dette er nødvendig fordi Recharts bruker DOM-målinger som ikke finnes på server,
// og for å unngå hydration mismatch på datoformatering.
const EquityChart = dynamic(
  () => import("./components").then((mod) => mod.EquityChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse rounded-lg bg-slate-800" />
    ),
  }
);

const SignalCompositionChart = dynamic(
  () => import("./components").then((mod) => mod.SignalCompositionChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse rounded-lg bg-slate-800" />
    ),
  }
);

const MetricCards = dynamic(
  () => import("./components").then((mod) => mod.MetricCards),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    ),
  }
);

const LatestSignalCard = dynamic(
  () => import("./components").then((mod) => mod.LatestSignalCard),
  {
    ssr: false,
    loading: () => <Skeleton className="h-32 w-full rounded-xl" />,
  }
);

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
  sizing: {
    kellyPct: number;
    maxRiskPct: number;
  };
  metadata: {
    timestamp: string;
  };
}

/**
 * Formaterer timestamp til YYYY-MM-DD format.
 * Dette er deterministisk og gir samme output på server og klient,
 * i motsetning til toLocaleDateString som er locale-avhengig.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      // Hent backtest-data
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

      if (!res.ok) {
        throw new Error(`Backtest API feilet: ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setBacktest({
        metrics: data.metrics,
        equityCurve: data.equityCurve,
        strategyName: data.strategyName || "Ensemble AI",
        symbol: data.symbol,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukjent feil";
      console.error("Metrics load error:", err);
      setError(message);
      // Ikke kast - vis fallback state istedenfor
    }

    try {
      // Hent ensemble signals - dette skal ikke påvirke backtest-visning
      const sigRes = await fetch("/api/ai/ensemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });

      if (!sigRes.ok) {
        console.warn(`Ensemble API feilet: ${sigRes.status}`);
        return;
      }

      const sigData = await sigRes.json();
      if (!sigData.error) {
        setSignals([sigData]);
      }
    } catch (err) {
      // Logg men ikke kast - dashboardet skal fungere selv om signals feiler
      console.error("Signals load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBacktest(symbol);
  }, [symbol]);

  // Transformer data til chart-format med deterministisk datoformatering
  const equityData = useMemo(() => {
    if (!backtest?.equityCurve) return [];
    return backtest.equityCurve.map((p) => ({
      date: formatDate(p.timestamp),
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
        <SymbolToggles selected={symbol} onSelect={setSymbol} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Feil ved lasting av data</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => runBacktest(symbol)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && backtest && (
        <>
          <MetricCards metrics={backtest.metrics} />

          <div className="grid gap-4 md:grid-cols-2">
            <EquityChart data={equityData} />
            <SignalCompositionChart data={scoreData} />
          </div>
        </>
      )}

      {!loading && signals.length > 0 && <LatestSignalCard signals={signals} />}

      {!loading && !backtest && !error && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Ingen data tilgjengelig</p>
          <button
            onClick={() => runBacktest(symbol)}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Last på nytt
          </button>
        </div>
      )}
    </div>
  );
}
