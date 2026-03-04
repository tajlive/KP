# 🚀 MCP Master Automatisering Guide

> **Full automatisering av Klarpakke via MCP (Model Context Protocol)**
> **Inkluderer: Supabase + Vercel + Linear + Sentry**

## 📋 Oversikt

| Komponent | MCP Server | Tools |
|-----------|------------|-------|
| **Supabase** | `https://mcp.supabase.com` | execute_sql, deploy_edge_function, get_logs |
| **Vercel** | `https://mcp.vercel.com` | create_deployment, manage_env_vars, get_logs |
| **Linear** | `npx -y @linear/mcp-server` | create_issue, list_issues, update_issue |
| **Sentry** | `https://mcp.sentry.io` | get_errors, create_release, get_performance |
| **Lokal** | `mcp-server/mcp-wrapper.sh` | 170+ custom tools |

---

## 🚀 Hurtigstart

### 1. Sett opp tokens (én gang)

```bash
# Kjør setup script
bash scripts/setup-mcp-automation.sh

# Eller manuelt:
export SUPABASE_ACCESS_TOKEN="sbp_din_token_her"
export VERCEL_TOKEN="vercel_token_her"
export LINEAR_API_KEY="lin_api_xxx"
export SENTRY_AUTH_TOKEN="sentry_token_her"
```

**Få tokens:**
- **Supabase**: https://app.supabase.com/account/tokens
- **Vercel**: https://vercel.com/account/tokens
- **Linear**: https://linear.app/settings/api
- **Sentry**: https://sentry.io/settings/account/api/auth-tokens/

### 2. Start MCP servere

**Cursor:**
- Åpne Cursor → Settings → MCP
- Servere er allerede konfigurert i `.cursor/mcp.json`

**Kimi CLI:**
```bash
# Kimi støtter MCP automatisk
kimi chat

# Bruk @ for å kalle MCP tools:
@supabase list_tables
@linear create_issue
@sentry get_errors
```

---

## 🛠️ Automatiseringsscripts

### Full Deploy Pipeline
```bash
bash scripts/mcp-auto-deploy.sh
```
Kjører: SQL migrering → Build → Edge Functions → Git push → Vercel deploy

### SQL Executor
```bash
python3 scripts/mcp-sql-executor.py supabase/migrations/001_trading_system.sql
```

### Setup & Konfigurasjon
```bash
bash scripts/setup-mcp-automation.sh
```

---

## 📡 MCP Tools Reference

### Supabase Tools

| Tool | Beskrivelse | Eksempel |
|------|-------------|----------|
| `execute_sql` | Kjør SQL direkte | `execute_sql: "SELECT * FROM users"` |
| `deploy_edge_function` | Deploy Edge Function | `deploy: "strategy-runner"` |
| `get_logs` | Hent logger | `get_logs: {service: "postgres"}` |
| `list_tables` | List tabeller | `list_tables` |
| `apply_migration` | Kjør migrasjon | `apply_migration: "001_trading"` |

### Vercel Tools

| Tool | Beskrivelse | Eksempel |
|------|-------------|----------|
| `create_deployment` | Deploy til prod | `create_deployment: {prod: true}` |
| `get_deployment_logs` | Hent deploy logs | `get_deployment_logs` |
| `manage_env_vars` | Håndter env vars | `manage_env_vars: {key: "API_KEY"}` |
| `list_projects` | List prosjekter | `list_projects` |

### Linear Tools

| Tool | Beskrivelse | Eksempel |
|------|-------------|----------|
| `create_issue` | Opprett issue | `create_issue: {title: "Bug", teamId: "..."}` |
| `list_issues` | List issues | `list_issues: {state: "todo"}` |
| `update_issue` | Oppdater issue | `update_issue: {id: "...", state: "done"}` |
| `list_teams` | List teams | `list_teams` |
| `list_projects` | List prosjekter | `list_projects` |

### Sentry Tools

| Tool | Beskrivelse | Eksempel |
|------|-------------|----------|
| `get_errors` | Hent feil | `get_errors: {project: "klarpakke"}` |
| `create_release` | Opprett release | `create_release: {version: "v1.2.0"}` |
| `get_performance` | Hent performance | `get_performance: {transaction: "/api/*"}` |
| `get_issues` | Hent issues | `get_issues: {status: "unresolved"}` |

### Lokal Verktøy (170+)

| Prefiks | Eksempler |
|---------|-----------|
| `supabase_` | supabase_sql, supabase_deploy |
| `vercel_` | vercel_deploy, vercel_logs |
| `stripe_` | stripe_customers, stripe_subscriptions |
| `github_` | github_issues, github_prs |
| `linear_` | linear_issues, linear_create |
| `sentry_` | sentry_errors, sentry_releases |
| `build_` | build_check, build_deploy |

---

## 🔄 Vanlige Workflows

### Workflow 1: Feilhåndtering (Sentry → Linear → Deploy)
```
"Hent siste feil fra Sentry, opprett Linear issue, og deploy fix"
```

### Workflow 2: Feature Deploy
```
"Kjør SQL migrering, deploy til Vercel, og opprett Linear issue for testing"
```

### Workflow 3: Monitoring
```
"Hent Sentry errors og Vercel logs fra siste time"
```

### Workflow 4: Release
```
"Opprett Sentry release, deploy til Vercel, oppdater Linear"
```

### Workflow 5: Database + Edge Functions
```
"Deploy alle Edge Functions og verifiser at de kjører"
```

---

## 🔐 Sikkerhet

### Tokens lagres i:
- `.env.mcp.local` (lokal fil, ikke i git)
- Shell config (`~/.zshrc` eller `~/.bashrc`)

### Aldri commit:
```bash
# Sjekk at .gitignore inneholder:
.env.mcp
.env.mcp.local
*.token
```

---

## 🐛 Feilsøking

### "Token not found"
```bash
source .env.mcp.local
# eller
export SUPABASE_ACCESS_TOKEN="..."
export LINEAR_API_KEY="..."
```

### "MCP server not connected"
1. Sjekk at tokens er satt
2. Restart Kimi/Cursor
3. Sjekk MCP config: `cat .kimi/mcp_config.json`

### "SQL execution failed"
- Sjekk SQL syntaks
- Verifiser at tabell finnes: `list_tables`
- Se Postgres logger: `get_logs`

---

## 📁 Konfigurasjonsfiler

```
.cursor/mcp.json          # Cursor MCP config
.kimi/mcp_config.json     # Kimi CLI MCP config
.env.mcp.local            # Tokens (gitignored)
scripts/                  # Automatiseringsscripts
  ├── setup-mcp-automation.sh
  ├── mcp-auto-deploy.sh
  └── mcp-sql-executor.py
```

---

## 🎯 Neste Steg

1. **Sett opp tokens**: `bash scripts/setup-mcp-automation.sh`
2. **Test MCP**: Prøv `@supabase list_tables`
3. **Test Linear**: `@linear list_teams`
4. **Test Sentry**: `@sentry get_errors`
5. **Kjør deploy**: `bash scripts/mcp-auto-deploy.sh`

---

**Dokumentasjon:**
- Supabase MCP: https://supabase.com/docs/guides/getting-started/mcp
- Vercel MCP: https://vercel.com/docs/agent-resources/vercel-mcp
- Linear MCP: https://linear.app/docs/mcp (kommer)
- Sentry MCP: https://docs.sentry.io/product/mcp (kommer)
- MCP Spec: https://modelcontextprotocol.io/

---

**🎉 Du har nå FULL automatisering med 5 MCP servere!**
