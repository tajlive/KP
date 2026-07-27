"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Ny HeroSection — aspirerende, ikke advarende.
 * Erstattar "Jeg tapte 64 000 kr" med positivt verdiforslag.
 * "Din personlige AI-trader. Våre beste brukere er opp 343%."
 *
 * ⚠️ PRE-LAUNCH: Tallet "+343%" må verifiserast mot
 * produksjonsdatabasen før lansering. Køyr:
 *   SELECT pct_return FROM leaderboard ORDER BY pct_return DESC LIMIT 1
 */

export default function HeroSection() {
  const t = useTranslations("landing");

  return (
    <section className="relative min-h-screen flex items-center bg-kp-bg-primary overflow-hidden">
      {/* Radial gradient — subtil blå glød øverst høgre */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,82,255,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full animate-fade-up">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Tekst-kolonne */}
          <div className="text-center lg:text-left space-y-6">
            <h1 className="font-display text-display-sm sm:text-display text-kp-text-primary tracking-tight">
              {t("hero.title")}
            </h1>
            <p className="text-body sm:text-body text-kp-text-secondary max-w-lg mx-auto lg:mx-0 animate-fade-in">
              {t("hero.subtitle")}
            </p>

            {/* CTA-knapper */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/no/register"
                className="animate-fade-up inline-flex items-center justify-center rounded-button bg-kp-brand px-8 py-4 text-kp-bg-primary font-bold shadow-lg shadow-kp-brand/20 hover:bg-kp-brand-dark transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                🚀 {t("hero.cta-primary")}
              </Link>
              <Link
                href="/no/jokertrade"
                className="animate-fade-up inline-flex items-center justify-center rounded-button border border-kp-border px-8 py-4 text-kp-text-primary font-bold hover:bg-kp-bg-hover transition-all duration-200"
                style={{ animationDelay: "0.2s" }}
              >
                🎭 {t("hero.cta-secondary")}
              </Link>
            </div>

            {/* Disclaimer */}
            <p className="text-caption text-kp-text-muted animate-fade-in">
              {t("hero.disclaimer")}
            </p>
          </div>

          {/* Høgre kolonne — MarketDataTeaser (placeholder) */}
          <div className="hidden lg:flex justify-center">
            <div className="border border-kp-border rounded-2xl bg-kp-bg-card p-6 w-full max-w-sm space-y-3 animate-float">
              <div className="text-center text-kp-text-muted text-caption">
                Live markedsdata
              </div>
              <div className="space-y-2">
                {[
                  { pair: "BTC", price: "65 446", change: "+1.49" },
                  { pair: "ETH", price: "1 970", change: "+4.47" },
                  { pair: "SOL", price: "77.01", change: "+2.96" },
                ].map((coin) => (
                  <div
                    key={coin.pair}
                    className="flex items-center justify-between py-1.5 border-b border-kp-border-light last:border-0"
                  >
                    <span className="text-kp-text-primary font-bold text-sm">
                      {coin.pair}
                    </span>
                    <div className="text-right">
                      <div className="text-kp-text-primary font-mono text-sm">
                        ${coin.price}
                      </div>
                      <div className="text-kp-success text-caption">
                        ▲ {coin.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center text-kp-text-muted text-[10px]">
                ● Oppdateres live
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
