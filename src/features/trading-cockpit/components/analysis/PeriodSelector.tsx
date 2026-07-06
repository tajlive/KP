"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { CockpitFilters } from "@/features/trading-cockpit/types";

const PERIOD_OPTIONS: CockpitFilters["dateRange"][] = [
  "7d",
  "30d",
  "90d",
  "1y",
  "all",
];

interface PeriodSelectorProps {
  value: CockpitFilters["dateRange"];
  onChange: (value: CockpitFilters["dateRange"]) => void;
  className?: string;
}

export function PeriodSelector({
  value,
  onChange,
  className,
}: PeriodSelectorProps) {
  const t = useTranslations("trading");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-gray-400 hidden sm:inline">
        {t("cockpit.analysis.period.label")}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          data-testid="analysis-period-selector"
          className={cn(
            "bg-kp-bg-card border-kp-border text-sm text-white hover:border-white/[0.15] rounded-xl h-9 px-3 min-w-[140px]",
          )}
          aria-label={t("cockpit.analysis.period.label")}
        >
          <SelectValue placeholder={t("cockpit.analysis.period.label")} />
        </SelectTrigger>
        <SelectContent className="bg-[#161719] border-white/[0.08] text-white rounded-xl">
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem
              key={option}
              value={option}
              data-testid={`analysis-period-option-${option}`}
              className="text-sm text-white focus:bg-white/[0.08] focus:text-white cursor-pointer"
            >
              {t(`cockpit.analysis.period.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
