"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { SEMANTIC_COLORS } from "@/lib/design/tokens";
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
          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
          : "bg-blue-500/10 text-blue-400 border-blue-500/30",
        className,
      )}
      style={{
        color: isLive ? SEMANTIC_COLORS.live : SEMANTIC_COLORS.ai,
      }}
    >
      {isLive ? t("cockpit.mode.live") : t("cockpit.mode.paper")}
    </Badge>
  );
}
