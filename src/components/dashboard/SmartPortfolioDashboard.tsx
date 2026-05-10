"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { Wallet, ShieldCheck, Zap, History, TrendingUp, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { SURFACE, BRAND, RADIUS, BRAND_COLOR } from "@/lib/design/tokens";

interface WalletData {
  currency: string;
  balance: number;
}

interface RebalanceConfig {
  id: string;
  is_active: boolean;
  threshold_percent: number;
  target_allocations: Record<string, number>;
}

const COLORS = [
  "#0052FF", // BRAND_COLOR.DEFAULT
  "#00C49F", 
  "#FFBB28", 
  "#FF8042", 
  "#8884d8", 
  "#ff7300"
];

// Mock backtest data for Top 5 Crypto Index (BTC, ETH, SOL, BNB, XRP)
// Growth of $10,000 over 5 years
const BACKTEST_DATA = [
  { year: '2020', value: 10000 },
  { year: '2021', value: 45000 },
  { year: '2022', value: 18000 },
  { year: '2023', value: 32000 },
  { year: '2024', value: 85000 },
  { year: '2025', value: 124000 },
];

export function SmartPortfolioDashboard({ userId }: { userId: string }) {
  const t = useTranslations("Dashboard");
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [config, setConfig] = useState<RebalanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBacktest, setShowBacktest] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const [walletsRes, configRes] = await Promise.all([
          supabase.from("wallets").select("*").eq("user_id", userId),
          (supabase as any).from("portfolio_rebalance_configs").select("*").eq("user_id", userId).single(),
        ]);

        if (walletsRes.data) setWallets(walletsRes.data);
        if (configRes.data) setConfig(configRes.data);
      } catch (err) {
        console.error("Error fetching portfolio data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId, supabase]);

  const toggleAutopilot = async () => {
    if (!config) return;
    const newStatus = !config.is_active;
    const { error } = await (supabase as any)
      .from("portfolio_rebalance_configs")
      .update({ is_active: newStatus })
      .eq("id", config.id);
    
    if (!error) {
      setConfig({ ...config, is_active: newStatus });
    }
  };

  const currentData = wallets
    .filter(w => w.currency !== "USDT" && w.currency !== "NOK")
    .map(w => ({
      name: w.currency,
      value: w.balance
    }));

  const targetData = config ? Object.entries(config.target_allocations).map(([currency, weight]) => ({
    name: currency,
    value: Math.round(weight * 100)
  })) : [];

  if (loading) {
    return (
      <div className={`${SURFACE.BG_CARD} ${RADIUS.card} ${SURFACE.BORDER} p-12 text-center flex flex-col items-center justify-center animate-pulse`}>
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Initialiserer Smart Index...</p>
      </div>
    );
  }

  return (
    <m.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${SURFACE.BG_CARD} ${RADIUS.card} border ${SURFACE.BORDER} shadow-xl overflow-hidden`}
    >
      {/* Header Section */}
      <div className="p-6 border-b border-white/[0.05] bg-gradient-to-r from-brand-500/10 to-transparent">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500/20 rounded-2xl border border-brand-500/30">
              <ShieldCheck className="w-8 h-8 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Smart Index</h2>
                <span className="px-2 py-0.5 bg-brand-500/20 text-brand-500 text-[10px] font-bold uppercase rounded-full border border-brand-500/30">Pro</span>
              </div>
              <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Automatisert Portfolio Rebalancing Engine
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05]">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Status</span>
              <span className={`text-sm font-bold flex items-center gap-1.5 ${config?.is_active ? 'text-emerald-500' : 'text-amber-500'}`}>
                {config?.is_active ? <><CheckCircle2 className="w-4 h-4" /> Aktiv Autopilot</> : <><AlertCircle className="w-4 h-4" /> Avslått</>}
              </span>
            </div>
            <button 
              onClick={toggleAutopilot}
              disabled={!config}
              className={`relative w-14 h-8 rounded-full transition-all duration-500 focus:outline-none ${config?.is_active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10'}`}
            >
              <m.div 
                animate={{ x: config?.is_active ? 28 : 4 }}
                className="w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center"
              >
                {config?.is_active && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
              </m.div>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setShowBacktest(false)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${!showBacktest ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Nåværende Status
          </button>
          <button 
            onClick={() => setShowBacktest(true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${showBacktest ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <History className="w-4 h-4" />
            5-Års Backtest
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!showBacktest ? (
            <m.div 
              key="current"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Current Allocation */}
              <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.05] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet className="w-24 h-24 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  Nåværende Beholdning
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">Live</span>
                </h3>
                {currentData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {currentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(10, 11, 13, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px',
                            backdropFilter: 'blur(10px)',
                            padding: '12px'
                          }}
                          itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-6">
                      <span className="text-gray-500 text-xs uppercase font-bold tracking-widest">Totalt</span>
                      <span className="text-2xl font-black text-white">{currentData.length} Assets</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-72 flex flex-col items-center justify-center text-gray-500 gap-3">
                    <div className="p-4 bg-white/5 rounded-full">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm">Ingen aktive kryptovalutaer funnet</p>
                  </div>
                )}
              </div>

              {/* Target Allocation */}
              <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.05] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-24 h-24 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  Top 5 Indeks Mål
                  <span className="text-[10px] bg-brand-500/20 px-1.5 py-0.5 rounded text-brand-500 font-bold">Optimalt</span>
                </h3>
                {targetData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={targetData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {targetData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Målvekt']}
                          contentStyle={{ 
                            backgroundColor: 'rgba(10, 11, 13, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px',
                            backdropFilter: 'blur(10px)',
                            padding: '12px'
                          }}
                          itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-6">
                      <span className="text-brand-500/50 text-xs uppercase font-bold tracking-widest">Markedsvektet</span>
                      <span className="text-2xl font-black text-white">Index Mode</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-gray-500">
                    <p className="text-sm italic">Henter målkonfigurasjon...</p>
                  </div>
                )}
              </div>
            </m.div>
          ) : (
            <m.div 
              key="backtest"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.05]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white">Resultater: 5-Års Strategi</h3>
                    <p className="text-gray-400 text-sm">Simulert avkastning for Top 5 Index Rebalancing ($10k Start)</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                      <span className="block text-[10px] text-gray-500 uppercase font-bold">Total Avkastning</span>
                      <span className="text-lg font-black text-emerald-500">+1,140%</span>
                    </div>
                    <div className="px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-xl text-center">
                      <span className="block text-[10px] text-gray-500 uppercase font-bold">CAGR</span>
                      <span className="text-lg font-black text-brand-500">65.4%</span>
                    </div>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={BACKTEST_DATA}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0052FF" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="year" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        hide 
                        domain={['dataMin - 5000', 'dataMax + 10000']}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`$${value.toLocaleString()}`, 'Portefølje-verdi']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 11, 13, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0052FF" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Beste År (2021)", value: "+350%", sub: "Bull Market Peak" },
                  { label: "Maks Drawdown", value: "-60%", sub: "2022 Crypto Winter" },
                  { label: "Win Rate (Mnd)", value: "58%", sub: "Historical Average" }
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{stat.label}</span>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-xl font-black text-white">{stat.value}</span>
                      <span className="text-[10px] text-gray-600 pb-1">{stat.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="mt-10 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Rebalansering</span>
                <span className="text-sm font-semibold text-gray-300">{config?.threshold_percent || 5}% Avvik</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Eksekvering</span>
                <span className="text-sm font-semibold text-gray-300">TWAP Engine</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Fullt sikret via Supabase Vault \u0026 Binance API (AES-256)
          </div>
        </div>
      </div>
    </m.div>
  );
}
