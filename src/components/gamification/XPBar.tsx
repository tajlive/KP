"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useGamification } from "./GamificationProvider";

// For level 1, xp needed to Lvl 2 is 100.
// level N requires (N-1)^2 * 100
function getLevelThreshold(level: number) {
  return Math.pow(level, 2) * 100;
}
function getPreviousThreshold(level: number) {
  return Math.pow(level - 1, 2) * 100;
}

export function XPBar() {
  const { state } = useGamification();

  if (!state) return null;

  const currentXp = state.total_xp;
  const level = state.current_level;

  const floorXp = getPreviousThreshold(level);
  const nextXp = getLevelThreshold(level);
  const xpInLevel = currentXp - floorXp;
  const xpRequiredForNext = nextXp - floorXp;
  const percentage = Math.min((xpInLevel / xpRequiredForNext) * 100, 100);

  return (
    <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 shadow-sm">
      {/* Level Badge */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]">
          {level}
        </div>
        <span className="text-xs font-medium text-slate-300 hidden sm:inline-block">
          Lvl
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-24 sm:w-32 md:w-48">
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
          <span>{currentXp} XP</span>
          <span>{nextXp} XP</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shrink-0 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, type: "spring", stiffness: 50 }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          />
        </div>
      </div>

      {/* Streak */}
      <AnimatePresence>
        {state.current_streak > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 text-orange-400"
          >
            <Flame className="h-4 w-4 fill-orange-500 animate-[pulse_2s_infinite]" />
            <span className="text-xs font-bold font-mono">
              {state.current_streak}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
