import { Metadata } from "next";
import { BRAND, HERO } from "@/lib/design/tokens";
import { 
  Bot, 
  Shield, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Clock,
  LineChart
} from "lucide-react";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return {
    title: "Auto-trading | La robotene jobbe for deg — Klarpakke",
    description: "Automatisk krypto-trading med AI-drevne strategier. Velg risikonivå, sett parametere, og la robotene handle for deg. 24/7 overvåking av markedet.",
  };
}

const riskLevels = [
  {
    id: "low",
    icon: Shield,
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    textColor: "text-emerald-600",
    title: "Lav risiko",
    description: "Konservativ strategi fokusert på kapitalbevaring og stabile, langsiktige avkastninger.",
    expectedReturn: "8-15%",
    timeframe: "Langsiktig (6-12 måneder)",
    suitableFor: "For deg som er ny innen trading og vil lære trygt",
    planRequired: "Bachelor",
    planColor: "bg-blue-600",
  },
  {
    id: "medium",
    icon: Target,
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-600",
    title: "Middels risiko",
    description: "Balansert tilnærming med moderat risiko for å oppnå bedre avkastning over tid.",
    expectedReturn: "15-30%",
    timeframe: "Mellomlangsiktig (3-6 måneder)",
    suitableFor: "For deg med litt erfaring som vil optimalisere porteføljen",
    planRequired: "Master",
    planColor: "bg-emerald-600",
  },
  {
    id: "high",
    icon: TrendingUp,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-600",
    title: "Høy risiko",
    description: "Aggressiv strategi som utnytter markedsvolatilitet for maksimal avkastning.",
    expectedReturn: "30-60%+",
    timeframe: "Kortsiktig (1-3 måneder)",
    suitableFor: "For erfarne tradere som tåler høy volatilitet",
    planRequired: "PhD",
    planColor: "bg-indigo-600",
  },
];

const steps = [
  {
    icon: Target,
    title: "Velg strategi",
    description: "Velg mellom lav, middels eller høy risiko basert på din toleranse og mål.",
  },
  {
    icon: Clock,
    title: "Sett parametere",
    description: "Definer investeringsbeløp, stop-loss og take-profit nivåer. Full kontroll.",
  },
  {
    icon: LineChart,
    title: "La roboten jobbe",
    description: "AI-overvåking 24/7. Få varsler om handler og juster når som helst.",
  },
];

const faqs = [
  {
    question: "Hva er auto-trading?",
    answer: "Auto-trading er automatisert kryptohandel drevet av algoritmer og AI. Systemet analyserer markedet, identifiserer muligheter og utfører handler på dine vegne — helt uten at du trenger å overvåke markedet selv.",
  },
  {
    question: "Er det risikofritt?",
    answer: "Nei, all trading innebærer risiko. Selv med avanserte algoritmer kan tap oppstå. Vi anbefaler å starte med paper-trading (lekepenger) for å bli kjent med systemet før du bruker ekte penger. Aldri invester mer enn du har råd til å tape.",
  },
  {
    question: "Kan jeg stoppe roboten når som helst?",
    answer: "Ja, du har full kontroll. Du kan pause, stoppe eller justere strategien når som helst. Alle handler loggføres og du kan se full historikk i dashboardet.",
  },
  {
    question: "Hvilken plan trenger jeg?",
    answer: "Bachelor-plan gir tilgang til lav-risiko strategier, Master-plan inkluderer middels risiko, og PhD-plan gir tilgang til alle strategier inkludert høy risiko. Se vår prisside for detaljer.",
  },
];

export default async function AutotradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0052FF] to-[#1e40af] pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-6">
              <Bot className="w-4 h-4" />
              <span>AI-drevet trading</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              La robotene jobbe for deg
              <span className="block text-blue-200">— du bestemmer risikoen</span>
            </h1>
            
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Automatisk krypto-trading med intelligente algoritmer. Velg ditt risikonivå, 
              sett parametere, og la våre trading-roboter overvåke markedet 24/7.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={hrefWithLocale(locale, "/priser")} className={HERO.ctaPrimary}>
                Kom i gang
                <ArrowRight className="w-5 h-5 inline-block ml-2" />
              </Link>
              <Link
                href={hrefWithLocale(locale, "/paper")}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg border border-white/20 transition-all duration-200"
              >
                Prøv med lekepenger
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Ingen erfaring nødvendig</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Start med 100 000 kr lekepenger</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Full kontroll</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Cards */}
      <section className="py-20 md:py-32 -mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Velg ditt risikonivå
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Tre nivåer tilpasset din erfaring og risikotoleranse. Start lavt og øk etter hvert.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {riskLevels.map((risk) => {
              const Icon = risk.icon;
              return (
                <div key={risk.id} className={`relative overflow-hidden rounded-2xl border ${risk.borderColor} ${risk.bgColor} p-6 md:p-8 backdrop-blur-sm`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${risk.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${risk.textColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{risk.title}</h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 min-h-[3rem]">{risk.description}</p>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 text-sm">Forventet avkastning</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{risk.expectedReturn}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 text-sm">Tidshorisont</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{risk.timeframe}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500 text-sm">Plan</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${risk.planColor}`}>{risk.planRequired}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mb-6">{risk.suitableFor}</p>
                  <Link href={hrefWithLocale(locale, "/priser")} className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-all ${BRAND.primary}`}>
                    Kom i gang <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Slik fungerer auto-trading</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Kom i gang på under 5 minutter</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#0052FF]/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-[#0052FF]" />
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 w-8 h-8 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-sm hidden md:block">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white text-center mb-12">Ofte stilte spørsmål</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="font-semibold text-slate-900 dark:text-white pr-4">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-slate-500 group-open:hidden" />
                  <ChevronUp className="w-5 h-5 text-slate-500 hidden group-open:block" />
                </summary>
                <div className="px-6 pb-6 bg-white dark:bg-slate-900">
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Klar til å la robotene jobbe for deg?</h2>
          <p className="text-lg text-slate-400 mb-8">Start med paper-trading i dag. Ingen risiko, kun læring.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={hrefWithLocale(locale, "/register")} className={HERO.ctaPrimary}>
              Opprett konto <ArrowRight className="w-5 h-5 inline-block ml-2" />
            </Link>
            <Link href={hrefWithLocale(locale, "/priser")} className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
              Se priser
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
