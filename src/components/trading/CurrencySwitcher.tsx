"use client";

import { useId } from "react";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";
import { SlidingSegmentedControl } from "@/components/ui/SlidingSegmentedControl";
import { cn } from "@/lib/utils";

interface CurrencySwitcherProps {
  variant?: "light" | "dark";
  /** Unik på sider med flere valutakontroller */
  layoutId?: string;
  className?: string;
  "aria-label"?: string;
}

export function CurrencySwitcher({
  variant = "dark",
  layoutId,
  className,
  "aria-label": ariaLabel,
}: CurrencySwitcherProps) {
  const { currency, setCurrency } = useCurrency();
  const reactId = useId();
  const resolvedLayoutId =
    layoutId ?? `currency-segment-${reactId.replace(/:/g, "")}`;

  const options = CURRENCIES.map((c: Currency) => ({
    value: c,
    label: CURRENCY_LABELS[c],
  }));

  return (
    <SlidingSegmentedControl
      options={options}
      value={currency}
      onChange={setCurrency}
      layoutId={resolvedLayoutId}
      variant={variant}
      className={cn(variant === "dark" && "h-8 min-h-8", className)}
      aria-label={ariaLabel ?? "Display currency"}
    />
  );
}
