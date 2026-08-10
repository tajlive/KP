import { useTranslations } from "next-intl";

/**
 * LofterSection — «Dette lover vi. Dette lover vi aldri.»
 * Kjerne-seksjonen i Variant C: ærlighet som differensiering.
 */
export default function LofterSection() {
  const t = useTranslations("landing.bevis.lofter");

  return (
    <section className="bg-kp-bg-primary py-12 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-center text-heading-sm font-black text-kp-text-primary sm:text-heading">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 mb-10 max-w-xl text-center text-body text-kp-text-secondary">
          {t("subtitle")}
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Lover */}
          <div className="rounded-3xl border-2 border-green-500/45 bg-green-500/[0.07] p-7 sm:p-8">
            <h3 className="mb-4 text-xl font-bold text-green-500">
              {t("jaTitle")} ✓
            </h3>
            <ul>
              {(["ja1", "ja2", "ja3", "ja4", "ja5"] as const).map((key) => (
                <li
                  key={key}
                  className="flex gap-3 border-b border-white/[0.06] py-2.5 text-base text-kp-text-primary last:border-b-0"
                >
                  <span className="shrink-0 font-extrabold text-green-500" aria-hidden>✓</span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          {/* Lover aldri */}
          <div className="rounded-3xl border-2 border-red-500/40 bg-red-500/[0.06] p-7 sm:p-8">
            <h3 className="mb-4 text-xl font-bold text-red-500">
              {t("neiTitle")} ✕
            </h3>
            <ul>
              {(["nei1", "nei2", "nei3", "nei4", "nei5"] as const).map((key) => (
                <li
                  key={key}
                  className="flex gap-3 border-b border-white/[0.06] py-2.5 text-base text-kp-text-primary last:border-b-0"
                >
                  <span className="shrink-0 font-extrabold text-red-500" aria-hidden>✕</span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
