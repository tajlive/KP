"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Clock, Zap, Flame, ChevronRight, Gift, Trophy } from "lucide-react";
interface GamificationStats {
  points: number;
  rank: number | null;
  streak: number;
  challenges: { id: string; title: string; description: string; current: number; target: number; reward: number; completed: boolean }[];
}

interface DailyChallengeProps { userId?: string }

export function DailyChallenge({ userId: propUserId }: DailyChallengeProps) {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const fetchStats = useCallback(async () => {
    if (!propUserId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/gamification/stats?userId=${propUserId}`);
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [propUserId]);

  useEffect(() => { fetchStats() }, [fetchStats]);

  useEffect(() => {
    const tick = () => {
      const m = new Date(+new Date() + 86400000);
      m.setHours(0, 0, 0, 0);
      const d = m.getTime() - Date.now();
      setTimeLeft({ hours: Math.floor(d / 36e5), minutes: Math.floor((d % 36e5) / 6e4), seconds: Math.floor((d % 6e4) / 1e3) });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const pct = (c: number, t: number) => Math.min(100, (c / t) * 100);

  const challenges = stats?.challenges ?? [];
  const points = stats?.points ?? 0;
  const rank = stats?.rank;
  const streak = stats?.streak ?? 0;

  return (
    <motion.div
      className="bg-gradient-to-br from-purple-900/30 via-slate-900 to-blue-900/30 rounded-2xl p-3 sm:p-5 border border-purple-500/20"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-lg font-bold text-white truncate">Dagens utfordringer</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">Fullfør for bonuspoeng</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-purple-500/10 rounded-full border border-purple-500/20 shrink-0">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
          <span className="text-purple-400 font-mono text-[11px] sm:text-xs tabular-nums">
            {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Challenges */}
      {loading ? (
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-5">
          {[1, 2, 3].map((i) => <div key={i} className="p-3 sm:p-4 rounded-lg sm:rounded-xl border bg-slate-800/20 border-slate-700 animate-pulse h-16 sm:h-18" />)}
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-5">
          {challenges.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`p-3 sm:p-3.5 rounded-lg sm:rounded-xl border ${ch.completed ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800/50 border-slate-700"}`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="text-[13px] sm:text-sm font-medium text-white truncate">{ch.title}</h4>
                    {ch.completed && <span className="text-[10px] sm:text-[11px] text-emerald-400 shrink-0">✓</span>}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">{ch.description}</p>
                </div>
                <div className="flex items-center gap-0.5 text-yellow-400 ml-1.5 shrink-0">
                  <Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="text-[11px] sm:text-xs font-medium">+{ch.reward}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${ch.completed ? "bg-emerald-500" : "bg-purple-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(ch.current, ch.target)}%` }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                  />
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 tabular-nums">{ch.current}/{ch.target}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center border border-slate-700">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mx-auto mb-0.5" />
          <p className="text-base sm:text-lg font-bold text-white">{points.toLocaleString()}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500">Dine poeng</p>
        </div>
        <div className="bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center border border-slate-700">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mx-auto mb-0.5" />
          <p className="text-base sm:text-lg font-bold text-white">{rank ? `#${rank}` : "-"}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500">Rangering</p>
        </div>
        <div className="bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center border border-slate-700">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 mx-auto mb-0.5" />
          <p className="text-base sm:text-lg font-bold text-white">{streak}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500">Dagers streak</p>
        </div>
      </div>

      {/* Leaderboard link */}
      <button className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 rounded-lg sm:rounded-xl text-slate-300 text-[12px] sm:text-sm flex items-center justify-center gap-1.5 transition-colors group">
        Se topplisten
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </motion.div>
  );
}

export default DailyChallenge;
