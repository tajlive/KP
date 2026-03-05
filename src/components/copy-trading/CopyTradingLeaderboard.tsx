"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Copy,
  Crown,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  pnl30d: number;
  pnl90d: number;
  pnlAllTime: number;
  winRate: number;
  sharpeRatio: number;
  followerCount: number;
  performanceFeePct: number;
  strategyType: string;
  rank: number;
  isActive: boolean;
}

type Period = "30d" | "90d" | "all";

export default function CopyTradingLeaderboard() {
  const { locale } = useParams<unknown>();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLeaderboard();
  }, [period, page]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/copy-trading/leaderboard?period=${period}&page=${page}&limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      const data = await response.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Kunne ikke laste ledertavlen");
    } finally {
      setIsLoading(false);
    }
  };

  const formatNOK = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href={`/${locale}/dashboard`}>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-black text-white">Kopier Trading</h1>
          </div>
          <p className="text-slate-400">
            Følg og kopier suksessfulle kryptotradere automatisk
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-400 border-blue-500/30 self-start md:self-auto"
        >
          <Crown className="w-3 h-3 mr-1" />
          {total} aktive tradere
        </Badge>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger
            value="30d"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            30 dager
          </TabsTrigger>
          <TabsTrigger
            value="90d"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            90 dager
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            All tid
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Leaderboard */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 bg-slate-800" />
                    <Skeleton className="h-3 w-24 bg-slate-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : entries.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Ingen tradere funnet ennå</p>
              <p className="text-slate-500 text-sm mt-1">
                Kom tilbake senere for å se ledertavlen
              </p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/${locale}/copy-trading/traders/${entry.userId}`}>
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg",
                          entry.rank === 1
                            ? "bg-yellow-500/20 text-yellow-400"
                            : entry.rank === 2
                              ? "bg-slate-400/20 text-slate-300"
                              : entry.rank === 3
                                ? "bg-orange-600/20 text-orange-400"
                                : "bg-slate-800 text-slate-500",
                        )}
                      >
                        {entry.rank}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {entry.avatarUrl ? (
                          <Image
                            src={entry.avatarUrl}
                            alt={entry.displayName}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          entry.displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {entry.displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="capitalize">
                            {entry.strategyType}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {entry.followerCount} følgere
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6">
                        <div className="text-right">
                          <div
                            className={cn(
                              "font-bold",
                              entry.pnl30d >= 0
                                ? "text-green-400"
                                : "text-red-400",
                            )}
                          >
                            {formatNOK(
                              period === "30d"
                                ? entry.pnl30d
                                : period === "90d"
                                  ? entry.pnl90d
                                  : entry.pnlAllTime,
                            )}
                          </div>
                          <div className="text-xs text-slate-500">P&L</div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-white">
                            {entry.winRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-500">Win Rate</div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-blue-400">
                            {entry.sharpeRatio.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">Sharpe</div>
                        </div>
                      </div>

                      {/* Performance Fee Badge */}
                      {entry.performanceFeePct > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {entry.performanceFeePct}% fee
                        </Badge>
                      )}

                      {/* Copy Button */}
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopy(entry.userId, entry.displayName);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopier
                      </Button>
                    </div>

                    {/* Mobile Stats */}
                    <div className="sm:hidden flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                      <div className="text-center">
                        <div
                          className={cn(
                            "font-bold text-sm",
                            entry.pnl30d >= 0
                              ? "text-green-400"
                              : "text-red-400",
                          )}
                        >
                          {formatNOK(entry.pnl30d)}
                        </div>
                        <div className="text-xs text-slate-500">P&L 30d</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white text-sm">
                          {entry.winRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">Win Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-400 text-sm">
                          {entry.sharpeRatio.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">Sharpe</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Forrige
          </Button>
          <span className="text-slate-400">
            Side {page} av {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Neste
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );

  async function handleCopy(traderId: string, traderName: string) {
    try {
      const response = await fetch("/api/copy-trading/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader_id: traderId,
          scale_factor: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "TIER_REQUIRED") {
          toast.error("Kopier trading krever et betalt abonnement");
          return;
        }
        if (error.code === "FOLLOW_LIMIT_REACHED") {
          toast.error(`Du kan følge maks ${error.limit} tradere på ditt nivå`);
          return;
        }
        throw new Error(error.error || "Failed to follow trader");
      }

      toast.success(`Du kopierer nå ${traderName}!`);
    } catch (error) {
      console.error("Error following trader:", error);
      toast.error("Kunne ikke kopiere trader");
    }
  }
}
