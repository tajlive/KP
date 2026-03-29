import { Metadata } from "next";
import { BRAND, HERO } from "@/lib/design/tokens";
import { 
  TrendingUp, 
  Shield, 
  Clock,
  CheckCircle,
  ArrowRight,
  Users,
  PlayCircle,
  Wallet,
  LineChart,
  GraduationCap
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
    title: "Paper Trading | Øv risikofritt med lekepenger — Klarpakke",
    description: "Start med 100 000 kr i lekepenger. Øv på krypto-trading i et realistisk miljø uten å risikere egne penger. Perfekt for nybegynnere.",
  };
}

const features = [
  {
    icon: Shield,
    title: "Risikofri øving",
    description: "Lær å trade uten å risikere en eneste krone av dine egne penger. Perfekt for å bygge selvtillit før du går live.",
  },
  {
    icon: Wallet,
    title: "100 000 kr lekepenger",
    description: "Start med en virtuell portefølje på 100 000 kr. Test strategier, lær av feil, og bli klar for ekte trading.",
  },
  {
    icon: Clock,
    title: "Real-time priser",
    description: "Handel med sanntids markeddata. Opplevelsen er identisk med ekte trading — bare uten økonomisk risiko.",
  },
];

const stats = [
  { value: "12 000+", label: "handler øvd denne måneden" },
  { value: "2 500+", label: "aktive brukere" },
  { value: "89%", label: "føler seg tryggere etter øving" },
  { value: "0 kr", label: "i risiko" },
];

const steps = [
  {
    number: "01",
    title: "Opprett konto",
    description: "Registrer deg gratis på under 2 minutter. Ingen kredittkort nødvendig.",
  },
  {
    number: "02",
    title: "Start paper-trading",
    description: "Få umiddelbar tilgang til 100 000 kr i lekepenger og alle våre verktøy.",
  },
  {
    number: "03",
    title: "Bli klar for live",
    description: "Når du er komfortabel, oppgrader til ekte trading med ett klikk.",
  },
];

export default async function PaperTradingLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-600 to-emerald-800 pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-6">
                <GraduationCap className="w-4 h-4" />
                <span>100% gratis å prøve</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Øv på trading
                <span className="block text-emerald-200">uten å risikere penger</span>
              </h1>
              
              <p className="text-lg md:text-xl text-emerald-100 mb-8 max-w-xl">
                Start med 100 000 kr i lekepenger. Test strategier, lær markedene, 
                og bli klar til å trade med ekte penger — helt risikofritt.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={hrefWithLocale(locale, "/signup")}
                  className="px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg shadow-xl hover:bg-emerald-50 transition-all duration-200 inline-flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  Start nå — det er gratis
                </Link>
                <Link
                  href={hrefWithLocale(locale, "/innlogging")}
                  className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-200 inline-flex items-center justify-center"
                >
                  Logg inn
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 mt-8 text-sm text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Ingen kredittkort</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Real-time data</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Ubegrenset øving</span>
                </div>
              </div>
            </div>
            
            {/* Mock Dashboard UI */}
            <div className="hidden lg:block relative">
              <div className="relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-slate-400 text-sm">Paper Trading</span>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Balance */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-emerald-400 text-sm mb-1">Saldo (lekepenger)</p>
                    <p className="text-3xl font-bold text-white">kr 127 450</p>
                    <p className="text-emerald-400 text-sm mt-1">+27.45% ▲</p>
                  </div>
                  
                  {/* Chart placeholder */}
                  <div className="h-32 bg-slate-800 rounded-xl flex items-end justify-between px-4 py-4 gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-emerald-500/60 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  
                  {/* Positions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">₿</div>
                        <div>
                          <p className="text-white font-medium">Bitcoin</p>
                          <p className="text-slate-400 text-xs">0.45 BTC</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">kr 245 000</p>
                        <p className="text-emerald-400 text-xs">+12.5%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">♦</div>
                        <div>
                          <p className="text-white font-medium">Ethereum</p>
                          <p className="text-slate-400 text-xs">3.2 ETH</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">kr 89 200</p>
                        <p className="text-emerald-400 text-xs">+8.3%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Avkastning</p>
                    <p className="text-lg font-bold text-emerald-600">+27.45%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-[#0052FF] mb-1">{stat.value}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Hvorfor paper-trading?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Den beste måten å lære trading på — uten å tape penger på nybegynnerfeil
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-100 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Kom i gang på 3 enkle steg
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="text-5xl font-black text-slate-200 dark:text-slate-800 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="flex -space-x-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900" />
                ))}
              </div>
            </div>
            <blockquote className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 mb-6 italic">
              "Jeg øvde med paper-trading i 3 måneder før jeg gikk live. 
              Det ga meg selvtilliten jeg trengte, og jeg unngikk så mange nybegynnerfeil."
            </blockquote>
            <p className="font-semibold text-slate-900 dark:text-white">— Maria S., Master-student</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Klar til å starte din trading-reise?
          </h2>
          <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
            Registrer deg gratis i dag og få 100 000 kr i lekepenger. 
            Ingen kredittkort, ingen forpliktelser — bare læring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={hrefWithLocale(locale, "/signup")}
              className="px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg shadow-xl hover:bg-emerald-50 transition-all inline-flex items-center justify-center gap-2"
            >
              Opprett gratis konto
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={hrefWithLocale(locale, "/priser")}
              className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Se priser
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
