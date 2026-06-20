# 🤖 KIMI + MemPalace Master Guide

**Prosjekt:** Klarpakke - AI Trading Platform  
**Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase, Hetzner, Coolify, Cloudflare  
**Status:** Production (www.klarpakke.no)  
**Node:** 24.x (se `.nvmrc`)  
**Hosting:** Hetzner VPS + Coolify + Cloudflare DNS/CDN
**CI/CD:** Woodpecker CI
**Error Tracking:** Selv-hostet GlitchTip

---

## 🚀 Hurtigstart

```bash
# Start utvikling
npm run dev

# Verifiser miljø
npm run verify

# Sjekk OAuth-konfigurasjon
npm run oauth:check

# Test & bygg
npm run test:unit && npm run build

# Deploy (Coolify webhook/CLI — se docs/SELF-HOSTED-SETUP.md)
npm run deploy:coolify

# Commit & push (CI/CD kjører i Woodpecker)
git add -A && git commit -m "type: beskrivelse" && git push origin main
```

### KIMI Aliaser
```bash
kimi health          # npm run health:prod:gate
kimi verify          # npm run verify
kimi dev             # npm run dev
kimi build           # npm run build
kimi lint            # npm run lint
kimi typecheck       # npm run type-check
kimi test            # npm run test:unit
kimi test:e2e        # npm run test:e2e:critical:chromium
kimi db:status       # npm run db:status
kimi db:push         # npm run db:push
kimi deploy          # npm run deploy:coolify

# Pipeline (NYTT)
kimi ci              # npm run lint:gate && npm run test:unit
kimi monitor         # Sjekk prod helse
kimi prod            # Full pipeline: ci → db → monitor → deploy → monitor
kimi architect       # Aktiver lead architect agent
kimi prod:preview    # Full pipeline til preview

# Auto-Maintenance v2.8 (NYTT)
kimi depcheck        # node scripts/dependency-report.mjs
kimi coverage        # node scripts/coverage-report.mjs
kimi refactor:client # node scripts/client-component-refactor.mjs --dry-run
```

> **Skills:** Aktive skills ligger i `.kimi/skills/` og lastes med `kimi --skills-dir .kimi/skills/klarpakke-<skill>` (f.eks. `klarpakke-auth`, `klarpakke-trading`).

---

## 🚀 Hetzner + Coolify Hosting

> **Status:** Migrert fra Fly.io til Hetzner VPS + Coolify (Docker + Cloudflare DNS/CDN)
> **Server:** Hetzner Cloud VPS (anbefalt CPX31)  
> **URL:** https://www.klarpakke.no  
> **CI/CD:** Woodpecker CI  
> **Error Tracking:** Selv-hostet GlitchTip

### Arkitektur
```
User → Cloudflare DNS (klarpakke.no) → Cloudflare CDN/Proxy → Hetzner VPS (Coolify)
                                       ↓
                              DDoS + SSL + Caching
```

### Setup (én gang)
Se detaljert guide i `docs/SELF-HOSTED-SETUP.md`. Kortversjon:

```bash
# 1. Provisioner Ubuntu 24.04 VPS på Hetzner
# 2. Installer Docker
# 3. Installer Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 4. Konfigurer Next.js-app i Coolify UI
#    - Git-repo: https://github.com/tajlive/KP
#    - Domene: www.klarpakke.no
#    - Env-variabler fra .env.local

# 5. Start GlitchTip
docker compose -f docker-compose.glitchtip.yml up -d

# 6. Konfigurer Woodpecker CI
#    Se .woodpecker/pr-check.yml og .woodpecker/deploy.yml
```

### Deploy-kommandoer
```bash
npm run deploy:coolify       # Placeholder — trigger Coolify webhook/CLI
npm run build                # Lokal bygg
npm run lint:gate            # Lint-gate (kjøres i Woodpecker)
npm run type-check           # Type-check (kjøres i Woodpecker)
```

### DNS (Cloudflare)
| Record | Type | Target | Proxy |
|--------|------|--------|-------|
| `www.klarpakke.no` | A | `<Hetzner-IP>` | ✅ |
| `klarpakke.no` | A | `<Hetzner-IP>` | ✅ |
| `ci.klarpakke.no` | A | `<Hetzner-IP>` | ✅ |
| `glitchtip.klarpakke.no` | A | `<Hetzner-IP>` | ✅ |

