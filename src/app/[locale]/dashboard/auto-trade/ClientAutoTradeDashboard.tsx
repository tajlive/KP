'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Key, 
  History, 
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  Settings,
  DollarSign,
  Activity,
  ArrowRight
} from 'lucide-react';
import { createClient } from '@/lib/utils';
import { toast } from 'sonner';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { TIERS } from '@/lib/pricing/tiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// New components
import { TrialBanner } from '@/components/auto-trading/TrialBanner';
import { StrategyCard } from '@/components/auto-trading/StrategyCard';
import { LiveStrategyView } from '@/components/auto-trading/LiveStrategyView';

// Typer
interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  startedAt: Date | null;
  expiresAt: Date | null;
  canUseLiveTrading: boolean;
  message?: string;
  urgency?: 'none' | 'warning' | 'critical';
}

interface Strategy {
  id: string;
  strategy_type: string;
  trading_mode: 'paper' | 'live';
  is_active: boolean;
  symbol: string;
  capital_allocation: number;
  pnl_usdt?: number;
  pnl_percent?: number;
  open_trades?: number;
  total_trades?: number;
  created_at: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  pnl_usdt?: number;
  trading_mode: 'paper' | 'live';
  opened_at: string;
  closed_at?: string;
}

interface Stats {
  total_pnl: number;
  total_trades: number;
  active_strategies: number;
  win_rate: number;
}

const STRATEGY_TYPES = [
  { id: 'dca_trygg', name: 'DCA Trygg', description: 'Ukentlig dollar-cost averaging', risk: 'low' },
  { id: 'trend_balansert', name: 'Trend Balansert', description: 'MA-crossover med RSI-filter', risk: 'medium' },
  { id: 'multisignal_aktiv', name: 'Multi-Signal Aktiv', description: 'RSI + momentum på 4h', risk: 'medium' },
  { id: 'grid_bot', name: 'Grid Bot', description: 'Automatisk grid trading', risk: 'medium' },
  { id: 'ai_copy', name: 'AI Copy', description: 'Kopier AI-genererte signaler', risk: 'high' },
];

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];

