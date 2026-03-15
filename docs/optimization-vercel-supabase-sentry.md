# Optimalisering: Vercel, Supabase, Sentry (Klarpakke)

Dette dokumentet er tilpasset **Klarpakke** (Next.js 15, Supabase, Sentry).

## 🚀 Automatisering

De fleste innstillinger kan nå konfigureres automatisk via CLI/API:

```bash
# Kjør optimaliseringsskript
./scripts/optimize-services.sh

# Eller med dry-run for å se hva som vil endres
./scripts/optimize-services.sh --dry-run --verbose
```

**Scriptet håndterer automatisk:**
- ✅ Synkronisering av Vercel miljøvariabler til Preview
- ✅ Supabase Auth URLs (site_url, redirect_urls)
- ✅ Supabase config.toml push
- ✅ Sentry CLI konfigurasjon (.sentryclirc)
- ✅ Validering av alle konfigurasjoner

**Ekstra scripts:**
- `scripts/configure-auth-urls.ts` – Supabase Auth via API
- `scripts/configure-vercel.ts` – Vercel prosjekt via API

---

## Prosjektinfo (fra MCP / kodebase)

| Tjeneste | Prosjekt / Org | ID / Slug | Region |
|----------|----------------|-----------|--------|
| **Supabase** | klarpakke-prod | `vuxbjlykgmzskxbclquf` | eu-central-1 |
| **Sentry** | Org: elbatt-chatbot, Prosjekt: klarpakke-production | — | https://de.sentry.io |
| **Vercel** | klarpakke | (fra Vercel dashboard) | — |

---

## 1. Vercel – anbefalte innstillinger

