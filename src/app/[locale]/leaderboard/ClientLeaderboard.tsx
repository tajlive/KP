"use client";

import { createClient } from "@supabase/supabase-js";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rank: number;
  total_profit_loss_percent: number;
  win_rate: number;
  total_trades: number;
  badge: string | null;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables not set");
  }
  return createClient(url, key);
}

export default function ClientLeaderboard() {
  const t = useTranslations("competition");
  const tLeaderboard = useTranslations("paperTrading.leaderboard");
  const locale = useLocale();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<"uke" | "måned" | "alle">("måned");
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("paper_trading_leaderboard")
        .select("*")
        .order("total_profit_loss_percent", { ascending: false })
        .limit(100);

      if (data) {
        const withRank = data.map((entry, idx) => ({
          ...entry,
          rank: idx + 1,
        }));
        setLeaderboard(withRank);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const myEntry = withRank.find((e) => e.user_id === user.id);
          if (myEntry) setCurrentUserRank(myEntry.rank);
        }
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }

  function getBadgeEmoji(badge: string | null): string {
    if (!badge) return "";
    if (badge === "rookie") return "🌱";
    if (badge === "trader") return "📈";
    if (badge === "pro") return "💎";
    if (badge === "master") return "👑";
    return "";
  }

  function getBadgeLabel(badge: string | null): string {
    if (!badge) return "";
    if (badge === "rookie") return "Rookie";
    if (badge === "trader") return "Trader";
    if (badge === "pro") return "Pro";
    if (badge === "master") return "Master";
    return "";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Paper Trading Leaderboard
          </h1>
          <p className="text-xl text-gray-400">
            {locale === "no"
              ? "Topp 100 traders – konkurrer om tokens!"
              : "Top 100 traders – compete for tokens!"}
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex justify-center gap-2 mb-8">
          {(["uke", "måned", "alle"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors capitalize ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {tf === "uke" && t("thisWeek")}
              {tf === "måned" && t("thisMonth")}
              {tf === "alle" && "All-time"}
            </button>
          ))}
        </div>

        {/* Current user rank */}
        {currentUserRank && (
          <div className="bg-gradient-to-r from-blue-900/50 to-teal-900/50 border border-blue-700 p-6 rounded-xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  {locale === "no" ? "Din plassering:" : "Your rank:"}
                </div>
                <div className="text-3xl font-bold text-white">
                  #{currentUserRank}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">
                  {locale === "no"
                    ? "Fortsett å trade for å klatre!"
                    : "Keep trading to climb!"}
                </div>
                <div className="text-green-400 font-semibold">
                  {currentUserRank <= 10 && "🔥 Topp 10!"}
                  {currentUserRank > 10 &&
                    currentUserRank <= 20 &&
                    (locale === "no"
                      ? "💪 Nesten topp 10!"
                      : "💪 Almost top 10!")}
                  {currentUserRank > 20 &&
                    (locale === "no" ? "💪 Fortsett!" : "💪 Keep going!")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prize pool */}
        <div className="bg-gray-800 p-6 rounded-xl mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            🎁 {t("monthlyCompetition")} (
            {locale === "no" ? "Mars 2026" : "March 2026"})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-700 p-4 rounded-xl text-center">
              <div className="text-3xl mb-2">🥇</div>
              <div className="text-2xl font-bold text-white">1,000,000 KLT</div>
              <div className="text-sm text-gray-400">
                {locale === "no" ? "1. plass" : "1st place"}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-600 p-4 rounded-xl text-center">
              <div className="text-3xl mb-2">🥈</div>
              <div className="text-2xl font-bold text-white">500,000 KLT</div>
              <div className="text-sm text-gray-400">
                {locale === "no" ? "2. plass" : "2nd place"}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 border border-orange-700 p-4 rounded-xl text-center">
              <div className="text-3xl mb-2">🥉</div>
              <div className="text-2xl font-bold text-white">250,000 KLT</div>
              <div className="text-sm text-gray-400">
                {locale === "no" ? "3. plass" : "3rd place"}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center mt-4">
            {locale === "no"
              ? "Basert på læring + win rate (ikke bare profit)"
              : "Based on learning + win rate (not just profit)"}
          </p>
        </div>

        {/* Leaderboard table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-white">
                  {tLeaderboard("rank")}
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-white">
                  {tLeaderboard("trader")}
                </th>
                <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-white">
                  {tLeaderboard("return")}
                </th>
                <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-white hidden md:table-cell">
                  {tLeaderboard("winRate")}
                </th>
                <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-white hidden md:table-cell">
                  {tLeaderboard("trades")}
                </th>
                <th className="px-4 md:px-6 py-4 text-center text-sm font-semibold text-white">
                  {locale === "no" ? "Handling" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leaderboard.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    {locale === "no"
                      ? "Ingen traders ennå. Bli den første! 🚀"
                      : "No traders yet. Be the first! 🚀"}
                  </td>
                </tr>
              )}
              {leaderboard.map((entry) => (
                <tr key={entry.user_id} className="hover:bg-gray-750">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl md:text-2xl font-bold text-white">
                        {entry.rank === 1 && "🥇"}
                        {entry.rank === 2 && "🥈"}
                        {entry.rank === 3 && "🥉"}
                        {entry.rank > 3 && `#${entry.rank}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {entry.username}
                          {entry.badge && (
                            <span
                              className="text-sm"
                              title={getBadgeLabel(entry.badge)}
                            >
                              {getBadgeEmoji(entry.badge)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getBadgeLabel(entry.badge)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    <span
                      className={`text-base md:text-lg font-bold ${
                        entry.total_profit_loss_percent >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {entry.total_profit_loss_percent >= 0 ? "+" : ""}
                      {entry.total_profit_loss_percent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right hidden md:table-cell">
                    <span className="text-gray-300">
                      {entry.win_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right hidden md:table-cell">
                    <span className="text-gray-300">{entry.total_trades}</span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      {locale === "no" ? "Se strategi" : "See strategy"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How badges work */}
        <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">
            🎖️{" "}
            {locale === "no"
              ? "Hvordan får du badges?"
              : "How do you get badges?"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-3xl mb-2">🌱</div>
              <div className="font-semibold text-white">Rookie</div>
              <div className="text-sm text-gray-400">
                5+ {tLeaderboard("trades")}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-3xl mb-2">📈</div>
              <div className="font-semibold text-white">Trader</div>
              <div className="text-sm text-gray-400">
                20+ {tLeaderboard("trades")}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-3xl mb-2">💎</div>
              <div className="font-semibold text-white">Pro</div>
              <div className="text-sm text-gray-400">
                50+ {tLeaderboard("trades")}, +20%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-400">
                100+ {tLeaderboard("trades")}, +50%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