export default function ClientAutoTradeDashboard() {
  const _t = useTranslations('autoTrade');
  const locale = useLocale();
  const _router = useRouter();
  const { subscription: _subscription, loading: subLoading, currentTier } = useSubscription();
  
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats>({ total_pnl: 0, total_trades: 0, active_strategies: 0, win_rate: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [showBinanceSetup, setShowBinanceSetup] = useState(false);
  
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  // Form state for ny strategi
  const [newStrategy, setNewStrategy] = useState({
    strategy_type: 'dca_trygg',
    trading_mode: 'paper' as 'paper' | 'live',
    symbol: 'BTCUSDT',
    capital_allocation: 100,
  });

  // Binance key form
  const [binanceKeys, setBinanceKeys] = useState({
    apiKey: '',
    apiSecret: '',
    isTestnet: true,
  });

  const supabase = createClient();
  const tier = TIERS[currentTier as keyof typeof TIERS];

  // Fetch trial status
  const fetchTrialStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/trial/status');
      if (response.ok) {
        const data = await response.json();
        setTrialStatus(data);
      }
    } catch (error) {
      console.error('Error fetching trial:', error);
    }
  }, []);

  // Hent strategier
  const fetchStrategies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_strategies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
      
      // Calculate stats
      const activeCount = data?.filter(s => s.is_active).length || 0;
      const totalPnl = data?.reduce((sum, s) => sum + (s.pnl_usdt || 0), 0) || 0;
      
      setStats(prev => ({
        ...prev,
        active_strategies: activeCount,
        total_pnl: totalPnl,
      }));
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  }, [supabase]);

  // Hent trades
  const fetchTrades = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrades(data || []);
      
      // Calculate win rate
      if (data && data.length > 0) {
        const closedTrades = data.filter(t => t.closed_at);
        const winningTrades = closedTrades.filter(t => (t.pnl_usdt || 0) > 0);
        const winRate = closedTrades.length > 0 
          ? (winningTrades.length / closedTrades.length) * 100 
          : 0;
        
        setStats(prev => ({
          ...prev,
          total_trades: data.length,
          win_rate: winRate,
        }));
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([
        fetchTrialStatus(),
        fetchStrategies(),
        fetchTrades(),
      ]);
      setLoading(false);
    }
    load();
  }, [fetchTrialStatus, fetchStrategies, fetchTrades]);

  // Opprett ny strategi
  const handleCreateStrategy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check live trading access
      if (newStrategy.trading_mode === 'live') {
        if (!tier.liveTrading && !trialStatus?.canUseLiveTrading) {
          toast.error(trialStatus?.message || 'Live trading krever betalt abonnement');
          return;
        }
      }

      // Check strategy limit
      const activeStrategies = strategies.filter(s => s.is_active).length;
      const maxStrategies = tier.autoTradingStrategies === -1 ? 999 : tier.autoTradingStrategies;
      
      if (activeStrategies >= maxStrategies) {
        toast.error(`Du har nådd maksimalt antall strategier (${maxStrategies}) for ditt abonnement`);
        return;
      }

      const { error } = await supabase.from('user_strategies').insert({
        user_id: user.id,
        ...newStrategy,
      });

      if (error) {
        if (error.message.includes('unique_user_strategy')) {
          toast.error('Du har allerede en strategi av denne typen i denne modusen');
          return;
        }
        throw error;
      }

      setShowAddStrategy(false);
      // Open the newly created strategy in live view
      const { data: newStrategies } = await supabase
        .from('user_strategies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (newStrategies?.[0]) {
        setSelectedStrategy(newStrategies[0]);
      }
      fetchStrategies();
    } catch (error) {
      console.error('Error creating strategy:', error);
      toast.error('Kunne ikke opprette strategi');
    }
  };

  // Lagre Binance-nøkler
  const handleSaveBinanceKeys = async () => {
    try {
      const response = await fetch('/api/binance/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(binanceKeys),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Kunne ikke lagre nøkler');
        return;
      }

      setShowBinanceSetup(false);
      toast.success('API-nøkler lagret!');
    } catch (error) {
      console.error('Error saving Binance keys:', error);
      toast.error('Kunne ikke lagre nøkler');
    }
  };

  // Toggle strategi
  const toggleStrategy = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_strategies')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Strategi oppdatert');
      fetchStrategies();
    } catch (error) {
      console.error('Error toggling strategy:', error);
    }
  };

  // Slett strategi
  const deleteStrategy = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne strategien?')) return;

    try {
      const { error } = await supabase
        .from('user_strategies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Strategi slettet');
      fetchStrategies();
    } catch (error) {
      console.error('Error deleting strategy:', error);
    }
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Laster dashboard...</p>
        </div>
      </div>
    );
  }

  const maxStrategiesDisplay = tier.autoTradingStrategies === -1 ? '∞' : tier.autoTradingStrategies;
  const canAddStrategy = tier.autoTradingStrategies === -1 || strategies.filter(s => s.is_active).length < tier.autoTradingStrategies;

  if (selectedStrategy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950">
        <div className="max-w-7xl mx-auto p-6">
          <LiveStrategyView
            strategy={selectedStrategy}
            onBack={() => setSelectedStrategy(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Auto Trading Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Administrer dine automatiserte handelsstrategier
            </p>
          </div>
          
          <Button 
            onClick={() => setShowAddStrategy(true)}
            size="lg"
            disabled={!canAddStrategy}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Ny Strategi
          </Button>
        </div>

        {/* Trial Banner */}
        <TrialBanner trialStatus={trialStatus} locale={locale} tier={tier} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Total P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                stats.total_pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {stats.total_pnl >= 0 ? '+' : ''}{stats.total_pnl.toFixed(2)} USDT
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total_pnl >= 0 ? 'Profitt' : 'Tap'} fra alle strategier
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Aktive Strategier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.active_strategies} / {maxStrategiesDisplay}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Kjørende nå
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.win_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vinnende trades
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-orange-500" />
                Totale Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.total_trades}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alle utførte trades
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="strategies" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="strategies" className="gap-2">
              <Bot className="w-4 h-4" />
              Strategier
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historie
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Innstillinger
            </TabsTrigger>
          </TabsList>

          {/* Strategier Tab */}
          <TabsContent value="strategies" className="space-y-4">
            {strategies.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bot className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ingen strategier ennå</h3>
                  <p className="text-muted-foreground mb-4">
                    Kom i gang ved å opprette din første auto-trading strategi
                  </p>
                  <Button onClick={() => setShowAddStrategy(true)} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Opprett Strategi
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategies.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    onToggle={toggleStrategy}
                    onDelete={deleteStrategy}
                    onClick={setSelectedStrategy}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Historie Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Siste Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Ingen trades ennå</p>
                ) : (
                  <div className="space-y-2">
                    {trades.map((trade) => (
                      <div 
                        key={trade.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            trade.side === 'BUY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          )}>
                            {trade.side === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                          </div>
                          <div>
                            <p className="font-medium">{trade.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {trade.side} @ {trade.entry_price}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={trade.trading_mode === 'live' ? 'default' : 'secondary'}>
                            {trade.trading_mode === 'live' ? '🔴 Live' : '📝 Paper'}
                          </Badge>
                          {trade.pnl_usdt !== undefined && (
                            <p className={cn(
                              "text-sm font-medium",
                              trade.pnl_usdt >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {trade.pnl_usdt >= 0 ? '+' : ''}{trade.pnl_usdt.toFixed(2)} USDT
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Innstillinger Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Abonnement & Tilgang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Nåværende tier</span>
                  <Badge variant="secondary" className="capitalize text-lg px-3 py-1">
                    {tier.badge} {currentTier}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Maks strategier</span>
                  <span className="font-medium">{maxStrategiesDisplay}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Paper trading</span>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Live trading</span>
                  {tier.liveTrading ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : trialStatus?.canUseLiveTrading ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Aktiv Trial
                    </Badge>
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/${locale}/priser`}>
                    Oppgrader abonnement
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Binance API-innstillinger</CardTitle>
                <CardDescription>
                  Administrer dine Binance API-nøkler for auto trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => setShowBinanceSetup(true)}
                  className="w-full"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Konfigurer API-nøkler
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Strategy Dialog */}
      <Dialog open={showAddStrategy} onOpenChange={setShowAddStrategy}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opprett Ny Strategi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Strategi Type</Label>
              <Select 
                value={newStrategy.strategy_type}
                onValueChange={(value) => setNewStrategy(prev => ({ ...prev, strategy_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} - {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trading Mode</Label>
              <Select 
                value={newStrategy.trading_mode}
                onValueChange={(value: 'paper' | 'live') => setNewStrategy(prev => ({ ...prev, trading_mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paper">📝 Paper Trading (Simulert)</SelectItem>
                  <SelectItem 
                    value="live" 
                    disabled={!tier.liveTrading && !trialStatus?.canUseLiveTrading}
                  >
                    🟢 Live Trading {!tier.liveTrading && !trialStatus?.canUseLiveTrading ? '(Låst)' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Symbol</Label>
              <Select 
                value={newStrategy.symbol}
                onValueChange={(value) => setNewStrategy(prev => ({ ...prev, symbol: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kapital (USDT)</Label>
              <Input
                type="number"
                min="10"
                step="10"
                value={newStrategy.capital_allocation}
                onChange={(e) => setNewStrategy(prev => ({ ...prev, capital_allocation: Number(e.target.value) }))}
              />
            </div>

            <Button 
              onClick={handleCreateStrategy}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
            >
              Opprett Strategi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Binance Setup Dialog */}
      <Dialog open={showBinanceSetup} onOpenChange={setShowBinanceSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Koble til Binance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                API-nøklene krypteres før lagring. Vi lagrer aldri nøklene i klartekst.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input 
                type="password"
                value={binanceKeys.apiKey}
                onChange={(e) => setBinanceKeys({...binanceKeys, apiKey: e.target.value})}
                placeholder="Din Binance API Key"
              />
            </div>

            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input 
                type="password"
                value={binanceKeys.apiSecret}
                onChange={(e) => setBinanceKeys({...binanceKeys, apiSecret: e.target.value})}
                placeholder="Din Binance API Secret"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Bruk Testnet (paper trading)</Label>
              <Switch 
                checked={binanceKeys.isTestnet}
                onCheckedChange={(v) => setBinanceKeys({...binanceKeys, isTestnet: v})}
              />
            </div>

            {!binanceKeys.isTestnet && !tier.liveTrading && !trialStatus?.canUseLiveTrading && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Live trading krever Bachelor-tier eller høyere
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSaveBinanceKeys}
              className="w-full"
              disabled={!binanceKeys.apiKey || !binanceKeys.apiSecret}
            >
              Lagre og koble til
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Du kan opprette API-nøkler i din{' '}
              <a 
                href="https://www.binance.com/en/my/settings/api-management" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                Binance-konto
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
