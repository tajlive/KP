"use client";

import { useTradingMode } from "@/context/TradingModeContext";
import type { TradingMode } from "@/types/trading";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MODES: { value: TradingMode; label: string; Icon: LucideIcon }[] = [
  { value: "paper", label: "Paper", Icon: FileText },
  { value: "live", label: "Live", Icon: Wallet },
];

const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Paper texture SVG as a CSS data-URI (SVG turbulence noise)
// ─────────────────────────────────────────────────────────────────────────────
const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'0.06\'/%3E%3C/svg%3E")';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface TradingModeToggleProps {
  /** Controlled mode (overrides TradingModeContext). */
  mode?: TradingMode;
  /** Controlled toggle callback (overrides TradingModeContext). */
  onToggle?: (mode: TradingMode) => void;
  /** Paper-side label. Defaults to "Paper". */
  paperLabel?: string;
  /** Live-side label. Defaults to "Live". */
  liveLabel?: string;
  /** Aria-label for accessibility. */
  ariaLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TradingModeToggle({
  mode: controlledMode,
  onToggle,
  paperLabel,
  liveLabel,
  ariaLabel,
}: TradingModeToggleProps = {}) {
  const ctx = useTradingMode();
  const mode = controlledMode ?? ctx.mode;
  const setMode = onToggle ?? ctx.setMode;
  const isLive = mode === "live";

  const toggle = () => setMode(isLive ? "paper" : "live");

  const labels: Record<TradingMode, string> = {
    paper: paperLabel ?? "Paper",
    live: liveLabel ?? "Live",
  };

  return (
    <div className="relative w-[200px] h-10">
      {/* ── Track ── */}
      <motion.button
        id="trading-mode-toggle"
        onClick={toggle}
        role="switch"
        aria-checked={isLive}
        aria-label={
          ariaLabel ?? `Handelsmodus: ${isLive ? "Live" : "Lekepenger"}`
        }
        className="relative w-full h-full rounded-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0D] cursor-pointer select-none [-webkit-tap-highlight-color:transparent]"
        animate={{
          backgroundColor: isLive ? "#10B981" : "#0EA5E9",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Paper-mode noise texture overlay */}
        <AnimatePresence>
          {!isLive && (
            <motion.span
              key="paper-noise"
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundImage: NOISE_BG,
                backgroundSize: "100% 100%",
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Labels ── */}
        <span className="relative z-10 flex items-center justify-between h-full px-3 pointer-events-none">
          {MODES.map(({ value, Icon }) => {
            const active = mode === value;
            return (
              <motion.span
                key={value}
                className="flex items-center gap-1 text-sm font-semibold leading-none text-white"
                animate={{
                  opacity: active ? 1 : 0.45,
                  scale: active ? 1 : 0.9,
                }}
                transition={{ duration: 0.25 }}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-xs sm:text-sm">{labels[value]}</span>
              </motion.span>
            );
          })}
        </span>

        {/* ── Knob ── */}
        <motion.span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-full bg-white/20 backdrop-blur-sm pointer-events-none w-[calc(50%-4px)]"
          animate={{ x: isLive ? "calc(100% + 4px)" : 0, left: 4 }}
          transition={SPRING}
        />
      </motion.button>

      {/* ── Live pulse ring ── */}
      <AnimatePresence>
        {isLive && (
          <motion.span
            key="live-ring"
            aria-hidden="true"
            className="absolute inset-0 rounded-full pointer-events-none border-2 border-[#10B981]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: [0.6, 0, 0.6],
              scale: [1, 1.06, 1],
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Reduced-motion override: disable all animations */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          #trading-mode-toggle * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
