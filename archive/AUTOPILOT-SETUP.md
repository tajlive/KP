# 🚀 Klarpakke Autopilot - Full CI/CD Setup

Dette dokumentet beskriver den automatiserte CI/CD-kjeden for Klarpakke.

## 🎯 Arkitektur

```
Push til main
    ↓
GitLab CI Pipeline
    ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│  db:migrate │ → │   verify    │ → │   deploy    │ → │   smoke:test    │
│  (manual)   │    │  (auto)     │    │   (auto)    │    │    (auto)       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────────┘
      ↓
Supabase DB         Type-check +      Cloudflare        Verifiserer
migrasjoner         Build             Pages deploy      kritiske ruter
```

## 📋 Forutsetninger

### CLI-verktøy installert

```bash
# Supabase CLI
brew install supabase

# Cloudflare Wrangler
npm install -g wrangler

# GitLab CLI (valgfritt)
brew install glab

# Stripe CLI (valgfritt)
brew install stripe/stripe-cli/stripe
```

### Miljøvariabler

Opprett `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_REF=xxx

# Cloudflare
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_PAGES_PROJECT_NAME=klarpakke
CLOUDFLARE_ZONE_ID=your_zone_id

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site
NEXT_PUBLIC_SITE_URL=https://www.klarpakke.no
```

### GitLab CI Variabler

Sett i GitLab → Settings → CI/CD → Variables:

| Variabel | Type | Beskrivelse |
|----------|------|-------------|
| `CLOUDFLARE_API_TOKEN` | Masked | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | - | Cloudflare account ID |
| `SUPABASE_PROJECT_REF` | - | Supabase prosjekt reference |
| `SUPABASE_ACCESS_TOKEN` | Masked | Supabase access token |
| `NEXT_PUBLIC_SUPABASE_URL` | - | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Masked | Supabase anon key |

## 🎮 Bruk

### Lokal utvikling

```bash
# Full autopilot (interaktiv)
bash scripts/autopilot-local.sh

# Individuelle steg
bash scripts/verify-app.sh           # Type-check + build
bash scripts/db-migrate-supabase.sh  # Database migrasjoner
bash scripts/sync-env-all.sh         # Synkroniser miljøvariabler
bash scripts/test-stripe-checkout.sh # Stripe test instruksjoner
```

### Deploy til produksjon

```bash
# 1. Verifiser lokalt
bash scripts/verify-app.sh

# 2. Push til main
git add .
git commit -m "feat: din endring"
git push origin main

# 3. GitLab CI tar over
# Se workflow på: https://github.com/tajlive/KP/actions
```

### Manuell deploy (nødscenario)

```bash
# Kun hvis GitLab CI er nede
export CLOUDFLARE_API_TOKEN=xxx
export CLOUDFLARE_ACCOUNT_ID=xxx
bash scripts/deploy-cloudflare-pages.sh
```

## 🔧 Skriptoversikt

| Skript | Beskrivelse | Bruk |
|--------|-------------|------|
| `autopilot-local.sh` | Master skript for lokal kjøring | `bash scripts/autopilot-local.sh` |
| `verify-app.sh` | Type-check og build | CI + lokal |
| `db-migrate-supabase.sh` | Database migrasjoner | CI + lokal |
| `deploy-cloudflare-pages.sh` | Deploy til Cloudflare | CI + lokal |
| `smoke-test-prod.sh` | Verifiser produksjon | CI + lokal |
| `sync-env-all.sh` | Synkroniser env vars | Lokal |
| `test-stripe-checkout.sh` | Stripe test instruksjoner | Lokal |

## 🔄 CI/CD Pipeline

### Stages

1. **db** - Database migrasjoner (manuel approval i prod)
2. **test** - Verifisering (type-check + build)
3. **build** - Next.js build
4. **deploy** - Cloudflare Pages deploy
5. **post-deploy** - Smoke-tester og cache purge

### Regler

- **db:migrate**: Kun på main, manuel approval
- **verify**: På alle branches og MRs
- **deploy**: Kun på main, etter successful verify
- **smoke:test**: Kun på main, etter deploy

## 🚨 Feilsøking

### "Supabase CLI ikke installert"

```bash
brew install supabase
supabase login
```

### "CLOUDFLARE_API_TOKEN ikke satt"

```bash
# Opprett token i Cloudflare Dashboard
# My Profile → API Tokens → Create Token
# Use template: "Edit Cloudflare Workers"

export CLOUDFLARE_API_TOKEN=your_token
```

### "Database migrasjon feilet"

```bash
# Sjekk status
supabase migration list

# Rydd og prøv igjen (kun dev!)
supabase db reset
```

### "Build feiler i CI"

```bash
# Lokal reproduksjon
rm -rf node_modules package-lock.json
npm ci
npm run type-check
npm run build
```

## 📊 Overvåking

### Pipeline status

```bash
# Se siste pipelines
glab pipeline list

# Se logs for siste pipeline
glab pipeline logs
```

### Smoke-tester

```bash
# Kjør mot produksjon
SMOKE_TEST_URL=https://www.klarpakke.no bash scripts/smoke-test-prod.sh
```

## 🔒 Sikkerhet

- Secrets lagres kun i GitLab CI variables (masked)
- Lokale secrets i `.env.local` (ikke commit!)
- Cloudflare secrets settes via API/CLI
- Database migrasjoner krever manuel approval i prod

## 📝 Vedlikehold

### Oppdatere avhengigheter

```bash
npm update
npm audit fix
bash scripts/verify-app.sh  # Verifiser at alt fortsatt fungerer
```

### Legge til nytt skript

1. Lag skript i `scripts/`
2. Gjør kjørbart: `chmod +x scripts/nytt-skript.sh`
3. Legg til i `.gitlab-ci.yml` eller `autopilot-local.sh`
4. Dokumenter i denne filen

---

**Siste oppdatert:** 2026-02-10  
**Versjon:** 1.0.0
