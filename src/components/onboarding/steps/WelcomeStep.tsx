"use client";

import { motion, type Variants } from "framer-motion";
import { Shield, Sparkles, TrendingUp, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Trygg simulering",
    desc: "Øv med lekepenger — ingen risiko",
    gradient: "from-emerald-500 to-cyan-500",
  },
  {
    icon: TrendingUp,
    title: "Auto-strategier",
    desc: "Avanserte boter som handles for deg",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: Zap,
    title: "Automatisk",
    desc: "Automatisk trading når du vil",
    gradient: "from-amber-500 to-orange-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

export function WelcomeStep() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      {/* Hero illustration */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-8"
      >
        <div
          className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500
                        flex items-center justify-center shadow-[0_8px_32px_rgba(59,130,246,0.3)]"
        >
          <Sparkles className="w-14 h-14 text-white" />
        </div>
        {/* Floating particles */}
        <motion.div
          animate={{ y: [-4, 4, -4], rotate: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-amber-400 dark:bg-amber-500
                     flex items-center justify-center shadow-lg"
        >
          <span className="text-sm">✨</span>
        </motion.div>
        <motion.div
          animate={{ y: [4, -4, 4], rotate: [0, -10, 0] }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute -bottom-2 -left-3 w-7 h-7 rounded-lg bg-emerald-400 dark:bg-emerald-500
                     flex items-center justify-center shadow-lg"
        >
          <span className="text-xs">📈</span>
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="text-center mb-10"
      >
        <h1 className="text-[32px] font-bold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
          Velkommen til
          <br />
          <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Klarpakke
          </span>
        </h1>
        <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
          Din personlige crypto trading-plattform. La oss sette opp alt på under
          2 minutter.
        </p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm space-y-3"
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={item}
              className="flex items-center gap-4 p-4
                         bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                         rounded-2xl border border-gray-200/50 dark:border-gray-800/50
                         shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient}
                              flex items-center justify-center shrink-0`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-[15px]">
                  {feature.title}
                </p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Trust note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-[13px] text-gray-400 dark:text-gray-500 text-center mt-8"
      >
        🇳🇴 Norsk selskap · 🔒 Ingen API-nøkler kreves for simulering
      </motion.p>
    </div>
  );
}
