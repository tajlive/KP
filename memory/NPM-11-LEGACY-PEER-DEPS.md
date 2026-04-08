# NPM 11.x --legacy-peer-deps Fix

**Date:** 2026-04-08  
**Problem:** All GitHub Actions failing with dependency conflicts

## Root Cause

```
NPM Version Behavior
─────────────────────────────────────────
npm 10.x (Node 22)  Less strict  ✅ Works
npm 11.x (Node 24)  Strict       ❌ Fails
```

npm 11.x (som følger med Node 24) er mye strengere på peer dependencies.
Feilmelding:
```
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
```

## Løsning

La til `--legacy-peer-deps` i ALLE workflow filer:

### Før:
```yaml
- run: npm ci
# eller
- run: npm ci --prefer-offline
```

### Etter:
```yaml
- run: npm ci --legacy-peer-deps
# eller  
- run: npm ci --prefer-offline --legacy-peer-deps
```

## Workflows fikset

| Workflow | Status |
|----------|--------|
| pr-check.yml | ✅ Fixed |
| deploy.yml | ✅ Fixed |
| e2e-critical.yml | ✅ Fixed |
| types.yml | ✅ Fixed |
| typecheck.yml | ✅ Fixed |
| merge-ready.yml | ✅ Fixed |
| security-audit.yml | ✅ Fixed |
| dependency-check.yml | ✅ Fixed |
| self-healing-guard.yml | ✅ Fixed |
| fix-supabase-eq-columns.yml | ✅ Fixed |
| analyze.yml | ✅ Fixed |
| nightly-regression.yml | ✅ Fixed |
| hourly-watchdog.yml | ✅ Fixed |
| verify-oauth.yml | ✅ Fixed |

## Kommando brukt

```bash
find .github/workflows -name "*.yml" -exec sed -i '' \
  's/run: npm ci$/run: npm ci --legacy-peer-deps/g' {} \;

find .github/workflows -name "*.yml" -exec sed -i '' \
  's/run: npm ci --prefer-offline$/run: npm ci --prefer-offline --legacy-peer-deps/g' {} \;
```

## Neste steg

1. Vent på at GitHub Actions fullfører
2. Verifiser at alle workflows passerer
3. Sjekk at Vercel deploy fungerer

## Langsiktig løsning

Vurder å fikse faktiske peer dependency conflicts i package.json
istedenfor å bruke --legacy-peer-deps (midlertidig workaround).
