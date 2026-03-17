"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

function TickerSkeleton() {
  return (
    <div className="bg-white border-y border-[#E2E5EC] py-2.5">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-8 text-sm text-[#8E95A9]">
        <span className="hidden sm:inline">Laster priser...</span>
        <div className="flex gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-10 h-4 bg-[#E2E5EC] rounded" />
              <div className="w-14 h-4 bg-[#E2E5EC] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamically import LiveTicker with no SSR
const LiveTicker = dynamic(
  () => import("./LiveTicker").then((mod) => mod.LiveTicker),
  {
    ssr: false,
    loading: TickerSkeleton,
  }
);

/**
 * DeferredLiveTicker
 * 
 * Loads LiveTicker after initial page render is complete.
 * This ensures Hero renders first without ticker blocking LCP.
 */
export function DeferredLiveTicker() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const scheduleLoad = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => setShouldLoad(true), { timeout: 2000 });
      } else {
        setTimeout(() => setShouldLoad(true), 500);
      }
    };

    scheduleLoad();
  }, []);

  if (!shouldLoad) {
    return <TickerSkeleton />;
  }

  return <LiveTicker />;
}
