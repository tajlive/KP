"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/utils";
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
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const { locale } = useParams<unknown>();
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [publicStrategies, setPublicStrategies] = useState<PublicStrategy[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchTraderProfile = useCallback(async () => {
    try {
      const supabase = createClient();

      // Try leaderboard_bots first
      const { data: botData } = await supabase
        .from("leaderboard_bots")
        .select("*")
        .eq("user_id", traderId)
        .single();

      if (botData) {
        setProfile({
          id: botData.id,
          userId: botData.user_id,
          displayName: botData.display_name,
          bio: null,
          avatarUrl: botData.avatar_url,
          isPublic: true,
          performanceFeePct: botData.performance_fee_pct || 0,
          followerCount: botData.follower_count || 0,
          verified: false,
          allTimeRoi: botData.pnl_all_time || 0,
          winRate: botData.win_rate || 0,
          sharpeRatio: botData.sharpe_ratio || 0,
          totalTrades: 0,
        });
        return;
      }

      // Fallback to trader_profiles
      const { data: profileData } = await supabase
        .from("trader_profiles")
        .select("*")
        .eq("user_id", traderId)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          userId: profileData.user_id,
          displayName: profileData.display_name,
          bio: profileData.bio,
          avatarUrl: profileData.avatar_url,
          isPublic: profileData.is_public,
          performanceFeePct: profileData.performance_fee_pct || 0,
          followerCount: profileData.follower_count || 0,
          verified: profileData.verified || false,
          allTimeRoi: profileData.all_time_roi || 0,
          winRate: profileData.win_rate || 0,
          sharpeRatio: profileData.sharpe_ratio || 0,
          totalTrades: profileData.total_trades || 0,
        });
        return;
      }

      // Last resort: user_profiles table
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id, display_name, avatar_url")
        .eq("id", traderId)
        .single();

      if (userProfile) {
        setProfile({
          id: userProfile.id,
          userId: userProfile.id,
          displayName: userProfile.display_name || "Anonym Trader",
          bio: null,
          avatarUrl: userProfile.avatar_url,
          isPublic: true,
          performanceFeePct: 0,
          followerCount: 0,
          verified: false,
          allTimeRoi: 0,
          winRate: 0,
          sharpeRatio: 0,
          totalTrades: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching trader profile:", error);
    }
  }, [traderId]);

  const fetchPublicStrategies = useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch public strategies from user_strategies
      const { data: strategies } = await supabase
        .from("user_strategies")
        .select("*")
        .eq("user_id", traderId)
        .eq("is_public", true)
        .eq("status", "active");

      if (strategies && strategies.length > 0) {
        setPublicStrategies(
          strategies.map((s) => ({
            id: s.id,
            strategyType: s.strategy_type || s.strategy_id,
            tradingPair: s.trading_pair,
            mode: s.mode,
            totalPnl: s.total_pnl || 0,
            winRate:
              s.total_trades > 0
                ? ((s.winning_trades || 0) / s.total_trades) * 100
                : 0,
            totalTrades: s.total_trades || 0,
            subscriberCount: s.subscriber_count || 0,
            isPublic: s.is_public,
          })),
        );
        return;
      }

      // Fallback to trading_sessions
      const { data: sessions } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("user_id", traderId)
        .eq("status", "active");

      if (sessions) {
        setPublicStrategies(
          sessions.map((s) => ({
            id: s.id,
            strategyType: s.strategy_id,
            tradingPair: s.trading_pair,
            mode: s.mode,
            totalPnl: s.total_pnl || 0,
            winRate:
              s.total_trades > 0
                ? ((s.winning_trades || 0) / s.total_trades) * 100
                : 0,
            totalTrades: s.total_trades || 0,
            subscriberCount: 0,
            isPublic: true,
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching public strategies:", error);
    } finally {
      setIsLoading(false);
    }
  }, [traderId]);

  const checkIfFollowing = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: follow } = await supabase
        .from("copy_trading_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("leader_id", traderId)
        .eq("is_active", true)
        .single();

      setIsFollowing(!!follow);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  }, [traderId]);

  useEffect(() => {
    fetchTraderProfile();
    fetchPublicStrategies();
    checkIfFollowing();
  }, [fetchTraderProfile, fetchPublicStrategies, checkIfFollowing]);

  const handleFollow = async () => {
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

      setIsFollowing(true);
      toast.success(`Du kopierer nå ${profile?.displayName}!`);
    } catch (error) {
      console.error("Error following trader:", error);
      toast.error("Kunne ikke kopiere trader");
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
          <Button className="mt-4">Tilbake til ledertavlen</Button>
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
          Tilbake til ledertavlen
        </Button>
      </Link>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8"
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl">
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
            <div className="text-sm text-slate-500">Totalt handler</div>
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
              <p className="text-slate-400">Ingen offentlige strategier ennå</p>
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
