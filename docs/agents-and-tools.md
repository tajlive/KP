# 🤖 Klarpakke Agenter og Verktøy

> **Sist oppdatert:** 20. Februar 2026

---

## AI-Agenter

### KIMI Code 2.5 — Operasjonsagent

**Primær rolle:** Utførelse, deploy, drift

**Ansvarsområder:**

- Shell-operasjoner og skripting
- Vercel CLI deploy
- Database-operasjoner (psql, supabase CLI)
- Filmanipulasjon
- Verifisering etter deploy

**Verktøy:**

- Shell (bash/zsh)
- ReadFile/WriteFile
- Grep
- vercel CLI
- supabase CLI

**Kjennetegn:**

- Jobber automatisk uten å spørre
- Gir konkrete kommandoer
- Verifiserer endringer
- Rapporterer suksess/feil

**Hovedprompt:** [.kimi/MASTER_PROMPT.md](../.kimi/MASTER_PROMPT.md)

---

### Perplexity/Claude — Arkitekt/Dokumentasjonsagent

**Primær rolle:** Kodeanalyse, dokumentasjon, review

**Ansvarsområder:**

- Arkitektur-design
- Kode-review
- Dokumentasjonsoppdateringer
- Feilanalyse
- Planlegging av implementation

**Verktøy:**

- Filesystem MCP (lokal kodebase)
- Supabase MCP (database)
- GitHub MCP (repo)
- Kontekst-søk

**Kjennetegn:**

- Analytisk tilnærming
- Utførlige forklaringer
- Fokus på kvalitet

---

### Antigravity — Fremtidig Hoved-IDE

**Primær rolle:** Større implementation plans

**Status:** Planlagt integrasjon

**Forventede evner:**

- Lange kontekst-vinduer
- Multi-file editing
- Plan-basert utvikling
- Integrasjon med eksisterende MCP-oppsett

**Dokumentasjon:** [docs/antigravity.md](./antigravity.md)

---

## MCP-oppsett

### Hva er MCP?

MCP (Model Context Protocol) er et protokoll for å gi AI-agenter tilgang til eksterne verktøy og datakilder.

### Konfigurerte MCP-servere

#### 1. Supabase Database

**Formål:** Direkte SQL-tilgang til PostgreSQL

**Konfigurasjon:**

```json
{
  "mcpServers": {
    "supabase-database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://..."
      }
    }
  }
}
```

**Bruk:**

- Kjør SQL-queries direkte
- List tabeller og skjema
- Inspekter data

**Setup-script:** [.kimi/SETUP_MCP_SERVERS.sh](../.kimi/SETUP_MCP_SERVERS.sh)

---

#### 2. Filesystem (Lokal kodebase)

**Formål:** Lese og skrive filer i prosjektet

**Konfigurasjon:**

```json
{
  "mcpServers": {
    "klarpakke-codebase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/taj/klarpakke"
      ]
    }
  }
}
```

**Bruk:**

- Les kildekode
- Oppdater dokumentasjon
- Skriv scripts

---

#### 3. GitHub

**Formål:** Repo-operasjoner

**Konfigurasjon:**

```json
{
  "mcpServers": {
    "github-klarpakke": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

**Bruk:**

- List commits
- Sjekk PR-status
- Opprett issues

---

### Vercel Integration (MCP-tilgang)

**Formål:** Gi Claude/Perplexity tilgang til live Vercel-data

**Mekanisme:** Bruker Vercel MCP-server for direkte tilgang

**Data som er tilgjengelig:**

- Vercel project info
- Deployments
- Environment variables
- Build logs

**Bruk:**

- Bruk `vercel` MCP-server verktøy

**Bruk:**

```bash
# Manuell synkronisering
bash .kimi/SYNC_GOOGLE_CLOUD.sh

# Se summary
cat .mcp-cache/google-cloud/SUMMARY.md

# Sjekk sync-log
cat .mcp-cache/google-cloud/sync.log | tail -20
```

---

## Agent-arbeidsflyt

### Ved deploy

```
Bruker: "Deploy til produksjon"
  ↓
