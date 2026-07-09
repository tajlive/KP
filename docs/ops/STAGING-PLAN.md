# Staging-miljø for Klarpakke — Plan

**Dato:** 2026-07-09
**Forfatter:** Hermes Agent (Lead Architect)
**Status:** Planlagt — ikke implementert

---

## 1. Hva vi har i dag (produksjon)

| Ressurs | Nåværende konfigurasjon |
|---------|------------------------|
| **Worker** | `klarpakke` — enkelt Worker på Cloudflare |
| **Route** | `www.klarpakke.no/*` → zone `328d7de7e8e48308fd4f9d760da5b18f` |
| **CI/CD** | Cloudflare Workers Builds (primær, auto på push til `main`) + GitHub Actions fallback (`workflow_dispatch`) |
| **Database** | Supabase `pskhryjzkobytnfwucrb` (produksjon) |
| **KV** | `KV_KLARPAKKE` (id: `36369d6957c14ef1a25e22dff65fdc79`) |
| **Edge Functions** | 7 stk på samme Supabase-prosjekt (`auto-trade`, `sync-prices`, `signal-engine`, `strategy-runner`, `cron-daily-analysis`, `position-monitor`, `klarpakke-mcp`, `ensemble-signals`) |
| **DNS** | `www.klarpakke.no` CNAME → Workers, proxy via Cloudflare |
| **Secrets** | `CLOUDFLARE_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, stripe-nøkler, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN`, `CRON_SECRET`, etc. |
| **Deploy-kommando** | `npm run cf:build && wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)` |
| **Wrangler-konfig** | `wrangler.jsonc` — worker name, route, assets, KV, observability |
| **Domene** | `klarpakke.no` via Cloudflare DNS (zone-id: `328d7de7e8e48308fd4f9d760da5b18f`) |
| **Smoke test** | 16 sider via curl i CI, sjekker HTTP 200 + "Feilkode:" for Worker-krasj |

---

## 2. Arkitektur — Staging

```
                 staging-branch
                      │
                      ▼
    ┌─────────────────────────────────┐
    │   GitHub Actions (staging.yml)  │
    │   ├── type-check (tsc --noEmit) │
    │   ├── unit tests (vitest)       │
    │   └── cf:build + wrangler deploy│
    └──────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │  Cloudflare Worker: klarpakke-staging │
    │  Route: staging.klarpakke.no/*       │
    │  Env-vars peker til staging Supabase  │
    │  KV: KV_KLARPAKKE_STAGING            │
    └──────┬───────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │  Supabase: pskhryjzkobytnfwucrb      │
    │  (samme prosjekt, staging-schema)    │
    │  - public_staging schema             │
    │  - egne auth-config-redirects        │
    └──────────────────────────────────────┘
```

---

## 3. Cloudflare-ressurser som trengs

### 3.1 Worker: `klarpakke-staging`

**wrangler.jsonc** — legg til ny staging-konfigurasjon. Wrangler støtter environments nativt via `--env staging`.

**Forslag:** Bruk Wrangler environments-funksjon.

Filer som trengs:
- `wrangler.staging.jsonc` — staging-spesifikk overstyring
- Eller utvid `wrangler.jsonc` med `env.staging`-blokk (wrangler >=3.0)

**Nødvendige felter i staging-konfig:**

```jsonc
{
  "name": "klarpakke-staging",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-06-21",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "workers_dev": true,
  "routes": [
    {
      "pattern": "staging.klarpakke.no/*",
      "zone_id": "328d7de7e8e48308fd4f9d760da5b18f"
    }
  ],
  "observability": {
    "enabled": true,
    "logs": { "head_sampling_rate": 1 },
    "traces": { "enabled": true, "head_sampling_rate": 0.1 }
  },
  "kv_namespaces": [
    {
      "binding": "KV_KLARPAKKE",
      "id": "<staging-kv-id>"
    }
  ]
}
```

### 3.2 Worker Route

Ny CNAME i Cloudflare DNS:
```
staging.klarpakke.no  CNAME  <staging-worker>.cloudflare.workers.dev  ⚡ Proxy
```

Må opprettes via:
- Cloudflare Dashboard → DNS → Add record, eller
- `npx wrangler route list` og `npx wrangler route create`

