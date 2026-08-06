# Endpoint 502/503 Monitoring — pg_cron + Resend Alerting

Overvåk et spesifikt API-endepunkt for HTTP 502/503-feil og varsle via Resend.
Dette er et supplement til `health-monitoring-alerting.md` (trading-invariants)
og `klarpakke-operations.md` seksjon 15 (helseovervåkning).

## Hvorfor dette er nyttig

`/api/health` sjekker infrastruktur (DB, KV, Binance-proxy) men ikke om et spesifikt
endepunkt fungerer end-to-end. Et execute-endepunkt kan returnere 502
(pris-kilden nede, DB-feil, Binance proxy-feil) selv om `/api/health` er grønn.
Denne monitoreringen fanger det.

## Arkitektur (3-lags)

```
pg_cron (hvert 5. min)
  |
  +-- health-keepalive -> GET /api/health  (health-worker.js, CF Worker)
  |     +-- Prober execute-endepunktet -> status "healthy" eller "degraded"
  |
  +-- monitoring-alert -> POST /api/cron/monitoring-alert (Next.js, CRON_SECRET)
        +-- Prober execute-endepunktet med POST (tom body -> forventer 400)
        |   +-- 502/503 -> Logger til health_check_metrics + Resend-epost
        |   +-- OK (400/401) -> Logger "healthy" til health_check_metrics
        +-- Prober /api/health -> varsler også hvis helse-endepunktet er nede
```

## Filer

| Fil | Formål |
|-----|--------|
| `src/app/api/cron/monitoring-alert/route.ts` | Next.js cron-route: prober execute + health, logger + varsler |
| `health-worker.js` | CF Worker: prober execute på hver /api/health-forespørsel |
| `src/app/api/health/route.ts` | La til `checkExecuteEndpoint()` i comprehensive health check |
| `sql/cron_schedules.sql` | pg_cron-jobben `monitoring-alert` (hvert 5. min) |

## Hvordan det fungerer

### 1. Probe-mønster for POST-endepunkt

Execute-endepunktet krever autentisering + valid JSON-body. For å unngå å måtte
sende en gyldig trade (som ville kreve auth + påvirke data), sender vi en tom body:

```typescript
const res = await fetch(`${baseUrl}/api/paper-trading/execute`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
  signal: AbortSignal.timeout(10000),
});
```

**Forventet respons:**
- **400** — Endepunktet lever (tom body = validation error). Dette er OK.
- **401** — Endepunktet lever (auth påkrevd). Også OK.
- **502/503** — Backend-feil. Binance proxy nede, DB-feil, pris-kilde feilet.
- **5xx annet** — Generell serverfeil.

### 2. health-worker.js prober

`health-worker.js` er en CF Worker som interceptor `/api/health`-kall. Den prober
execute-endepunktet og returnerer `status: "degraded"` + detaljer i `checks.execute`
når 502/503 oppdages:

```javascript
if (executeStatus === 502 || executeStatus === 503) {
  executeHealthy = false;
  executeMessage = body.error || `HTTP ${executeStatus}`;
}
```

### 3. monitoring-alert Next.js route

Ny route (`src/app/api/cron/monitoring-alert/route.ts`) som:
- Prober execute-endepunktet
- Prober /api/health
- Logger til `health_check_metrics` tabell via Supabase REST API
- Sender epost via `sendEmail()` (prosjektets Resend-integrasjon i `src/lib/email/send.ts`)

Logger til health_check_metrics:
```typescript
await fetch(`${supabaseUrl}/rest/v1/health_check_metrics`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  },
  body: JSON.stringify({
    timestamp: new Date().toISOString(),
    overall_status: result.status === 'ok' ? 'healthy' : 'unhealthy',
    database_status: result.status === 'ok' ? 'ok' : 'error',
    database_latency_ms: result.latency ?? null,
    version: 'monitoring-alert',
    metadata: {
      check: result.name,
      status_code: result.statusCode ?? null,
      error: result.error ?? null,
    },
  }),
});
```

### 4. pg_cron med auth-headers

`net.http_post` støtter headers — inkludert `Authorization: Bearer <CRON_SECRET>`:

```sql
SELECT cron.schedule(
    'monitoring-alert',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/api/cron/monitoring-alert',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
                select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
            )
        ),
        body := jsonb_build_object('triggered_at', now(), 'source', 'pg_cron')
    ) as request_id;
    $$
);
```

**Pitfall:** Vault-secret `cron_secret` må finnes i `vault.decrypted_secrets`.
Dette er SEPARAT fra Edge Function `CRON_SECRET` — se `cron-secret-double-storage.md`.

## Implementere for et nytt endepunkt

1. Kopier `src/app/api/cron/monitoring-alert/route.ts` -> tilpass URL og navn
2. Oppdater `health-worker.js` hvis endepunktet skal være synlig i helse-svaret
3. Legg til pg_cron-jobben i `sql/cron_schedules.sql` (unschedule + schedule + verifisering)
4. Sørg for at vault-secret `cron_secret` er satt i Supabase
5. Kjør SQL-en: `psql $DATABASE_URL -f sql/cron_schedules.sql`
