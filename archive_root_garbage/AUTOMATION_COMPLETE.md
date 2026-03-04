# 🚀 Klarpakke - Full Automatisering

> **Komplett DevOps automatisering med 50+ verktøy og scripts**

---

## 📋 Hva er Konfigurert

### 1. 🎯 **MCP Servere** (5 stk)
```
✅ Supabase     → SQL, Edge Functions, Logs
✅ Vercel       → Deploy, Env Vars, Logs  
✅ Linear       → Issues, Projects, Teams
✅ Sentry       → Errors, Performance
✅ Klarpakke    → 170+ custom tools
```

### 2. 🔧 **Makefile** (30+ kommandoer)
```bash
make setup          # Full dev setup
make test           # Kjør alle tester
make deploy         # Deploy til Vercel
make db-backup      # Backup database
make security-scan  # Security scan
make ai-review      # AI code review
make ship-it        # Full pipeline
```

### 3. 🤖 **Automatiseringsscripts** (10 stk)
| Script | Beskrivelse |
|--------|-------------|
| `dev-setup.sh` | One-command setup for nye utviklere |
| `setup-git-hooks.sh` | Pre-commit, commit-msg, post-merge hooks |
| `mcp-auto-deploy.sh` | Full CI/CD pipeline |
| `mcp-sql-executor.py` | SQL execution via MCP |
| `db-backup.sh` | Automatisk database backup |
| `security-scan.sh` | Security + secrets scan |
| `generate-changelog.sh` | Auto-generer changelog |
| `ai-code-review.sh` | AI-assistert code review |
| `ai-commit.sh` | AI-genererte commit meldinger |
| `dashboard.sh` | Interaktiv dashboard |

### 4. 🔄 **GitHub Actions** (CI/CD)
```yaml
✅ QA Checks      → Lint, TypeScript, Format
✅ Testing        → Unit tests, Coverage
✅ Security       → npm audit, CodeQL, Secrets
✅ Deploy         → Vercel + Edge Functions
✅ Documentation  → Auto changelog
✅ Maintenance    → Daily dependency check
```

### 5. 🐳 **Docker** (Lokal utvikling)
```yaml
✅ Next.js App    → Hot reload utvikling
✅ Supabase       → Lokal database
✅ Redis          → Caching
✅ MinIO          → S3 storage
✅ MailHog        → Email testing
✅ Stripe CLI     → Webhook testing
```

### 6. 🎣 **Git Hooks**
```bash
pre-commit    → Lint + TypeScript + Secrets scan
commit-msg    → Commit melding validering
post-merge    → Auto-install dependencies
```

---

## 🚀 Hurtigstart

### Ny Utvikler (5 minutter)
```bash
# 1. Clone repo
git clone <repo-url>
cd klarpakke

# 2. One-command setup
bash scripts/automation/dev-setup.sh

# 3. Start utvikling
npm run dev
```

### Daglig Bruk
```bash
# Interaktiv dashboard
bash scripts/automation/dashboard.sh

# Eller bruk Makefile:
make help           # Vis alle kommandoer
make qa             # Lint + TypeScript + Test
make deploy         # Deploy til Vercel
make status         # Sjekk system status
```

### Full Pipeline
```bash
make ship-it        # QA → Test → Build → Deploy Prod
```

---

## 📡 MCP Verktøy

### I Kimi CLI:
```
@supabase execute_sql "SELECT * FROM users"
@vercel create_deployment
@linear create_issue
@sentry get_errors
```

### I Cursor:
- Åpne Command Palette → "MCP: List Servers"
- Alle 5 MCP servere er tilgjengelige

---

## 🔐 Sikkerhet

### Automatisk scanning:
- ✅ npm audit (high severity)
- ✅ GitLeaks (secrets detection)
- ✅ CodeQL (code analysis)
- ✅ Hardcoded credentials check
- ✅ .env i .gitignore sjekk

### Kjør manuelt:
```bash
make security-scan
make secrets-check
```

---

## 🤖 AI Automatisering

### AI Code Review
```bash
bash scripts/automation/ai-code-review.sh
```
Analyserer:
- Type safety
- Error handling
- Console statements
- Performance issues
- Security risks

### AI Commit
```bash
bash scripts/automation/ai-commit.sh
```
Genererer:
- Conventional commits format
- Basert på endrede filer
- Smart type detection (feat/fix/chore)

