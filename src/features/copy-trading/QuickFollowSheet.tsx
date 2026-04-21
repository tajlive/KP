"use client";

/**
 * QuickFollowSheet
 *
 * Mobil-first bottom-sheet for rask copy-konfigurasjon.
 * Glidende inngang fra bunn, backdrop-tap lukker.
 * Touch targets ≥ 48px. Alle tall: tabular-nums.
 */

import { useCopyStore } from "@/store/copy-store";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type SizingMode = "fixed" | "proportional";

interface QuickFollowSheetProps {
  leaderId: string;
  leaderName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_ALLOC = 1000;
const MIN_ALLOC = 100;
const MAX_ALLOC = 500_000;

export function QuickFollowSheet({
  leaderId,
  leaderName,
  isOpen,
  onClose,
  onSuccess,
}: QuickFollowSheetProps) {
  const t = useTranslations("copyTrading.quickFollow");
  const { follow, isLoading } = useCopyStore();
  const inputId = useId();

  const [alloc, setAlloc] = useState(DEFAULT_ALLOC);
  const [sizingMode, setSizingMode] = useState<SizingMode>("proportional");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fokus på input ved åpning
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.select(), 150);
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
    const clamped = Math.max(MIN_ALLOC, Math.min(MAX_ALLOC, alloc));
    try {
      await follow(leaderId, {
        maxAllocationNok: clamped,
        sizingMode,
        maxLeverage: 5,         // safe default – advanced users can change in settings
        autoStopDrawdownPct: 20, // 20% drawdown protection by default
      });
      onSuccess?.();
      onClose();
    } catch {
      setError(t("errorGeneric"));
    }
  }, [follow, leaderId, alloc, sizingMode, onSuccess, onClose, t]);

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
            aria-label={t("sheetAriaLabel", { name: leaderName })}
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
                  {t("subtitle", { name: leaderName })}
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

            {/* Maks beløp */}
            <div className="mb-4">
              <label
                htmlFor={inputId}
                className="mb-1.5 block text-[13px] font-medium text-slate-300"
              >
                {t("allocLabel")}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={MIN_ALLOC}
                  max={MAX_ALLOC}
                  step={100}
                  value={alloc}
                  onChange={(e) =>
                    setAlloc(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-4 pr-16 text-[17px] font-bold tabular-nums text-white outline-none ring-0 transition focus:border-[#0052FF]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#0052FF]/30"
                  aria-describedby={error ? `${inputId}-err` : undefined}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate-400">
                  NOK
                </span>
              </div>
              {error && (
                <p
                  id={`${inputId}-err`}
                  role="alert"
                  className="mt-2 text-[12px] text-rose-400"
                >
                  {error}
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-slate-500">
                {t("allocHint", { min: MIN_ALLOC.toLocaleString("no-NO") })}
              </p>
            </div>

            {/* Sizing mode */}
            <div className="mb-6">
              <p className="mb-1.5 text-[13px] font-medium text-slate-300">
                {t("sizingLabel")}
              </p>
              <div
                className="flex overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                role="group"
                aria-label={t("sizingLabel")}
              >
                {(["proportional", "fixed"] as SizingMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSizingMode(mode)}
                    className={`flex flex-1 flex-col items-center justify-center py-3 text-[13px] font-medium transition-colors ${
                      sizingMode === mode
                        ? "bg-[#0052FF] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    aria-pressed={sizingMode === mode}
                  >
                    <span className="font-semibold">
                      {mode === "proportional"
                        ? t("sizingPropTitle")
                        : t("sizingFixedTitle")}
                    </span>
                    <span className="mt-0.5 text-[11px] opacity-70">
                      {mode === "proportional"
                        ? t("sizingPropHint")
                        : t("sizingFixedHint")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => void handleFollow()}
              disabled={isLoading || alloc < MIN_ALLOC}
              className="h-[52px] w-full rounded-2xl bg-[#0052FF] text-[16px] font-bold text-white shadow-lg shadow-[#0052FF]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              aria-busy={isLoading}
            >
              {isLoading ? t("following") : t("cta", { name: leaderName })}
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
