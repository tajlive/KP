# 🎯 KLARPAKKE — MASTER PROMPT

> **Les dette FØR du gjør noe i dette prosjektet.**  
> Dette er den eneste kilden til sannhet. Ingen andre .md-filer i root har autoritet.  
> **Sist oppdatert:** 20. Februar 2026 15:16 CET

---

## 🚨 AKUTT SITUASJON - LES FØRST!

**STATUS:** ✅ OPERATIONAL - Cloudflare Workers hosting aktiv

📢 **SIST OPPDATERT:** 29. Juni 2026 - Migrert til Cloudflare Workers (OpenNext.js + Wrangler)
⚡ **INFRASTRUKTUR:** GitHub → Cloudflare Workers Builds (auto-deploy)  
⏱️ **REGION:** Global (Cloudflare Edge)

Hvis du ikke vet hva som feiler, start her:

```bash
# Quick diagnose
npx wrangler deployment list  # Sjekk CI/CD status
curl -I https://www.klarpakke.no/no  # Sjekk produksjon
npm run cf:build  # Sjekk build lokalt
```

---

## 📚 KRITISKE DOKUMENTER - LES I DENNE REKKEFØLGEN

1. **[WORKFLOW_RULES.md](./WORKFLOW_RULES.md)** ← **STRENGT REGELVERK**
   - ✅ ALLTID gjør / ❌ ALDRI gjør
   - GitHub → Cloudflare Workers → KIMI arbeidsflyt
   - Secrets management
2. **[EMERGENCY_PROD_FIX.md](./EMERGENCY_PROD_FIX.md)** ← **AKUTT FIKS**
   - Diagnose og fiks produksjonsproblemer
   - Steg-for-steg prosedyre
   - Alle kommandoer klar til bruk

3. **[DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)** ← **DEPLOY-STRATEGI**
   - GitHub → Cloudflare Workers Builds (automatisk)
   - Wrangler CLI (backup)
   - Verifisering

4. **[AUTO_TRADE_MASTER_PROMPT.md](./AUTO_TRADE_MASTER_PROMPT.md)**
   - Auto Trading-funksjonalitet
   - Binance API-integrasjon

---

## 🚀 QUICK REFERENCE - WORKFLOW

### Standard arbeidsflyt (kopier-lim inn)

```bash
# Test, commit, push, watch
npm run test:unit && \
git add -A && \
git commit -m "feat: your message" && \
git push origin main && \
gh run watch
```

### ✅ ALLTID GJØR:

1. Push til GitHub først
2. Vent på Cloudflare Workers Builds deployment
3. La KIMI lese via MCP

### ❌ ALDRI GJØR:

1. ❌ Rediger Cloudflare Dashboard direkte (unntatt env vars)
2. ❌ Commit secrets (`.env`, `.mcp-cache/`)
3. ❌ Force push til main
4. ❌ Hopp over tester
5. ❌ Commit uten `npm run build` er OK

---

## 🔒 REGLER — ALDRI BRYT DISSE

1. **ALDRI commit/push uten at `npm run build` er OK lokalt**
2. **ALDRI slett eller endre** `.kimi/`, `.agent/`, `CLAUDE.md`, `.github/`
3. **ALDRI legg rapport/guide-filer i root** — bruk `docs/` eller slett etter bruk
4. **ALDRI hardkod hemmeligheter** — `.env.local` lokalt, Secret Manager i prod
5. **ALDRI bruk `npm install`** — alltid `npm ci --legacy-peer-deps`
6. **ALDRI fjern `output: 'standalone'`** fra `next.config.mjs` — påkrevd for optimal ytelse
7. **ALDRI sett ekte Stripe-nøkler som build-args** — bruk `sk_test_build_only`
8. **ALDRI rediger Cloudflare Dashboard direkte** — GitHub overskriver ved neste deploy (bruk alltid Git som source of truth)
9. **ALDRI commit `.mcp-cache/`** — inneholder sensitive data fra MCP-servere

---

## ✅ PROSJEKT

| Felt                 | Verdi                                                |
| -------------------- | ---------------------------------------------------- |
| **Navn**             | Klarpakke                                            |
| **URL**              | https://www.klarpakke.no                             |
| **Beskrivelse**      | Norsk kryptovaluta-læringsplattform med Auto Trading |
| **Repo**             | https://github.com/tajlive/KP           |
| **Owner**            | tomarnejensen@gmail.com / tom@klarpakke.no           |
| **Hosting**          | Cloudflare Workers (OpenNext.js + Wrangler)          |
| **Region**           | Global (Cloudflare Edge)                             |
| **Supabase Project** | pskhryjzkobytnfwucrb                                 |

