import { useTranslations } from "next-intl";

/**
 * LandingFaq — 5 spørsmål, native <details> (fungerer uten JS — viktig
 * for edge-runtime og eldre enheter). Korte svar, ingen småskrift.
 */
export default function LandingFaq() {
  const t = useTranslations("landing.bevis.faq");

  return (
    <section className="bg-kp-bg-primary py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-heading-sm font-black text-kp-text-primary sm:text-heading">
          {t("title")}
        </h2>

        <div className="space-y-3">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <details
              key={n}
              className="group overflow-hidden rounded-2xl border border-kp-border bg-kp-bg-secondary"
            >
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-lg font-bold text-kp-text-primary [&::-webkit-details-marker]:hidden">
                {t(`q${n}`)}
                <span
                  className="shrink-0 text-2xl text-kp-brand-light transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-base text-kp-text-secondary">
                {t(`a${n}`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
