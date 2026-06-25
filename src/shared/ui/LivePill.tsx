"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface LivePillProps {
  className?: string;
}

export function LivePill({ className }: LivePillProps) {
  const t = useTranslations("components.livePill");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-[var(--kp-live)]/10 text-[var(--kp-live)]",
        className,
      )}
    >
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--kp-live)] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--kp-live)]" />
      </span>
      {t("label")}
    </span>
  );
}
