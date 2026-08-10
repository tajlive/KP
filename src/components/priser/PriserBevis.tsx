"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

/**
 * PriserBevis — /priser (mega-plan Oppgave 1.3).
 *
 * Priser LÅST av Tom 2026-08-10: Student gratis · Pro 399 kr/mnd ·
 * Pro+ 799 kr/mnd · årspris = 2 mnd gratis (3 990 / 7 990).
 *
 * Automatisk innhold (Toms direktiv — null manuelt vedlikehold):
 * - tickerSlot: LiveMarketTicker (ekte sanntidspriser fra coin_prices)
 * - Founder-telling: /api/stats/users (ekte DB-telling, ærlig etikett)
 * Tom 2026-08-10: Ingen «lønner det seg»-utregning på denne siden.
 */

// Låste priser (endring krever Tom-beslutning + Stripe-jobb i Hermes-sone)
const PRISER = {
  pro: { mnd: 399, aar: 3990 },
  propluss: { mnd: 799, aar: 7990 },
} as const;

const fmtKr = (n: number) => n.toLocaleString("no-NO");

interface TierDef {
  id: "student" | "pro" | "propluss";
  featureKeys: string[];
  popular?: boolean;
}

const TIERER: TierDef[] = [
  { id: "student", featureKeys: ["studentF1", "studentF2", "studentF3", "studentF4"] },
  {
    id: "pro",
    featureKeys: ["proF1", "proF2", "proF3", "proF4", "proF5"],
    popular: true,
  },
  {
    id: "propluss",
    featureKeys: ["proplussF1", "proplussF2", "proplussF3", "proplussF4"],
  },
];

interface Props {
  /** Server-komponent (LiveMarketTicker) — ekte sanntidspriser */
  tickerSlot?: ReactNode;
}

