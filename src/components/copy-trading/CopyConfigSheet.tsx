"use client";

/**
 * CopyConfigSheet — iOS-style bottom sheet for configuring copy trading per trader
 */

import type { CopyConfig } from "@/store/copy-store";
import { useCopyStore } from "@/store/copy-store";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Gauge,
  Scaling,
  Settings,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface CopyConfigSheetProps {
  leaderId: string;
  leaderName: string;
  currentConfig?: Partial<CopyConfig>;
  onClose: () => void;
}

function formatNOK(n: number) {
  return new Intl.NumberFormat("no-NO", { maximumFractionDigits: 0 }).format(n);
}

export default function CopyConfigSheet({
  leaderId,
  leaderName,
  currentConfig,
  onClose,
}: CopyConfigSheetProps) {
  const { updateConfig } = useCopyStore();
  const [config, setConfig] = useState<CopyConfig>({
    maxAllocationNok: currentConfig?.maxAllocationNok ?? 10000,
    sizingMode: currentConfig?.sizingMode ?? "proportional",
    maxLeverage: currentConfig?.maxLeverage ?? 5,
    autoStopDrawdownPct: currentConfig?.autoStopDrawdownPct ?? 20,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const shouldReduce = useReducedMotion();

  const handleSave = async () => {
    setIsSaving(true);
    await updateConfig(leaderId, config);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  const ALLOCATION_PRESETS = [5000, 10000, 25000, 50000, 100000];

  return (
    <motion.div
      initial={shouldReduce ? {} : { y: "100%" }}
      animate={{ y: 0 }}
      exit={shouldReduce ? {} : { y: "100%" }}
      transition={
        shouldReduce
          ? { duration: 0 }
          : { type: "spring", damping: 30, stiffness: 300 }
      }
      className="fixed inset-x-0 bottom-0 z-50
                 bg-white dark:bg-gray-900
                 rounded-t-[32px]
                 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]
                 max-h-[85vh] overflow-y-auto overscroll-contain"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>

      <div className="px-6 pb-[max(env(safe-area-inset-bottom,24px),24px)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Settings className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white">
              Copy-innstillinger
            </h3>
            <p className="text-[13px] text-gray-500">{leaderName}</p>
          </div>
        </div>

        {/* Max Allocation */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-500" />
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Maks allokering
            </label>
          </div>
          <p className="text-[13px] text-gray-500 mb-3">
            Maksimal kapital som kan brukes for å kopiere denne traderen
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALLOCATION_PRESETS.map((amount) => (
              <button
                key={amount}
                onClick={() =>
                  setConfig({ ...config, maxAllocationNok: amount })
                }
                className={`px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all active:scale-95
                           ${
                             config.maxAllocationNok === amount
                               ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                               : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                           }`}
              >
                {formatNOK(amount)} NOK
              </button>
            ))}
          </div>
          <label htmlFor="allocation-range" className="sr-only">
            Maks allokering
          </label>
          <input
            id="allocation-range"
            type="range"
            min={1000}
            max={200000}
            step={1000}
            value={config.maxAllocationNok}
            onChange={(e) =>
              setConfig({ ...config, maxAllocationNok: Number(e.target.value) })
            }
            aria-label={`Maks allokering: ${formatNOK(config.maxAllocationNok)} NOK`}
            className="w-full accent-blue-500 h-2 rounded-full"
          />
          <p className="text-[13px] text-blue-600 dark:text-blue-400 font-medium text-center mt-1 tabular-nums">
            {formatNOK(config.maxAllocationNok)} NOK
          </p>
        </div>

        {/* Sizing Mode */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Scaling className="w-4 h-4 text-indigo-500" />
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Størrelses-modus
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["proportional", "fixed"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setConfig({ ...config, sizingMode: mode })}
                className={`p-4 rounded-2xl text-left transition-all active:scale-[0.97]
                           border-2 ${
                             config.sizingMode === mode
                               ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                               : "border-gray-200 dark:border-gray-800"
                           }`}
              >
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
                  {mode === "proportional" ? "Proporsjonal" : "Fast"}
                </p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {mode === "proportional"
                    ? "Skalerer posisjoner basert på din kapital"
                    : "Bruker fast beløp per trade"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Max Leverage */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-amber-500" />
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Maks leverage: {config.maxLeverage}x
            </label>
          </div>
          <label htmlFor="leverage-range" className="sr-only">
            Maks leverage
          </label>
          <input
            id="leverage-range"
            type="range"
            min={1}
            max={20}
            step={1}
            value={config.maxLeverage}
            onChange={(e) =>
              setConfig({ ...config, maxLeverage: Number(e.target.value) })
            }
            aria-label={`Maks leverage: ${config.maxLeverage}x`}
            className="w-full accent-amber-500 h-2 rounded-full"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>1x (trygt)</span>
            <span>10x</span>
            <span>20x (aggressivt)</span>
          </div>
        </div>

        {/* Auto-stop drawdown */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Auto-stopp ved drawdown: {config.autoStopDrawdownPct}%
            </label>
          </div>
          <p className="text-[13px] text-gray-500 mb-3">
            Stopper automatisk kopiering ved denne tapsprosenten
          </p>
          <label htmlFor="drawdown-range" className="sr-only">
            Auto-stopp drawdown
          </label>
          <input
            id="drawdown-range"
            type="range"
            min={5}
            max={50}
            step={5}
            value={config.autoStopDrawdownPct}
            onChange={(e) =>
              setConfig({
                ...config,
                autoStopDrawdownPct: Number(e.target.value),
              })
            }
            aria-label={`Auto-stopp ved ${config.autoStopDrawdownPct}% drawdown`}
            className="w-full accent-rose-500 h-2 rounded-full"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>5% (konservativ)</span>
            <span>25%</span>
            <span>50% (aggressiv)</span>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full min-h-[56px] flex items-center justify-center gap-2
                     bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500
                     text-white font-semibold text-[17px]
                     rounded-2xl
                     shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                     active:scale-[0.97]
                     transition-[transform,box-shadow,opacity] duration-200
                     disabled:opacity-50"
        >
          {saved ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Lagret!
            </motion.div>
          ) : isSaving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            "Lagre innstillinger"
          )}
        </button>
      </div>
    </motion.div>
  );
}
