import { Metadata } from "next";
import { BRAND, HERO } from "@/lib/design/tokens";
import { 
  Bot, 
  TrendingUp, 
  Shield,
  Zap,
  Target,
  Activity,
  Lock,
  ArrowRight,
  Filter,
  ChevronRight
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
    title: "Trading-roboter | Velg din strategi — Klarpakke",
    description: "Bla gjennom våre AI-drevne trading-roboter og strategier. Fra konservative til aggressive strategier for alle erfaringsnivåer.",
  };
}

// Mock data for trading robots/strategies
const tradingBots = [
  {
    id: "steady-growth",
    name: "Steady Growth",
    description: "Langsom og stabil vekst med fokus på kapitalbevaring. Ideell for nybegynnere.",
    riskLevel: "low",
    riskLabel: "Lav risiko",
    riskColor: "text-emerald-600",
    riskBg: "bg-emerald-500/10",
    icon: Shield,
    performance: {
      ytd: "+12.4%",
      oneYear: "+18.2%",
      threeYear: "+54.7%",
    },
    features: ["DCA-strategi", "Stop-loss 5%", "Daily rebalancing"],
    planRequired: "Bachelor",
    planColor: "bg-blue-600",
    popular: false,
  },
  {
    id: "balanced-alpha",
    name: "Balanced Alpha",
    description: "Balansert tilnærming som kombinerer vekst og stabilitet. Vår mest populære strategi.",
    riskLevel: "medium",
    riskLabel: "Middels risiko",
    riskColor: "text-amber-600",
    riskBg: "bg-amber-500/10",
    icon: Target,
    performance: {
      ytd: "+24.8%",
      oneYear: "+31.5%",
      threeYear: "+89.3%",
    },
    features: ["Momentum trading", "AI-signaler", "Risk management"],
    planRequired: "Master",
    planColor: "bg-emerald-600",
    popular: true,
  },
  {
    id: "momentum-pro",
    name: "Momentum Pro",
    description: "Utnytter markedsmomentum for høyere avkastning. For den aktive investoren.",
    riskLevel: "medium",
    riskLabel: "Middels risiko",
    riskColor: "text-amber-600",
    riskBg: "bg-amber-500/10",
    icon: Activity,
    performance: {
      ytd: "+31.2%",
      oneYear: "+42.8%",
      threeYear: "+124.5%",
    },
    features: ["Breakout detection", "Volatility trading", "24/7 monitoring"],
    planRequired: "Master",
    planColor: "bg-emerald-600",
    popular: false,
  },
  {
    id: "aggressive-alpha",
    name: "Aggressive Alpha",
    description: "Høyfrekvent trading som utnytter små prisbevegelser. Maksimal avkastning.",
    riskLevel: "high",
    riskLabel: "Høy risiko",
    riskColor: "text-red-600",
    riskBg: "bg-red-500/10",
    icon: Zap,
    performance: {
      ytd: "+48.6%",
      oneYear: "+67.3%",
      threeYear: "+198.2%",
    },
    features: ["High-frequency trading", "Leverage 2x", "Advanced AI"],
    planRequired: "PhD",
    planColor: "bg-indigo-600",
    popular: false,
  },
  {
    id: "crypto-arbitrage",
    name: "Crypto Arbitrage",
    description: "Utnytter prisforskjeller mellom børser. Nærmest risikofri avkastning.",
    riskLevel: "low",
    riskLabel: "Lav risiko",
    riskColor: "text-emerald-600",
    riskBg: "bg-emerald-500/10",
    icon: Bot,
    performance: {
      ytd: "+8.9%",
      oneYear: "+14.2%",
      threeYear: "+45.8%",
    },
    features: ["Cross-exchange", "Instant execution", "Low volatility"],
    planRequired: "PhD",
    planColor: "bg-indigo-600",
    popular: false,
  },
  {
    id: "trend-follower",
    name: "Trend Follower",
    description: "Følger sterke markeds trender. Kjøper styrke, selger svakhet.",
    riskLevel: "high",
    riskLabel: "Høy risiko",
    riskColor: "text-red-600",
    riskBg: "bg-red-500/10",
    icon: TrendingUp,
    performance: {
      ytd: "+52.3%",
      oneYear: "+74.1%",
      threeYear: "+215.7%",
    },
    features: ["Trend detection", "Pyramiding", "Trailing stops"],
    planRequired: "PhD",
    planColor: "bg-indigo-600",
    popular: true,
  },
];

const riskFilters = [
  { label: "Alle", value: "all" },
  { label: "Lav", value: "low" },
  { label: "Middels", value: "medium" },
  { label: "Høy", value: "high" },
];

export default async function TraderePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter = "all" } = await searchParams;
  
  const filteredBots = filter === "all" 
    ? tradingBots 
    : tradingBots.filter(bot => bot.riskLevel === filter);

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
              <span>6 strategier tilgjengelig</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Velg din trading-robot
            </h1>
            
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl">
              Fra konservative strategier for langsiktig vekst, til aggressive algoritmer for maksimal avkastning. 
              Alle drevet av kunstig intelligens.
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Filter className="w-5 h-5 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Filter:</span>
            {riskFilters.map((f) => (
              <Link
                key={f.value}
                href={hrefWithLocale(locale, f.value === "all" ? "/tradere" : `/tradere?filter=${f.value}`)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === f.value
                    ? "bg-[#0052FF] text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#0052FF]"
                }`}
              >
                {f.label} risiko
              </Link>
            ))}
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => {
              const Icon = bot.icon;
              return (
                <div 
                  key={bot.id}
                  className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg hover:border-[#0052FF]/30 transition-all"
                >
                  {bot.popular && (
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-[#0052FF] text-white text-xs font-bold rounded-full">
                      Populær
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${bot.riskBg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${bot.riskColor}`} />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${bot.riskBg} ${bot.riskColor}`}>
                      {bot.riskLabel}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{bot.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 min-h-[2.5rem]">{bot.description}</p>
                  
                  {/* Performance */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                    <p className="text-xs text-slate-500 mb-2">Historisk avkastning</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{bot.performance.ytd}</p>
                        <p className="text-xs text-slate-500">YTD</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{bot.performance.oneYear}</p>
                        <p className="text-xs text-slate-500">1 år</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{bot.performance.threeYear}</p>
                        <p className="text-xs text-slate-500">3 år</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {bot.features.map((feature, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-lg">
                        {feature}
                      </span>
                    ))}
                  </div>
                  
                  {/* Plan & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${bot.planColor}`}>
                        {bot.planRequired}
                      </span>
                    </div>
                    <Link 
                      href={hrefWithLocale(locale, `/checkout?plan=${bot.planRequired.toLowerCase()}`)}
                      className="flex items-center gap-1 text-[#0052FF] font-semibold text-sm hover:underline"
                    >
                      Lås opp <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compare Plans CTA */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Usikker på hvilken plan du trenger?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Sammenlign alle planer og finn den som passer deg best. 
            Alle planer inkluderer paper-trading for å teste strategiene først.
          </p>
          <Link 
            href={hrefWithLocale(locale, "/priser")}
            className={`inline-flex items-center gap-2 ${HERO.ctaPrimary}`}
          >
            Se alle planer <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
