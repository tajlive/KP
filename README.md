# Klarpakke 🎭

Norges første krypto-trading skole. Lær krypto med AI-drevet paper trading, JokerTrade auto-trading og kurs.

**[klarpakke.no](https://www.klarpakke.no)** | **[GitHub](https://github.com/tajlive/KP)**

---

## 🚀 Kom i gang

```bash
npm install
npm run dev          # Start lokal server på :3000
```

## 🧪 Tester

```bash
# Smoke-tester (raske, mot prod)
npx playwright test --config=playwright.allure.config.ts --project=chromium e2e/smoke/

# Golden path (autentisert — krever testbruker)
E2E_TEST_EMAIL=e2e-test@klarpakke.no E2E_TEST_PASSWORD=*** \
  npx playwright test e2e/golden-path-auth.spec.ts

# Simuler alle testbrukere
npx playwright test e2e/simuler-testbrukere.spec.ts

# Alle tester
npm run test:ci
```

**Testdekningsstatus:** 34 tester, 100% grønn ✅

| Suite | Tester | Hva |
|-------|:------:|-----|
| Golden path (auth) | 6 | Login → Dashboard → JokerTrade |
| Smoke (health + critical) | 13 | HTTP 200, skjemaer, API |
| Testbruker-simulering | 15 | 5 brukere × 3 steg |

---

## 🏗️ Arkitektur

| Lag | Teknologi |
|-----|-----------|
| **Frontend** | Next.js 16 + React 19 + Tailwind CSS 4 |
| **Backend** | Next.js API routes + Supabase Edge Functions |
| **Database** | Supabase (Postgres + RLS + Realtime) |
| **Hosting** | Cloudflare Workers (OpenNext.js) |
| **Betaling** | Stripe Checkout |
| **E-post** | Resend |
| **Error tracking** | GlitchTip (Sentry-kompatibel) |
| **Trading** | Binance API (proxy via Edge Function) |

### Trading engine

Paper og live trading bruker samme `executeTrade()` pipeline. Mode bestemmer execution-adapter:

```
PaperExecutor  →  Simulert kjøp/salg (paper_trades)
BinanceExecutor →  Ekte Binance API (webhook)
```

- **SmartTrader v3.1:** Anti-crash (maks 50 trades/session, Binance-validering før oppstart, spredd kjøring)
- **AI Auto-Healing:** Fikser hengende sesjoner og API-feil automatisk
- **pg_cron:** 4 jobs som kjører 24/7 i Supabase-skyen

### Auth

Alle bruker-data går gjennom RLS (Row Level Security). Service-role kun for cron/system-ruter.

---

## 🚢 Deploy

```bash
# Push til main → auto-deploy via Workers Builds + GH Actions
git push origin main

# Manuell deploy
npx wrangler deploy --minify --var APP_VERSION:$(git rev-parse --short HEAD)

# Verifiser
curl -s https://www.klarpakke.no/api/health
```

### CI/CD pipeline

```
PR → main:
  ├── Lint + tsc
  ├── E2E smoke (13 tester)
  ├── Golden path E2E (6 tester)
  └── Alle må være grønne → merge tillatt

Push main:
  └── Workers Builds auto-deploy → smoke test

Push staging:
  └── Deploy til staging.klarpakke.no
```

Workflows: `.github/workflows/`

---

## 🔑 Miljøvariabler

Kreves i `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
STRIPE_SECRET_KEY=
BINANCE_PROXY_SECRET=
```

---

## 📊 Status

| Tjeneste | Status |
|----------|:------:|
| Prod | ✅ Healthy |
| E2E | ✅ 34/34 |
| pg_cron | ✅ 4 jobs |
| SmartTrader | ✅ v3.1 |
| Leaderboard | ✅ 15 tradere |
| Testbrukere | ✅ 6 stk |

---

## 📁 Nøkkelfiler

| Fil | Hva |
|-----|-----|
| `.hermes.md` | Arkitekt-dokumentasjon (AI-agent) |
| `.kimi/` | AI workflow-regler |
| `src/lib/trading/` | Trading engine |
| `supabase/functions/` | Edge Functions |
| `supabase/migrations/` | Database-versjonering |
| `e2e/` | Playwright E2E-tester |
| `.github/workflows/` | CI/CD |
