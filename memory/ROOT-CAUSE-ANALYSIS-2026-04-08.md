# Root Cause Analysis: Total System Failure 2026-04-08

## Spørsmål: Hvordan kunne dette skje med alle systemer?

## Svar: Kaskadefeil på tvers av systemer

### 1. Sentry - Feilet aldri
**Hvorfor ikke?**
- Sentry fanger runtime errors i produksjon
- Men: Build-feil skjer FØR runtime
- Sentry ser ingenting før koden er deployet og kjører
- Auth-feil (session expired) var et bygg/deployment problem, ikke runtime error

**Lærdom:** Sentry fanger IKKE:
- Build-feil
- Deployment-feil
- Dependency conflicts
- CSS-klassefeil

---

### 2. GitHub Actions - Feilet gradvis
**Hva skjedde:**
```
Commit 1: ✅ npm ci fungerte (npm 10.x)
Commit 2: ✅ npm ci fungerte (npm 10.x)
...
Commit X: ❌ npm ci feilet (npm 11.x etter Node 24 oppdatering)
```

**Hvorfor ikke fanget tidligere?**
- `.nvmrc` ble endret til Node 24
- Node 24 bruker npm 11.x
- npm 11.x er MYE strengere på peer dependencies
- Ingen test kjørte `npm ci` med npm 11.x før merge til main

**GitHub Actions feil rekkefølge:**
1. ❌ Dependency conflict (npm 11.x)
2. ❌ Node-policy brudd (hardkodet node-version)
3. ❌ CSS-klasse validering (41 ugyldige klasser)
4. ❌ TypeScript feil (Sanity schemas)

**Lærdom:** 
- PR checks kjørte på gamle cachede dependencies
- Ingen test av "clean install" med ny Node/npm
- Ingen validering av CSS-klasser i PR (bare på push til main)

---

### 3. Vercel - Feilet konsekvent
**Hva skjedde:**
```
Deploy 1: ❌ heap out of memory
Deploy 2: ❌ styled-components manglet
Deploy 3: ❌ rxjs manglet
Deploy 4: ❌ CSS-klasser ugyldige
Deploy 5: ❌ TypeScript feil
```

**Hvorfor ikke fanget tidligere?**
- Vercel Preview deploys var IKKE aktivert for PRs
- Måtte vente til merge til main for å se feil
- Build tok 5+ minutter å feile
- Feilmeldinger var uklare (0ms byggtid = konfigfeil)

**Lærdom:**
- Ingen "Preview deploy" på PR = sent feedback
- Vercel bygger med andre miljøvariabler enn GitHub Actions
- Minnebruk (heap limit) ulikt mellom GitHub og Vercel

---

### 4. Lokale tester - Alle passerte
**Hvorfor?**
```bash
Lokal dev:
- Node 22.x + npm 10.x ✅
- Dependencies allerede installert ✅
- Dev server (ikke bygg) ✅
- Cachede node_modules ✅
```

**Problemer:**
- Ingen kjørte `npm ci` lokalt (brukte eksisterende node_modules)
- Ingen kjørte full `npm run build` (brukte `npm run dev`)
- Ingen testet med Node 24 før deploy
- CSS-klasse validering ikke en del av daglig workflow

---

## Oppsummering: Hvorfor alle systemer feilet

| System | Oppgave | Faktisk feil | Hvorfor ikke fanget |
|--------|---------|--------------|---------------------|
| **Lokal dev** | Utvikling | Fungerte | Brukte gammel Node/npm |
| **GitHub Actions** | CI/CD | Feilet gradvis | Cachede deps, npm 11.x forskjell |
| **Vercel** | Deploy | Feilet alltid | Ingen Preview på PR |
| **Sentry** | Error tracking | N/A | Bygg-feil, ikke runtime |
| **Tester** | Kvalitet | Passerte | Testet ikke bygg |

---

## Hvorfor dette var spesielt ille

### Perfekt storm:
1. **Node 24 oppdatering** → ny npm 11.x
2. **NPM 11.x strengere** → dependency conflicts
3. **Nye dependencies** (styled-components, rxjs) manglet i package.json
4. **CSS-klasser** ble lagt til uten validering
5. **GitHub Actions cache** skjulte problemene i PRs
6. **Vercel Preview** ikke aktivert

---

## Fiks implementert

### Umiddelbar:
- ✅ Node/npm versjoner synkronisert (.nvmrc, package.json engines)
- ✅ --legacy-peer-deps på alle npm ci
- ✅ Manglende dependencies installert (styled-components, rxjs)
- ✅ Alle CSS-klasser fikset (54 klasser i 10 filer)
- ✅ Node-policy brudd fikset

### Langsiktig (må implementeres):
- [ ] Vercel Preview for ALLE PRs
- [ ] "Clean install" test i PR
- [ ] Bygg-test før merge
- [ ] E2E mot bygd app
- [ ] CSS-validering i PR (ikke bare main)
- [ ] Dependency audit i CI

---

## Hvordan forhindre dette i fremtiden

### Regel #1: Identiske miljøer
```yaml
# .github/workflows/pr-check.yml
- uses: actions/setup-node@v5
  with:
    node-version-file: '.nvmrc'  # SAMME som Vercel
    cache: 'npm'

- run: npm ci --legacy-peer-deps  # SAMME som Vercel
```

### Regel #2: Preview på alle PRs
```yaml
- name: Deploy Preview
  uses: vercel/action-deploy@v1
  if: github.event_name == 'pull_request'
```

### Regel #3: Bygg før merge
```yaml
- name: Build test
  run: npm run build  # ALLTID test bygg i PR
```

### Regel #4: Ingen hardkodede versjoner
```yaml
# ❌ Feil:
node-version: '20'

# ✅ Riktig:
node-version-file: '.nvmrc'
```

---

## Konklusjon

> "Alle systemer feilet fordi INGEN systemer testet det SAMME scenariet."

Lokal dev: Node 22 + npm 10 + dev server
GitHub Actions: Node 24 + npm 11 + cachede deps
Vercel: Node 24 + npm 11 + fresh install

**Ingen testet: Node 24 + npm 11 + fresh install + full build**

Dette er hva vi må fikse.
