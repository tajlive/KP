"use client";

import { useState, useCallback } from "react";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { Shield, Scale, Zap, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  type UIRiskLevel,
  type ApiRiskLevel,
  mapUiToApiRiskLevel,
  mapApiToUiRiskLevel,
} from "@/lib/trading/risk-level-mapping";

/** @deprecated Use UIRiskLevel from @/lib/trading/risk-level-mapping */
export type RiskLevel = UIRiskLevel;

/** Re-export for convenience */
export type { UIRiskLevel, ApiRiskLevel };
export { mapUiToApiRiskLevel, mapApiToUiRiskLevel };

interface RiskConfig {
  id: UIRiskLevel;
  icon: React.ElementType;
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  description: string;
  descriptionEn: string;
  maxTrade: string;
  stopLoss: string;
  strategy: string;
  strategyEn: string;
  returnRange: string;
  plan: string;
  planEn: string;
}

const RISK_LEVELS: RiskConfig[] = [
  {
    id: "safe",
    icon: Shield,
    label: "Trygg",
    labelEn: "Safe",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.15)",
    description: "Minimal risiko. Ideell for nybegynnere.",
    descriptionEn: "Minimal risk. Ideal for beginners.",
    maxTrade: "2%",
    stopLoss: "-3%",
    strategy: "DCA/Spot",
    strategyEn: "DCA/Spot",
    returnRange: "+8–14%/år",
    plan: "Student (gratis)",
    planEn: "Student (free)",
  },
  {
    id: "balanced",
    icon: Scale,
    label: "Balansert",
    labelEn: "Balanced",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.15)",
    description: "Moderat risiko. God avkastning over tid.",
    descriptionEn: "Moderate risk. Good returns over time.",
    maxTrade: "5%",
    stopLoss: "-7%",
    strategy: "DCA+RSI",
    strategyEn: "DCA+RSI",
    returnRange: "+15–30%/år",
    plan: "Bachelor",
    planEn: "Bachelor",
  },
  {
    id: "aggressive",
    icon: Zap,
    label: "Aggressiv",
    labelEn: "Aggressive",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
    description: "Høy risiko. Potensielt høy avkastning.",
    descriptionEn: "High risk. Potentially high returns.",
    maxTrade: "10%",
    stopLoss: "-15%",
    strategy: "Momentum",
    strategyEn: "Momentum",
    returnRange: "+30–60%/år",
    plan: "Master",
    planEn: "Master",
  },
];

interface RiskSliderProps {
  locale?: "no" | "en";
  initialLevel?: UIRiskLevel;
  /** Called with UI risk level (safe/balanced/aggressive) */
  onChange?: (level: UIRiskLevel) => void;
  /** Called with UI risk level (safe/balanced/aggressive) */
  onConfirm?: (level: UIRiskLevel) => void | Promise<void>;
  /** Called with API risk level (low/medium/high) - use this when sending to backend */
  onChangeApi?: (level: ApiRiskLevel) => void;
  /** Called with API risk level (low/medium/high) - use this when sending to backend */
  onConfirmApi?: (level: ApiRiskLevel) => void | Promise<void>;
  showConfirmButton?: boolean;
}

