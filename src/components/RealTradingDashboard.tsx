"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/utils";
import { ArrowRight, TrendingUp, Wallet, Activity } from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  order_type: string;
  quantity: number;
  quantity_nok: number;
  price_per_unit: number;
  current_price: number;
  pnl_nok: number;
  pnl_percent: number;
  status: "open" | "closed" | "cancelled";
  executed_at: string;
  closed_at?: string;
}

interface PortfolioStats {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  openTrades: number;
  closedTrades: number;
}

export default function RealTradingDashboard() {
  const locale = useLocale();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [stats, setStats] = useState<PortfolioStats>({
    totalValue: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    openTrades: 0,
    closedTrades: 0,
  });
  const supabase = createClient();

  // Fetch user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, [supabase]);

  // Calculate portfolio stats from trades
  const calculateStats = useCallback((tradeData: Trade[]) => {
    const openTrades = tradeData.filter(t => t.status === "open");
    const closedTrades = tradeData.filter(t => t.status === "closed");
    
    const totalPnl = tradeData.reduce((sum, t) => sum + (t.pnl_nok || 0), 0);
    const totalValue = tradeData.reduce((sum, t) => {
      const value = t.status === "open" 
        ? (t.current_price || t.price_per_unit) * t.quantity
        : (t.price_per_unit * t.quantity) + (t.pnl_nok || 0);
      return sum + value;
    }, 0);
    
    const initialValue = tradeData.reduce((sum, t) => 
      sum + (t.price_per_unit * t.quantity), 0
    ) || 1;
    
    const totalPnlPercent = (totalPnl / initialValue) * 100;

    setStats({
      totalValue,
      totalPnl,
      totalPnlPercent,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
    });
  }, []);

  // Fetch trades
  const fetchTrades = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("auto_trades")
        .select("*")
        .eq("user_id" as unknown, user.id)
        .order("executed_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const typedData = ((data || []) as unknown) as Trade[];
      setTrades(typedData);
      calculateStats(typedData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ukjent feil oppstod";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase, user, calculateStats]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user, fetchTrades]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("trades-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auto_trades",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTrade = payload.new as Trade;
          setTrades((prev) => [newTrade, ...prev]);
          calculateStats([newTrade, ...trades]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auto_trades",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedTrade = payload.new as Trade;
          setTrades((prev) =>
            prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
          );
          calculateStats(
            trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, user, trades, calculateStats]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Feil ved lasting av data</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => fetchTrades()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (trades.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Trading Dashboard
        </h2>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ingen handler ennå
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start din første auto-trading strategi for å se handler og
            porteføljeoppdateringer i sanntid.
          </p>
          <Link
            href={`/${locale}/paper-trading`}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start lekepenger
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Trading Dashboard</h2>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-sm">Total Verdi</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {stats.totalValue.toLocaleString("no-NO", {
              style: "currency",
              currency: "NOK",
            })}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Total P&L</span>
          </div>
          <p
            className={`text-xl font-bold ${
              stats.totalPnl >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {stats.totalPnl >= 0 ? "+" : ""}
            {stats.totalPnl.toLocaleString("no-NO", {
              style: "currency",
              currency: "NOK",
            })}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <span className="text-sm">Avkastning</span>
          </div>
          <p
            className={`text-xl font-bold ${
              stats.totalPnlPercent >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {stats.totalPnlPercent >= 0 ? "+" : ""}
            {(stats.totalPnlPercent ?? 0).toFixed(2)}%
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <span className="text-sm">Åpne Handler</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.openTrades}</p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Side
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Pris
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Antall
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  P&L
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Tid
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        trade.side === "buy"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {trade.side === "buy" ? "KJØP" : "SALG"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {trade.price_per_unit?.toLocaleString("no-NO", {
                      style: "currency",
                      currency: "NOK",
                    })}
                  </td>
                  <td className="px-4 py-3">{trade.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        (trade.pnl_nok || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {(trade.pnl_nok || 0) >= 0 ? "+" : ""}
                      {(trade.pnl_nok || 0).toLocaleString("no-NO", {
                        style: "currency",
                        currency: "NOK",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        trade.status === "open"
                          ? "bg-blue-100 text-blue-700"
                          : trade.status === "closed"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {trade.status === "open"
                        ? "ÅPEN"
                        : trade.status === "closed"
                        ? "LUKKET"
                        : "KANSELLERT"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(trade.executed_at).toLocaleString("no-NO", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
