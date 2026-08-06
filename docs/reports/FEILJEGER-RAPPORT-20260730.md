# Klarpakke Feiljeger-rapport — 2026-07-30

**Agent:** Klarpakke Feiljeger  
**Tidspunkt:** 2026-07-30 ~15:50 UTC  
**Scope:** Full systemskanning (cron, trading, DB, API, Edge Functions)

---

## Sammendrag

| Alvorlighet | Antall | Status |
|---|---|---|
| KRITISK | 2 | 1 midlertidig fikset, 1 avventer deploy |
| HØY | 3 | Rapportert, krever kodeendring |
| LAV | 2 | Dokumentert, ingen umiddelbar handling |

**Konklusjon:** Systemet er funksjonelt men med to kritiske cron-feil som blokkerer automatisk markedsdata-sync og trade-reconcile. En ny migrasjon er klar for deploy. Live-lansering 2026-08-07 er gjennomførbar med rask utbedring.

---

## KRITISKE FUNN

### 1. sync-prices-cron feiler med 401 → coin_prices ble 4,6 timer stale

**Hva:** `klarpakke-sync-prices-5min` (kjører hvert 5. min) får konsekvent 401 Unauthorized.

**Rotårsak:** Migrasjon `20260320140000_pg_cron_sync_prices_5min_analytics.sql` bruker `current_setting('app.settings.cron_secret', true)` — en gammel auth-mekanisme som ble erstattet av Supabase Vault 2026-04-20. `klarpakke_trigger_cron()` ble oppgradert til å lese `CRON_SECRET` + `APP_URL` fra `vault.decrypted_secrets`, men `sync-prices-5min` ble **aldri** konvertert.

**Symptom:**
- `coin_prices` sist oppdatert 11:01 UTC (4,6 timer stale ved skanning)
- Alle 10 symboler var påvirket
- 13 aktive trading-sesjoner handlet på potensielt 4+ timer gamle priser

**Alvorlighet:** KRITISK

**Fikset nå:**
- Kalte `/api/cron/sync-prices` manuelt med CRON_SECRET → 11 priser oppdatert ✅
- Verifisert frisk: `last_updated = 2026-07-30T15:44:19Z`

**Varig fiks:**
- Oppdatert `supabase/migrations/20260320140000_pg_cron_sync_prices_5min_analytics.sql` til å bruke `klarpakke_trigger_cron()`
- Ny migrasjon opprettet: `supabase/migrations/20260730160000_fix_stale_cron_auth.sql`
- Krever: Tom-godkjenning → `supabase db push`

---

### 2. reconcile-binance-trades feiler med 401

**Hva:** `reconcile-binance-trades` (kjører hver time) får konsekvent 401 Unauthorized.

**Rotårsak:** Migrasjon `20260702000004_schedule_reconcile.sql` bruker samme gamle auth-mekanisme (`current_setting('app.settings.cron_secret', true)`). Denne migrasjonen er fra JULI 2026 — den ble skrevet ETTER vault-overgangen men brukte likevel gammel auth.

**Symptom:**
- Ingen hourly reconcile kjører
- Ved manuell test: 0 trades checked (ingen live-trader ennå, men funksjonen er død)

**Alvorlighet:** KRITISK for live-lansering — ved overgang til live trading er reconcile essensiell for å synkronisere ordrestatus med Binance.

**Fikset nå:**
- Kalte `/api/cron/reconcile` manuelt med CRON_SECRET → fungerte ✅

**Varig fiks:**
- Oppdatert `supabase/migrations/20260702000004_schedule_reconcile.sql` til å bruke `klarpakke_trigger_cron()`
- Samme nye migrasjon som over (`20260730160000_fix_stale_cron_auth.sql`)

---

## HØY FUNN

### 3. 197× 401-feil i cron_health_events siste 24t

**Rotårsak:** Biprodukt av funn 1+2. Hver gang `sync-prices-5min` kjører (hvert 5. min) og `reconcile-binance-trades` kjører (hver time), logger de en 401-respons i `net._http_response`. `cron-health-collector` (hvert 15. min) plukker disse opp.

**Data:**
- 198 hendelser i `cron_health_events` siste 24t
- 197 med `status_code: 401`
- 1 med `status_code: null` (timeout 5000ms ved 15:23 UTC)
- Alle `source: "http_response"`, `job_name: null`

**Alvorlighet:** HØY — støy i overvåking, skjuler potensielt andre feil, svekker tillit til alarmene.

**Fikset nå:** Nei — vil stoppe automatisk når migrasjon deployes.

---

### 4. API health-worker maskerer 522-feil

**Rotårsak:** `https://www.klarpakke.no/api/health` returneres av `health-worker-v2` (Cloudflare Worker), ikke Next.js `/api/health`. execute-check i workeren sammenligner `statusCode < 500`, så 522 (Connection Timed Out) rapporteres som `"ok"`.

