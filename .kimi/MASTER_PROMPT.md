# 🎯 KLARPAKKE — MASTER PROMPT

> **Les dette FØR du gjør noe i dette prosjektet.**  
> Dette er den eneste kilden til sannhet. Ingen andre .md-filer i root har autoritet.  
> **Sist oppdatert:** 20. Februar 2026 15:16 CET

---

## 🚨 AKUTT SITUASJON - LES FØRST!

**STATUS:** ✅ OPERATIONAL - Vercel hosting aktiv

📢 **SIST OPPDATERT:** 25. Februar 2026 - Migrert til Vercel
⚡ **INFRASTRUKTUR:** GitHub → Vercel (auto-deploy)  
⏱️ **REGION:** arn1 (Stockholm, Sverige)

Hvis du ikke vet hva som feiler, start her:

```bash
# Quick diagnose
gh run list --limit 1  # Sjekk CI/CD status
curl -I https://www.klarpakke.no/no  # Sjekk produksjon
npm run build  # Sjekk build lokalt
```

---

## 📚 KRITISKE DOKUMENTER - LES I DENNE REKKEFØLGEN

1. **[WORKFLOW_RULES.md](./WORKFLOW_RULES.md)** ← **STRENGT REGELVERK**
   - ✅ ALLTID gjør / ❌ ALDRI gjør
   - GitHub → Vercel → KIMI arbeidsflyt
   - Secrets management
2. **[EMERGENCY_PROD_FIX.md](./EMERGENCY_PROD_FIX.md)** ← **AKUTT FIKS**
   - Diagnose og fiks produksjonsproblemer
   - Steg-for-steg prosedyre
   - Alle kommandoer klar til bruk

3. **[DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)** ← **DEPLOY-STRATEGI**
   - GitHub → Vercel (automatisk)
   - Vercel CLI (backup)
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
2. Vent på GitHub Actions deployment
3. La KIMI lese via MCP

### ❌ ALDRI GJØR:

1. ❌ Rediger Vercel Dashboard direkte (unntatt env vars)
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
8. **ALDRI rediger Vercel Dashboard direkte** — GitHub overskriver ved neste deploy (bruk alltid Git som source of truth)
9. **ALDRI commit `.mcp-cache/`** — inneholder sensitive data fra MCP-servere

---

## ✅ PROSJEKT

| Felt                 | Verdi                                                |
| -------------------- | ---------------------------------------------------- |
| **Navn**             | Klarpakke                                            |
| **URL**              | https://www.klarpakke.no                             |
| **Beskrivelse**      | Norsk kryptovaluta-læringsplattform med Auto Trading |
| **Repo**             | https://github.com/tomarnejensen/klarpakke           |
| **Owner**            | tomarnejensen@gmail.com / tom@klarpakke.no           |
| **Hosting**          | Vercel (Edge Network)                                |
| **Region**           | arn1 (Stockholm, Sverige)                            |
| **Supabase Project** | vuxbjlykgmzskxbclquf                                 |

---

## 🏭 TECH STACK

| Lag        | Teknologi                                                  |
| ---------- | ---------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), TypeScript, Tailwind CSS          |
| Database   | Supabase (PostgreSQL + Row Level Security)                 |
| Auth       | Supabase Auth (`createServerClient` + `getUser()`)         |
| Betaling   | Stripe (Checkout + webhooks)                               |
| Hosting    | **Vercel** (Edge Network, arn1 region)                     |
| Scheduler  | Vercel Cron Jobs + pg_cron                                 |
| Trading    | Binance API (brukere kobler egne nøkler)                   |
| **SQL**    | **AI SQL Runner** (auto via `exec_sql` RPC) → se .kimi/SQL_BRAIN.md |
| **Deploy** | **GitHub → Vercel** (automatisk) → **Vercel CLI** (backup) |

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
   ↓ (automatisk via Vercel Git Integration)
2. Vercel Edge Network (Produksjon, arn1)
   ↓ (KIMI leser via MCP)
3. KIMI AI Agent (Leser og analyserer)
```

### Primær metode: GitHub → Vercel (automatisk)

```bash
# Push til GitHub - Vercel deployer automatisk
git push origin main

# Monitor deployment (Vercel Dashboard eller CLI)
vercel ls
```

### Backup: Vercel CLI (hvis auto-deploy feiler)

```bash
# Deploy direkte via Vercel CLI
vercel --prod --force
```

---

## 🔑 MILJØVARIABLER

### Runtime (Vercel Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXTAUTH_URL=https://www.klarpakke.no
NEXTAUTH_SECRET  (Vercel Dashboard → Settings → Environment Variables)
STRIPE_SECRET_KEY  (Vercel Dashboard → Settings → Environment Variables)
SUPABASE_SERVICE_ROLE_KEY  (Vercel Dashboard → Settings → Environment Variables)
RESEND_API_KEY  (Vercel Dashboard → Settings → Environment Variables)
CRON_SECRET  (Vercel Dashboard → Settings → Environment Variables)
```

