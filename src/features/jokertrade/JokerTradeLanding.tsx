"use client";

import { HeroSection } from "./HeroSection";
import { HowItWorks } from "./HowItWorks";
import { LeaderboardWidget } from "./LeaderboardWidget";
import { Testimonials } from "./Testimonials";
import { FAQ } from "./FAQ";

// ---------------------------------------------------------------------------
// JokerTradeLanding — Public landing page komponert av alle seksjoner
// ---------------------------------------------------------------------------

export function JokerTradeLanding() {
  return (
    <main>
      {/* 1. Hero med glow + price ticker */}
      <HeroSection />

      {/* 2. Hvordan fungerer JokerTrade? — 3 steg */}
      <HowItWorks />

      {/* 3. Live leaderboard widget (top 3) */}
      <LeaderboardWidget />

      {/* 4. Testimonials */}
      <Testimonials />

      {/* 5. FAQ */}
      <FAQ />

      {/* Footer CTA */}
      <section className="py-12 sm:py-16 bg-[#0A0B0D] border-t border-[#2A2D35]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F9FAFB]">
            Klar for å la AI-en jobbe for deg?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#9CA3AF] max-w-md mx-auto">
            Start gratis med 100 000 kr i lekepenger. Null risiko, null binding.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <a
              href="/no/signup"
              className="btn-gold text-base sm:text-lg px-10 py-4 no-underline shadow-lg shadow-[#F59E0B]/20"
            >
              🎭 Start JokerTrade gratis
            </a>
            <a
              href="/no#hvordan"
              className="inline-flex items-center justify-center gap-2 px-8 py-4
                border border-[#2A2D35] text-[#F9FAFB] font-bold text-base sm:text-lg rounded-xl
                hover:bg-[#1A1D26]/80 hover:border-[#3A3D45] active:scale-[0.98] transition-all
                min-h-[48px] sm:min-h-[52px] backdrop-blur-sm no-underline"
            >
              Les mer
            </a>
          </div>
          <p className="mt-4 text-[10px] text-[#6B7280]">
            Ingen kredittkort • 5 min å sette opp • Norsk support
          </p>
        </div>
      </section>
    </main>
  );
}