export default function PriserBevis({ tickerSlot }: Props) {
  const t = useTranslations("priserBevis");
  const locale = useLocale();
  const [aarlig, setAarlig] = useState(false);
  const [registrerte, setRegistrerte] = useState<number | null>(null);

  // Ekte DB-telling (API-et er designet ærlig: ingen fabrikkert fallback)
  useEffect(() => {
    let aktiv = true;
    fetch("/api/stats/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (aktiv && data && typeof data.count === "number") {
          setRegistrerte(data.count);
        }
      })
      .catch(() => {
        // Ingen tall vises — heller ingenting enn fabrikkert
      });
    return () => {
      aktiv = false;
    };
  }, []);

  return (
    <div className="bg-kp-bg-primary text-kp-text-primary">
      {/* HERO */}
      <section className="mx-auto max-w-3xl px-4 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="mb-5 inline-flex items-center rounded-badge border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300">
          {t("badge")}
        </p>
        <h1 className="text-display-sm font-extrabold tracking-tight text-balance sm:text-display">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body text-kp-text-secondary">
          {t("subtitle")}
        </p>

        {/* Måned/år-toggle */}
        <div className="mt-8 inline-flex items-center rounded-2xl border border-kp-border bg-kp-bg-secondary p-1.5">
          <button
            type="button"
            onClick={() => setAarlig(false)}
            className={`min-h-[48px] rounded-xl px-6 text-base font-bold transition-colors ${
              !aarlig ? "bg-kp-brand text-white" : "text-kp-text-secondary"
            }`}
          >
            {t("toggleMonthly")}
          </button>
          <button
            type="button"
            aria-label="toggleAnnual"
            onClick={() => setAarlig(true)}
            className={`min-h-[48px] rounded-xl px-6 text-base font-bold transition-colors ${
              aarlig ? "bg-kp-brand text-white" : "text-kp-text-secondary"
            }`}
          >
            {t("toggleAnnual")}
            <span className="ml-2 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-500">
              {t("annualSave")}
            </span>
          </button>
        </div>
      </section>

      {/* EKTE MARKEDSDATA (automatisk — LiveMarketTicker fra coin_prices) */}
      {tickerSlot && (
        <section className="mx-auto max-w-5xl px-4 pb-2 sm:px-6">
          <p className="mb-3 text-center text-sm text-kp-text-muted">
            {t("tickerCaption")}
          </p>
          {tickerSlot}
        </section>
      )}

      {/* TIER-KORT */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {TIERER.map((tier) => {
            const erGratis = tier.id === "student";
            const pris = erGratis
              ? "0"
              : aarlig
                ? fmtKr(tier.id === "pro" ? PRISER.pro.aar : PRISER.propluss.aar)
                : String(tier.id === "pro" ? PRISER.pro.mnd : PRISER.propluss.mnd);
            return (
              <div
                key={tier.id}
                data-testid={`tier-${tier.id}`}
                className={`relative flex flex-col rounded-3xl border-2 bg-kp-bg-secondary p-7 ${
                  tier.popular
                    ? "border-kp-brand shadow-xl shadow-kp-brand/20 md:-my-3 md:py-10"
                    : "border-kp-border"
                }`}
              >
                {tier.popular && (
                  <p className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-kp-brand px-4 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                    {t("mostPopular")}
                  </p>
                )}

                <h2 className="text-2xl font-extrabold">
                  {t(`tier${tier.id === "propluss" ? "Propluss" : tier.id === "pro" ? "Pro" : "Student"}Name`)}
                </h2>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span
                    data-testid={`pris-${tier.id}`}
                    className="text-5xl font-extrabold tracking-tight tabular-nums"
                  >
                    {pris}
                  </span>
                  <span className="text-lg text-kp-text-muted">kr</span>
                  <span className="text-sm text-kp-text-muted">
                    {erGratis ? "" : aarlig ? t("perYear") : t("perMonth")}
                  </span>
                </div>
                {erGratis && (
                  <p className="mt-1 text-sm font-bold text-green-500">
                    {t("freeBadge")}
                  </p>
                )}
                {aarlig && !erGratis && (
                  <p className="mt-1 text-sm text-kp-text-muted">
                    {t("perYearNote")}
                  </p>
                )}

                <ul className="mt-6 grow space-y-3">
                  {tier.featureKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2.5 text-base text-kp-text-secondary">
                      <span
                        className={`mt-0.5 shrink-0 font-extrabold ${tier.popular ? "text-kp-brand-light" : "text-green-500"}`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      {t(key)}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${locale}/register`}
                  className={`mt-7 inline-flex min-h-[56px] items-center justify-center rounded-2xl px-6 text-lg font-extrabold transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light ${
                    tier.popular
                      ? "bg-kp-brand text-white hover:bg-kp-brand-dark"
                      : "border border-kp-border bg-kp-bg-primary text-kp-text-primary hover:border-kp-brand-light"
                  }`}
                >
                  {erGratis ? t("studentCta") : t("paidCta")}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-kp-text-muted">
          {t("betaNote")}
        </p>
      </section>

      {/* FOUNDER-LOVEN + live telling (automatisk fra /api/stats/users) */}
      <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <div className="rounded-3xl border border-kp-border bg-[linear-gradient(135deg,rgba(0,82,255,0.18),rgba(34,197,94,0.12))] p-8 text-center sm:p-10">
          <h2 className="text-heading-sm font-black sm:text-heading">
            {t("founderTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-kp-text-secondary">
            {t("founderText")}
          </p>
          {registrerte !== null && (
            <p className="mt-4 text-sm font-semibold text-kp-text-primary">
              <span data-testid="founder-count" className="text-green-500">
                {registrerte}
              </span>{" "}
              {t("founderRegistered")}
            </p>
          )}
          <Link
            href={`/${locale}/register`}
            className="mt-6 inline-flex min-h-[60px] items-center justify-center rounded-2xl bg-green-500 px-10 py-4 text-lg font-extrabold text-[#06280f] shadow-lg shadow-green-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:bg-green-600 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            {t("studentCta")} →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="mb-8 text-center text-heading-sm font-black sm:text-heading">
          {t("faqTitle")}
        </h2>
        <div className="space-y-3">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <details
              key={n}
              className="group overflow-hidden rounded-2xl border border-kp-border bg-kp-bg-secondary"
            >
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-lg font-bold text-kp-text-primary [&::-webkit-details-marker]:hidden">
                {t(`faqQ${n}`)}
                <span
                  className="shrink-0 text-2xl text-kp-brand-light transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-base text-kp-text-secondary">
                {t(`faqA${n}`)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
