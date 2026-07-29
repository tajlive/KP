import Link from "next/link";
import { ShieldCheck, GraduationCap, LineChart } from "lucide-react";

export function AboutKlarpakkeSection({ locale }: { locale: string }) {
  const isEn = locale === "en";

  const privacyHref = `/${locale}/personvern`;
  const termsHref = `/${locale}/vilkar`;

  return (
    <section className="relative py-16 sm:py-24 bg-kp-bg-primary border-y border-kp-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-6">
          {isEn ? "About Klarpakke" : "Om Klarpakke"}
        </h2>

        <p className="text-lg text-kp-text-secondary leading-relaxed mb-8">
          {isEn
            ? "Klarpakke is a Norwegian platform for AI trading with play money. We help beginners and experienced traders learn how to trade safely on crypto exchanges through step-by-step courses, simulated paper trading, AI-powered market analysis, and automated trading tools — all in one place."
            : "Klarpakke er en norsk plattform for AI-trading med lekepenger. Vi hjelper nybegynnere og erfarne tradere med å lære trygg handel på kryptobørser gjennom steg-for-steg kurs, simulert papirhandel, AI-drevet markedsanalyse og automatiske tradingverktøy — alt på ett sted."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="flex flex-col items-center p-6 rounded-2xl bg-kp-surface border border-kp-border">
            <GraduationCap className="w-8 h-8 text-kp-brand mb-4" />
            <h3 className="font-semibold text-kp-text-primary mb-2">
              {isEn ? "Learn" : "Lær"}
            </h3>
            <p className="text-sm text-kp-text-secondary">
              {isEn
                ? "Structured courses from beginner to advanced"
                : "Strukturerte kurs fra nybegynner til avansert"}
            </p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-2xl bg-kp-surface border border-kp-border">
            <LineChart className="w-8 h-8 text-kp-brand mb-4" />
            <h3 className="font-semibold text-kp-text-primary mb-2">
              {isEn ? "Practice" : "Øv"}
            </h3>
            <p className="text-sm text-kp-text-secondary">
              {isEn
                ? "Risk-free paper trading with real market data"
                : "Risikofri papirhandel med reelle markedsdata"}
            </p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-2xl bg-kp-surface border border-kp-border">
            <ShieldCheck className="w-8 h-8 text-kp-brand mb-4" />
            <h3 className="font-semibold text-kp-text-primary mb-2">
              {isEn ? "Trade safely" : "Trade trygt"}
            </h3>
            <p className="text-sm text-kp-text-secondary">
              {isEn
                ? "AI analysis and automation with risk controls"
                : "AI-analyse og automasjon med risikokontroll"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-kp-text-tertiary">
          <Link
            href={privacyHref}
            className="underline hover:text-kp-text-primary transition-colors"
          >
            {isEn ? "Privacy Policy" : "Personvernerklæring"}
          </Link>
          <span>·</span>
          <Link
            href={termsHref}
            className="underline hover:text-kp-text-primary transition-colors"
          >
            {isEn ? "Terms of Service" : "Vilkår for bruk"}
          </Link>
        </div>
      </div>
    </section>
  );
}
