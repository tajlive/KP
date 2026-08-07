# Alt skal være optimalt — Komplett optimaliseringsplan

> **For Hermes:** Utfør i tre faser. Hver fase er uavhengig. Bruk `klarpakke-build` for deploy, `klarpakke-supabase-ops` for DB-endringer.

**Goal:** Optimalisere ALLE plattformer uten å øke kostnader. Fikse alt som er ødelagt. Aktivere ubrukte inkluderte tjenester. Gi Hermes full oversikt over klarpakke.no.

**Tech Stack:** Next.js 16, Cloudflare Workers, Supabase, GitHub Actions, Honcho memory, Resend email, Hermes cron.

---

## Nåværende tilstand — problemer funnet

### ❌ KRITISKE FEIL (må fikses NÅ)

| #   | Problem                                                      | Effekt                                                        |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | **kimi-oauth-prod-sync** feiler hvert 30. min                | Kimi OAuth-tokens blir ikke synkronisert → API-kall kan feile |
| 2   | **fetch-klines-daglig** feiler: model 'k3' → 'kimi-k3' drift | Ingen historiske prisdata hentes                              |
| 3   | **Tom Kraken Live daglig** feiler: samme model-drift         | Daglig analyse kjøres ikke                                    |
| 4   | **autopilot-watchdog** feiler: orchestrator har ikke kjørt   | Rate-limit på Kraken → ingen fills oppdaget                   |
| 5   | **Hermes Gateway IKKE KJØRENDE**                             | Alle cron-jobber må trigges manuelt                           |

### ⚠️ INGEN EKSTRA KOSTNAD — MEN IKKE AKTIVERT

| #   | Plattform  | Tjeneste        | Verdi                                          |
| --- | ---------- | --------------- | ---------------------------------------------- |
| 6   | GitHub     | Actions CI/CD   | Auto-deploy ved push. 2000 min/mnd inkludert   |
| 7   | GitHub     | Secret Scanning | Blokkerer API-nøkler i commits. GRATIS         |
| 8   | Supabase   | Realtime        | Live pris-oppdateringer i UI. Inkludert i Pro  |
| 9   | Supabase   | Storage         | Filopplasting (avatars, exports). 100 GB inkl. |
| 10  | Cloudflare | Workers AI      | Edge-AI (Llama, Mistral). Gratis tier          |
| 11  | Cloudflare | Queues          | Message queue. 1M ops/mnd inkl.                |
| 12  | Resend     | Webhooks        | Email delivery tracking (skal sjekkes)         |

### 💰 KOSTNADSOPTIMALISERING

| #   | Plattform | Problem                                 | Potensiell besparelse |
| --- | --------- | --------------------------------------- | --------------------- |
| 13  | Kimi API  | auto-caching $27.60/dag (56%)           | $500-675/mnd          |
| 14  | Kimi API  | Flytt volum → DeepSeek                  | $200-400/mnd          |
| 15  | DeepSeek  | Betaling via PayPal + Card → konsolider | —                     |

---

## Fase 1: Fiks alt som er ødelagt (nå)

### Task 1.1: Fiks Hermes Gateway

**Objective:** Start Gateway så cron-jobber kjører automatisk igjen.

```bash
hermes gateway install
hermes gateway status
```

Expected: `✓ Gateway running — 26 jobs scheduled`

### Task 1.2: Fiks kimi-oauth-prod-sync

**Objective:** Fiks wrangler secret-kommandoen som feiler.

**Files:** `~/.hermes/scripts/kimi-oauth-prod-sync.sh`

**Problem:** `wrangler secret put` krever `--env ""` flag (top-level environment).

**Fiks:** Endre fra `wrangler secret put` til `wrangler versions secret put --env ""`.

```bash
grep "wrangler.*secret" ~/.hermes/scripts/kimi-oauth-prod-sync.sh
```