**Alternativ:** Wrangler `deploy` med `--route staging.klarpakke.no/*` oppretter route automatisk.

### 3.3 KV Namespace

Staging trenger egen KV-namespace (skal ikke dele data med prod):

```bash
npx wrangler kv:namespace create "KV_KLARPAKKE" --preview
# → Hent ID fra output
```

Eller opprett via Cloudflare Dashboard → Workers & Pages → KV → Create namespace.

### 3.4 Secrets/Env-variabler

Følgende secrets må settes på `klarpakke-staging` Worker:

| Secret | Verdi | Merknad |
|--------|-------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://staging.klarpakke.no` | Bygges inn i koden |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase URL | Samme prosjekt, annen schema |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Samme prosjekt |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service_role key | Samme prosjekt |
| `SENTRY_AUTH_TOKEN` | Samme eller staging-org | Kan være samme |
| `NEXT_PUBLIC_SENTRY_DSN` | Staging DSN | Annet DSN for staging |
| `NEXT_PUBLIC_GLITCHTIP_DSN` | Staging DSN eller tom | |
| `CRON_SECRET` | Annet secret | Skal ikke kunne trigge prod-cron |
| `STRIPE_SECRET_KEY` | Stripe **test** keys | `sk_test_...` + `whsec_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe test webhook secret | |

Settes via:
```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env staging
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env staging
# ...osv
```

### 3.5 Cloudflare Workers Builds (valgfritt)

Alternativt til GitHub Actions kan staging deployes via Workers Builds, men det er **ikke anbefalt** for staging av to grunner:
1. Workers Builds har kun én branch-tilknytning per Worker
2. Staging trenger type-check + tester FØR deploy — Workers Builds kjører bare `npm run cf:build`

**Konklusjon:** Bruk GitHub Actions for staging-deploy.

---

## 4. Database — Supabase

### To strategier

#### Strategi A: Egen Supabase-instans (ANBEFALT)

Opprett et nytt Supabase-prosjekt:
- **Fordel:** Full isolasjon — kan fritt kjøre migrasjoner, slette data, ødelegge ting uten å påvirke prod
- **Ulempe:** ~$0 (Free tier går fint for staging) men må kopiere skjema
- **Innsats:** ~30 min å opprette + kjøre alle migrasjoner

**Steg:**
1. Opprett nytt Supabase-prosjekt via Dashboard eller CLI:
   ```bash
   npx supabase projects create klarpakke-staging --org-id <org>
   ```
2. Link prosjektet lokalt:
   ```bash
   npx supabase link --project-ref <ny-ref>
   ```
3. Kjør alle migrasjoner:
   ```bash
   npx supabase db push
   ```
4. Konfigurer Auth redirects:
   - `https://staging.klarpakke.no/**`
   - `http://localhost:3000/**`
5. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy --project-ref <ny-ref>
   ```
6. Sett secrets på Edge Functions (samme som prod + staging-spesifikke)

#### Strategi B: Samme prosjekt, eget schema (rimeligere)

Bruk eksisterende Supabase-prosjekt (`pskhryjzkobytnfwucrb`) med et separat schema `staging`.

- **Fordel:** Ingen nytt prosjekt, deler auth/godkjent infrastruktur
- **Ulempe:** Høyere risiko — kan påvirke prod ved feil. Edge Functions kan ikke isoleres per schema.
- **Innsats:** ~15 min å sette opp schema + RLS duplicates

**Anbefaling: Strategi A (egen instans).** Staging skal være trygt å ødelegge. Å dele database med prod er unødvendig risiko.

---

## 5. CI/CD — GitHub Actions

### Ny workflow: `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy Staging

on:
  push:
    branches: [staging]

concurrency:
  group: staging-deploy
  cancel-in-progress: true

env:
  NEXT_TELEMETRY_DISABLED: "1"
  NODE_OPTIONS: "--max-old-space-size=4096"

