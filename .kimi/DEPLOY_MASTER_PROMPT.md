# KLARPAKKE DEPLOY — KIMI CODE 2.5 MASTER PROMPT
> **Source of Truth:** [DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md) — Les denne først!

---

## 🎯 DIN ROLLE

Du er deployment-automatiseringsagenten for Klarpakke. Din jobb er å:
1. **Kjøre database-migrasjoner** uten feil
2. **Deploye Edge Functions** til Supabase
3. **Deploye til Google Cloud Run** via **gcloud CLI** (primær metode)
4. **Verifisere** at alt fungerer i produksjon
5. **Rapportere** eventuelle feil med konkrete løsninger

---

## 🔴 VIKTIG: DEPLOY-STRATEGI

**ALLTID følg [DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)!**

| Metode | Når å bruke |
|--------|-------------|
| **Google Cloud CLI** | **ALLTID først** — primær metode |
| GitHub Actions | Kun etter manuell deploy er verifisert |

### Rask deploy (standard)

```bash
cd ~/klarpakke
gcloud run deploy klarpakke \
  --source . \
  --region us-central1 \
  --project klarpakke-universitet \
  --allow-unauthenticated
```

---

## 🔴 KRITISK KONTEKST

| Egenskap | Verdi |
|---|---|
| Repo | `~/klarpakke` (GitHub: `tajlive/KP`) |
| Hosting | **Google Cloud Run** (`us-central1`) |
| GCP Prosjekt | `klarpakke-universitet` |
| Database | Supabase (`vuxbjlykgmzskxbclquf`) |
| Supabase CLI | Må være konfigurert (`supabase link`) |
| Google Cloud CLI | Må være autentisert (`gcloud auth`) |
| Node | 20 |

---

## 📋 OPPGAVE A: FIX SUPABASE MIGRATION CONFLICT

### Problem
```
Remote migration versions not found in local migrations directory.
Make sure your local git repo is up-to-date.
```

### Løsning
```bash
# STEG 1: Sjekk hvilke migrasjoner som mangler
supabase migration list

# STEG 2: Repair migration history
supabase migration repair --status reverted <timestamp1> <timestamp2>

# STEG 3: Pull remote migrations
supabase db pull

# STEG 4: Merge conflicts (hvis noen)
# Manually review supabase/migrations/ og velg riktig versjon

# STEG 5: Push igjen
supabase db push
```

### KIMI: Automatiser dette
1. Kjør `supabase migration list`
2. Parse output og identifiser manglende migrasjoner
3. Kjør `supabase migration repair` for hver manglende
4. Kjør `supabase db pull`
5. Sjekk for merge conflicts i `supabase/migrations/`
6. Hvis ingen conflicts: Kjør `supabase db push`
7. Hvis conflicts: Rapporter til bruker med diff

---

## 📋 OPPGAVE B: DEPLOY EDGE FUNCTIONS

### Kommandoer
```bash
# Deploy enkeltvis (foretrukket for debugging)
supabase functions deploy get-entitlements
supabase functions deploy strategy-runner
supabase functions deploy signal-engine
supabase functions deploy binance-connect

# Deploy alle samtidig
supabase functions deploy
```

### Vanlige feil og løsninger

#### Feil 1: `context canceled`
**Årsak:** Timeout eller nettverk-problem  
**Løsning:** Retry med eksponentiell backoff

```bash
for i in {1..3}; do
  supabase functions deploy get-entitlements && break
  echo "Retry $i/3..."
  sleep $((i * 5))
done
```

#### Feil 2: `function not found`
**Årsak:** Mangler `supabase/functions/<name>/index.ts`  
**Løsning:** Sjekk at filen eksisterer

```bash
ls -la supabase/functions/*/index.ts
```

#### Feil 3: `import error`
**Årsak:** Deno import-syntax feil  
**Løsning:** Bruk npm specifiers for npm-pakker

```typescript
// ❌ Feil
import Binance from 'binance-api-node'

// ✅ Riktig
import Binance from 'npm:binance-api-node'
```

### KIMI: Automatiser dette
1. Les `supabase/functions/` directory
2. For hver funksjon som har `index.ts`:
   - Kjør `supabase functions deploy <name>`
   - Logg output
   - Hvis feil: Retry 3 ganger med 5 sek delay
   - Hvis fortsatt feil: Rapporter med full stack trace
3. Verifiser at alle functions er deployed:
   ```bash
   supabase functions list
   ```
4. Test hver funksjon med curl:
   ```bash
   curl -X POST \
     https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/<name> \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

---

## 📋 OPPGAVE C: DEPLOY TIL GOOGLE CLOUD RUN

**VIKTIG:** Les [DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md) først!

### Metode 1: Via Google Cloud CLI (FORETRUKKET — ALLTID BRUK DETTE)

```bash
# STEG 1: Test lokal build
npm run build

# STEG 2: Deploy med gcloud
gcloud run deploy klarpakke \
  --source . \
  --region us-central1 \
  --project klarpakke-universitet \
  --allow-unauthenticated

# STEG 3: Verifiser
gcloud run revisions list --service=klarpakke --region=us-central1 --limit=3
curl -sI https://www.klarpakke.no/no | head -1
```

### Metode 2: Via GitHub Actions (KUN hvis eksplisitt bedt om det)

```bash
# Commit og push
git add -A
git commit -m "feat: deploy via GitHub Actions"
git push origin main

# Vent på GitHub Actions
# Følg med på: https://github.com/tajlive/KP/actions

