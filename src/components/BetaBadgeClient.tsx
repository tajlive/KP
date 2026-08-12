"use client";

import { useTranslations } from "next-intl";

/**
 * BetaBadgeClient — «I BETA»-stempel for app-flater (client).
 * Tekstbasert, tilgjengelig navn «Klarpakke er i beta».
 */
export function BetaBadgeClient() {
  const t = useTranslations("betaUi");

  return (
    <span
      role="status"
      aria-label={t("badgeAria")}
      data-testid="beta-badge"
      className="inline-flex items-center rounded-full border border-kp-brand/40 bg-kp-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-kp-brand shrink-0"
    >
      {t("badge")}
    </span>
  );
}
