"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { useParams } from "next/navigation";

/**
 * Banner som fremhever månedens konkurranse og 50 000 KLT premie.
 * Brukes på paper-trading og kan brukes på dashboard.
 */
export function MonthlyCompetitionBanner() {
  const t = useTranslations("gamification");
  const locale = (useParams()?.locale as string) ?? "no";

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(
    0,
    Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Link
      href={`/${locale}/leaderboard`}
      className="flex items-center justify-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 hover:bg-amber-500/15 transition-colors"
    >
      <Trophy className="w-5 h-5 text-amber-400 shrink-0" aria-hidden />
      <span className="text-sm font-medium">
        {t("monthlyPrize")} — {t("monthlyCompetitionOngoing")}
        {daysLeft > 0 && (
          <span className="ml-1 text-amber-300/90">
            ({daysLeft} {t("daysLeft")})
          </span>
        )}
      </span>
    </Link>
  );
}
