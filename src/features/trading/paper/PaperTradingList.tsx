"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import { createClient } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { BRAND, RADIUS, SHADOW } from "@/lib/design/tokens";
import {
  PremiumPanel,
  PremiumStatusBanner,
} from "@/features/trading/PremiumTradingLayout";

/** Kort med skygge og 200ms overgang (tokens) */
const cardBase = `bg-white dark:bg-slate-800/50 ${RADIUS.card} border border-[#E2E5EC] dark:border-slate-700 ${SHADOW.card}`;

type CreateSessionResponse = {
  success?: boolean;
  session_id?: string | null;
  code?: string;
  error?: string;
  message?: string;
  tier?: string;
  max?: number;
  details?: unknown;
};

type ResetResponse = {
  success?: boolean;
  reset?: number;
  code?: string;
  error?: string;
  message?: string;
};

export interface TradingSession {
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

interface PaperTradingListProps {
  sessions: TradingSession[];
  balance: number;
  locale: string;
  /** Paper eller live — styrer POST /api/trading-sessions/create */
  sessionMode?: "paper" | "live";
  /** Optional: when set, subscribe to Supabase realtime for trading_sessions so list updates without manual refresh */
  userId?: string;
}

const TRADING_PAIRS = [
  { value: "BTC/USDT", label: "BTC/USDT" },
  { value: "ETH/USDT", label: "ETH/USDT" },
  { value: "SOL/USDT", label: "SOL/USDT" },
];

export function PaperTradingList({
  sessions,
  balance,
  locale,
  sessionMode = "paper",
  userId,
}: PaperTradingListProps) {
  const t = useTranslations("paperTrading");
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradingPair, setTradingPair] = useState("BTC/USDT");
  const [startCapital, setStartCapital] = useState("100000");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { formatByMode } = useCurrency();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Supabase realtime: oppdater listen når trading_sessions endres for denne brukeren.
  // Abonnementet pauses når dokumentet er skjult for å spare batteri.
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let channel = supabase.channel("paper-trading-sessions");