export function RiskSlider({
  locale = "no",
  initialLevel = "balanced",
  onChange,
  onConfirm,
  onChangeApi,
  onConfirmApi,
  showConfirmButton = true,
}: RiskSliderProps) {
  const [currentLevel, setCurrentLevel] = useState<UIRiskLevel>(initialLevel);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const controls = useAnimation();

  const currentConfig = RISK_LEVELS.find((l) => l.id === currentLevel)!;
  const currentIndex = RISK_LEVELS.findIndex((l) => l.id === currentLevel);

  const snapToLevel = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(2, index));
      const newLevel = RISK_LEVELS[clampedIndex].id;

      if (newLevel !== currentLevel) {
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }

        setCurrentLevel(newLevel);
        onChange?.(newLevel);
        onChangeApi?.(mapUiToApiRiskLevel(newLevel));
      }

      controls.start({
        x: clampedIndex * -100 + "%",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });
    },
    [currentLevel, onChange, controls]
  );

  const handleDragEnd = (_: MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (velocity < -500 || offset < -threshold) {
      snapToLevel(currentIndex + 1);
    } else if (velocity > 500 || offset > threshold) {
      snapToLevel(currentIndex - 1);
    } else {
      snapToLevel(currentIndex);
    }
  };

  const handleLevelClick = (index: number) => {
    if (index !== currentIndex) {
      snapToLevel(index);
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
      await onConfirm?.(currentLevel);
      await onConfirmApi?.(mapUiToApiRiskLevel(currentLevel));
    } finally {
      setIsSubmitting(false);
    }
  };

  const LevelIcon = currentConfig.icon;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#161719] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5 transition-colors duration-300"
          style={{ backgroundColor: currentConfig.bgColor }}
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              key={currentLevel}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: currentConfig.color }}
            >
              <LevelIcon className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <motion.h3
                key={`${currentLevel}-label`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bold text-white"
              >
                {locale === "no" ? currentConfig.label : currentConfig.labelEn}
              </motion.h3>
              <motion.p
                key={`${currentLevel}-desc`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/70"
              >
                {locale === "no" ? currentConfig.description : currentConfig.descriptionEn}
              </motion.p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="relative h-2 bg-white/10 rounded-full mb-6">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ backgroundColor: currentConfig.color }}
              initial={false}
              animate={{ width: `${((currentIndex + 1) / 3) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            <div className="absolute inset-0 flex justify-between items-center px-1">
              {RISK_LEVELS.map((level, index) => (
                <motion.button
                  key={level.id}
                  onClick={() => handleLevelClick(index)}
                  className="relative w-6 h-6 -ml-3 first:ml-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161719]"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <motion.div
                    className="w-full h-full rounded-full border-2 transition-colors duration-200"
                    style={{
                      backgroundColor: index <= currentIndex ? level.color : "#1f2128",
                      borderColor: index <= currentIndex ? level.color : "rgba(255,255,255,0.2)",
                    }}
                  />
                  {index === currentIndex && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `0 0 0 4px ${level.bgColor}` }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden">
            <motion.div
              className="flex cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: -200, right: 200 }}
              dragElastic={0.2}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              animate={controls}
              style={{ x: currentIndex * -100 + "%" }}
            >
              {RISK_LEVELS.map((level) => (
                <div key={level.id} className="w-full flex-shrink-0 px-1">
                  <div
                    className="p-4 rounded-xl border transition-all duration-300"
                    style={{
                      backgroundColor: level.id === currentLevel ? "rgba(255,255,255,0.05)" : "transparent",
                      borderColor: level.id === currentLevel ? level.color : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <span className="text-gray-500 text-xs">
                          {locale === "no" ? "Maks/hand" : "Max/trade"}
                        </span>
                        <span className="block text-white font-medium">{level.maxTrade}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500 text-xs">Stop-loss</span>
                        <span className="block text-red-400 font-medium">{level.stopLoss}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500 text-xs">
                          {locale === "no" ? "Strategi" : "Strategy"}
                        </span>
                        <span className="block text-white font-medium">
                          {locale === "no" ? level.strategy : level.strategyEn}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500 text-xs">
                          {locale === "no" ? "Forventet" : "Expected"}
                        </span>
                        <span className="block text-green-400 font-medium">{level.returnRange}</span>
                      </div>
                    </div>

                    <div
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: level.bgColor,
                        color: level.color,
                      }}
                    >
                      {locale === "no" ? level.plan : level.planEn}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            {locale === "no" ? "← Dra for å endre risikonivå →" : "← Swipe to change risk level →"}
          </p>
        </div>

        {showConfirmButton && (
          <div className="p-4 pt-0">
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full h-12 text-base font-semibold transition-all duration-200"
              style={{
                backgroundColor: currentConfig.color,
                color: "white",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  {locale === "no" ? "Bekreft valg" : "Confirm selection"}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function RiskBadge({
  level,
  locale = "no",
}: {
  level: UIRiskLevel;
  locale?: "no" | "en";
}) {
  const config = RISK_LEVELS.find((l) => l.id === level)!;
  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {locale === "no" ? config.label : config.labelEn}
    </div>
  );
}

export function useRiskLevel(initialLevel: UIRiskLevel = "balanced") {
  const [level, setLevel] = useState<RiskLevel>(initialLevel);
  const config = RISK_LEVELS.find((l) => l.id === level)!;

  return {
    level,
    setLevel,
    config,
    isSafe: level === "safe",
    isBalanced: level === "balanced",
    isAggressive: level === "aggressive",
  };
}
