"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { SURFACE } from "@/lib/design/tokens";
import { ONBOARDING_TIPS } from "@/lib/onboarding/tips";
import { cn } from "@/lib/utils";

export function MicroLearning() {
  const { activeTip, dismissTip, isLoading, dismissedTips } =
    useOnboardingProgress();

  if (isLoading) return null;
  if (!activeTip) return null;

  // Calculate progress
  const totalTips = ONBOARDING_TIPS.length;
  const completedCount = Object.keys(dismissedTips).length;
  const currentStep = completedCount + 1;

  const Icon = activeTip.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTip.id}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 md:p-5",
          SURFACE.glass.high
        )}
      >
        {/* Progress indicator */}
        <div className="absolute right-4 top-3">
          <span className="text-xs font-medium text-gray-400">
            Steg {currentStep} av {totalTips}
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400">
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 pr-8">
            <h3 className="text-sm font-semibold text-white">
              {activeTip.title}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {activeTip.description}
            </p>
            <Link
              href={activeTip.cta.href}
              className="mt-2 inline-flex items-center text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
            >
              {activeTip.cta.label}
              <svg
                className="ml-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => dismissTip(activeTip.id)}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
            aria-label="Lukk tips"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 w-full rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(currentStep / totalTips) * 100}%`,
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full rounded-full bg-brand-500"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
