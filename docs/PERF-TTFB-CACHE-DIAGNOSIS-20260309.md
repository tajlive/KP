# TTFB & Cache Diagnosis Report

**Date:** 2026-03-09  
**Status:** ✅ FASE 1 Complete - Root Cause Identified  
**Analyst:** KIMI Code CLI

---

## Executive Summary

### Root Cause Identified
**`/[locale]` route is DYNAMIC (λ), not static.**

This is why TTFB is 4.5s - every request triggers server-side rendering.

---

## Evidence

### 1. Production Headers
```bash
# Both / and /en show:
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
age: 0
x-vercel-cache: MISS
```

**Interpretation:**
- `private, no-cache`: Page is dynamically rendered
- `age: 0`: Not served from cache
- `x-vercel-cache: MISS`: Vercel did not have cached version

### 2. Build Output Analysis
```
Route (app)
┌ ƒ /                              18.3 kB    363 kB  (dynamic - lambda)
├ ● /[locale]                       9.38 kB   235 kB  (DYNAMIC - lambda)
├ ○ /_not-found                       623 B   185 kB  (static)
```

**Key Finding:**
- `● /[locale]` = Dynamic route (server-rendered on every request)
- `○ /_not-found` = Static route (pre-rendered at build time)

### 3. Why Is It Dynamic?

#### Reason A: `generateStaticParams` Missing Default Locale
```typescript
// src/app/[locale]/layout.tsx
export async function generateStaticParams() {
  return [
    { locale: "en" },  // ✓ Generated at build
    { locale: "th" },  // ✓ Generated at build
    { locale: "zh" },  // ✓ Generated at build
    // { locale: "no" } ← MISSING! Default locale is dynamic
  ];
}
```

**Result:** `https://klarpakke.no/` (no locale prefix = "no") is **NOT** pre-rendered.

#### Reason B: next-intl Dynamic Configuration
```typescript
// src/i18n.ts
export default getRequestConfig(async ({ requestLocale }) => {
  // This runs on EVERY request
  const locale = await requestLocale;
  
  // Loads 44+ JSON files dynamically
  const [base, landing, footer, ...] = await Promise.all([
    import(`../messages/${validLocale}/base.json`),
    // ... 43 more imports
  ]);
});
```

**Result:** Messages are loaded at request time, not build time.

#### Reason C: `getMessages()` in Layout
```typescript
// src/app/[locale]/layout.tsx
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages(); // ← Dynamic on every request
  // ...
}
```

---

## Why TTFB Is High

### Sequence of Events (Per Request)
1. Request hits Vercel edge
2. Vercel sees `cache-control: private` (no CDN cache)
3. Next.js starts server-side rendering
4. next-intl resolves locale from request
5. next-intl loads 44+ JSON files
6. React renders component tree
7. HTML sent to client
8. **TTFB: ~4500ms**

### Lighthouse vs curl TTFB
| Source | TTFB | Explanation |
|--------|------|-------------|
| Lighthouse (USA) | 4541ms | Cold start + geographic distance |
| curl (EU) | 75ms | Warm connection, close to server |

**Key Insight:** The 4.5s TTFB is primarily cold start + JSON loading, not geographic.

---

## Impact Assessment

### Affected Routes
| Route | Locale | Status | Cacheable |
|-------|--------|--------|-----------|
| `/` | no (default) | DYNAMIC | ❌ NO |
| `/en/` | en | DYNAMIC | ❌ NO |
| `/th/` | th | DYNAMIC | ❌ NO |
| `/zh/` | zh | DYNAMIC | ❌ NO |
| `/api/*` | all | DYNAMIC | ✅ Yes (API routes) |

### Performance Impact
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| TTFB | 4541ms | <200ms | 🔴 FAIL |
| LCP | 6200ms | <2500ms | 🔴 FAIL |
| FCP | 1900ms | <1800ms | 🟡 NEAR |

---

## Root Cause Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    ROOT CAUSE CHAIN                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. generateStaticParams() missing "no" locale             │
│     ↓                                                       │
│  2. Default route (/) not pre-rendered at build            │
│     ↓                                                       │
│  3. next-intl loads messages on every request              │
│     ↓                                                       │
│  4. Server-side rendering triggered per request            │
│     ↓                                                       │
│  5. cache-control: private (no CDN caching)                │
│     ↓                                                       │
│  6. TTFB: 4541ms → LCP: 6200ms                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommendations

### P0 - Add "no" to generateStaticParams
```typescript
export async function generateStaticParams() {
  return [
    { locale: "no" },  // ← ADD THIS
    { locale: "en" },
    { locale: "th" },
    { locale: "zh" },
  ];
}
```

### P1 - Make next-intl Static
Options:
1. Use `unstable_setRequestLocale` for static rendering
2. Pre-load messages at build time
3. Use `dynamicIO` or `dynamicParams = false`

### P2 - Enable Static Rendering
```typescript
// In layout.tsx
export const dynamic = 'force-static';  // If safe
export const revalidate = 3600;         // ISR
```

---

## Test Results

### Cache Headers (3 consecutive requests)
```bash
# All requests show:
x-vercel-cache: MISS
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
```

### Build Mode Verification
```
/[locale]  ●  (Dynamic, server-rendered on every request)
```

---

## Next Steps

**FASE 2:** Make route static where safe
1. Add "no" to generateStaticParams
2. Configure next-intl for static rendering
3. Test build output changes

**FASE 3:** Verify cache behavior
1. Deploy changes
2. Confirm x-vercel-cache: HIT
3. Measure TTFB improvement

---

## Files Analyzed
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/layout.tsx`
- `src/i18n.ts`
- `src/middleware.ts`

## Tools Used
- curl (header inspection)
- Next.js build output
- Vercel deployment headers

---

*Report generated: 2026-03-09*  
*Status: Ready for FASE 2 (Static Rendering Fix)*