### Build-time (GitHub Actions)

```
STRIPE_SECRET_KEY=sk_test_build_only   # Dummy
SKIP_ENV_VALIDATION=true
NEXT_TELEMETRY_DISABLED=1
```

### Sette secrets via CLI

```bash
gh secret set MY_SECRET --body "value" --repo tomarnejensen/klarpakke
gh secret list --repo tomarnejensen/klarpakke
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
| **KIMI Code**         | Operasjonsagent (DU)   | Shell, vercel, psql, deploy |
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
| **supabase-database**  | Direkte PostgreSQL-tilgang               |
| **klarpakke-codebase** | Lokal filsystem                          |
| **github-klarpakke**   | Repo-operasjoner                         |
| **vercel**             | Deployments, logs, environment variables |

### Vercel Integration

Vercel er koblet til GitHub repo for automatisk deployment:

- Production deploys på hver push til `main`
- Preview deploys på Pull Requests
- Environment variables konfigureres i Vercel Dashboard

**⚠️ VIKTIG:** `.mcp-cache/` inneholder sensitive data og skal ALDRI committes!

**Scripts:**

- `vercel` — CLI for manuell deploy
- `vercel env` — Håndtere environment variables

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

# Deploy (primær metode - GitHub → Vercel automatisk)
git push origin main
vercel ls  # Se deployment status

# Deploy (backup - Vercel CLI)
vercel --prod --force

# Verifiser produksjon
curl https://www.klarpakke.no/api/health
gh run list --limit 3

# Edge Functions
supabase functions deploy
supabase functions list

# Database
supabase db push
supabase migration list

# GitHub secrets
gh secret set SECRET_NAME --body "value" --repo tomarnejensen/klarpakke
gh secret list --repo tomarnejensen/klarpakke
```

---

## ⚠️ KJENTE FALLGRUVER

| Problem                                  | Løsning                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| `STRIPE_SECRET_KEY is not set` ved build | Sett `sk_test_build_only` som build-env                      |
| `npm install` feiler                     | Alltid bruk `--legacy-peer-deps`                             |
| Vercel cold start                        | Bruk Edge Functions for API routes                           |
| Auth loop etter deploy                   | Se [FIX_AUTH_LOOP.md](./FIX_AUTH_LOOP.md)                    |
| Supabase auth feil                       | Bruk `createServerClient` + `getUser()`, ikke `getSession()` |
| GitHub push rejected (secrets)           | Fjern `.mcp-cache/` fra commit                               |
| Deploy feiler                            | Sjekk at alle GitHub Secrets er satt                         |
| KIMI ser ikke endringer                  | Vent på deployment (5-10 min), sjekk Actions                 |

---

## 📊 FEILSØKING

### Quick diagnose

```bash
# Sjekk CI/CD
gh run list --limit 1
gh run view --log | grep -i error

# Sjekk produksjon
curl -I https://www.klarpakke.no/no
curl https://www.klarpakke.no/api/health

# Sjekk build lokalt
npm run build 2>&1 | grep error

# Sjekk tester
npm run test:unit 2>&1 | tail -20

# Sjekk i18n
node scripts/validate-i18n.js 2>&1 | grep -i missing
```

### GitHub Actions feiler?

```bash
# Se logs
gh run view --log

# Re-run
gh run rerun <run-id>

# Sjekk secrets
gh secret list --repo tomarnejensen/klarpakke
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
5. **Push til GitHub** - deployment skjer automatisk
6. **Monitor** med `gh run watch`
7. **Verifiser** med `curl https://www.klarpakke.no/api/health`
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

- **GitHub:** https://github.com/tomarnejensen/klarpakke
- **Actions:** https://github.com/tomarnejensen/klarpakke/actions
- **Issue #16:** https://github.com/tomarnejensen/klarpakke/issues/16
- **Produksjon:** https://www.klarpakke.no
- **Vercel Dashboard:** https://vercel.com/tom-jensens-projects/klarpakke
- **Supabase:** https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf

---

## 🎯 HUSKEREGEL

**"GitHub er sannheten, Vercel er speilet, KIMI er rådgiveren"**

```text
👨‍💻 Developer
  ↓ git push
🐙 GitHub (Source of Truth)
  ↓ auto-deploy
▲ Vercel Edge Network
  ↓ MCP reads
🤖 KIMI AI
```

**ALDRI andre veien rundt!**

---

_Sist oppdatert: 2026-02-25 08:45 CET av KIMI Code - Migrert til Vercel_
