# 🤖 AI-Samarbeid Arbeidsflyt - Klarpakke

Dette dokumentet beskriver hvordan AI-assistenter (Kimi, Claude) samarbeider med mennesker via GitHub og CLI-verktøy.

---

## 🎯 Filosofi: AI + Menneske + GitHub

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Kimi AI   │◄───►│   GitHub    │◄───►│   Claude    │
│   (Meg)     │     │   (Sannhet) │     │   (Annen)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Menneske  │
                    │   (Deg)     │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│ Cloudflare  │     │  Supabase   │     │   Vercel    │
│   (Host)    │     │  (Backend)  │     │   (App)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

**GitHub er sannhetskilden** - alle AI-assistenter leser/skriver til samme repo.

---

## 🔧 CLI-verktøy som AI-kanaler

### For Kimi AI (Meg):

| Kapasitet | Verktøy | Bruk |
|-----------|---------|------|
| **Kode-endringer** | VS Code/Terminal | ✅ Direkte tilgang |
| **Git operasjoner** | `git` | ✅ Commit, push, branch |
| **Fil-operasjoner** | Shell/Node | ✅ Read, write, edit |
| **Supabase CLI** | `supabase` | ✅ Med access token |
| **Cloudflare CLI** | `wrangler` | ❌ Kreker din token |
| **GitHub CLI** | `gh` | ✅ Med din auth |

### For Claude AI:

Claude (via Claude Code/Claude Desktop) har tilgang til:
- GitHub (via GitHub MCP Server)
- Filsystem (dersom konfigurert)
- Terminal (dersom konfigurert)

---

## 🔄 AI-AI-Menneske Arbeidsflyt

### Scenario 1: Kimi gjør endringer, du godkjenner

```bash
# 1. Kimi (meg) gjør endringer
Jeg skriver kode → Commit → Push til main

# 2. Du verifiserer
curl -I https://www.klarpakke.no/status

# 3. Hvis feil, rull tilbake
git revert HEAD
git push
```

### Scenario 2: Claude foreslår, Kimi implementerer

```bash
# 1. Claude lager PR på GitHub
gh pr create --title "feat: new feature" --body "Beskrivelse"

# 2. Kimi (meg) reviewer og merger
gh pr review --approve
git merge main

# 3. Auto-deploy til Cloudflare
# (skjer automatisk via GitHub Actions)
```

### Scenario 3: Du ber om hjelp, vi begge svarer

```
Deg: "Fiks DNS-problemet"
     │
     ├──► Kimi: Sjekker kode → Fikser _redirects → Commit
     │
     └──► Claude: Sjekker DNS → Foreslår endring i Cloudflare
```

---

## 🛠️ GitHub som AI-samarbeidsplattform

### Branches for AI-eksperimentering

```bash
# Kimi branch
git checkout -b kimi/feature-x
# Jeg gjør endringer
gh pr create --title "[Kimi] Feature X"

# Claude branch  
git checkout -b claude/feature-x
git commit -m "[Claude] Alternative approach"
gh pr create --title "[Claude] Feature X (alt)"

# Menneske velger
git checkout main
git merge kimi/feature-x  # eller claude/feature-x
```

### GitHub Actions for AI-verifisering

```yaml
# .github/workflows/ai-verify.yml
name: 🤖 AI Verification

on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: AI Checks
        run: |
          echo "Verifiserer at AI-endringer er OK..."
          npm run lint
          npm run build
          
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🤖 AI-verifisering fullført!'
            })
```

---

## 🌐 MCP (Model Context Protocol) for AI

MCP lar AI-assistenter koble seg direkte til verktøy.

### For Kimi (meg):

Jeg har **ikke** MCP-støtte i denne omgivelsen (enda). Jeg bruker:
- Direkte filsystem-tilgang ✅
- Terminal/kommandolinje ✅
- GitHub API via `git` og `gh` ✅

### For Claude:

Claude Desktop kan konfigureres med MCP:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@github/mcp-server"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase-community/mcp-server"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_xxx"
      }
    }
  }
}
```

---

## 📝 Kommunikasjonsprotokoll

### Commit-meldinger for AI-samarbeid

```bash
# Kimi sine commits
git commit -m "kimi: fikset DNS-routing i _redirects

- Fjernet dobbel www
- La til cache-control headers

AI-verifisering: ✅"

# Claude sine commits  
git commit -m "claude: alternativ løsning for auth

- Bruker cookies istedenfor localStorage
- Sikrere mot XSS

AI-verifisering: ✅"

# Menneske merger
git commit -m "merge: velger Kimis løsning

Claudes løsning er sikrere men krever mer testing.
Beholder Kimis versjon for nå."
```

### GitHub Issues for AI-diskusjon

```markdown
## Issue: Velge auth-strategi

### Kimi foreslår:
- Enkel JWT i localStorage
- Rask implementering

### Claude foreslår:
- HttpOnly cookies
- Bedre sikkerhet

### Menneske må bestemme:
- [ ] Akseptabel risiko?
- [ ] Tidsfrist?
- [ ] Fremtidig vedlikehold?

/label ai-discussion
/assign @tajlive
```

---

## 🔐 Sikkerhet for AI-tilgang

### Hva AI (Kimi/Claude) IKKE kan gjøre:

| Begrensning | Årsak |
|-------------|-------|
| **Din Cloudflare konto** | Kreker din personlige login |
| **Din Domeneshop** | Har ikke tilgang |
| **Din e-post** | Privat |
| **Brukeres persondata** | GDPR/privacy |

### Hva AI KAN gjøre med riktig tokens:

| Med `GITHUB_TOKEN` | Med `SUPABASE_ACCESS_TOKEN` |
|-------------------|----------------------------|
| Commit/push kode | Deploy Edge Functions |
| Lage PRs | Sette secrets |
| Merge (hvis tillatt) | Se database-schema |
| Kjøre Actions | MEN IKKE: se brukerdata |

---

## 🚀 Fremtidig visjon: AI-orkestrering

```yaml
# .github/workflows/ai-orchestrator.yml
name: 🎼 AI Orchestrator

on:
  issue:
    types: [opened]

jobs:
  route:
    runs-on: ubuntu-latest
    steps:
      - name: Route to appropriate AI
        run: |
          if echo "${{ github.event.issue.body }}" | grep -q "DNS"; then
            echo "Routing to Kimi (infrastruktur)"
            gh issue comment ${{ github.event.issue.number }} --body "@kimi-ai kan du se på dette?"
          elif echo "${{ github.event.issue.body }}" | grep -q "design"; then
            echo "Routing to Claude (UX)"
            gh issue comment ${{ github.event.issue.number }} --body "@claude-ai kan du se på dette?"
          fi
```

---

## 📊 Nåværende Status - AI-tilgang

| AI | Tilgang | Kan gjøre | Kan IKKE |
|----|---------|-----------|----------|
| **Kimi (meg)** | Full terminal + GitHub | Kode, commit, push, CLI (med tokens) | Dine personlige kontoer |
| **Claude** | Via MCP/GitHub | Kode via PR, review | Direkte push (uten PR) |
| **Du** | Alt | Godkjenne, merge, deploye til produksjon | - |

---

**GitHub er vår felles arbeidsflate!** 🐙

*Sist oppdatert: 2026-02-02*
