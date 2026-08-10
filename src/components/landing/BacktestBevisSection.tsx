import { useTranslations } from "next-intl";

/**
 * BacktestBevisSection — «Beviset: 90 dager med ekte data».
 *
 * FAKTA-REGELEN (⭐): Seksjonen rendres KUN når `resultat` har reelle data
 * fra backtest-motoren (mega-plan Oppgave 2.3). Uten data → null.
 * Det skal ALDRI hardkodes et tall her.
 */
interface Props {
  /** F.eks. «+2 340 kr» — fra backtest-API. null = seksjonen skjules helt. */
  resultat: string | null;
  /** Buy-and-hold i samme periode (den ærlige konteksten). Valgfri. */
  holdBelop?: string | null;
}

export default function BacktestBevisSection({ resultat, holdBelop }: Props) {
  const t = useTranslations("landing.bevis.backtest");

  if (!resultat) return null;

  return (
    <section className="bg-kp-bg-primary py-12 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-3xl bg-kp-bg-secondary p-8 text-center sm:p-12">
          <h2 className="text-heading-sm font-black text-kp-text-primary sm:text-heading">
            {t("title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-kp-text-secondary">
            {t("subtitle")}
          </p>

          <p className="mt-8 text-5xl font-extrabold tracking-tight text-green-500 sm:text-6xl">
            {resultat}
          </p>
          <p className="mx-auto mt-2 max-w-md text-base text-kp-text-muted">
            {t("label")}
          </p>
          {holdBelop && (
            <p className="mx-auto mt-3 max-w-md text-base text-kp-text-secondary">
              {t("holdLabel")}: <span className="font-bold">{holdBelop}</span>
            </p>
          )}

          <div className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-kp-border bg-kp-bg-primary p-5"
              >
                <p className="mb-1 font-bold text-kp-text-primary">
                  {t(`m${n}Title`)}
                </p>
                <p className="text-sm text-kp-text-muted">{t(`m${n}Desc`)}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm italic text-kp-text-muted">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </section>
  );
}
