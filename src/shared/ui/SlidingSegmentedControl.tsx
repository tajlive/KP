"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SlidingSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Unik per mount (unngå layoutId-kollisjon mellom flere kontroller på samme side) */
  layoutId: string;
  variant?: "light" | "dark";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const VARIANT = {
  light: {
    track:
      "bg-slate-100/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
    pill: "bg-white dark:bg-slate-700 shadow-[0_1px_4px_rgba(0,82,255,0.12),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none border border-slate-200/70 dark:border-slate-600",
    textActive: "text-slate-900 dark:text-white font-semibold",
    textInactive:
      "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-medium",
  },
  dark: {
    track: "bg-slate-900/90 border border-slate-700/60",
    pill: "bg-gradient-to-b from-[#3d7aff] to-[#0052FF] shadow-[0_1px_3px_rgba(0,82,255,0.35)]",
    textActive: "text-white font-semibold",
    textInactive: "text-slate-400 hover:text-slate-200 font-medium",
  },
} as const;

/**
 * Moderne segmentert «skyve»-kontroll med animeret pill (Framer Motion layoutId).
 */
export function SlidingSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  variant = "light",
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SlidingSegmentedControlProps<T>) {
  const v = VARIANT[variant];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex h-9 min-h-9 w-full min-w-0 items-stretch rounded-full p-0.5",
        v.track,
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-full px-2 py-1 outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[#0052FF]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className={cn("absolute inset-0 rounded-full", v.pill)}
                transition={{ type: "spring", stiffness: 440, damping: 34 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 truncate text-[11px] uppercase tracking-[0.06em] sm:text-xs",
                selected ? v.textActive : v.textInactive,
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
