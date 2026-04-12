# Task Plan: TASK-20240412-DEPLOY-PROD

**Status:** 🟡 READY FOR DEPLOY  
**Created:** 2024-04-12 18:45:00  
**Description:** Full test, bygg og deploy til Vercel produksjon med post-deploy verifisering

## Deploy Sjekkliste

### Pre-Deploy (Lokal Verifisering)

```bash
# 1. Sjekk at vi er på clean main
git status
# Forventet: "nothing to commit, working tree clean"

# 2. Pull siste endringer
git pull origin main

# 3. Verifiser miljø
npm run verify
```

### Steg 1: Full Test Suite

#### 1.1 TypeScript Sjekk
```bash
npm run type-check
```
**Forventet resultat:** Ingen errors

#### 1.2 Lint Sjekk
```bash
npm run lint
```
**Forventet resultat:** Kun kjente warnings (98 stk), ingen nye

#### 1.3 i18n Validering
```bash
npm run i18n:validate
```
**Forventet resultat:** 
```
🇳🇴  →  🇬🇧  EN
   Keys: 2007/2007
   ✅  Perfect match!
```

#### 1.4 Unit Tester
```bash
npm run test:unit
```
**Forventet resultat:** Alle tester passerer

### Steg 2: Produksjonsbygg

```bash
npm run build
```

**Verifiser at bygget er suksessfullt:**
- [ ] Ingen TypeScript errors
- [ ] Ingen ESLint errors  
- [ ] Ingen MISSING_MESSAGE errors (i18n)
- [ ] 467 sider generert
- [ ] Build size ~137MB

**Kritiske sjekkpunkter i output:**
```
✓ Compiled successfully
✓ Generating static pages (467/467)
✓ Finalizing page optimization
```

### Steg 3: Pre-Deploy Sjekk

#### 3.1 Sjekk .env.local
```bash
cat .env.local | grep -E "NEXT_PUBLIC_" | head -5
```
**Forventet:** Alle NEXT_PUBLIC_* variabler er satt

#### 3.2 Sjekk Vercel CLI
```bash
npx vercel whoami
```
**Forventet:** "tombomann" (eller riktig bruker)

#### 3.3 Sjekk git status
```bash
git status
```
**Forventet:** Clean working tree

### Steg 4: Deploy til Produksjon

```bash
# Deploy med Vercel CLI
npx vercel --prod --yes
```

**Parametere:**
- `--prod` : Produksjonsdeploy
- `--yes` : Auto-confirm (ikke spør om bekreftelse)

**Forventet output:**
```
🔍  Inspect: https://vercel.com/tombomann/klarpakke/xxxxx
✅  Production: https://www.klarpakke.no
```

### Steg 5: Post-Deploy Verifisering

#### 5.1 Vent på Deploy (2-3 min)
```bash
sleep 180
```

#### 5.2 HTTP Health Check
```bash
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no
```
**Forventet:** `200`

#### 5.3 Sjekk Kritiske Ruter
```bash
# Test hovedsider
curl -s https://www.klarpakke.no/no | head -20
curl -s https://www.klarpakke.no/no/login | head -20
curl -s https://www.klarpakke.no/no/dashboard | head -20
```

#### 5.4 Verifiser i18n Funksjoner
```bash
# Sjekk at hydration ikke har errors
curl -s https://www.klarpakke.no/no | grep -i "missing" || echo "No missing keys found ✅"
```

#### 5.5 Sjekk Auth Funksjonalitet
```bash
# Verifiser at login-side laster
curl -s https://www.klarpakke.no/no/login | grep -q "Logg inn" && echo "Login page OK ✅"
```

### Steg 6: Produksjonsverifisering

#### 6.1 Sentry Check (Ingen nye errors)
- Gå til: https://klarpakke.sentry.io/issues/
- Sjekk at ingen nye errors etter deploy

#### 6.2 Vercel Dashboard Check
- Gå til: https://vercel.com/tombomann/klarpakke
- Sjekk at deploy er "Ready"
- Sjekk at ingen build errors

#### 6.3 Lighthouse Check (Valgfritt)
```bash
npx lighthouse https://www.klarpakke.no/no --preset=desktop --output=json
```
**Forventet:** Score >= 90

### Steg 7: Rollback Plan (Hvis Nødvendig)

Hvis noe går galt:

```bash
# 1. Finn forrige deploy
npx vercel list

# 2. Rollback til forrige versjon
npx vercel rollback

# 3. Verifiser rollback
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no
```

### Endringer som Deployes

Dette deployet inkluderer følgende endringer:

1. **Hydration Fix**
   - `useClientOnly` hook
   - `ClientOnly` komponent
   - `suppressHydrationWarning` på BottomTabs og DashboardContent

2. **OAuth E2E Test Setup**
   - `e2e/fixtures/oauth-mock.ts`
   - `e2e/fixtures/auth-helpers.ts`
   - `e2e/auth/oauth-flow.spec.ts`
   - `data-testid` attributter på login/callback/dashboard

3. **i18n Fix**
   - 8 nye JSON-filer (quizPage, strategyMarketplace, pricing, metadata)
   - Oppdatert `i18n.ts` med nye namespaces
   - Ingen MISSING_MESSAGE errors

### Suksesskriterier

- [ ] Deploy fullført uten feil
- [ ] https://www.klarpakke.no returnerer 200
- [ ] Ingen nye Sentry errors
- [ ] Login-side fungerer
- [ ] Dashboard laster
- [ ] i18n fungerer (ingen missing keys i console)

### Kommandoer Oppsummering

```bash
# Full deploy pipeline
npm run verify && \
npm run type-check && \
npm run lint && \
npm run i18n:validate && \
npm run test:unit && \
npm run build && \
npx vercel --prod --yes && \
sleep 180 && \
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no
```

**Forventet sluttresultat:** `200`

---

**Status:** ✅ READY FOR DEPLOY  
**Risk Level:** MEDIUM (mange filer endret, men alle testet)  
**Estimated Deploy Time:** 5-7 minutter  
**Rollback Ready:** Ja (forrige versjon er stabil)
