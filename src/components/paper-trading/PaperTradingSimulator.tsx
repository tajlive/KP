'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Trophy, TrendingUp, TrendingDown,
  Target, AlertCircle, Loader2, ChevronRight,
  BarChart3, History, Settings2
} from 'lucide-react';
import { RiskLevel, BacktestResult, BacktestParams } from '@/types/paper-trading';
import { RISK_PRESETS, formatUSD, formatPct } from '@/lib/paper-trading/presets';
import { RiskPanel } from './RiskPanel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const INITIAL_BALANCE = 1_000_000; // 1M USD

interface PaperTradingSimulatorProps {
  userId?: string;
  onSimulationComplete?: (result: BacktestResult) => void;
}

export function PaperTradingSimulator({ 
  onSimulationComplete 
}: PaperTradingSimulatorProps) {
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>('standard');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize WebWorker
  useEffect(() => {
    workerRef.current = new Worker('/workers/backtest-worker.js');
    
    workerRef.current.onmessage = (e) => {
      const { type, data, result, error } = e.data;
      
      switch (type) {
        case 'PROGRESS':
          setProgress((data.current / data.total) * 100);
          break;
        case 'COMPLETE':
          setResult(result);
          setIsRunning(false);
          setProgress(100);
          onSimulationComplete?.(result);
          break;
        case 'ERROR':
          setError(error);
          setIsRunning(false);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [onSimulationComplete]);

  const handleStartSimulation = useCallback(() => {
    if (!workerRef.current) return;
    
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const params: BacktestParams = {
      symbol: 'BTC-USD',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      riskPreset: selectedRisk,
      initialBalance: INITIAL_BALANCE
    };

    workerRef.current.postMessage({ type: 'START_BACKTEST', params });
  }, [selectedRisk]);

  const handleReset = useCallback(() => {
    setResult(null);
    setProgress(0);
    setError(null);
    setIsRunning(false);
  }, []);

  const preset = RISK_PRESETS[selectedRisk];
  const potentialProfit = INITIAL_BALANCE * (preset.take_profit_pct / 100);
  const potentialLoss = INITIAL_BALANCE * (preset.stop_loss_pct / 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Paper Trading Simulator
          </h2>
          <p className="text-zinc-400 mt-1">
            Test strategier med <span className="text-emerald-400 font-semibold">1M USD</span> virtuell kapital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Startkapital</p>
            <p className="text-xl font-bold text-white">{formatUSD(INITIAL_BALANCE)}</p>
          </div>
        </div>
      </div>

      {/* Risk Selection Panel */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <RiskPanel 
          selected={selectedRisk}
          onSelect={setSelectedRisk}
          disabled={isRunning}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {!result ? (
          <Button
            size="lg"
            onClick={handleStartSimulation}
            disabled={isRunning}
            className={cn(
              "flex-1 h-14 text-lg font-semibold",
              isRunning && "opacity-80 cursor-not-allowed"
            )}
            style={{ backgroundColor: preset.color }}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Kjører simulering...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Simulering
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            onClick={handleReset}
            className="flex-1 h-14 text-lg font-semibold"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Kjør Ny Simulering
          </Button>
        )}

        {!isRunning && !result && (
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-6"
          >
            <History className="w-5 h-5 mr-2" />
            Historikk
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Simulerer trades...</span>
            <span className="text-white font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Feil under simulering</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <SimulationResults result={result} preset={preset} />
      )}

      {/* Quick Stats Preview */}
      {!result && !isRunning && (
        <div className="grid grid-cols-3 gap-4">
          <QuickStat 
            label="Potensiell Profit" 
            value={formatUSD(potentialProfit)}
            subtext={`+${preset.take_profit_pct}%`}
            color="emerald"
          />
          <QuickStat 
            label="Maks Tap" 
            value={formatUSD(potentialLoss)}
            subtext={`-${preset.stop_loss_pct}%`}
            color="red"
          />
          <QuickStat 
            label="Forventet Tid" 
            value="~30s"
            subtext="for simulering"
            color="blue"
          />
        </div>
      )}
    </div>
  );
}

function SimulationResults({ result, preset }: { 
  result: BacktestResult; 
  preset: { color: string; name: string };
}) {
  const isProfitable = result.total_return_pct > 0;
  const finalBalance = result.final_balance;
  const pnl = finalBalance - INITIAL_BALANCE;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${preset.color}20` }}
          >
            <Trophy 
              className="w-6 h-6" 
              style={{ color: preset.color }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Simulering Fullført!</h3>
            <p className="text-sm text-zinc-400">
              {result.total_trades} trades over {result.trades.length} dager
            </p>
          </div>
        </div>
        <div 
          className={cn(
            "px-4 py-2 rounded-lg font-bold text-lg",
            isProfitable ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}
        >
          {isProfitable ? '+' : ''}{formatPct(result.total_return_pct)}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultStat 
          label="Sluttsaldo"
          value={formatUSD(finalBalance)}
          change={formatUSD(pnl)}
          positive={isProfitable}
          icon={isProfitable ? TrendingUp : TrendingDown}
        />
        <ResultStat 
          label="Win Rate"
          value={`${result.win_rate.toFixed(1)}%`}
          subtext={`${result.trades.filter(t => t.pnl > 0).length} av ${result.total_trades}`}
          icon={Target}
        />
        <ResultStat 
          label="Max Drawdown"
          value={`${result.max_drawdown_pct.toFixed(1)}%`}
          subtext="største tap"
          icon={AlertCircle}
          warning={result.max_drawdown_pct > 10}
        />
        <ResultStat 
          label="Sharpe Ratio"
          value={result.sharpe_ratio.toFixed(2)}
          subtext="risikojustert avkastning"
          icon={BarChart3}
          positive={result.sharpe_ratio > 1}
        />
      </div>

      {/* Trade Distribution */}
      <div className="pt-4 border-t border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Trade Fordeling</h4>
        <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
          {result.trades.map((trade, idx) => (
            <div
              key={idx}
              className={cn(
                "h-full min-w-[2px] flex-1 transition-all",
                trade.pnl > 0 ? "bg-emerald-500" : "bg-red-500"
              )}
              title={`${trade.side} ${trade.entry_price} → ${trade.exit_price} (${formatPct(trade.pnl_pct)})`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
          <span>{result.start_date}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {result.trades.filter(t => t.pnl > 0).length} vinnere
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {result.trades.filter(t => t.pnl <= 0).length} tapere
            </span>
          </div>
          <span>{result.end_date}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-4 pt-4">
        <Button className="flex-1" size="lg">
          <ChevronRight className="w-5 h-5 mr-2" />
          Se Detaljert Rapport
        </Button>
        <Button variant="outline" size="lg">
          <Settings2 className="w-5 h-5 mr-2" />
          Lagre Strategi
        </Button>
      </div>
    </div>
  );
}

function QuickStat({ label, value, subtext, color }: {
  label: string;
  value: string;
  subtext: string;
  color: 'emerald' | 'red' | 'blue';
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  };

  return (
    <div className={cn("p-4 rounded-xl border", colors[color])}>
      <p className="text-xs opacity-80 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-60">{subtext}</p>
    </div>
  );
}

function ResultStat({ 
  label, value, change, subtext, icon: Icon, positive, warning 
}: {
  label: string;
  value: string;
  change?: string;
  subtext?: string;
  icon: React.ElementType;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className={cn(
        "text-lg font-bold",
        positive === true ? "text-emerald-400" : 
        positive === false ? "text-red-400" : 
        warning ? "text-amber-400" : "text-white"
      )}>
        {value}
      </p>
      {change && (
        <p className={cn(
          "text-xs",
          positive ? "text-emerald-400" : "text-red-400"
        )}>
          {positive ? '+' : ''}{change}
        </p>
      )}
      {subtext && (
        <p className="text-xs text-zinc-600">{subtext}</p>
      )}
    </div>
  );
}
