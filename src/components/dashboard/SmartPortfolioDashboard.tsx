"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { Wallet, ShieldCheck, Zap, History, TrendingUp, Info, AlertCircle, CheckCircle2, Activity, ArrowRight, RefreshCcw, BarChart3 } from "lucide-react";
import { SURFACE, BRAND, RADIUS, BRAND_COLOR } from "@/lib/design/tokens";
import { useRealtimeStore } from "@/store/realtime-store";
import { PriceAggregator } from "@/lib/realtime";

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

interface RebalanceOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount_usdt: number;
  executed_amount_usdt: number;
  status: string;
  twap_chunks: number;
  executed_chunks: number;
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
  const [activeOrders, setActiveOrders] = useState<RebalanceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBacktest, setShowBacktest] = useState(false);
  const [healthScore, setHealthScore] = useState(100);
  const [currentAllocations, setCurrentAllocations] = useState<Record<string, number>>({});

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const [walletsRes, configRes, ordersRes] = await Promise.all([
          supabase.from("wallets").select("*").eq("user_id", userId),
          (supabase as any).from("portfolio_rebalance_configs").select("*").eq("user_id", userId).maybeSingle(),
          (supabase as any).from("portfolio_rebalance_orders")
            .select("*")
            .eq("user_id", userId)
            .in("status", ["pending", "partial"])
        ]);

        if (walletsRes.data) setWallets(walletsRes.data);
        if (ordersRes.data) setActiveOrders(ordersRes.data);
        
        if (configRes.data) {
          setConfig(configRes.data);
        } else {
          // Create default config if missing
          const defaultConfig = {
            user_id: userId,
            is_active: false,
            threshold_percent: 5,
            target_allocations: {
              "BTC": 0.50,
              "ETH": 0.30,
              "SOL": 0.10,
              "BNB": 0.05,
              "XRP": 0.05
            }
          };
          
          const { data: newConfig, error: insertError } = await (supabase as any)
            .from("portfolio_rebalance_configs")
            .insert(defaultConfig)
            .select()
            .single();
            
          if (!insertError && newConfig) {
            setConfig(newConfig);
          }
        }
      } catch (err) {
        console.error("Error fetching portfolio data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Subscribe to real-time updates for orders
    const channel = supabase
      .channel('rebalance-orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'portfolio_rebalance_orders',
        filter: `user_id=eq.${userId}` 
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    } else {
      console.error("Failed to toggle autopilot", error);
    }
  };


  
  // Start price aggregator for relevant symbols
  useEffect(() => {
    if (!config) return;
    const symbols = Object.keys(config.target_allocations).map(s => `${s}USDT`);
    const aggregator = new PriceAggregator({ symbols });
    aggregator.start();
    return () => aggregator.stop();
  }, [config]);

  const symbols = config ? Object.keys(config.target_allocations) : ["BTC", "ETH", "SOL", "BNB", "XRP"];
  // We use the store's priceCache instead of the local hook for more robustness
  const priceCache = useRealtimeStore(state => state.priceCache);

  useEffect(() => {
    if (!config) return;
    
    // Calculate current allocations based on prices from the store
    let totalValue = 0;
    const values: Record<string, number> = {};
    
    // Get USDT/NOK rate if needed (mocked or from store if available)
    const usdtNokRate = 10.5; // This should ideally come from a hook or store

    wallets.forEach(w => {
      const symbol = w.currency === "USDT" ? "USDT" : `${w.currency}USDT`;
      const priceData = priceCache[symbol];
      let price = 0;
      
      if (w.currency === "USDT") price = 1;
      else if (w.currency === "NOK") price = 1 / usdtNokRate;
      else price = priceData?.price || 0;
      
      const val = Number(w.balance) * price;
      values[w.currency] = val;
      totalValue += val;
    });

    if (totalValue > 0) {
      const allocations: Record<string, number> = {};
      let totalDrift = 0;
      
      Object.keys(config.target_allocations).forEach(sym => {
        const currentWeight = (values[sym] || 0) / totalValue;
        const targetWeight = config.target_allocations[sym];
        allocations[sym] = currentWeight;
        totalDrift += Math.abs(currentWeight - targetWeight);
      });

      setCurrentAllocations(allocations);
      // Health Score: 100 - (totalDrift * 100)
      setHealthScore(Math.max(0, Math.min(100, Math.round(100 - (totalDrift * 100)))));
    }
  }, [priceCache, wallets, config]);

  const currentAllocationData = Object.entries(currentAllocations)
    .filter(([_, weight]) => weight > 0)
    .map(([name, weight]) => ({
      name,
      value: weight * 100
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
            <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-2">
              <div className="relative flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <m.circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray="125.6"
                    initial={{ strokeDashoffset: 125.6 }}
                    animate={{ strokeDashoffset: 125.6 - (125.6 * healthScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={healthScore > 90 ? 'text-emerald-500' : healthScore > 70 ? 'text-amber-500' : 'text-rose-500'}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] font-black text-white leading-none">{healthScore}%</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Helse</span>
                <span className={`text-xs font-bold ${healthScore > 90 ? 'text-emerald-500' : healthScore > 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {healthScore > 95 ? 'Perfekt' : healthScore > 85 ? 'God' : 'Krever Rebalansering'}
                </span>
              </div>
            </div>

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
                {currentAllocationData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentAllocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {currentAllocationData.map((entry, index) => (
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
                      <span className="text-2xl font-black text-white">{currentAllocationData.length} Assets</span>
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

        {/* Active TWAP Orders Section */}
        {activeOrders.length > 0 && (
          <m.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 bg-brand-500/[0.03] border border-brand-500/10 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500 animate-pulse" />
                Aktive TWAP Ordrer ({activeOrders.length})
              </h4>
              <span className="text-[10px] text-gray-500 italic flex items-center gap-1">
                <RefreshCcw className="w-3 h-3 animate-spin" />
                Oppdateres live
              </span>
            </div>
            
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div key={order.id} className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${order.side === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      <TrendingUp className={`w-4 h-4 ${order.side === 'sell' ? 'rotate-180' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{order.symbol}</span>
                        <span className={`text-[10px] font-bold uppercase ${order.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {order.side === 'buy' ? 'Kjøp' : 'Salg'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">${order.amount_usdt.toLocaleString()} totalt</span>
                    </div>
                  </div>

                  <div className="flex-1 max-w-[200px] w-full">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      <span className="text-gray-500">Eksekvering</span>
                      <span className="text-brand-500">{Math.round((order.executed_chunks / order.twap_chunks) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                      {Array.from({ length: order.twap_chunks }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-full flex-1 rounded-sm transition-all duration-1000 ${i < order.executed_chunks ? 'bg-brand-500 shadow-[0_0_8px_rgba(0,82,255,0.4)]' : 'bg-white/10'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <span className="bg-white/5 px-2 py-1 rounded-md">
                      {order.executed_chunks} / {order.twap_chunks} bolker
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* Target vs Current Comparison */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-brand-500" />
              Allokeringsanalyse
            </h4>
            <div className="space-y-4">
              {Object.entries(config?.target_allocations || {}).map(([symbol, target]: [string, any]) => {
                const current = currentAllocations[symbol] || 0;
                const diff = current - target;
                const isOver = diff > 0;
                
                return (
                  <div key={symbol} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white">{symbol}</span>
                      <div className="flex gap-3">
                        <span className="text-gray-500">Mål: {(target * 100).toFixed(0)}%</span>
                        <span className={Math.abs(diff) > (config?.threshold_percent || 5) / 100 ? 'text-amber-500' : 'text-emerald-500'}>
                          Nå: {(current * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                      <div 
                        className="absolute h-full bg-brand-500/20 border-r-2 border-brand-500" 
                        style={{ width: `${target * 100}%` }}
                      />
                      <m.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${current * 100}%` }}
                        className={`h-full relative z-10 ${Math.abs(diff) > (config?.threshold_percent || 5) / 100 ? 'bg-amber-500' : 'bg-brand-500'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex flex-col justify-center items-center text-center">
            <div className="p-4 bg-brand-500/10 rounded-full mb-3">
              <ShieldCheck className="w-8 h-8 text-brand-500" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Portefølje-integritet</h4>
            <p className="text-xs text-gray-500 max-w-[200px]">
              {healthScore > 95 
                ? "Porteføljen din er optimalt balansert i henhold til din valgte strategi."
                : "Systemet overvåker avvik og vil starte TWAP-rebalansering ved behov."}
            </p>
            <div className="mt-4 flex gap-2">
              <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-gray-400">
                Slippage: <span className="text-white">Lav</span>
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-gray-400">
                Gass: <span className="text-white">Optimal</span>
              </div>
            </div>
          </div>
        </div>

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
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Sist Oppdatert</span>
                <span className="text-sm font-semibold text-gray-300">{new Date().toLocaleTimeString()}</span>
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
