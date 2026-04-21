"use client";

import { hrefWithLocale } from "@/i18n/href-with-locale";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CopyTradingSubAppHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const tNav = useTranslations("navigation");
  const tCopy = useTranslations("copyTrading.nav");
  const dash = hrefWithLocale(locale, "/dashboard");
  const copyBase = hrefWithLocale(locale, "/copy-trading");
  const copyDiscover = hrefWithLocale(locale, "/copy-trading/discover");

  const onMine = pathname.includes("/copy-trading/discover") === false;
  const onDiscover = pathname.includes("/copy-trading/discover");

  const tabClass = (active: boolean) =>
    cn(
      "min-h-[44px] flex items-center justify-center rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
      active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={dash}
            className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{tNav("myPage")}</span>
          </Link>
          <nav
            className="hidden items-center gap-1 rounded-xl border border-white/10 bg-slate-900/50 p-0.5 sm:flex"
            aria-label="Copy trading"
          >
            <Link href={copyBase} className={tabClass(onMine)}>
              {tCopy("mine")}
            </Link>
            <Link href={copyDiscover} className={tabClass(onDiscover)}>
              {tCopy("discover")}
            </Link>
          </nav>
        </div>
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
      <div className="mx-auto flex max-w-6xl gap-2 border-t border-white/5 px-4 py-2 sm:hidden">
        <Link
          href={copyBase}
          className={cn(tabClass(onMine), "flex-1 text-center")}
        >
          {tCopy("mine")}
        </Link>
        <Link
          href={copyDiscover}
          className={cn(tabClass(onDiscover), "flex-1 text-center")}
        >
          {tCopy("discover")}
        </Link>
      </div>
    </header>
  );
}
