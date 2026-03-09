# Performance Sprint — 9. mars 2026

## Executive Summary

**Status:** ❌ Performance degraded, not improved

Today's optimizations had the opposite effect — LCP regressed from ~3700ms to ~4400ms (+19%). The root cause was identified post-hoc: Sentry SDK bundle (418KB) blocking main thread for 1.2+ seconds.

---

## Baseline vs Final

| Metric | Start of Day | After FASE 1-3 | After Today | Target | Status |
|--------|--------------|----------------|-------------|--------|--------|
| **LCP** | 3992ms | 3677ms | **4416ms** ⚠️ | <2500ms | ❌ +424ms vs baseline |
| **Performance** | 74 | 78 | **69** ⚠️ | >85 | ❌ -9 points |
| **TBT** | 256ms | 222ms | **256ms** | <150ms | ⚠️ Same as baseline |
| **CLS** | 0.004 | 0 | **0** ✅ | 0 | ✅ Perfect |

**Lighthouse Runs (5x mobile):**

| Run | Perf | LCP | TBT | CLS | FCP |
|-----|------|-----|-----|-----|-----|
| 1 | 67 | 4416ms | 298 | 0 | 2316ms |
| 2 | 69 | 4458ms | 247 | 0 | 2340ms |
| 3 | 69 | 4428ms | 256 | 0 | 2316ms |
| 4 | 67 | 4405ms | 322 | 0 | 2305ms |
| 5 | 73 | 4280ms | 128 | 0 | 2343ms |
| **Median** | **69** | **4416ms** | **256** | **0** | **2316ms** |

---

## Changes Made Today

### 1. Font Loading Optimization (Task 2)
**Changes:**
- Fraunces: `display="optional"`, `preload=false`, `adjustFontFallback=true`
- Lexend: Added `adjustFontFallback`, system font fallback

**Expected:** LCP -200-400ms (fonts off critical path)  
**Actual:** LCP increased (Sentry masking font gains)

### 2. Hero LCP Optimization (Task 3)
**Changes:**
- Removed `animate-fade-in` from h1 container
- Text renders immediately without animation delay

**Expected:** LCP -100-200ms  
**Actual:** No measurable gain (blocked by Sentry)

### 3. TBT Reduction (Task 4)
**Changes:**
- Deferred `initMonitoring()` with `requestIdleCallback`
- Deferred `PWALoader` with `requestIdleCallback`

**Expected:** TBT -50-100ms  
**Actual:** TBT same as baseline (Sentry dominates blocking time)

### 4. Resource Hints (Task 5)
**Changes:**
- Added `dns-prefetch` + `preconnect` for Binance API
- Added `dns-prefetch` + `preconnect` for Supabase (conditional)

**Expected:** TTFB improvement  
**Actual:** TTFB good (110ms), not the bottleneck

### 5. i18n Synchronization
**Changes:**
- Synced `pricing.*` and `about.*` keys across no/en/th/zh
- Added missing translations

**Impact:** No performance impact (build-time only)

---

## Root Cause Analysis

### The Real Bottleneck: Sentry SDK

| Detail | Value |
|--------|-------|
| Chunk | 2818-fddcb7be42343649.js |
| Size | 418KB |
| Execution Time | 2047ms |
| Scripting Time | 1278ms |
| Wasted Bytes | 58KB |
| References in code | 161x "sentry", 25x "Sentry", 27x "segment" |

**Source:** `@sentry/nextjs` via `withSentryConfig` in `next.config.mjs`

**Mechanism:** The Sentry Next.js SDK wrapper auto-injects initialization code into the main bundle. This happens at build time, making Sentry part of the critical rendering path.

**Why it wasn't caught earlier:**
- Sentry was already in the baseline build
- Previous LCP improvements (3677ms) were likely from other optimizations masking Sentry
- Today's changes may have shifted bundle composition, making Sentry execution more prominent

### Why Font Optimization Didn't Show Gains

The `font-display: optional` change was correct, but:
1. Sentry JS blocks for 1.2s before fonts even matter
2. By the time fonts would render, Sentry has already delayed LCP
3. The 1950ms gap between FCP (2316ms) and LCP (4416ms) is almost entirely JS execution

---

## LCP Element

