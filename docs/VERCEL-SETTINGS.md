# Vercel Dashboard – Sjekkliste og optimalisering

**Sist oppdatert:** 2026-03-21

Komplett oversikt over anbefalte innstillinger for Klarpakke på Vercel. Gå gjennom hver seksjon i [Vercel Dashboard](https://vercel.com) → klarpakke → Settings.

**MCP:** Når Cursor er innlogget mot Vercel MCP (`mcp_auth` fullført), kan agenten lese prosjekt/deploy/build-logger uten manuell kopiering. Uten innlogging må du bruke Dashboard eller `npm run vercel:*` med `VERCEL_TOKEN` i `.env.local` (se **docs/VERCEL-MCP-CLI.md**).

---

## 1. General

| Innstilling          | Anbefalt     | Merknad                                                                                                                                           |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project Name**     | klarpakke    | Bruk `vercel link` for å finne projectId.                                                                                                         |
| **Framework Preset** | Next.js      | Auto-detektert fra vercel.json / package.json.                                                                                                    |
| **Root Directory**   | . (tom)      | Prosjektet ligger i repo-rot.                                                                                                                     |
| **Build Command**    | `next build` | `prebuild` kjører `validate-i18n.js`. På GitHub Actions settes ofte `SKIP_LINT_IN_BUILD=true` (samme som anbefalt lokalt: `npm run build:local`). |
| **Output Directory** | `.next`      | Overstyres av vercel.json.                                                                                                                        |
| **Install Command**  | `npm ci`     | Raskere og reproducerbart enn `npm install`.                                                                                                      |

---

## 2. Build & Development

| Innstilling            | Anbefalt   | Merknad                                                                                                |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| **Node.js Version**    | 24.x       | Settes via `package.json` engines (`"node": "24.x"`). Vercel støtter 20.x, 22.x, 24.x (24 er default). |
| **Override**           | La stå tom | `engines.node` har forrang over dashboard.                                                             |
| **Ignored Build Step** | Ikke satt  | Bruk kun hvis du vil skippe build (f.eks. docs-only).                                                  |

---

## 3. Functions

| Innstilling                    | Anbefalt           | Merknad                                                                   |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| **Serverless Function Region** | `arn1` (Stockholm) | Nærmest Norge. Alternativ: `iad1` (Washington) hvis US-brukere dominerer. |
| **Max Duration**               | 30s (default)      | For tunge API-ruter: `export const maxDuration = 60` i route.ts.          |
| **Memory**                     | Default            | Øk kun ved spesifikke treg-kjørende ruter.                                |

---

## 4. Domains

| Domene             | Status                                   |
| ------------------ | ---------------------------------------- |
| `www.klarpakke.no` | Production                               |
| `klarpakke.no`     | Redirect til www (vercel.json redirects) |
| `*.vercel.app`     | Preview deployments                      |

---

## 5. Environment Variables

Sjekk at disse finnes i **Production** (og Preview om nødvendig). Full liste: **docs/ENVIRONMENT.md**.

**Kjerne**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_APP_URL` → `https://www.klarpakke.no`
- `CRON_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL` (der aktuelt)
- Stripe, Resend, Redis/Upstash, Binance-relatert etter behov

**Sentry (bygg + runtime)**

- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` (server)
- `SENTRY_AUTH_TOKEN` — **påkrevd på Vercel** for at source maps skal lastes opp under build (Vercel setter `VERCEL=1`; se **docs/vercel-build-notes.md §6f**).
- `SENTRY_ORG` (`elbatt-chatbot`), `SENTRY_PROJECT` (`klarpakke-production`) hvis ikke auto-detektert
- **Ikke** sett `SENTRY_UPLOAD_SOURCE_MAPS=false` i Production med mindre du feilsøker — da mister du upload på Vercel også.

**Valgfritt**

- `USDT_NOK_RATE` (cron overskriver)
- Preview-miljø: dupliser nødvendige nøkler eller bruk placeholders der dokumentert i CI

**Viktig — `vercel env pull` overskriver hele `.env.local`:**  
Kun variabler som finnes i **det miljøet du velger** (development / preview / production) kommer med. Mangler f.eks. `NEXT_PUBLIC_SUPABASE_*` i Vercel **Development**, forsvinner de fra filen etter pull — da feiler `npm run dev`.

| Script                           | Miljø          | Bruk                                                                                    |
| -------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `npm run vercel:env`             | **production** | Standard: matcher det meste av det som trengs lokalt (inkl. Supabase hvis satt i prod). |
| `npm run vercel:env:preview`     | preview        | Preview-deploy secrets.                                                                 |
| `npm run vercel:env:development` | development    | Kun hvis du har lagt inn **alle** nødvendige nøkler under Development i Vercel.         |

**Før pull:** `cp .env.local .env.local.bak` — eller gjenopprett `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` fra [Supabase Dashboard](https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/settings/api) hvis de ble borte.

---

## 6. Git

| Innstilling           | Anbefalt                       |
| --------------------- | ------------------------------ |
| **Production Branch** | `main`                         |
| **Preview Branches**  | Alle andre                     |
| **Deploy Hooks**      | Valgfritt for ekstern trigging |

---

## 7. Cron Jobs (Vercel Pro/Enterprise)

Hvis du bruker Vercel Cron, sjekk at disse matcher `vercel.json`:

- `/api/cron/keepalive` – hver 5. dag kl 06:00 UTC
- `/api/cron/update-usdt-nok` – daglig kl 06:00 UTC

**Merk:** Kilde for cron er Supabase (docs/CRON-SOURCE-OF-TRUTH.md). Vercel Cron er backup eller valgfri.

---

## 8. Security & Performance

| Innstilling         | Status                                     |
| ------------------- | ------------------------------------------ |
| **DDoS Protection** | Automatisk (Vercel)                        |
| **Web Vitals**      | Aktivert (Next.js / Vercel Analytics)      |
| **Cache**           | `.next/cache` + `_next/static` (immutable) |

Headers satt i vercel.json: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.

---

## 9. MCP (Cursor / AI)

For tilgang til Vercel via MCP:

1. **Cursor:** `.cursor/mcp.json` → `"vercel": { "url": "https://mcp.vercel.com/klarpakke/klarpakke" }` (team/prosjekt-spesifikk URL gir bedre kontekst).
2. Første gang: åpne MCP-panelet → **Needs login** / `mcp_auth` → fullfør OAuth i nettleser. Uten dette kan ikke agenten lese eller endre Vercel-data.
3. Se **docs/VERCEL-MCP-CLI.md** for CLI-fallback (`VERCEL_TOKEN`).

---

## 10. Optimaliseringsrunde med MCP (etter innlogging)

Kjør denne rekkefølgen i agenten eller manuelt mot [Vercel MCP-verktøy](https://vercel.com/docs/agent-resources/vercel-mcp/tools):

| Steg | Verktøy / handling                                             | Mål                                                       |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | `get_project` (team `klarpakke`, prosjekt `klarpakke`)         | Bekreft Node/Next, root directory, siste deploy-status    |
| 2    | `list_deployments` + `get_deployment` for siste **Production** | Grønn build, forventet commit                             |
| 3    | `get_deployment_build_logs` ved feil                           | Rask rotårsak (env, Sentry, TypeScript)                   |
| 4    | `get_runtime_logs` / Speed Insights                            | 500-takter, trege API-ruter                               |
| 5    | Sammenlign med tabellene §1–§8 over                            | Avvik (f.eks. feil region, manglende `SENTRY_AUTH_TOKEN`) |

**Deploy-policy:** Kilde for cron er Supabase (**docs/CRON-SOURCE-OF-TRUTH.md**); Vercel cron i `vercel.json` er backup — ikke dobbeltdefiner kritiske jobber uten bevisst valg.

---

## 11. Hurtigreferanse

```bash
# Lokalt – hent project/org IDs
vercel link
cat .vercel/project.json

# CLI deploy
npm run deploy:prod

# Verifiser prod
curl -sI https://www.klarpakke.no
npm run verify
```

---

Se også: **docs/vercel-build-notes.md** (§6f Sentry), **docs/VERCEL-MCP-CLI.md**.
