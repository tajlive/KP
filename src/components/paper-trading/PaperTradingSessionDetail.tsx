"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Pause,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canUseAutoTradingNow } from "@/types/subscription";
import { normalizeTier } from "@/lib/pricing/tiers";

interface TradingSession {
  id: string;
  mode: "paper" | "live";
  status: "active" | "paused" | "stopped" | "crashed";
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  winning_trades: number;
  total_trades: number;
  created_at: string;
}

/** DB / API shape (quantity + realized_pnl); legacy UI used amount/profit_loss */
interface Trade {
  id: string;
  side: "buy" | "sell";
  quantity?: number;
  amount?: number;
  price: number;
  realized_pnl?: number | null;
  profit_loss?: number | null;
  total_value?: number | null;
  created_at: string;
}

function tradeQuantity(t: Trade): number {
  const q = t.quantity ?? t.amount;
  return typeof q === "number" && Number.isFinite(q) ? q : 0;
}

function tradePnl(t: Trade): number | null {
  const v = t.realized_pnl ?? t.profit_loss;
  if (v == null || !Number.isFinite(Number(v))) return null;
  return Number(v);
}

interface PaperTradingSessionDetailProps {
  session: TradingSession;
  trades: Trade[];
  locale: string;
  /** For client-side tier-gate: ved åpning av live-session uten ?mode=live */
  userTier?: string;
  trialStartedAt?: string | null;
}

export function PaperTradingSessionDetail({
  session: initialSession,
  trades: initialTrades,
  locale,
  userTier,
  trialStartedAt,
}: PaperTradingSessionDetailProps) {
  const t = useTranslations("paperTrading");
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<TradingSession>(initialSession);
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [loading, setLoading] = useState(false);

  // Client-side tier-gate: live-session uten ?mode=live — redirect til priser hvis ikke tilgang
  useEffect(() => {
    if (initialSession.mode !== "live" || !userTier) return;
    const tier = normalizeTier(userTier);
    if (!canUseAutoTradingNow(tier, trialStartedAt ?? null)) {
      router.replace(`/${locale}/priser?upgrade=true`);
    }
  }, [initialSession.mode, userTier, trialStartedAt, locale, router]);

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
          const row = payload.new as Record<string, unknown>;
          const mapped: Trade = {
            id: String(row.id),
            side: row.side as "buy" | "sell",
            quantity: Number(row.quantity),
            price: Number(row.price),
            realized_pnl:
              row.realized_pnl != null ? Number(row.realized_pnl) : null,
            total_value:
              row.total_value != null ? Number(row.total_value) : undefined,
            created_at: String(row.created_at ?? ""),
          };
          setTrades((prev) => [mapped, ...prev]);
        },
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id, supabase]);

  const handleStatusChange = async (
    newStatus: "active" | "paused" | "stopped",
  ) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/trading-sessions/${session.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

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
  const winRate =
    session.total_trades > 0
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
      case "crashed":
        return <Badge variant="destructive">{t("crashed")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLive = session.mode === "live";

  return (
    <div className="space-y-6">
      {/* Tydelig UX: modus-banner (paper = merke #0052FF, live = rød) */}
      <div
        className={
          isLive
            ? "rounded-xl bg-red-500/15 border border-red-500/20 dark:border-red-500/30 px-4 py-3 flex items-center justify-center gap-2"
            : "rounded-xl bg-[#0052FF]/10 border border-[#0052FF]/20 dark:border-[#0052FF]/30 px-4 py-3 flex items-center justify-center gap-2"
        }
      >
        <Wallet
          className={
            isLive
              ? "w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
              : "w-5 h-5 text-[#0052FF] dark:text-[#3d7aff] shrink-0"
          }
          aria-hidden
        />
        <p
          className={
            isLive
              ? "text-red-800 dark:text-red-200 text-sm font-medium"
              : "text-[#0047E0] dark:text-[#3d7aff] text-sm font-medium"
          }
        >
          {isLive
            ? "🔴 Live — Ekte penger. Handel med omhu."
            : t("contextBanner")}
        </p>
      </div>

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
              {t("startCapital")}:{" "}
              {session.starting_capital_nok.toLocaleString("nb-NO")} kr
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
              {session.winning_trades}/{session.total_trades}{" "}
              {t("trades").toLowerCase()}
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
                const qty = tradeQuantity(trade);
                const pnl = tradePnl(trade);
                const isTradeProfitable = pnl != null ? pnl >= 0 : true;
                const baseSymbol = session.trading_pair.split("/")[0] ?? "";
                const nok =
                  trade.total_value != null &&
                  Number.isFinite(trade.total_value)
                    ? trade.total_value
                    : null;

                return (
                  <div
                    key={trade.id}
                    data-testid="paper-session-trade-row"
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge
                        variant={trade.side === "buy" ? "default" : "secondary"}
                      >
                        {trade.side === "buy" ? t("buy") : t("sell")}
                      </Badge>
                      <span className="text-slate-900 dark:text-white">
                        {qty.toFixed(6)} {baseSymbol}
                      </span>
                      <span className="text-slate-500">@</span>
                      <span className="text-slate-900 dark:text-white">
                        {trade.price.toLocaleString("nb-NO", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        USDT
                      </span>
                      {nok != null && (
                        <span className="text-slate-500 text-sm">
                          (~
                          {nok.toLocaleString("nb-NO", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          kr)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pnl != null && (
                        <span
                          className={`text-sm font-medium ${
                            isTradeProfitable
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {isTradeProfitable ? "+" : ""}
                          {pnl.toLocaleString("nb-NO")} kr
                        </span>
                      )}
                      {pnl != null &&
                        (isTradeProfitable ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ))}
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
