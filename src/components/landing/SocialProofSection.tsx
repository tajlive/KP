"use client";

import {
  Award,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function SocialProofSection() {
  const router = useRouter();
  const locale = useLocale();

  const stats = [
    {
      icon: Sparkles,
      value: "Beta",
      label: "Lansering 2026",
      color: "text-blue-600",
    },
    {
      icon: Users,
      value: "Ny!",
      label: "Aktivt community",
      color: "text-green-600",
    },
    {
      icon: Award,
      value: "25+",
      label: "Kurstimer",
      color: "text-emerald-600",
    },
    {
      icon: TrendingUp,
      value: "100 000 kr",
      label: "Virtuell kapital",
      color: "text-amber-600",
    },
  ];

  const betaPerks = [
    {
      icon: MessageSquare,
      title: "Direkte tilgang til grunnleggerne",
      description:
        "Få svar på spørsmål direkte fra teamet som bygger plattformen.",
      color: "from-blue-500 to-indigo-600",
    },
    {
      icon: Target,
      title: "Påvirk utviklingen",
      description:
        "Dine tilbakemeldinger former fremtidige funksjoner og kurs.",
      color: "from-emerald-500 to-pink-600",
    },
    {
      icon: Zap,
      title: "Beta-priser for livet",
      description:
        "Lås inn tidlige priser som aldri øker når vi går ut av beta.",
      color: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <section className="py-20 bg-linear-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                  <Icon
                    className={`w-7 h-7 ${stat.color} dark:opacity-90`}
                    aria-hidden="true"
                  />
                </div>
                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main CTA Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Vi er i beta
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Bli en av de første norske traderne
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Klarpakke er nettopp lansert. Registrer deg nå og få eksklusive
            fordeler som beta-bruker.
          </p>
        </div>

        {/* Beta Perks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {betaPerks.map((perk, idx) => {
            const Icon = perk.icon;
            return (
              <div
                key={idx}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-xl"
              >
                {/* Gradient orb background */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-linear-to-br ${perk.color} blur-3xl opacity-20`}
                  />
                </div>

                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-xl bg-linear-to-br ${perk.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {perk.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    {perk.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final CTA Banner */}
        <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-indigo-600 to-emerald-700 rounded-3xl p-8 md:p-12 text-center">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative z-10">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
              Klar for å starte?
            </h3>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Ingen kredittkort. Ingen binding. Bare ren læring med 100 000 kr
              lekepenger.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push(`/${locale}/paper-trading`)}
                aria-label="Start din reise med lekepenger"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all"
              >
                Start lekepenger nå
              </button>
              <button
                onClick={() => router.push(`/${locale}/kurs`)}
                aria-label="Se oversikt over tilgjengelige kurs"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all"
              >
                Utforsk Kurs
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-green-900"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>Gratis å prøve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-green-900"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>Ingen kredittkort</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-green-900"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>Alt på norsk</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
