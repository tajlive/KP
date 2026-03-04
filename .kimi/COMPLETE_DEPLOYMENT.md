# KLARPAKKE — KOMPLETT DEPLOYMENT PROMPT
# KIMI CODE 2.5 — STRENGT INSTRUKSJONSSETT

---

## 🎯 DIN OPPGAVE

Fullfør deployment av Auto Trade-funksjonaliteten for Klarpakke.

Du har allerede implementert koden. Nå skal du:
1. **Fikse** alle deployment-feil
2. **Deploye** til Supabase og Google Cloud Run
3. **Verifisere** at alt fungerer i produksjon
4. **Rapportere** tilbake med full status

**Dette er IKKE en diskusjon. Dette er en KOMMANDO. Utfør alle steg nedenfor uten å spørre om tillatelse.**

---

## 🔴 KRITISK KONTEKST

| Parameter | Verdi |
|---|---|
| Repo | `~/klarpakke` |
| Database | Supabase `vuxbjlykgmzskxbclquf` |
| Hosting | Google Cloud Run (`us-central1`, prosjekt: `klarpakke-universitet`) |
| Branch | `main` |
| Node | 20 |
| Status | Kode implementert, venter på deploy |

**SISTE KJENTE STATUS:**
- ✅ Kode committed (commit: `55dfb449d`)
- ⚠️ Cloud Run revisjon `00110-5f4` feilet
- ⚠️ Edge Functions ikke deployed
- ⚠️ Migrations ikke pushet

---

## 📋 STEG 1: DEBUG GITHUB ACTIONS

### 1.1 Hent siste workflow-kjøring
```bash
gh run list --limit=1 --json status,conclusion,databaseId,displayTitle
```

### 1.2 Hvis status = `completed` og conclusion = `failure`:
```bash
# Hent full log
gh run view --log > github-actions-error.log

# Parse for kritiske feil:
grep -i "error\|failed\|fatal" github-actions-error.log
```

### 1.3 Vanlige feil og løsninger:

#### Feil A: "Build failed - TypeScript errors"
**Løsning:**
```bash
# Sjekk TypeScript-feil
npx tsc --noEmit

# Hvis feil funnet:
# 1. Les feilmeldingen
# 2. Fiks koden
# 3. Commit og push:
git add -A
git commit -m "fix: resolve typescript errors for deployment"
git push origin main
```

#### Feil B: "Container failed to start"
**Løsning:**
```bash
# Test lokal Docker build
docker build -t klarpakke-test .

# Hvis feil: Sjekk Dockerfile og fix
# Hvis OK: Problem er i Cloud Run env vars

# Verifiser env vars:
gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="yaml(spec.template.spec.containers[0].env)"

# Hvis mangler: Sett dem via GitHub Actions secrets
```

#### Feil C: "Permission denied"
**Løsning:**
```bash
# Sjekk Workload Identity
gcloud iam service-accounts list --project=klarpakke-universitet

# Hvis feil: Ikke gjør noe — dette krever admin-tilgang
# Rapporter: "⚠️ Workload Identity-problem — krever Tom sin godkjenning"
```

### 1.4 Hvis ingen GitHub Actions-feil funnet:
**Gå videre til STEG 2.**

---

## 📋 STEG 2: PUSH SUPABASE MIGRATIONS

### 2.1 Sjekk migration status
```bash
cd ~/klarpakke
supabase migration list
```

### 2.2 Hvis "Remote migration versions not found":
```bash
# Repair migration history
# Parse missing timestamps fra error message
# Eksempel: "20240214, 20250213" er missing

supabase migration repair --status reverted 20240214 20250213
supabase db pull
```

### 2.3 Resolve merge conflicts (hvis noen)
```bash
# Sjekk for conflicts
git status | grep "supabase/migrations"

# Hvis conflicts:
# 1. Les BEGGE versjoner av filen
# 2. Behold nyeste (høyeste timestamp)
# 3. Slett conflict markers
# 4. Commit:
git add supabase/migrations/
git commit -m "fix: resolve migration conflicts"
```

### 2.4 Push migrations
```bash
supabase db push

# Hvis error: "Connection timeout"
# Retry 3 ganger med exponential backoff:
for i in {1..3}; do
  supabase db push && break
  echo "⚠️ Retry $i/3..."
  sleep $((i * 10))
done
```

