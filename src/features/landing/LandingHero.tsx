"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/** Subtle animated particle background — lightweight CSS, no lib deps */
function AnimatedBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium
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
      <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-xl shadow-black/10">
        {/* Price ticker */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">₿</span>
            <span className="text-white font-bold text-sm sm:text-base">BTC / USDT</span>
          </div>
          <span className="text-green-300 text-xs sm:text-sm font-semibold tabular-nums animate-pulse">
            +2.4%
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight mb-2">
          $105,240
        </div>
        {/* Mini chart bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
          <div className="h-full w-[62%] bg-gradient-to-r from-green-400 to-emerald-300 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 py-2.5 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300 text-xs sm:text-sm font-bold text-center">
            Kjøp
          </div>
          <div className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300 text-xs sm:text-sm font-bold text-center">
            Selg
          </div>
        </div>
        <p className="text-white/40 text-[10px] sm:text-xs text-center mt-2">
          Dette er papirhandel — ingen ekte penger
        </p>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative min-h-[85vh] sm:min-h-screen flex items-center overflow-hidden
      bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0052FF]">
      <AnimatedBg />

      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px]
        rounded-full bg-blue-400/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px]
        rounded-full bg-cyan-400/8 blur-3xl" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Copy — mobile-first stacked */}
          <div className="flex-1 text-center lg:text-left">
            <LivePulse />

            <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight">
              Se om krypto er noe for deg
              <br />
              <span className="text-blue-200">— uten å risikere en krone</span>
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-blue-100/80 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Få 10 000 kr i lekepenger. Prøv, lær, og bestem selv når du er klar
              for ekte handel. Null stress, null forpliktelser.
            </p>

            {/* Trust bullets */}
            <div className="mt-5 sm:mt-6 flex flex-wrap justify-center lg:justify-start gap-3 text-xs sm:text-sm text-blue-200/70">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Gratis å starte
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Ingen binding
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Norsk support
              </span>
            </div>

            {/* CTA */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/no/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:px-8 sm:py-4
                  bg-white text-[#0052FF] font-bold text-base sm:text-lg rounded-2xl
                  hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg shadow-black/10
                  min-h-[48px] sm:min-h-[52px]"
              >
                <Sparkles className="w-5 h-5" />
                Prøv gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/no#hvordan"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:px-8 sm:py-4
                  border-2 border-white/20 text-white font-bold text-base sm:text-lg rounded-2xl
                  hover:bg-white/10 active:scale-[0.98] transition-all
                  min-h-[48px] sm:min-h-[52px]"
              >
                Se hvordan det fungerer
              </Link>
            </div>
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
