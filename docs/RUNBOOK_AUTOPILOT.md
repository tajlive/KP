# RUNBOOK — Klarpakke Autopilot Deploy

> Sist oppdatert: 2026-04-14  
> Ansvarlig: Tom Arne Jensen  
> Exec: KIMI (iTerm) | Kontroll: Perplexity Pro

---

## 🎯 Prinsipp

KIMI er **executor**. Perplexity er **orkestrator og QA**.

Regler:
- KIMI kjører alltid i iTerm (ikke som CLI-kall fra Perplexity)
- Perplexity leser, analyserer, skriver runbooks, holder orden på prioritering
- Stopp KUN ved: secrets, destruktive DB-operasjoner (DROP/TRUNCATE), prod-rollback
- Alt annet: automatiser og rapporter

---

## 🚀 AUTOPILOT — Standard deploy til prod

```bash
bash scripts/autopilot-deploy.sh
```

Hva skriptet gjør, i rekkefølge:

1. **Preflight** — sjekker at workspace er rent
2. **TypeScript** — `tsc --noEmit`, 0 feil kreves
3. **Lint** — `eslint`, 0 errors kreves
4. **Git** — `add -A`, commit med auto-generert melding, push til `main`
5. **Cloudflare prod** — `npm run cf:deploy`
6. **Post-deploy health** — `signals:health`, `deploy:check`
7. **MemPalace** — `mempalace:sync` for å indeksere nye beslutninger

Abort-betingelser (skriptet stopper):
- TS-feil
- Lint errors
- Git push feiler
- Cloudflare deploy feiler

---

## 🔁 KIMI-sekvens for nye features

```
Bruker → Perplexity: "Fiks X"
Perplexity → analyserer kode via MCP
Perplexity → sender instruksjon til KIMI i iTerm
KIMI → koder, tester, committer
Perplexity → verifiserer via MCP
Perplexity → trigger autopilot-deploy
```

Eksempel-prompt til KIMI:
```
Fiks leaderboard 404: lag placeholder src/app/[locale]/leaderboard/page.tsx,
kjør tsc --noEmit og lint, commit og push.
```

---

## 🗄️ DATABASE — Sikker endring

```bash
# 1. Sjekk status
npm run db:status

# 2. Lint migrasjoner
npm run db:lint

# 3. Push med bekreftelse
npm run db:push:all:yes

# 4. Generer nye typer etter migrasjon
npm run db:gen-types
```

Aldri:
- `DROP TABLE` uten backup-verifisering
- `db:push` uten `db:lint` først

---

## 📡 SIGNALS — Overvåking og reparasjon

```bash
# Rask sjekk
npm run signals:health

# Full diagnose
npm run signals:doctor

# Tving kjøring av edge function
npm run signals:invoke

# Full redeploy av signal-engine
npm run signals:deploy:pipeline
```

Ved stale heartbeat (>10 min):
1. `signals:doctor` → les `lastError`
2. Sjekk `cron.job_run_details` for signal-engine-5min
3. Verifiser at `Authorization: Bearer` ikke er tom
4. `signals:invoke` manuelt

---

## 🧹 TECH DEBT — Prioritert liste

| Prioritet | Oppgave | Kommando / Fil |
|-----------|---------|----------------|
| P0 | pg_cron secret → Vault | SQL: `vault.create_secret(...)` |
| P0 | Verifiser `sync-prices` + `tick` cron | `curl klarpakke.no/api/cron/sync-prices` |
| P1 | `/leaderboard` + `/leagues` 404 | Lag `page.tsx` placeholder |
| P1 | Hardkodede `/no/`-lenker | `grep -r 'href="/no/'` → fiks til `/${locale}/` |
| P1 | Sitemap engelske paths | `src/app/sitemap.ts` |
| P2 | Cloudflare API token | Cloudflare env → `CF_API_TOKEN` |
| P2 | `as any` → riktige typer | Supabase type refactor |

---

## 🏛️ MEMPALACE — Vedlikehold

```bash
# Rask oppdatering etter arbeidssesjon
npm run mempalace:sync

# Full re-indeksering
npm run mempalace:sync:full

# Wake (vis kritiske fakta)
npm run mempalace:wake

# Status
npm run mempalace:status
```

Hva som skal indekseres:
- Alle ADR-er i `docs/adr/`
- Feilmønstre og løsninger i `.knowledge/errors/`
- Denne runbooken (auto-indeksert via `docs/`-source i `mempalace.yaml`)

---

## 🔴 ROLLBACK

```bash
# Rollback Cloudflare til forrige deployment
npx wrangler rollback

# Sjekk siste deployments
npx wrangler deployments list

# Rollback DB migrasjon
# OBS: Krever manuell SQL — snakk med Perplexity først
```

---

## 📋 DAGLIG SJEKKLISTE (morgen)

```bash
npm run mempalace:wake       # Hva vet vi?
npm run signals:health       # Signal-engine OK?
npm run db:status            # DB-migrasjoner synket?
npm run auto:preflight       # Alle API-er oppe?
```

---

## 🤖 Agentroller

| Agent | Rolle | Trigger |
|-------|-------|---------|
| **KIMI** | Kode, terminal, filer, git, deploy | Alltid i iTerm |
| **Perplexity Pro** | Analyse, arkitektur, prioritering, QA | MCP + samtale |
| **GitHub Actions** | CI på PR og push til main | Automatisk |
| **MemPalace** | Langtidsminne, beslutninger, feilmønstre | Etter hver sesjon |
