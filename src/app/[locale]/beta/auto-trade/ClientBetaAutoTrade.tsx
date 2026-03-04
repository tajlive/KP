'use client';

import { useState, useEffect } from 'react';
import {
    Play,
    Pause,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Settings,
    History,
    Zap
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePaperTrading } from '@/hooks/usePaperTrading';
import { RiskLevel } from '@/types/paper-trading';

interface RobotStatus {
    isRunning: boolean;
    lastTrade: {
        symbol: string;
        side: 'buy' | 'sell';
        price: number;
        time: string;
        pnl: number;
    } | null;
    totalPnL: number;
    openPositions: number;
}

interface RecentTrade {
    symbol: string;
    side: 'buy' | 'sell';
    price: number;
    minutesAgo: number;
    pnl: number;
}

export const dynamic = 'force-dynamic';

export default function ClientBetaAutoTrade() {
    const tBeta = useTranslations('beta');
    const tAutoTrade = useTranslations('autoTrade');
    const { simulation, loading, startAutoTrade, stopAutoTrade } = usePaperTrading();
    const [localIsRunning, setLocalIsRunning] = useState(false);

    // Sync local state with real simulation status
    useEffect(() => {
        setLocalIsRunning(!!simulation?.is_active);
    }, [simulation]);

    // Strategy settings
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('standard');
    const [maxPosition, setMaxPosition] = useState(10);
    const [selectedSymbols, setSelectedSymbols] = useState(['BTC/USDT', 'ETH/USDT']);

    const symbols = [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
        'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'TRX/USDT', 'DOT/USDT'
    ];

    const handleStart = async () => {
        try {
            await startAutoTrade(riskLevel);
        } catch (e) {
            console.error(e);
        }
    };

    const handlePause = async () => {
        try {
            await stopAutoTrade();
            setLocalIsRunning(false);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleSymbol = (symbol: string) => {
        if (selectedSymbols.includes(symbol)) {
            setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
        } else {
            setSelectedSymbols([...selectedSymbols, symbol]);
        }
    };

    // Helper function to format time ago
    const getTimeAgo = (minutes: number): string => {
        if (minutes < 60) {
            return minutes === 1 
                ? tAutoTrade('timeAgo.min', { n: minutes })
                : tAutoTrade('timeAgo.mins', { n: minutes });
        } else {
            const hours = Math.floor(minutes / 60);
            return hours === 1
                ? tAutoTrade('timeAgo.hour', { n: hours })
                : tAutoTrade('timeAgo.hours', { n: hours });
        }
    };

    const recentTrades: RecentTrade[] = [
        { symbol: 'BTC/USDT', side: 'buy', price: 43250, minutesAgo: 2, pnl: 0 },
        { symbol: 'ETH/USDT', side: 'sell', price: 2580, minutesAgo: 15, pnl: 4.20 },
        { symbol: 'SOL/USDT', side: 'buy', price: 98.50, minutesAgo: 60, pnl: -1.30 },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                        <Zap className="text-orange-500 fill-current" />
                        {tBeta('autoTrade')}
                    </h1>
                    <p className="text-slate-400">{tAutoTrade('subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    {!localIsRunning ? (
                        <Button
                            onClick={handleStart}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12 px-8"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            {loading ? 'Laster...' : 'Start Robot'}
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePause}
                            disabled={loading}
                            variant="outline"
                            className="border-amber-500 text-amber-500 hover:bg-amber-500/10 gap-2 h-12 px-8"
                        >
                            <Pause className="w-5 h-5 fill-current" />
                            Pause Robot
                        </Button>
                    )}
                </div>
            </div>

            {/* Status & Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Control */}
                <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <TrendingUp className="text-blue-500" />
                            Live Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div className="text-center p-4 rounded-xl bg-slate-800/30">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${localIsRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                    <span className={`font-bold ${localIsRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                                        {localIsRunning ? tAutoTrade('status.running').toUpperCase() : tAutoTrade('status.stopped').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-slate-800/30">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Posisjoner</p>
                                <p className="text-2xl font-bold text-white">{simulation?.settings?.max_positions || 0}</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-slate-800/30">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total P&L</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {simulation ? ((simulation.current_balance - simulation.initial_balance) / simulation.initial_balance * 100).toFixed(2) : '0.00'}%
                                </p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-slate-800/30">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Balans</p>
                                <p className="text-2xl font-bold text-white">${simulation?.current_balance?.toLocaleString() || '1,000,000'}</p>
                            </div>
                        </div>

                        {/* Recent Trades List */}
                        <div className="mt-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Siste Aktivitet
                            </h3>
                            <div className="space-y-3">
                                {recentTrades.map((trade, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded ${trade.side === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {trade.side === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{trade.symbol}</p>
                                                <p className="text-xs text-slate-500">{getTimeAgo(trade.minutesAgo)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white">${trade.price.toLocaleString()}</p>
                                            <p className={`text-xs ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl}%
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Robot Settings */}
                <div className="space-y-6">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Settings className="text-slate-400" />
                                {tAutoTrade('selectRisk')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* 3 Nivåer - Klikkbare kort */}
                            <div className="grid gap-3">
                                <button
                                    onClick={() => setRiskLevel('low')}
                                    className={`p-4 rounded-xl border text-left transition-all ${riskLevel === 'low'
                                        ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold ${riskLevel === 'low' ? 'text-blue-400' : 'text-white'}`}>Konservativ</span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">Lav Risk</span>
                                    </div>
                                    <p className="text-xs text-slate-400">Små, trygge gevinster. Større stop-loss marginer.</p>
                                </button>

                                <button
                                    onClick={() => setRiskLevel('standard')}
                                    className={`p-4 rounded-xl border text-left transition-all ${riskLevel === 'standard'
                                        ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500'
                                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold ${riskLevel === 'standard' ? 'text-emerald-400' : 'text-white'}`}>Balansert</span>
                                        <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">Anbefalt</span>
                                    </div>
                                    <p className="text-xs text-slate-400">Optimal balanse mellom risiko og avkastning.</p>
                                </button>

                                <button
                                    onClick={() => setRiskLevel('high')}
                                    className={`p-4 rounded-xl border text-left transition-all ${riskLevel === 'high'
                                        ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500'
                                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold ${riskLevel === 'high' ? 'text-emerald-400' : 'text-white'}`}>Aggressiv</span>
                                        <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">Høy Risk</span>
                                    </div>
                                    <p className="text-xs text-slate-400">Større posisjoner, strammere stop-loss. Høy volatilitet.</p>
                                </button>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Handelspar</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                    {symbols.map((symbol) => (
                                        <button
                                            key={symbol}
                                            onClick={() => toggleSymbol(symbol)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${selectedSymbols.includes(symbol)
                                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:border-slate-600'
                                                }`}
                                        >
                                            {symbol.split('/')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400 font-medium">Maks posisjoner</span>
                                    <span className="text-blue-400 font-bold">{maxPosition}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={maxPosition}
                                    onChange={(e) => setMaxPosition(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-500/5 border-red-500/20">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-400 mb-1">Nødstopp</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {tAutoTrade('closePositions')}
                                    </p>
                                    <Button variant="destructive" size="sm" className="mt-3 w-full h-8 text-xs font-bold">
                                        Force Close All
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
