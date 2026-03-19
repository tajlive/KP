# Vercel Dashboard – Sjekkliste og optimalisering

**Sist oppdatert:** 2026-03-19

Komplett oversikt over anbefalte innstillinger for Klarpakke på Vercel. Gå gjennom hver seksjon i [Vercel Dashboard](https://vercel.com) → klarpakke → Settings.

---

## 1. General

| Innstilling | Anbefalt | Merknad |
|-------------|----------|---------|
| **Project Name** | klarpakke | Bruk `vercel link` for å finne projectId. |
| **Framework Preset** | Next.js | Auto-detektert fra vercel.json / package.json. |
| **Root Directory** | . (tom) | Prosjektet ligger i repo-rot. |
| **Build Command** | `next build` | Overstyres av vercel.json `buildCommand`. |
| **Output Directory** | `.next` | Overstyres av vercel.json. |
| **Install Command** | `npm ci` | Raskere og reproducerbart enn `npm install`. |

---

## 2. Build & Development

| Innstilling | Anbefalt | Merknad |
|-------------|----------|---------|
| **Node.js Version** | 22.x | Settes via `package.json` engines (`"node": "22.x"`). Vercel støtter 20.x, 22.x, 24.x. |
| **Override** | La stå tom | `engines.node` har forrang over dashboard. |
| **Ignored Build Step** | Ikke satt | Bruk kun hvis du vil skippe build (f.eks. docs-only). |

---

## 3. Functions

| Innstilling | Anbefalt | Merknad |
|-------------|----------|---------|
| **Serverless Function Region** | `arn1` (Stockholm) | Nærmest Norge. Alternativ: `iad1` (Washington) hvis US-brukere dominerer. |
| **Max Duration** | 30s (default) | For tunge API-ruter: `export const maxDuration = 60` i route.ts. |
| **Memory** | Default | Øk kun ved spesifikke treg-kjørende ruter. |

---

## 4. Domains

| Domene | Status |
|--------|--------|
| `www.klarpakke.no` | Production |
| `klarpakke.no` | Redirect til www (vercel.json redirects) |
| `*.vercel.app` | Preview deployments |

---

## 5. Environment Variables

Sjekk at disse finnes i **Production** (og Preview om nødvendig):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (f.eks. `https://www.klarpakke.no`)
- `NEXT_PUBLIC_SENTRY_DSN` (valgfri)
- `USDT_NOK_RATE` (valgfri, overskrives av cron)
- Stripe, Resend, Vipps osv. etter behov

**Viktig:** Bruk ikke `vercel env pull` uten backup av `.env.local` – det overskriver eksisterende variabler (Supabase, Vipps, E2E osv.).

---

## 6. Git

| Innstilling | Anbefalt |
|-------------|----------|
| **Production Branch** | `main` |
| **Preview Branches** | Alle andre |
| **Deploy Hooks** | Valgfritt for ekstern trigging |

---

## 7. Cron Jobs (Vercel Pro/Enterprise)

Hvis du bruker Vercel Cron, sjekk at disse matcher `vercel.json`:

- `/api/cron/keepalive` – hver 5. dag kl 06:00 UTC
- `/api/cron/update-usdt-nok` – daglig kl 06:00 UTC

**Merk:** Kilde for cron er Supabase (docs/CRON-SOURCE-OF-TRUTH.md). Vercel Cron er backup eller valgfri.

---

## 8. Security & Performance

| Innstilling | Status |
|-------------|--------|
| **DDoS Protection** | Automatisk (Vercel) |
| **Web Vitals** | Aktivert (Next.js / Vercel Analytics) |
| **Cache** | `.next/cache` + `_next/static` (immutable) |

Headers satt i vercel.json: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.

---

## 9. MCP (Cursor / AI)

For tilgang til Vercel via MCP:

1. **Cursor:** `.cursor/mcp.json` → `"vercel": { "url": "https://mcp.vercel.com/klarpakke/klarpakke" }`
2. Første gang: Cursor viser «Needs login» → autoriser i nettleser (OAuth).
3. Se **docs/VERCEL-MCP-CLI.md** for full oversikt.

---

## 10. Hurtigreferanse

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

Se også: **docs/vercel-build-notes.md**, **docs/VERCEL-MCP-CLI.md**.