### Woodpecker CI
Workflows ligger i `.woodpecker/`:
- `.woodpecker/pr-check.yml` — lint, type-check, test:unit, build
- `.woodpecker/deploy.yml` — build, Supabase-migrasjoner, Coolify-deploy, health-check

Arkiverte GitHub Actions workflows ligger i `.github/workflows/archived/`.

### Hvorfor Hetzner + Coolify?
- ✅ Billigere enn managed PaaS (Fly.io/Vercel)
- ✅ Full kontroll over server og byggemiljø
- ✅ Docker-basert — enkel, forutsigbar
- ✅ Cloudflare DNS/CDN foran gir caching + DDoS-beskyttelse
- ✅ Woodpecker CI uten GitHub Actions-minutt-grenser
- ✅ Selv-hostet GlitchTip uten Sentry-kvoter

### Fly.io → Hetzner/Coolify endringer
| Før (Fly.io) | Etter (Hetzner + Coolify) |
|-------------|---------------|
| `flyctl deploy` | Coolify webhook/CLI |
| `FLY_IO=1` | `COOLIFY=1` (valgfri) |
| `klarpakke.fly.dev` | `www.klarpakke.no` direkte på Hetzner-IP |
| GitHub Actions CI/CD | Woodpecker CI |
| Sentry SaaS | Selv-hostet GlitchTip |

---

### Lead Architect Skill (Anbefalt for alle større oppgaver)
```bash
# Aktiver lead architect skill — denne har full kontekst på Klarpakke
kimi --skills-dir .kimi/skills/klarpakke-architect

# Eller bruk alias
kimi architect       # Ekvivalent: kimi --skills-dir .kimi/skills/klarpakke-architect
```

### Auth Skill (Eksplisitt aktivering)
```bash
# Aktiver auth-spesialisert skill manuelt
kimi --skills-dir .kimi/skills/klarpakke-auth

# Eller bruk alias (hvis konfigurert i .kimi/commands.json)
kimi auth            # Ekvivalent: kimi --skills-dir .kimi/skills/klarpakke-auth
```

---

## 🧠 KIMI Smart Orchestrator v2.0 (NYTT — 2026-05-04)

> Komplett session-orkestrering: pre-session kontekst, auto-skill/MCP-valg,
> master system prompt injection, self-correction, og post-session analyse.

### Arkitektur
```
┌─────────────────────────────────────────────────────────────────────┐
│                         KIMI SESSION LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PRE-SESSION (kimi-smart-launch)                                    │
│    ├── MemPalace: search + recent_context + kg_query                │
│    ├── Git: branch, commits, modified files                         │
│    ├── Klassifiser: 10 domener → riktig skill                       │
│    ├── Velg: MCP-profil (minimal/medium/full)                       │
│    └── Generer: paste-ready brief + session context                 │
│                                                                      │
│  DURING SESSION (KIMI-MASTER-SYSTEM.md injected)                    │
│    ├── MANDATORY: MemPalace search før hver oppgave                 │
│    ├── MANDATORY: Self-correction etter >30 linjer                  │
│    ├── MANDATORY: Swarm review etter >5 filer                       │
│    └── MANDATORY: Memory sync (kg_batch + write_diary)              │
│                                                                      │
│  POST-SESSION (SessionEnd hook v2.0)                                │
│    ├── MemPalace flush                                              │
│    ├── Self-improve analyse (diary, GO-rate, patterns)              │
│    ├── Git-diff → verify-anbefalinger                               │
│    └── Session-summary til .kimi/session-summaries/                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Installasjon (én gang)
```bash
node scripts/install-kimi-orchestrator.mjs
source ~/.zshrc
```
Installerer:
- `~/.kimi/bin/kimi-smart` — interaktiv orchestrator
- `~/.kimi/bin/kimi-smart-brief` — genererer markdown-brief
- `~/.kimi/bin/kimi-smart-launch` — **komplett session wrapper**
- `~/.kimi/bin/kimi-self-improve` — post-økt analyse
- Aliaser: `kimis`, `kimib`, `kimil`, `kimi-self`, `kimi-super`

### `kimi-smart-launch` — Komplett Session Wrapper ⭐
```bash
# Generer brief + kontekst (manuell paste inn i KIMI)
kimil "fiks auth login session timeout"

# Auto-detect fra git + start KIMI med riktig agent
kimil --launch

