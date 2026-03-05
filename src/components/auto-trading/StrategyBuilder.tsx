import type React from "react"
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  Play, 
  Save,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Hardkodede strategier - erstatter legacy auto_trading_strategies tabell
const DEFAULT_STRATEGIES = [
  {
    id: 'dca_trygg',
    name: 'DCA Trygg',
    risk_level: 1,
    is_active: true,
    allowed_symbols: ['BTCUSDT', 'ETHUSDT'],
    description: 'Dollar-cost averaging med lav risiko',
  },
  {
    id: 'trend_balansert',
    name: 'Trend Balansert',
    risk_level: 3,
    is_active: true,
    allowed_symbols: ['BTCUSDT'],
    description: 'Trend-following med middels risiko',
  },
  {
    id: 'multisignal_aktiv',
    name: 'Multi-Signal Aktiv',
    risk_level: 4,
    is_active: true,
    allowed_symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    description: 'Multi-indikator strategi med høy aktivitet',
  },
  {
    id: 'grid_bot',
    name: 'Grid Bot',
    risk_level: 3,
    is_active: true,
    allowed_symbols: ['BTCUSDT'],
    description: 'Grid trading i definerte prisområder',
  },
  {
    id: 'ai_copy',
    name: 'AI Copy Trading',
    risk_level: 5,
    is_active: true,
    allowed_symbols: ['BTCUSDT', 'ETHUSDT'],
    description: 'Kopierer topp-tradere med AI-filtrering',
  },
];

interface StrategyBuilderProps {
  maxStrategies?: number;
  onStrategyCreated?: (strategy: {
    id: string;
    name: string;
    symbol: string;
    indicators: string[];
    stopLoss: number;
    takeProfit: number;
  }) => void;
}

interface StrategyCondition {
  id: string;
  indicator: string;
  operator: '>' | '<' | '=' | 'crosses_above' | 'crosses_below';
  value: number;
}

interface Strategy {
  name: string;
  description: string;
  entryConditions: StrategyCondition[];
  exitConditions: StrategyCondition[];
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  maxPositions: number;
}

interface BacktestResult {
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgTrade: number;
  bestTrade: number;
  worstTrade: number;
  isValid: boolean;
  confidenceScore: number;
  recommendation: 'proceed' | 'caution' | 'reject';
  validationErrors: string[];
}

const INDICATORS = [
  { value: 'rsi', label: 'RSI (14)', min: 0, max: 100 },
  { value: 'sma20', label: 'SMA (20)', min: 0, max: 100000 },
  { value: 'sma50', label: 'SMA (50)', min: 0, max: 100000 },
  { value: 'ema12', label: 'EMA (12)', min: 0, max: 100000 },
  { value: 'ema26', label: 'EMA (26)', min: 0, max: 100000 },
  { value: 'macd', label: 'MACD', min: -1000, max: 1000 },
  { value: 'volume', label: 'Volume', min: 0, max: 1000000000 },
  { value: 'price', label: 'Price', min: 0, max: 1000000 },
];