    const subscribe = () => {
      channel = supabase
        .channel("paper-trading-sessions")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "trading_sessions",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            setLastUpdated(new Date());
            router.refresh();
          },
        )
        .subscribe();
    };

    const unsubscribe = () => {
      supabase.removeChannel(channel);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        unsubscribe();
      } else {
        subscribe();
      }
    };

    if (document.visibilityState === "visible") {
      subscribe();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [userId, router]);

  // Sorter: aktive først, deretter nyeste
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aActive = a.status === "active" ? 1 : 0;
      const bActive = b.status === "active" ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [sessions]);
  const activeSessions = useMemo(
    () => sortedSessions.filter((session) => session.status === "active"),
    [sortedSessions],
  );
  const historySessions = useMemo(
    () => sortedSessions.filter((session) => session.status !== "active"),
    [sortedSessions],
  );
  const visibleSessions = showHistory
    ? sortedSessions
    : [...activeSessions, ...historySessions.slice(0, 3)];
  const hiddenHistoryCount = Math.max(0, historySessions.length - 3);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleCreateSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trading-sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trading_pair: tradingPair,
          starting_capital_nok: parseInt(startCapital, 10),
          mode: sessionMode,
        }),
      });

      let data: CreateSessionResponse = {};
      try { data = (await response.json()) as CreateSessionResponse; } catch { /* tom body */ }

      if (response.status === 409 && data?.code === "MAX_ACTIVE_SESSIONS") {
        if (data.session_id) {
          toast.info(t("sessions.maxActiveReached"));
          router.push(
            `/${locale}/handel?view=sessions${sessionMode === "live" ? "&mode=live" : ""}`,
          );
        } else {
          toast.error(t("sessions.maxActiveStudent"));
        }
        return;
      }

      if (response.status === 400) {
        toast.error(data.error ?? t("errors.validationFailed"));
        return;
      }

      if (response.status === 401) {
        toast.error(t("errors.unauthorized"));
        return;
      }

      if (response.status === 403) {
        toast.error(data.error ?? t("errors.forbidden"));
        return;
      }

      if (!response.ok) {
        toast.error(data.error ?? data.message ?? t("errors.generic"));
        return;
      }

      if (!data.session_id) {
        toast.error(t("errors.missingSessionId"));
        return;
      }

      router.push(
        `/${locale}/handel?view=sessions${sessionMode === "live" ? "&mode=live" : ""}`,
      );
    } catch (err) {
      console.error("Failed to create session:", err);
      toast.error(t("errors.network"));
    } finally {
      setIsLoading(false);
    }
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!window.confirm(t("confirmResetAll"))) return;
    setIsResetting(true);
    try {
      const response = await fetch("/api/paper-trading/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starting_capital_nok: 100000 }),
      });
      let data: ResetResponse = {};
      try { data = (await response.json()) as ResetResponse; } catch { /* tom body */ }

      if (!response.ok) {
        toast.error(data.error ?? t("errors.resetFailed"));
        return;
      }

      toast.success(t("resetSuccess"));
      setLastUpdated(new Date());
      router.refresh();
    } catch (err) {
      console.error("Failed to reset paper trading:", err);
      toast.error(t("errors.resetNetwork"));
    } finally {
      setIsResetting(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0)
      return `${diffHours}${locale === "no" ? "t" : "h"}`;
    return t("now");
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "text-xs font-semibold truncate max-w-[5rem]";
    switch (status) {
      case "active":
        return (
          <Badge className={`bg-green-500 ${baseClass}`}>{t("active")}</Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className={baseClass}>
            {t("paused")}
          </Badge>
        );
      case "stopped":
        return (
          <Badge variant="outline" className={baseClass}>
            {t("stopped")}
          </Badge>
        );
      case "crashed":
        return (
          <Badge variant="destructive" className={baseClass}>
            {t("crashed")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={baseClass}>
            {status}
          </Badge>
        );
    }
  };

  const formatTradingPair = (pair: string) => {
    const normalized = pair.trim().toUpperCase();
    if (normalized.includes("/")) return normalized;
    if (normalized.endsWith("USDT")) {
      return `${normalized.slice(0, -4)}/USDT`;
    }
    return normalized;
  };

  return (
    <div className="space-y-6">
      {/* Saldo KPI-kort — samme stil som dashboard-kort */}
      <Card className={`overflow-hidden ${cardBase}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 dark:bg-emerald-400/20 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                  {t("stats.availableBalance")}
                </p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white truncate">
                  {formatByMode(balance, "paper")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  title={t("resetSession")}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  <span className="hidden sm:inline">{t("resetSession")}</span>
                </Button>
              )}
              <Button
                className={`gap-2 shrink-0 min-h-11 px-5 text-sm font-semibold ${BRAND.primary} ${RADIUS.button} [&>span]:truncate [&>span]:max-w-[12rem]`}
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden />
                <span>{t("newSession")}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sidetittel + oppdater + info om Binance */}
      <PremiumPanel className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
        <div>
          <h2
            className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate"
            data-testid="sessions-heading"
          >
            {sessions.length === 0 ? t("noSessions") : t("mySessions")}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
            {t("description")}
          </p>
        </div>
        {sessions.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            {lastUpdated && (
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {t("lastUpdated")}:{" "}
                {lastUpdated.toLocaleTimeString(
                  locale === "no" ? "nb-NO" : "en-GB",
                  { hour: "2-digit", minute: "2-digit" },
                )}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              {t("refreshList")}
            </Button>
          </div>
        )}
      </PremiumPanel>
      <PremiumStatusBanner>
        <p
          className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
          title={t("binanceUpdateInfo")}
        >
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {t("binanceUpdateInfo")}
        </p>
      </PremiumStatusBanner>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newSession")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="trading-pair">{t("tradingPair")}</Label>
              <Select value={tradingPair} onValueChange={setTradingPair}>
                <SelectTrigger id="trading-pair">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADING_PAIRS.map((pair) => (
                    <SelectItem key={pair.value} value={pair.value}>
                      {pair.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-capital">{t("startCapital")}</Label>
              <Input
                id="start-capital"
                type="number"
                min="1000"
                max="100000"
                value={startCapital}
                onChange={(e) => setStartCapital(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                className="min-h-11 px-5 text-sm font-semibold rounded-xl [&>span]:truncate [&>span]:max-w-[8rem]"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                <span>{t("cancel")}</span>
              </Button>
              <Button
                className={`min-h-11 px-5 text-sm font-semibold ${RADIUS.button} ${BRAND.primary} [&>span]:truncate [&>span]:max-w-[8rem]`}
                onClick={handleCreateSession}
                disabled={isLoading}
              >
                <span>{isLoading ? "..." : t("start")}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Liste over sesjoner */}
      {sessions.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-8 h-8" />}
          title={t("noSessions")}
          description={t("noSessionsDesc")}
          action={{
            label: t("startFirst"),
            onClick: () => setIsModalOpen(true),
            variant: "primary",
          }}
        />
      ) : (
        <div className="space-y-4">
          {hiddenHistoryCount > 0 && !showHistory && (
            <PremiumStatusBanner>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t("sessions.activeOverview", {
                      active: activeSessions.length,
                    })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("sessions.historyHidden", {
                      count: hiddenHistoryCount,
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  {t("sessions.showHistory")}
                </Button>
              </div>
            </PremiumStatusBanner>
          )}

          {visibleSessions.map((session) => {
            const pnlPercent = session.starting_capital_nok
              ? ((session.current_capital_nok - session.starting_capital_nok) /
                  session.starting_capital_nok) *
                100
              : 0;
            const isProfitable = pnlPercent >= 0;
            const isActive = session.status === "active";
            const href = `/${locale}/handel?view=sessions${
              session.mode === "live" ? "&mode=live" : ""
            }`;

            return (
              <Link
                key={session.id}
                href={href}
                className={`block ${cardBase} p-4 min-h-[44px] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 ${BRAND.focusRing} ${RADIUS.card} relative overflow-hidden ${
                  isActive
                    ? "border-l-4 border-l-green-500 dark:border-l-green-400 shadow-[0_0_0_1px_rgba(34,197,94,0.08)] dark:shadow-[0_0_0_1px_rgba(34,197,94,0.15)]"
                    : ""
                }`}
              >
                {isActive && (
                  <span
                    className="absolute top-3 right-3 flex h-2 w-2"
                    aria-hidden
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isProfitable
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isProfitable ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(session.status)}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            session.mode === "paper"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          }`}
                        >
                          {session.mode === "paper" ? t("modePaper") : t("modeLive")}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {formatTradingPair(session.trading_pair)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {t("started")}: {getRelativeTime(session.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4 shrink-0">
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold tabular-nums truncate ${
                          isProfitable
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isProfitable ? "+" : ""}
                        {formatByMode(Math.abs(session.current_capital_nok - session.starting_capital_nok), "paper")}
                      </p>
                      <p
                        className={`text-sm tabular-nums truncate ${
                          isProfitable
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isProfitable ? "+" : ""}
                        {pnlPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t("trades")}: {session.total_trades}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-5 h-5 text-slate-400 shrink-0"
                      aria-hidden
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
