import { Metadata } from "next";
import { MarketingPageShell, generateMarketingMetadata } from "@/shared/ui/marketing";
import Link from "next/link";
import { Bot, Zap, Shield, Clock, TrendingUp, ArrowRight } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = generateMarketingMetadata({
  title: "Trading Bots — Automatiser handelen din",
  description: "La Klarpakkes AI-drevne trading bots handle for deg. 24/7 overvåking, automatisk stop-loss og take-profit.",
});

export default function BotsPage() {
  return (
    <MarketingPageShell>
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 mb-6">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Trading Bots som jobber for deg
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Våre AI-drevne bots overvåker markedet 24/7, finner de beste mulighetene og handler automatisk — med innebygd risikostyring.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Zap, title: "Auto-trading", desc: "Boten kjøper og selger automatisk basert på avanserte AI-signaler og teknisk analyse." },
            { icon: Shield, title: "Innebygd stop-loss", desc: "Hver trade har automatisk stop-loss. Du kan maks tape det du har satt opp." },
            { icon: Clock, title: "Handler 24/7", desc: "Mens du sover, jobber, eller er på ferie — boten er alltid våken og følger markedet." },
            { icon: TrendingUp, title: "Adaptiv strategi", desc: "Boten tilpasser seg markedsforhold: bull, bear, eller sideways." },
            { icon: Bot, title: "Flere strategier", desc: "Velg mellom konservativ, balansert, eller aggressiv trading-stil." },
            { icon: Shield, title: "Paper-trading først", desc: "Test boten med lekepenger. Gå live kun når du er komfortabel." },
          ].map((feature, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center size-10 rounded-xl bg-violet-50 mb-4">
                <feature.icon className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/no/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/20 hover:shadow-xl transition-all"
          >
            Start med bots gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-slate-400 mt-4">Ingen binding · Avslutt når som helst</p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
