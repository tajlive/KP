# Phase 2 - Production Measurements

**Date:** 2026-03-09  
**Commit:** 8b8998545  
**Deploy URL:** https://www.klarpakke.no

---

## Summary

Marketing layout refactor deployed successfully. Provider cleanup shows **significant LCP improvement**.

---

## Phase B - Cache & Headers

### Route: /
| Request | x-vercel-cache | age | cache-control |
|---------|----------------|-----|---------------|
| 1 | PRERENDER | 0 | public, max-age=0, must-revalidate |
| 2 | HIT | 0 | public, max-age=0, must-revalidate |
| 3 | HIT | 0 | public, max-age=0, must-revalidate |
| 4 | HIT | 1 | public, max-age=0, must-revalidate |
| 5 | HIT | 1 | public, max-age=0, must-revalidate |

**Status:** ✅ Cache working correctly

### Route: /en/
| Request | cache-control | Notes |
|---------|---------------|-------|
| 1 | public, max-age=0, must-revalidate | No x-vercel-cache header |
| 2 | public, max-age=0, must-revalidate | No x-vercel-cache header |
| 3 | public, max-age=0, must-revalidate | No x-vercel-cache header |

**Status:** ⚠️ Cache headers present but x-vercel-cache missing (investigate)

---

## Phase C - Lighthouse Mobile (5 Runs)

### Route: /

| Run | Performance | LCP (ms) | FCP (ms) | TBT (ms) | CLS |
|-----|-------------|----------|----------|----------|-----|
| 1 | 67 | 4352 | 1768 | 369 | 0.004 |
| 2 | 73 | 4000 | 1782 | 256 | 0.004 |
| 3 | 74 | 3992 | 1775 | 253 | 0.004 |
| 4 | 74 | 3956 | 1754 | 251 | 0.004 |
| 5 | 74 | 3978 | 1668 | 256 | 0.004 |

**Median:** Performance 74 | LCP 3992ms | FCP 1768ms | TBT 256ms | CLS 0.004

### Route: /en/

| Run | Performance | LCP (ms) | FCP (ms) | TBT (ms) | CLS |
|-----|-------------|----------|----------|----------|-----|
| 1 | 84 | 3325 | 1375 | 117 | 0.004 |
| 2 | 80 | 3656 | 1406 | 182 | 0.008 |
| 3 | 79 | 3634 | 1384 | 232 | 0.004 |
| 4 | 79 | 3665 | 1415 | 225 | 0.004 |
| 5 | 83 | 3319 | 1069 | 182 | 0.004 |

**Median:** Performance 80 | LCP 3634ms | FCP 1384ms | TBT 182ms | CLS 0.004

---

## Phase D - Before/After Comparison

### Route: /

| Metric | Before | After | Change | % Change |
|--------|--------|-------|--------|----------|
| Performance | 62 | **74** | +12 | +19% ✅ |
| LCP | 6200ms | **3992ms** | -2208ms | **-36%** ✅ |
| FCP | 1500ms | **1768ms** | +268ms | +18% ⚠️ |
| TBT | 330ms | **256ms** | -74ms | -22% ✅ |
| CLS | ? | 0.004 | - | Baseline |

### Route: /en/

| Metric | Before | After | Change | % Change |
|--------|--------|-------|--------|----------|
| Performance | ~62 | **80** | +18 | +29% ✅ |
| LCP | 6200ms | **3634ms** | -2566ms | **-41%** ✅ |
| FCP | 1500ms | **1384ms** | -116ms | -8% ✅ |
| TBT | 330ms | **182ms** | -148ms | -45% ✅ |

---

## Phase E - Build Analysis

### Production Build Output

| Route | Size | First Load JS | Type | ISR |
|-------|------|---------------|------|-----|
| / | 21.9 kB | 277 kB | Static (○) | 1h |
| /[locale] | 6.71 kB | 235 kB | SSG (●) | 1h |

### First Load JS Shared
- **App Router:** 185 kB
- **Pages Router:** 154 kB

---

## Key Findings

### ✅ What Improved
1. **LCP reduced by 36-41%** - Provider cleanup eliminated hydration blocking
2. **TBT reduced by 22-45%** - Less JavaScript execution on main thread
3. **Performance score up 19-29%** - Better overall page experience
4. **Cache working** - x-vercel-cache: HIT confirmed

### ⚠️ What Needs Attention
1. **FCP slightly increased on /** - Likely font loading still blocking
2. **/en/ cache header** - Missing x-vercel-cache (cosmetic, still static)
3. **LCP still > 3.0s** - Need FASE 3 (above-fold optimization)

---

## Technical Changes Deployed

### Removed from Landing Route
- AuthProvider (Supabase init)
- OnboardingProvider + OnboardingFlow
- TradingModeProvider
- ToastProvider
- ChatWidgetLoader (deferred to dashboard)
- PWALoader (deferred to dashboard)

### Added
- MarketingNavigation (no auth dependency)
- MarketingProviders (minimal, error handling only)
- Per-route layouts with full providers for app areas

---

## Measurement Methodology

- **Lighthouse:** Mobile emulation, 5 runs, median value
- **Cache:** 5 requests per route, observed headers
- **Build:** Vercel production build
- **Location:** EU (Norway) via Cloudflare CDN

---

*Measurements completed: 2026-03-09*  
*Next step: Phase 3 decision*
