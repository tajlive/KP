# 🔧 Komplett MCP Oppsett for Klarpakke

> **Full kontroll over Supabase + Vercel via MCP (Model Context Protocol)**

## 📋 Hva er konfigurert

| MCP Server | URL | Status |
|------------|-----|--------|
| **Klarpakke Local** | `mcp-server/mcp-wrapper.sh` | 170+ custom tools |
| **Supabase Official** | `https://mcp.supabase.com/mcp` | Database + Edge Functions |
| **Vercel Official** | `https://mcp.vercel.com` | Deployments + Projects |

---

## 🚀 Hurtigstart

### 1. Cursor (anbefalt)

Konfigurasjonen er allerede på plass i `.cursor/mcp.json`:

```bash
# Cursor vil automatisk oppdage serverne ved neste oppstart
# Eller: Cmd+Shift+P → "MCP: List Servers" → Start hver server
```

### 2. Claude Desktop

```bash
# Åpne config:
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Legg til:
```json
{
  "mcpServers": {
    "klarpakke": {
      "command": "bash",
      "args": ["/Users/taj/klarpakke/mcp-server/mcp-wrapper.sh"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vuxbjlykgmzskxbclquf"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com/tom-jensens-projects/klarpakke"
    }
  }
}
```

### 3. Kimi CLI

Kimi støtter HTTP MCP servers direkte. Legg til i `.kimi/mcp_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vuxbjlykgmzskxbclquf"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com/tom-jensens-projects/klarpakke"
    }
  }
}
```

---

## 🛠️ Tilgjengelige Tools

### Supabase MCP Tools

| Tool | Beskrivelse |
|------|-------------|
| `execute_sql` | Kjør SQL direkte i databasen |
| `list_tables` | List alle tabeller |
| `list_extensions` | Se Postgres extensions |
| `apply_migration` | Kjør migrasjoner |
| `get_logs` | Hent logger (API, Postgres, Edge Functions) |
| `get_advisors` | Sikkerhets- og performance advisors |
| `list_edge_functions` | List Edge Functions |
| `deploy_edge_function` | Deploy Edge Function |
| `search_docs` | Søk i Supabase docs |

### Vercel MCP Tools

| Tool | Beskrivelse |
|------|-------------|
| `search_docs` | Søk i Vercel dokumentasjon |
| `list_projects` | List alle prosjekter |
| `list_deployments` | List deployments |
| `create_deployment` | Deploy til Vercel |
| `get_deployment_logs` | Hent deploy logs |
| `manage_env_vars` | Håndter miljøvariabler |

### Klarpakke Local MCP Tools (170+)

| Kategori | Tools |
|----------|-------|
| **vercel_** | Deploy, status, logs |
| **supabase_** | SQL, migrasjoner, Edge Functions |
| **stripe_** | Betalinger, customers, subscriptions |
| **github_** | Repos, issues, PRs |
| **cloudflare_** | DNS, zones |
| **cloudrun_** | GCP Cloud Run |
| **monitor_** | Health checks |
| **build_** | CI/CD tools |

---

## 🔐 Autentisering

### Supabase

Ved første bruk vil du få en OAuth-prompt. Logg inn med din Supabase-konto.

Alternativt (for CI):
```bash
# Generer PAT: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=sbp_xxx
```

### Vercel

Ved første bruk vil du få en OAuth-prompt. Logg inn med din Vercel-konto.

Alternativt:
```bash
# Hent token: https://vercel.com/account/tokens
export VERCEL_TOKEN=xxx
```

---

## 📝 Eksempel-kommandoer

### Supabase

```
"List alle tabeller i databasen"
"Kjør: SELECT * FROM trading_sessions WHERE status = 'active'"
"Hent siste Postgres logger"
"Deploy Edge Function process-copy-trades"
"Sjekk sikkerhetsadvisors"
```

### Vercel

```
"Deploy til production"
"Hent siste deploy logs"
"List alle miljøvariabler"
"Søk i Vercel docs om edge functions"
```

### Kombinert

```
"Kjør SQL migrasjon og deploy til Vercel etterpå"
"Sjekk database status og hent deploy logs"
"Hent errors fra både Supabase og Vercel"
```

---

## 🚨 Feilsøking

### "Cannot connect to MCP server"

1. Sjekk at URL-en er korrekt
2. Prøv å autentisere på nytt (OAuth)
3. Sjekk nettverk/proxy

### "Permission denied"

1. Sjekk at du har riktige rettigheter i Supabase/Vercel
2. For Supabase: Sjekk RLS policies
3. For Vercel: Sjekk team-medlemskap

### SQL feil

1. Sjekk at tabellen finnes: `\dt` eller `list_tables`
2. Sjekk syntaks i SQL
3. Se Postgres logger: `get_logs` tool

---

## 📚 Ressurser

- [Supabase MCP Docs](https://supabase.com/docs/guides/getting-started/mcp)
- [Vercel MCP Docs](https://vercel.com/docs/agent-resources/vercel-mcp)
- [MCP Specification](https://modelcontextprotocol.io/)

---

**Sist oppdatert:** 2026-02-24  
**Versjon:** 1.0.0
