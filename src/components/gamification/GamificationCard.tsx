"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Trophy, Target, Zap, Medal, Crown } from "lucide-react";
import { createClient } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthContext";

interface UserLevel {
  level: number;
  xp: number;
  xp_to_next: number;
  total_xp: number;
  rank: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
  progress: number;
  target: number;
}

const RANKS = [
  { level: 1, name: "Student", color: "text-slate-400" },
  { level: 5, name: "Bachelor", color: "text-blue-400" },
  { level: 10, name: "Master", color: "text-emerald-400" },
  { level: 20, name: "PhD", color: "text-purple-400" },
  { level: 30, name: "Professor", color: "text-amber-400" },
];

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  first_trade: <Target className="w-5 h-5" />,
  streak_7: <Zap className="w-5 h-5" />,
  quiz_master: <Star className="w-5 h-5" />,
  paper_profit: <Trophy className="w-5 h-5" />,
  invite_friend: <Medal className="w-5 h-5" />,
  founder: <Crown className="w-5 h-5" />,
};

export function GamificationCard() {
  const { user } = useAuth();
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchGamification = async () => {
      const supabase = createClient();
      
      // NOTE: user_levels table does not exist in database (verified 2024-03-10)
      // Using default level values until table is created
      // TODO: Create user_levels migration when gamification feature is ready
      setLevel({
        level: 1,
        xp: 0,
        xp_to_next: 100,
        total_xp: 0,
        rank: "Student",
      });
      
      // Fetch achievements (table exists)
      const achievementsResult = await (supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id));
      
      if (achievementsResult.data) {
        setAchievements((achievementsResult.data as unknown as Achievement[]));
      }
      
      setLoading(false);
    };
    
    fetchGamification();
  }, [user]);

  const getCurrentRank = (levelNum: number) => {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (levelNum >= RANKS[i].level) {
        return RANKS[i];
      }
    }
    return RANKS[0];
  };

  const getNextRank = (levelNum: number) => {
    for (let i = 0; i < RANKS.length; i++) {
      if (levelNum < RANKS[i].level) {
        return RANKS[i];
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const currentRank = level ? getCurrentRank(level.level) : RANKS[0];
  const nextRank = level ? getNextRank(level.level) : null;
  const xpProgress = level ? (level.xp / level.xp_to_next) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg">Din fremgang</h3>
          <p className="text-slate-400 text-sm">Level {level?.level || 1}</p>
        </div>
        <div className={`px-3 py-1 rounded-full bg-white/10 ${currentRank.color} font-semibold text-sm`}>
          {currentRank.name}
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">XP</span>
          <span className="text-white">
            {level?.xp || 0} / {level?.xp_to_next || 100}
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
        {nextRank && (
          <p className="text-xs text-slate-500 mt-2">
            {level?.xp_to_next && level ? level.xp_to_next - level.xp : 100} XP til {nextRank.name}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-2xl font-bold text-white">{level?.level || 1}</div>
          <div className="text-xs text-slate-400">Level</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-2xl font-bold text-white">
            {achievements.filter(a => a.unlocked_at).length}
          </div>
          <div className="text-xs text-slate-400">Prestasjoner</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-2xl font-bold text-white">{level?.total_xp || 0}</div>
          <div className="text-xs text-slate-400">Total XP</div>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div>
          <h4 className="text-white font-semibold mb-3">Prestasjoner</h4>
          <div className="space-y-2">
            {achievements.slice(0, 3).map((achievement) => (
              <div
                key={achievement.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  achievement.unlocked_at ? 'bg-white/10' : 'bg-white/5'
                }`}
              >
                <div className={`${achievement.unlocked_at ? 'text-yellow-400' : 'text-slate-600'}`}>
                  {ACHIEVEMENT_ICONS[achievement.icon] || <Star className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${achievement.unlocked_at ? 'text-white' : 'text-slate-500'}`}>
                    {achievement.name}
                  </p>
                  <p className="text-xs text-slate-500">{achievement.description}</p>
                </div>
                {achievement.unlocked_at ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <span className="text-slate-600 text-xs">{achievement.progress}/{achievement.target}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
