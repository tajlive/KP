
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