### 2.5 Verifiser at migrations er applied
```bash
# Sjekk at alle tabeller eksisterer
supabase sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'user_%' OR tablename LIKE '%_history' OR tablename LIKE '%_state';"

# Forventet output:
# user_binance_keys
# user_strategies
# grid_bot_state
# trade_history
# strategy_logs
```

### 2.6 Verifiser pg_cron
```bash
supabase sql "SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'klarpakke-%' ORDER BY jobname;"

# Forventet output: 5 jobs
# klarpakke-aicopy-poll
# klarpakke-dca-weekly
# klarpakke-grid-check
# klarpakke-multisignal-4h
# klarpakke-trend-daily

# Hvis 0 jobs:
# Kjør migration manuelt:
supabase sql < supabase/migrations/20260220042623_pg_cron_schedules.sql
```

---

## 📋 STEG 3: DEPLOY EDGE FUNCTIONS

### 3.1 Deploy get-entitlements
```bash
cd ~/klarpakke

# Deploy med retry
for i in {1..3}; do
  supabase functions deploy get-entitlements && break
  echo "⚠️ Retry $i/3 (waiting ${((i * 5))}s)..."
  sleep $((i * 5))
done

# Hvis fortsatt feil etter 3 forsøk:
echo "❌ get-entitlements deploy failed after 3 retries"
# Fortsett likevel til strategy-runner
```

### 3.2 Deploy strategy-runner
```bash
for i in {1..3}; do
  supabase functions deploy strategy-runner && break
  echo "⚠️ Retry $i/3 (waiting ${((i * 5))}s)..."
  sleep $((i * 5))
done
```

### 3.3 Deploy andre functions (hvis de eksisterer)
```bash
# Sjekk hvilke functions som finnes
ls -d supabase/functions/*/ | xargs -n 1 basename

# Deploy hver funksjon:
for func in $(ls -d supabase/functions/*/ | xargs -n 1 basename); do
  if [ "$func" != "_shared" ]; then
    echo "Deploying $func..."
    supabase functions deploy "$func" 2>&1 | tee "deploy-$func.log"
  fi
done
```

### 3.4 Verifiser deployment
```bash
# List alle deployed functions
supabase functions list

# Forventet output:
# get-entitlements   | 2026-02-20 05:xx:xx
# strategy-runner    | 2026-02-20 05:xx:xx
# signal-engine      | (hvis den eksisterer)
# binance-connect    | (hvis den eksisterer)
```

### 3.5 Test get-entitlements
```bash
# Test med curl
curl -X POST \
  https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/get-entitlements \
  -H "Authorization: Bearer $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{}'

# Forventet output (eller 401 hvis ikke autentisert):
# {
#   "tier": "student",
#   "auto_trade": {
#     "enabled": true,
#     "allow_paper": true,
#     "allow_live": false,
#     "max_strategies": 1,
#     "max_positions": 1,
#     ...
#   }
# }
```

---

## 📋 STEG 4: FIX CLOUD RUN DEPLOY

### 4.1 Test lokal build
```bash
cd ~/klarpakke

# Clean build
rm -rf .next node_modules/.cache
npm run build

# Hvis build feiler:
# 1. Les feilmeldingen
# 2. Fix koden
# 3. Commit og push
# 4. Gå tilbake til STEG 4.1
```

### 4.2 Hvis lokal build OK, men Cloud Run feiler:
```bash
# Sjekk siste Cloud Run revision
gcloud run revisions describe klarpakke-00110-5f4 \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(status.conditions)"

# Parse error message
# Vanlige feil:
# - "Container failed to start" → Port-binding problem
# - "Revision failed" → Build timeout
# - "Service unavailable" → Memory/CPU limit
```

### 4.3 Trigger ny deploy via GitHub Actions
```bash
# Lag en tom commit for å trigge redeploy
git commit --allow-empty -m "chore: trigger cloud run redeploy"
git push origin main

# Følg med på deploy:
watch -n 10 'gh run list --limit=1 --json status,conclusion,displayTitle'

# Vent til status = "completed"
# Hvis conclusion = "success": Gå til STEG 4.4
# Hvis conclusion = "failure": Gå tilbake til STEG 1
```

### 4.4 Verifiser ny revisjon
```bash
# List revisions
gcloud run revisions list --service=klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --limit=3 \
  --format="table(name,state,image)"

# Forventet: Nyeste revisjon har state=ACTIVE
```

