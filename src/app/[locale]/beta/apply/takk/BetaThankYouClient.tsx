"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function BetaThankYouClient({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const email = searchParams?.get("email");

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-8 md:p-12 text-center">
          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            BETA
          </div>

          {/* Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {locale === "en" ? "🎉 Welcome to Beta!" : "🎉 Velkommen til Beta!"}
          </h1>

          <p className="text-lg text-slate-400 mb-8">
            {locale === "en"
              ? "You now have beta access to Klarpakke University."
              : "Du har nå beta-tilgang til Klarpakke Universitet."}
          </p>

          {/* Email Confirmation */}
          {email && (
            <div className="mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">
                {locale === "en"
                  ? "Confirmation sent to:"
                  : "Bekreftelse sendt til:"}
              </p>
              <p className="text-lg font-semibold text-blue-400">
                {decodeURIComponent(email)}
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="mb-8 space-y-4 text-left">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              {locale === "en" ? "📋 Next steps:" : "📋 Neste steg:"}
            </h2>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-blue-400 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {locale === "en"
                      ? "Explore Paper Trading"
                      : "Utforsk lekepenger"}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {locale === "en"
                      ? "Practice with 1M virtual money"
                      : "Øv deg med 1M lekepenger"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {locale === "en" ? "Choose Your Plan" : "Velg Din Plan"}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {locale === "en"
                      ? "Upgrade to unlock all courses and auto-trading"
                      : "Oppgrader for å få tilgang til alle kurs og auto-trading"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <span className="text-green-400 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {locale === "en" ? "Start Learning" : "Start Læringen"}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {locale === "en"
                      ? "Complete courses and earn certificates"
                      : "Fullfør kurs og tjen sertifikater"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary CTA - See Plans */}
          <div className="mb-6">
            <Button
              size="lg"
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-6 text-lg font-semibold rounded-xl shadow-lg shadow-blue-600/20"
              asChild
            >
              <Link href={`/${locale}/priser`}>
                <GraduationCap className="w-5 h-5 mr-2" />
                {locale === "en" ? "See Our Plans" : "Se Våre Planer"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Secondary CTA - Dashboard */}
          <div className="mb-8">
            <Button
              variant="outline"
              size="lg"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 py-6 text-lg rounded-xl"
              asChild
            >
              <Link href={`/${locale}/dashboard`}>
                {locale === "en" ? "Go to Dashboard" : "Gå til Dashboard"}
              </Link>
            </Button>
          </div>

          {/* Important Info */}
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">
              <strong>⚠️ {locale === "en" ? "Important:" : "Viktig:"}</strong>{" "}
              {locale === "en"
                ? "Trading involves real risk. Only invest what you can afford to lose. Klarpakke is a learning tool, not financial advice."
                : "Trading innebærer reell risiko. Invester kun det du har råd til å tape. Klarpakke er et læringsverktøy, ikke finansiell rådgivning."}
            </p>
          </div>

          {/* Back to home */}
          <Link
            href={`/${locale}`}
            className="text-slate-500 hover:text-slate-400 transition-colors"
          >
            {locale === "en" ? "← Back to home" : "← Tilbake til forsiden"}
          </Link>

          {/* Contact Support */}
          <div className="mt-8 pt-8 border-t border-slate-800">
            <p className="text-sm text-slate-500 mb-2">
              {locale === "en"
                ? "Questions? We're happy to help!"
                : "Spørsmål? Vi hjelper gjerne!"}
            </p>
            <a
              href="mailto:post@klarpakke.no"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
            >
              {locale === "en" ? "Contact us →" : "Kontakt oss →"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