**Dashboard:** [vercel.com](https://vercel.com) → Prosjekt **klarpakke**

### General
- **Framework Preset:** Next.js (auto)
- **Build Command:** `next build` (default) – ikke overstyr med `vercel build` med mindre nødvendig
- **Output Directory:** (tom / default)
- **Install Command:** `npm install` eller `npm ci` for CI
- **Node.js Version:** 22.x (samsvar med `engines` / CI)

### Environment Variables
- **Production og Preview:**  
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SENTRY_AUTH_TOKEN`, `VERCEL_TOKEN` (brukes av CLI/GitHub).  
  Se også `.github/GITHUB_SETUP.md` og `.github/SETUP_SECRETS.md`.
- **Preview:** Ha samme Supabase-env som production slik at preview ikke kaster «Supabase URL and API key required».

### Build & Development
- **Root Directory:** (tom)
- **Ignore Build Step:** (tom) eller script som kun bygger ved endringer i `src/`, `package.json`, `next.config.mjs`

### Functions (Serverless)
- **Max Duration:** 10–60 s avhengig av tungeste API-ruter (f.eks. AI/routes)
- **Memory:** 1024 MB default; øk kun for tunge jobs
- **Region:** Samme som brukere (f.eks. `iad1` eller nærmeste EU)

### Speed / Caching
- **Edge Network:** Default (Vercel CDN)
- **Caching:** Respektér `Cache-Control` fra app (allerede satt der det trengs)

### Deployment Protection
- **Vercel Authentication:** Valgfritt for preview (beskytter preview-URLer)
- **Bypass:** Bruk `vercel curl --deployment` for å teste beskyttede deployer

### Domains
- **Production:** `www.klarpakke.no` (og evt. `klarpakke.no` → redirect til www)
- **Preview:** Auto *-klarpakke.vercel.app

---

## 2. Supabase – anbefalte innstillinger

**Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard) → Prosjekt **klarpakke-prod** (ref: `vuxbjlykgmzskxbclquf`)

### General
- **Region:** eu-central-1 (behold – lav latency mot Norge/EU)
- **Postgres:** 17 (ga) – allerede oppgradert

### Database
- **Connection pooling:** Bruk **Transaction** mode for serverless (korte forbindelser). Connection string med `:6543` (pooler).
- **Statement timeout:** 8–15 s for API-kall; juster ved behov for tunge rapporter.
- **Max connections (pooler):** La default; øk kun ved dokumentert behov.

### API / Auth
- **API URL:** `https://vuxbjlykgmzskxbclquf.supabase.co` (env: `NEXT_PUBLIC_SUPABASE_URL`)
- **anon key:** Kun for lesing/skriving der RLS tillater; bruk **service_role** kun på server (aldri i klient).
- **Auth → URL Configuration:**  
  Site URL: `https://www.klarpakke.no`  
  Redirect URLs: inkluder `https://www.klarpakke.no/**`, `https://klarpakke.no/**`, og preview-URLer om du bruker innlogging der.

### Edge Functions (hvis brukt)
- **Region:** Samme som prosjekt (eu-central-1) for lav latency.

### Storage (hvis brukt)
- **File size limit / MIME:** Tilpass etter behov; hold restriksjoner for sikkerhet.

### Backups / Point-in-time recovery
- **PITR:** Anbefalt for produksjon (avhengig av plan).

---

## 3. Sentry – anbefalte innstillinger

**Dashboard:** [elbatt-chatbot.sentry.io](https://elbatt-chatbot.sentry.io) (region: **de.sentry.io**)

**Prosjekt:** **klarpakke-production**

### Project Settings
- **Platform:** Next.js
- **Alerts:** Sett opp alerts for:
  - Høy feilrate (> X %)
  - Nye issue-typer
  - Performance (LCP, FCP) under terskel
- **Inbound Filters:** Filtrer ut forventede feil (f.eks. 404 på favicon) eller miljø (ignorer localhost i prod).

### Source Maps
- **Releases:** Bygg bruker `SENTRY_AUTH_TOKEN`; source maps lastes opp ved build.  
  Verifiser at **Release** matcher `process.env.SENTRY_RELEASE` / build ID slik at stack traces er lesbare.

### Performance
- **Sampling:** 1.0 for errors; reduser transaction sampling (f.eks. 0.1–0.2) for å spare kvote.
- **Traces Sample Rate:** Tilpass (f.eks. 0.1) for å holde volum lavt og kostnad fornuftig.

### Security & Privacy
- **Data Scrubbing:** Slå på for å fjerne sensitive data (passord, tokens, e-post der ønsket).
- **Allow listing (PII):** Unngå å sende unødvendig PII til Sentry.

### Integrations
- **GitHub / Vercel:** Koble repo og deploy for «first deployment» og release-koppling.
- **Slack / e-post:** Valgfritt for varsler.

### Auth token (for build)
- **Scopes:** `project:releases`, `org:read` (som beskrevet i `.github/GITHUB_SETUP.md`).
- Opprett: [elbatt-chatbot.sentry.io/settings/auth-tokens/](https://elbatt-chatbot.sentry.io/settings/auth-tokens/).

---

## 4. Sjekkliste – rask gjennomgang

Kjør `./scripts/optimize-services.sh` for automatisk konfigurasjon, eller verifiser manuelt:

- [x] **Vercel:** Node 22.x, Framework nextjs, env synkronisert til Preview
- [x] **Supabase:** Site URL = `https://www.klarpakke.no`, Redirect URLs inkluderer preview
- [x] **Sentry:** klarpakke-production, tracesSampleRate 0.1 (server) / 0.05 (edge)
- [ ] **Sentry Alerts:** Manuelt – sett opp varsler i dashboard
- [ ] **Vercel Functions:** Manuelt – juster Max Duration ved behov

---

## 5. Automatiseringsmetoder

| Tjeneste | CLI | API | MCP Plugin |
|----------|-----|-----|------------|
| **Vercel** | `vercel env` | ✅ REST API | mcp__claude_ai_Vercel__* |
| **Supabase** | `supabase config push` | ✅ Management API | mcp__claude_ai_Supabase__* |
| **Sentry** | `sentry-cli` | ✅ REST API | mcp__claude_ai_Sentry__* |

**Tokens som kreves:**
- `VERCEL_TOKEN` – for Vercel API (https://vercel.com/account/tokens)
- `SUPABASE_ACCESS_TOKEN` – for Supabase Management API (https://supabase.com/dashboard/account/tokens)
- `SENTRY_AUTH_TOKEN` – for Sentry CLI/API (https://de.sentry.io/settings/auth-tokens/)

Se `.github/GITHUB_SETUP.md` og `.github/SETUP_SECRETS.md` for oppsett.

---

*Sist oppdatert: 15. mars 2026. Automatisert via `scripts/optimize-services.sh`.*