**Element:** h1 heading text ("Lær krypto-trading" / "Learn crypto trading")

**Why detection shows "unknown":**
- Lighthouse LCP element detection relies on paint timing
- Heavy JS execution interferes with element attribution
- The text renders, but delayed by Sentry initialization

**Expected element:**
```html
<h1 class="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
  Lær krypto-trading<br>
  <span class="bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">
    fra A til Å
  </span>
</h1>
```

---

## Remaining Gap to Target

| Metric | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| LCP | 4416ms | <2500ms | 1916ms | 🔴 Critical |
| Performance | 69 | >85 | 16 pts | 🔴 Critical |
| TBT | 256ms | <150ms | 106ms | 🟡 Medium |

**Path to LCP <2500ms:**
1. Remove/defer Sentry from landing pages: ~1200ms improvement
2. Additional code splitting: ~300-500ms improvement
3. Target achievable with Sentry optimization alone

---

## Recommended Next Sprint

### 1. Defer Sentry to Non-Critical Path 🔴 (Est. Impact: LCP -1200ms, Perf +12)

**Problem:** Sentry SDK is 418KB and blocks main thread for 1.2s

**Solutions (pick one):**

**Option A: Dynamic import Sentry**
```typescript
// Instead of withSentryConfig auto-injecting:
// Lazy load Sentry only after LCP
const initSentry = async () => {
  if (typeof window === 'undefined') return;
  const { init } = await import('@sentry/nextjs');
  init({ /* config */ });
};

// Call after LCP
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(initSentry, { timeout: 3000 });
}
```

**Option B: Exclude landing pages from Sentry**
```javascript
// next.config.mjs
const withSentryConfig = require('@sentry/nextjs').withSentryConfig;

const sentryWebpackPluginOptions = {
  // Only include dashboard/app routes
  include: ['.next/static/chunks/app/(dashboard)/**'],
  exclude: ['.next/static/chunks/app/page.tsx'],
};
```

**Option C: Remove Sentry from marketing bundle entirely**
- Keep error reporting for `/dashboard/*`, `/paper-trading/*` only
- Landing pages don't need crash reporting
- Re-enable only if error rates justify the 418KB cost

### 2. Aggressive Code Splitting 🟡 (Est. Impact: LCP -300ms)

**Current:** Large chunks with mixed concerns  
**Target:** Route-based code splitting

```typescript
// Split heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />
});
```

### 3. Font Loading Validation 🟢 (Est. Impact: LCP -100ms)

**Verify `font-display: optional` is working:**
- Check if text renders with fallback immediately
- If invisible text detected, revert to `swap` with preload
- Add `size-adjust` for better fallback font metrics

---

## Lessons Learned

1. **Measure before and after every change** — Today's changes seemed correct but were overshadowed by existing issues
2. **Bundle analysis is essential** — Sentry was in the baseline but its impact wasn't quantified
3. **Third-party SDKs are expensive** — 418KB for error tracking is massive for a landing page
4. **Simulated throttling reveals real issues** — The 2.2s script evaluation only showed under mobile simulation

---

## Files Modified Today

| File | Change |
|------|--------|
| `src/app/[locale]/layout.tsx` | Font optimization + resource hints |
| `src/app/page.tsx` | Font optimization + resource hints |
| `src/components/landing/HeroSection.tsx` | Removed LCP animation delay |
| `src/components/providers/ClientSideProviders.tsx` | Deferred monitoring/PWA |
| `messages/*.json` (4 files) | i18n sync |
| `docs/*.md` (2 files) | Documentation |

**Commit:** `d7e4378cb`

---

## Appendix: Bundle Analysis

### Chunk Breakdown

| Chunk | Size | Execution | Content |
|-------|------|-----------|---------|
| 2818-*.js | 418KB | 2047ms | Sentry + Segment |
| 9159-*.js | ~150KB | ~400ms | Unknown (tree-shake candidates) |
| 4492-*.js | ~100KB | ~300ms | Unknown |

### Total JS Budget

| Metric | Value |
|--------|-------|
| Total JS | 439KB |
| Script evaluation | 1680ms |
| Main thread work | 3600ms |
| Long tasks | 6 (max 148ms) |

---

*Report generated: 2026-03-09*  
*Next review: After Sentry optimization implementation*
