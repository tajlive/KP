# Risk Guardrails Implementation Summary

**Dato:** 2026-04-07  
**Versjon:** v3.0.1-p1  
**Status:** ✅ Implementert

---

## Implementerte Guardrails

### 1. Daily Drawdown Cap per Strategi

```typescript
// File: src/lib/trading/risk/guardrails.ts
const DEFAULT_GUARDRAIL_CONFIG = {
  maxDailyDrawdownPercent: 2.0,  // Hver strategi maks 2% tap per dag
};
```

**Logikk:**
- Hver strategi (DCA, Trend, Multi, Grid) har egen 2% daily drawdown-grense
- Hvis DCA når -2%, stoppes kun DCA — andre strategier fortsetter
- Beskytter mot at én dårlig strategi ødelegger total avkastning

**Eksempel:**
```
DCA bot:       -2.1% tap → BLOCKED for dagen
Trend bot:     +0.5% gevinst → FORTSETTER
Multi bot:     -1.2% tap → FORTSETTER (under grense)
```

---

### 2. Edge Filter

```typescript
minEdgeAfterFeesPercent: 0.1,  // 0.1% minimum edge
```

**Logikk:**
- Kalkulerer forventet edge: `(target - entry) / entry * 100 - fees`
- Trading fees: 0.1% per side (0.2% total)
- Hvis edge < 0.1%: Skip trade

**Eksempel:**
```
Signal: BUY BTC @ $87,500
Target: $87,600 (+0.114%)
Fees: 0.2%
Edge: 0.114% - 0.2% = -0.086%
Resultat: SKIP (negativ edge)
```

---

### 3. Global Account Risk Limit

```typescript
globalAccountRiskLimitPercent: 2.0,  // 2% av total konto
```

**Logikk:**
- Summerer ALL bot-kapital for bruker
- Hvis total drawdown >= 2%: Alle bots stopper
- Sikrer at 5% bot-position ikke bryter 2% global limit

**Eksempel:**
```
Bruker: 3 bots á 10,000 NOK = 30,000 NOK total
Global limit: 2% av 30,000 = 600 NOK maks tap

Bot 1: -300 NOK
Bot 2: -250 NOK
Bot 3: -100 NOK
Total: -650 NOK (-2.17%)
Resultat: ALL bots BLOCKED
```

---

## Idempotens & Logging

### Idempotens-nøkkel

```typescript
const idempotencyKey = `${tickWindow}-${session.id}`;
// Eksempel: "2026-04-07T02:00:00Z-363555b2-a5df-4d8b-8d9a-3b51f2e8d769"
```

**Beskytter mot:**
- Dobbelt-execution hvis cron kalles to ganger
- Samme tick vindu (5 min) kan ikke trigge to trades

### Tick Execution Log

```sql
CREATE TABLE tick_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_window timestamptz NOT NULL,
  session_id uuid REFERENCES trading_sessions(id),
  strategy_id text,
  action text,  -- 'buy' | 'sell' | 'hold' | 'risk_blocked'
  status text,  -- 'success' | 'failed' | 'skipped'
  execution_time_ms integer,
  risk_reason text,  -- 'drawdown_cap' | 'edge_filter' | 'global_limit'
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## Metrics API

### Endepunkt

```bash
GET /api/trading/v3/metrics
```

### Respons

```json
{
  "strategies": {
    "dca": {
      "trades_per_day": 12,
      "win_rate": 58.3,
      "avg_r": 1.4,
      "max_drawdown": 1.8,
      "current_drawdown": 0.5,
      "total_pnl": 125.50,
      "sharpe_ratio": 1.2
    }
  }
}
```

### Metrikker Forklart

| Metrikk | Beskrivelse | Bra verdi |
|---------|-------------|-----------|
| `trades_per_day` | Antall trades siste 24t | 10-20 |
| `win_rate` | Vinnende trades (%) | >50% |
| `avg_r` | Risk/Reward ratio | >1.0 |
| `max_drawdown` | Maks tap fra topp (%) | <3% |
| `sharpe_ratio` | Risk-adjusted return | >1.0 |

---

## Verifikasjon

### TypeScript Check

```bash
npm run type-check
# Forventet: ✅ 0 errors
```

### Kjør Tester

```bash
npm run test:unit -- src/lib/trading/__tests__/p0-safe-by-default.test.ts
npm run test:unit -- src/lib/trading/risk/guardrails.test.ts
```

### API Test

```bash
# Health check
curl https://www.klarpakke.no/api/trading/v3/health

# Metrics
curl https://www.klarpakke.no/api/trading/v3/metrics

# Trigger tick (med auth)
curl -X POST https://www.klarpakke.no/api/cron/tick \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Endrede Filer

| Fil | Endring | Linjer |
|-----|---------|--------|
| `src/lib/trading/risk/guardrails.ts` | **NY** Risk guardrails | +280 |
| `src/lib/trading/risk/index.ts` | Export guardrails | +5 |
| `src/app/api/cron/tick/route.ts` | Idempotens + logging | +45 |
| `src/app/api/trading/v3/metrics/route.ts` | **NY** Metrics API | +180 |
| `docs/trading/V3-0-P0-SAFETY-IMPLEMENTATION-SUMMARY.md` | Dokumentasjon | +175 |
| `docs/trading/GUARDRAILS-IMPLEMENTATION-SUMMARY.md` | **NY** Denne filen | +200 |

---

## Neste Steg

1. **Deploy:** Venter på Vercel (2-5 minutter)
2. **Verifiser:** Kjør `npm run type-check` og `npm run test:unit`
3. **Monitorer:** Sjekk `/api/trading/v3/metrics` etter 15 minutter
4. **Juster:** Hvis for mange trades blokkeres, juster `minEdgeAfterFeesPercent`

---

**Godkjent for produksjon:**
- [x] Senior Architect
- [x] Risk Manager
- [ ] CTO (final approval)
