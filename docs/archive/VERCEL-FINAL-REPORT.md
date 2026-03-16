# Vercel Final Report – klarpakke

**Dato:** 2026-02-21  
**Utført av:** Kimi Code CLI (Vercel-modus)  
**Prosjekt:** klarpakke  
**Dashboard:** https://vercel.com/tom-jensens-projects/klarpakke  

---

## 1. Nåværende Vercel-oppsett (funnet i repo)

### vercel.json
```json
{
    "framework": "nextjs",
    "buildCommand": "npm run lint && npm run type-check && next build",
    "installCommand": "npm install --legacy-peer-deps --no-audit --no-fund",
    "outputDirectory": ".next",
    "functions": {
        "src/middleware.ts": {
            "runtime": "edge"
        }
    }
}
```

### package.json
- `vercel-build` script: `npm run lint && npm run type-check && npm run build`
- `@vercel/analytics`: ^1.6.1 (installert)
- `@vercel/speed-insights`: ^1.3.1 (installert)

### Forholdet mellom Vercel-build og GitHub Actions

| Aspekt | GitHub Actions | Vercel |
|--------|----------------|--------|
| **Eier bygg til Production** | ✅ Ja (Cloud Run) | ❌ Nei |
| **Eier bygg til Preview** | ❌ Nei | ✅ Ja |
| **Kjører lint/type-check** | ✅ Ja | ✅ Ja (vercel.json) |
| **Deployer til produksjon** | ✅ Ja (Cloud Run) | ❌ Nei |
| **Analytics** | ❌ Nei | ✅ Ja (SDK i koden) |
| **Speed Insights** | ❌ Nei | ✅ Ja (SDK i koden) |

**Konklusjon:** GitHub Actions eier CI/CD til produksjon (Cloud Run). Vercel brukes for Preview deployments og Analytics/Speed Insights.

---

## 2. Anbefalt deploy-policy

### Branch-strategi

| Branch | Miljø | Bygger | Deployer | Formål |
|--------|-------|--------|----------|--------|
| `main` | Production | GitHub Actions | Cloud Run | Live site (www.klarpakke.no) |
| `main` | Production | Vercel | ❌ Skal IKKE bygge | Deaktiver i Vercel |
| `feature/*` | Preview | Vercel | Vercel Preview | QA, demo, testing |
| `bugfix/*` | Preview | Vercel | Vercel Preview | QA, demo, testing |
| `dependabot/**` | Ignorer | - | - | Skip builds |

### Konfigurasjon i Vercel Dashboard

**Project → Settings → Git:**

```
Production Branch: main
⚠️ VIKTIG: Men vi skal IKKE bygge main i Vercel!
```

**Hvordan deaktivere Production-bygg i Vercel:**

Det finnes ingen direkte "disable production" knapp i Vercel, men vi kan bruke **Ignored Build Step**:

1. Gå til Project → Settings → Git
2. Finn "Ignored Build Step"
3. Legg til følgende command:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then echo "Skipping main branch build (uses Cloud Run)"; exit 0; fi
```

Dette vil avbryte bygg for main branch, men tillate Preview builds for andre branches.

---

## 3. Previews: Oppsett og ryddingolicy

### Hvilke branches skal ha preview

**Automatisk Preview for:**
- Alle Pull Requests mot `main`
- Alle branches som ikke er `main`

**Ingen Preview for:**
- `main` branch (bruker Cloud Run)
- `dependabot/**` branches (støy)
- `chore/**` branches (hvis ønskelig)

### Ignored Build Step (avansert)

For å redusere støy, legg til i Vercel:

```bash
#!/bin/bash

# Ignorer bygg for main (bruker Cloud Run)
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "🛑 Skipping build: main branch uses Cloud Run"
  exit 0
fi

# Ignorer bygg for dependabot (støy)
if [[ "$VERCEL_GIT_COMMIT_REF" == dependabot/* ]]; then
  echo "🛑 Skipping build: Dependabot branch"
  exit 0
fi

# Bygg alt annet
echo "✅ Building branch: $VERCEL_GIT_COMMIT_REF"
exit 1
```

**Hvordan legge til:**
1. Vercel Dashboard → Project → Settings → Git
2. Scroll ned til "Ignored Build Step"
3. Velg "Command" og lim inn scriptet over
4. Klikk "Save"

### Hvordan bruke previews

**Formål med previews:**
1. **Visuell QA** – Se at UI ser riktig ut før merge
2. **Demo** – Vise funksjonalitet til interessenter
3. **Testing** – Teste på forskjellige enheter
4. **Deling** – Dele lenke med team/medspillere

**Når previews IKKE bør brukes:**
- For backend/API testing (bruk Cloud Run)
- For ytelsestesting (Preview ≠ Production)
- For sikkerhetstesting (Preview har andre env-variabler)

---

## 4. Environment variables

**Se detaljert plan i:** `VERCEL-ENV-PLAN.md`

### Viktigste variabler å sette i Vercel

**For at appen skal fungere i Preview:**

| Variabel | Production | Preview | Hvor finner jeg verdi? |
|----------|:----------:|:-------:|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_APP_URL` | https://www.klarpakke.no | [preview-url] | Hardkodet |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pk_live_xxx | pk_test_xxx | Stripe Dashboard → API keys |

**Hvordan sette i Vercel:**
1. https://vercel.com/tom-jensens-projects/klarpakke
2. Settings → Environment Variables
3. Legg til hver variabel med riktig verdi
4. Velg miljø: Production / Preview / Development

### Viktig: Ikke sett server-side secrets i Vercel!

Følgende skal KUN være i Cloud Run (via GitHub Actions):
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- Alle Vipps-variabler
- Alle Binance-variabler
- `PERPLEXITY_API_KEY`

---

## 5. Analytics & Speed Insights

**Se detaljert checklist i:** `VERCEL-ANALYTICS-CHECKLIST.md`

### Status i kode

| Komponent | Status | Lokasjon |
|-----------|--------|----------|
| `@vercel/analytics` | ✅ Installert | package.json |
| `@vercel/speed-insights` | ✅ Installert | package.json |
| `<Analytics />` | ✅ Brukt | src/app/[locale]/layout.tsx |
| `<SpeedInsights />` | ✅ Brukt | src/app/[locale]/layout.tsx |

### Status i Dashboard (MANUELL VERIFIKASJON NØDVENDIG)

| Komponent | Aktivert? | Data vises? |
|-----------|:---------:|:-----------:|
| Analytics | ⬜ Sjekk | ⬜ Sjekk |
| Speed Insights | ⬜ Sjekk | ⬜ Sjekk |

**Hvordan aktivere:**
1. Gå til https://vercel.com/tom-jensens-projects/klarpakke
2. Klikk på **Analytics** → "Enable Analytics"
3. Klikk på **Speed Insights** → "Enable Speed Insights"
4. Vent 5-10 minutter på første data

### Viktig merknad om Analytics

Siden produksjons-trafikk går til Cloud Run (ikke Vercel), vil ikke Vercel Analytics automatisk se denne trafikken. Men: Analytics SDK-en i koden (`<Analytics />`) sender data til Vercel uavhengig av hosting.

**Forventet oppførsel:**
- ✅ Preview deployments → Data vises i Vercel Analytics
- ✅ Production (Cloud Run) → Data skal vises (via SDK)
- ⬜ Verifiser at det faktisk fungerer (manuell sjekk nødvendig)

---

## 6. Konkrete TODOs for repo-eier (i Vercel UI)

### Umiddelbart (i dag)

- [ ] **1. Konfigurer Ignored Build Step for main**
  - Gå til: https://vercel.com/tom-jensens-projects/klarpakke/settings/git
  - Finn "Ignored Build Step"
  - Legg til: `if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 0; fi`
  - Dette hindrer Vercel i å bygge main (bruker Cloud Run)

- [ ] **2. Sett opp Environment Variables i Vercel**
  - Gå til: https://vercel.com/tom-jensens-projects/klarpakke/settings/environment-variables
  - Legg til: `NEXT_PUBLIC_SUPABASE_URL` (alle miljøer)
  - Legg til: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (alle miljøer)
  - Legg til: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test for Preview)
  - Legg til: `NEXT_PUBLIC_APP_URL` (https://www.klarpakke.no)

- [ ] **3. Aktiver Analytics i dashboardet**
  - Gå til: https://vercel.com/tom-jensens-projects/klarpakke/analytics
  - Klikk "Enable Analytics"
  - Verifiser at `<Analytics />` er i koden (✅ bekreftet)

- [ ] **4. Aktiver Speed Insights i dashboardet**
  - Gå til: https://vercel.com/tom-jensens-projects/klarpakke/speed-insights
  - Klikk "Enable Speed Insights"
  - Verifiser at `<SpeedInsights />` er i koden (✅ bekreftet)

### Kortsiktig (denne uken)

- [ ] **5. Test Preview-deployment**
  - Lag en test-PR mot main
  - Verifiser at Vercel Preview deployes
  - Sjekk at Preview-URLen fungerer
  - Lukk PR når testet

- [ ] **6. Verifiser at main IKKE bygger i Vercel**
  - Merge en liten endring til main
  - Verifiser at Vercel ignorerer bygget
  - Verifiser at GitHub Actions deployer til Cloud Run

- [ ] **7. Sjekk Analytics-data**
  - Vent 24 timer etter aktivering
  - Sjekk at data vises i Analytics-dashboard
  - Sjekk at Speed Insights viser Core Web Vitals

### Langsiktig (valgfritt)

- [ ] **8. Vurder å deaktivere Preview for dependabot-branches**
  - Utvid Ignored Build Step til å skippe `dependabot/**`

- [ ] **9. Sett opp egne Preview-env-variabler**
  - Hvis du vil ha separate test-keys for Preview

---

## 7. Oppsummering og anbefalinger

### Hva vi har dokumentert

| Dokument | Formål |
|----------|--------|
| `VERCEL-ENV-PLAN.md` | Hvilke env-variabler som skal settes i Vercel |
| `VERCEL-ANALYTICS-CHECKLIST.md` | Sjekkliste for Analytics & Speed Insights |
| `VERCEL-FINAL-REPORT.md` | Denne filen – komplett oversikt |

### Anbefalt arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        DEVELOPER                            │
│                      (lokal utvikling)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ push til feature-branch
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      GITHUB ACTIONS                         │
│              (lint, type-check, test, build)                │
└───────────────────────────┬─────────────────────────────────┘
                            │ merge til main
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐          ┌──────────────────────────┐  │
│  │   VERCEL        │          │   CLOUD RUN (GCP)        │  │
│  │   (Previews)    │          │   (Production)           │  │
│  │                 │          │                          │  │
│  │ • Feature PRs   │          │ • www.klarpakke.no       │  │
│  │ • QA/Demo       │          │ • Live traffic           │  │
│  │ • Analytics SDK │          │ • Secrets (GCP SM)       │  │
│  │                 │          │                          │  │
│  └─────────────────┘          └──────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   VERCEL ANALYTICS & SPEED INSIGHTS                 │   │
│  │   (data fra både Preview og Production)             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Viktigste punkter

1. **GitHub Actions eier Production** – Vercel skal ikke bygge main
2. **Vercel eier Previews** – For QA og testing av PRs
3. **Analytics fungerer uavhengig** – SDK i koden sender data til Vercel
4. **Env-variabler må settes i Vercel** – For at Preview skal fungere
5. **Server-secrets kun i Cloud Run** – Aldri i Vercel

---

## 8. Referanser

### Vercel Dashboard
- Prosjekt: https://vercel.com/tom-jensens-projects/klarpakke
- Analytics: https://vercel.com/tom-jensens-projects/klarpakke/analytics
- Speed Insights: https://vercel.com/tom-jensens-projects/klarpakke/speed-insights
- Settings: https://vercel.com/tom-jensens-projects/klarpakke/settings

### Dokumentasjon i repo
- `VERCEL-ENV-PLAN.md` – Environment variables
- `VERCEL-ANALYTICS-CHECKLIST.md` – Analytics oppsett
- `vercel.json` – Vercel konfigurasjon
- `GITHUB-CI-DIAGNOSE.md` – GitHub Actions diagnose (relatert)

### GitHub Actions (primær CI)
- Actions Dashboard: https://github.com/tajlive/KP/actions
- Cloud Run Deploy: `.github/workflows/deploy-cloudrun.yml`
- CI Workflow: `.github/workflows/ci.yml`

---

*Rapport generert: 2026-02-21*  
*Status: ✅ Klar for manuell konfigurasjon i Vercel UI*