export default function StrategyBuilder({ 
  maxStrategies = 999,
  onStrategyCreated 
}: StrategyBuilderProps): JSX.Element {
  const [strategy, setStrategy] = useState<Strategy>({
    name: 'Min Strategi',
    description: 'Beskrivelse av strategien...',
    entryConditions: [],
    exitConditions: [],
    stopLoss: 5,
    takeProfit: 10,
    positionSize: 10,
    maxPositions: 3,
  });

  const [activeTab, setActiveTab] = useState<'entry' | 'exit' | 'risk'>('entry');
  const [isTesting, setIsTesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [strategies] = useState(DEFAULT_STRATEGIES);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(DEFAULT_STRATEGIES[0].id);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addCondition = (type: 'entry' | 'exit') => {
    const newCondition: StrategyCondition = {
      id: Math.random().toString(36).substr(2, 9),
      indicator: 'rsi',
      operator: '<',
      value: 30,
    };

    setStrategy(prev => ({
      ...prev,
      [type === 'entry' ? 'entryConditions' : 'exitConditions']: [
        ...prev[type === 'entry' ? 'entryConditions' : 'exitConditions'],
        newCondition,
      ],
    }));
  };

  const removeCondition = (type: 'entry' | 'exit', id: string) => {
    setStrategy(prev => ({
      ...prev,
      [type === 'entry' ? 'entryConditions' : 'exitConditions']: 
        prev[type === 'entry' ? 'entryConditions' : 'exitConditions'].filter(c => c.id !== id),
    }));
  };

  const updateCondition = (
    type: 'entry' | 'exit', 
    id: string, 
    updates: Partial<StrategyCondition>
  ) => {
    setStrategy(prev => ({
      ...prev,
      [type === 'entry' ? 'entryConditions' : 'exitConditions']: 
        prev[type === 'entry' ? 'entryConditions' : 'exitConditions'].map(c => 
          c.id === id ? { ...c, ...updates } : c
        ),
    }));
  };

  const runBacktest = async () => {
    setIsTesting(true);
    setError('');
    setBacktestResult(null);

    try {
      // Simulate backtest calculation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock results
      const mockResult: BacktestResult = {
        totalReturn: 12500,
        totalReturnPercent: 12.5,
        winRate: 58.3,
        totalTrades: 24,
        winningTrades: 14,
        losingTrades: 10,
        maxDrawdown: 8.2,
        sharpeRatio: 1.45,
        profitFactor: 1.68,
        avgTrade: 520,
        bestTrade: 3200,
        worstTrade: -1800,
        isValid: true,
        confidenceScore: 72,
        recommendation: 'proceed',
        validationErrors: [],
      };

      setBacktestResult(mockResult);
    } catch (err) {
      setError('Backtest feilet. Vennligst prøv igjen.');
    } finally {
      setIsTesting(false);
    }
  };

  const saveStrategy = async () => {
    setError('');
    setSuccess('');

    if (!selectedStrategyId) {
      setError('Velg en strategi først');
      return;
    }

    if (strategy.entryConditions.length === 0) {
      setError('Legg til minst én entry-betingelse');
      return;
    }

    try {
      // Call API to create session with strategy config
      const response = await fetch('/api/trading/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'paper',
          strategy_id: selectedStrategyId,
          strategy_config: {
            entry_conditions: strategy.entryConditions,
            exit_conditions: strategy.exitConditions,
            stop_loss: strategy.stopLoss,
            take_profit: strategy.takeProfit,
            position_size: strategy.positionSize,
            max_positions: strategy.maxPositions,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create strategy session');
      }

      const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);
      
      if (onStrategyCreated) {
        onStrategyCreated({
          id: selectedStrategyId,
          name: selectedStrategy?.name || 'Custom Strategy',
          symbol: selectedStrategy?.allowed_symbols?.[0] || 'BTCUSDT',
          indicators: strategy.entryConditions.map(c => c.indicator),
          stopLoss: strategy.stopLoss,
          takeProfit: strategy.takeProfit,
        });
      }

      setSuccess('Strategi opprettet!');
    } catch (err) {
      setError('Kunne ikke lagre strategi. Prøv igjen.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Selector & Backtest Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Strategi og Innstillinger
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Velg Strategi
              </label>
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Risk {s.risk_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Dato
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slutt Dato
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Builder Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex">
            {(['entry', 'exit', 'risk'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'entry' && 'Entry Betingelser'}
                {tab === 'exit' && 'Exit Betingelser'}
                {tab === 'risk' && 'Risk Management'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'entry' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Når skal vi kjøpe?
                </h4>
                <Button
                  onClick={() => addCondition('entry')}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Legg til betingelse
                </Button>
              </div>

              {strategy.entryConditions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Ingen entry-betingelser enda. Klikk "Legg til betingelse" for å starte.
                </p>
              ) : (
                <div className="space-y-3">
                  {strategy.entryConditions.map((condition, index) => (
                    <ConditionRow
                      key={condition.id}
                      condition={condition}
                      index={index}
                      onUpdate={(updates) => updateCondition('entry', condition.id, updates)}
                      onRemove={() => removeCondition('entry', condition.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Når skal vi selge?
                </h4>
                <Button
                  onClick={() => addCondition('exit')}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Legg til betingelse
                </Button>
              </div>

              {strategy.exitConditions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Ingen exit-betingelser enda. Klikk "Legg til betingelse" for å starte.
                </p>
              ) : (
                <div className="space-y-3">
                  {strategy.exitConditions.map((condition, index) => (
                    <ConditionRow
                      key={condition.id}
                      condition={condition}
                      index={index}
                      onUpdate={(updates) => updateCondition('exit', condition.id, updates)}
                      onRemove={() => removeCondition('exit', condition.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stop Loss (%)
                </label>
                <Input
                  type="number"
                  value={strategy.stopLoss}
                  onChange={(e) => setStrategy(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
                  min={1}
                  max={50}
                  step={0.5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Take Profit (%)
                </label>
                <Input
                  type="number"
                  value={strategy.takeProfit}
                  onChange={(e) => setStrategy(prev => ({ ...prev, takeProfit: Number(e.target.value) }))}
                  min={1}
                  max={100}
                  step={0.5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Posisjonsstørrelse (%)
                </label>
                <Input
                  type="number"
                  value={strategy.positionSize}
                  onChange={(e) => setStrategy(prev => ({ ...prev, positionSize: Number(e.target.value) }))}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maks antall posisjoner
                </label>
                <Input
                  type="number"
                  value={strategy.maxPositions}
                  onChange={(e) => setStrategy(prev => ({ ...prev, maxPositions: Number(e.target.value) }))}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backtest Results */}
      {backtestResult && (
        <BacktestResults result={backtestResult} />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={runBacktest}
          disabled={isTesting || !selectedStrategyId}
          variant="outline"
          className="flex-1"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Kjører backtest...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Kjør Backtest
            </>
          )}
        </Button>

        <Button
          onClick={saveStrategy}
          disabled={isTesting || !selectedStrategyId}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Lagre Strategi
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{success}</span>
        </div>
      )}
    </div>
  );
}

// Sub-components
function ConditionRow({
  condition,
  index,
  onUpdate,
  onRemove,
}: {
  condition: StrategyCondition;
  index: number;
  onUpdate: (updates: Partial<StrategyCondition>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span className="text-sm text-gray-500 dark:text-gray-400 w-8">#{index + 1}</span>
      
      <select
        value={condition.indicator}
        onChange={(e) => onUpdate({ indicator: e.target.value })}
        className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
      >
        {INDICATORS.map(ind => (
          <option key={ind.value} value={ind.value}>{ind.label}</option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as StrategyCondition['operator'] })}
        className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
      >
        <option value="<">&lt; (mindre enn)</option>
        <option value=">">&gt; (større enn)</option>
        <option value="=">= (lik)</option>
        <option value="crosses_above">Krysser over</option>
        <option value="crosses_below">Krysser under</option>
      </select>

      <Input
        type="number"
        value={condition.value}
        onChange={(e) => onUpdate({ value: Number(e.target.value) })}
        className="w-24"
      />

      <button
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function BacktestResults({ result }: { result: BacktestResult }) {
  const isGood = result.recommendation === 'proceed';
  const isCaution = result.recommendation === 'caution';

  return (
    <div className={`p-6 rounded-2xl border-2 ${
      isGood ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' :
      isCaution ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10' :
      'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        {isGood ? <TrendingUp className="w-6 h-6 text-green-600" /> :
         isCaution ? <AlertCircle className="w-6 h-6 text-yellow-600" /> :
         <TrendingDown className="w-6 h-6 text-red-600" />}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Backtest Resultater
          </h4>
          <p className={`text-sm ${
            isGood ? 'text-green-600' :
            isCaution ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {isGood ? 'Anbefalt - God strategi' :
             isCaution ? 'Moderat - Vurder justeringer' :
             'Ikke anbefalt - Trenger forbedringer'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Avkastning" value={`${result.totalReturnPercent.toFixed(2)}%`} />
        <Stat label="Win Rate" value={`${result.winRate.toFixed(1)}%`} />
        <Stat label="Antall Handler" value={result.totalTrades.toString()} />
        <Stat label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} />
        <Stat label="Max Drawdown" value={`${result.maxDrawdown.toFixed(2)}%`} />
        <Stat label="Profit Factor" value={result.profitFactor.toFixed(2)} />
        <Stat label="Gj.snitt Trade" value={`$${result.avgTrade.toFixed(0)}`} />
        <Stat label="Konfidens" value={`${result.confidenceScore}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