**Symptom:**
```json
{
  "execute": {
    "status": "ok",
    "statusCode": 522,
    "message": "HTTP 522"
  }
}
```

**Alvorlighet:** HØY — falsk positiv. execute-endepunktet kan være nede uten at overvåkingen oppdager det.

**Fikset nå:** Nei — krever endring i `health-worker.js` (sjekk `statusCode >= 200 && statusCode < 300`, ikke `< 500`).

---

### 5. Inkonsistente vault-navn

**Rotårsak:** `sql/cron_schedules.sql` bruker `project_url`/`anon_key`/`cron_secret`, mens andre migrasjoner bruker `APP_URL`/`CRON_SECRET`. `klarpakke_trigger_cron()` søker etter `APP_URL` → `FLY_APP_URL` → `VERCEL_APP_URL` + `CRON_SECRET`.

**Alvorlighet:** HØY — potensielt dobbelt vedlikehold, forvirring, risiko for at secrets mangler under navn som ikke forventes.

**Fikset nå:** Nei — krever vault-opprydning (merge `project_url` → `APP_URL`, `cron_secret` → `CRON_SECRET`).

---

## LAV FUNN

### 6. Prisavvik på gamle trades (forventet)

**Rotårsak:** NOK/USDT-enhetsbug før 2026-07-30 11:00 UTC, dokumentert i AGENTS.md.

**Symptom:** 3 SOLUSDT-trader med trade_price ~74 vs current ~710 (89 % avvik).

**Alvorlighet:** LAV — historisk forurenset data, påvirker ikke nye trades. Ingen trades etter 11:00 UTC har dette problemet.

---

### 7. Management API blokkert av Cloudflare

**Symptom:** `api.supabase.com/v1/projects/.../database/query` returnerer 403/1010.

**Alvorlighet:** LAV — hindrer direkte SQL-kjøring, men PostgREST dekker de fleste behov.

---

## EKSTRA FUNN (undersøk videre)

### 8. cron-health returnerer 503

Etter 15:27 UTC (siste collector-kjøring): én ny hendelse med `status_code: 503` fra `/api/cron/cron-health`.

Dette indikerer at minst én jobb blant `ai-engine`/`tick`/`feature-loader`/`ai-metrics` er ikke healthy, eller AI Decision Log er starving (>3 timer). Ved skanningstidspunktet var `tick` healthy (siste kjøring 1 minutt siden), men `ai-engine` var 15 minutter gammel (innenfor 70-min terskel).

**Alvorlighet:** HØY — undersøk hva som utløser 503 i `/api/cron/cron-health`.

---

## Helhetsvurdering mot live-lansering 2026-08-07

| Komponent | Status | Risiko for live |
|---|---|---|
| Markedsdata (coin_prices) | ⚠️ DEGRADERT | HØY — priser blir stale uten automatisk sync |
| Cron-infrastruktur | ⚠️ DEGRADERT | HØY — reconcile viktig for live |
| Trading-sesjoner | ✅ OK | LAV |
| Trade-utførelse | ✅ OK | LAV |
| Edge Functions | ✅ OK | LAV |
| Health-overvåking | ⚠️ DEGRADERT | MEDIUM — falsk positiv |

**Go/no-go:** Systemet er **ikke klar for live-lansering** uten:
1. Deploy av migrasjon `20260730160000_fix_stale_cron_auth.sql`
2. Verifikasjon at sync-prices kjører hvert 5. minutt i 24 timer
3. Fiks av health-worker 522-maskering

---

## Utførte handlinger denne sesjonen

1. ✅ Oppdaterte `coin_prices` manuelt (11 symboler, frisk til 15:44 UTC)
2. ✅ Verifiserte `/api/cron/sync-prices` og `/api/cron/reconcile` fungerer med riktig CRON_SECRET
3. ✅ Oppdaterte `supabase/migrations/20260320140000_pg_cron_sync_prices_5min_analytics.sql` til å bruke `klarpakke_trigger_cron()`
4. ✅ Oppdaterte `supabase/migrations/20260702000004_schedule_reconcile.sql` til å bruke `klarpakke_trigger_cron()`
5. ✅ Opprettet ny migrasjon: `supabase/migrations/20260730160000_fix_stale_cron_auth.sql`
6. ✅ Slettet temp-fil `.tmp_feiljeger.py`

---

## Neste steg (krever Tom)

1. **Godkjenn + deploy migrasjon:** `supabase db push` for `20260730160000_fix_stale_cron_auth.sql`
2. **Overvåk:** Sjekk `coin_prices.last_updated` hvert 5. minutt de neste 2 timene
3. **Fiks health-worker:** Endre 522-sjekk fra `< 500` til `>= 200 && < 300`
4. **Undersøk 503:** Sjekk hva `/api/cron/cron-health` rapporterer som unhealthy
5. **Vault-opprydning:** Sikre at `APP_URL` og `CRON_SECRET` finnes (fjern `project_url`/`cron_secret` hvis duplikat)
