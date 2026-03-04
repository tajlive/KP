# Claude Code Plugins for Klarpakke 🔌

## 📋 Oversikt

Dette dokumentet beskriver alle Claude Code plugins som er installert og anbefalt for Klarpakke-prosjektet.

## ✅ Installerte Plugins

### 1. commit-commands ⭐ KRITISK

**Status:** ✅ Installert  
**Type:** Git automation  
**Marketplace:** `@claude-plugins-official`

#### Hva den gjør

- Automatiserer hele Git-workflow
- AI-genererte commit-meldinger
- Smart staging av filer
- Automatisk PR-opprettelse

#### Kommandoer

```bash
# Smart commit med AI-generert melding
/commit

# Commit, push og opprett PR i én operasjon
/commit-push-pr

# Rydd opp i gamle branches
/clean_gone

# Vis commit history
/git-log
```

#### Eksempler for Klarpakke

```bash
# Scenario 1: Endret Webflow bundle
kimi> "Oppdaterte login-håndtering i bundle"
/commit
# → Genererer: "feat(webflow): improve login error handling and validation"

# Scenario 2: Fikset Supabase Edge Function
/commit-push-pr
# → Committer, pusher OG lager PR automatisk
# → PR tittel og beskrivelse genereres basert på endringer

# Scenario 3: Ferdig med feature branch
/clean_gone
# → Sletter alle merged branches lokalt
```

#### Best Practices

✅ **GJØR:**
- Bruk `/commit` for alle commits (sparer tid)
- La AI generere meldinger (bedre kvalitet)
- Bruk `/commit-push-pr` for features

❌ **IKKE:**
- Manuell `git commit -m "fix"` (dårlig kvalitet)
- Glem å rydde branches (`/clean_gone` jevnlig)

---

### 2. GitHub Actions (Claude Automation) ⭐ KRITISK

**Status:** ✅ Konfigurert  
**Type:** CI/CD automation  
**Fil:** `.github/workflows/claude-code-automation.yml`

#### Hva den gjør

- Automatisk code review på PRs
- Besvarer `@claude` mentions i Issues/PRs
- Foreslår fixes for bugs
- Implementerer features basert på beskrivelse

#### Triggere

| Trigger | Beskrivelse | Eksempel |
|---------|-------------|----------|
| `@claude` i kommentar | Claude svarer | `@claude fix this bug` |
| Label `claude-help` | Claude analyserer issue | Legg til label på issue |
| PR åpnet | Auto code review | Hver ny PR |
| PR oppdatert | Re-review | Nye commits i PR |

#### Brukseksempler

**1. Få hjelp med issue:**

```markdown
Issue #123: Login fungerer ikke

Kommentar:
@claude kan du analysere login.js og finne feilen?

→ Claude svarer med:
- Analyse av koden
- Identifisert problem
- Foreslått fix med kode
```

**2. Auto code review:**

```bash
# 1. Opprett PR
gh pr create --title "feat: Add signup validation"

# 2. Claude reviewer automatisk (etter ~30 sek)
# 3. Sjekk PR comments for feedback
```

**3. Implementer feature:**

```markdown
Issue #124: "Legg til 'Remember Me' checkbox på login"
Label: claude-help

→ Claude:
1. Analyserer eksisterende login.js
2. Foreslår implementasjon
3. Lager PR med endringer
```

#### Konfigurasjon

**Secrets som brukes:**
- `ANTHROPIC_API_KEY` ✅ (allerede satt)
- `GITHUB_TOKEN` ✅ (automatisk)

**Customization:**

Rediger `.github/workflows/claude-code-automation.yml`:

```yaml
system_prompt: |
  # Legg til prosjekt-spesifikke regler her
  - Bruk norske kommentarer
  - Test alltid lokalt først
  - Oppdater CHANGELOG.md
```

---

### 3. Webflow MCP Server (Kommer snart)

**Status:** ⏳ Venter på installasjon  
**Type:** Webflow API integration  
**Når:** Når MCP marketplace støtter Webflow

#### Hva den vil gjøre

- Direkte Webflow Designer API tilgang
- Bulk-oppdateringer av elementer
- CMS sync fra Supabase
- Auto-generering av Collections

#### Planlagte kommandoer

```bash
# Legg til data-attributter på alle forms
"Add data-login-* attributes to all login forms"

# Sync Supabase signaler til Webflow CMS
"Sync latest signals from Supabase to Webflow collection"

# Oppdater Custom Code på alle sider
"Add klarpakke-bundle.js to all page heads"
```

