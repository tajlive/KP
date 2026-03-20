"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useId, useTransition } from "react";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { SlidingSegmentedControl } from "@/components/ui/SlidingSegmentedControl";

interface LanguageSwitcherProps {
  /** @deprecated Bruk slide-kontroll; beholdt for bakoverkompatibilitet */
  variant?: "slide" | "select";
  className?: string;
  /** Unik layoutId hvis flere instanser på samme view */
  layoutId?: string;
  "aria-label"?: string;
}

export function LanguageSwitcher({
  variant = "slide",
  className,
  layoutId,
  "aria-label": ariaLabel,
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const reactId = useId();
  const resolvedLayoutId =
    layoutId ?? `lang-segment-${reactId.replace(/:/g, "")}`;

  const changeLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
      router.refresh();
    });
  };

  const visibleLocales = locales.filter((l) => !localeLabels[l].hidden);

  if (variant === "select") {
    return (
      <select
        value={locale}
        onChange={(e) => changeLocale(e.target.value as Locale)}
        disabled={isPending}
        className={cn(
          "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2",
          className,
        )}
        aria-label={ariaLabel ?? "Switch language"}
      >
        {visibleLocales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l].label}
          </option>
        ))}
      </select>
    );
  }

  const options = visibleLocales.map((l) => ({
    value: l,
    label: l.toUpperCase(),
  }));

  return (
    <SlidingSegmentedControl
      options={options}
      value={locale}
      onChange={changeLocale}
      layoutId={resolvedLayoutId}
      variant="light"
      disabled={isPending}
      className={className}
      aria-label={ariaLabel ?? "Switch language"}
    />
  );
}