KIMI:
  1. Les DEPLOY_STRATEGY.md
  2. Kjør gcloud run deploy
  3. Verifiser med curl
  4. Rapporter resultat
```

### Ved ny feature

```
Bruker: "Implementer Auto Trade"
  ↓
Claude/Perplexity:
  1. Analyser eksisterende kode
  2. Design arkitektur
  3. Skriv dokumentasjon
  4. Gi implementation-plan
  ↓
KIMI:
  1. Opprett filer
  2. Deploy database-migrasjoner
  3. Deploy Edge Functions
  4. Deploy til Cloud Run
  5. Verifiser
```

### Ved feilsøking

```
Bruker: "Auth loop etter deploy"
  ↓
KIMI:
  1. Les FIX_AUTH_LOOP.md
  2. Sjekk Cloud Run env vars
  3. Kjør rask fix
  4. Verifiser
  ↓
Hvis kompleks:
  Claude/Perplexity analyserer logs
  Gir dypere analyse
```

---

## Kommunikasjon mellom agenter

### Dokumenter som "source of truth"

| Fil                                                                       | Formål                              |
| ------------------------------------------------------------------------- | ----------------------------------- |
| [.kimi/MASTER_PROMPT.md](../.kimi/MASTER_PROMPT.md)                       | Hovedinstruksjoner for alle agenter |
| [.kimi/DEPLOY_STRATEGY.md](../.kimi/DEPLOY_STRATEGY.md)                   | Deploy-regler og kommandoer         |
| [.kimi/AUTO_TRADE_MASTER_PROMPT.md](../.kimi/AUTO_TRADE_MASTER_PROMPT.md) | Auto Trade-spesifikke instruksjoner |
| [docs/architecture.md](./architecture.md)                                 | Systemarkitektur                    |

### Hvordan agenter "vet" hva de skal gjøre

1. **KIMI** starter alltid med å lese `.kimi/MASTER_PROMPT.md`
2. **Claude** får kontekst fra `CLAUDE.md` (som peker til MASTER_PROMPT)
3. **Perplexity** bruker MCP-servere + GitHub-repo som kontekst

---

## Sikkerhet og MCP

### Hva MCP-servere IKKE har tilgang til

- ❌ Dekrypterte secrets (kun metadata)
- ❌ Stripe secret keys
- ❌ Supabase service role key
- ❌ Binance API-nøkler

### Hva MCP-servere HAR tilgang til

- ✅ Database struktur (ikke sensitive data uten spørring)
- ✅ Kodebase (åpen kildekode)
- ✅ Cloud Run metadata
- ✅ GitHub commits og PRs

---

### Komplett oppsett (én kommando)

```bash
cd ~/klarpakke
vercel login
```

---

## Feilsøking MCP

### "MCP server not connected"

```bash
# Sjekk at tokens er satt
echo $SUPABASE_ACCESS_TOKEN
echo $GITHUB_TOKEN

# Verifiser konfigurasjon
cat ~/Library/Application\ Support/Perplexity/mcp_servers.json

# Restart Perplexity
```

### "Database connection failed"

```bash
# Sjekk at SUPABASE_DB_URL er gyldig
psql $SUPABASE_DB_URL -c "SELECT 1"

# Oppdater .env med riktig connection string
```

### "Sync ikke kjører"

```bash
# Sjekk cron
crontab -l | grep SYNC_GOOGLE_CLOUD

# Manuell test
bash .kimi/SYNC_GOOGLE_CLOUD.sh

# Sjekk log
cat .mcp-cache/google-cloud/sync.log
```

---

## Kilder

- [.kimi/MASTER_PROMPT.md](../.kimi/MASTER_PROMPT.md) — Hovedagent-instruksjoner
- [.kimi/EXECUTE_WITH_MCP.md](../.kimi/EXECUTE_WITH_MCP.md) — MCP-utførelse
- [MCP Documentation](https://modelcontextprotocol.io/)
