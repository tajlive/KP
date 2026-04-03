"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Wallet, AlertTriangle, Lock, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TradingMode } from "@/lib/trading-api";

interface TradingModeSelectorProps {
  mode: TradingMode;
  onChange: (mode: TradingMode) => void;
  hasExchangeConnection?: boolean;
  isLiveEnabled?: boolean;
}

export function TradingModeSelector({
  mode,
  onChange,
  hasExchangeConnection = false,
  isLiveEnabled = false,
}: TradingModeSelectorProps) {
  const [hoveredMode, setHoveredMode] = useState<TradingMode | null>(null);
  const t = useTranslations("trading.tradingModeSelector");

  const isLiveLocked = !isLiveEnabled || !hasExchangeConnection;

  return (
    <div className="bg-kp-bg-tertiary/50 rounded-xl p-4 border border-kp-border">
      <h3 className="text-sm font-semibold text-kp-text-secondary mb-3 flex items-center gap-2">
        <Info className="w-4 h-4" />
        {t("title")}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Paper Mode Option */}
        <button
          onClick={() => onChange("paper")}
          onMouseEnter={() => setHoveredMode("paper")}
          onMouseLeave={() => setHoveredMode(null)}
          className={`relative p-4 rounded-xl border-2 transition-all text-left ${
            mode === "paper"
              ? "border-kp-brand bg-kp-brand-subtle"
              : "border-kp-border hover:border-kp-border-dark bg-kp-bg-tertiary/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                mode === "paper" ? "bg-kp-brand text-white" : "bg-kp-bg-tertiary text-kp-text-muted"
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-kp-text-primary">{t("paper.title")}</span>
                {mode === "paper" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-kp-brand rounded-full"
                  />
                )}
              </div>
              <p className="text-kp-text-muted text-sm mt-1">{t("paper.description")}</p>
            </div>
          </div>

          {/* Expanded info on hover/select */}
          <motion.div
            initial={false}
            animate={{
              height: mode === "paper" || hoveredMode === "paper" ? "auto" : 0,
              opacity: mode === "paper" || hoveredMode === "paper" ? 1 : 0,
            }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-kp-brand/20">
              <ul className="space-y-1 text-sm text-kp-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-kp-brand rounded-full" />
                  {t("paper.feature1")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-kp-brand rounded-full" />
                  {t("paper.feature2")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-kp-brand rounded-full" />
                  {t("paper.feature3")}
                </li>
              </ul>
            </div>
          </motion.div>
        </button>

        {/* Live Mode Option */}
        <button
          onClick={() => !isLiveLocked && onChange("live")}
          onMouseEnter={() => setHoveredMode("live")}
          onMouseLeave={() => setHoveredMode(null)}
          disabled={isLiveLocked}
          className={`relative p-4 rounded-xl border-2 transition-all text-left ${
            isLiveLocked
              ? "border-kp-border-light bg-kp-bg-tertiary/30 opacity-60 cursor-not-allowed"
              : mode === "live"
              ? "border-kp-success bg-kp-success-bg"
              : "border-kp-border hover:border-kp-border-dark bg-kp-bg-tertiary/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                mode === "live"
                  ? "bg-kp-success text-white"
                  : isLiveLocked
                  ? "bg-kp-bg-tertiary text-kp-text-muted"
                  : "bg-kp-bg-tertiary text-kp-text-muted"
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-kp-text-primary">{t("live.title")}</span>
                {isLiveLocked && <Lock className="w-4 h-4 text-kp-text-muted" />}
                {mode === "live" && !isLiveLocked && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-kp-success rounded-full"
                  />
                )}
              </div>
              <p className="text-kp-text-muted text-sm mt-1">{t("live.description")}</p>
            </div>
          </div>

          {/* Expanded info on hover/select */}
          {!isLiveLocked && (
            <motion.div
              initial={false}
              animate={{
                height: mode === "live" || hoveredMode === "live" ? "auto" : 0,
                opacity: mode === "live" || hoveredMode === "live" ? 1 : 0,
              }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-kp-success/20">
                <div className="flex items-start gap-2 text-sm text-kp-warning mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("live.warning")}</span>
                </div>
                <ul className="space-y-1 text-sm text-kp-text-secondary">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-kp-success rounded-full" />
                    {t("live.feature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-kp-success rounded-full" />
                    {t("live.feature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-kp-success rounded-full" />
                    {t("live.feature3")}
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Locked state message */}
          {isLiveLocked && (
            <div className="mt-3 pt-3 border-t border-kp-border">
              {!isLiveEnabled ? (
                <div className="flex items-start gap-2 text-sm text-kp-text-muted">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("locked.comingSoon")}</span>
                </div>
              ) : !hasExchangeConnection ? (
                <div className="flex items-start gap-2 text-sm text-kp-text-muted">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("locked.connectExchange")}</span>
                </div>
              ) : null}
            </div>
          )}
        </button>
      </div>

      {/* Live Mode Warning */}
      {mode === "live" && !isLiveLocked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-kp-danger-bg border border-kp-danger/30 rounded-lg flex items-start gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-kp-danger shrink-0" />
          <div>
            <p className="text-kp-danger font-medium text-sm">{t("liveWarning.title")}</p>
            <p className="text-kp-danger/80 text-sm mt-0.5">{t("liveWarning.description")}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
