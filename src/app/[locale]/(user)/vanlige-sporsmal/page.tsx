"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

const FAQ = {
  no: [
    {
      q: "Hvorfor svinger beløpet mitt så mye?",
      a: "Piloten handler for deg med lekepenger. Alle handler er «urealisert» — det betyr at verdien følger markedet opp og ned helt til de selges. Akkurat som boligprisen: den går opp og ned hver dag, men du taper ikke penger før du selger med tap. Når markedet går opp igjen, går verdien din opp igjen.",
    },
    {
      q: "Hva betyr «urealisert»?",
      a: "En urealisert gevinst eller tap er forskjellen mellom kjøpsprisen og dagens markedspris. Så lenge du holder posisjonen, er det bare et tall på skjermen — ingenting er tapt eller tjent ennå. Først når piloten selger, blir gevinsten eller tapet «realisert» (ekte).",
    },
    {
      q: "Taper jeg ekte penger?",
      a: "Nei. Du handler med 100 000 kr i lekepenger — null risiko. Alt er simulert med ekte markedsdata. Målet er å bli en bedre trader uten å risikere en krone. Ekte trading åpner senere.",
    },
    {
      q: "Hvorfor handler piloten for noen, men ikke meg?",
      a: "Piloten roterer mellom alle brukere — alle får like mange sjanser over tid. Hvis det ikke er din tur akkurat nå, betyr det at piloten venter på riktig signal fra markedet. Noen ganger er det lurest å ikke handle.",
    },
    {
      q: "Hva betyr rangeringen min?",
      a: "Rangeringen viser hvor mange erfaringspoeng (XP) du har sammenlignet med andre brukere. Du får XP for daglig innlogging, gode handler og nye strategier. #1 er best. Rangeringen har ingenting med hvor mye penger du har tjent å gjøre.",
    },
    {
      q: "Hvorfor har en annen bruker -47% og en annen 0%?",
      a: "Noen brukere får kjøp tidlig i rotasjonen og ser svingninger med én gang. Andre venter fortsatt på riktig kjøpssignal. Dette er helt normalt — alle får like mange handler over tid. En bruker som er -47% i dag kan være i pluss i morgen når markedet snur.",
    },
  ],
  en: [
    {
      q: "Why does my balance swing so much?",
      a: "The Pilot trades for you using virtual funds. All trades are «unrealized» — the value follows the market up and down until sold. Like a house: its value changes daily, but you don't lose money until you sell at a loss. When the market recovers, your value recovers.",
    },
    {
      q: "What does «unrealized» mean?",
      a: "An unrealized gain or loss is the difference between your buy price and today's market price. As long as you hold the position, it's just a number on the screen — nothing is lost or gained yet. Only when the Pilot sells does the gain or loss become «realized» (real).",
    },
    {
      q: "Am I losing real money?",
      a: "No. You trade with 100,000 NOK in virtual funds — zero risk. Everything is simulated with real market data. The goal is to become a better trader without risking a single krone. Live trading opens later.",
    },
    {
      q: "Why does the Pilot trade for some users but not me?",
      a: "The Pilot rotates through all users — everyone gets equal chances over time. If it's not your turn right now, it means the Pilot is waiting for the right market signal. Sometimes not trading is the smartest move.",
    },
    {
      q: "What does my ranking mean?",
      a: "Your ranking shows how many experience points (XP) you have compared to other users. You earn XP for daily logins, good trades, and trying new strategies. #1 is best. Ranking has nothing to do with how much money you've made.",
    },
    {
      q: "Why does one user have -47% and another 0%?",
      a: "Some users get trades early in the rotation and see swings right away. Others are still waiting for the right buy signal. This is completely normal — everyone gets the same number of trades over time. A user at -47% today could be profitable tomorrow when the market turns.",
    },
  ],
};

export default function VanligeSporsmalPage() {
  const locale = useLocale();
  const l = (locale === "en" ? "en" : "no") as "no" | "en";
  const items = FAQ[l];
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-kp-bg px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <Link
          href={`/${locale}/dashboard`}
          className="text-kp-text-muted hover:text-kp-text-primary text-sm mb-4 inline-block"
        >
          ← {l === "no" ? "Tilbake til dashboard" : "Back to dashboard"}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-kp-text-primary mb-1">
          {l === "no" ? "Ofte stilte spørsmål" : "Frequently Asked Questions"}
        </h1>
        <p className="text-kp-text-muted text-sm mb-6">
          {l === "no"
            ? "Enkle svar på vanlige spørsmål om Klarpakke"
            : "Simple answers to common questions about Klarpakke"}
        </p>

        {/* FAQ items */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="border border-kp-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-kp-bg-secondary hover:bg-kp-bg-secondary/70 transition-colors"
              >
                <span className="text-sm sm:text-base font-medium text-kp-text-primary pr-3">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-kp-text-muted shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-4 pt-1">
                  <p className="text-sm text-kp-text-secondary leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-kp-text-muted/50 mt-8 text-center">
          {l === "no"
            ? "Fant du ikke svaret? Kontakt oss på support@klarpakke.no"
            : "Didn't find your answer? Contact us at support@klarpakke.no"}
        </p>
      </div>
    </div>
  );
}
