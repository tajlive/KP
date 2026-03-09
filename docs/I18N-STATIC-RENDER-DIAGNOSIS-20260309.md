# i18n Static Render Diagnosis

**Date:** 2026-03-09  
**next-intl Version:** 4.8.3  
**Status:** API Verified - Ready for Implementation

---

## Version Check

```json
"next-intl": "^4.8.3"
```

## Available APIs

### setRequestLocale ✅
- **Location:** `next-intl/server`
- **Implementation:** Uses React.cache internally
- **Purpose:** Enable static rendering for locale routes

```typescript
import { setRequestLocale } from 'next-intl/server';
```

### How It Works
```typescript
// From node_modules/next-intl/dist/esm/development/server/react-server/RequestLocaleCache.js
import { cache } from 'react';

const getCache = cache(() => ({ locale: undefined }));

function setCachedRequestLocale(locale) {
  getCache().locale = locale;
}
```

Uses React's `cache()` to memoize locale across the request.

---

## Current Dynamic Rendering Cause

### Problem
`getRequestConfig` in `i18n.ts` runs at request time:
- Loads 44+ JSON namespaces
- Forces dynamic rendering
- TTFB: 4.5s from USA

### Error Message from next-intl
```
Usage of next-intl APIs in Server Components currently opts into dynamic rendering. 
This limitation will eventually be lifted, but as a stopgap solution, you can use 
the `setRequestLocale` API to enable static rendering.
```

---

## Files to Update

| File | Change |
|------|--------|
| `src/app/[locale]/layout.tsx` | Add `setRequestLocale(locale)` |
| `src/app/[locale]/page.tsx` | Ensure static-compatible |
| `src/i18n.ts` | Split namespaces |

---

## Static Rendering Checklist

- [x] API verified: `setRequestLocale` available
- [ ] Add to layout.tsx
- [ ] Update generateStaticParams
- [ ] Split JSON namespaces
- [ ] Test build
- [ ] Verify cache headers