jobs:
  check:
    name: Type check & Unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci --prefer-offline --legacy-peer-deps
      - run: npx tsc --noEmit
        timeout-minutes: 5
      - run: npx vitest run --reporter=verbose
        timeout-minutes: 5

  deploy:
    name: Build & Deploy to Staging
    needs: check
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v5
        with:
          ref: staging
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci --prefer-offline --legacy-peer-deps

      - name: Build for Cloudflare Workers
        run: npm run cf:build
        env:
          NEXT_PUBLIC_APP_URL: ${{ vars.STAGING_APP_URL || 'https://staging.klarpakke.no' }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}

      - name: Deploy to Staging Worker
        run: npx wrangler deploy --env staging --minify --var APP_VERSION:${{ github.sha }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          NEXT_PUBLIC_APP_URL: ${{ vars.STAGING_APP_URL || 'https://staging.klarpakke.no' }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ vars.STAGING_SUPABASE_PUBLISHABLE_KEY }}

      - name: Smoke test
        run: |
          BASE="https://staging.klarpakke.no"
          for path in /no /no/priser /no/login /no/register /no/om-oss /api/health; do
            code=$(curl -s -o /dev/null -w "%{http_code}" -m10 "$BASE$path")
            if [ "$code" = "200" ]; then echo "  ✅ $path"; else echo "  ❌ $path ($code)"; exit 1; fi
          done
```

### 6. GitHub Secrets som må legges til

| Secret | Verdi |
|--------|-------|
| `STAGING_SUPABASE_URL` | URL for staging Supabase (eller URL med staging schema) |
| `STAGING_SUPABASE_ANON_KEY` | Anon key for staging database |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Publishable key for staging |
| `STAGING_APP_URL` | `https://staging.klarpakke.no` (kan også være vars) |

Eksisterende `CLOUDFLARE_API_TOKEN` kan gjenbrukes så lenge den har rettigheter til å deploye/administrere flere Workers.

---

## 6. Steg-for-steg implementering

### Fase 1: Cloudflare-oppsett (~30 min)

```bash
# 1. Opprett staging Worker (defineres i wrangler med --env staging)
#    Først: opprett kv-namespace for staging
npx wrangler kv:namespace create "KV_KLARPAKKE" --preview

# 2. Opprett DNS-record
#    Gå til Cloudflare Dashboard → DNS → Add record:
#    Name: staging  |  Type: CNAME  |  Target: klarpakke-staging.<account>.workers.dev  |  Proxy: ✅
```

### Fase 2: Wrangler-konfigurasjon (~15 min)

Opprett `wrangler.staging.jsonc` eller utvid `wrangler.jsonc` med:

```jsonc
// Legg til i wrangler.jsonc:
{
  // ... eksisterende config ...
  "env": {
    "staging": {
      "name": "klarpakke-staging",
      "routes": [
        {
          "pattern": "staging.klarpakke.no/*",
          "zone_id": "328d7de7e8e48308fd4f9d760da5b18f"
        }
      ],
      "kv_namespaces": [
        {
          "binding": "KV_KLARPAKKE",
          "id": "<staging-kv-id>"
        }
      ]
    }
  }
}
```

### Fase 3: Database (~30-45 min)

**Alternativ A (anbefalt):** Opprett nytt Supabase-prosjekt
```bash
# Opprett prosjekt
npx supabase projects create klarpakke-staging \
  --org-id <org-id> \
  --region eu-west-1

# Link lokalt
npx supabase link --project-ref <ny-ref>

# Kjør migrasjoner
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy --project-ref <ny-ref>

# Sett secrets
npx supabase secrets set --project-ref <ny-ref> \
  BINANCE_PROXY_SECRET=<...> \
  KLARPAKKE_MCP_SECRET=<...>
```

**Alternativ B:** Eget schema
```sql
CREATE SCHEMA IF NOT EXISTS staging;
-- Kopier tabeller: CREATE TABLE staging.xxx (LIKE public.xxx INCLUDING ALL);
-- Dupliser RLS policies for staging schema
```

### Fase 4: Worker secrets (~15 min)

```bash
npx wrangler secret put NEXT_PUBLIC_APP_URL --env staging
# → https://staging.klarpakke.no

npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env staging
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env staging
npx wrangler secret put CRON_SECRET --env staging
npx wrangler secret put SENTRY_AUTH_TOKEN --env staging
# ... osv
```

### Fase 5: GitHub Actions (~15 min)

1. Legg til staging-secrets i GitHub repo:
   - Settings → Secrets and variables → Actions → New repository secret
   - `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_PUBLISHABLE_KEY`