### Task 1.3: Fiks fetch-klines-daglig + Tom Kraken Live (model drift)

**Objective:** Pin modell til `kimi-k3` i cron-jobben.

```bash
# Fetch-klines
cronjob action=update job_id=00c8a6fd4728 provider=custom:kimi-k3-global model=kimi-k3

# Tom Kraken Live daglig
cronjob action=update job_id=ada921a4e191 provider=custom:kimi-k3-global model=kimi-k3
```

### Task 1.4: Fiks autopilot-watchdog (Kraken rate-limit)

**Objective:** Orkestratoren trenger å kjøre. Rate-limit utløper etter ~15 min.

**Løsning:** Vent til rate-limit utløper, så trigger manuelt. Alternativt: øk intervallet til hvert 5. min (samme som pg_cron) for å unngå dobbel triggering.

### Task 1.5: Verifiser Resend

**Objective:** Sjekk at Resend er operativt og at `RESEND_API_KEY` i `.env.local` fungerer.

```bash
curl -s "https://api.resend.com/domains" \
  -H "Authorization: Bearer $RESEND_API_KEY" | jq '.data[].name'
```

Expected: `klarpakke.no` (eller et verifisert domene)

---

## Fase 2: Aktiver ubrukte inkluderte tjenester (0 kr)

### Task 2.1: GitHub Actions CI/CD pipeline

**Objective:** Auto-deploy ved `git push` til `main`. Spar 15 min per deploy.

**Files:**

- Create: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "24" }
      - run: npm ci
      - run: npm run cf:build
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: versions upload && versions deploy --version-id $(...)
```

### Task 2.2: GitHub Secret Scanning

**Objective:** Skru på push-beskyttelse for API-nøkler.

**Steg:**

1. Gå til https://github.com/tajlive/KP/settings/security_analysis
2. Enable "Secret scanning" → "Push protection"

### Task 2.3: Supabase Realtime (live UI-oppdateringer)

**Objective:** Live pris-oppdateringer og fill-varsler i UI uten polling.

**Files:**

- Modify: `src/features/autopilot/AutopilotDashboard.tsx` — legg til Realtime subscription
- Create: `src/lib/realtime/autopilot-channel.ts`

```typescript
// Autopilot Realtime subscription
const channel = supabase
  .channel("autopilot-changes")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "autopilot_state",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      setState(payload.new);
    },
  )
  .subscribe();
