"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function CTASection() {
  const t = useTranslations("landing.cta");
  const locale = useLocale();

  return (
    <section className="py-12 sm:py-20 bg-kp-bg-secondary border-t border-kp-border">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <h2 className="text-heading-sm sm:text-heading font-black text-kp-text-primary mb-4">
          {t("title")}
        </h2>
        <p className="text-body text-kp-text-secondary mb-8 max-w-lg mx-auto">
          {t("subtitle")}
        </p>

        <Link
          href={`/${locale}/register`}
          className="inline-flex min-h-[52px] items-center justify-center rounded-button bg-kp-brand px-10 py-4 text-white font-bold text-lg shadow-lg shadow-kp-brand/20 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-kp-brand-dark hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-kp-bg-primary"
        >
          {t("button")}
        </Link>

        <p className="text-sm text-kp-text-muted mt-4">
          {t("footer")}
        </p>
      </div>
    </section>
  );
}
