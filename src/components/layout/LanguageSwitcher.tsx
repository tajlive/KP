"use client";

import {
  Locale,
  localeLabels,
  locales,
} from "@/i18n/config";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface LanguageSwitcherProps {
  variant?: "dropdown" | "buttons" | "minimal";
  className?: string;
}

export function LanguageSwitcher({
  variant = "dropdown",
  className,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("base");

  // Extract current path without locale prefix
  const currentPath = (pathname ?? "/").replace(/^\/(no|en|th|zh)/, "") || "/";

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Navigate to same page with new locale
    router.push(`/${newLocale}${currentPath}`);
    setIsOpen(false);
  };

  // Minimal variant (just current language button)
  if (variant === "minimal") {
    const currentLabel = localeLabels[locale as Locale];
    return (
      <button
        onClick={() => {
          // Cycle through visible locales only
          const currentIndex = locales.indexOf(
            locale as (typeof locales)[number],
          );
          const nextIndex = (currentIndex + 1) % locales.length;
          switchLocale(locales[nextIndex]);
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
          "bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors",
          className,
        )}
      >
        <span>{currentLabel.flag}</span>
        <span className="uppercase">{locale}</span>
      </button>
    );
  }

  // Buttons variant (all languages visible)
  if (variant === "buttons") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 bg-slate-800/50 rounded-lg p-1",
          className,
        )}
      >
        {locales.map((l) => {
          const isActive = l === locale;
          const label = localeLabels[l];
          const needReview = false; // TODO: Implement needsReview logic

          return (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700",
              )}
              title={needReview ? (locale === 'no' ? 'Oversettelse trenger gjennomgang' : 'Translation needs review') : undefined}
            >
              <span>{label.flag}</span>
              <span className="uppercase">{l}</span>
              {needReview && (
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          "bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors",
          isOpen && "bg-slate-700",
        )}
      >
        <Globe className="w-4 h-4" />
        <span>{localeLabels[locale as Locale].flag}</span>
        <span className="uppercase">{locale}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 py-2">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t("language") || "Language"}
            </div>
            {locales.map((l) => {
              const isActive = l === locale;
              const label = localeLabels[l];
              const needsReviewFlag = false; // TODO: Implement needsReview logic

              return (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-300 hover:bg-slate-800",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{label.flag}</span>
                    <div className="text-left">
                      <div className="font-medium">{label.label}</div>
                      <div className="text-xs text-slate-500 uppercase">
                        {l}
                      </div>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4" />}
                  {needsReviewFlag && !isActive && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
