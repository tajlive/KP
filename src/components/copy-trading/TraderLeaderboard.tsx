"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Users, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Trader {
  encryptedUid: string;
  nickName: string;
  rank: number;
  avatar?: string;
  totalReturn: number;
  dailyReturn: number;
  monthlyReturn: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  tradeCount: number;
  followerCount: number;
  daysSinceCreated: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  riskWarnings: string[];
  isFollowing?: boolean;
}

interface TraderLeaderboardProps {
  locale?: "no" | "en";
  onSelectTrader?: (trader: Trader) => void;
  onFollow?: (traderUid: string) => Promise<void>;
  onUnfollow?: (traderUid: string) => Promise<void>;
  isPaperMode?: boolean;
}

export function TraderLeaderboard({
  locale = "no",
  onSelectTrader,
  onFollow,
  onUnfollow,
  isPaperMode = true,
}: TraderLeaderboardProps) {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingUid, setFollowingUid] = useState<string | null>(null);

  const isNorwegian = locale === "no";

  useEffect(() => {
    fetchTraders();
  }, []);

  const fetchTraders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/binance-leaders");
      
      if (!response.ok) {
        throw new Error("Kunne ikke hente leaderbord");
      }

      const data = await response.json();
      setTraders(data.leaders);
    } catch (err) {
      setError(isNorwegian 
        ? "Kunne ikke hente leaderbord. Prøv igjen senere."
        : "Could not fetch leaderboard. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (trader: Trader) => {
    setFollowingUid(trader.encryptedUid);
    try {
      if (trader.isFollowing) {
        await onUnfollow?.(trader.encryptedUid);
      } else {
        await onFollow?.(trader.encryptedUid);
      }
      // Refresh
      await fetchTraders();
    } finally {
      setFollowingUid(null);
    }
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  const getRiskLabel = (level: string) => {
    if (!isNorwegian) return level.charAt(0).toUpperCase() + level.slice(1);
    switch (level) {
      case "low": return "Lav risiko";
      case "medium": return "Middels risiko";
      case "high": return "Høy risiko";
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-300">{error}</p>
        <Button onClick={fetchTraders} variant="outline" className="mt-4">
          {isNorwegian ? "Prøv igjen" : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            {isNorwegian ? "Topp tradere på Binance" : "Top Binance traders"}
          </h2>
          <p className="text-sm text-slate-400">
            {isNorwegian 
              ? "Live data fra Binance Futures. Oppdatert hvert 5. minutt."
              : "Live data from Binance Futures. Updated every 5 minutes."}
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          LIVE
        </Badge>
      </div>

      {/* Paper mode banner */}
      {isPaperMode && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">🎮</span>
          <div>
            <p className="text-sm font-medium text-blue-300">
              {isNorwegian 
                ? "Gratis paper-kopiering"
                : "Free paper copy-trading"}
            </p>
            <p className="text-xs text-blue-400 mt-1">
              {isNorwegian 
                ? "Øv med lekepenger først. Bytt til live for 49 kr/mnd når du er klar."
                : "Practice with play money first. Switch to live for 49 kr/month when ready."}
            </p>
          </div>
        </div>
      )}

      {/* Traders list */}
      <div className="space-y-3">
        <AnimatePresence>
          {traders.map((trader, index) => (
            <motion.div
              key={trader.encryptedUid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "bg-slate-900/50 border border-slate-800 rounded-xl p-4",
                "hover:border-slate-700 transition-colors cursor-pointer",
                trader.isFollowing && "border-blue-500/30 bg-blue-500/5"
              )}
              onClick={() => onSelectTrader?.(trader)}
            >
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  <span className={cn(
                    "text-lg font-bold",
                    trader.rank <= 3 ? "text-yellow-400" : "text-slate-400"
                  )}>
                    #{trader.rank}
                  </span>
                </div>

                {/* Avatar */}
                <Avatar className="w-12 h-12 border-2 border-slate-700">
                  <AvatarImage src={trader.avatar} />
                  <AvatarFallback className="bg-slate-800 text-slate-300">
                    {trader.nickName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">
                      {trader.nickName}
                    </h3>
                    <Badge className={cn("text-xs", getRiskColor(trader.riskLevel))}>
                      {getRiskLabel(trader.riskLevel)}
                    </Badge>
                    {trader.isFollowing && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                        {isNorwegian ? "Følger" : "Following"}
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">
                        {isNorwegian ? "Total" : "Total"}
                      </p>
                      <p className={cn(
                        "font-medium",
                        trader.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {formatPercent(trader.totalReturn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">
                        {isNorwegian ? "30d" : "30d"}
                      </p>
                      <p className={cn(
                        "font-medium",
                        trader.monthlyReturn >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {formatPercent(trader.monthlyReturn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Win rate</p>
                      <p className="text-white font-medium">
                        {trader.winRate.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">
                        {isNorwegian ? "Max draw" : "Max DD"}
                      </p>
                      <p className="text-red-400 font-medium">
                        -{trader.maxDrawdown.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {trader.riskWarnings.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {trader.riskWarnings.slice(0, 2).map((warning, i) => (
                        <span key={i} className="text-xs text-amber-400/80 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {warning}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow button */}
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    variant={trader.isFollowing ? "outline" : "default"}
                    className={cn(
                      "min-w-[100px]",
                      trader.isFollowing 
                        ? "border-slate-600 text-slate-300" 
                        : "bg-blue-600 hover:bg-blue-700"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(trader);
                    }}
                    disabled={followingUid === trader.encryptedUid}
                  >
                    {followingUid === trader.encryptedUid ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : trader.isFollowing ? (
                      isNorwegian ? "Følger" : "Following"
                    ) : (
                      isNorwegian ? "Kopier" : "Copy"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer info */}
      <p className="text-xs text-slate-500 text-center">
        {isNorwegian 
          ? "Historisk avkastning er ingen garanti for fremtidig resultat. Kopiering innebærer risiko."
          : "Historical returns are no guarantee of future results. Copying involves risk."}
      </p>
    </div>
  );
}

export default TraderLeaderboard;
