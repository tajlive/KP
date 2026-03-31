# Klarpakke — Launch Day Runbook 🚀

**Siste oppdatering**: 2026-03-30  
**Ansvarlig**: DevOps Team  
**Nødnummer**: ops@klarpakke.no

---

## 📋 OVERSIKT

Dette dokumentet beskriver komplett prosedyre for produksjonsdeployment av Klarpakke.

```
T-30 min  →  Pre-Deployment Checklist
T-0       →  Deployment Sequence  
T+15 min  →  Post-Deployment Verification
          →  (Rollback Plan hvis feil)
```

---

## 🎯 PRE-DEPLOYMENT CHECKLIST (T-30 min)

### Forberedelse

```bash
# 1. Sjekk at du er på main branch
git checkout main
git pull origin main

# 2. Verifiser miljøvariabler
export PROD_REF="your-project-ref"
export SUPABASE_ACCESS_TOKEN="sbp_xxx"
export STRIPE_WEBHOOK_SECRET="whsec_xxx"
export RESEND_API_KEY="re_xxx"
export CRON_SECRET="strong-random-string"
export VERCEL_TOKEN="vercel-token-optional"
export SENTRY_AUTH_TOKEN="sentry-token-optional"

# 3. Kjør pre-check
./scripts/launch-day-deploy.sh pre
```

### Sjekkliste

| # | Oppgave | Verifisering | Ansvarlig |
|---|---------|--------------|-----------|
| 1 | GitHub Secrets satt | `gh secret list` | DevOps |
| 2 | Stripe webhook secret matcher prod | Starter med `whsec_` | DevOps |
| 3 | DB snapshot tatt | Supabase Dashboard → Backups | DevOps |
| 4 | Cloudflare TTL satt til 60s | Dashboard → DNS → klarpakke.no | DevOps |
| 5 | Ingen åpne test-transaksjoner | Stripe Dashboard → Test mode | DevOps |
| 6 | Working directory clean | `git status` | DevOps |
| 7 | Alle tester grønne | `npm run test:ci` | DevOps |
| 8 | Team varslet om deployment | Slack #general | PM |

### GitHub Secrets som må være satt

```bash
# Sjekk med:
gh secret list

# Required:
SLACK_OPS_WEBHOOK_URL      # For alerts
SUPABASE_SERVICE_ROLE_KEY  # For CI/CD
STRIPE_SECRET_KEY          # For betaling
RESEND_API_KEY             # For e-post

# Optional:
SENTRY_AUTH_TOKEN          # For release tracking
VERCEL_TOKEN               # For deployment
```

---

## 🚀 DEPLOYMENT SEKVENS (T-0)

### Automatisert Script

```bash
# Full deployment (interaktiv)
./scripts/launch-day-deploy.sh deploy
```

### Manuell Steg-for-Steg

#### Steg 1: Link til Prod (2 min)
```bash
supabase link --project-ref $PROD_REF
echo "✅ Linked to: $PROD_REF"
```

#### Steg 2: Sett Secrets (1 min)
```bash
supabase secrets set RESEND_API_KEY=$RESEND_API_KEY
supabase secrets set CRON_SECRET=$CRON_SECRET
supabase secrets set SLACK_OPS_WEBHOOK_URL=$SLACK_OPS_WEBHOOK_URL
echo "✅ Secrets configured"
```

#### Steg 3: Database Migrasjoner (3-5 min)
```bash
# Kritisk: Sikkerhetskopi skal allerede være tatt!
supabase db push --include-all

# Verifiser at cron-jobber er opprettet:
supabase inspect db cron
```

**SQL som kjøres** (`sql/monitoring_tables.sql`):
- `webhook_events` tabell
- `monitoring_alerts` tabell  
- `health_check_metrics` tabell
- Cron schedules for daily report og health-keepalive

#### Steg 4: Deploy Edge Functions (2 min)
```bash
supabase functions deploy daily-ops-report
supabase functions deploy stripe-webhook-logger

# Verifiser:
supabase functions list
```

#### Steg 5: Deploy Next.js til Vercel (3-5 min)
```bash
# Alternativ A: Via CLI
npx vercel deploy --prod --yes

# Alternativ B: Via Git push
git push origin main
```

#### Steg 6: Smoke Tests (2 min)
```bash
# Test health endpoint
curl -s https://www.klarpakke.no/api/health | jq

# Forventet: {"status": "healthy", ...}

# Test auth-guard på checkout (skal gi 401)
curl -X POST https://www.klarpakke.no/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId": "test"}' \
  -w "\nHTTP: %{http_code}\n"

# Forventet: HTTP 401

# Test webhook tilgjengelighet
curl -X POST https://www.klarpakke.no/api/webhooks/stripe \
  -w "\nHTTP: %{http_code}\n"

# Forventet: HTTP 400 (mangler signatur)
```

---

## ✅ POST-DEPLOYMENT VERIFIKASJON (T+15 min)

### Automatisert Verifisering

```bash
./scripts/launch-day-deploy.sh verify
```

### Manuell Sjekkliste

