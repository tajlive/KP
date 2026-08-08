"use client";

/**
 * ExternalFollowSheet
 *
 * Mobil-first bottom-sheet for konfigurasjon av copy-trading.
 * Scale factor + allocation % + max trade amount.
 */

import { AnimatePresence, m } from "framer-motion";
import { X, Scale, Percent, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";

interface ExternalFollowSheetProps {
  traderName: string;
  isOpen: boolean;
  onClose: () => void;
  onFollow: (config: {
    scale_factor: number;
    allocation_percent: number;
    max_trade_amount: number | null;
  }) => Promise<void>;
  isLoading?: boolean;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const MIN_ALLOC = 1;
const MAX_ALLOC = 100;
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500_000;

export function ExternalFollowSheet({
  traderName,
  isOpen,
  onClose,
  onFollow,
  isLoading = false,
}: ExternalFollowSheetProps) {
  const t = useTranslations("copyTrading.externalFollow");
  const inputId = useId();

  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [allocationPercent, setAllocationPercent] = useState(10);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fokus på input ved åpning
  useEffect(() => {
    if (isOpen) {
      setScaleFactor(1.0);
      setAllocationPercent(10);
      setMaxAmount(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Lukk ved Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleFollow = useCallback(async () => {
    setError(null);
    try {
      await onFollow({
        scale_factor: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleFactor)),
        allocation_percent: Math.max(MIN_ALLOC, Math.min(MAX_ALLOC, allocationPercent)),
        max_trade_amount: maxAmount && maxAmount > 0
          ? Math.max(MIN_AMOUNT, Math.min(MAX_AMOUNT, maxAmount))
          : null,
      });
      onClose();
    } catch {
      setError(t("errorGeneric"));
    }
  }, [onFollow, scaleFactor, allocationPercent, maxAmount, onClose, t]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <m.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("sheetAriaLabel", { name: traderName })}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl border-t border-white/10 bg-[#161719] px-5 pb-[env(safe-area-inset-bottom,16px)] pt-5 shadow-[0_-8px_48px_rgba(0,0,0,0.5)]"
          >
            {/* Pill handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold text-white">
                  {t("title")}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {t("subtitle", { name: traderName })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-400 transition-colors hover:bg-white/20 active:scale-95"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scale Factor */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={`${inputId}-scale`} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300">
                  <Scale className="h-3.5 w-3.5" />
                  {t("scaleFactorLabel")}
                </label>
                <span className="text-[15px] font-bold tabular-nums text-white">
                  {scaleFactor.toFixed(1)}x
                </span>
              </div>
              <input
                id={`${inputId}-scale`}
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.1}
                value={scaleFactor}
                onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#0052FF]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>{MIN_SCALE}x</span>
                <span>{MAX_SCALE}x</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {t("scaleFactorHint")}
              </p>
            </div>

            {/* Allocation Percent */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={`${inputId}-alloc`} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300">
                  <Percent className="h-3.5 w-3.5" />
                  {t("allocationLabel")}
                </label>
                <span className="text-[15px] font-bold tabular-nums text-white">
                  {allocationPercent}%
                </span>
              </div>
              <input
                id={`${inputId}-alloc`}
                type="range"
                min={MIN_ALLOC}
                max={MAX_ALLOC}
                step={1}
                value={allocationPercent}
                onChange={(e) => setAllocationPercent(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#0052FF]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>{MIN_ALLOC}%</span>
                <span>{MAX_ALLOC}%</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {t("allocationHint")}
              </p>
            </div>

            {/* Max Trade Amount */}
            <div className="mb-6">
              <label
                htmlFor={`${inputId}-max`}
                className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-300"
              >
                <Wallet className="h-3.5 w-3.5" />
                {t("maxAmountLabel")}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id={`${inputId}-max`}
                  type="number"
                  inputMode="numeric"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  step={100}
                  value={maxAmount ?? ""}
                  placeholder={t("maxAmountPlaceholder")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaxAmount(val ? parseInt(val, 10) : null);
                  }}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-4 pr-16 text-[17px] font-bold tabular-nums text-white outline-none ring-0 transition focus:border-[#0052FF]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#0052FF]/30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate-400">
                  NOK
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {t("maxAmountHint", { min: MIN_AMOUNT.toLocaleString("no-NO") })}
              </p>
            </div>

            {error && (
              <p role="alert" className="mb-3 text-[12px] text-rose-400">
                {error}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={() => void handleFollow()}
              disabled={isLoading}
              className="h-[52px] w-full rounded-2xl bg-[#0052FF] text-[16px] font-bold text-white shadow-lg shadow-[#0052FF]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              aria-busy={isLoading}
            >
              {isLoading ? t("following") : t("cta", { name: traderName })}
            </button>

            <p className="mt-3 text-center text-[11px] leading-snug text-slate-600">
              {t("disclaimer")}
            </p>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