2. Opprett `.github/workflows/deploy-staging.yml` (se seksjon 5 over)

3. Opprett `staging`-branch:
   ```bash
   git checkout -b staging
   git push origin staging
   ```

### Fase 6: Verifisering (~15 min)

```bash
# 1. Sjekk at Worker er deployed
curl -I https://staging.klarpakke.no

# 2. Sjekk health-endepunkt
curl https://staging.klarpakke.no/api/health | jq .

# 3. Sjekk at prod ikke er påvirket
curl -I https://www.klarpakke.no
```

---

## 7. Tidsestimat

| Fase | Oppgave | Estimert tid |
|------|---------|-------------|
| Fase 1 | Cloudflare DNS + KV | 30 min |
| Fase 2 | Wrangler-konfigurasjon | 15 min |
| Fase 3a | Ny Supabase-instans + migrasjoner | 45 min |
| Fase 3b | Eget schema (alternativ) | 30 min |
| Fase 4 | Worker secrets (per env) | 15 min |
| Fase 5 | GitHub Actions workflow | 15 min |
| Fase 6 | Verifisering | 15 min |
| **Total** | **Alternativ A (anbefalt)** | **~2 timer** |
| **Total** | **Alternativ B** | **~1,5 timer** |

---

## 8. Risiko-analyse

| Risiko | Sannsynlighet | Konsekvens | Tiltak |
|--------|:------------:|:----------:|--------|
| Staging Worker påvirker prod via delt database | Lav (med egen instans) | Høy | Bruk egen Supabase-instans |
| Stripe test keys blandes med live | Medium | Høy | Sjekk at `STRIPE_SECRET_KEY` er `sk_test_` på staging |
| Edge Functions deployet til feil prosjekt | Lav | Medium | `--project-ref` flagg ved deploy |
| Glemmer å oppdatere Auth redirect URLs | Medium | Medium | Legg til `staging.klarpakke.no/**` i Supabase Auth config |
| E2E-tester kjører mot staging i stedet for prod | Lav | Lav | `E2E_BASE_URL` separat per workflow |
| Staging-branch går ut av sync med main | Høy | Lav | Ukentlig `git merge main` eller `git rebase` |
| Byggekostnad: dobbelt Worker = dobbel CPU-tid | Lav (staging brukes sjelden) | Lav | Free Workers har 100k req/dag — staging trenger <1k |

---

## 9. Vedlikehold (etter oppsett)

### Ukentlig
```bash
# Sync staging-branch med main
git checkout staging
git merge main
git push origin staging
```

### Ved hver staging-deploy
- [ ] type-check passerer
- [ ] vitest passerer
- [ ] Smoke test mot `staging.klarpakke.no`
- [ ] Verifiser at prod er upåvirket

### Ved ny database-migrasjon
- **Alternativ A:** Kjør `npx supabase db push --project-ref <staging-ref>` (separat)
- **Alternativ B:** Kjør migrasjon mot staging-schema (samme prosjekt)

### Før staging → produksjon merge
1. Push til staging → bekreft grønn deploy
2. Kjør E2E mot staging
3. Merge staging → main → Workers Builds deployer til prod
4. Verifiser prod

---

## 10. Pakkeliste — hva må gjøres

- [ ] **Cloudflare:** Opprett DNS-record `staging.klarpakke.no` CNAME
- [ ] **Cloudflare:** Opprett KV-namespace `KV_KLARPAKKE_STAGING`
- [ ] **Wrangler:** Legg til `env.staging`-blokk i `wrangler.jsonc`
- [ ] **Supabase:** Opprett nytt prosjekt `klarpakke-staging`
- [ ] **Supabase:** Kjør alle migrasjoner mot staging
- [ ] **Supabase:** Deploy Edge Functions til staging-prosjektet
- [ ] **Supabase:** Oppdater Auth config med staging redirect URLs
- [ ] **Secrets:** Sett alle Worker secrets via `wrangler secret put --env staging`
- [ ] **GitHub:** Legg til `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` som repo secrets
- [ ] **GitHub:** Opprett `deploy-staging.yml` workflow
- [ ] **Git:** Opprett `staging` branch og push
- [ ] **Test:** Verifiser `curl https://staging.klarpakke.no/api/health`
- [ ] **Test:** Verifiser prod upåvirket
