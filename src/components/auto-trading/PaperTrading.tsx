"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, History, Loader2, PlayCircle, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { STRATEGY_CATALOG_PAPER } from "@/lib/auto-trading/strategy-catalog";

const DEFAULT_STRATEGIES = [...STRATEGY_CATALOG_PAPER];

// Types
interface Strategy {
  id: string;
  name: string;
  symbol: string;
  indicators: string[];
  stopLoss: number;
  takeProfit: number;
}

interface BacktestResult {
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  totalTrades: number;
}

interface PaperTradingProps {
  strategy?: Strategy | null;
  backtestResult?: BacktestResult | null;
  onStart?: () => void;
  onStop?: () => void;
}

interface Trade {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  quantity: number;
  status: "OPEN" | "CLOSED";
  pnl?: number;
}

interface Session {
  id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl_nok: number;
  total_trades: number;
  status: "ACTIVE" | "PAUSED";
}

export default function PaperTrading({
  strategy: _strategy,
  backtestResult: _backtestResult,
  onStart: _onStart,
  onStop: _onStop,
}: PaperTradingProps): React.ReactElement {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(
    DEFAULT_STRATEGIES[0].id,
  );
  const [capital, setCapital] = useState(100000);
  const [session, setSession] = useState<Session | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSessionData();

    const interval = setInterval(fetchSessionData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSessionData(): Promise<void> {
    try {
      const response = await fetch("/api/trading/sessions?mode=paper");
      const data = await response.json();

      if (data.sessions && data.sessions.length > 0) {
        const activeSession = data.sessions[0];
        setSession({
          id: activeSession.id,
          current_capital_nok: activeSession.current_capital,
          starting_capital_nok: activeSession.initial_capital,
          total_pnl_nok: activeSession.total_pnl,
          total_trades: activeSession.total_trades,
          status: activeSession.status === "active" ? "ACTIVE" : "PAUSED",
        });
        setIsRunning(activeSession.status === "active");
      } else {
        setSession(null);
        setIsRunning(false);
      }
    } catch (err) {
      console.error("Error fetching session data:", err);
    }
  }

  const selectedStrategy =
    DEFAULT_STRATEGIES.find((s) => s.id === selectedStrategyId) ||
    DEFAULT_STRATEGIES[0];

  const handleStart = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trading/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "paper",
          strategy_id: selectedStrategyId,
          initial_capital: capital,
        }),
      });

      if (response.ok) {
        setIsRunning(true);
        await fetchSessionData();
      }
    } catch (err) {
      console.error("Error starting session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async (): Promise<void> => {
    if (!session) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/trading/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          action: "stop",
        }),
      });

      if (response.ok) {
        setIsRunning(false);
        await fetchSessionData();
      }
    } catch (err) {
      console.error("Error stopping session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const winRate =
    recentTrades.length > 0
      ? (recentTrades.filter((t) => (t.pnl || 0) > 0).length /
          recentTrades.length) *
        100
      : 0;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="bg-linear-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Lekepenger</h2>
              <p className="text-slate-400 text-sm">
                Øv uten risiko med lekepenger
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <div className="text-right">
                <p className="text-sm text-slate-400">Kapital</p>
                <p className="text-xl font-bold text-white">
                  {session.current_capital_nok.toLocaleString("no-NO")} kr
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <fieldset className="border-0 p-0 m-0">
          <legend className="block text-sm font-medium text-slate-300 mb-2">
            Velg strategi
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEFAULT_STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => setSelectedStrategyId(strategy.id)}
                disabled={isRunning}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedStrategyId === strategy.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-600"
                } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">
                    {strategy.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      strategy.risk_level <= 2
                        ? "bg-green-500/20 text-green-400"
                        : strategy.risk_level <= 3
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    Risk {strategy.risk_level}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{strategy.description}</p>
              </button>
            ))}
          </div>
        </fieldset>

        {!isRunning && (
          <div>
            <label
              htmlFor="paper-trading-capital"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Startkapital (NOK)
            </label>
            <Input
              id="paper-trading-capital"
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              min={10000}
              max={10000000}
              step={10000}
              disabled={isRunning}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        )}

        {session && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Total P&L</p>
              <p
                className={`text-lg font-bold ${session.total_pnl_nok >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {session.total_pnl_nok >= 0 ? "+" : ""}
                {session.total_pnl_nok.toLocaleString("no-NO")} kr
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Win Rate</p>
              <p className="text-lg font-bold text-white">
                {winRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Handler</p>
              <p className="text-lg font-bold text-white">
                {session.total_trades}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Åpne posisjoner</p>
              <p className="text-lg font-bold text-white">
                {openTrades.length}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-5 h-5 mr-2" />
              )}
              Start lekepenger
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              disabled={isLoading}
              variant="destructive"
              className="flex-1 py-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Square className="w-5 h-5 mr-2" />
              )}
              Stopp Trading
            </Button>
          )}
        </div>

        {recentTrades.length > 0 && (
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Siste handler
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentTrades.slice(0, 10).map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        trade.side === "LONG"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {trade.side}
                    </span>
                    <span className="text-white text-sm">{trade.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${(trade.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {(trade.pnl || 0) >= 0 ? "+" : ""}
                      {(trade.pnl || 0).toLocaleString("no-NO")} kr
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
