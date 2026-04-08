# Test Gap Analysis - Build Failures Not Caught

**Date:** 2026-04-08  
**Issue:** Build failures in CI not caught by tests  
**Root Cause:** Test coverage doesn't include actual Next.js build

## Problem

Build feiler på Vercel med:
1. `styled-components` mangler (Module not found)
2. `rxjs` barrel optimize feil
3. Tidligere: Minneproblemer under bygg

## Hvorfor tester ikke fanget dette

### 1. GitHub Actions Workflow (deploy.yml)
```yaml
- name: Build
  run: npm run build
```

**Problemet:** Bygget kjører i CI, MEN:
- Feilen oppstår bare på Vercel (forskjellig miljø)
- `styled-components` feilen vises ikke i lokal bygg
- `rxjs` barrel optimize er et Next.js 15 + Webpack 5 issue

### 2. PR Check Workflow
```yaml
- name: Type check
  run: npm run type-check  # tsc --noEmit
- name: Test
  run: npm run test:unit    # Vitest
- name: Build
  run: npm run build        # next build  
```

**Mangler:**
- [ ] E2E tester mot faktisk bygd app
- [ ] Vercel Preview Deploy i PR
- [ ] Dependency validation (unused/missing)

### 3. Lokal vs Vercel Forskjeller

| Miljø | Node | npm | Resultat |
|-------|------|-----|----------|
| Lokal | 22.x | 10.x | Bygger OK |
| Vercel | 24.14.1 | 11.11.0 | Feiler |

**Årsak:** Vercel bruker nyere npm (11.x) som håndterer dependencies annerledes

## Løsninger Implementert

### Kortsiktig (Emergency)
- [x] `ignoreBuildErrors: true` i next.config.mjs
- [x] `sentryShouldUpload = false`
- [x] `NODE_OPTIONS=--max-old-space-size=8192`

### Langsiktig (Todo)
- [ ] Legge til `styled-components` i package.json
- [ ] Fikse `rxjs` imports (unngå barrel optimize)
- [ ] Aktivere Vercel Preview for alle PRs
- [ ] Legge til `npm ls --prod` check i CI
- [ ] Synkronisere Node/npm versjoner (.nvmrc = 24.x)

## Lærdom

> "Testene passerer, men produksjon feiler" 

Vi trenger:
1. **Identisk miljø** i CI og produksjon
2. **Preview deploys** for alle endringer
3. **Dependency linting** i pre-commit
4. **E2E tester** mot bygd app, ikke dev server

## Filer å overvåke

- `package.json` - missing dependencies
- `next.config.mjs` - experimental.optimizePackageImports
- `.github/workflows/pr-check.yml` - add build step
- `.github/workflows/deploy.yml` - add preview step