# Force super-agent (master system prompt)
kimil --super --launch
```

**Output:**
- Domain detection (confidence score)
- Anbefalt skill + MCP-profil
- Git-kontekst (branch, commits, modified files)
- MemPalace brief med kontekst
- Session context lagret til `.kimi/session-summaries/current-session-context.md`

### `kimi-super` — Super-Skill med Full Smart-Launch ⭐
```bash
# Start KIMI med super-skill + pre-session kontekst + post-session analyse
kimi-super
# Ekvivalent: kimi-smart-launch --super --launch
# Inkluderer: MemPalace search → git-kontekst → skill-launch → self-improve
```

**Prefer `kimi-super` over raw `kimi --skills-dir .kimi/skills/klarpakke-super`** — den gir deg:
- Pre-session MemPalace brief med kontekst
- Git-kontekst (branch, commits, modified files)
- Auto-detect domain + MCP profile
- Post-session self-improve + verify-anbefalinger

Super-skillen laster **`.kimi/skills/klarpakke-super/SKILL.md`** som inneholder:
- **MANDATORY pre-task protocol:** MemPalace search + recent_context + kg_query
- **MANDATORY self-correction:** Pause og verifiser etter >30 linjer
- **MANDATORY memory sync:** kg_batch + write_diary + auto_tag etter hver oppgave
- **MANDATORY status block:** GO/NO-GO/WIP med filer, validering, neste steg
- **MCP profile auto-selection:** Anbefaler riktig profil for oppgaven
- **Skill classification reference:** 10 domener med nøkkelord

### `kimi-smart-brief` — Pre-start Brief
```bash
# Generer paste-ready brief
kimib "implementer mean reversion strategy"

# Lim inn i KIMI for optimal kontekst
```

**Klassifiserer 10 domener:**
| Skill | Domene-nøkkelord | MCP |
|---|---|---|
| 🔐 Auth & Security | auth, login, oauth, session, jwt, permission | medium |
| 📈 Trading Engine | trading, strategy, bot, order, position, pnl | full |
| 🗄️ Database | migration, sql, supabase, postgres, trigger, rls | full |
| 🎨 Frontend | ui, component, react, tailwind, dashboard | minimal |
| 🔌 API | endpoint, route, handler, middleware, webhook | medium |
| 🚀 Deploy | vercel, ci, build, env, secret, domain | medium |
| 🧪 Testing | test, e2e, vitest, playwright, coverage | medium |
| 📝 Sanity CMS | sanity, schema, groq, studio, content | medium |
| 📱 Mobile | pwa, responsive, lighthouse, viewport | medium |
| 🤖 General (Super) | refactor, fix, bug, optimize, improve | auto |

### `kimi-self-improve` — Post-økt Analyse
```bash
kimi-self  # Analyserer diary.jsonl, gir anbefalinger
```
Analyserer:
- NO-GO mønstre → identifiserer gjentakende feil
- Gjentatte oppgaver → foreslår automatisering
- Skill-effektivitet → GO-rate og gjennomsnittsrating
- Lavt ratede økter → foreslår oppgave-brytning

### SessionEnd Hook v2.0
Konfigurert i `~/.kimi/config.toml`:
```toml
[[hooks]]
event = "SessionEnd"
command = "/Users/taj/.kimi/hooks/mempalace-smart-exit.sh"
```

Hooken kjører automatisk ved SessionEnd:
1. MemPalace flush
2. Self-improve analyse
3. Git-diff → verify-anbefalinger
4. Session-summary

### Alle skills er oppgradert
Hver skill `SKILL.md` fil har nå en **MASTER SYSTEM header** som påminner om:
- Pre-task MemPalace-protokoll
- Self-correction etter >30 linjer
- Memory sync etter hver oppgave
- Status block på slutten

### Pre-loaded Context
```bash
# Kritisk prosjektkunnskap (3k tokens)
cat .kimi/PROJECT_CONTEXT.md

