"use client";

import { useTranslations } from "next-intl";

/**
 * BetaInfoBanner — gjenbrukbart banner rett under headeren for innloggede
 * kunder. Forklarer lekepenger, ingen betaling og ingen kundetilgjengelig
 * live-handel. P0 kundevendt (2026-08-12).
 */
export function BetaInfoBanner() {
  const t = useTranslations("betaUi");

  return (
    <div
      data-testid="beta-info-banner"
      role="note"
      className="w-full bg-kp-brand/10 border-b border-kp-brand/20 px-4 py-2.5"
    >
      <p className="mx-auto max-w-6xl text-center text-sm text-kp-text-primary">
        <span className="font-semibold">{t("bannerTitle")}.</span>{" "}
        {t("bannerText")}
      </p>
    </div>
  );
}
