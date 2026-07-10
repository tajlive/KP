"use client";

import { JokerIcon, ShieldIcon, CoinStackIcon } from "./JokerIcons";

// ---------------------------------------------------------------------------
// Step data
// ---------------------------------------------------------------------------

interface Step {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: <ShieldIcon className="h-8 w-8 sm:h-10 sm:w-10" />,
    title: "Koble til",
    description:
      "Koble din paper-konto eller Binance. Null risiko — du bestemmer når du vil gå live.",
  },
  {
    number: 2,
    icon: <JokerIcon className="h-8 w-8 sm:h-10 sm:w-10" />,
    title: "Velg strategi",
    description:
      "AI-en velger automatisk den beste strategien basert på markedsforholdene. Du trenger ikke gjøre noe.",
  },
  {
    number: 3,
    icon: <CoinStackIcon className="h-8 w-8 sm:h-10 sm:w-10" />,
    title: "Tjen penger mens du sover",
    description:
      "AI-en jobber 24/7 — analyserer, handler og optimerer. Du våkner opp til resultater.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HowItWorks() {
  return (
    <section id="hvordan" className="py-12 sm:py-16 bg-[#0A0B0D]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F9FAFB]">
            Hvordan fungerer JokerTrade?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#9CA3AF] max-w-md mx-auto">
            Automatisk AI-trading — så enkelt at hvem som helst kan komme i gang.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative glass-card flex flex-col items-center text-center p-6 sm:p-8"
            >
              {/* Step number badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[#F59E0B] text-[#0A0B0D] font-extrabold text-sm flex items-center justify-center shadow-lg shadow-[#F59E0B]/30">
                {step.number}
              </div>

              {/* Icon */}
              <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-[#1A1D26] border border-[#2A2D35]">
                {step.icon}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#F9FAFB] mb-2">
                {step.title}
              </h3>

              <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
