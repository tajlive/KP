'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Wallet, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BalanceData {
  starting: number;
  current: number;
  pnl: number;
  pnlPercentage: number;
  isPositive: boolean;
}

type LoadingState = 'loading' | 'error' | 'empty' | 'ready';

export function PaperTradingCard() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [resetting, setResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchBalance = async () => {
    try {
      setState('loading');
      setErrorMessage('');
      
      const response = await fetch('/api/paper-trading/balance');
      
      if (response.status === 401) {
        setState('empty');
        setErrorMessage('Du må være logget inn for å se paper trading-saldo');
        return;
      }
      
      // 404 = no session exists yet (valid state, not error)
      if (response.status === 404) {
        setState('empty');
        setErrorMessage('Ingen paper trading-session funnet');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Serverfeil: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.balance) {
        setState('empty');
        setErrorMessage('Ingen paper trading-session funnet');
        return;
      }
      
      setBalance(data.balance);
      setState('ready');
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente saldo');
      setState('error');
      toast.error('Kunne ikke hente saldo');
    }
  };

  const handleReset = async () => {
    if (!confirm('Er du sikker på at du vil tilbakestille paper trading? All historikk vil slettes.')) {
      return;
    }
    
    setResetting(true);
    try {
      const response = await fetch('/api/paper-trading/init', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to reset');
      await fetchBalance();
      toast.success('Paper trading tilbakestilt!');
    } catch (error) {
      toast.error('Kunne ikke tilbakestille');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (state === 'loading') {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Paper Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-slate-800 rounded" />
            <div className="h-4 bg-slate-800 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Paper Trading
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Kunne ikke laste data</p>
              <p className="text-slate-400 text-xs mt-1">{errorMessage}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBalance}
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Prøv igjen
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state (no session or not logged in)
  if (state === 'empty') {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Paper Trading
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 text-sm">{errorMessage || 'Ingen paper trading-data tilgjengelig'}</p>
              <p className="text-slate-500 text-xs mt-1">
                Start en øvingshandel-session for å se din virtuelle saldo.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBalance}
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sjekk på nytt
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ready state
  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="paper-trading-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-500" />
          Paper Trading
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div data-testid="paper-balance-container">
          <p className="text-slate-400 text-sm">Nåværende saldo</p>
          <p className="text-3xl font-bold text-white" data-testid="paper-balance">
            kr {balance?.current.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* P&L */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Start saldo</p>
            <p className="text-slate-300">
              kr {balance?.starting.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right" data-testid="paper-pnl-container">
            <p className="text-slate-400 text-sm">Resultat</p>
            <div className={`flex items-center gap-1 ${balance && balance.isPositive ? 'text-green-400' : 'text-red-400'}`} data-testid="paper-pnl">
              {balance && balance.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">
                {balance && balance.isPositive ? '+' : ''}{balance?.pnl.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-sm">
                ({balance && balance.isPositive ? '+' : ''}{balance?.pnlPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBalance}
            disabled={state === 'loading'}
            className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${state === 'loading' ? 'animate-spin' : ''}`} />
            Oppdater
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-red-400"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
