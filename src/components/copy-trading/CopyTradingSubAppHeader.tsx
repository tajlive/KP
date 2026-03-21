"use client";

import { hrefWithLocale } from "@/i18n/href-with-locale";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export function CopyTradingSubAppHeader() {
  const locale = useLocale();
  const t = useTranslations("navigation");
  const dash = hrefWithLocale(locale, "/dashboard");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={dash}
          className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{t("myPage")}</span>
        </Link>
        <Link
          href={hrefWithLocale(locale, "/")}
          className="flex shrink-0 items-center gap-2"
        >
          <Image
            src="/logo.svg"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="hidden font-semibold text-white sm:inline">
            Klarpakke
          </span>
        </Link>
      </div>
    </header>
  );
}
