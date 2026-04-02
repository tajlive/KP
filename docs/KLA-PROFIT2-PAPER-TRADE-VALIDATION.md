# KLA-PROFIT2: Paper-Trade 48h Validering

**Epic:** KLA-231 Profit First Initiative  
**Parent:** KLA-PROFIT1 (Merged)  
**Status:** 📋 Backlog / Ready to Start  
**Priority:** P0  
**Assignee:** Platform + Trading Team  
**Deadline:** 48 timer etter KLA-PROFIT1 merge  

---

## Bakgrunn

KLA-PROFIT1 (Ensemble AI Metrics) er nå i produksjon. Denne oppgaven tracker 48-timers validering av:
- Signal persistence og kvalitet
- Paper-trade integrasjon
- System stabilitet
- Performance metrics

---

## Akseptansekriterier

### 1. Signal Persistence (KLA-PROFIT2-1)

**Database:** `ai_decision_log`

- [ ] Signals lagres korrekt med `ensemble = true`
- [ ] `symbol`, `decision_type`, `sentiment_score` er populett
- [ ] `analysis_data` inneholder scores, indicators, sizing
- [ ] `executed_at` timestamp er korrekt
- [ ] Minst 10 signals lagret første 24 timer
- [ ] Ingen duplikate signals (unik på symbol + executed_at)

**Verifisering:**
```sql
SELECT 
  symbol,
  decision_type,
  sentiment_score,
  analysis_data->>'ensemble' as ensemble,
  executed_at
FROM ai_decision_log
WHERE analysis_data->>'ensemble' = 'true'
ORDER BY executed_at DESC
LIMIT 10;
```

### 2. Kelly Criterion Validering (KLA-PROFIT2-2)

- [ ] Kelly % beregnes korrekt (0-5% range)
- [ ] `maxRiskPct` er innenfor toleranse
- [ ] Backtest viser konsistent Kelly-verdier
- [ ] Ingen negative Kelly-verdier

**Verifisering:**
```sql
SELECT 
  symbol,
  sentiment_score,
  analysis_data->'sizing'->>'kellyPct' as kelly,
  analysis_data->'sizing'->>'maxRiskPct' as max_risk
FROM ai_decision_log
WHERE analysis_data->>'ensemble' = 'true'
LIMIT 5;
```

### 3. Paper-Trade Integration (KLA-PROFIT2-3)

- [ ] Ensemble signals trigget paper-trade (hvis enabled)
- [ ] Ingen feil i paper-trade execution
- [ ] Korrekt posisjonsstørrelse basert på Kelly
- [ ] Logging av paper-trade decisions

**Sjekk:** `/admin/paper-trading` dashboard

### 4. Sentry Error Tracking (KLA-PROFIT2-4)

**Periode:** 48 timer etter merge

- [ ] Ingen 500-errors på `/api/ai/ensemble`
- [ ] Ingen 500-errors på `/api/cron/ai-engine`
- [ ] Ingen hydration errors på `/dashboard/metrics`
- [ ] < 10 warnings per time

**URL:** https://klarpakke.sentry.io

### 5. Performance Metrics (KLA-PROFIT2-5)

- [ ] API response time < 500ms (p95)
- [ ] Dashboard load time < 3s
- [ ] Edge Function cold start < 2s
- [ ] Cron completion < 5 minutter

**Verifisering:**
- Vercel Analytics
- Supabase Dashboard
- Edge Function logs

### 6. Edge Function Health (KLA-PROFIT2-6)

- [ ] `ensemble-signals` Edge Function svarer 200
- [ ] CORS headers korrekte
- [ ] Response time < 500ms
- [ ] Ingen 500/502/503 errors

**Test:**
```bash
curl -s "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/ensemble-signals?limit=5" \
  -H "Authorization: Bearer $ANON_KEY" | jq
```

---

## Daglig Sjekkliste

### Dag 1 (0-24 timer)

- [ ] 09:00: Sjekk Sentry for nattlige errors
- [ ] 12:00: Verifiser signal count i database
- [ ] 15:00: Sjekk dashboard performance
- [ ] 18:00: Verifiser Edge Function health
- [ ] 21:00: Sjekk cron job status

### Dag 2 (24-48 timer)

- [ ] 09:00: Sjekk Sentry for nattlige errors
- [ ] 12:00: Verifiser signal count (bør være >10)
- [ ] 15:00: Sjekk Kelly Criterion konsistens
- [ ] 18:00: Verifiser paper-trade integrasjon
- [ ] 21:00: Final review og lukking

---

## Escalation

**Kritisk (umiddelbar aksjon):**
- 500-errors på `/api/ai/ensemble`
- Dashboard krasj
- Database connection errors

**Høy (innen 2 timer):**
- > 50 errors per time i Sentry
- Edge Function down
- Cron job feiler

**Medium (innen 24 timer):**
- Performance degradation
- Warning spam i Sentry
- Minor UI issues

---

## Rapport Template

**Sluttrapport (etter 48 timer):**

```markdown
## KLA-PROFIT2: 48h Rapport

### Signal Stats
- Total signals: X
- Signals per symbol: BTC (X), ETH (X), SOL (X)
- Avg confidence: X%
- Kelly range: X% - X%

### Error Stats
- Sentry errors: X
- API 500s: X
- Edge Function errors: X

### Performance
- API p95: Xms
- Dashboard load: Xs
- Edge Function p95: Xms

### Anbefaling
- [ ] GO for økning til 10 symbols
- [ ] GO for live trading integration
- [ ] Trenger mer tuning (se KLA-PROFIT3)

**Signert:** Platform Lead + Trading Lead
```

---

## Relaterte Issues

- KLA-PROFIT1: ✅ Merged
- KLA-PROFIT3: Live Trading Integration (Backlog)
- KLA-PROFIT4: A/B Test Ensemble vs TA-only (Backlog)

---

## Kontakt

- Slack: #profit-first-initiative
- On-call: @platform-oncall
- Dashboard: https://www.klarpakke.no/no/dashboard/metrics
