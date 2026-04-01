"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import type { Profile } from "@/types/database";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Stats {
  totalStudents: number;
  availableSpots: number;
  statusChecked: number;
  exchangeConnected: number;
  binanceClicked: number;
  last24h: number;
  last7d: number;
}

export function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    availableSpots: 100,
    statusChecked: 0,
    exchangeConnected: 0,
    binanceClicked: 0,
    last24h: 0,
    last7d: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // Hent alle studenter
      const { data: students, error } = await supabase
        .from("beta_signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const totalStudents = students?.length || 0;

      setStats({
        totalStudents,
        availableSpots: 100 - totalStudents,
        statusChecked:
          students?.filter((s: Profile) => s.onboarding_step !== "registered")
            .length || 0,
        exchangeConnected:
          students?.filter((s: Profile) => s.exchange_connected).length || 0,
        binanceClicked:
          students?.filter((s: Profile) => s.binance_clicked).length || 0,
        last24h:
          students?.filter(
            (s: Profile) => s.created_at && new Date(s.created_at) > last24h,
          ).length || 0,
        last7d:
          students?.filter(
            (s: Profile) => s.created_at && new Date(s.created_at) > last7d,
          ).length || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();

    // 🔥 Realtime updates for the dashboard
    const channel = supabase
      .channel("admin-stats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "beta_signups" },
        () => fetchStats(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades" },
        () => fetchStats(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats, supabase]);

  const statCards = [
    {
      title: "Registrerte studenter",
      value: stats.totalStudents,
      subtitle: `${stats.availableSpots} ledige plasser`,
      icon: Users,
      trend: stats.last24h > 0 ? `+${stats.last24h} i dag` : undefined,
      trendUp: true,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      title: "Har sjekket status",
      value: stats.statusChecked,
      subtitle: `${Math.round((stats.statusChecked / Math.max(stats.totalStudents, 1)) * 100)}% aktivering`,
      icon: Activity,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      title: "Børs koblet",
      value: stats.exchangeConnected,
      subtitle: `${Math.round((stats.exchangeConnected / Math.max(stats.totalStudents, 1)) * 100)}% konvertering`,
      icon: Wallet,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      title: "Binance-lenke klikket",
      value: stats.binanceClicked,
      subtitle: "Monetization signal",
      icon: TrendingUp,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Oversikt over Klarpakke Universitet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{card.title}</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {card.value}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      {card.subtitle}
                    </p>
                    {card.trend && (
                      <div
                        className={`flex items-center gap-1 mt-2 text-sm ${card.trendUp ? "text-green-400" : "text-red-400"}`}
                      >
                        {card.trendUp ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {card.trend}
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Siste aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <p className="text-white font-medium">
                  Nye registreringer siste 24 timer
                </p>
                <p className="text-slate-400 text-sm">
                  {stats.last24h} nye studenter
                </p>
              </div>
              <span className="text-green-400 text-sm font-medium">
                +{stats.last24h}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <p className="text-white font-medium">
                  Nye registreringer siste 7 dager
                </p>
                <p className="text-slate-400 text-sm">
                  {stats.last7d} nye studenter
                </p>
              </div>
              <span className="text-green-400 text-sm font-medium">
                +{stats.last7d}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white font-medium">Oppstart</p>
                <p className="text-slate-400 text-sm">15. februar 2026</p>
              </div>
              <span className="text-blue-400 text-sm font-medium">
                Om{" "}
                {Math.ceil(
                  (new Date("2026-02-15").getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                dager
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
