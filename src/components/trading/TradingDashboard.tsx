"use client";

/**
 * Modern Trading Dashboard
 *
 * Features:
 * - Clear Paper/Live mode toggle
 * - Strategy selector (DCA, Trend, Grid, Multi-signal)
 * - Real-time balance
 * - Trade history
 * - Performance metrics
 */

import { useUnifiedTrading } from "@/lib/hooks/useUnifiedTrading";

import { useState } from "react";
import { toast } from "sonner";

type StrategyType = "dca" | "trend" | "grid" | "multi_signal";

export default function TradingDashboard() {


  // Use the new unified trading hook
  const {
    mode,
    session,
    trades,
    balance: currentBalance,
    unrealizedPnL,
    isLoading,
    error,
    setMode,
    createSession,
    stopSession,
  } = useUnifiedTrading("BTCUSDT");

  const [isStartingSession, setIsStartingSession] = useState(false);

  const handleModeSwitch = async (newMode: "paper" | "live") => {
    if (newMode === "live" && session?.status === "active") {
      const confirmed = confirm(
        "⚠️ Du bytter til ekte handel. Beløpene du setter vil trekkes fra din Binance-konto. Er du sikker?",
      );
      if (!confirmed) return;
    }

    const success = await setMode(newMode);
    if (!success) {
      // Error handling is managed inside the hook, we can just optionally show a toast/alert here
    }
  };

  const handleStartSession = async (strategyId: StrategyType) => {
    try {
      setIsStartingSession(true);
      const newSession = await createSession({
        strategy_id: strategyId,
        trading_pair: "BTC/USDT",
        mode,
        initial_capital: mode === "paper" ? 100000 : 10000,
      });

      if (newSession) {
        toast.success(`${mode === "paper" ? "Paper" : "Live"} trading session started!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleStopSession = async () => {
    if (!session) return;

    const confirmed = confirm(
      "Er du sikker på at du vil stoppe trading session?",
    );
    if (!confirmed) return;

    const success = await stopSession();
    if (success) {
      toast.success("Trading session stopped");
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate P&L percentage for session
  const pnlPercent =
    session && session.initial_capital > 0
      ? (session.total_pnl / session.initial_capital) * 100
      : 0;

  const winRate =
    session && session.total_trades > 0
      ? (session.winning_trades / session.total_trades) * 100
      : 0;

  if (isLoading && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Laster dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header with Mode Toggle */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md w-full">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleModeSwitch("paper")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                mode === "paper"
                  ? "bg-yellow-500 text-gray-900"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              🟡 Øvemodus
            </button>
            <button
              onClick={() => handleModeSwitch("live")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                mode === "live"
                  ? "bg-green-500 text-gray-900"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              🟢 Ekte handel
            </button>
          </div>
        </div>

        {/* Mode Description */}
        <div className="mt-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          {mode === "paper" ? (
            <p className="text-gray-300">
              <span className="font-semibold text-yellow-400">Øvemodus:</span>{" "}
              Virtuell trading med ekte markedspriser. Ingen ekte penger brukes.
            </p>
          ) : (
            <p className="text-gray-300">
              <span className="font-semibold text-green-400">Ekte handel:</span>{" "}
              Handel med ekte penger på Binance. Profitt og tap er reelt.
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {!session || session.status !== "active" ? (
          /* No Active Session - Strategy Selector */
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6">
                Velg din strategi for{" "}
                {mode === "paper" ? "paper trading" : "live trading"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* DCA Strategy */}
                <button
                  onClick={() => handleStartSession("dca")}
                  disabled={isStartingSession}
                  className="p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
                >
                  <div className="text-3xl mb-3">📊</div>
                  <h3 className="text-lg font-bold mb-2">
                    Månedlig Sparing (DCA)
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Kjøper automatisk hver uke/måned. Jevner ut pris over tid.
                  </p>
                  <div className="text-xs text-green-400">
                    ✅ Trygg | Lav risiko
                  </div>
                </button>

                {/* Trend Strategy */}
                <button
                  onClick={() => handleStartSession("trend")}
                  disabled={isStartingSession}
                  className="p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
                >
                  <div className="text-3xl mb-3">📈</div>
                  <h3 className="text-lg font-bold mb-2">Trendhandel</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Følger markedstrender. Kjøper når markedet stiger.
                  </p>
                  <div className="text-xs text-yellow-400">
                    ⚖️ Balansert | Moderat risiko
                  </div>
                </button>

                {/* Grid Strategy */}
                <button
                  onClick={() => handleStartSession("grid")}
                  disabled={isStartingSession}
                  className="p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
                >
                  <div className="text-3xl mb-3">🎯</div>
                  <h3 className="text-lg font-bold mb-2">Grid Trading</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Kjøper lavt, selger høyt i et prisintervall. For sidelengs
                    markeder.
                  </p>
                  <div className="text-xs text-orange-400">
                    🚀 Avansert | Høyere risiko
                  </div>
                </button>

                {/* Multi-signal Strategy */}
                <button
                  onClick={() => handleStartSession("multi_signal")}
                  disabled={isStartingSession}
                  className="p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
                >
                  <div className="text-3xl mb-3">🎲</div>
                  <h3 className="text-lg font-bold mb-2">Kombinert</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Bruker flere signaler (RSI, MACD, trend). Mest avansert.
                  </p>
                  <div className="text-xs text-red-400">
                    ⚡ Ekspert | Høy risiko
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Session - Dashboard */
          <div className="space-y-6">
            {/* Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Portfolio Value */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Gjeldende Kapital</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(session.current_capital)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p
                    className={`text-sm ${pnlPercent >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {formatPercent(pnlPercent)} Realisert (
                    {formatCurrency(session.total_pnl)})
                  </p>
                </div>
                {session.open_position && (
                  <div className="flex items-center gap-2 mt-1">
                    <p
                      className={`text-xs ${unrealizedPnL >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {formatCurrency(unrealizedPnL)} Urealisert
                    </p>
                  </div>
                )}
              </div>

              {/* Total Trades */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Antall handler</p>
                <p className="text-3xl font-bold">{session.total_trades}</p>
                <p className="text-sm text-gray-400 mt-2">
                  {session.winning_trades} vinnere |{" "}
                  {session.total_trades - session.winning_trades} tapere
                </p>
              </div>

              {/* Win Rate */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Vinnerprosent</p>
                <p className="text-3xl font-bold">{winRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-400 mt-2">
                  Strategi:{" "}
                  <span className="uppercase text-white font-medium">
                    {session.strategy_id}
                  </span>
                </p>
              </div>
            </div>

            {/* Session Controls */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">
                    Aktiv sesjon: {session.trading_pair}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Status:{" "}
                    <span className="text-green-400">● {session.status}</span> |
                    Startet:{" "}
                    {new Date(session.started_at).toLocaleDateString("no-NO")}
                  </p>
                </div>
                <button
                  onClick={handleStopSession}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all"
                >
                  🛑 Stopp trading
                </button>
              </div>
            </div>

            {/* Trade History */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Siste handler</h3>

              {trades.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Ingen handler ennå
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-4 text-sm text-gray-400">
                          Dato
                        </th>
                        <th className="text-left py-2 px-4 text-sm text-gray-400">
                          Type
                        </th>
                        <th className="text-right py-2 px-4 text-sm text-gray-400">
                          Mengde
                        </th>
                        <th className="text-right py-2 px-4 text-sm text-gray-400">
                          Pris
                        </th>
                        <th className="text-right py-2 px-4 text-sm text-gray-400">
                          P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => (
                        <tr
                          key={trade.id}
                          className="border-b border-gray-700/50"
                        >
                          <td className="py-3 px-4 text-sm">
                            {new Date(trade.executed_at).toLocaleString(
                              "no-NO",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                trade.side === "buy"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {trade.side === "buy" ? "KJØP" : "SALG"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {trade.quantity.toFixed(6)} BTC
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {formatCurrency(trade.price)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right text-sm font-medium ${
                              trade.realized_pnl && trade.realized_pnl > 0
                                ? "text-green-400"
                                : trade.realized_pnl && trade.realized_pnl < 0
                                  ? "text-red-400"
                                  : "text-gray-400"
                            }`}
                          >
                            {trade.realized_pnl
                              ? formatCurrency(trade.realized_pnl)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
