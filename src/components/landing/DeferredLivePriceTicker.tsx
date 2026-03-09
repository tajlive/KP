"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Loading placeholder - minimal, no JS overhead
function TickerSkeleton() {
  return (
    <div className="bg-slate-900/50 border-b border-slate-800 py-2">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-8 text-sm text-slate-500">
        <span className="hidden sm:inline">Live markedsdata lastes...</span>
        <div className="flex gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-12 h-4 bg-slate-800 rounded" />
              <div className="w-16 h-4 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamically import LivePriceTicker with no SSR
// This keeps it out of the initial bundle and critical render path
const LivePriceTicker = dynamic(
  () => import("./LivePriceTicker").then((mod) => mod.LivePriceTicker),
  {
    ssr: false,
    loading: TickerSkeleton,
  }
);

/**
 * DeferredLivePriceTicker
 * 
 * Loads LivePriceTicker after initial page render is complete.
 * Uses requestIdleCallback when available, or setTimeout fallback.
 * 
 * This ensures:
 * - Hero renders first without ticker blocking
 * - No WebSocket/fetch in critical path
 * - Ticker appears after LCP is established
 */
export function DeferredLivePriceTicker() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer loading until after initial render
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleLoad = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => setShouldLoad(true), { timeout: 2000 });
      } else {
        // Fallback: wait 500ms after mount
        setTimeout(() => setShouldLoad(true), 500);
      }
    };

    scheduleLoad();
  }, []);

  if (!shouldLoad) {
    return <TickerSkeleton />;
  }

  return <LivePriceTicker />;
}
