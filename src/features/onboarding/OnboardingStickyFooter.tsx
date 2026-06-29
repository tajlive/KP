"use client";

import { cn } from "@/lib/utils";

interface OnboardingStickyFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky action footer for onboarding steps.
 * On mobile it pins to the viewport bottom so the primary CTA is always
 * reachable without scrolling. On desktop it falls back to inline flow.
 */
export function OnboardingStickyFooter({
  children,
  className,
}: OnboardingStickyFooterProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-kp-bg-primary/95 backdrop-blur-md border-t border-kp-border p-4 md:relative md:z-auto md:bg-transparent md:backdrop-blur-none md:border-t-0 md:p-0",
        className,
      )}
    >
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  );
}
