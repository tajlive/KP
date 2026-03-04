# Claude Code Plugin Setup Guide 🚀

## Quick Start (5 minutter)

### 1. Installer commit-commands

```bash
# I Claude Code eller Kimi Code CLI:
/plugin install commit-commands@claude-plugins-official
```

**Verifiser:**
```bash
/plugin list
# → commit-commands ✅
```

### 2. Test workflow

```bash
# Gjør en endring
echo "# Test" >> README.md

# Commit med AI
/commit

# Observer at commit-melding genereres automatisk
```

### 3. Sjekk GitHub Actions

```bash
# Gå til repo:
open https://github.com/tombomann/klarpakke/actions

# Sjekk at "Claude Code Automation" workflow er synlig
```

---

## Detaljert Setup

### GitHub Actions (Allerede konfigurert ✅)

Workflow-filen er allerede lagt til i `.github/workflows/claude-code-automation.yml`.

**Hva den gjør:**

1. **Auto PR Review:** Hver PR får automatisk code review fra Claude
2. **@claude mentions:** Tag Claude i issues/PRs for hjelp
3. **Label `claude-help`:** Legg til label for Claude-assistanse

**Test det:**

```bash
# 1. Opprett test-PR
git checkout -b test-claude-action
echo "test" > test.txt
git add test.txt
/commit
git push origin test-claude-action

# 2. Opprett PR
gh pr create --title "Test: Claude automation" --body "@claude review this"

# 3. Vent 30-60 sekunder
# 4. Sjekk PR for Claude's review comments
gh pr view --web
```

---

## Daglige Kommandoer

### commit-commands

| Kommando | Bruk | Eksempel |
|----------|------|----------|
| `/commit` | AI-generert commit | `Modified login.js` → `feat(auth): improve login validation` |
| `/commit-push-pr` | Commit + Push + PR | Alt i én kommando |
| `/clean_gone` | Rydd branches | Sletter merged branches |
| `/git-log` | Vis history | Pretty log format |

### Eksempler

```bash
# Feature development:
/commit                    # → feat: Add password reset flow
/commit-push-pr           # → Opens PR automatically

# Bug fixes:
/commit                    # → fix: Resolve login timeout issue

# Cleanup:
/clean_gone               # → Removes 5 merged branches
```

---

## GitHub Actions Triggers

### @claude mentions

**I Issue:**
```markdown
Title: Login ikke fungerer med norske tegn

Body:
@claude kan du analysere auth.js og finne problemet?
```

**Claude's svar:**
- Analyserer koden
- Identifiserer charset-problem
- Foreslår fix med UTF-8 encoding
- Lager optional PR med fix

**I PR Comment:**
```markdown
@claude er denne implementasjonen sikker?
```

**Claude's review:**
- Security audit
- Best practices check
- Performance suggestions

### Auto-review på PRs

Alle PRs får automatisk:

1. ✅ Webflow best practices check
2. ✅ Supabase security review
3. ✅ JavaScript quality analysis
4. ✅ Performance tips

**Se review:**
```bash
gh pr view 123
# Scroll til "Reviews" section
```

---
## Secrets (Allerede konfigurert ✅)

Disse er allerede satt i GitHub:

```bash
gh secret list | grep ANTHROPIC
# → ANTHROPIC_API_KEY ✅
```

Hvis noen mangler:

```bash
# Legg til Anthropic API key:
gh secret set ANTHROPIC_API_KEY
# Paste key fra: https://console.anthropic.com/settings/keys
```

---

## Tips & Tricks

### Beste commit-meldinger

**La AI gjøre jobben:**

```bash
# ❌ Manuell (dårlig kvalitet):
git commit -m "fix"

# ✅ Med plugin (høy kvalitet):
/commit
# → fix(auth): resolve UTF-8 encoding in email validation
```

### Rask PR-workflow

```bash
# Tradisjonell måte (5+ min):
git add .
git commit -m "feat: add feature"
git push origin feature-branch
gh pr create --title "..." --body "..."

# Med plugin (15 sekunder):
/commit-push-pr
# → Gjør ALT automatisk! 🚀
```

### Branch cleanup

```bash
# Hver fredag:
/clean_gone
# → Sletter alle merged branches
# → Holder repo ryddig
```

---

## Troubleshooting

### "Plugin not found"

```bash
# Sjekk tilgjengelige marketplaces
/plugin marketplace list

# Legg til official marketplace
/plugin marketplace add anthropics/claude-plugins-official

# Installer på nytt
/plugin install commit-commands@claude-plugins-official
```

### "Action failed: API key invalid"

```bash
# Verifiser secret
gh secret list

# Oppdater hvis nødvendig
gh secret set ANTHROPIC_API_KEY --body "sk-ant-..."

# Test workflow
gh workflow run claude-code-automation.yml
```

### "Claude didn't respond to @mention"

**Sjekk:**

1. Workflow kjører?
   ```bash
   gh run list --workflow=claude-code-automation.yml
   ```

2. Logs for feil?
   ```bash
   gh run view --log
   ```

3. ANTHROPIC_API_KEY satt?
   ```bash
   gh secret list | grep ANTHROPIC
   ```

---

## Next Steps

**Du er nå klar! 🎉**

1. ✅ Plugins installert
2. ✅ GitHub Actions konfigurert
3. ✅ Workflow testet

**Start med:**

```bash
# 1. Gjør en liten endring
echo "# Updated" >> docs/README.md

# 2. Commit med AI
/commit

# 3. Observer magin! ✨
```

**Les mer:**
- [CLAUDE-PLUGINS.md](./CLAUDE-PLUGINS.md) - Full dokumentasjon
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Bidragsregler

---

**Lykke til med utviklingen! 🚀**