---

## 🎯 Anbefalt Workflow

### Daglig Utvikling

```bash
# 1. Start arbeid på ny feature
git checkout -b feature/add-password-reset

# 2. Gjør endringer...

# 3. Commit med AI (BRUK DETTE)
/commit

# 4. Push og opprett PR
/commit-push-pr

# 5. Claude reviewer automatisk
# 6. Fiks eventuelle comments
# 7. Merge når approved

# 8. Rydd opp
/clean_gone
```

### Bug Fixing

```bash
# 1. Opprett issue på GitHub
gh issue create --title "Bug: Login timeout" --body "@claude analyze"

# 2. Claude analyserer og foreslår fix
# 3. Implementer fix
# 4. Commit med /commit
# 5. PR med /commit-push-pr
```

### Code Review

```bash
# Før du ber om human review:
# 1. Opprett PR
# 2. Vent på Claude review (~30 sek)
# 3. Fiks Claude's feedback
# 4. Request human review

gh pr create
gh pr view --web  # Se Claude's comments
```

---

## 📦 Installasjon (For nye utviklere)

### Steg 1: Installer Claude Code

```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | sh

# Eller last ned fra:
# https://code.claude.com
```

### Steg 2: Klon repo

```bash
git clone https://github.com/tombomann/klarpakke.git
cd klarpakke
```

### Steg 3: Installer plugins

```bash
# I Claude Code terminal:
/plugin install commit-commands@claude-plugins-official

# Verifiser
/plugin list
# → Skal vise: commit-commands ✅
```

### Steg 4: Test workflow

```bash
# Gjør en liten endring
echo "test" > test.txt

# Test commit-plugin
/commit

# Slett test-fil
rm test.txt
git reset HEAD~1
```

---

## 🔧 Troubleshooting

### Problem: `/commit` fungerer ikke

**Løsning:**
```bash
# Reinstaller plugin
/plugin uninstall commit-commands
/plugin install commit-commands@claude-plugins-official
```

### Problem: Claude Action timeout

**Løsning:**
```yaml
# I .github/workflows/claude-code-automation.yml
# Reduser max_tokens:
max_tokens: 2048  # Fra 4096
```

### Problem: ANTHROPIC_API_KEY feil

**Løsning:**
```bash
# Verifiser secret
gh secret list | grep ANTHROPIC

# Hvis mangler, legg til:
gh secret set ANTHROPIC_API_KEY
# Paste API key fra: https://console.anthropic.com
```

---

## 📊 Metrics & Analytics

### Måle effekt av plugins

```bash
# Før plugins (estimat):
# - Commit: 2-5 min per commit
# - PR creation: 3-10 min
# - Code review: 15-30 min
# Total: ~20-45 min per feature

# Etter plugins:
# - Commit: 10 sekunder (/commit)
# - PR creation: 15 sekunder (/commit-push-pr)
# - Code review: 30 sekunder (auto)
# Total: ~1 min per feature

# Tidssparing: 95% 🚀
```

### GitHub Insights

```bash
# Se Claude's aktivitet
gh pr list --label "reviewed-by-claude"
gh issue list --label "claude-help"

# PR review-tid
gh pr view 123 --json reviews
```

---

## 🎓 Advanced Usage

### Custom Commit Templates

```bash
# I .claude/config.yml (lag fil hvis mangler):
commit:
  template: |
    {type}({scope}): {subject}
    
    {body}
    
    Refs: #{issue}
    Co-authored-by: Claude <claude@anthropic.com>
```

### Auto-labeling

```yaml
# I .github/workflows/claude-code-automation.yml
- name: Auto-label PR
  run: |
    if [[ "$PR_TITLE" == feat:* ]]; then
      gh pr edit $PR_NUMBER --add-label "feature"
    fi
```

---

## 📚 Ressurser

- [Claude Code Docs](https://code.claude.com/docs)
- [commit-commands Plugin](https://github.com/anthropics/claude-plugins-official/tree/main/commit-commands)
- [GitHub Actions Guide](https://docs.github.com/en/actions)
- [Klarpakke Contributing Guide](./CONTRIBUTING.md)

---

## 🔄 Oppdateringer

**Sist oppdatert:** 2026-02-01  
**Versjon:** 1.0.0  
**Maintainer:** Tom Bomann (@tombomann)

### Changelog

- **2026-02-01**: Initial setup med commit-commands og Claude Actions
- **TBD**: Legg til Webflow MCP når tilgjengelig
