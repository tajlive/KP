"use client";

/**
 * Premium shimmer skeleton with CSS-only animation.
 * Highly performant and avoids JS overhead during initial load.
 * 
 * Uses CSS variables for staggered delays.
 */

function SkeletonBlock({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`rounded-2xl relative overflow-hidden bg-white/[0.04] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent ${className}`}
      style={{
        // @ts-ignore
        "--shimmer-delay": `${delay}s`,
      }}
    />
  );
}

/** Premium dashboard loading skeleton */
export function DashboardLoadingSkeleton() {
  return (
    <div className="min-h-screen p-4 pt-6 space-y-6 max-w-7xl mx-auto">
      {/* CSS for the shimmer animation with delay support */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        [style*="--shimmer-delay"]::before {
          animation-delay: var(--shimmer-delay);
        }
      `}} />

      {/* Greeting skeleton - Matches PersonalizedGreeting */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 flex items-center gap-4">
        <SkeletonBlock className="w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" delay={0.1} />
          <SkeletonBlock className="h-3 w-64" delay={0.2} />
        </div>
      </div>

      {/* Hero balance skeleton - Matches SimplifiedHero */}
      <div className="py-8 flex flex-col items-center gap-3">
        <SkeletonBlock className="h-4 w-24 rounded-full" delay={0.1} />
        <SkeletonBlock className="h-12 w-56" delay={0.15} />
        <SkeletonBlock className="h-5 w-32" delay={0.2} />
        <div className="flex gap-3 mt-3">
          <SkeletonBlock className="h-11 w-32 rounded-xl" delay={0.25} />
          <SkeletonBlock className="h-11 w-32 rounded-xl" delay={0.3} />
        </div>
      </div>

      {/* Main Grid Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart skeleton */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-6">
              <SkeletonBlock className="h-5 w-32" delay={0.3} />
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <SkeletonBlock
                    key={i}
                    className="h-7 w-12 rounded-lg"
                    delay={0.35 + i * 0.05}
                  />
                ))}
              </div>
            </div>
            <SkeletonBlock className="h-64 w-full" delay={0.4} />
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4"
              >
                <SkeletonBlock className="w-8 h-8 rounded-xl" delay={i * 0.1 + 0.5} />
                <div className="space-y-2">
                  <SkeletonBlock className="h-7 w-24" delay={i * 0.1 + 0.55} />
                  <SkeletonBlock className="h-3 w-16" delay={i * 0.1 + 0.6} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4"
            >
              <SkeletonBlock className="h-5 w-32" delay={0.7} />
              <SkeletonBlock className="h-24 w-full" delay={0.8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SkeletonBlock };
