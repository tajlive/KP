# TTFB Fix Iteration Log

**Date:** 2026-03-09  
**Status:** Testing Static Rendering Solutions

---

## Iteration 1: Add "no" to generateStaticParams

**Change:**
```typescript
export async function generateStaticParams() {
  return [
    { locale: "no" },  // Added default locale
    { locale: "en" },
    { locale: "th" },
    { locale: "zh" },
  ];
}
```

**Result:**
- Build: ✅ Success
- Deploy: ✅ Success
- Cache headers: ❌ Still `cache-control: private`
- x-vercel-cache: ❌ Still `MISS`

**Analysis:**
Adding "no" to generateStaticParams was not sufficient. The route remains dynamic because next-intl's `getRequestConfig` in i18n.ts uses request-time locale resolution.

---

## Iteration 2: Add unstable_setRequestLocale

**Change:**
```typescript
import { unstable_setRequestLocale } from "next-intl/server";

// In layout:
unstable_setRequestLocale(locale);
```

**Result:**
- Build: ❌ Failed
- Error: `'unstable_setRequestLocale' is not exported from 'next-intl/server'`

**Analysis:**
This API is not available in next-intl v4 with the current export structure.

---

## Iteration 3: Add dynamic = 'force-static'

**Change:**
```typescript
export const dynamic = 'force-static';
```

**Result:**
- Build: ❌ Failed
- Error: `Failed to collect configuration for /[locale]`

**Analysis:**
Force-static conflicts with next-intl's dynamic APIs (getRequestConfig).

---

## Root Cause Confirmed

**Primary Issue:**
`src/i18n.ts` loads 44+ JSON namespaces at request time:

```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  // This runs on EVERY request
  const [base, landing, footer, navigation, ...] = await Promise.all([
    import(`../messages/${validLocale}/base.json`),
    import(`../messages/${validLocale}/landing.json`),
    // ... 42 more imports
  ]);
});
```

**Impact:**
- ~50-100ms per JSON file × 44 files = 2-4 seconds TTFB
- Dynamic rendering forced by request-time locale resolution
- No static generation possible with current next-intl v4 setup

---

## Options Evaluated

### Option A: Optimize i18n.ts (Selected)
- Use React.cache to memoize message loading
- Reduce namespaces for landing page
- Load other namespaces lazily

**Pros:**
- Maintains current architecture
- Reduces TTFB significantly

**Cons:**
- Still dynamic rendering
- Requires code changes

### Option B: Migrate to next-intl v3 Pattern
- Use older static generation approach
- Different API structure

**Pros:**
- Static generation possible

**Cons:**
- Major refactoring
- May lose v4 features

### Option C: Use Edge Runtime
- Move to edge for faster cold starts

**Pros:**
- Faster TTFB from edge locations

**Cons:**
- Not a fix, just mitigation
- Adds complexity
- next-intl may not work fully on edge

---

## Recommended Next Steps

1. **Short-term:** Optimize i18n.ts to load fewer namespaces for landing
2. **Medium-term:** Implement lazy loading of non-critical namespaces
3. **Long-term:** Evaluate next-intl alternatives or v5 static rendering

---

## Current Status

- CSS optimized: 336KB → 190KB ✅
- generateStaticParams updated ✅
- Static rendering: ❌ Blocked by next-intl v4 architecture
- TTFB improvement: ❌ None yet

**Decision needed:** Continue with i18n optimization or accept current TTFB for Norway/EU users?
