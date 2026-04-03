"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Clock, Shield, AlertCircle, Eye, Rabbit } from "lucide-react";
import { Slider } from "@/shared/ui/slider";
import { cn } from "@/lib/utils";

type AggressivityLevel = "conservative" | "moderate" | "aggressive";

interface AggressivitySliderProps {
  value: AggressivityLevel;
  onChange: (level: AggressivityLevel) => void;
}

const LEVEL_CONFIG: Record<
  AggressivityLevel,
  {
    icon: typeof Clock;
    color: string;
    bgColor: string;
    textColor: string;
  }
> = {
  conservative: {
    icon: Shield,
    color: "#10b981",
    bgColor: "bg-kp-success-bg",
    textColor: "text-kp-success",
  },
  moderate: {
    icon: Eye,
    color: "#f59e0b",
    bgColor: "bg-kp-warning-bg",
    textColor: "text-kp-warning",
  },
  aggressive: {
    icon: Rabbit,
    color: "#ef4444",
    bgColor: "bg-kp-danger-bg",
    textColor: "text-kp-danger",
  },
};

const LEVELS: AggressivityLevel[] = ["conservative", "moderate", "aggressive"];

export function AggressivitySlider({ value, onChange }: AggressivitySliderProps) {
  const t = useTranslations("trading.aggressivitySlider");
  const tLevels = useTranslations("trading.aggressivitySlider.levels");
  const [hoveredLevel, setHoveredLevel] = useState<AggressivityLevel | null>(null);

  const currentConfig = LEVEL_CONFIG[value];
  const currentIndex = LEVELS.indexOf(value);
  const displayLevel = hoveredLevel || value;
  const displayConfig = LEVEL_CONFIG[displayLevel];
  const Icon = displayConfig.icon;

  const handleSliderChange = (values: number[]) => {
    const index = Math.round(values[0]);
    const level = LEVELS[index];
    if (level) {
      onChange(level);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Slider with labels */}
      <div className="bg-kp-bg-tertiary/50 border border-kp-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-kp-text-secondary">
            {t("title")}
          </label>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              currentConfig.bgColor
            )}
          >
            <Icon className={cn("w-4 h-4", currentConfig.textColor)} />
            <span className="font-semibold text-kp-text-primary">
              {tLevels(`${value}.label`)}
            </span>
          </div>
        </div>

        <Slider
          value={[currentIndex]}
          onValueChange={handleSliderChange}
          max={2}
          step={1}
          className="w-full mb-6"
        />

        {/* Level indicators */}
        <div className="flex justify-between text-xs text-kp-text-muted mb-4">
          <span
            className={cn(
              value === "conservative" && "text-kp-success font-medium"
            )}
          >
            {tLevels("conservative.label")}
          </span>
          <span
            className={cn(
              value === "moderate" && "text-kp-warning font-medium"
            )}
          >
            {tLevels("moderate.label")}
          </span>
          <span
            className={cn(
              value === "aggressive" && "text-kp-danger font-medium"
            )}
          >
            {tLevels("aggressive.label")}
          </span>
        </div>

        {/* Short description */}
        <p className="text-sm text-kp-text-muted text-center">
          {tLevels(`${displayLevel}.description`)}
        </p>
      </div>

      {/* Detailed explanation */}
      <motion.div
        key={displayLevel}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-kp-bg-tertiary/50 border border-kp-border rounded-xl p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              displayConfig.bgColor
            )}
          >
            <Icon className={cn("w-5 h-5", displayConfig.textColor)} />
          </div>
          <div>
            <h3 className="font-semibold text-kp-text-primary">
              {tLevels(`${displayLevel}.whatItMeans`)}
            </h3>
          </div>
        </div>

        {/* Reaction details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-kp-bg-secondary rounded-lg p-3 border border-kp-border">
            <div className="flex items-center gap-2 text-kp-text-muted text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              {t("sections.reactionTime")}
            </div>
            <p className="text-sm text-kp-text-primary">
              {tLevels(`${displayLevel}.reactionTime`)}
            </p>
          </div>
          <div className="bg-kp-bg-secondary rounded-lg p-3 border border-kp-border">
            <div className="flex items-center gap-2 text-kp-text-muted text-xs mb-1">
              <Shield className="w-3.5 h-3.5" />
              {t("sections.confirmation")}
            </div>
            <p className="text-sm text-kp-text-primary">
              {tLevels(`${displayLevel}.confirmationNeeded`)}
            </p>
          </div>
        </div>

        {/* More likely / Less likely */}
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-kp-success-bg border border-kp-success/30 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-kp-success mb-2 uppercase tracking-wide">
              {t("sections.moreLikely")}
            </h4>
            <ul className="space-y-1.5">
              {tLevels
                .raw(`${displayLevel}.moreLikely`)
                .map((item: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-kp-success flex items-start gap-2"
                  >
                    <span className="text-kp-success/70 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
            </ul>
          </div>

          <div className="bg-kp-bg-tertiary rounded-lg p-3 border border-kp-border">
            <h4 className="text-xs font-semibold text-kp-text-muted mb-2 uppercase tracking-wide">
              {t("sections.lessLikely")}
            </h4>
            <ul className="space-y-1.5">
              {tLevels
                .raw(`${displayLevel}.lessLikely`)
                .map((item: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-kp-text-secondary flex items-start gap-2"
                  >
                    <span className="text-kp-text-muted mt-0.5">×</span>
                    {item}
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Simple comparison */}
        <div className="bg-kp-bg-tertiary rounded-lg p-3 border border-kp-border">
          <div className="flex items-center gap-2 text-kp-text-muted text-xs mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {t("sections.comparison")}
          </div>
          <p className="text-sm text-kp-text-secondary">
            <strong className="text-kp-success">{tLevels("conservative.label")}</strong>
            {" = "}{t("sections.comparisonConservative")}{". "}
            <strong className="text-kp-warning">{tLevels("moderate.label")}</strong>
            {" = "}{t("sections.comparisonBalanced")}{". "}
            <strong className="text-kp-danger">{tLevels("aggressive.label")}</strong>
            {" = "}{t("sections.comparisonAggressive")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default AggressivitySlider;