# Lim inn i KIMI ved session-start, eller referer:
# @.kimi/session-summaries/current-session-context.md
```

---

## 📋 Arbeidsflyt (ALLTID)

### FØR kodeendring:
1. `git status` – clean main
2. `npm run verify` – verifiser miljø
3. Les relevante filer – forstå kontekst

### UNDER kodeendring:
1. Gjør **minimal** endring
2. Test lokalt – `npm run test:unit`
3. Verifiser – `npm run lint && npm run type-check`

### ETTER kodeendring:
1. `git add -A`
2. `git commit -m "type: beskrivelse"`
3. `git push origin main`
4. Vent på Coolify deploy (~2-3 min)
5. Verifiser i produksjon: `npm run verify:prod`

---

## 🎯 Regler (Breaking = Production Down)

| Regel | Konsekvens |
|-------|------------|
| **YOLO-modus** | Implementer uten å spørre |
| **Minimal endring** | Kun det som må til |
| **Verifiser først** | Sjekk før endring |
| **GO/NO-GO** | Alltid tydelig status |

### OAuth Redirect URIs (Aldri bryt)
- **ALLTID** bruk `getCallbackUrl()` fra `@/lib/auth/config` for OAuth `redirectTo`
- **FORBUDT** å hardkode `/auth/callback` — kodebasen bruker `/{locale}/callback` (f.eks. `/no/callback`)
- **FORBUDT** å sende passord-reset til callback — bruk `/no/update-password`
- **ALLTID** kjør `npm run oauth:check` før push av auth-endringer
- **ALLTID** oppdater både Google Cloud Console og Supabase Auth URL Configuration når callback-endringer gjøres

### PL/pgSQL (Aldri bryt)
- **DECLARE** på toppnivå, aldri nested
- **EXCEPTION WHEN OTHERS** skal ALLTID ha `RAISE WARNING`

### Caching & ISR (Aldri bryt)
- **Landingssiden** (`src/app/[locale]/page.tsx`) skal ALLTID bruke `force-dynamic`
- **App-ruter** (dashboard, admin, trading) skal ALLTID bruke `force-dynamic`
- **Legal-sider** (vilkår, personvern, cookies) kan bruke `revalidate = 86400`
- **Hjelp / Leksjoner** kan bruke `revalidate = 3600`
- **Catch-all** (`[...slug]`) skal bruke `revalidate = 60` ( Sanity webhook invaliderer )
- **Regel:** Sider som endres oftere enn 1× i uken skal IKKE bruke ISR > 60s
- **Deploy:** Woodpecker CI-kjede kaller `/api/revalidate` etter vellykket deploy for å invalidere cache
- **Playwright smoke-test** kjøres etter deploy for å fange fantom-feil

### Agent Tenke-Disiplin (ALLTID)
> **Mål:** Match Claude Opus 4.7 sin reasoning-dybde ved å tvinge systematisk tenking.

1. **Les før du skriver** — Bruk `ReadFile` / `Grep` for å forstå eksisterende kode FØR du foreslår endringer.
2. **Tenk steg-for-steg** — Forklar din plan i tekst før du utfører den. Identifiser risikoer og edge cases.
3. **Selv-verifisering** — Etter kodeendringer, stil deg selv:
   - *"Bryter dette noen regler i AGENTS.md?"*
   - *"Har jeg oppdatert alle kallere hvis signaturen endret seg?"*
   - *"Er denne endringen virkelig minimal?"*
4. **Post-change verify** — Ved >3 filer endret eller >50 linjer:
   ```bash
   node scripts/verify/run-all.mjs
   ```
   Hvis det feiler, fiks FØR du rapporterer GO.
5. **Kontekst-bevissthet** — Vi har 262k tokens (ikke 1M som Opus). Vær selektiv:
   - Bruk `Grep` før `ReadFile` for å finne riktige filer.
   - Bruk MemPalace `search()` før du drar inn store dokumenter.
   - Unngå å lese hele filer hvis du kun trenger 20 linjer (bruk `line_offset` + `n_lines`).

---

## 🛠️ MemPalace (Minne-System)

> **Status:** v3.3.0 — SUPERKIMI: TF-IDF + Bigram + Cross-lingual + File watcher + Index persistens

> ⚠️ **NEVER use `mempalace mine` (Python CLI)** — it segfaults on Python 3.13/macOS due to ChromaDB Rust backend bug. Use the Node.js MCP server only. See `.knowledge/errors/mempalace-chromadb-segfault.md`.

### Kommandoer
```bash
# Søk i kunnskap
./scripts/knowledge-search.sh "auth pattern"
./scripts/knowledge-search.sh "trading" error_patterns

# Diary
./scripts/mempalace-diary.sh write FEAT "ny feature" GO "★★★" 5
./scripts/mempalace-diary.sh read 10