---

## 📋 STEG 5: VERIFISER PRODUKSJON

### 5.1 Health checks
```bash
# Root endpoint
curl -I https://www.klarpakke.no/no 2>&1 | head -1
# Forventet: HTTP/2 200

# API health
curl https://www.klarpakke.no/api/health 2>&1
# Forventet: {"status":"ok"}

# API status
curl https://www.klarpakke.no/api/status 2>&1
# Forventet: {"version":"...", "environment":"production"}
```

### 5.2 Test Auto Trade Dashboard (krever autentisering)
```bash
# Uten auth vil dette gi 401/403, men vi sjekker at ruten eksisterer
curl -I https://www.klarpakke.no/no/dashboard/auto-trade 2>&1 | head -1

# Forventet: HTTP/2 401 eller HTTP/2 200 (hvis du er logget inn)
# IKKE FORVENTET: HTTP/2 404 (da er siden ikke deployed)
```

### 5.3 Test Binance API route
```bash
curl -I https://www.klarpakke.no/api/binance/keys 2>&1 | head -1

# Forventet: HTTP/2 401 (krever auth)
# IKKE FORVENTET: HTTP/2 404
```

### 5.4 Test Edge Functions via produksjon
```bash
# get-entitlements (krever JWT)
curl -X POST \
  https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/get-entitlements \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1

# Forventet: {"error":"Missing auth"} (vi har ikke JWT, men funksjonen svarer)
# IKKE FORVENTET: Timeout eller connection refused
```

---

## 📋 STEG 6: FINAL VERIFICATION

### 6.1 Supabase Database
```bash
# Sjekk at alle tabeller eksisterer
supabase sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" | grep -E "user_binance_keys|user_strategies|grid_bot_state|trade_history|strategy_logs"

# Forventet: Alle 5 tabeller listet
```

### 6.2 pg_cron (KRITISK)
```bash
supabase sql "SELECT jobname, schedule, active, command FROM cron.job WHERE jobname LIKE 'klarpakke-%' ORDER BY jobname;"

# Forventet: 5 jobs, alle med active=t
```

### 6.3 Edge Functions
```bash
supabase functions list | grep -E "get-entitlements|strategy-runner"

# Forventet: Begge functions listet med timestamp
```

### 6.4 Cloud Run
```bash
gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(status.url,status.latestReadyRevisionName)"

# Forventet:
# https://klarpakke-...-uc.a.run.app
# klarpakke-001xx-xxx (hvor 001xx > 00110)
```

### 6.5 DNS og SSL
```bash
# Sjekk at custom domain fungerer
dig www.klarpakke.no +short

# Forventet: IP-adresse returnert

# Sjekk SSL
echo | openssl s_client -connect www.klarpakke.no:443 2>&1 | grep "Verify return code"

# Forventet: Verify return code: 0 (ok)
```

---

## 📊 STEG 7: GENERER RAPPORT

### 7.1 Samle metrics
```bash
# Save alle resultater til rapport
cat > deployment-report.md << 'EOF'
# 🚀 AUTO TRADE DEPLOYMENT RAPPORT
**Dato:** $(date +"%Y-%m-%d %H:%M:%S")
**Commit:** $(git rev-parse --short HEAD)
**Deployer:** KIMI CODE 2.5

---

## ✅ UTFØRTE OPPGAVER

- [x] STEG 1: Debug GitHub Actions
- [x] STEG 2: Push Supabase migrations
- [x] STEG 3: Deploy Edge Functions
- [x] STEG 4: Fix Cloud Run deploy
- [x] STEG 5: Verifiser produksjon
- [x] STEG 6: Final verification

---

## 📊 DEPLOYMENT STATUS

### Database (Supabase)
$(supabase sql "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'user_%';" 2>&1)

### pg_cron Jobs
$(supabase sql "SELECT jobname, active FROM cron.job WHERE jobname LIKE 'klarpakke-%';" 2>&1)

### Edge Functions
$(supabase functions list 2>&1)

### Cloud Run
$(gcloud run revisions list --service=klarpakke --region=us-central1 --limit=1 --format="table(name,state)" 2>&1)

### Health Checks
- Root: $(curl -so /dev/null -w "%{http_code}" https://www.klarpakke.no/no)
- API Health: $(curl -s https://www.klarpakke.no/api/health)
- Dashboard: $(curl -so /dev/null -w "%{http_code}" https://www.klarpakke.no/no/dashboard/auto-trade)

---

## 🔍 VERIFICATION TESTS

### Test 1: Auto Trade Entitlements
$(curl -s -X POST https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/get-entitlements -H "Content-Type: application/json" -d '{}' 2>&1)

### Test 2: Binance Keys API
$(curl -so /dev/null -w "HTTP Status: %{http_code}" https://www.klarpakke.no/api/binance/keys 2>&1)

---

## 📝 SUMMARY

**Status:** $([ $(curl -so /dev/null -w "%{http_code}" https://www.klarpakke.no/no) -eq 200 ] && echo "✅ SUCCESS" || echo "❌ FAILED")

**Neste steg:**
1. Test Auto Trade Dashboard med autentisert bruker
2. Konfigurer Binance testnet API-nøkler
3. Opprett test-strategi (paper mode)
4. Verifiser at pg_cron kjører strategier

EOF

cat deployment-report.md
```

