# 📋 Linear Integrasjon - Full Setup

> **Linear CLI + MCP + API - Komplett integrasjon**

---

## 🚀 Hurtigstart

### 1. Installer Linear CLI
```bash
npm install -g @linear/cli
```

### 2. Sett opp API Token
```bash
export LINEAR_API_KEY="lin_api_din_token_her"
# eller legge til i .env.local
```

**Få token**: https://linear.app/settings/api

---

## 🛠️ Tilgjengelige Verktøy

### Linear CLI (Kommandolinje)
```bash
# Vis nåværende bruker
lin me

# List issues
lin issue list

# Opprett issue
lin issue create --title "Bug fix" --team "TEAM_KEY"

# Søk
lin issue list --search "login"

# Teams
lin team list
```

### MCP Server (npx)
```
@linear create_issue {"title": "Ny feature", "teamId": "..."}
@linear list_issues {"state": "in_progress"}
@linear list_teams
```

### MCP CLI Tools (bash)
```bash
bash scripts/mcp-linear-tools.sh me
bash scripts/mcp-linear-tools.sh issues
bash scripts/mcp-linear-tools.sh create-issue "Bug fix" "TEAM_KEY"
bash scripts/mcp-linear-tools.sh teams
bash scripts/mcp-linear-tools.sh search "login"
```

### REST API
```bash
# Hent bruker
curl /api/linear/me

# List issues
curl /api/linear/issues
curl /api/linear/issues?state=in_progress

# Opprett issue
curl -X POST /api/linear/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "Bug fix", "teamId": "..."}'

# List teams
curl /api/linear/teams
```

---

## 📡 MCP Konfigurasjon

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    },
    "linear-cli": {
      "command": "bash",
      "args": ["/Users/taj/klarpakke/scripts/mcp-linear-tools.sh"]
    }
  }
}
```

---

## 🔧 API Endepunkter

| Endepunkt | Metode | Beskrivelse |
|-----------|--------|-------------|
| `/api/linear/me` | GET | Nåværende bruker |
| `/api/linear/issues` | GET | List issues |
| `/api/linear/issues` | POST | Opprett issue |
| `/api/linear/teams` | GET | List teams |

---

## 📝 Eksempler

### Opprett bug fra Sentry error
```bash
# Hent Sentry error
curl /api/sentry/errors

# Opprett Linear issue
curl -X POST /api/linear/issues \
  -d '{"title": "Fix: Login error", "description": "..."}'
```

### Automatisk ved deploy
```bash
# Etter deploy, oppdater issues
curl -X POST /api/linear/issues \
  -d '{"title": "Deploy v1.2.0", "state": "done"}'
```

---

## 🔗 Ressurser

- [Linear CLI Docs](https://github.com/linear/linear/tree/master/packages/cli)
- [Linear API Docs](https://developers.linear.com/docs/graphql/working-with-the-graphql-api)
- [MCP Linear](https://www.npmjs.com/package/@linear/mcp-server)
