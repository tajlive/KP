# 🔧 GitHub Setup Guide for Klarpakke

Repository: [tajlive/KP](https://github.com/tajlive/KP)

## ✅ Automatisert (Allerede gjort)

- ✅ GitHub Actions workflows (CI, deploy, security)
- ✅ Dependabot configuration (inkl. MCP Server)
- ✅ Issue/PR templates (Norsk)
- ✅ CodeQL security scanning
- ✅ .gitignore oppdatert

## 📋 Manuell Setup (5-10 min)

### 1. Branch Protection

**Settings → Branches → Add rule**

Branch: `main`

Huk av:
- ✅ Require pull request (1 approval)
- ✅ Require status checks:
  - `lint`
  - `type-check`
  - `build`
  - `mcp-server` (optional)
- ✅ Require conversation resolution
- ✅ Require linear history
- ❌ Allow force pushes

### 2. GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret**

```bash
# Supabase (påkrevd)
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxx
SUPABASE_DB_PASSWORD=xxxxxxxxxxxxx
SUPABASE_PROJECT_ID=xxxxxxxxxxxxx

# Binance (for live trading)
BINANCE_API_KEY=xxxxxxxxxxxxx
BINANCE_SECRET_KEY=xxxxxxxxxxxxx

# Hugging Face (for AI sentiment)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx

# Cloudflare (for Workers AI)
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxx
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxx

# Vercel (for deployment)
VERCEL_TOKEN=xxxxxxxxxxxxx
VERCEL_ORG_ID=xxxxxxxxxxxxx
VERCEL_PROJECT_ID=xxxxxxxxxxxxx

# Slack (valgfritt)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

⚠️ **KRITISK: ALDRI commit secrets til git!**

### 3. Enable Security Features

**Settings → Code security and analysis**

Enable:
- ✅ Dependency graph
- ✅ Dependabot alerts
- ✅ Dependabot security updates
- ✅ Code scanning (CodeQL)
- ✅ Secret scanning
- ✅ Secret scanning push protection

### 4. Setup GitHub Labels

```bash
# Med GitHub CLI
chmod +x scripts/setup-github-labels.sh
./scripts/setup-github-labels.sh

# Eller med Node.js
GITHUB_TOKEN=your_token node scripts/setup-github-labels.js
```

Labels: `bug`, `enhancement`, `priority:*`, `component:*`, `mcp-server`, etc.

### 5. Verifiser Setup

```bash
# Opprett test branch
git checkout -b test/github-actions
git push origin test/github-actions

# → GitHub Actions skal kjøre automatisk
# → Sjekk Actions tab for status
```

## 📚 Ressurser

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Supabase CI/CD](https://supabase.com/docs/guides/cli/managing-environments)
- [Dependabot Docs](https://docs.github.com/en/code-security/dependabot)

## 🔧 Feilsøking

**Actions ikke triggered?**
- Sjekk at `.github/workflows/` er i repo root
- Sjekk YAML syntaks: `npx yaml-lint .github/workflows/ci.yml`

**Secrets ikke tilgjengelig?**
- Sjekk at secrets er satt i Repository settings (ikke Environment)
- Sjekk at secret navn matcher i workflow

**MCP Server check feiler?**
- Kjør lokalt: `./scripts/mcp.sh check`
- Sjekk at `.env` finnes i `klarpakke-mcp-server/`
