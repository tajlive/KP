"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";

/**
 * BetaPricingPage — /priser og /checkout viser samme informasjonsside
 * i beta: ingen priser, ingen kortfelt, ingen checkout-integrasjon.
 * P0 kundevendt (2026-08-12).
 *
 * CTA: «Start med lekepenger» → /register (uautentisert) eller /dashboard.
 */
export function BetaPricingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const t = useTranslations("betaUi");
  const locale = useLocale();

  const ctaHref = isLoggedIn
    ? hrefWithLocale(locale, "/dashboard")
    : hrefWithLocale(locale, "/register");

  return (
    <div
      data-testid="beta-pricing-page"
      className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center"
    >
      <span
        role="status"
        aria-label={t("badgeAria")}
        className="inline-flex items-center rounded-full border border-kp-brand/40 bg-kp-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-kp-brand"
      >
        {t("badge")}
      </span>

      <h1 className="text-3xl font-bold text-kp-text-primary">{t("infoTitle")}</h1>
      <p className="text-base text-kp-text-secondary">{t("infoText")}</p>

      {/* Sperret betalingsflate */}
      <section
        data-testid="beta-payments-section"
        aria-label={t("paymentsTitle")}
        className="w-full rounded-xl border border-kp-border bg-kp-surface-secondary p-6 text-left"
      >
        <h2 className="text-lg font-semibold text-kp-text-primary">
          {t("paymentsTitle")}
        </h2>
        <p className="mt-2 text-sm text-kp-text-secondary">{t("paymentsText")}</p>
      </section>

      {/* Sperret live-handel */}
      <section
        data-testid="beta-live-section"
        aria-label={t("liveTitle")}
        className="w-full rounded-xl border border-kp-border bg-kp-surface-secondary p-6 text-left"
      >
        <h2 className="text-lg font-semibold text-kp-text-primary">{t("liveTitle")}</h2>
        <p className="mt-2 text-sm text-kp-text-secondary">{t("liveText")}</p>
      </section>

      <Link
        href={ctaHref}
        data-testid="beta-cta"
        className="inline-flex items-center justify-center rounded-lg bg-kp-brand px-6 py-3 text-sm font-semibold text-white hover:bg-kp-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
