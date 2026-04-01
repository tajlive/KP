"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/AuthContext";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { HERO } from "@/lib/design/tokens";

type HeroPrimaryActionsProps = { locale?: string };

export function HeroPrimaryActions({
  locale: localeProp,
}: HeroPrimaryActionsProps) {
  const hookLocale = useLocale();
  const locale = localeProp ?? hookLocale;
  const t = useTranslations("landing.modernHero");
  const { user } = useAuth();

  const signupHref = hrefWithLocale(locale, "/register");
  const paperHref = hrefWithLocale(locale, "/paper");
  const dashboardHref = hrefWithLocale(locale, "/dashboard");

  if (user) {
    return (
      <>
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <Link
            href={dashboardHref}
            aria-label={t("loggedInCtaPrimary")}
            className={`group ${HERO.ctaPrimary} flex items-center justify-center gap-2`}
          >
            {t("loggedInCtaPrimary")}
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>

          <Link
            href={paperHref}
            aria-label={t("loggedInCtaSecondary")}
            className={`${HERO.ctaSecondary} flex items-center justify-center gap-2`}
          >
            {t("loggedInCtaSecondary")}
          </Link>
        </div>

        <p className="mt-6 text-sm sm:text-base text-blue-100/90 text-center lg:text-left max-w-xl leading-relaxed">
          {t("loggedInCtaMicrocopy")}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
        <Link
          href={signupHref}
          aria-label={t("ctaPrimary")}
          data-testid="hero-cta-signup"
          className={`group ${HERO.ctaPrimary} flex items-center justify-center gap-2`}
        >
          {t("ctaPrimary")}
          <svg
            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={paperHref}
          aria-label={t("ctaSecondary")}
          data-testid="hero-cta-secondary"
          className={`${HERO.ctaSecondary} flex items-center justify-center gap-2`}
        >
          {t("ctaSecondary")}
        </Link>
      </div>

      <p className="mt-6 text-sm sm:text-base text-blue-100/90 text-center lg:text-left max-w-xl leading-relaxed">
        {t("ctaMicrocopy")}
      </p>
    </>
  );
}
