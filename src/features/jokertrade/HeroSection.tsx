"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { JokerIcon } from "./JokerIcons";
import { PriceTicker } from "./PriceTicker";
import { JokerTradeCTA } from "./JokerTradeCTA";

// ---------------------------------------------------------------------------
// Animated particle background (reuse pattern from LandingHero)
// ---------------------------------------------------------------------------

function AnimatedBg() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#F59E0B]/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#3B82F6]/5 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-[#10B981]/5 blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live pulse indicator
// ---------------------------------------------------------------------------

function LivePulse() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D26]/80 backdrop-blur-md border border-[#2A2D35] text-[#9CA3AF] text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      <span>AI Trader — Live 24/7</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0A0B0D] pt-12 sm:pt-16 pb-8 sm:pb-12">
      <AnimatedBg />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top: live pulse + Joker icon */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="mb-4">
            <JokerIcon className="h-16 w-16 sm:h-20 sm:w-20" />
          </div>
          <LivePulse />

          {/* Headline */}
          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-[#F9FAFB] leading-[1.1] tracking-tight">
            JokerTrade™
            <br />
            <span className="bg-gradient-to-r from-[#F59E0B] via-[#FCD34D] to-[#F59E0B] bg-clip-text text-transparent">
              AI-drevet trading
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-[#9CA3AF] max-w-lg leading-relaxed">
            Din personlige AI-trader som jobber mens du sover.
            <br />
            Automatisk analyse, intelligente signaler — null stress.
          </p>

          {/* CTA */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 items-center">
            <JokerTradeCTA
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base sm:text-lg
                bg-[#F59E0B] text-[#0A0B0D]
                shadow-[0_0_30px_rgba(245,158,11,0.4)]
                transition-all duration-300
                active:scale-[0.98] active:bg-[#D97706]
                min-h-[48px] min-w-[200px]
                hover:shadow-[0_0_50px_rgba(245,158,11,0.6)]
                hover:scale-[1.02]
                no-underline"
            />
          </div>

          {/* Trust line */}
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs sm:text-sm text-[#6B7280]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              100 000 kr i lekepenger
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              Null risiko
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              raskt å sette opp
            </span>
          </div>
        </div>

        {/* Live Price Ticker */}
        <div className="glass-card py-4 sm:py-5">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
              Live priser — oppdateres hvert 30. sekund
            </p>
          </div>
          <PriceTicker />
        </div>
      </div>
    </section>
  );
}