# Verifiser
gcloud run revisions list --service=klarpakke --region=us-central1 --limit=3
```

### KIMI: Automatiser dette
1. Sjekk git status:
   ```bash
   git status --porcelain
   ```
2. Hvis uncommitted changes:
   - List endringene
   - Commit med beskrivende melding
3. Kjør lokal build:
   ```bash
   npm run build
   ```
4. Deploy med gcloud CLI:
   ```bash
   gcloud run deploy klarpakke --source . --region us-central1 --project klarpakke-universitet --allow-unauthenticated
   ```
5. Poll for deploy-status (sjekk revisjoner)
6. Verifiser Cloud Run revision:
   ```bash
   gcloud run revisions list --service=klarpakke --region=us-central1 --format="table(name,state,image)"
   ```
7. Test produksjon:
   ```bash
   curl -sI https://www.klarpakke.no/no | head -1
   ```
   Forventet: `HTTP/2 200`

---

## 📋 OPPGAVE D: VERIFISER PG_CRON

```bash
# STEG 1: Sjekk at extension er aktivert
supabase sql "SELECT * FROM pg_extension WHERE extname = 'pg_cron';"

# STEG 2: List alle cron jobs
supabase sql "SELECT * FROM cron.job WHERE jobname LIKE 'klarpakke-%';"

# STEG 3: Test en job manuelt
supabase sql "SELECT cron.schedule_in_database('test-dca', '0 9 * * 1', $$SELECT 1$$);"
supabase sql "SELECT * FROM cron.job WHERE jobname = 'test-dca';"
supabase sql "SELECT cron.unschedule('test-dca');"
```

### Forventet output
```
 jobname               | schedule              | active
-----------------------+-----------------------+--------
 klarpakke-dca-weekly  | 0 9 * * 1            | t
 klarpakke-trend-daily | 0 21 * * *           | t
 klarpakke-multisignal | 5 0,4,8,12,16,20 * * | t
 klarpakke-grid-check  | * * * * *            | t
 klarpakke-aicopy-poll | */5 * * * *          | t
```

### KIMI: Automatiser dette
1. Kjør SQL-query for å liste cron jobs
2. Parse output og verifiser at alle 5 jobs eksisterer
3. Hvis noen mangler:
   - Kjør migration `20260220042623_pg_cron_schedules.sql` på nytt
4. Test én job manuelt (DCA)
5. Sjekk `strategy_logs` for aktivitet:
   ```sql
   SELECT * FROM strategy_logs ORDER BY executed_at DESC LIMIT 10;
   ```

---

## 📋 OPPGAVE E: VERIFISER GOOGLE CLOUD SCHEDULER

```bash
# STEG 1: Sjekk at job eksisterer
gcloud scheduler jobs list --location=us-central1 --project=klarpakke-universitet

# Forventet:
# NAME                          LOCATION      SCHEDULE         STATE
# klarpakke-grid-bot-realtime   us-central1   */30 * * * * *   ENABLED

# STEG 2: Test manuelt
gcloud scheduler jobs run klarpakke-grid-bot-realtime \
  --location=us-central1 \
  --project=klarpakke-universitet

# STEG 3: Sjekk logs etter 30 sek
gcloud run services logs read klarpakke --region=us-central1 --limit=20
```

---

## ✅ SUKSESSKRITERIER

Oppdraget er fullført når:
- [ ] `supabase db push` kjører uten feil
- [ ] Alle Edge Functions er deployed og fungerer
- [ ] Google Cloud Run har ny revisjon i SERVING-status
- [ ] `https://www.klarpakke.no/no` returnerer HTTP 200
- [ ] `/api/health` returnerer `{"status":"ok"}`
- [ ] pg_cron har alle 5 jobs aktive
- [ ] Cloud Scheduler har Grid Bot-job
- [ ] Auto Trade Dashboard fungerer (HTTP 401 eller 200)

---

## 🚨 FEILHÅNDTERING

Hvis noe feiler:
1. **Logg full error output** (ikke trunkert)
2. **Identifiser root cause** (ikke symptom)
3. **Foreslå 2-3 løsninger** (rangert etter sannsynlighet)
4. **Gi konkrete kommandoer** (ikke "prøv å...")
5. **Test løsningen** før du rapporterer at det er fikset

---

## 📝 OUTPUT-FORMAT

Avslutt alltid med:

```
✅ DEPLOYMENT FULLFØRT

Metode: Google Cloud CLI (gcloud run deploy)
Commit: <git SHA>
Revisjon: <Cloud Run revisjon navn>
Deploy-tid: <X minutter>

Oppgaver utført:
- [x] Oppgave A: Fix migration conflict
- [x] Oppgave B: Deploy Edge Functions (4/4)
- [x] Oppgave C: Deploy til Cloud Run (revision: klarpakke-00042-abc)
- [x] Oppgave D: Verifiser pg_cron (5/5 jobs aktive)
- [x] Oppgave E: Verifiser Cloud Scheduler

Verifisering:
✅ Database: Alle migrasjoner kjørt
✅ Edge Functions: get-entitlements, strategy-runner, signal-engine, binance-connect
✅ Cloud Run: https://www.klarpakke.no/no returnerer 200
✅ pg_cron: 5 jobs aktive
✅ Scheduler: Grid Bot kjører hvert 30. sekund

Neste steg:
1. Test Auto Trade Dashboard med autentisert bruker
2. Konfigurer Binance testnet API-nøkler
3. Opprett test-strategi (paper mode)
4. Verifiser at scheduler fungerer
```

---

## 🔗 REFERANSER

- **[DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)** — Source of truth for deploy
- [docs/infra-gcp.md](../docs/infra-gcp.md) — GCP-infrastruktur dokumentasjon
- [.kimi/FIX_AUTH_LOOP.md](./FIX_AUTH_LOOP.md) — Auth loop fix
- [docs/auto-trade.md](../docs/auto-trade.md) — Auto Trade-detaljer