---

## 🏭 TECH STACK

| Lag        | Teknologi                                                  |
| ---------- | ---------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), TypeScript, Tailwind CSS          |
| Database   | Supabase (PostgreSQL + Row Level Security)                 |
| Auth       | Supabase Auth (`createServerClient` + `getUser()`)         |
| Betaling   | Stripe (Checkout + webhooks)                               |
| Hosting    | **Cloudflare Workers** (OpenNext.js + Wrangler)            |
| Scheduler  | Cloudflare Cron Triggers + pg_cron                         |
| Trading    | Binance API (brukere kobler egne nøkler)                   |
| **SQL**    | **AI SQL Runner** (auto via `exec_sql` RPC) → se .kimi/SQL_BRAIN.md |
| **Deploy** | **GitHub → Cloudflare Workers Builds** (automatisk) → **Wrangler CLI** (backup) |

---

## 🗄️ SQL AUTOMATION — VIKTIG!

**FIL:** [`.kimi/SQL_BRAIN.md`](./SQL_BRAIN.md) ← **ALL SQL KUNNSKAP**

### Hvordan kjøre SQL (automatisk):

```bash
# 1. Generer SQL (valgfritt - bruk templates)
node scripts/sql-generator.js table new_table user_id:uuid name:text

# 2. Kjør SQL automatisk (ingen copy-paste!)
node scripts/ai-sql-runner.js supabase/migrations/din-fil.sql

# 3. Git push
 git add -A && git commit -m "feat: ny tabell" && git push
```

### SQL Status:
- ✅ `exec_sql()` PostgreSQL funksjon aktiv
- ✅ `ai-sql-runner.js` fungerer
- ✅ `sql-generator.js` for raske tabeller/kolonner
- ✅ Alle migrasjoner i `supabase/migrations/`

### Husk:
- **ALLTID** bruk `IF NOT EXISTS` / `IF EXISTS`
- **ALLTID** aktiver RLS på nye tabeller
- **ALLTID** kjør via `ai-sql-runner.js` - aldri manuell copy-paste!

---

## 🚀 DEPLOY-STRATEGI — VIKTIG!

**Les:** [WORKFLOW_RULES.md](./WORKFLOW_RULES.md)

### Arbeidsflyt-hierarki:

```
1. GitHub (Source of Truth)
   ↓ (automatisk via Cloudflare Workers Builds)
2. Cloudflare Workers Edge Network (Produksjon, global)
   ↓ (KIMI leser via MCP)
3. KIMI AI Agent (Leser og analyserer)
```

### Primær metode: GitHub → Cloudflare Workers Builds (automatisk)

```bash
# Push til GitHub - Cloudflare Workers Builds deployer automatisk
git push origin main

# Monitor deployment (Cloudflare Dashboard eller Wrangler CLI)
npx wrangler deployment list
```

### Backup: Wrangler CLI (hvis auto-deploy feiler)

```bash
# Deploy direkte via Wrangler CLI
npm run cf:deploy
# eller: npm run cf:build && npx wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)
```

---

## 🔑 MILJØVARIABLER

### Runtime (Cloudflare Worker Secrets / Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXTAUTH_URL=https://www.klarpakke.no
NEXTAUTH_SECRET  (Cloudflare Dashboard → Workers & Pages → klarpakke → Settings → Variables)
STRIPE_SECRET_KEY  (Cloudflare Dashboard → Variables)
SUPABASE_SERVICE_ROLE_KEY  (Cloudflare Dashboard → Variables)
RESEND_API_KEY  (Cloudflare Dashboard → Variables)
CRON_SECRET  (Cloudflare Dashboard → Variables)
```

### Build-time (Cloudflare Workers Builds / lokalt)

```
STRIPE_SECRET_KEY=sk_test_build_only   # Dummy
SKIP_ENV_VALIDATION=true
NEXT_TELEMETRY_DISABLED=1
```

### Sette secrets via CLI

```bash
# Cloudflare Worker secrets (Wrangler)
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret list

