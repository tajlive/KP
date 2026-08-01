"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Clock, Zap, Flame, ChevronRight, Gift, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Challenge {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
}

interface GamificationStats {
  points: number;
  rank: number | null;
  streak: number;
  challenges: Challenge[];
}

interface DailyChallengeProps {
  userId?: string;
}

export function DailyChallenge({ userId: propUserId }: DailyChallengeProps) {
  const { user } = useAuth();
  const userId = propUserId || user?.id;

  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/gamification/stats?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Countdown timer - reset at midnight
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressPercent = (current: number, target: number) =>
    Math.min(100, (current / target) * 100);

  const challenges = stats?.challenges ?? [];
  const points = stats?.points ?? 0;
  const rank = stats?.rank;
  const streak = stats?.streak ?? 0;

  return (
    <motion.div
      className="bg-gradient-to-br from-purple-900/30 via-slate-900 to-blue-900/30 rounded-2xl p-6 border border-purple-500/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Dagens utfordringer</h3>
            <p className="text-slate-400 text-sm">Fullfør for bonuspoeng</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400 font-mono text-sm">
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Challenges */}
      {loading ? (
        <div className="space-y-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border bg-slate-800/30 border-slate-700 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border transition-all ${
                challenge.completed
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-slate-800/50 border-slate-700 hover:border-purple-500/30"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">{challenge.title}</h4>
                    {challenge.completed && (
                      <span className="text-emerald-400 text-xs">✓ Fullført</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">{challenge.description}</p>
                </div>

                <div className="flex items-center gap-1 text-yellow-400">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-medium">+{challenge.reward}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      challenge.completed ? "bg-emerald-500" : "bg-purple-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${progressPercent(challenge.current, challenge.target)}%`,
                    }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>

                <span className="text-slate-400 text-sm whitespace-nowrap">
                  {challenge.current}/{challenge.target}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex justify-center mb-1">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-xl font-bold text-white">{points.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Dine poeng</p>
        </motion.div>

        <motion.div
          className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex justify-center mb-1">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {rank ? `#${rank}` : "-"}
          </p>
          <p className="text-xs text-slate-500">Rangering</p>
        </motion.div>

        <motion.div
          className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex justify-center mb-1">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-xl font-bold text-white">{streak}</p>
          <p className="text-xs text-slate-500">Dagers streak</p>
        </motion.div>
      </div>

      {/* Leaderboard teaser */}
      <motion.button
        className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm flex items-center justify-center gap-2 transition-colors group"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        Se topplisten
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
}

export default DailyChallenge;
