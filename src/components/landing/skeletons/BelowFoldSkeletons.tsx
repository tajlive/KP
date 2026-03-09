/**
 * BelowFoldSkeletons
 * 
 * Skeleton placeholder components for lazy-loaded below-fold sections.
 * These prevent layout shift (CLS) while the actual components load.
 * 
 * All skeletons use:
 * - animate-pulse for loading indication
 * - Realistic min-height matching the actual component
 * - bg-slate-800/50 for visual consistency
 * - Mobile-first responsive design
 * - No hardcoded text (visual placeholders only)
 * 
 * Usage:
 *   dynamic(() => import("..."), { loading: LottoCalculatorSkeleton })
 */

/**
 * LottoCalculatorSkeleton
 * Approximate height: 400px (h-96 + padding)
 * Layout: Two-column grid on desktop, stacked on mobile
 */
export function LottoCalculatorSkeleton() {
  return (
    <div className="min-h-[400px] py-16 md:py-24 animate-pulse">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-6">
            <div className="h-8 bg-slate-800/50 rounded w-3/4" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
            <div className="h-4 bg-slate-800/50 rounded w-5/6" />
            <div className="h-12 bg-slate-800/50 rounded w-1/2" />
          </div>
          {/* Right column */}
          <div className="space-y-4">
            <div className="h-20 bg-slate-800/50 rounded" />
            <div className="h-20 bg-slate-800/50 rounded" />
            <div className="h-20 bg-slate-800/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SocialProofSectionSkeleton
 * Approximate height: 280px (h-64 + padding)
 * Layout: Centered content with testimonial cards
 */
export function SocialProofSectionSkeleton() {
  return (
    <div className="min-h-[280px] py-16 animate-pulse">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="h-8 bg-slate-800/50 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-slate-800/50 rounded w-1/3 mx-auto mt-4" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-800/50 rounded-xl" />
          <div className="h-32 bg-slate-800/50 rounded-xl" />
          <div className="h-32 bg-slate-800/50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * GamifiedLeaderboardSkeleton
 * Approximate height: 420px (h-96 + padding)
 * Layout: Table-like structure with rows
 */
export function GamifiedLeaderboardSkeleton() {
  return (
    <div className="min-h-[420px] py-16 animate-pulse">
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-8 bg-slate-800/50 rounded w-2/3 mx-auto mb-8" />
        <div className="space-y-3">
          {/* Header row */}
          <div className="flex gap-4 pb-4 border-b border-slate-800">
            <div className="h-6 bg-slate-800/50 rounded w-16" />
            <div className="h-6 bg-slate-800/50 rounded flex-1" />
            <div className="h-6 bg-slate-800/50 rounded w-24" />
          </div>
          {/* Data rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-3">
              <div className="h-8 bg-slate-800/50 rounded w-16" />
              <div className="h-8 bg-slate-800/50 rounded flex-1" />
              <div className="h-8 bg-slate-800/50 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * SafeBacktestWidgetSkeleton
 * Approximate height: 360px (h-80 + padding)
 * Layout: Chart area with stats below
 */
export function SafeBacktestWidgetSkeleton() {
  return (
    <div className="min-h-[360px] py-16 animate-pulse">
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-8 bg-slate-800/50 rounded w-3/4 mx-auto mb-8" />
        {/* Chart area */}
        <div className="h-48 bg-slate-800/50 rounded-xl mb-6" />
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-slate-800/50 rounded" />
          <div className="h-16 bg-slate-800/50 rounded" />
          <div className="h-16 bg-slate-800/50 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * ComparisonSectionSkeleton
 * Approximate height: 420px (h-96 + padding)
 * Layout: Feature comparison table
 */
export function ComparisonSectionSkeleton() {
  return (
    <div className="min-h-[420px] py-16 animate-pulse">
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-8 bg-slate-800/50 rounded w-2/3 mx-auto mb-10" />
        <div className="space-y-4">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-800">
            <div className="h-6 bg-slate-800/50 rounded" />
            <div className="h-6 bg-slate-800/50 rounded" />
            <div className="h-6 bg-slate-800/50 rounded" />
            <div className="h-6 bg-slate-800/50 rounded" />
          </div>
          {/* Table rows */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 py-3">
              <div className="h-5 bg-slate-800/50 rounded" />
              <div className="h-5 bg-slate-800/50 rounded" />
              <div className="h-5 bg-slate-800/50 rounded" />
              <div className="h-5 bg-slate-800/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * PricingSectionSkeleton
 * Approximate height: 640px (h-[600px] + padding)
 * Layout: Three pricing cards
 */
export function PricingSectionSkeleton() {
  return (
    <div className="min-h-[640px] py-16 md:py-24 animate-pulse">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="h-8 bg-slate-800/50 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-slate-800/50 rounded w-1/3 mx-auto mt-4" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Pricing cards */}
          <div className="h-96 bg-slate-800/50 rounded-2xl" />
          <div className="h-96 bg-slate-800/50 rounded-2xl" />
          <div className="h-96 bg-slate-800/50 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * FAQSectionSkeleton
 * Approximate height: 420px (h-96 + padding)
 * Layout: Accordion-style FAQ items
 */
export function FAQSectionSkeleton() {
  return (
    <div className="min-h-[420px] py-16 animate-pulse">
      <div className="max-w-3xl mx-auto px-4">
        <div className="h-8 bg-slate-800/50 rounded w-1/3 mx-auto mb-10" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * FinalCTASectionSkeleton
 * Approximate height: 280px (h-64 + padding)
 * Layout: Centered CTA with button
 */
export function FinalCTASectionSkeleton() {
  return (
    <div className="min-h-[280px] py-16 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="h-8 bg-slate-800/50 rounded w-3/4 mx-auto mb-4" />
        <div className="h-4 bg-slate-800/50 rounded w-1/2 mx-auto mb-8" />
        <div className="h-14 bg-slate-800/50 rounded-xl w-48 mx-auto" />
      </div>
    </div>
  );
}

/**
 * ConditionalFooterSkeleton
 * Approximate height: 200px (h-48 + padding)
 * Layout: Multi-column footer
 */
export function ConditionalFooterSkeleton() {
  return (
    <div className="min-h-[200px] py-12 animate-pulse bg-slate-950">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo column */}
          <div className="space-y-4">
            <div className="h-8 bg-slate-800/50 rounded w-32" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
          </div>
          {/* Link columns */}
          <div className="space-y-3">
            <div className="h-5 bg-slate-800/50 rounded w-24" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
          </div>
          <div className="space-y-3">
            <div className="h-5 bg-slate-800/50 rounded w-24" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
          </div>
          <div className="space-y-3">
            <div className="h-5 bg-slate-800/50 rounded w-24" />
            <div className="h-4 bg-slate-800/50 rounded w-full" />
            <div className="h-4 bg-slate-800/50 rounded w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