```

### Task 2.4: Cloudflare Workers AI (edge-inferens)

**Objective:** Gratis AI-inferens på edge for lette oppgaver.

**Bruk:** Trading-signaler, sentiment-analyse av nyheter, enkel kategorisering. Kjør på Workers AI (gratis tier: 100+ req/dag) istedenfor å kalle Kimi/DeepSeek.

### Task 2.5: Cloudflare Queues (bakgrunnsjobber)

**Objective:** Erstatt pg_cron → HTTP → Workers med Queue → Workers. Mer pålitelig.

**Files:**

- Create: `src/lib/queues/orchestrator-consumer.ts`
- Modify: `wrangler.jsonc` — legg til queue binding

---

## Fase 3: Kostnadsoptimalisering (uten funksjonstap)

### Task 3.1: Kimi auto-caching reduksjon ($828/mnd → $150/mnd)

**Objective:** Reduser context caching uten å miste funksjonalitet.

**Tiltak:**

1. `/new` etter hver større oppgave (ikke la samtaler vokse til 100K+)
2. Hermes system-prompt trimming (3,974 chars → 1,500)
3. Skills lastes kun når relevante (ikke alltid)
4. Bruk `session_search` istedenfor å sende hele historikken

**Besparing:** $27.60/dag → $5/dag = **-$675/mnd**

### Task 3.2: Flytt volum fra Kimi API → DeepSeek

**Objective:** DeepSeek V4 Pro er 2.2x billigere input, 4.6x billigere output, 53x billigere cache.

**Tiltak:**

1. Definer hvilke oppgaver som MÅ ha Kimi K3 (arkitektur, tung analyse)
2. Alt annet → DeepSeek V4 Pro
3. Enable DeepSeek context caching ($0.0036/M vs $0.19)

**Besparing:** $300-400/mnd

### Task 3.3: Konsolider DeepSeek-betaling

**Objective:** Slutt med $2/$10 småbetalinger (12 transaksjoner i juli). Bruk autopåfyll.

**Steg:** Sett opp auto-top-up på $50/mnd i DeepSeek dashboard.

---

## Fase 4: Klarpakke.no — full tilgang og overvåkning

### Task 4.1: Verifiser Chrome DevTools access

**Status:** ✅ Allerede aktiv. Kan navigere, fylle skjemaer, ta snapshots.

### Task 4.2: Supabase full access

**Status:** ✅ MCP Supabase fungerer (SQL queries, Edge Functions, migrations)

### Task 4.3: Cloudflare full access

**Status:** ⚠️ Workers deploy fungerer, men secrets og noen API-endepunkter feiler (auth). Fiks `wrangler versions secret put`.

### Task 4.4: Honcho memory — verifiser og optimaliser

**Objective:** Sørg for at Honcho cloud memory er synkronisert.

```bash
# Sjekk Honcho config
cat ~/.hermes/config.yaml | grep -A10 honcho
```

**Sjekkpunkter:**

- `memory_enabled: true`
- `user_profile_enabled: true`
- OAuth tokens er gyldige (Honcho bruker OAuth for cloud sync)
- Memory er oppdatert (siste sync < 24 timer)

---

## Fase 5: Deploy og verifiser alt

### Task 5.1: Full CI/CD pipeline test

```bash
git push → GitHub Actions → auto-build → auto-deploy → CDN purge → health check
```

### Task 5.2: Full system health check

```bash
curl https://www.klarpakke.no/api/health | jq
```

**Sjekk:**

- Database: OK
- Resend: OK
- Kraken: Connected
- Stripe: OK
- Autopilot: Running

### Task 5.3: Cron-status dashboard

Lag en enkel status-side som viser alle cron-jobber og deres siste status.

---

## Risikoer

| Risiko                                    | Håndtering                                        |
| ----------------------------------------- | ------------------------------------------------- |
| Kimi API-kall kan feile etter modellbytte | Pin alle cron til `kimi-k3` eksplisitt            |
| GitHub Actions kan bruke opp 2000 min/mnd | Monitorer, bruk self-hosted runner hvis nødvendig |
| Kraken rate-limit forhindrer autopilot    | Øk cron-intervall, legg til eksponentiell backoff |
| Resend API-nøkkel kan være utløpt         | Verifiser med health endpoint før endringer       |

---

## Estimert tidsbruk

| Fase                              | Tid              |
| --------------------------------- | ---------------- |
| Fase 1: Fiks ødelagte ting        | 30 min           |
| Fase 2: Aktiver ubrukte tjenester | 2 timer          |
| Fase 3: Kostnadsoptimalisering    | Løpende (atferd) |
| Fase 4: Full tilgang              | 30 min           |
| Fase 5: Deploy og verifiser       | 30 min           |
| **Totalt**                        | **~4 timer**     |

---

## Suksesskriterier

- [ ] Gateway kjører — cron-jobber trigger automatisk
- [ ] Alle 26 cron-jobber er grønne (0 feil)
- [ ] GitHub Actions deployer automatisk ved push
- [ ] Secret Scanning aktivert
- [ ] Kimi dagskostnad < $15 (fra $48)
- [ ] DeepSeek auto-top-up aktivert
- [ ] AutopilotDashboard viser grid_levels korrekt
- [ ] Orkestrator kjører hvert 5. min uten rate-limit
- [ ] Honcho memory synkronisert
- [ ] Resend operativt
