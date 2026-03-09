"use client";

import { useOnboardingStore } from "@/store/onboarding-store";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Bot, PartyPopper, Users } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";

const NEXT_ACTIONS = [
  {
    icon: BarChart3,
    title: "Utforsk markedet",
    desc: "Se live priser og analyser",
    href: "/beta/live-trading",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Bot,
    title: "Start en bot",
    desc: "La AI handle for deg automatisk",
    href: "/beta/auto-trading",
    gradient: "from-emerald-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Kopier en trader",
    desc: "Følg topptraders strategier",
    href: "/beta/copy-trading",
    gradient: "from-indigo-500 to-blue-500",
  },
];

const confetti = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.4 },
  },
};

const particle = {
  hidden: { opacity: 0, y: 0 },
  show: {
    opacity: [0, 1, 1, 0],
    y: [-10, -60],
    x: () => (Math.random() - 0.5) * 100,
    transition: { duration: 1.5, ease: "easeOut" },
  },
};

export function CompletionStep() {
  const { riskProfile, selectedTemplate, paperTradeResult } =
    useOnboardingStore();
  const locale = useLocale();

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      {/* Confetti particles */}
      <motion.div
        variants={confetti}
        initial="hidden"
        animate="show"
        className="relative"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            variants={particle as unknown}
            className="absolute top-0 left-1/2"
            style={{
              fontSize: ["🎉", "✨", "🎊", "💎", "⭐", "🚀"][i % 6] ? 16 : 12,
            }}
          >
            {["🎉", "✨", "🎊", "💎", "⭐", "🚀"][i % 6]}
          </motion.div>
        ))}

        {/* Hero */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 12,
            delay: 0.1,
          }}
          className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500
                     flex items-center justify-center
                     shadow-[0_8px_32px_rgba(245,158,11,0.3)]"
        >
          <PartyPopper className="w-12 h-12 text-white" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mt-8 mb-8 max-w-sm"
      >
        <h1 className="text-[32px] font-bold text-gray-900 dark:text-white mb-3 leading-tight">
          Du er klar! 🎉
        </h1>
        <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed">
          Alt er satt opp. Velkommen til Klarpakke — din personlige crypto
          trading-partner.
        </p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm p-5 rounded-3xl
                   bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                   border border-gray-200/50 dark:border-gray-800/50
                   shadow-[0_4px_24px_rgba(0,0,0,0.06)] mb-6"
      >
        <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-3">
          Ditt oppsett
        </p>
        <div className="space-y-2.5">
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Risikoprofil</span>
            <span className="font-semibold text-gray-900 dark:text-white capitalize">
              {riskProfile === "conservative"
                ? "🛡️ Konservativ"
                : riskProfile === "aggressive"
                  ? "🚀 Aggressiv"
                  : "⚖️ Balansert"}
            </span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Strategi</span>
            <span className="font-semibold text-gray-900 dark:text-white capitalize">
              {selectedTemplate || "Balansert"}
            </span>
          </div>
          {paperTradeResult && (
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-500">Første trade</span>
              <span
                className={`font-semibold ${paperTradeResult.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
              >
                {paperTradeResult.pnl >= 0 ? "+" : ""}
                {paperTradeResult.pnl.toFixed(2)} USDT
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Next action cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm space-y-3"
      >
        <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">
          Hva vil du gjøre først?
        </p>
        {NEXT_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={`/${locale}${action.href}`}
              className="flex items-center gap-4 p-4 w-full
                         bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                         rounded-2xl border border-gray-200/50 dark:border-gray-800/50
                         hover:shadow-md active:scale-[0.97]
                         transition-all duration-200"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient}
                              flex items-center justify-center flex-shrink-0
                              shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  {action.title}
                </p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {action.desc}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
