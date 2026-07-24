"use client";

import { BRAND } from "@/lib/design/tokens";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { m } from "framer-motion";

import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";

interface Props {
  balance?: number | null;
  changePct?: number | null;
  ctaText?: string;
  ctaLink?: string;
  sessionMode?: "paper" | "live";
}

export function SimplifiedHero({
  balance,
  changePct,
  ctaText,
  ctaLink,
  sessionMode = "paper",
}: Props) {
  const locale = useLocale();
  const t = useTranslations("dashboard.hero");
  const isPaper = sessionMode === "paper";
  const href = ctaLink ?? `/${locale}/trade?mode=${isPaper ? "paper" : "live"}`;

  return (
    <m.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative py-8 md:py-12 text-center"
    >
      {/* Background glow — subtle radial gradient */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] rounded-full blur-[100px] opacity-20 ${
            isPaper ? "bg-blue-500" : "bg-emerald-500"
          }`}
        />
      </div>

      {/* Mode vises allerede i top-bar og toggle — ingen tredje pill her */}

      {/* Balance — animated counter or no-data dash */}
      <m.div
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight tabular-nums"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {balance == null ? (
          <span>{t("noData")}</span>
        ) : (
          <AnimatedNumber
            value={balance}
            duration={600}
            decimals={0}
            suffix=" kr"
          />
        )}
      </m.div>

      {/* Change percent */}
      <m.div
        className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-sm sm:text-base font-semibold tabular-nums ${
          changePct == null
            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            : changePct >= 0
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        }`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        {changePct == null ? (
          <span>{t("noData")}</span>
        ) : (
          <>
            {changePct > 0 ? "↑" : changePct < 0 ? "↓" : "→"}
            {changePct > 0 ? "+" : ""}
            {changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "0.00%"}
          </>
        )}
        <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal ml-0.5">
          {t("latestChange")}
        </span>
      </m.div>

      {/* CTA */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <Link href={href}>
          <Button
            asChild
            className={`${BRAND.gradient} mt-6 px-8 py-5 text-base md:text-lg font-semibold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
          >
            <span>
              {ctaText ?? (isPaper ? t("ctaPaper") : t("ctaLive"))}
            </span>
          </Button>
        </Link>
      </m.div>
    </m.div>
  );
}
