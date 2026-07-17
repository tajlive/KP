import { JokerTradeLanding } from "@/features/jokertrade/JokerTradeLanding";
import { JokerTradeClient } from "@/features/jokertrade/JokerTradeClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "JokerTrade™ | AI-drevet trading ",
  description:
    "Din personlige AI-trader som jobber mens du sover. Automatisk analyse, intelligente signaler — null stress. Start gratis med 100 000 kr i lekepenger.",
};

/**
 * JokerTrade: landing + trading dashboard.
 *
 * Viser alltid landing-siden. Trading-klienten rendres under for
 * innloggede brukere (JokerTradeClient sjekker auth på klient-siden).
 * "Start JokerTrade"-knapper er smarte (JokerTradeCTA):
 *   - Innlogget → scroll til dashboard
 *   - Ikke innlogget → registrering
 */
export default function JokerTradePage() {
  return (
    <div className="min-h-screen bg-[#0A0B0D]">
      <JokerTradeLanding />

      {/* Trading dashboard — JokerTradeClient er "use client" og
          sjekker auth internt. Vises kun for innloggede. */}
      <div className="border-t border-[#2A2D35]" data-testid="jokertrade-client">
        <JokerTradeClient />
      </div>
    </div>
  );
}
