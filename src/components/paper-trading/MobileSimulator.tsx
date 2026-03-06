'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Trophy,
  Loader2,
  BarChart3, Save, ChevronDown,
  Brain, Sparkles, Zap
} from 'lucide-react';
import { RiskLevel, BacktestResult } from '@/types/paper-trading';
import { RISK_PRESETS, formatUSD, formatPct } from '@/lib/paper-trading/presets';
import { STRATEGIES, StrategyType as StratType } from '@/lib/paper-trading/strategies';
import { getAvailableCoins } from '@/lib/paper-trading/data';
import { RiskPanel } from './RiskPanel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Simple toast function
const toast = ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
  console.info(`[${variant || 'info'}] ${title}: ${description}`);
};

const INITIAL_BALANCE = 1_000_000;

// Mobile-optimized touch targets and layout
// Designed for iPhone 12+ (390x844) and Android 2022+ (360x800+)

export function MobileSimulator() {

  
  // State
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>('standard');
  const [selectedStrategy, setSelectedStrategy] = useState<StratType>('ma_crossover');
  const [selectedCoin, setSelectedCoin] = useState('BTC-USD');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [strategyParams, setStrategyParams] = useState<Record<string, number | string>>({});
  
  const workerRef = useRef<Worker | null>(null);
  const coins = getAvailableCoins();
  const strategy = STRATEGIES[selectedStrategy];
  const preset = RISK_PRESETS[selectedRisk];

  // Initialize strategy params on strategy change
  useEffect(() => {
    const defaults: Record<string, number | string> = {};
    strategy.parameters.forEach(p => {
      defaults[p.name] = p.default;
    });
    setStrategyParams(defaults);
  }, [selectedStrategy]);

  // Initialize WebWorker
  useEffect(() => {
    workerRef.current = new Worker('/workers/backtest-worker-v2.js');
    
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
          toast({
            title: 'Simulering fullført! 🎉',
            description: `Avkastning: ${formatPct(result.total_return_pct)}`,
          });
          break;
        case 'ERROR':
          setError(error);
          setIsRunning(false);
          toast({
            title: 'Feil under simulering',
            description: error,
            variant: 'destructive'
          });
          break;
      }
    };

    return () => workerRef.current?.terminate();
  }, [toast]);

  const handleStartSimulation = useCallback(() => {
    if (!workerRef.current) return;
    
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const params = {
      symbol: selectedCoin,
      coinId: selectedCoin.split('-')[0].toLowerCase(),
      riskPreset: selectedRisk,
      strategyId: selectedStrategy,
      strategyParams,
      initialBalance: INITIAL_BALANCE
    };

    workerRef.current.postMessage({ type: 'START_BACKTEST', params });
  }, [selectedRisk, selectedStrategy, selectedCoin, strategyParams]);

  const handleSaveStrategy = async () => {
    if (!strategyName?.trim()) {
      toast({
        title: 'Navn påkrevd',
        description: 'Vennligst gi strategien et navn',
        variant: 'destructive'
      });
      return;
    }
    
    // In production, this would save to Supabase
    toast({
      title: 'Strategi lagret! 💾',
      description: `${strategyName} er nå tilgjengelig i dine lagrede strategier`,
    });
    
    setShowSaveDialog(false);
    setStrategyName('');
    setIsFavorite(false);
  };

  const handleReset = () => {
    setResult(null);
    setProgress(0);
    setError(null);
  };

  // Calculate potential outcomes
  const potentialProfit = INITIAL_BALANCE * (preset.take_profit_pct / 100) * (preset.leverage_max || 1);
  const potentialLoss = INITIAL_BALANCE * (preset.stop_loss_pct / 100) * (preset.leverage_max || 1);

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-safe">
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Paper Trading
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Test med <span className="text-emerald-400 font-semibold">1M USD</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Saldo</p>
          <p className="text-lg font-bold text-white">{formatUSD(INITIAL_BALANCE)}</p>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Coin Selector - Horizontal Scroll */}
        <div className="border-b border-zinc-800">
          <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
            {coins.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin.symbol)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl min-w-[100px]",
                  "transition-all active:scale-95",
                  selectedCoin === coin.symbol
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-white"
                    : "bg-zinc-900/50 border border-zinc-800 text-zinc-400"
                )}
              >
                <span className="text-lg">{coin.icon}</span>
                <span className="text-sm font-medium">{coin.symbol.split('-')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Risk Panel */}
        <div className="p-4">
          <RiskPanel 
            selected={selectedRisk}
            onSelect={setSelectedRisk}
            disabled={isRunning}
          />
        </div>

        {/* Strategy Selector */}
        <div className="px-4 pb-4">
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
            Trading Strategi
          </label>
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left active:bg-zinc-900 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${preset.color}20` }}
                  >
                    <Brain className="w-5 h-5" style={{ color: preset.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{strategy.name}</p>
                    <p className="text-xs text-zinc-500">
                      {strategy.parameters.length} parametere
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-zinc-500" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] bg-zinc-950 border-zinc-800">
              <SheetHeader className="pb-4 border-b border-zinc-800">
                <SheetTitle className="text-white">Velg Strategi</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 mt-4">
                {Object.values(STRATEGIES).map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => {
                      setSelectedStrategy(strat.id);
                      // Close sheet - need to find a way to close it
                    }}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      selectedStrategy === strat.id
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-zinc-900/50 border-zinc-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        selectedStrategy === strat.id ? "bg-emerald-500/20" : "bg-zinc-800"
                      )}>
                        {strat.id === 'ai_ml' ? (
                          <Sparkles className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Zap className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">{strat.name}</p>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            strat.complexity === 'simple' ? "bg-emerald-500/10 text-emerald-400" :
                            strat.complexity === 'medium' ? "bg-amber-500/10 text-amber-400" :
                            "bg-red-500/10 text-red-400"
                          )}>
                            {strat.complexity === 'simple' ? 'Enkel' :
                             strat.complexity === 'medium' ? 'Middels' : 'Avansert'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {strat.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Strategy Parameters */}
        {strategy.parameters.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-zinc-900/30 rounded-xl p-3 space-y-3">
              {strategy.parameters.map((param) => (
                <div key={param.name} className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-400">{param.label}</Label>
                  {param.type === 'number' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={strategyParams[param.name] as number}
                        onChange={(e) => setStrategyParams(prev => ({
                          ...prev,
                          [param.name]: parseFloat(e.target.value)
                        }))}
                        className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-xs font-medium text-white w-12 text-right">
                        {strategyParams[param.name]}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={strategyParams[param.name] as string}
                      onChange={(e) => setStrategyParams(prev => ({
                        ...prev,
                        [param.name]: e.target.value
                      }))}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      {param.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Button - Large Touch Target */}
      <div className="px-1">
        {!result ? (
          <button
            onClick={handleStartSimulation}
            disabled={isRunning}
            className={cn(
              "w-full h-14 rounded-xl font-semibold text-white",
              "flex items-center justify-center gap-2",
              "transition-all active:scale-[0.98]",
              "disabled:opacity-70 disabled:cursor-not-allowed",
              "shadow-lg"
            )}
            style={{ 
              backgroundColor: preset.color,
              boxShadow: `0 4px 20px ${preset.color}40`
            }}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Simulerer... {Math.round(progress)}%</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start Simulering</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 h-14 rounded-xl bg-zinc-800 font-semibold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Ny Simulering</span>
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="h-14 px-5 rounded-xl bg-emerald-500 font-semibold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="px-1">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Results */}
      {result && <MobileResultCard result={result} preset={preset} />}

      {/* Quick Stats */}
      {!result && !isRunning && (
        <div className="grid grid-cols-3 gap-3 px-1">
          <QuickStat 
            label="Profit Potensial" 
            value={`+${formatPct(preset.take_profit_pct * preset.leverage_max)}`}
            color="emerald"
          />
          <QuickStat 
            label="Maks Tap" 
            value={`-${formatPct(preset.stop_loss_pct * preset.leverage_max)}`}
            color="red"
          />
          <QuickStat 
            label="Leverage" 
            value={`${preset.leverage_max}x`}
            color="blue"
          />
        </div>
      )}

      {/* Save Strategy Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Lagre Strategi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-zinc-400">Strategi Navn</Label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="F.eks. 'Mitt RSI Setup'"
                className="mt-1 bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl">
              <span className="text-sm text-zinc-300">Merk som favoritt</span>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  isFavorite ? "bg-emerald-500" : "bg-zinc-700"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  isFavorite ? "left-5" : "left-1"
                )} />
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 border-zinc-800"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleSaveStrategy}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                Lagre
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MobileResultCard({ result, preset }: { result: BacktestResult; preset: { color: string } }) {
  const isProfitable = result.total_return_pct > 0;
  const pnl = result.final_balance - INITIAL_BALANCE;
  
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-white">Resultat</span>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-lg font-bold",
          isProfitable ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        )}>
          {isProfitable ? '+' : ''}{formatPct(result.total_return_pct)}
        </div>
      </div>

      {/* Main Balance */}
      <div className="text-center py-4 bg-zinc-900/30 rounded-xl">
        <p className="text-xs text-zinc-500 mb-1">Sluttsaldo</p>
        <p className="text-3xl font-bold text-white">{formatUSD(result.final_balance)}</p>
        <p className={cn(
          "text-sm font-medium mt-1",
          isProfitable ? "text-emerald-400" : "text-red-400"
        )}>
          {isProfitable ? '+' : ''}{formatUSD(pnl)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Win Rate" value={`${result.win_rate.toFixed(1)}%`} />
        <StatBox label="Trades" value={result.total_trades.toString()} />
        <StatBox label="Max Drawdown" value={`${result.max_drawdown_pct.toFixed(1)}%`} warning />
        <StatBox label="Sharpe" value={result.sharpe_ratio.toFixed(2)} />
      </div>

      {/* Trade Visualization */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Trade Fordeling</p>
        <div className="h-12 flex gap-[2px] rounded-lg overflow-hidden">
          {result.trades.slice(0, 50).map((trade, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1",
                trade.pnl > 0 ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {result.trades.filter(t => t.pnl > 0).length} vinnere
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {result.trades.filter(t => t.pnl <= 0).length} tapere
          </span>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="bg-zinc-900/30 rounded-xl p-3">
      <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
      <p className={cn(
        "text-lg font-bold",
        warning ? "text-amber-400" : "text-white"
      )}>
        {value}
      </p>
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string; color: 'emerald' | 'red' | 'blue' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10'
  };

  return (
    <div className={cn("p-3 rounded-xl text-center", colors[color])}>
      <p className="text-[10px] opacity-80 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
