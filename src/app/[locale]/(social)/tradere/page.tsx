import { Metadata } from "next";
import { Bot, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  
  return {
    title: t("traders.title", { defaultValue: "Trading-roboter | Klarpakke" }),
    description: t("traders.description", { 
      defaultValue: "AI-drevne trading-strategier for kryptovaluta. Automatisk handel basert på markedsanalyse og risikostyring." 
    }),
  };
}

export default async function TraderePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "traders" });

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0052FF] to-[#1e40af] pt-32 pb-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-6">
              <Bot className="w-4 h-4" />
              <span>{t("comingSoon.badge", { defaultValue: "Under utvikling" })}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("comingSoon.title", { defaultValue: "Trading-roboter kommer snart" })}
            </h1>
            
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl">
              {t("comingSoon.description", { 
                defaultValue: "Vi bygger automatiske trading-strategier drevet av kunstig intelligens. Fra konservative til aggressive strategier for alle erfaringsnivåer." 
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Coming Soon Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
            <div className="w-20 h-20 bg-[#0052FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-[#0052FF]" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {t("comingSoon.heading", { defaultValue: "Strategier under utvikling" })}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
              {t("comingSoon.body", { 
                defaultValue: "Våre AI-drevne trading-roboter er under aktiv utvikling. Vi tester nå strategier i paper trading-miljø før lansering. Følg med for oppdateringer!" 
              })}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/paper-trading`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0052FF] text-white font-semibold rounded-xl hover:bg-[#0052FF]/90 transition-colors"
              >
                {t("comingSoon.ctaPaperTrading", { defaultValue: "Prøv paper trading" })}
              </Link>
              
              <Link
                href={`/${locale}/dashboard`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("comingSoon.ctaDashboard", { defaultValue: "Tilbake til dashboard" })}
              </Link>
            </div>
          </div>
          
          {/* Feature Preview */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              {
                title: t("features.dca.title", { defaultValue: "DCA-strategi" }),
                description: t("features.dca.description", { defaultValue: "Dollar-cost averaging for jevn kjøp over tid" }),
              },
              {
                title: t("features.momentum.title", { defaultValue: "Momentum trading" }),
                description: t("features.momentum.description", { defaultValue: "Utnytter markedsmomentum for optimal timing" }),
              },
              {
                title: t("features.risk.title", { defaultValue: "Risk management" }),
                description: t("features.risk.description", { defaultValue: "Automatisk stop-loss og posisjonsstyring" }),
              },
            ].map((feature, i) => (
              <div 
                key={i}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-left opacity-75"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
