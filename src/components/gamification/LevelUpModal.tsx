"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X } from "lucide-react";
import { useGamification } from "./GamificationProvider";

export function LevelUpModal() {
  const { showLevelUp, setShowLevelUp, newLevel } = useGamification();

  if (!showLevelUp) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 15, stiffness: 100 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)]"
        >
          {/* Confetti effect placeholder / background rays */}
          <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ ease: "linear", duration: 10, repeat: Infinity }}
            className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] -z-10 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(59,130,246,0.1)_360deg)] opacity-50"
          />

          <button
            onClick={() => setShowLevelUp(false)}
            className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          >
            <Trophy className="h-12 w-12 text-white" />
          </motion.div>

          <h2 className="mb-2 text-3xl font-black text-white tracking-tight">
            LEVEL UP!
          </h2>
          <p className="mb-6 text-slate-400 text-sm">
            Du har nådd et nytt nivå på din trading-reise.
          </p>

          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-200">
              NIVÅ {newLevel}
            </span>
          </div>

          <button
            onClick={() => setShowLevelUp(false)}
            className="w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:scale-[1.02]"
          >
            Fortsett oppdraget
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
