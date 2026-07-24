"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Copy,
  Globe,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCopyStore } from "@/store/copy-store";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface TraderProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  performanceFeePct: number;
  followerCount: number;
  verified: boolean;
  allTimeRoi: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  /** True når profilen er hentet fra leaderboard_bots (paper/demo) */
  isKlarpakkePaperDemo?: boolean;
}

interface PublicStrategy {
  id: string;
  strategyType: string;
  tradingPair: string;
  mode: "paper" | "live";
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  subscriberCount: number;
  isPublic: boolean;
}

interface CreatorProfileClientProps {
  traderId: string;
}

export default function CreatorProfileClient({
  traderId,
}: CreatorProfileClientProps) {
  const { locale } = useParams();
  const tProfile = useTranslations("copyTrading.profile");
  const t = useTranslations("copyTrading");
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [publicStrategies, setPublicStrategies] = useState<PublicStrategy[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // KLA-auth: browser-klienten er alltid anon (httpOnly auth-cookie) —
  // profil, strategier og follow-status hentes via server-API
  const loadTraderData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/copy-trading/trader/${encodeURIComponent(traderId)}`,
        { credentials: "same-origin" },
      );
      if (res.status === 404) {
        setProfile(null);
        setPublicStrategies([]);
        return;
      }
      if (!res.ok) {
        console.error("Error fetching trader:", res.status);
        setProfile(null);
        setPublicStrategies([]);
        return;
      }

      const json = await res.json().catch(() => null);
      setProfile((json?.profile as TraderProfile | null) ?? null);
      setPublicStrategies(
        (json?.strategies as PublicStrategy[] | undefined) ?? [],
      );
      setIsFollowing(json?.isFollowing === true);
    } catch (error) {
      console.error("Error fetching trader profile:", error);
      setProfile(null);
      setPublicStrategies([]);
    }
  }, [traderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setPublicStrategies([]);
      try {
        await loadTraderData();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [traderId, loadTraderData]);

  const handleFollow = async () => {
    try {
      const response = await fetch("/api/copy-trading/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader_id: traderId,
          scale_factor: 1,
          max_trade_size: 100_000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "TIER_REQUIRED") {
          toast.error(t("copyRequiresSubscription"));
          return;
        }
        if (error.code === "FOLLOW_LIMIT_REACHED") {
          toast.error(t("followLimitReached", { limit: error.limit }));
          return;
        }
        throw new Error(error.error || "Failed to follow trader");
      }

      setIsFollowing(true);
      void useCopyStore.getState().fetchFollowing();
      toast.success(t("nowCopying", { name: profile?.displayName ?? "" }));
    } catch (error) {
      console.error("Error following trader:", error);
      toast.error(t("couldNotCopy"));
    }
  };

  const formatNOK = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Skeleton className="h-64 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-slate-400">Trader ikke funnet</p>
        <Link href={`/${locale}/copy-trading`}>
          <Button className="mt-4">{t("backToLeaderboard")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Back Button */}
      <Link href={`/${locale}/copy-trading`}>
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("backToLeaderboard")}
        </Button>
      </Link>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8"
      >
        {profile.isKlarpakkePaperDemo && (
          <div className="mb-6 space-y-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[13px] leading-relaxed text-amber-100/90">
            <p>{tProfile("trustPaper")}</p>
            <p className="text-amber-200/70">{tProfile("trustRisk")}</p>
          </div>
        )}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={96}
                height={96}
                className="rounded-full object-cover shadow-xl"
                unoptimized
              />
            ) : (
              profile.displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-white">
                {profile.displayName}
              </h1>
              {profile.verified && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Verifisert
                </Badge>
              )}
            </div>

            {profile.bio && (
              <p className="text-slate-400 mb-4 max-w-lg">{profile.bio}</p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <Badge
                variant="outline"
                className="bg-slate-800/50 text-slate-300"
              >
                <Users className="w-3 h-3 mr-1" />
                {profile.followerCount} følgere
              </Badge>
              <Badge
                variant="outline"
                className="bg-slate-800/50 text-slate-300"
              >
                <Globe className="w-3 h-3 mr-1" />
                {profile.totalTrades} handler
              </Badge>
              {profile.performanceFeePct > 0 && (
                <Badge
                  variant="outline"
                  className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {profile.performanceFeePct}% performance fee
                </Badge>
              )}
            </div>
          </div>

          {/* Follow Button */}
          <Button
            size="lg"
            data-testid="copy-trading-follow-button"
            className={cn(
              "min-w-[160px]",
              isFollowing
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700",
            )}
            onClick={handleFollow}
            disabled={isFollowing}
          >
            {isFollowing ? (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Kopierer
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Kopier denne strategien
              </>
            )}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800">
          <div className="text-center">
            <div
              className={cn(
                "text-2xl font-black",
                profile.allTimeRoi >= 0 ? "text-green-400" : "text-red-400",
              )}
            >
              {profile.allTimeRoi >= 0 ? "+" : ""}
              {profile.allTimeRoi.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-500">All-time ROI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-white">
              {profile.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-500">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-blue-400">
              {profile.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-slate-500">Sharpe Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-white">
              {profile.totalTrades}
            </div>
            <div className="text-sm text-slate-500">{t("totalTradesLabel")}</div>
          </div>
        </div>
      </motion.div>

      {/* Public Strategies */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Offentlige Strategier
        </h2>

        {publicStrategies.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">{t("noPublicStrategies")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {publicStrategies.map((strategy, index) => (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white capitalize">
                          {strategy.strategyType.replace("_", " ")}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          {strategy.tradingPair} •{" "}
                          {strategy.mode === "paper" ? "Paper" : "Live"}
                        </p>
                      </div>
                      <Button
                        onClick={handleFollow}
                        disabled={isFollowing}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopier
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div
                          className={cn(
                            "text-lg font-bold",
                            strategy.totalPnl >= 0
                              ? "text-green-400"
                              : "text-red-400",
                          )}
                        >
                          {strategy.totalPnl >= 0 ? "+" : ""}
                          {formatNOK(strategy.totalPnl)}
                        </div>
                        <div className="text-xs text-slate-500">P&L</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">
                          {strategy.winRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">Win Rate</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">
                          {strategy.totalTrades}
                        </div>
                        <div className="text-xs text-slate-500">Handler</div>
                      </div>
                    </div>

                    {strategy.subscriberCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <Badge
                          variant="outline"
                          className="bg-slate-800/50 text-slate-300"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {strategy.subscriberCount} abonnenter
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
