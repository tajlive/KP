"use client";

import { m } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useState } from "react";
import { useTranslations } from "next-intl";

const riskLevels = [
  {
    id: "safe" as const,
    color: "#22c55e",
    returnRange: "+8–14%/år",
  },
  {
    id: "balanced" as const,
    color: "#f59e0b",
    returnRange: "+15–30%/år",
  },
  {
    id: "aggressive" as const,
    color: "#ef4444",
    returnRange: "+30–60%/år",
  },
];

interface OnboardingStep2Props {
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingStep2({ onNext, onBack }: OnboardingStep2Props) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const { setRiskLevel, riskLevel } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(riskLevel);

  const handleSelect = (id: string) => {
    setSelected(id);
    setRiskLevel(id as "safe" | "balanced" | "aggressive");
    navigator.vibrate?.(15);
  };

  const handleNext = () => {
    if (selected) {
      navigator.vibrate?.([20, 10]);
      onNext();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-4">
        <m.button
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/70"
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.95 }}
          aria-label={t("mobile.step2.backAriaLabel")}
        >
          <ChevronLeft size={24} />
        </m.button>
      </div>

      <div className="flex flex-1 flex-col px-5 py-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="mb-2 text-2xl font-bold text-white">
            {t("mobile.step2.title")}
          </h2>
          <p className="text-sm text-white/50">
            {t("mobile.step2.subtitle")}
          </p>
        </m.div>

        <div className="flex flex-1 flex-col gap-3">
          {riskLevels.map((level, index) => (
            <m.button
              key={level.id}
              onClick={() => handleSelect(level.id)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                selected === level.id
                  ? "border-white/20 bg-white/[0.08]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: level.color }}
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {t(`mobile.step2.riskLevels.${level.id}.label`)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${level.color}20`,
                        color: level.color,
                      }}
                    >
                      {level.returnRange}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/50">
                    {t(`mobile.step2.riskLevels.${level.id}.description`)}
                  </p>
                </div>
              </div>

              {selected === level.id && (
                <m.div
                  layoutId="selectedRing"
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2"
                  style={{ borderColor: level.color }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </m.button>
          ))}
        </div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
        >
          <m.button
            onClick={handleNext}
            disabled={!selected}
            className={`relative w-full overflow-hidden rounded-2xl py-4 text-base font-semibold ${
              selected
                ? "bg-[#2563eb] text-white"
                : "cursor-not-allowed bg-white/10 text-white/40"
            }`}
            whileHover={selected ? { scale: 1.02 } : {}}
            whileTap={selected ? { scale: 0.98 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {tCommon("next")}
          </m.button>
        </m.div>
      </div>
    </div>
  );
}
