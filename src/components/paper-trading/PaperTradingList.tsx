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
  DialogTrigger,
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
import { Plus, ArrowRight, TrendingUp, TrendingDown, Wallet } from "lucide-react";

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
  const [startCapital, setStartCapital] = useState("10000");
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header med saldo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("balance")}: {balance.toLocaleString("nb-NO")} kr
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("newSession")}
            </Button>
          </DialogTrigger>
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
      </div>

      {/* Liste over sesjoner */}
      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {t("noSessions")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t("noSessionsDesc")}
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
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
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() =>
                  router.push(`/${locale}/paper-trading/${session.id}`)
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isProfitable
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
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
