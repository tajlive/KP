"use client";

import { useState, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  Activity,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

interface SyncLog {
  id: string;
  user_id: string;
  status: "success" | "error" | "in_progress" | null;
  message: string | null;
  trades_fetched: number | null;
  trades_saved: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message?: string | null;
  user_email?: string | null;
}

interface SyncStats {
  totalUsers: number;
  usersWithApiKeys: number;
  last24Hours: {
    total: number;
    successful: number;
    failed: number;
  };
  totalTrades: number;
  recentSyncs: SyncLog[];
}

export default function SyncStatusPage() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const supabase = createClient();

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get all sync logs
      const { data: logs, error: logsError } = await supabase
        .from("trade_sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Get user profiles for email lookup
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email");

      const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      // Enrich logs with emails
      const enrichedLogs =
        logs?.map((log) => ({
          ...log,
          user_email: emailMap.get(log.user_id),
        })) || [];

      // Calculate stats
      const last24Hours = enrichedLogs.filter(
        (log) =>
          log.started_at &&
          new Date(log.started_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
      );

      // Get unique users with API keys
      const { count: apiKeyCount } = await supabase
        .from("trading_api_keys")
        .select("*", { count: "exact", head: true });

      // Get total trades
      const { count: tradesCount } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: profiles?.length || 0,
        usersWithApiKeys: apiKeyCount || 0,
        last24Hours: {
          total: last24Hours.length,
          successful: last24Hours.filter((l) => l.status === "success").length,
          failed: last24Hours.filter((l) => l.status === "error").length,
        },
        totalTrades: tradesCount || 0,
        recentSyncs: enrichedLogs.slice(0, 20) as SyncLog[],
      });
    } catch (_error) {
      toast.error("Failed to fetch sync stats");
    } finally {
      setLoading(false);
    }
  };

  const triggerManualSync = async () => {
    setTriggering(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-sync-trades`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Manual sync triggered! ${result.usersSuccess} users synced`,
        );
        fetchStats();
      } else {
        toast.error(result.error || "Sync failed");
      }
    } catch (_error) {
      toast.error("Failed to trigger sync");
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel("admin-sync-status")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_sync_log" },
        () => {
          fetchStats();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("no-NO");
  };

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "in_progress":
        return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trade Sync Status</h1>
          <p className="text-slate-400">Monitor auto-sync for all users</p>
        </div>
        <Button
          onClick={triggerManualSync}
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {triggering ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Trigger Manual Sync
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Users with API</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.usersWithApiKeys} / {stats?.totalUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Last 24h Syncs</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.last24Hours.total}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {stats?.last24Hours.total
                    ? Math.round(
                        (stats.last24Hours.successful /
                          stats.last24Hours.total) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Trades</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.totalTrades.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Syncs */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Sync Activity</CardTitle>
          <CardDescription className="text-slate-400">
            Last 20 sync attempts across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-700">
                  <th className="pb-3 text-slate-400 font-medium">Status</th>
                  <th className="pb-3 text-slate-400 font-medium">User</th>
                  <th className="pb-3 text-slate-400 font-medium">Message</th>
                  <th className="pb-3 text-slate-400 font-medium">Trades</th>
                  <th className="pb-3 text-slate-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentSyncs.map((sync) => (
                  <tr key={sync.id} className="border-b border-slate-800/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(sync.status)}
                        <span
                          className={`text-sm capitalize ${
                            sync.status === "success"
                              ? "text-green-400"
                              : sync.status === "error"
                                ? "text-red-400"
                                : "text-blue-400"
                          }`}
                        >
                          {sync.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300 text-sm">
                      {sync.user_email || sync.user_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-slate-400 text-sm max-w-xs truncate">
                      {sync.message}
                    </td>
                    <td className="py-3 text-slate-300 text-sm">
                      {sync.trades_saved} / {sync.trades_fetched}
                    </td>
                    <td className="py-3 text-slate-500 text-sm">
                      {formatTime(sync.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Sync Info */}
      <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-white">Auto-Sync Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-slate-400">
            <p>
              <strong className="text-white">Schedule:</strong> Every 15 minutes
            </p>
            <p>
              <strong className="text-white">Function:</strong> auto-sync-trades
            </p>
            <p>
              <strong className="text-white">Status:</strong> Active
            </p>
            <p className="text-sm mt-4">
              The auto-sync function runs automatically every 15 minutes to sync
              trades from Kraken for all users with connected API keys.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