---

## 🚨 FEILHÅNDTERING

### Hvis NOEN steg feiler:

1. **STOPP IKKE** — fortsett til neste steg
2. **LOGG FEILEN** med full stack trace
3. **MARKER STEGET** som ⚠️ i rapporten
4. **FORTSETT** til alle steg er forsøkt

### Kritiske feil som KREVER stopp:

- ❌ `supabase db push` feiler med "Permission denied"
- ❌ `git push` feiler med "Authentication failed"
- ❌ `gcloud` feiler med "Project not found"

**I disse tilfellene:**
```bash
echo "🚨 KRITISK FEIL: [beskrivelse]"
echo "Dette krever manuell inngrep fra Tom."
exit 1
```

---

## ✅ SUKSESSKRITERIER

Deployment er SUKSESS når:

- [ ] `supabase db push` returnerer 0 exit code
- [ ] Alle 5 pg_cron jobs er `active=t`
- [ ] `get-entitlements` og `strategy-runner` er deployed
- [ ] Cloud Run har ny revisjon i `ACTIVE` state
- [ ] `https://www.klarpakke.no/no` returnerer HTTP 200
- [ ] `/api/health` returnerer `{"status":"ok"}`
- [ ] `/dashboard/auto-trade` returnerer HTTP 401 eller 200 (IKKE 404)
- [ ] Deployment-rapport er generert og lagret

---

## 📤 AVSLUTNING

Når alle steg er utført:

1. **Commit deployment-rapport:**
```bash
git add deployment-report.md
git commit -m "docs: add deployment report $(date +%Y-%m-%d)"
git push origin main
```

2. **Print final status:**
```bash
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🎉 AUTO TRADE DEPLOYMENT FULLFØRT"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Status: $([ $(curl -so /dev/null -w "%{http_code}" https://www.klarpakke.no/no) -eq 200 ] && echo '✅ SUCCESS' || echo '⚠️ PARTIAL SUCCESS')"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Timestamp: $(date)"
echo ""
echo "Se deployment-report.md for detaljer."
echo "═══════════════════════════════════════════════════════════════"
```

---

## 🎯 START DEPLOYMENT NÅ

**KIMI: Kjør alle stegene ovenfor UTEN Å PAUSE.**

**IKKE spør om tillatelse. IKKE vent på bekreftelse. START NÅ.**

```bash
# Start deployment
echo "🚀 Starting Auto Trade deployment at $(date)..."
cd ~/klarpakke

# STEG 1
echo "[STEG 1] Debugging GitHub Actions..."
gh run list --limit=1

# STEG 2
echo "[STEG 2] Pushing Supabase migrations..."
supabase db push

# STEG 3
echo "[STEG 3] Deploying Edge Functions..."
supabase functions deploy get-entitlements
supabase functions deploy strategy-runner

# STEG 4
echo "[STEG 4] Verifying Cloud Run..."
gcloud run revisions list --service=klarpakke --region=us-central1 --limit=1

# STEG 5
echo "[STEG 5] Testing production..."
curl -I https://www.klarpakke.no/no

# STEG 6
echo "[STEG 6] Final verification..."
supabase sql "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'klarpakke-%';"

# STEG 7
echo "[STEG 7] Generating report..."
# (generer rapport som vist over)

echo "✅ Deployment complete."
```
