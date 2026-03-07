'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Wallet, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface BalanceData {
  starting: number;
  current: number;
  pnl: number;
  pnlPercentage: number;
  isPositive: boolean;
}

export function PaperTradingCard() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/paper-trading/balance');
      if (!response.ok) throw new Error('Failed to fetch balance');
      const data = await response.json();
      setBalance(data.balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      toast.error('Kunne ikke hente saldo');
    } finally {
      setLoading(false);
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

  if (loading) {
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

  if (!balance) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Paper Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">Kunne ikke laste paper trading data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-500" />
          Paper Trading
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div>
          <p className="text-slate-400 text-sm">Nåværende saldo</p>
          <p className="text-3xl font-bold text-white">
            kr {balance.current.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* P&L */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Start saldo</p>
            <p className="text-slate-300">
              kr {balance.starting.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">P&L</p>
            <div className={`flex items-center gap-1 ${balance.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {balance.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">
                {balance.isPositive ? '+' : ''}{balance.pnl.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-sm">
                ({balance.isPositive ? '+' : ''}{balance.pnlPercentage.toFixed(2)}%)
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
            disabled={loading}
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Oppdater
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-red-400"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
