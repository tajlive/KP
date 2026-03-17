"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowRight, TrendingUp, TrendingDown, Wallet, Banknote } from "lucide-react";
import { BRAND, RADIUS, SHADOW } from "@/lib/design/tokens";

/** Kort med skygge og 200ms overgang (tokens) */
const cardBase = `bg-white dark:bg-slate-800/50 ${RADIUS.card} border border-[#E2E5EC] dark:border-slate-700 ${SHADOW.card}`;

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

interface PaperTradingListProps {
  sessions: TradingSession[];
  balance: number;
  locale: string;
}

const TRADING_PAIRS = [
  { value: "BTC/USDT", label: "BTC/USDT" },
  { value: "ETH/USDT", label: "ETH/USDT" },
  { value: "SOL/USDT", label: "SOL/USDT" },
];

export function PaperTradingList({ sessions, balance, locale }: PaperTradingListProps) {
  const t = useTranslations("paperTrading");
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradingPair, setTradingPair] = useState("BTC/USDT");
  const [startCapital, setStartCapital] = useState("100000");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trading-sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trading_pair: tradingPair,
          starting_capital_nok: parseInt(startCapital, 10),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();
      router.push(`/${locale}/paper-trading/${data.session_id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
      setIsLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}t`;
    return "Nå";
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "text-xs font-semibold truncate max-w-[5rem]";
    switch (status) {
      case "active":
        return <Badge className={`bg-green-500 ${baseClass}`}>{t("active")}</Badge>;
      case "paused":
        return <Badge variant="secondary" className={baseClass}>{t("paused")}</Badge>;
      case "stopped":
        return <Badge variant="outline" className={baseClass}>{t("stopped")}</Badge>;
      case "crashed":
        return <Badge variant="destructive" className={baseClass}>{t("crashed")}</Badge>;
      default:
        return <Badge variant="outline" className={baseClass}>{status}</Badge>;
    }
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
                  {balance.toLocaleString("nb-NO")} kr
                </p>
              </div>
            </div>
            <Button
              className={`gap-2 shrink-0 min-h-11 px-5 text-sm font-semibold ${BRAND.primary} ${RADIUS.button} [&>span]:truncate [&>span]:max-w-[12rem]`}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              <span>{t("newSession")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sidetittel — 2026: lik typografi */}
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate">
          {sessions.length === 0 ? t("noSessions") : t("title")}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
          {t("description")}
        </p>
      </div>

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
              <Label htmlFor="start-capital">{t("startCapital")} (kr)</Label>
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
        <Card className={`border-2 border-dashed border-slate-200 dark:border-slate-600 overflow-hidden ${cardBase}`}>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-5">
              <Wallet className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {t("noSessions")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              {t("noSessionsDesc")}
            </p>
            <Button
              size="lg"
              className={`gap-2 min-h-12 px-6 text-sm font-semibold ${RADIUS.button} ${BRAND.primary} [&>span]:truncate [&>span]:max-w-[16rem]`}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              <span>{t("startFirst")}</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const pnlPercent = session.starting_capital_nok
              ? ((session.current_capital_nok - session.starting_capital_nok) /
                  session.starting_capital_nok) *
                100
              : 0;
            const isProfitable = pnlPercent >= 0;
            const href = `/${locale}/paper-trading/${session.id}`;

            return (
              <Link
                key={session.id}
                href={href}
                className={`block ${cardBase} p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 ${BRAND.focusRing} ${RADIUS.card}`}
              >
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
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {session.trading_pair}
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
                          isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isProfitable ? "+" : ""}
                        {session.total_pnl?.toLocaleString("nb-NO") || 0} kr
                      </p>
                      <p
                        className={`text-sm tabular-nums truncate ${
                          isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isProfitable ? "+" : ""}
                        {pnlPercent.toFixed(1)}%
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
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
