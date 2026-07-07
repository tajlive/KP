"use client";

import { Shield, Eye, Hand, Zap } from "lucide-react";

const CARDS = [
  {
    icon: Shield,
    title: "Du taper ikke ekte penger uten å godkjenne",
    desc: "All handel starter med papirpenger. Du må aktivt velge live-modus og bekrefte hver overgang. Ingen overraskelser.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Eye,
    title: "Full åpenhet — du ser alt som skjer",
    desc: "Alle handler logges. Ingen skjulte avgifter. Du kan når som helst se historikk, posisjoner og resultater.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Hand,
    title: "Du har alltid kontrollen",
    desc: "Ingen automatisk trekk fra konto. Du setter inn det du vil, når du vil. Plattformen handler aldri uten ditt samtykke.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Zap,
    title: "AI-en foreslår — du bestemmer",
    desc: "AI-signaler er forslag, ikke ordre. Du vurderer, velger, og trykker selv på kjøp/selg. Bot-modus er valgfritt.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

export function SafetySection() {
  return (
    <section className="py-16 sm:py-24 px-5 sm:px-8 bg-gradient-to-b from-slate-950 to-[#0f172a]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            Trygghet
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
            Slik beskytter vi deg
          </h2>
          <p className="mt-3 text-white/50 text-sm sm:text-base max-w-md mx-auto">
            Du bestemmer tempoet. Vi sørger for at ingenting går galt underveis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6
                hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
            >
              <div className={`inline-flex p-2.5 sm:p-3 rounded-xl ${card.bg} mb-3 sm:mb-4`}>
                <card.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.color}`} />
              </div>
              <h3 className="text-white font-bold text-sm sm:text-base mb-1.5 sm:mb-2">
                {card.title}
              </h3>
              <p className="text-white/40 text-xs sm:text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
