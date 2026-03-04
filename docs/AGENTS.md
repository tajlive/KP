# 🤖 AGENTS.md - Klarpakke Project Context

**Denne filen er for AI-assistenter (Claude, Kimi, etc.) som jobber på prosjektet.**

---

## 📋 Prosjektoversikt

| Felt | Verdi |
|------|-------|
| **Navn** | Klarpakke |
| **Type** | Trading Platform with AI Signals |
| **Stack** | Cloudflare Pages + Supabase + Webflow |
| **Domene** | klarpakke.no |
| **GitHub** | tombomann/klarpakke |

---

## 🏗️ Arkitektur

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  Cloudflare Pages (klarpakke.pages.dev)                 │
│  └── 19 HTML-sider i webflow-pages/                     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    BACKEND                               │
│  Supabase (swfyuwkptusceiouqlks.supabase.co)            │
│  ├── Database: signals, users, positions                │
│  ├── Auth: Supabase Auth                                │
│  └── Edge Functions: approve-signal, etc.               │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    DNS                                   │
│  Cloudflare (klarpakke.no)                              │
│  ├── CNAME root → main.klarpakke.pages.dev             │
│  └── Redirect root → www                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 MCP Configuration (VIKTIG!)

Dette prosjektet bruker MCP for AI-tilgang til infrastruktur:

### Konfigurerte MCP Servers
```toml
# ~/.kimi/config.toml
[[mcp.servers]]
name = "supabase"
command = "npx"
args = ["-y", "@supabase/mcp-server@latest"]
env = { SUPABASE_ACCESS_TOKEN = "${SUPABASE_ACCESS_TOKEN}", SUPABASE_PROJECT_ID = "swfyuwkptusceiouqlks" }

[[mcp.servers]]
name = "cloudflare"
command = "npx"
args = ["wrangler", "mcp"]
env = { CLOUDFLARE_API_TOKEN = "${CLOUDFLARE_API_TOKEN}" }

[[mcp.servers]]
name = "github"
command = "npx"
args = ["-y", "@github/mcp-server"]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "${GITHUB_TOKEN}" }
```

### Miljøvariabler som må være satt
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
export CLOUDFLARE_API_TOKEN="..."
export GITHUB_TOKEN="ghp_..."
export SUPABASE_PROJECT_ID="swfyuwkptusceiouqlks"
```

### Hvordan aktivere MCP
```bash
# 1. Sjekk at tokens er satt
echo $SUPABASE_ACCESS_TOKEN
echo $CLOUDFLARE_API_TOKEN

# 2. Verifiser MCP-status
kimi --mcp-status

# 3. Hvis ikke OK, kjør setup
cd /Users/taj/klarpakke && ./scripts/setup-mcp-env.sh
```

---

## 🎯 Viktige kommandoer

### DNS / Cloudflare
```bash
# Liste DNS-records
dig +short NS klarpakke.no @1.1.1.1
dig +short A klarpakke.no @1.1.1.1

# Test nettside
curl -I https://www.klarpakke.no
curl -I https://www.klarpakke.no/login
```

### Deploy
```bash
# Deploy til Cloudflare Pages
cd webflow-pages && npx wrangler pages deploy . --project-name=klarpakke --branch=main

# Deploy Supabase Edge Functions
supabase functions deploy
```

### Database
```bash
# Koble til database
psql $SUPABASE_DB_URL

# Eller via Supabase CLI
supabase db pull
supabase db push
```

### GitHub (via MCP)
```bash
# Issues - list, create, update
"List all open issues labeled 'bug'"
"Create issue: Login button not working on mobile"
"Close issue #42 as completed"

# Pull Requests
"Show me open PRs"
"Review PR #15 - check if tests pass"
"Merge PR #20 with squash"

# Repository info
"Show recent commits to main branch"
"What's the status of the last GitHub Actions run?"
"Search for 'TODO' in the codebase"

# Project Board
"Show project board columns"
"Move issue #10 to 'In Progress'"
"List all high priority issues"
```

---

## 📁 Viktige filer

| Fil | Hva den gjør |
|-----|--------------|
| `webflow-pages/*.html` | 19 statiske HTML-sider |
| `webflow-pages/shared/auth.js` | Login/signup funksjonalitet |
| `webflow-pages/shared/dashboard.js` | Dashboard auth & data |
| `supabase/functions/` | Edge Functions |
| `scripts/setup-mcp-env.sh` | MCP oppsett |
| `docs/MCP-SETUP.md` | MCP dokumentasjon |

---

## 🚨 Kjente Issues & Løsninger

### Issue: Error 1014 (CNAME Cross-User)
**Løsning:** Sett alle poster til "DNS only" (grå sky)

### Issue: Login-side blinker/loader ikke
**Løsning:** Sjekk at auth.js og Supabase config er inkludert

### Issue: MCP server ikke tilkoblet
**Løsning:** Kjør `./scripts/setup-mcp-env.sh` og reload terminal

---

## 💡 Tips for AI-assistenter

1. **Alltid sjekk AGENTS.md først** - inneholder prosjektkontekst
2. **Bruk MCP når mulig** - for DNS/database/endepunkter
3. **Test etter endringer** - curl/HTTP tester er raske
4. **Deploy til Pages** - etter HTML/JS endringer
5. **Commit endringer** - hold git history clean

---

## 🔗 Nyttige lenker

- **Live site:** https://www.klarpakke.no
- **Supabase Dashboard:** https://supabase.com/dashboard/project/swfyuwkptusceiouqlks
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **GitHub Issues:** https://github.com/tombomann/klarpakke/issues

---

*Sist oppdatert: 2026-02-01*
*Forfatter: Claude Code (AI Assistant)*