# GitHub repository secrets
gh secret set MY_SECRET --body "value" --repo tajlive/KP
gh secret list --repo tajlive/KP
```

---

## 📁 MAPPESTRUKTUR

```
klarpakke/
├─ src/
│   ├─ app/              # Next.js App Router
│   ├─ components/       # React-komponenter
│   ├─ lib/              # Supabase-klient, utils
│   ├─ hooks/            # Custom React hooks
│   ├─ types/            # TypeScript-typer
│   └─ middleware.ts     # Auth middleware (VIKTIG!)
├─ supabase/
│   ├─ functions/        # Edge Functions (Deno)
│   └─ migrations/       # Database migrasjoner
├─ .kimi/                # ⚠️ AI-agent config (ALDRI slett)
│   ├─ MASTER_PROMPT.md  # ← DU ER HER
│   ├─ WORKFLOW_RULES.md # ← LES DETTE FØRST!
│   ├─ EMERGENCY_PROD_FIX.md # ← AKUTT FIKS
│   ├─ DEPLOY_STRATEGY.md
│   ├─ DEPLOY_MASTER_PROMPT.md
│   ├─ AUTO_TRADE_MASTER_PROMPT.md
│   ├─ FIX_AUTH_LOOP.md
│   ├─ EXECUTE_WITH_MCP.md
│   ├─ README.md        # Index
│   └─ *.sh              # Setup scripts
├─ .agent/               # ⚠️ Antigravity/Gemini config
├─ .mcp-cache/           # ❌ ALDRI COMMIT (inneholder secrets!)
├─ docs/                 # Dokumentasjon
│   ├─ ARCHITECTURE.md
│   ├─ auto-trade.md
│   ├─ auth-and-middleware.md
│   └─ agents-and-tools.md
├─ Dockerfile
├─ next.config.mjs       # output: standalone (PÅKREVD)
├─ WORKFLOW_CHEATSHEET.md # Quick reference
└─ CLAUDE.md             # Redirect hit
```

---

## 🤖 AI-AGENTER

| Agent                 | Primær rolle           | Verktøy                     |
| --------------------- | ---------------------- | --------------------------- |
| **KIMI Code**         | Operasjonsagent (DU)   | Shell, wrangler, psql, deploy |
| **Perplexity/Claude** | Arkitekt/Dokumentasjon | MCP, kodeanalyse            |
| **Antigravity**       | Fremtidig hoved-IDE    | Store implementation plans  |

### Din rolle som KIMI

- **Utførsel:** Deploy, scripts, shell-kommandoer
- **Verifisering:** Sjekk at endringer fungerer
- **Rapportering:** Konkret status etter hver oppgave
- **Autonomi:** Jobb automatisk, spør kun hvis absolutt nødvendig

---

## 🔌 MCP & VERKTØY

### Konfigurerte MCP-servere

| Server                 | Formål                                   |
| ---------------------- | ---------------------------------------- |
| **filesystem**         | Lokal filsystem                          |
| **supabase-db**        | Direkte PostgreSQL-tilgang               |
| **sanity**             | CMS read/write                           |
| **github**             | Repo-operasjoner                         |
| **context7**           | Bibliotekdokumentasjon                   |
| **perplexity**         | AI-søk og research                       |
| **mempalace**          | Prosjektkunnskap og knowledge graph      |
| **chrome**             | Lokal browser-automasjon                 |

### Cloudflare Integration

Produksjon kjører på Cloudflare Workers via OpenNext.js + Wrangler. Deploy skjer
automatisk via Cloudflare Workers Builds på hver push til `main`.

- Worker: `klarpakke`
- Routes: `www.klarpakke.no/*`
- KV: `KV_KLARPAKKE`
- Manuell deploy: `npm run cf:deploy`

**⚠️ VIKTIG:** `.mcp-cache/` inneholder sensitive data og skal ALDRI committes!

**Scripts:**

- `npm run cf:build` — Bygg for Cloudflare Workers
- `npm run cf:deploy` — Manuell deploy via Wrangler
- `npx wrangler deployment list` — Se deployments
- `npx wrangler tail` — Live logs

---

## 🛠️ VANLIGE KOMMANDOER

```bash
# Oppsett
npm ci --legacy-peer-deps

# Utvikling
npm run dev

# Før push (KJØR ALLTID DISSE)
npm run test:unit
npm run type-check
node scripts/validate-i18n.js
npm run build

# Deploy (primær metode - GitHub → Cloudflare Workers Builds automatisk)
git push origin main
npx wrangler deployment list  # Se deployment status

# Deploy (backup - Wrangler CLI)
npm run cf:deploy

# Verifiser produksjon
curl https://www.klarpakke.no/api/health
npm run verify:prod

# Edge Functions
supabase functions deploy
supabase functions list

# Database
supabase db push
supabase migration list

# GitHub secrets
gh secret set SECRET_NAME --body "value" --repo tajlive/KP
gh secret list --repo tajlive/KP
```

---

## ⚠️ KJENTE FALLGRUVER

| Problem                                  | Løsning                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| `STRIPE_SECRET_KEY is not set` ved build | Sett `sk_test_build_only` som build-env                      |
| `npm install` feiler                     | Alltid bruk `--legacy-peer-deps`                             |
| Cloudflare Workers cold start            | Bruk KV for cache og unngå store synkrone initialiseringer   |
| Auth loop etter deploy                   | Se [FIX_AUTH_LOOP.md](./FIX_AUTH_LOOP.md)                    |
| Supabase auth feil                       | Bruk `createServerClient` + `getUser()`, ikke `getSession()` |
| GitHub push rejected (secrets)           | Fjern `.mcp-cache/` fra commit                               |
| Deploy feiler                            | Sjekk at alle Cloudflare secrets/vars er satt                |
| KIMI ser ikke endringer                  | Vent på deployment (1-2 min), sjekk `npx wrangler deployment list` |

---

## 📊 FEILSØKING

### Quick diagnose

```bash
# Sjekk CI/CD / Cloudflare Workers Builds
npx wrangler deployment list
npx wrangler tail | head -50

# Sjekk produksjon
curl -I https://www.klarpakke.no/no
curl https://www.klarpakke.no/api/health

# Sjekk build lokalt
npm run cf:build 2>&1 | grep error

# Sjekk tester
npm run test:unit 2>&1 | tail -20

# Sjekk i18n
node scripts/validate-i18n.js 2>&1 | grep -i missing
```

### Cloudflare Workers Builds feiler?

```bash
# Se deployments og logs
npx wrangler deployment list
npx wrangler tail

# Manuell deploy som fallback
npm run cf:deploy

# Sjekk secrets
npx wrangler secret list
```

### Produksjon nede?

1. 👉 Gå til [EMERGENCY_PROD_FIX.md](./EMERGENCY_PROD_FIX.md)
2. Følg steg-for-steg prosedyren
3. Rapporter status i Issue #16

---

## 📝 ARBEIDSFLYT FOR AI-AGENT

1. **Les [WORKFLOW_RULES.md](./WORKFLOW_RULES.md)** først
2. **Les relevant kode** før du endrer
3. **Kjør diagnostikk** hvis noe er galt
4. **Test lokalt** før push: `npm run test:unit && npm run build`
5. **Push til GitHub** - Cloudflare Workers Builds deployer automatisk
6. **Monitor** med `npx wrangler deployment list`
7. **Verifiser** med `npm run verify:prod`
8. **Ikke lag rapport-filer** — dokumenter i koden eller her

---

## 🔗 VIKTIGE LENKER

### Dokumentasjon

- [WORKFLOW_RULES.md](./WORKFLOW_RULES.md) ← **LES FØRST!**
- [EMERGENCY_PROD_FIX.md](./EMERGENCY_PROD_FIX.md) ← **AKUTT FIKS**
- [WORKFLOW_CHEATSHEET.md](../WORKFLOW_CHEATSHEET.md) ← Quick reference
- [DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)
- [AUTO_TRADE_MASTER_PROMPT.md](./AUTO_TRADE_MASTER_PROMPT.md)
- [FIX_AUTH_LOOP.md](./FIX_AUTH_LOOP.md)
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [docs/auto-trade.md](../docs/auto-trade.md)
- [docs/auth-and-middleware.md](../docs/auth-and-middleware.md)

### Eksterne lenker

- **GitHub:** https://github.com/tajlive/KP
- **Actions (arkivert):** https://github.com/tajlive/KP/actions
- **Issue #16:** https://github.com/tajlive/KP/issues/16
- **Produksjon:** https://www.klarpakke.no
- **Cloudflare Dashboard:** https://dash.cloudflare.com (Worker: klarpakke)
- **Supabase:** https://supabase.com/dashboard/project/pskhryjzkobytnfwucrb

---

## 🎯 HUSKEREGEL

**"GitHub er sannheten, Cloudflare Workers er speilet, KIMI er rådgiveren"**

```text
👨‍💻 Developer
  ↓ git push
🐙 GitHub (Source of Truth)
  ↓ auto-deploy (Cloudflare Workers Builds)
☁️ Cloudflare Workers Edge Network
  ↓ MCP reads
🤖 KIMI AI
```

**ALDRI andre veien rundt!**

---

_Sist oppdatert: 2026-06-29 21:15 CET av KIMI Code - Migrert til Cloudflare Workers (OpenNext.js + Wrangler)_
