"use client";

import { BacktestChart } from "@/components/backtest-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { BacktestResult } from "@/lib/backtest/backtest-engine";
import { format, subMonths } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function BacktestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const [config, setConfig] = useState<{
    initialCapital: number;
    monthsAgo: number;
    riskProfile: "conservative" | "balanced" | "aggressive";
    strategyId: string;
    symbols: string[];
  }>({
    initialCapital: 100000,
    monthsAgo: 6,
    riskProfile: "balanced",
    strategyId: "sma-crossover",
    symbols: ["BTCUSDT"],
  });

  const runBacktest = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Backtest failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Backtest Din Strategi
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
          Se hva du ville tjent med ekte historiske data
        </p>
        <p className="text-sm text-gray-500">
          Basert på 100% reelle priser fra Binance · Inkluderer slippage, fees
          og risikohåndtering
        </p>
      </div>

      {/* Configuration Card */}
      <Card className="p-8 mb-8 bg-linear-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Startkapital
              </label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.initialCapital]}
                  onValueChange={(val) =>
                    setConfig({ ...config, initialCapital: val[0] })
                  }
                  min={10000}
                  max={500000}
                  step={10000}
                  className="flex-1"
                />
                <div className="min-w-[120px] text-right">
                  <span className="text-2xl font-bold text-blue-600">
                    {(config.initialCapital / 1000).toFixed(0)}k NOK
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tidsperiode
              </label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.monthsAgo]}
                  onValueChange={(val) =>
                    setConfig({ ...config, monthsAgo: val[0] })
                  }
                  min={1}
                  max={24}
                  step={1}
                  className="flex-1"
                />
                <div className="min-w-[120px] text-right">
                  <span className="text-2xl font-bold text-purple-600">
                    {config.monthsAgo} mnd
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {format(subMonths(new Date(), config.monthsAgo), "MMM yyyy")} →{" "}
                {format(new Date(), "MMM yyyy")}
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Risikoprofil
              </label>
              <Select
                value={config.riskProfile}
                onValueChange={(val: unknown) =>
                  setConfig({ ...config, riskProfile: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg profil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">
                    🛡️ Konservativ (2% per trade)
                  </SelectItem>
                  <SelectItem value="balanced">
                    ⚖️ Balansert (5% per trade)
                  </SelectItem>
                  <SelectItem value="aggressive">
                    🚀 Aggressiv (10% per trade)
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                {config.riskProfile === "conservative" && (
                  <>
                    <strong>Konservativ:</strong> Stop-loss 3%, maks 1% tap per
                    dag
                  </>
                )}
                {config.riskProfile === "balanced" && (
                  <>
                    <strong>Balansert:</strong> Stop-loss 5%, maks 2% tap per
                    dag
                  </>
                )}
                {config.riskProfile === "aggressive" && (
                  <>
                    <strong>Aggressiv:</strong> Stop-loss 8%, maks 5% tap per
                    dag
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Strategi</label>
              <Select
                value={config.strategyId}
                onValueChange={(val) =>
                  setConfig({ ...config, strategyId: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg strategi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sma-crossover">
                    📈 SMA Crossover (20/50)
                  </SelectItem>
                  <SelectItem value="rsi-momentum">⚡ RSI Momentum</SelectItem>
                  <SelectItem value="macd-trend">
                    📊 MACD Trend Following
                  </SelectItem>
                  <SelectItem value="breakout">💥 Breakout Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Run Button */}
        <div className="mt-8 text-center">
          <Button
            size="lg"
            onClick={runBacktest}
            disabled={isRunning}
            className="px-12 py-6 text-lg font-semibold"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Kjører backtest...
              </>
            ) : (
              <>🎯 Kjør Backtest</>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-2">Tar ca. 10-30 sekunder</p>
        </div>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-8 animate-fade-in">
          {/* Hero Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-6 bg-linear-to-br from-green-500 to-green-600 text-white">
              <div className="text-sm opacity-90 mb-1">Du ville tjent</div>
              <div className="text-4xl font-bold">
                {result.totalReturnNOK > 0 ? "+" : ""}
                {(result.totalReturnNOK / 1000).toFixed(1)}k NOK
              </div>
              <div className="text-sm opacity-90 mt-1">
                {result.totalReturn > 0 ? "+" : ""}
                {result.totalReturn.toFixed(1)}% avkastning
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-1">vs. HODL Bitcoin</div>
              <div
                className={`text-3xl font-bold ${result.vsHodlReturn > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {result.vsHodlReturn > 0 ? "+" : ""}
                {result.vsHodlReturn.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {result.vsHodlReturn > 0 ? "Bedre" : "Verre"} enn buy & hold
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-1">Win Rate</div>
              <div className="text-3xl font-bold text-blue-600">
                {result.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {result.winningTrades} av {result.totalTrades} trades
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-1">Sharpe Ratio</div>
              <div className="text-3xl font-bold text-purple-600">
                {result.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {result.sharpeRatio > 1
                  ? "Svært god"
                  : result.sharpeRatio > 0.5
                    ? "God"
                    : "Moderat"}
              </div>
            </Card>
          </div>

          {/* Equity Curve Chart */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Porteføljeutvikling</h2>
            <BacktestChart data={result.equityCurve} />
          </Card>

          {/* Trade Log */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Trade-Historikk</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Dato</th>
                    <th className="px-4 py-2 text-left">Symbol</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-right">Pris</th>
                    <th className="px-4 py-2 text-right">P&L</th>
                    <th className="px-4 py-2 text-left">Grunn</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.trades || [])
                    .slice(0, 50)
                    .map((trade: unknown, i: number) => (
                      <tr
                        key={i}
                        className="border-t border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-4 py-2">
                          {format(
                            new Date(trade.timestamp),
                            "dd.MM.yyyy HH:mm",
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono">{trade.symbol}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              trade.side === "BUY"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {trade.side}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          ${trade.price.toFixed(2)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-mono ${
                            trade.pnl > 0
                              ? "text-green-600"
                              : trade.pnl < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {trade.pnl > 0 ? "+" : ""}
                          {(trade.pnl / 10).toFixed(0)} NOK
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {trade.reason}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {result.trades?.length > 50 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Viser 50 av {result.trades.length} trades
              </p>
            )}
          </Card>

          {/* CTA */}
          <Card className="p-8 bg-linear-to-r from-blue-500 to-purple-600 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">
              Klar til å starte for ekte?
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Resultatet viser{" "}
              {result.totalReturn > 0
                ? "lønnsomt potensial"
                : "viktige lærdommer"}
              . Start med paper trading først!
            </p>
            <Button size="lg" variant="secondary" className="px-8">
              Opprett Bot Nå
            </Button>
          </Card>
        </div>
      )}

      {/* Info Section */}
      {!result && (
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold mb-2">Ekte Historiske Data</h3>
            <p className="text-sm text-gray-600">
              Vi bruker 100% reelle priser fra Binance. Ingen forfalskede tall.
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-bold mb-2">Realistisk Simulering</h3>
            <p className="text-sm text-gray-600">
              Inkluderer slippage (0.05%), trading fees (0.1%) og
              risikohåndtering.
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold mb-2">Rask & Enkel</h3>
            <p className="text-sm text-gray-600">
              Resultat på 10-30 sekunder. Ingen komplisert oppsett nødvendig.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
