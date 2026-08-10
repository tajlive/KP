import { useTranslations } from "next-intl";

/**
 * SlikVirkerDetSection — 3 steg, mormor-tempo. Null innstillinger.
 */
export default function SlikVirkerDetSection() {
  const t = useTranslations("landing.bevis.steg");

  return (
    <section className="bg-kp-bg-primary py-12 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-center text-heading-sm font-black text-kp-text-primary sm:text-heading">
          {t("title")}
        </h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-kp-border bg-kp-bg-secondary p-7 sm:p-8"
            >
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-kp-brand text-2xl font-extrabold text-white"
                aria-hidden
              >
                {n}
              </div>
              <h3 className="mb-2 text-xl font-bold text-kp-text-primary">
                {t(`s${n}Title`)}
              </h3>
              <p className="text-base text-kp-text-secondary">{t(`s${n}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