# Seed kunnskap
./scripts/mempalace-seed.sh
```

### Rom-Struktur
| Rom | Innhold | Prioritet |
|-----|---------|-----------|
| `critical_decisions` | ADR-er, arkitektur | 🔴 High |
| `error_patterns` | Feil + løsninger | 🔴 High |
| `tech_debt` | TYPE_DEBT | 🟡 Medium |
| `api_contracts` | API-dokumentasjon | 🟡 Medium |
| `project_status` | Statusrapporter | 🟢 Standard |
| `kimi_sessions` | Diary entries | 🟢 Standard |

---

## 👥 Swarm & Skills

### Swarm Config
```yaml
# .kimi/swarm-config.json
coordinator: kimi
agents:
  - analyzer:     # Pre-task AST analysis
  - architect:    # On-decision ADR compliance
  - tester:       # Post-implementation
  - security:     # On-security-path
  - knowledge:    # Post-task MemPalace sync
```

### Skill- og agent-oversikt
Aktive skills ligger i `.kimi/skills/` og lastes med `--skills-dir`. Se `.agent/KLARPAKKE-AGENT-ROSTER.md` for historisk oversikt over øvrige YAML-agenter.

**Nøkkel-skills (8 aktive):**
- `.kimi/skills/klarpakke-auth` – Auth & Security
- `.kimi/skills/klarpakke-trading` – Trading Engine
- `.kimi/skills/klarpakke-database` – Database & Schema
- `.kimi/skills/klarpakke-performance` – Frontend, UI/UX, Lighthouse, bundle, TTFB
- `.kimi/skills/klarpakke-architect` – Deploy & Arkitektur
- `.kimi/skills/klarpakke-testing` – Testing & QA
- `.kimi/skills/klarpakke-mempalace` – Memory & KG
- `.kimi/skills/klarpakke-super` – General/Catch-all

### Skills Auto-Aktivering
Konfigurasjon: `.kimi/skills-activation.yaml`

| Arbeider med | Auto-skills |
|--------------|-------------|
| `src/app/api/**/*.ts` | api-patterns, security-testing |
| `src/components/**/*.tsx` | frontend-design, nextjs-react-expert |
| `supabase/migrations/*.sql` | database-design |
| `e2e/**/*.spec.ts` | webapp-testing, testing-patterns |
| `src/app/**/page.tsx` | performance-profiling, seo-fundamentals |
| `**/*.test.ts` | testing-patterns, tdd-workflow |

---

## 🔧 Templates

### Feature
```bash
kimi feature "implementer X"
```
Se `.kimi/templates/feature.md`

### Bugfix
```bash
kimi fix "fiks Y"
```
Se `.kimi/templates/bugfix.md`

### Refactor
```bash
kimi refactor "omstrukturer Z"
```
Se `.kimi/templates/refactor.md`

---

## 📚 Viktige Referanser

| Dokument | Beskrivelse |
|----------|-------------|
| `.cursorrules` | Tekniske regler for kode |
| `.kimi/AGENT-KLARPAKKE.md` | Detaljert KIMI-guide |
| `.agent/KLARPAKKE-AGENT-ROSTER.md` | Agent-oversikt |
| `docs/ARCHITECTURE.md` | System-arkitektur |
| `src/lib/supabase/TYPE_DEBT.md` | TypeScript gjeld |
| `docs/CRON-SOURCE-OF-TRUTH.md` | Cron-regler |

---

## 🧠 Prosjekt-Spesifikt Minne

### Kritisk Kontekst
```yaml
Cron source of truth: Supabase (ikke Vercel)
i18n: Kun no + en (th/zh avvent)
Trading: Edge Functions eller Supabase scheduler
Auth: @supabase/ssr (ikke auth-helpers-nextjs)
```

### Supabase ↔ Vercel — ALDRI bruk REST API fra Serverless (2026-05-12)

> **Regel:** Fra Vercel Serverless Functions skal du ALLTID bruke Postgres pooler (`pg` + `POSTGRES_URL`), ALDRI `@supabase/supabase-js` REST API for health checks eller tidskritiske operasjoner.
>
> **Hvorfor:** PostgREST har cold starts (5-20s) og IPv6-routing-problemer fra Vercel. Pooleren (Supavisor, port 6543) bruker IPv4 og har ingen cold starts.
>
> **Implementering:**
> ```typescript
> import { Client } from "pg";
> import { setDefaultResultOrder } from "dns";
> setDefaultResultOrder("ipv4first"); // Node.js 18+ default er IPv6
>
> const client = new Client({ connectionString: process.env.POSTGRES_URL });
> await client.connect();
> const result = await client.query("SELECT 1");
> await client.end();
> ```
>
> **Les mer:** `.knowledge/errors/SUPABASE-VERCEL-REST-TIMEOUT-2026-05-12.md`

### Tekniske Detaljer
```yaml
Testing: Vitest + Playwright
Lint: ESLint 9 flat config
Types: Strict, target ES2022
Database: DECLARE på toppnivå
```

---

## 🔗 MCP Verktøy

| Verktøy | Bruk |
|---------|------|
| `mempalace_search` | Søk i lokalt minne |
| `mempalace_remember` | Lagre minne |
| `perplexity_research` | Web-research (deep) |
| `perplexity_ask` | Web-research (quick) |
| `query_database` | Supabase SQL |
| `search_docs` | Context7 docs |
| `checkSystemHealth` | System health (npm verify + memory) |
| `getUptimeStatus` | Sjekk klarpakke.no oppetid |
| `listAlerts` | GitHub bugs/issues |
| `listCronJobs` | pg_cron job management |
| `toggleCronJob` | Slå av/på cron jobs |
| `listFlags` | Feature flags |
| `searchTrades` | Søk i trades |
| `searchUsers` | Søk i brukere |
| `getVercelCost` | Vercel usage/estimat |
| `ai_health_report` | Ukentlig AI-helserapport |

---

## 🤖 Agent Collaboration (KIMI + Gemini/Antigravity)

### Hurtigstart

```bash
# 1. Setup (én gang)
npm run agent:setup
source ~/.zshrc

# 2. Planlegg med Gemini
npm run ask:gemini "Implementer mean reversion trading strategy"
# eller: agent-plan "din oppgave"

# 3. KIMI utfører
npm run tell:kimi TASK-20240411-143022-A1B2.md
# eller: agent-exec TASK-XXXX.md

# 4. Sjekk status
npm run agent:status
```

### Samarbeidsflyt

```
Gemini/Antigravity (Plan) → MemPalace (Hub) → KIMI (Execute) → Swarm (QA)
         ▲                                                            │
         └──────────────────── Handoff ←───────────────────────────────┘
```

### Nøkkelkommandoer

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run agent:plan "..."` | Send til Gemini for planlegging |
| `npm run agent:exec <file>` | KIMI utfører plan |
| `npm run agent:swarm "filer"` | Kjør QA på filer |
| `npm run agent:handoff <fra> <til>` | Overlevering |
| `npm run agent:status` | Vis systemstatus |

### Dokumentasjon

- **Full guide:** `AGENT_COLLABORATION_GUIDE.md`
- **Swarm system:** `SWARM-GUIDE.md`
- **Antigravity:** `docs/antigravity.md`

---

**Sist oppdatert:** 2026-06-20  
**Versjon:** 2.9 (+KIMI Code CLI 0.18.0 + skills-basert oppsett i `.kimi/skills/`)

---

## ⚡ KIMI Code CLI 0.18.0 Optimaliseringer (2026-06-20)

### Kontekst-tuning
```toml
max_steps_per_turn = 1000             # v1.40.0: 500→1000
max_retries_per_step = 5              # økt fra 3 → mer robusthet
max_ralph_iterations = 3              # økt fra 2 → bedre self-improvement
reserved_context_size = 35000         # ned fra 40000 → +10k arbeidsminne
compaction_trigger_ratio = 0.92       # ned fra 0.94 → mer kontekst bevart
agent_task_timeout_s = 1800           # 30 min for lange oppgaver
tool_call_timeout_ms = 180000         # økt fra 120s → 3 min for store index-operasjoner
merge_all_available_skills = true     # auto-aktiver skills
```

### Ralph Loop (Self-Improvement)
> `max_ralph_iterations = 3` aktiverer KIMI Code CLI sin innebygde forbedrings-loop.
> Modellen itererer på samme oppgave og forbedrer svaret til den outputter `<choice>STOP</choice>`
> eller når iterasjonsgrensen nås. Tilsvarende Claude Code's `/ultrareview`.
>
> **Merk:** Øker latency med ~30-50%, men forbedrer kvaliteten på komplekse oppgaver betydelig.

### MemPalace v3.4.0 — SUPERKIMI Optimalisert
- **Atomic writes:** Index-cache og KG compaction skrives atomisk (tmp + rename)
- **KG backup:** `kg.json.bak` opprettes før compaction — gjenoppretting ved feil
- **Økt cache:** 500 LRU entries (fra 300) for bedre hit-rate i lange økter
- **Økt snippets:** 2500 chars per resultat (fra 1500) — bedre kontekst for k2.6
- **File watcher:** PÅ med 2s debounce, kun for `.knowledge/`, `.mempalace/handoffs/`, `docs/`
- **Diary chunking:** Lange diary-linjer (>800 chars) splittes i sub-docs for bedre presisjon
- **Graceful shutdown:** 5s timeout — sikrer at cache og KG blir skrevet
- **TF-IDF scoring:** Sjeldne tokens vektes høyere enn vanlige
- **Bigram index:** "KIMI CLI" scorer høyere enn "KIMI" + "CLI" separat
- **Cross-lingual:** 115 norsk↔engelsk mappings (søk på "optimalisering" finner "optimize")
- **Stemming:** enkle norske/engelske regler (optimalisering → optimal)
- **Index persistens:** <100ms oppstart fra `.mempalace/index-cache-v3.json.gz`
- **Forbedret auto_tag:** semantiske tags fra KG + expansions, ikke bare filnavn
- **SUPERKIMI prompt:** `superkimi_boost` — aktiverer maksimal kontekst + tenke-disiplin

### Smart Launch v2.1
- **Git-basert boost:** Endrede filer booster riktig domain automatisk
- **Large-diff detection:** >10 filer eller >200 linjer → auto-velger super-skill
- **MCP-profil switch:** `--mcp=minimal|medium|full` flagg for manuell override

### Self-Improve v1.5
- **Utvidet vindu:** 30 entries (fra 10) + tidsbasert filtrering (48t)
- **Auto-KG-sync:** NO-GO oppdages → automatisk `kg_add` med pattern-tag
- **Weekly health dashboard:** `.kimi/session-summaries/weekly-health.md`

### MemPalace v3.1.1 — Aktiv bruk
- **FØR oppgave:** `search()` + `recent_context(hours=48)` + `kg_query(entity=..., depth=2)`
- **ETTER oppgave:** `kg_add()` / `kg_batch()` + `write_diary()` + `auto_tag()`
- **Exit-hook:** `~/.kimi/hooks/mempalace-smart-exit.sh` — flush + self-improve + session-summary
- **MCP-profiler:** `kimi-mcp minimal|medium|full` — bytt etter behov

### Skill-roster (8 aktive)
Skills ligger i `.kimi/skills/` og lastes med `--skills-dir`:

| Alias | Skill-katalog | Domene |
|-------|---------------|--------|
| `kimi auth` | `.kimi/skills/klarpakke-auth` | 🔐 Auth & Security |
| `kimi trading` | `.kimi/skills/klarpakke-trading` | 📈 Trading Engine |
| `kimi database` | `.kimi/skills/klarpakke-database` | 🗄️ Database & Schema |
| `kimi frontend` | `.kimi/skills/klarpakke-performance` | 🎨 Frontend & UI |
| `kimi architect` | `.kimi/skills/klarpakke-architect` | 🚀 Deploy & Arkitektur |
| `kimi testing` | `.kimi/skills/klarpakke-testing` | 🧪 Testing & QA |
| `kimi mempalace` | `.kimi/skills/klarpakke-mempalace` | 🏛️ Memory & KG |
| `kimi super` | `.kimi/skills/klarpakke-super` | 🤖 General/Catch-all |

**Deprecated:** 8 YAML-agenter flyttet til `.kimi/agents/deprecated/` (auto-optimizer, mobile-check, sanity, security, super-auditor, super-editor, verify, performance-duplikat).

### Swarm Workflow (opt-in via `--swarm`)
```bash
node scripts/kimi-smart-launch.mjs "implement feature X" --swarm       # Generer brief
node scripts/kimi-smart-launch.mjs "implement feature X" --swarm --launch  # Kjør med super-skill
```
- **feature:** analyzer → architect → tester → security → knowledge
- **bugfix:** analyzer → tester → security → knowledge
- **refactor:** analyzer → architect → tester → knowledge

### Rask diagnose
```bash
kimi --version                    # skal vise 0.18.0
# Verifiser skills-oppsettet
kimi --skills-dir .kimi/skills/klarpakke-mempalace   # aktiver MemPalace skill
npm run mempalace:status          # eller: node scripts/mempalace-search.mjs "test"
```
