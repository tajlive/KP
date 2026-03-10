"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pause, Play, Square, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TradingSession {
  id: string;
  mode: "paper" | "live";
  status: "active" | "paused" | "stopped";
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  winning_trades: number;
  total_trades: number;
  created_at: string;
}

interface Trade {
  id: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  profit_loss: number | null;
  created_at: string;
}

interface PaperTradingSessionDetailProps {
  session: TradingSession;
  trades: Trade[];
  locale: string;
}

export function PaperTradingSessionDetail({
  session: initialSession,
  trades: initialTrades,
  locale,
}: PaperTradingSessionDetailProps) {
  const t = useTranslations("paperTrading");
  const router = useRouter();
  const supabase = createClient();
  
  const [session, setSession] = useState<TradingSession>(initialSession);
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [loading, setLoading] = useState(false);

  // Realtime subscription for trades
  useEffect(() => {
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setTrades((prev) => [payload.new as Trade, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as TradingSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id, supabase]);

  const handleStatusChange = async (newStatus: "active" | "paused" | "stopped") => {
    setLoading(true);
    try {
      const response = await fetch(`/api/trading-sessions/${session.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const data = await response.json();
      setSession(data.session);

      if (newStatus === "stopped") {
        router.push(`/${locale}/paper-trading`);
      }
    } catch (err) {
      console.error("Failed to change status:", err);
    } finally {
      setLoading(false);
    }
  };

  const pnlPercent = session.starting_capital_nok
    ? ((session.current_capital_nok - session.starting_capital_nok) /
        session.starting_capital_nok) *
      100
    : 0;
  const isProfitable = pnlPercent >= 0;
  const winRate = session.total_trades > 0
    ? Math.round((session.winning_trades / session.total_trades) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">{t("active")}</Badge>;
      case "paused":
        return <Badge variant="secondary">{t("paused")}</Badge>;
      case "stopped":
        return <Badge variant="outline">{t("stopped")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/paper-trading`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("title")}
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {session.trading_pair}
          </h1>
          {getStatusBadge(session.status)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("capital")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {session.current_capital_nok.toLocaleString("nb-NO")} kr
              </span>
              <span
                className={`text-sm font-medium ${
                  isProfitable ? "text-green-600" : "text-red-600"
                }`}
              >
                {isProfitable ? "+" : ""}
                {pnlPercent.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t("startCapital")}: {session.starting_capital_nok.toLocaleString("nb-NO")} kr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("winRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {winRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {session.winning_trades}/{session.total_trades} {t("trades").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  isProfitable ? "text-green-600" : "text-red-600"
                }`}
              >
                {isProfitable ? "+" : ""}
                {session.total_pnl?.toLocaleString("nb-NO") || 0} kr
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t("total")} {t("trades").toLowerCase()}: {session.total_trades}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {session.status !== "stopped" && (
        <div className="flex gap-2">
          {session.status === "active" ? (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("paused")}
              disabled={loading}
              className="gap-2"
            >
              <Pause className="w-4 h-4" />
              {t("pauseBot")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("active")}
              disabled={loading}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              {t("resume")}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => handleStatusChange("stopped")}
            disabled={loading}
            className="gap-2"
          >
            <Square className="w-4 h-4" />
            {t("stopSession")}
          </Button>
        </div>
      )}

      {/* Trades List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trades")}</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {t("noTrades")}
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => {
                const tradePnl = trade.profit_loss || 0;
                const isTradeProfitable = tradePnl >= 0;

                return (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={trade.side === "buy" ? "default" : "secondary"}
                      >
                        {trade.side === "buy" ? t("buy") : t("sell")}
                      </Badge>
                      <span className="text-slate-900 dark:text-white">
                        {(trade.amount / trade.price).toFixed(6)}{" "}
                        {session.trading_pair.split("/")[0]}
                      </span>
                      <span className="text-slate-500">@</span>
                      <span className="text-slate-900 dark:text-white">
                        {trade.price.toLocaleString("nb-NO")} kr
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {trade.profit_loss !== null && (
                        <span
                          className={`text-sm font-medium ${
                            isTradeProfitable
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {isTradeProfitable ? "+" : ""}
                          {tradePnl.toLocaleString("nb-NO")} kr
                        </span>
                      )}
                      {isTradeProfitable ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
