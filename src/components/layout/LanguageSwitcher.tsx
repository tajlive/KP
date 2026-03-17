"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "buttons" | "select";
  className?: string;
}

export function LanguageSwitcher({ variant = "buttons", className }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const changeLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  const visibleLocales = locales.filter((l) => !localeLabels[l].hidden);

  if (variant === "buttons") {
    return (
      <div className={cn("flex gap-1", className)} role="group" aria-label="Switch language">
        {visibleLocales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => changeLocale(l)}
            disabled={isPending}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
              l === locale
                ? "bg-[#0052FF] text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={locale}
      onChange={(e) => changeLocale(e.target.value as Locale)}
      disabled={isPending}
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-2 py-1",
        className
      )}
      aria-label="Switch language"
    >
      {visibleLocales.map((l) => (
        <option key={l} value={l}>
          {localeLabels[l].label}
        </option>
      ))}
    </select>
  );
}
