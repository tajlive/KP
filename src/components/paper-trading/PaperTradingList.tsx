"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [startCapital, setStartCapital] = useState("1000000");
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

  return (
    <div className="space-y-6">
      {/* Saldo KPI-kort */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 dark:bg-emerald-400/20 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("stats.availableBalance")}
                </p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {balance.toLocaleString("nb-NO")} kr
                </p>
              </div>
            </div>
            <Button className="gap-2 shrink-0" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              {t("newSession")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sidetittel */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {sessions.length === 0 ? t("noSessions") : t("title")}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
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
                max="1000000"
                value={startCapital}
                onChange={(e) => setStartCapital(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleCreateSession} disabled={isLoading}>
                {isLoading ? "..." : t("start")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Liste over sesjoner */}
      {sessions.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 dark:border-slate-600 overflow-hidden bg-linear-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
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
            <Button size="lg" className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              {t("startFirst")}
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

            return (
              <Card
                key={session.id}
                className="cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600"
                onClick={() =>
                  router.push(`/${locale}/paper-trading/${session.id}`)
                }
              >
                <CardContent className="p-4">
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
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(session.status)}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {session.trading_pair}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {t("started")}: {getRelativeTime(session.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p
                          className={`font-bold ${
                            isProfitable ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isProfitable ? "+" : ""}
                          {session.total_pnl?.toLocaleString("nb-NO") || 0} kr
                        </p>
                        <p
                          className={`text-sm ${
                            isProfitable ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isProfitable ? "+" : ""}
                          {pnlPercent.toFixed(1)}%
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
