"use client";

import { m } from "framer-motion";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const stepMeta = [
  { label: "Velkommen", duration: "~15 sek" },
  { label: "Din strategi", duration: "~30 sek" },
  { label: "Kom i gang", duration: "~10 sek" },
];

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const current = stepMeta[currentStep - 1];

  return (
    <div className="flex flex-col gap-3 px-5 pb-4 pt-12">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-white/40">
          Steg {currentStep} av {totalSteps}
        </span>
        <span className="text-xs text-white/30">
          {current.label} · {current.duration}
        </span>
      </div>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <m.div
              className="h-full rounded-full bg-[#2563eb]"
              initial={false}
              animate={{
                width: i < currentStep ? "100%" : "0%",
                opacity: i < currentStep ? 1 : 0.3,
              }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.05,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
