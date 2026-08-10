"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * KursPilot — «Pilot-løpet»: 4 moduler som lærer deg nøyaktig det du trenger.
 * Variant C-design (mega-plan Oppgave 1.2, 2026-08-10).
 *
 * Fremdrift lagres i localStorage (ærlig selv-sporing — ingen fabrikkert
 * server-progresjon). Eksisterende leksjonsruter under /kurs/[slug] lever videre.
 */

const STORAGE_KEY = "klarpakke-kurs-fullfort";

interface Modul {
  id: string;
  tagKey: string;
  titleKey: string;
  textKeys: string[];
  /** Valgfri videre-lenke til eksisterende leksjonsrute */
  linkHref?: string;
}

const MODULER: Modul[] = [
  {
    id: "mod1",
    tagKey: "mod1Tag",
    titleKey: "mod1Title",
    textKeys: ["mod1t1", "mod1t2"],
    linkHref: "/kurs/grunnleggende",
  },
  {
    id: "mod2",
    tagKey: "mod2Tag",
    titleKey: "mod2Title",
    textKeys: ["mod2t1", "mod2t2"],
    linkHref: "/kurs/strategi",
  },
  {
    id: "mod3",
    tagKey: "mod3Tag",
    titleKey: "mod3Title",
    textKeys: ["mod3t1", "mod3t2"],
  },
  {
    id: "mod4",
    tagKey: "mod4Tag",
    titleKey: "mod4Title",
    textKeys: ["mod4t1", "mod4t2"],
  },
];

function lesLagret(): string[] {
  try {
    const rå = localStorage.getItem(STORAGE_KEY);
    if (!rå) return [];
    const parset = JSON.parse(rå);
    return Array.isArray(parset) ? parset.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function KursPilot() {
  const t = useTranslations("kursPilot");
  const locale = useLocale();
  const [fullfort, setFullfort] = useState<string[]>([]);
  const [lastet, setLastet] = useState(false);

  // Les lagret fremdrift etter mount (unngår hydration-mismatch)
  useEffect(() => {
    setFullfort(lesLagret());
    setLastet(true);
  }, []);

  function toggle(id: string) {
    setFullfort((prev) => {
      const neste = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(neste));
      } catch {
        // localStorage utilgjengelig (privat modus) — fremdrift lever kun i state
      }
      return neste;
    });
  }

  const antall = fullfort.length;

  return (
    <div className="bg-kp-bg-primary">
      {/* HERO + fremdrift */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,82,255,0.10),transparent_55%)]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="mb-5 inline-flex items-center rounded-badge border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300">
            🎓 {t("badge")}
          </p>
          <h1 className="text-display-sm font-extrabold tracking-tight text-balance text-kp-text-primary sm:text-display">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-body text-kp-text-secondary">
            {t("subtitle")}
          </p>

          {/* Fremdriftsindikator */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-kp-text-primary">
                <span data-testid="fremdrift-teller">{lastet ? antall : 0}/4</span>
              </span>
              <span className="text-kp-text-muted">{t("progressSuffix")}</span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-kp-bg-secondary"
              role="progressbar"
              aria-label={t("progressSuffix")}
              aria-valuenow={antall}
              aria-valuemin={0}
              aria-valuemax={4}
            >
              <div
                className="h-full rounded-full bg-green-500 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${(lastet ? antall : 0) * 25}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* MODULER */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="space-y-5">
          {MODULER.map((modul, indeks) => {
            const erFullfort = fullfort.includes(modul.id);
            return (
              <details
                key={modul.id}
                className={`group overflow-hidden rounded-3xl border-2 bg-kp-bg-secondary transition-colors ${
                  erFullfort ? "border-green-500/50" : "border-kp-border"
                }`}
              >
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${
                      erFullfort
                        ? "bg-green-500 text-[#06280f]"
                        : "bg-kp-brand text-white"
                    }`}
                    aria-hidden
                  >
                    {erFullfort ? "✓" : indeks + 1}
                  </span>
                  <span className="grow">
                    <span className="block text-xs font-bold uppercase tracking-wider text-kp-text-muted">
                      {t(modul.tagKey)}
                    </span>
                    <span className="block text-xl font-bold text-kp-text-primary">
                      {t(modul.titleKey)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-2xl text-kp-brand-light transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>

                <div className="px-6 pb-6">
                  {/* Video-plassholder — ærlig tilstand til videoene er laget */}
                  <div
                    data-testid="video-slot"
                    className="mb-5 flex aspect-video items-center justify-center rounded-2xl border border-dashed border-kp-border bg-kp-bg-primary"
                  >
                    <p className="flex items-center gap-2 px-4 text-center text-sm text-kp-text-muted">
                      <span aria-hidden className="text-2xl">▶️</span>
                      {t("videoSoon")}
                    </p>
                  </div>

                  {modul.textKeys.map((key) => (
                    <p
                      key={key}
                      className="mb-4 text-base leading-relaxed text-kp-text-secondary"
                    >
                      {t(key)}
                    </p>
                  ))}

                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => toggle(modul.id)}
                      className={`inline-flex min-h-[52px] items-center justify-center rounded-2xl px-6 text-base font-bold transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 ${
                        erFullfort
                          ? "bg-green-500/15 text-green-500 border border-green-500/40"
                          : "bg-green-500 text-[#06280f] hover:bg-green-600"
                      }`}
                    >
                      {erFullfort ? t("markUndone") : t("markDone")}
                    </button>

                    {modul.linkHref && (
                      <Link
                        href={`/${locale}${modul.linkHref}`}
                        className="text-sm font-semibold text-kp-brand-light underline-offset-4 hover:underline"
                      >
                        {t("learnMore")}
                      </Link>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl border border-kp-border bg-[linear-gradient(135deg,rgba(0,82,255,0.18),rgba(34,197,94,0.12))] p-8 text-center sm:p-10">
          <h2 className="text-heading-sm font-black text-kp-text-primary">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body text-kp-text-secondary">
            {t("ctaText")}
          </p>
          <Link
            href={`/${locale}/register`}
            className="mt-6 inline-flex min-h-[60px] items-center justify-center rounded-2xl bg-green-500 px-10 py-4 text-lg font-extrabold text-[#06280f] shadow-lg shadow-green-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:bg-green-600 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            {t("ctaButton")} →
          </Link>
        </div>
      </section>
    </div>
  );
}
