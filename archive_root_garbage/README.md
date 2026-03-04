# Klarpakke 🚀

> **Source of Truth** — _Sist oppdatert: 20. Februar 2026_

[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com/tom-jensens-projects/klarpakke)
[![Auto Trade](https://img.shields.io/badge/Auto%20Trade-Produksjon-green)](./docs/auto-trade.md)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)

## 🔄 CI/CD Status

- ✅ **Vercel CI:** Kjører lint, type-check, og build på hver push
- ⏳ **GitHub Actions:** Avventer account reinstatement
- ✅ **Production:** Live på [klarpakke.no](https://www.klarpakke.no)
- ✅ **Auto Deploy:** Vercel via Git push (2-4 min)

---

## 📖 Om Klarpakke

Klarpakke er en norsk lærings- og handelsplattform for kryptovaluta, designet for å gjøre algoritmisk handel tilgjengelig for alle. Plattformen kombinerer risikofritt "Paper Trading" med en trygg vei mot automatisert handel ("Auto Trading") basert på verifiserte strategier.

### Kjernefunksjoner

1. **Paper Trading (Risikofritt)**
   - 1 Million NOK i virtuell kapital
   - Sanntidsdata fra Binance
   - Full simulering av kjøp/salg uten risiko
   - Brukes for å kvalifisere seg til ekte handel

2. **Auto Trading (Algoritmisk)** — [Se docs/auto-trade.md](./docs/auto-trade.md)
   - 4-Fasers Opptrapping: Paper → Micro → Small → Full
   - Innebygd risikostyring (stop-loss, daglige tapsgrenser)
   - 5 strategityper: DCA, Trend, Multisignal, Grid Bot, AI Copy
   - Kjører på Vercel Cron + pg_cron

3. **AI-Drevet Læring**
   - Kursmoduler om blockchain, trading og sikkerhet
   - Integrert coaching i dashboardet

---

## 🛠️ Teknologisk Stack

| Lag           | Teknologi                                                  |
| ------------- | ---------------------------------------------------------- |
| **Frontend**  | Next.js 15 (App Router), React, TypeScript, Tailwind CSS   |
| **Backend**   | Supabase Edge Functions (Deno), Next.js API Routes         |
| **Database**  | PostgreSQL (Supabase) med Row Level Security               |
| **Auth**      | Supabase Auth (Google OAuth + Email)                       |
| **Betaling**  | Stripe (Checkout + webhooks)                               |
| **Hosting**   | Vercel (Edge Runtime for APIer)                            |
| **Scheduler** | Vercel Cron (Grid Bot) + pg_cron (andre strategier)        |
| **Trading**   | Binance API (brukere kobler egne API-nøkler)               |
| **Deploy**    | **Vercel CLI / Git Push** (primær), GitHub Actions (CI/CD) |

---

## 🏗️ Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         BRUKERE                                  │
│                    (Browser, Mobil)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          VERCEL PLATFORM                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Next.js App │  │  API Routes  │  │  Auto Trade        │     │
│  │  - Dashboard │  │  - /api/*    │  │  - Dashboard       │     │
│  │  - Kurs      │  │  - Webhooks  │  │  - Strategier      │     │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘     │
└─────────┼─────────────────┼────────────────────┼────────────────┘
          │                 │                    │
          │ Auth (JWT)      │ SQL/REST           │ HTTP
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │   AUTH          │  │  EDGE FUNCTIONS  │  │  POSTGRESQL    │  │
│  │  - Google OAuth │  │  - strategy-runner│  │  - RLS Enabled │  │
│  │  - Sessions     │  │  - signal-engine  │  │  - pg_cron     │  │
│  └─────────────────┘  │  - get-entitlements│  └────────────────┘  │
│                       └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
          │
          │ Vercel Cron
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL CRON                             │
│  Grid Bot: Kjører hvert minutt → Next.js API Routes             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deploy-strategi

**VIKTIG:** Vi bruker **Vercel Git Push** som primær deploy-metode.

```bash
# Hurtig-deploy via Git
git push origin main

# Eller via Vercel CLI (for preview)
vercel

# Verifiser
curl https://www.klarpakke.no/api/health
```

---

## 🤖 AI-Agenter og Verktøy

| Agent                 | Rolle                  | Verktøy                              |
| --------------------- | ---------------------- | ------------------------------------ |
| **KIMI Code**         | Operasjonsagent        | Shell, gcloud, psql, scripts, deploy |
| **Perplexity/Claude** | Arkitekt/Dokumentasjon | Kodeanalyse, docs, review            |
| **Antigravity**       | Fremtidig hoved-IDE    | Store implementation plans           |

### MCP-oppsett

- **Supabase**: Direkte databasetilgang
- **Filesystem**: Lokal kodebase
- **GitHub**: Repo-operasjoner
- **GCP Sync**: Cloud Run status, scheduler, secrets (i `.mcp-cache/google-cloud/`)

Se [docs/agents-and-tools.md](./docs/agents-and-tools.md) for detaljer.

---

## 📂 Prosjektstruktur

```
klarpakke/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # i18n (no/en/th/zh)
│   │   │   ├── dashboard/      # Bruker Dashboard
│   │   │   ├── admin-dashboard/# Admin Dashboard
│   │   │   └── auto-trading/   # Auto Trade Landing
│   │   └── api/                # API Routes
│   ├── components/             # React-komponenter
│   ├── lib/                    # Hjelpefunksjoner
│   └── middleware.ts           # Auth-middleware
├── supabase/
│   ├── functions/              # Edge Functions
│   │   ├── strategy-runner/    # Hovedstrategi-runner
│   │   ├── signal-engine/      # Signalgenerering
│   │   └── get-entitlements/   # Tilgangssjekk
│   └── migrations/             # Database-migrasjoner
├── .kimi/                      # AI-agent konfigurasjon
│   ├── MASTER_PROMPT.md        # Hovedprompt for agenter
│   ├── DEPLOY_STRATEGY.md      # Deploy-instruksjoner
│   ├── AUTO_TRADE_MASTER_PROMPT.md
│   └── *.sh                    # Setup-scripts
├── docs/                       # Dokumentasjon
│   ├── architecture.md         # Systemarkitektur
│   ├── auto-trade.md           # Auto Trade-detaljer
│   ├── infra-gcp.md            # GCP-infrastruktur
│   ├── auth-and-middleware.md  # Auth-oppsett
│   └── agents-and-tools.md     # Agent-roller
└── Dockerfile                  # Cloud Run-bygg
```

---

## 📚 Dokumentasjon

| Dokument                                                     | Beskrivelse                   |
| ------------------------------------------------------------ | ----------------------------- |
| [docs/architecture.md](./docs/architecture.md)               | Komplett systemarkitektur     |
| [docs/auto-trade.md](./docs/auto-trade.md)                   | Auto Trade-implementasjon     |
| [docs/infra-gcp.md](./docs/infra-gcp.md)                     | GCP-infrastruktur og deploy   |
| [docs/auth-and-middleware.md](./docs/auth-and-middleware.md) | Auth-oppsett og middleware    |
| [docs/agents-and-tools.md](./docs/agents-and-tools.md)       | Agent-roller og MCP           |
| [docs/antigravity.md](./docs/antigravity.md)                 | Antigravity-oppsett           |
| [.kimi/MASTER_PROMPT.md](./.kimi/MASTER_PROMPT.md)           | Hovedprompt for AI-agenter    |
| [.kimi/DEPLOY_STRATEGY.md](./.kimi/DEPLOY_STRATEGY.md)       | Deploy-strategi og kommandoer |

---

## 🔐 Auth og Middleware

- **PROTECTED_ROUTES**: Krever autentisering (/dashboard, /auto-trading, etc.)
- **PUBLIC_ROUTES**: Tilgjengelig uten login (/innlogging, /, etc.)
- Bruker `getUser()` (aldri `getSession()`) for å unngå auth loops
- Auth-loop-fix: Se [.kimi/FIX_AUTH_LOOP.md](./.kimi/FIX_AUTH_LOOP.md)

---

## 📱 Mobil-Optimalisering

75% av brukerne er på mobil. Alle dashboards bruker:

- Responsivt design (horisontal scroll for tabeller)
- Navigasjon tilpasset tommel-bruk
- Optimaliserte fonter og trykkflater

---

## 🛠️ Komme i gang

```bash
# 1. Installasjon
npm ci --legacy-peer-deps

# 2. Miljøvariabler
# Kopier .env.example til .env.local og fyll inn

# 3. Utvikling
npm run dev

# 4. Bygg (før deploy)
npm run build
```

---

## 📝 Viktige kommandoer

```bash
# Deploy til produksjon
gcloud run deploy klarpakke --source . --region us-central1 --project klarpakke-universitet

# Verifiser deploy
curl https://www.klarpakke.no/api/health

# Sjekk Cloud Run logs
gcloud run services logs read klarpakke --region=us-central1

# Deploy Edge Functions
supabase functions deploy

# Sjekk pg_cron jobs
supabase sql "SELECT * FROM cron.job WHERE jobname LIKE 'klarpakke-%';"
```

---

**For spørsmål, se [docs/](./docs/)-mappen eller sjekk [.kimi/MASTER_PROMPT.md](./.kimi/MASTER_PROMPT.md)**

Last updated: lør. 21 feb. 2026 07.22.42 CET

---

## 🏗️ Production Architecture

⚠️ **VIKTIG**: Produksjon kjører på **Vercel**, IKKE Google Cloud Run!

### Platform Stack

- **Hosting**: Vercel (Edge Runtime for APIer)
- **Domain**: [www.klarpakke.no](https://www.klarpakke.no) (custom domain mapping)
- **CI/CD**: Git push → Vercel Build (2-4 min)
- **Auth**: Supabase Auth
- **Framework**: Next.js 15 (App Router)

### Deployment Flow

```text
Git Push (main)
    ↓
Vercel Build Trigger
    ↓
Build (Next.js 15)
    ↓
Deploy to Vercel Edge/Serverless
    ↓
www.klarpakke.no (live)
```

### Critical Environment Variables

**Build Time** (cloudbuild.yaml):

```yaml
--build-arg NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
```

**Runtime** (Cloud Run):

```bash
NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
```

### Manual Deployment

```bash
# Deploy via CLI
vercel --prod
```

### Troubleshooting

**OAuth redirect issues?**

- Sjekk `NEXT_PUBLIC_APP_URL` i Vercel dashboard.
- Verifiser Supabase redirect URLs: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration

**Build failing?**

- Sjekk Vercel build logs.
- Kjør `npm run build` lokalt for å feilsøke.

## Rebuild History

# Trigger rebuild man. 23 feb. 2026 22.27.16 CET
