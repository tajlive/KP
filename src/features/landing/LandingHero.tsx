"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/utils";
import {
  getClientVariant,
  recordConversion,
  recordImpression,
} from "@/lib/ab-testing";
import type { ExperimentVariant } from "@/lib/ab-testing";

/** Subtle animated particle background — lightweight CSS, no lib deps */
function AnimatedBg() {
  // eslint-disable-next-line no-undef
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.15,
      });
    }

    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.fill();
      }
      // Subtle connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - d / 80)})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />;
}

/** Live pulse — subtil "noe skjer" indikator */
function LivePulse() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D26]/80 backdrop-blur-md border border-[#2A2D35] text-[#9CA3AF] text-xs font-medium
        transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      <span>Live markeder</span>
    </div>
  );
}

/** Mobile-friendly preview card — visible on ALL screen sizes */
function MobilePreview() {
  return (
    <div className="mt-8 sm:mt-10 max-w-sm mx-auto lg:mx-0 w-full">
      <div className="glass-card p-4 sm:p-5">
        {/* Price ticker */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">₿</span>
            <span className="text-[#F9FAFB] font-bold text-sm sm:text-base">BTC / USDT</span>
          </div>
          <span className="text-[#10B981] text-xs sm:text-sm font-semibold tabular-nums animate-pulse">
            +2.4%
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#F9FAFB] tabular-nums tracking-tight mb-2">
          $105,240
        </div>
        {/* Mini chart bar */}
        <div className="h-1.5 bg-[#2A2D35] rounded-full overflow-hidden mb-3">
          <div className="h-full w-[62%] bg-gradient-to-r from-[#10B981] to-emerald-300 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 py-2.5 rounded-xl bg-[#064E3B] border border-[#10B981]/30 text-[#10B981] text-xs sm:text-sm font-bold text-center">
            Kjøp
          </div>
          <div className="flex-1 py-2.5 rounded-xl bg-[#7F1D1D] border border-[#EF4444]/30 text-[#EF4444] text-xs sm:text-sm font-bold text-center">
            Selg
          </div>
        </div>
        <p className="text-[#6B7280] text-[10px] sm:text-xs text-center mt-2">
          Dette er papirhandel — ingen ekte penger
        </p>
      </div>
    </div>
  );
}

const EXPERIMENT_NAME = "landing_hero_2026";

/** A/B variant heading og beskrivelse */
const VARIANT_A = {
  heading: (
    <>
      100 000 kr i lekepenger
      <br />
      <span className="text-[#F59E0B]">— ekte markeder, null risiko</span>
    </>
  ),
  description:
    "Tren på kryptohandel med autonome AI-agenter på ekte markedsdata — helt gratis.",
};

const VARIANT_B = {
  heading: (
    <>
      Lær kryptohandel med lekepenger
      <br />
      <span className="text-[#F59E0B]">
        — start med 100 000 kr i dag
      </span>
    </>
  ),
  description:
    "Gratis beta. Autonome AI-agenter på ekte markedsdata. Ingen norske kryptobørser lar deg trene med lekepenger — det gjør vi.",
};

export function LandingHero() {
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [mounted, setMounted] = useState(false);
  const impressionLogged = useRef(false);

  // Bestem variant og logg impression ved mount
  useEffect(() => {
    setMounted(true);
    const v = getClientVariant(EXPERIMENT_NAME);
    setVariant(v);

    // Logg impression kun én gang
    if (!impressionLogged.current) {
      impressionLogged.current = true;
      try {
        const supabase = createClient();
        recordImpression(EXPERIMENT_NAME, v, supabase as Parameters<typeof recordImpression>[2]);
      } catch { /* silent — tabell mangler i Supabase */ }
    }
  }, []);

  const handleCTAClick = useCallback(() => {
    try {
      const supabase = createClient();
      recordConversion(
        EXPERIMENT_NAME,
        variant || "A",
        supabase as Parameters<typeof recordConversion>[2],
      );
    } catch { /* silent */ }
  }, [variant]);

  const content = variant === "B" ? VARIANT_B : VARIANT_A;

  return (
    <section className="relative min-h-[85vh] sm:min-h-screen flex items-center overflow-hidden bg-[#0A0B0D]">
      <AnimatedBg />

      {/* Decorative blobs — dark glassmorphism style */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px]
        rounded-full bg-[#3B82F6]/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px]
        rounded-full bg-[#F59E0B]/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px]
        rounded-full bg-[#10B981]/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Copy — mobile-first stacked */}
          <div className="flex-1 text-center lg:text-left">
            <LivePulse />

            <h1
              className="mt-4 sm:mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-[#F9FAFB] leading-[1.1] tracking-tight"
              data-ab-variant={mounted ? variant : "A"}
            >
              {content.heading}
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#9CA3AF] max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {content.description}
            </p>

            {/* CTA — gold, prominent */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/no/register"
                onClick={handleCTAClick}
                className="btn-gold inline-flex items-center justify-center gap-2 px-10 py-4
                  text-lg sm:text-xl font-black rounded-xl no-underline shadow-lg shadow-[#F59E0B]/30
                  min-h-[52px] sm:min-h-[56px] transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Start gratis
              </Link>
            </div>

            {/* Trust line under CTA */}
            <p className="mt-3 text-sm text-[#6B7280] flex items-center justify-center lg:justify-start gap-1.5">
              <span>Ingen kredittkort</span>
              <span className="text-[#2A2D35]">•</span>
              <span>2 minutter å komme i gang</span>
            </p>
          </div>

          {/* Right: Preview — visible on mobile too */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <MobilePreview />
          </div>
        </div>
      </div>
    </section>
  );
}
