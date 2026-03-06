# GitHub Actions Workflows - Kostnadseffektiv Setup

## 💰 Kostnadsbesparelse

### FØR (tidligere setup):
| Workflow | Trigger | Est. minutter/mnd | Kostnad |
|----------|---------|-------------------|---------|
| CI | Push + PR | ~1500 min | $11.94 |
| TypeScript Check | Push + PR | ~800 min | - |
| Playwright E2E | Push + PR | ~1200 min | - |
| MCP Integration | Push + PR | ~600 min | - |
| Ultimate Tests | Push + PR | ~900 min | - |
| **TOTALT** | | **~5000 min** | **$11.94+** |

### ETTER (ny setup):
| Workflow | Trigger | Est. minutter/mnd | Kostnad |
|----------|---------|-------------------|---------|
| PR Check | Kun PR til main | ~50 min | ~$0.50 |
| Security Audit | 1 gang/uke (manuell trigger) | ~20 min | ~$0.20 |
| Dependency Check | 1 gang/mnd | ~10 min | ~$0.10 |
| Manual Deploy | Kun manuell | ~30 min | ~$0.30 |
| **TOTALT** | | **~110 min** | **~$1.10** |

### 📊 SPARING: **~$10.84/mnd (91% reduksjon)**

---

## 🚀 Workflows

### 1. ✅ PR Check (`.github/workflows/pr-check.yml`)
**Trigger:** Kun ved PR til main  
**Timeout:** 8 minutter  
**Formål:** Rask validering før merge
```yaml
on:
  pull_request:
    branches: [main]
```

### 2. 🔒 Security Audit (`.github/workflows/security-audit.yml`)
**Trigger:** 
- Hver mandag kl 09:00
- Manuell trigger

**Timeout:** 5 minutter  
**Formål:** Sjekk for sårbarheter

### 3. 📦 Dependency Check (`.github/workflows/dependency-check.yml`)
**Trigger:** 
- 1. i hver måned kl 10:00
- Manuell trigger

**Timeout:** 5 minutter  
**Formål:** Finn ubrukte dependencies

### 4. 🚀 Manual Deploy (`.github/workflows/manual-deploy.yml`)
**Trigger:** Kun manuell (`workflow_dispatch`)  
**Timeout:** 10 minutter  
**Formål:** Deploy til preview eller produksjon

---

## 📋 Slik trigger du workflows manuelt

1. Gå til: https://github.com/tajlive/KP/actions
2. Velg workflow (f.eks. "🚀 Manual Deploy")
3. Klikk "Run workflow"
4. Velg branch og eventuelle inputs
5. Klikk "Run workflow"

---

## ⚙️ Konfigurasjon

### Nødvendige secrets (Settings → Secrets and variables → Actions):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SENTRY_AUTH_TOKEN
VERCEL_TOKEN
SNYK_TOKEN (optional)
```

---

## 🔄 Gamle workflows

Gamle workflows er flyttet til `.github/workflows-disabled/` som backup.

For å aktivere en gammel workflow:
```bash
mv .github/workflows-disabled/ci.yml .github/workflows/
git add . && git commit -m "Re-enable CI workflow"
```

---

## 📊 GitHub Actions Usage Tracking

Sjekk forbruk: https://github.com/settings/billing

**Gratis inkludert:**
- 2000 minutter/mnd
- 500 MB storage

**Nåværende forbruk med ny setup:** ~110 minutter/mnd  
**Ledig kapasitet:** ~1890 minutter/mnd

---

## 💡 Tips for ytterligere sparing

1. **Bruk `--prefer-offline`** ved npm install
2. **Cache node_modules** (allerede i bruk)
3. **Korte timeouts** på alle jobs
4. **Kun nødvendige triggers** (ikke på hver push)
5. **Manuell deploy** istedenfor auto-deploy
