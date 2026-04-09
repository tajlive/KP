
## Vercel Error: use-node-version in .npmrc

**Error Message:**
```
Error: Detected unsupported "use-node-version" in your ".npmrc". 
Please use "engines" in your "package.json" instead.
```

**Solution:**
```bash
# Fjern fra .npmrc:
use-node-version=24.14.1  # ❌ FJERNES

# Behold kun:
engine-strict=true        # ✅ BEHOLDES

# Bruk engines i package.json isteden:
"engines": {
  "node": "24.14.1"
}
```

**Date:** 2026-04-09
**Fix Commit:** 856f7c665

## Vercel Error: npm ci ERESOLVE dependency conflict

**Error Message:**
```
npm error ERESOLVE could not resolve
npm error peer framer-motion@"^10.18.0" from @coinbase/cds-web@8.62.1
npm error Found: framer-motion@12.38.0
```

**Solution:**
```bash
# .npmrc:
engine-strict=true
legacy-peer-deps=true  # ✅ Legg til denne
```

**Note:** Vercel uses `npm ci` which doesn't accept CLI flags.
.npmrc applies to all npm commands automatically.

**Date:** 2026-04-09
**Fix Commit:** 33c133e3c

## Vercel Error: Sanity Studio + React 19 createContext

**Error Message:**
```
Error: Failed to collect page data for /studio/[[...tool]]
TypeError: a6.default.createContext is not a function
```

**Cause:** Sanity Studio not compatible with React 19

**Temporary Solution:**
```bash
# .vercelignore:
src/app/studio/  # Exclude from build
```

**Permanent Fix:** Wait for Sanity to update for React 19

**Date:** 2026-04-09
**Fix Commit:** 5d0036c2a

## Vercel Warning: middleware file convention deprecated

**Warning Message:**
```
⚠ The "middleware" file convention is deprecated. 
Please use "proxy" instead. 
Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

**Status:** ACCEPTED / KNOWN ISSUE

**Why we keep middleware.ts:**
- proxy.ts breaks auth/session handling
- Users get kicked out immediately after login
- "expired=1" redirect loop

**Solution:** Stay on middleware.ts until Next.js fixes proxy.ts compatibility
or we find a working auth solution with proxy.

**Date:** 2026-04-09
**Decision:** Keep middleware.ts (auth stability > deprecation warning)
