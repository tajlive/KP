"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import type { CockpitMode } from "@/features/trading-cockpit/types";

interface ModeBadgeProps {
  mode: CockpitMode;
  className?: string;
}

export function ModeBadge({ mode, className }: ModeBadgeProps) {
  const t = useTranslations("trading");

  const isLive = mode === "live";

  return (
    <Badge
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold border",
        isLive
          ? "bg-kp-danger/10 text-kp-danger border-kp-danger/30"
          : "bg-kp-brand/10 text-kp-brand border-kp-brand/30",
        className,
      )}
    >
      {isLive ? t("cockpit.mode.live") : t("cockpit.mode.paper")}
    </Badge>
  );
}
