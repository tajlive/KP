"use client";

import { useState } from "react";
import { ChevronDown, Shield, TrendingUp, Lock, HelpCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "safe",
    question: "Er JokerTrade trygt?",
    answer:
      "Ja. JokerTrade kjører i paper-modus som standard — du handler med lekepenger, ikke ekte krypto. Når du er klar for live-trading, handler du via Binance og har full kontroll på innskudd og uttak. AI-en har ALDRI tilgang til å ta ut penger.",
    icon: <Shield className="w-5 h-5 text-[#10B981]" />,
  },
  {
    id: "earn",
    question: "Hvor mye kan jeg tjene?",
    answer:
      "Resultater varierer. Topp-tradere på plattformen har 15-40% månedlig avkastning, men dette er ikke garantert. Start i paper-modus for å se hvordan AI-en presterer før du eventuelt går live. Historisk data viser 8-15% gjennomsnittlig månedlig avkastning for AI-valgte strategier.",
    icon: <TrendingUp className="w-5 h-5 text-[#F59E0B]" />,
  },
  {
    id: "cost",
    question: "Hva koster det?",
    answer:
      "JokerTrade er gratis å starte. Du får 100 000 kr i lekepenger for å teste AI-en. Premium-funksjoner som live-trading, ubegrensede strategier og avansert analyse kommer med våre betalte abonnement fra 249 kr/måned.",
    icon: <Lock className="w-5 h-5 text-[#3B82F6]" />,
  },
  {
    id: "how",
    question: "Hvordan velger AI-en hvilke handler å gjøre?",
    answer:
      "AI-en analyserer markedsdata i sanntid: RSI, SMA, momentum-indikatorer, volumtrender og sentimentanalyse. Den kombinerer flere strategier og velger den beste basert på gjeldende markedsforhold. Hver handel forklares — du ser alltid hvorfor AI-en gjør det den gjør.",
    icon: <HelpCircle className="w-5 h-5 text-[#60A5FA]" />,
  },
  {
    id: "start",
    question: "Kan jeg starte med null erfaring?",
    answer:
      "Absolutt. JokerTrade er designet for nybegynnere. Du trenger ingen tidligere erfaring med krypto eller trading. Sett opp kontoen raskt, få 100 000 kr i lekepenger, og la AI-en gjøre jobben. Null risiko, null stress.",
    icon: <HelpCircle className="w-5 h-5 text-[#F59E0B]" />,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-12 sm:py-16 bg-[#0A0B0D]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F9FAFB]">
            Ofte stilte spørsmål
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#9CA3AF]">
            Alt du lurer på om JokerTrade
          </p>
        </div>

        {/* FAQ items */}
        <div className="space-y-2 sm:space-y-3">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-sm overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 text-left min-h-[48px]"
                  aria-expanded={isOpen}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1 text-sm sm:text-base font-semibold text-[#F9FAFB]">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-[#6B7280] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-0">
                    <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed border-t border-[#2A2D35] pt-3 sm:pt-4">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