### AI Changelog
```bash
make changelog
```
Genererer fra git history:
- Features
- Bug fixes
- Documentation
- Maintenance

---

## 📊 Dashboard

```bash
bash scripts/automation/dashboard.sh
```

Interaktiv meny:
1. Setup & Installasjon
2. Development
3. Database
4. Deploy
5. Monitoring
6. AI & Automatisering
7. Security
8. Full Pipeline

---

## 🐳 Docker Utvikling

```bash
# Start alle tjenester
docker-compose -f docker-compose.dev.yml up

# Tilgang:
# - App:       http://localhost:3000
# - Supabase:  http://localhost:54323
# - MailHog:   http://localhost:8025
# - MinIO:     http://localhost:9001
```

---

## 📁 Filstruktur

```
klarpakke/
├── .cursor/mcp.json              # Cursor MCP config
├── .kimi/mcp_config.json         # Kimi MCP config
├── .github/workflows/
│   └── automation.yml            # CI/CD pipeline
├── scripts/
│   ├── automation/
│   │   ├── dev-setup.sh          # One-command setup
│   │   ├── setup-git-hooks.sh    # Git hooks
│   │   ├── db-backup.sh          # DB backup
│   │   ├── security-scan.sh      # Security scan
│   │   ├── generate-changelog.sh # Changelog
│   │   ├── ai-code-review.sh     # AI review
│   │   ├── ai-commit.sh          # AI commit
│   │   └── dashboard.sh          # Dashboard
│   ├── mcp-auto-deploy.sh        # Full deploy
│   ├── mcp-sql-executor.py       # SQL executor
│   └── setup-mcp-automation.sh   # MCP setup
├── Makefile.automation           # 30+ kommandoer
├── docker-compose.dev.yml        # Docker stack
├── Dockerfile.dev                # Dev image
└── AUTOMATION_COMPLETE.md        # Denne filen
```

---

## 🎯 Vanlige Workflows

### 1. Start ny feature
```bash
git checkout -b feature/ny-funksjon
make qa                 # Sjekk at alt er OK
npm run dev             # Start utvikling
```

### 2. Commit endringer
```bash
git add .
bash scripts/automation/ai-commit.sh   # AI-generert commit
git push
```

### 3. Før PR
```bash
make full-check         # Lint + TypeScript + Test + Build
bash scripts/automation/ai-code-review.sh
```

### 4. Deploy til Prod
```bash
make ship-it            # Full pipeline til produksjon
```

### 5. Debug produksjon
```bash
make logs               # Vercel logs
make logs-edge          # Edge Function logs
make sentry             # Sentry errors
```

---

## 🔧 Tilpasning

### Legg til eget script:
```bash
# 1. Lag script i scripts/automation/
# 2. Gjør det kjørbart: chmod +x script.sh
# 3. Legg til i Makefile.automation
# 4. Legg til i dashboard.sh
```

### Konfigurer varsler:
```bash
# GitHub Actions varsler:
# - Slack: Legg til SLACK_WEBHOOK_URL secret
# - Email: Konfigurer i GitHub Settings
```

---

## 🚨 Feilsøking

| Problem | Løsning |
|---------|---------|
| "MCP server not connected" | Kjør `bash scripts/setup-mcp-automation.sh` |
| "Token not found" | `source .env.mcp.local` |
| "Lint feil" | `make lint-fix` |
| "TypeScript feil" | `npx tsc --noEmit` for detaljer |
| "Deploy feil" | Sjekk `make logs` |
| "Database timeout" | Sjekk `supabase status` |

---

## 📚 Ressurser

- **MCP Guide**: `MCP_MASTER_GUIDE.md`
- **Setup Guide**: `MCP_COMPLETE_SETUP.md`
- **Architecture**: `ARCHITECTURE.md`

---

## 🎉 Du har nå:

✅ **One-command setup** for nye utviklere  
✅ **AI-assistert** kodegjennomgang  
✅ **Automatisk** testing & deploy  
✅ **Sikkerhet** scanning i CI/CD  
✅ **Database** backup & migrasjoner  
✅ **MCP integrasjon** med 5 servere  
✅ **Docker** for lokal utvikling  
✅ **30+ Makefile** kommandoer  
✅ **Interaktiv** dashboard  

---

**🚀 Alt er automatisert! Bare skriv `make ship-it` for å deploye!**
