# Klarpakke — Post-Launch Monitoring Setup

Dette dokumentet beskriver komplett monitoring-oppsett for Klarpakke produksjon.

## 🏗️ Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     MONITORING STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Sentry     │  │  GitHub      │  │  Supabase    │      │
│  │   Alerts     │  │  Actions     │  │  Edge Func   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         ▼                 ▼                  ▼               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ALERT DESTINATIONS                       │  │
│  │  • Slack #ops    • Email ops@    • PagerDuty          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 1. Sentry Alerts

### Alert Regler (kopier til Sentry Dashboard)

#### 🩺 1. Health API Downtime
- **Trigger**: `/api/health` returnerer != 200 i > 2 minutter
- **Query**: `url:https://www.klarpakke.no/api/health http.status_code:[500 503 504]`
- **Threshold**: 1 error per 2 minutter
- **Action**: Slack #ops + Email

#### 💳 2. Stripe Webhook Failures
- **Trigger**: Webhook 5xx > 3 ganger på 5 min
- **Query**: `url:https://www.klarpakke.no/api/webhooks/stripe http.status_code:[500 502 503 504]`
- **Threshold**: 3 errors per 5 minutter
- **Action**: Slack #ops + Email (critical)

#### ❄️ 3. Edge Function Cold Start
- **Trigger**: Cold start > 60 sekunder
- **Query**: `event.type:transaction transaction.op:functions transaction.duration:>60000`
- **Threshold**: 5 per 10 minutter
- **Action**: Slack #ops

#### 🤖 4. Auto Trade Failures
- **Trigger**: > 10 failed trades siste time
- **Query**: `auto_trade failed status:failed`
- **Threshold**: 10 per time
- **Action**: Slack #ops + Email + PagerDuty

## 2. GitHub Actions Health Monitor

### Workflow: `.github/workflows/health-monitor.yml`

**Schedule**: Hvert 5. minutt (`*/5 * * * *`)

**Funkjsonalitet**:
1. Pinger `https://www.klarpakke.no/api/health`
2. Retry 3 ganger ved feil
3. Feiler workflow hvis HTTP != 200 eller status != "healthy"
4. Logger responstid og uptime
5. Sender Slack-varsel ved feil
6. Sender recovery-varsel når tilbake til normal

**Artefakter**:
- Health metrics lagres som artifacts (30 dagers retention)
- Trend data for responstid

**Setup**:
```bash
# Legg til i GitHub Secrets
SLACK_OPS_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

## 3. Supabase Edge Function — Daglig Rapport

### Function: `supabase/functions/daily-ops-report/`

**Schedule**: Kl 07:00 CET hver dag

**Innhold**:
- Antall aktive paper traders
- Antall aktive auto traders
- AI-signaler siste 24t (BUY/SELL/HOLD)
- Feilede trades siste time + 24t
- Feiltyper aggregert
- Abonnementer: aktive, nye, kansellerte

**E-post**: Sendes til `ops@klarpakke.no`

**Deploy**:
```bash
# Deploy Edge Function
supabase functions deploy daily-ops-report

# Sett schedule
supabase functions schedule daily-ops-report --cron "0 7 * * *"

# Sett secrets
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set CRON_SECRET=xxx
```

## 4. Stripe Webhook Health

### Tabell: `webhook_events`

**Kolonner**:
- `id` (UUID)
- `type` (stripe event type)
- `stripe_event_id` (unique)
- `payload` (JSONB)
- `received_at` (TIMESTAMPTZ)
- `processed_at` (TIMESTAMPTZ)
- `status` (processing/completed/failed/error)
- `processing_time_ms` (INTEGER)
- `error_message` (TEXT)

### Edge Function: `supabase/functions/stripe-webhook-logger/`

**Funkjsonalitet**:
1. Logger alle innkommende events
2. Forwarder til faktisk webhook handler
3. Måler processing time
4. Alert hvis > 3 sekunder

**Alert**:
- Insert i `monitoring_alerts` ved langsom prosessering
- Sentry breadcrumb for debugging

### SQL Migration

Kjør: `sql/monitoring_tables.sql`

Inneholder:
- `webhook_events` tabell
- `monitoring_alerts` tabell
- `health_check_metrics` tabell
- Triggers for auto-alerts
- Views for rapportering

## 5. Database Alerts

### Auto-trade Failure Trigger

```sql
-- Trigger på auto_trade_log
-- Oppretter alert ved > 10 failures per time
```

### Webhook Performance Trigger

```sql
-- Trigger på webhook_events
-- Alert ved processing_time_ms > 3000
```

## 6. Views for Dashboard

### `active_alerts`
Ubekreftede alerts sortert etter severity.

### `webhook_health_summary`
24-timers sammendrag av webhook health.

## 7. Env Variabler

### GitHub Secrets
```
SLACK_OPS_WEBHOOK_URL    # Slack webhook for #ops kanal
```

### Supabase Secrets
```
RESEND_API_KEY           # For e-post sending
CRON_SECRET              # For å sikre Edge Functions
```

### Vercel Env
```
NEXT_PUBLIC_SENTRY_DSN   # Sentry SDK
```

## 8. Driftshåndbok

### Ved Alert

1. **Health API Down**:
   ```bash
   curl https://www.klarpakke.no/api/health
   # Sjekk database, Redis, trading signals
   ```

2. **Stripe Webhook Failures**:
   ```sql
   SELECT * FROM webhook_events 
   WHERE status != 'completed' 
   AND received_at > now() - interval '1 hour'
   ORDER BY received_at DESC;
   ```

3. **Auto Trade Failures**:
   ```sql
   SELECT * FROM auto_trade_log 
   WHERE status = 'failed' 
   AND created_at > now() - interval '1 hour'
   ORDER BY created_at DESC;
   ```

4. **Edge Function Cold Start**:
   - Sjekk Supabase Dashboard → Edge Functions
   - Vurder å bytte til Node.js runtime hvis vedvarende

### Daglig Sjekkliste

- [ ] Sjekk Slack #ops for alerts
- [ ] Les daglig e-post rapport
- [ ] Sjekk Sentry for nye errors
- [ ] Verifiser health check graf

### Ukentlig Sjekkliste

- [ ] Gå gjennom webhook health summary
- [ ] Sjekk auto-trade failure trends
- [ ] Review database performance metrics
- [ ] Sjekk API responstid trends

## 9. Troubleshooting

### Ingen alerts mottas
1. Sjekk Sentry alert config
2. Verifiser Slack webhook URL
3. Sjekk e-post spam-filter

### For mange false positives
1. Juster thresholds i Sentry
2. Oppdater DB trigger thresholds
3. Legg til exclusions for maintenance windows

### Missing data
1. Sjekk Edge Function logs i Supabase
2. Verifiser cron schedule
3. Sjekk secrets er satt

## 10. Kontakt

- **On-call**: ops@klarpakke.no
- **Slack**: #ops
- **Runbook**: Denne filen
