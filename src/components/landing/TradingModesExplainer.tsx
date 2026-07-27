"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

/**
 * TradingModesExplainer — Forklarer de tre trading-modusene så enkelt at
 * bestemor forstår det. Ingen begreper, ingen jargon.
 *
 * Tre moduser, én konto. Du flytter ikke penger — du bytter bare hvem som styrer.
 */

const MODES = [
  {
    emoji: "🖐️",
    name: "Manuell",
    tagline: "Du bestemmer alt",
    who: "Hva, når og hvor mye",
    money: "Du velger beløp hver gang",
    color: "emerald",
    href: "/trade",
  },
  {
    emoji: "🤖",
    name: "Auto",
    tagline: "Du + AI sammen",
    who: "Du setter regler, AI utfører",
    money: "AI beregner basert på dine regler",
    color: "amber",
    href: "/dashboard/auto-trade",
  },
  {
    emoji: "🎭",
    name: "JokerTrade",
    tagline: "AI gjør alt",
    who: "Du trykker Start, AI ordner resten",
    money: "AI bestemmer — du trenger ikke tenke",
    color: "violet",
    href: "/jokertrade",
  },
];

export function TradingModesExplainer() {
  const locale = useLocale();

  return (
    <section className="py-20 bg-[#0A0B0D]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-[#F9FAFB]">
            Slik fungerer det
          </h2>
          <p className="mt-3 text-[#9CA3AF] max-w-xl mx-auto text-sm sm:text-base">
            Du har <strong className="text-white">én konto</strong>. Pengene
            flyttes ikke — du bytter bare hvem som styrer.
          </p>
        </div>

        {/* One wallet, three drivers */}
        <div className="mb-16">
          <div className="bg-[#111318] border border-[#2A2D35] rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl mb-3">💳</div>
            <div className="text-2xl sm:text-3xl font-black text-[#F59E0B]">
              100 000 kr
            </div>
            <div className="text-sm text-[#6B7280] mt-1">
              Din paper-konto — alle tre modusene bruker samme penger
            </div>

            {/* Three arrows from the wallet */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {MODES.map((mode) => (
                <Link
                  key={mode.name}
                  href={`/${locale}${mode.href}`}
                  className={`group flex flex-col items-center gap-2 p-4 rounded-xl
                    border border-${mode.color}-500/20 bg-${mode.color}-950/20
                    hover:border-${mode.color}-400/40 transition-all duration-200`}
                >
                  <div className="text-3xl">{mode.emoji}</div>
                  <div className="font-bold text-white text-sm">{mode.name}</div>
                  <div className="text-xs text-[#9CA3AF]">{mode.who}</div>
                  <div className="mt-1 text-[10px] text-[#6B7280] italic">
                    {mode.money}
                  </div>
                  <div className="mt-2 text-xs text-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity">
                    Prøv nå →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mode cards — detailed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODES.map((mode, i) => (
            <Link
              key={mode.name}
              href={`/${locale}${mode.href}`}
              className={`group relative overflow-hidden rounded-2xl border border-${mode.color}-500/20
                bg-gradient-to-b from-${mode.color}-950/30 to-transparent
                p-6 transition-all duration-200 hover:scale-[1.02]`}
            >
              {/* Step number */}
              <div className="absolute top-4 right-4 text-4xl font-black text-white/5">
                {i + 1}
              </div>

              <div className="relative z-10">
                <div className="text-3xl mb-3">{mode.emoji}</div>
                <h3 className="text-xl font-bold text-white">{mode.name}</h3>
                <p className="mt-1 text-sm text-[#F59E0B] font-medium">
                  {mode.tagline}
                </p>

                {/* What happens */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">👤</span>
                    <div>
                      <div className="text-xs font-semibold text-[#D1D5DB]">
                        Hvem styrer
                      </div>
                      <div className="text-xs text-[#9CA3AF]">{mode.who}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">💰</span>
                    <div>
                      <div className="text-xs font-semibold text-[#D1D5DB]">
                        Hvor mye
                      </div>
                      <div className="text-xs text-[#9CA3AF]">{mode.money}</div>
                    </div>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="text-[10px] text-[#6B7280]">
                    {i === 0 && "For deg som vil lære og ha kontroll"}
                    {i === 1 &&
                      "For deg som vil ha hjelp, men beholde styringen"}
                    {i === 2 && "For deg som vil at AI-en gjør alt"}
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-3 text-xs text-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity">
                  {i === 0 && "Start å trade →"}
                  {i === 1 && "Sett opp Auto →"}
                  {i === 2 && "Prøv JokerTrade →"}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom note — no money movement */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            💡 <strong className="text-[#9CA3AF]">Du flytter ikke penger</strong>{" "}
            mellom modusene. Alle handler fra samme konto. Tjener JokerTrade
            200 kr? De pengene er dine uansett hvilken modus du bruker neste
            gang.
          </p>
        </div>
      </div>
    </section>
  );
}
