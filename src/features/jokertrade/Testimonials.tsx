"use client";

import { Star, Quote } from "lucide-react";

// ---------------------------------------------------------------------------
// Testimonial data (AI-generert for nå — kan byttes med ekte data senere)
// ---------------------------------------------------------------------------

interface Testimonial {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  quote: string;
  rating: number;
  highlight: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Marius L.",
    handle: "@mariusl",
    avatar: "👨‍💼",
    quote:
      "Jeg skjønte aldri trading før JokerTrade. AI-en gjør analysene — jeg sjekker hva den har gjort på morgenen og lærer av det.",
    rating: 5,
    highlight: "Simulert papirhandel",
  },
  {
    id: "2",
    name: "Sigrid H.",
    handle: "@sigridh",
    avatar: "👩‍💻",
    quote:
      "Har prøvd å trade selv før — tapte mest. Med JokerTrade ser jeg hva AI-en gjør, og lærer av hver handel.",
    rating: 5,
    highlight: "Lærer av AI-en",
  },
  {
    id: "3",
    name: "Anders B.",
    handle: "@andersb",
    avatar: "👨‍🔬",
    quote:
      "Paper-modus er genialt. Jeg lærer uten å risikere penger. Når jeg føler meg trygg, går jeg live. Anbefales!",
    rating: 5,
    highlight: "Lærer uten risiko",
  },
];

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Testimonials() {
  return (
    <section className="py-12 sm:py-16 bg-[#0A0B0D]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F9FAFB]">
            Hva brukerne sier
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#9CA3AF]">
            Slik kan treningsreisen se ut — demo-eksempler, ikke ekte brukerhistorier
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="glass-card flex flex-col p-5 sm:p-6 relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-3 right-3 w-6 h-6 text-[#2A2D35]" />

              {/* Stars */}
              <Stars count={t.rating} />

              {/* Quote */}
              <p className="mt-3 text-sm sm:text-base text-[#D1D5DB] leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Highlight badge */}
              <div className="mt-3 inline-flex self-start rounded-full bg-[#78350F]/50 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-[#F59E0B]">
                {t.highlight}
              </div>

              {/* User */}
              <div className="mt-4 flex items-center gap-3 border-t border-[#2A2D35] pt-4">
                <span className="text-xl sm:text-2xl">{t.avatar}</span>
                <div>
                  <p className="text-sm font-bold text-[#F9FAFB]">{t.name}</p>
                  <p className="text-[10px] text-[#6B7280]">{t.handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-[10px] text-[#6B7280]">
          * Testimonials er AI-generert for demonstrasjonsformål. Ekte brukerhistorikk kommer snart.
        </p>
      </div>
    </section>
  );
}
