import { getTranslations } from "next-intl/server";

/**
 * BetaBadge — «I BETA»-stempel for global header og app-flater.
 *
 * P0 kundevendt beta-stempel (2026-08-12): tekstbasert (ikke kun farge/ikon),
 * tilgjengelig navn «Klarpakke er i beta».
 */
export async function BetaBadge({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "betaUi" });

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
