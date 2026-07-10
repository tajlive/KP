"use client";

import { useEffect, useState, useRef } from "react";
import { Trophy } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardTrader {
  rank: number;
  user_display_name: string;
  return_pct: number;
  total_trades: number;
  win_rate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEDAL: Record<number, { emoji: string; bg: string; border: string }> = {
  1: { emoji: "🥇", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/30" },
  2: { emoji: "🥈", bg: "bg-[#9CA3AF]/10", border: "border-[#9CA3AF]/30" },
  3: { emoji: "🥉", bg: "bg-[#D97706]/10", border: "border-[#D97706]/30" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaderboardWidget() {
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchTopThree();
    const interval = setInterval(fetchTopThree, 45_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };

    async function fetchTopThree() {
      try {
        // Fetch from direct Supabase REST via our API proxy
        const res = await fetch("/api/jokertrade/leaderboard?period=weekly&limit=3", {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error("API error");

        if (mountedRef.current) {
          setTraders(json.data ?? []);
          setLoading(false);
          setError(false);
        }
      } catch {
        if (mountedRef.current) {
          // Fallback: show empty state gracefully
          setTraders([]);
          setLoading(false);
          setError(true);
        }
      }
    }
  }, []);

  return (
    <section className="py-12 sm:py-16 bg-[#0A0B0D]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#78350F] rounded-full mb-4">
            <Trophy className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F9FAFB]">
            Topp tradere akkurat nå
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#9CA3AF]">
            Ukentlig leaderboard — konkurrer mot andre JokerTrade-brukere
          </p>
        </div>

        {/* Podium / Top 3 */}
        {loading ? (
          <div className="flex justify-center gap-4 sm:gap-6">
            {[2, 1, 3].map((rank) => (
              <div
                key={rank}
                className="flex flex-col items-center glass-card p-6 w-32 sm:w-40 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-[#2A2D35] mb-3" />
                <div className="h-4 w-20 bg-[#2A2D35] rounded mb-2" />
                <div className="h-6 w-16 bg-[#2A2D35] rounded" />
              </div>
            ))}
          </div>
        ) : traders.length >= 3 ? (
          <div className="flex justify-center gap-4 sm:gap-6">
            {/* Podium order: 2nd, 1st, 3rd */}
            {[2, 1, 3].map((rank) => {
              const trader = traders.find((t) => t.rank === rank);
              if (!trader) return null;
              const medal = MEDAL[rank];
              const isPositive = trader.return_pct >= 0;

              return (
                <div
                  key={rank}
                  className={`flex flex-col items-center glass-card p-5 sm:p-6 w-32 sm:w-40 ${medal.bg} ${medal.border}`}
                >
                  <span className="text-3xl sm:text-4xl mb-2">{medal.emoji}</span>
                  <p className="font-bold text-sm sm:text-base text-[#F9FAFB] truncate max-w-full text-center">
                    {trader.user_display_name}
                  </p>
                  <p
                    className={`font-bold text-lg sm:text-xl mt-1 ${
                      isPositive ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {trader.return_pct.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    {trader.total_trades} handler
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[#6B7280]">
              {error
                ? "Kunne ikke laste leaderboard — prøv igjen senere"
                : "Ingen tradere på topplista ennå. Bli den første!"}
            </p>
          </div>
        )}

        {/* CTA to full leaderboard */}
        {traders.length >= 3 && (
          <div className="mt-6 text-center">
            <a
              href="/no/leaderboard"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] hover:underline"
            >
              Se hele leaderboardet →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
