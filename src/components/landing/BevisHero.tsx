import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * BevisHero — Variant C «Beviset» hero (Tom-valgt 2026-08-10).
 * Radikal åpenhet: «Vi viser deg regnestykket før du stoler på oss.»
 * Server-komponent (next-intl hooks støttes i RSC). Grønn CTA = design-valgt.
 */
export default function BevisHero() {
  const t = useTranslations("landing.bevis.hero");
  const locale = useLocale();

  return (
    <section className="relative overflow-hidden bg-kp-bg-primary">
      {/* Subtil grønn glød øverst — bevis/positivt-fokus */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.07),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="mb-6 inline-flex items-center rounded-badge border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
          {t("badge")}
        </p>

        <h1 className="text-display-sm font-extrabold tracking-tight text-balance text-kp-text-primary sm:text-display">
          {t("title")}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-body text-kp-text-secondary">
          {t("subtitle")}
        </p>

        <div className="mt-9">
          <Link
            href={`/${locale}/register`}
            className="inline-flex min-h-[64px] items-center justify-center rounded-2xl bg-green-500 px-12 py-5 text-xl font-extrabold text-[#06280f] shadow-lg shadow-green-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:bg-green-600 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-kp-bg-primary"
          >
            {t("cta")} →
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-kp-text-muted">
          {(["trust1", "trust2", "trust3", "trust4"] as const).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <span className="font-bold text-green-500" aria-hidden>✓</span>
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
