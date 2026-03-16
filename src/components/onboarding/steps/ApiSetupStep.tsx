"use client";

import { useOnboardingStore } from "@/store/onboarding-store";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Info, Key } from "lucide-react";

export function ApiSetupStep() {
  const { markStepComplete } = useOnboardingStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-10">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-[24px] bg-linear-to-br from-amber-500 to-orange-500
                   flex items-center justify-center mb-6
                   shadow-[0_8px_24px_rgba(245,158,11,0.25)]"
      >
        <Key className="w-10 h-10 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-sm mb-8"
      >
        <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-2">
          Koble til Binance
        </h2>
        <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Koble API-nøklene dine for live trading. Du kan hoppe over dette og
          bruke simulering først.
        </p>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-sm mb-6"
      >
        <div className="flex gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-[13px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <strong>Trygt:</strong> Vi lagrer aldri dine nøkler. De krypteres
            med AES-256 og brukes kun for trading.
          </div>
        </div>
      </motion.div>

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="w-full max-w-sm space-y-3"
      >
        {/* Connect API */}
        <a
          href="https://www.binance.com/en/my/settings/api-management"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 w-full
                     bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                     rounded-2xl border-2 border-gray-200/60 dark:border-gray-800/60
                     hover:border-amber-500/40
                     active:scale-[0.97] transition-all duration-200
                     shadow-sm"
        >
          <div
            className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-400 to-yellow-500
                         flex items-center justify-center shrink-0"
          >
            <Key className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Koble API-nøkkel
            </p>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Åpne Binance API Management
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>

        {/* Skip — use paper */}
        <button
          onClick={() => markStepComplete("api_setup")}
          className="flex items-center gap-4 p-4 w-full
                     bg-emerald-50 dark:bg-emerald-900/20
                     rounded-2xl border-2 border-emerald-200/60 dark:border-emerald-800/40
                     hover:border-emerald-500/50
                     active:scale-[0.97] transition-all duration-200"
        >
          <div
            className="w-11 h-11 rounded-xl bg-linear-to-br from-emerald-500 to-cyan-500
                         flex items-center justify-center shrink-0"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Start med simulering
            </p>
            <p className="text-[13px] text-emerald-600 dark:text-emerald-400">
              1M NOK lekepenger — ingen risiko
            </p>
          </div>
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-[13px] text-gray-400 dark:text-gray-500 text-center mt-6"
      >
        Du kan alltid koble til API senere fra Innstillinger
      </motion.p>
    </div>
  );
}
