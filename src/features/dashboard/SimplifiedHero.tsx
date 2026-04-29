"use client";

import { BRAND } from "@/lib/design/tokens";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";

interface Props {
  balance: number;
  changePct: number;
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
  const isPaper = sessionMode === "paper";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-8 md:py-12 text-center"
    >
      {/* Session mode badge */}
      <div className="flex justify-center mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
            isPaper
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPaper ? "bg-blue-400" : "bg-emerald-400"
            }`}
          />
          {isPaper
            ? locale === "no"
              ? "Øvingsmodus"
              : "Paper Mode"
            : locale === "no"
              ? "Live-modus"
              : "Live Mode"}
        </span>
      </div>

      {/* Balance */}
      <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
        {new Intl.NumberFormat(locale === "no" ? "nb-NO" : "en-US", {
          style: "currency",
          currency: "NOK",
          maximumFractionDigits: 0,
        }).format(balance)}
      </div>

      {/* Change percent */}
      <div
        className={`text-base md:text-lg mt-2 font-medium ${
          changePct >= 0 ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {changePct > 0 ? "+" : ""}
        {changePct.toFixed(2)}%
        <span className="text-slate-500 text-sm ml-1 font-normal">
          {locale === "no" ? "siste endring" : "latest change"}
        </span>
      </div>

      {/* CTA */}
      <Link href={ctaLink ?? `/${locale}/dashboard/trade?mode=paper`}>
        <Button
          asChild
          className={`${BRAND.gradient} mt-5 px-8 py-5 text-base md:text-lg font-semibold rounded-xl`}
        >
          <span>{ctaText ?? (locale === "no" ? "Start trading" : "Start trading")}</span>
        </Button>
      </Link>
    </motion.div>
  );
}
