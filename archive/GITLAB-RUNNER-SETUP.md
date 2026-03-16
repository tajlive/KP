# GitLab Runner Setup (Mac M1)

> Guide for å sette opp lokal GitLab Runner på Mac M1
> 
> **Alternativ til:** GitLab shared runners (gratis, 400 min/mnd)

---

## Fordeler vs Ulemper

| Lokal Runner | GitLab Shared Runners |
|--------------|----------------------|
| ✅ Gratis, ubegrenset | ✅ Ingen setup, alltid tilgjengelig |
| ✅ Raskere bygg (lokal maskin) | ⚠️ 400 minutter gratis/mnd |
| ✅ Matcher M1-arkitektur | ✅ Auto-skalert |
| ⚠️ Mac må være på og online | ✅ Redundans (flere maskiner) |
| ⚠️ Krever lokale credentials | ✅ Ingen maintenance |

**Anbefaling:** 
- **Utvikling:** Lokal runner (raskere iterasjon)
- **Production:** GitLab shared runners (pålitelighet)

---

## Installasjon (5 min)

### 1. Installer GitLab Runner

```bash
# Via Homebrew
brew install gitlab-runner

# Verifiser
gitlab-runner --version
```

### 2. Hent Registration Token

1. Gå til: https://github.com/tajlive/KP/-/settings/ci_cd
2. Klikk: **Runners** → **Expand**
3. Klikk: **New project runner**
4. Kopier: **Registration token**

### 3. Registrer Runner

```bash
gitlab-runner register \
  --url https://gitlab.com/ \
  --executor shell \
  --description "Mac M1 Local Runner" \
  --tag-list "macos,m1,local"
```

**Prompts:**
- GitLab instance URL: `https://gitlab.com/`
- Registration token: `[lim inn fra steg 2]`
- Description: `Mac M1 Local Runner`
- Tags: `macos,m1,local`
- Executor: `shell`

### 4. Start Runner

```bash
# Installer som background service
gitlab-runner install
gitlab-runner start

# Verifiser
gitlab-runner status

# Se i GitLab: https://github.com/tajlive/KP/-/settings/ci_cd
# Du skal se grønn prikk ved "Mac M1 Local Runner"
```

---

## Bruke Lokal Runner

### Option A: Bruk tags i spesifikke jobber

```yaml
# .gitlab-ci.yml
build:
  stage: build
  tags:
    - macos  # ← Bruker lokal runner
  script:
    - npm run build
```

### Option B: Sett som default (alle jobber)

```yaml
# .gitlab-ci.yml
default:
  tags:
    - macos

build:
  stage: build
  # Ingen tags nødvendig, arver fra default
  script:
    - npm run build
```

### Option C: Hybrid (anbefalt)

```yaml
# .gitlab-ci.yml - fleksibelt oppsett
build:
  stage: build
  image: node:18-alpine
  # Ingen tags = GitLab shared runner
  # tags:
  #   - macos  # Uncomment for lokal runner
  script:
    - npm run build
```

---

## Stoppe/Starte Runner

```bash
# Stoppe
gitlab-runner stop

# Starte
gitlab-runner start

# Restart
gitlab-runner restart

# Avregistrere (slett fra GitLab)
gitlab-runner unregister --url https://gitlab.com/ --token [RUNNER_TOKEN]
```

---

## Troubleshooting

### "Runner not found"
```bash
# Sjekk at runner kjører
gitlab-runner status

# Se logger
gitlab-runner --debug run
```

### "Permission denied"
```bash
# Gi rettigheter
sudo chown -R $(whoami) ~/.gitlab-runner
```

### Playwright feiler på Mac
```bash
# Installer browsere med deps
npx playwright install chromium --with-deps
```

---

## Sikkerhet

⚠️ **Lokal runner = lokale secrets**

Når du bruker lokal runner:
- Cloudflare credentials må være satt i GitLab (CI/CD → Variables)
- Eller i `~/.zshrc` (mindre sikkert)
- Mac må være låst når du ikke er tilstede

**Anbefaling:** Bruk GitLab shared runners for production deploys.

---

## Ressurser

- [GitLab Runner Docs](https://docs.gitlab.com/runner/)
- [MacOS Installation](https://docs.gitlab.com/runner/install/osx.html)
- [Runner Configuration](https://docs.gitlab.com/runner/configuration/advanced-configuration.html)

---

**Sist oppdatert:** 2026-02-08
