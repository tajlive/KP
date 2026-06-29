"use client";
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { BRAND } from "@/lib/design/tokens";
import {
  PremiumTradingHero,
  PremiumTradingShell,
} from "@/features/trading/PremiumTradingLayout";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  ArrowLeft,
  Pause,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Wallet,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { canUseAutoTradingNow } from "@/types/subscription";
import { useCurrency } from "@/hooks/useCurrency";
import { formatNumberFull } from "@/lib/utils/format-number";
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
  losing_trades: number;
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
  strategy_signal?: string | null;
  trading_pair?: string | null;
  status?: string | null;
  fee?: number | null;
  order_type?: string | null;
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
  const td = useTranslations("trading.sessionDetail");
  const router = useRouter();
  const supabase = createClient();
  const { format } = useCurrency();

  const [session, setSession] = useState<TradingSession>(initialSession);
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [loading, setLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteTrade = async (tradeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(td("deleteConfirm"))) return;
    setDeletingId(tradeId);
    try {
      const res = await fetch(`/api/paper-trading/trades/${tradeId}`, { method: "DELETE" });
      if (res.ok) {
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
        if (selectedTrade?.id === tradeId) setSelectedTrade(null);
        toast.success(td("tradeDeleted"));
      } else {
        const d = await res.json();
        toast.error(d?.error ?? td("deleteError"));
      }
    } catch {
      toast.error(td("networkError"));
    } finally {
      setDeletingId(null);
    }
  };

  const refetchTrades = useCallback(async () => {
    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, side, quantity, price, realized_pnl, created_at, total_value, executed_at, strategy_signal, trading_pair, status, fee, order_type",
      )
      .eq("session_id", session.id)
      .order("executed_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[PaperTradingSessionDetail] trades refetch:", error);
      return;
    }
    if (!data) return;

    setTrades(
      data.map((row) => ({
        id: row.id,
        side: row.side as "buy" | "sell",
        quantity: Number(row.quantity),
        price: Number(row.price),
        realized_pnl: row.realized_pnl,
        total_value: row.total_value ?? undefined,
        created_at: row.executed_at ?? row.created_at,
        strategy_signal: (row as Record<string, unknown>).strategy_signal as string | null,
        trading_pair: (row as Record<string, unknown>).trading_pair as string | null,
        status: (row as Record<string, unknown>).status as string | null,
        fee: (row as Record<string, unknown>).fee as number | null,
        order_type: (row as Record<string, unknown>).order_type as string | null,
      })),
    );
  }, [session.id, supabase]);

  /** Mot utdatert RSC-cache og manglende realtime: hent ferske handler ved mount + når fanen blir synlig. */
  useEffect(() => {
    void refetchTrades();
  }, [refetchTrades]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refetchTrades();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refetchTrades]);

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
            created_at: String(row.executed_at ?? row.created_at ?? ""),
            strategy_signal: row.strategy_signal != null ? String(row.strategy_signal) : null,
            trading_pair: row.trading_pair != null ? String(row.trading_pair) : null,
            status: row.status != null ? String(row.status) : null,
            fee: row.fee != null ? Number(row.fee) : null,
            order_type: row.order_type != null ? String(row.order_type) : null,
          };
          setTrades((prev) => {
            if (prev.some((t) => t.id === mapped.id)) return prev;
            return [mapped, ...prev];
          });
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
        router.push(hrefWithLocale(locale, "/handel?view=sessions"));
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
  const completedTrades = session.winning_trades + session.losing_trades;
  const winRate =
    completedTrades > 0
      ? Math.round((session.winning_trades / completedTrades) * 100)
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

  const startedLabel = new Date(session.created_at).toLocaleDateString(
    locale === "no" ? "nb-NO" : "en-US",
    { day: "numeric", month: "short", year: "numeric" },
  );

  return (
    <PremiumTradingShell>
      <Link
        href={hrefWithLocale(locale, "/handel?view=sessions")}
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${BRAND.link}`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("sessionDetail.backToHub")}
      </Link>

      <PremiumTradingHero
        eyebrow={
          isLive
            ? t("sessionDetail.eyebrowLive")
            : t("sessionDetail.eyebrowPaper")
        }
        title={session.trading_pair}
        subtitle={t("sessionDetail.startedOn", { date: startedLabel })}
        chips={getStatusBadge(session.status)}
      />

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
            ? td("liveBanner")
            : t("contextBanner")}
        </p>
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
                {format(session.current_capital_nok)}
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
              {format(session.starting_capital_nok)}
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
              {session.winning_trades}/{completedTrades}{" "}
              {t("trades").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {td("pnl")}
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
                {format(session.current_capital_nok - session.starting_capital_nok)}
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
          <CardTitle className="flex items-center gap-2">
            {t("trades")}
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
              {td("clickForDetails")}
            </span>
          </CardTitle>
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
                const baseSymbol = (trade.trading_pair ?? session.trading_pair).split("/")[0] ?? "";
                const nok =
                  trade.total_value != null &&
                  Number.isFinite(trade.total_value)
                    ? trade.total_value
                    : null;
                const isDeleting = deletingId === trade.id;

                return (
                  <div
                    key={trade.id}
                    data-testid="paper-session-trade-row"
                    onClick={() => setSelectedTrade(trade)}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
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
                        {formatNumberFull(trade.price, locale === "no" ? "nb-NO" : "en-US")} USDT
                      </span>
                      {nok != null && (
                        <span className="text-slate-500 text-sm">
                          (~{format(Number(nok))})
                        </span>
                      )}
                      {trade.strategy_signal ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic truncate max-w-[160px]">
                          {trade.strategy_signal}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pnl != null && (
                        <span
                          className={`text-sm font-medium ${
                            isTradeProfitable ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isTradeProfitable ? "+" : ""}
                          {format(pnl)}
                        </span>
                      )}
                      {pnl != null &&
                        (isTradeProfitable ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ))}
                      <Info className="w-3.5 h-3.5 text-slate-400 ml-1" aria-hidden />
                      {session.mode === "paper" && (
                        <button
                          onClick={(e) => handleDeleteTrade(trade.id, e)}
                          disabled={isDeleting}
                          title="Slett trade"
                          className="ml-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {isDeleting ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade detalj-modal */}
      <Dialog open={!!selectedTrade} onOpenChange={(o) => { if (!o) setSelectedTrade(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant={selectedTrade?.side === "buy" ? "default" : "secondary"}>
                {selectedTrade?.side === "buy" ? t("buy") : t("sell")}
              </Badge>
              {td("tradeDetails")}
            </DialogTitle>
          </DialogHeader>
          {selectedTrade && (() => {
            const qty = tradeQuantity(selectedTrade);
            const pnl = tradePnl(selectedTrade);
            const pair = selectedTrade.trading_pair ?? session.trading_pair;
            const rows: [string, string][] = [
              [td("pair"), pair],
              [td("direction"), selectedTrade.side === "buy" ? td("directionBuy") : td("directionSell")],
              [td("orderType"), selectedTrade.order_type ?? "market"],
              [td("quantity"), qty.toFixed(8)],
              [td("price"), `${formatNumberFull(selectedTrade.price, locale === "no" ? "nb-NO" : "en-US")} USDT`],
              [td("value"), selectedTrade.total_value != null ? format(Number(selectedTrade.total_value)) : "—"],
              [td("fee"), selectedTrade.fee != null ? format(Number(selectedTrade.fee)) : format(0)],
              [td("pnl"), pnl != null ? `${pnl >= 0 ? "+" : ""}${format(pnl)}` : "—"],
              [td("status"), selectedTrade.status ?? "filled"],
              [td("timestamp"), new Date(selectedTrade.created_at).toLocaleString("nb-NO")],
            ];
            return (
              <div className="space-y-3 pt-2">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {rows.map(([label, value]) => (
                    <>
                      <dt key={`l-${label}`} className="text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd key={`v-${label}`} className="text-slate-900 dark:text-white font-medium text-right">{value}</dd>
                    </>
                  ))}
                </dl>
                {selectedTrade.strategy_signal && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{td("signal")}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTrade.strategy_signal}</p>
                  </div>
                )}
                {session.mode === "paper" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    disabled={deletingId === selectedTrade.id}
                    onClick={(e) => handleDeleteTrade(selectedTrade.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                    {td("deleteTrade")}
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PremiumTradingShell>
  );
}
