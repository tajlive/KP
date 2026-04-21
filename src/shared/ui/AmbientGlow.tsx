"use client";

import { useReducedMotion } from "framer-motion";

/**
 * AmbientGlow
 *
 * Legger til en moderne, subtil farget "mesh gradient"-glow 
 * i bakgrunnen på overflater for et premium fintech-utseende.
 * 
 * Slår seg av på mobil og for brukere som foretrekker redusert motion/effekter
 * for å sikre optimal ytelse (LCP).
 */
export function AmbientGlow() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden mix-blend-screen hidden sm:block">
      {/* Primary Brand Glow */}
      <div 
        className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-soft"
        aria-hidden="true" 
      />
      
      {/* Secondary Accent Glow (Teal/Blue) */}
      <div 
        className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-teal-400/10 blur-[100px] animate-pulse-soft"
        style={{ animationDelay: "2s" }}
        aria-hidden="true" 
      />
    </div>
  );
}