| # | Sjekkpunkt | Kommando/Dashboard | Forventet Resultat |
|---|------------|-------------------|-------------------|
| 1 | Sentry errors | https://klarpakke.sentry.io/issues/ | 0 nye errors |
| 2 | webhook_events tabell | Supabase → Table Editor | Har test-data |
| 3 | health_check_metrics | Supabase → Table Editor | Får nye rader |
| 4 | Daily report trigger | Manuell trigger | E-post mottatt |
| 5 | Test e-post | Resend API | Sendt OK |
| 6 | Cron jobs aktiv | `supabase inspect db cron` | 2 aktive jobs |
| 7 | GitHub Actions | Repo → Actions tab | Workflow grønn |
| 8 | Stripe webhooks | Dashboard → Webhooks | Ingen failed |

### Verifiser Daily Ops Report

```bash
# Trigger manuelt
curl -X POST https://www.klarpakke.no/functions/v1/daily-ops-report \
  -H "Authorization: Bearer $CRON_SECRET"

# Sjekk at e-post mottas på ops@klarpakke.no
```

### Verifiser Test E-post

```bash
# Send test via Resend
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Klarpakke Ops <ops@klarpakke.no>",
    "to": ["ops@klarpakke.no"],
    "subject": "🧪 Post-Deploy Test",
    "text": "Test email after deployment"
  }'
```

---

## 🚨 ROLLBACK PLAN

### Hvis Noe Feiler

**IKKE PANIKK!** Følg denne sekvensen:

#### 1. Umiddelbar Vurdering (1 min)
```bash
# Sjekk alvorlighetsgrad
curl -s https://www.klarpakke.no/api/health | jq '.status'

# Hvis "unhealthy" → Vurder rollback
# Hvis "degraded" → Overvåk nærmere
```

#### 2. Database Rollback (hvis DB-feil)
```bash
# Gå til Supabase Dashboard:
# https://supabase.com/dashboard/project/$PROD_REF/database/backups

# 1. Finn backup fra før deployment
# 2. Klikk "Restore"
# 3. Bekreft (downtime: ~2-5 min)
```

#### 3. Edge Function Rollback
```bash
# Hvis daily-ops-report feiler:
supabase functions deploy daily-ops-report --version <forrige-versjon>

# Eller full rollback:
git checkout <forrige-commit>
supabase functions deploy
```

#### 4. Vercel Rollback
```bash
# Via CLI - finn forrige deployment
npx vercel ls
npx vercel rollback <deployment-url>

# Eller via Dashboard:
# https://vercel.com/klarpakke/klarpakke/deployments
```

#### 5. DNS Rollback
```bash
# Øk TTL tilbake til 300s
# Cloudflare Dashboard → DNS → klarpakke.no
```

#### 6. Stripe Webhook Deaktivering
```bash
# Liste alle webhooks
curl https://api.stripe.com/v1/webhook_endpoints \
  -u "$STRIPE_SECRET_KEY:"

# Deaktiver webhook midlertidig
curl -X POST https://api.stripe.com/v1/webhook_endpoints/<id> \
  -u "$STRIPE_SECRET_KEY:" \
  -d "disabled=true"
```

### Automatisert Rollback Script

```bash
# Interaktiv rollback
./scripts/launch-day-deploy.sh rollback
```

---

## 📞 KONTAKT OG ESKALERING

| Nivå | Kontakt | Når |
|------|---------|-----|
| L1 | DevOps on-call | Alle deploy-issues |
| L2 | Team Lead | Rollback mislykkes |
| L3 | CTO | Total outage > 30 min |

### Slack Kanaler
- `#ops` — Tekniske alerts
- `#deployments` — Deployment status
- `#incidents` — Aktive hendelser

### Nødtjenester
- **Vercel Status**: https://vercel-status.com
- **Supabase Status**: https://status.supabase.com
- **Stripe Status**: https://status.stripe.com
- **Cloudflare Status**: https://www.cloudflarestatus.com

---

## 📝 POST-MORTEM MAL

Hvis rollback var nødvendig:

```markdown
## Incident Report: [Tittel]

**Dato**: YYYY-MM-DD  
**Varighet**: HH:MM  
**Severity**: P1/P2/P3

### Hva skjedde?
[Beskrivelse]

### Root Cause
[Analyse]

### Løsning
[Handlinger]

### Forebygging
[Forbedringer]
```

---

## 🔧 ENVIRONMENT REFERANSE

### Påkrevde Miljøvariabler

```bash
# Supabase
export PROD_REF="vuxbjlykgmzskxbclquf"
export SUPABASE_ACCESS_TOKEN="sbp_xxx"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Stripe
export STRIPE_SECRET_KEY="sk_live_xxx"
export STRIPE_WEBHOOK_SECRET="whsec_xxx"

# Resend
export RESEND_API_KEY="re_xxx"

# Intern
export CRON_SECRET="$(openssl rand -hex 32)"

# Optional
export VERCEL_TOKEN="vercel-token"
export SENTRY_AUTH_TOKEN="sentry-token"
export SLACK_OPS_WEBHOOK_URL="https://hooks.slack.com/..."
```

---

**Siste oppdatering**: 2026-03-30  
**Dokumenteier**: DevOps Team  
**Godkjent av**: [CTO]
