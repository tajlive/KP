# V3.0.1 P0 Hardening Plan – Safe-by-Default Trading Pipeline

**Dato:** 2026-04-06  
**Status:** ✅ Klar for staging deploy  
**Version:** 3.0.1-p0  
**Endringer:** Kill-switch, strammere gates, eksplisitte health thresholds

---

## 1. Safe-by-Default Policy

### 1.1 Kjerne Prinsipper

| Prinsipp | Beskrivelse | Konsekvens |
|----------|-------------|------------|
| **Fail-Closed** | Hvis systemet er usikkert, stopp handel | Bruker kan ikke trade før systemet er trygt |
| **Audit-or-Block** | Hvis audit trail ikke kan opprettes, avvis trade | Ingen usporbare trades |
| **Kill-Switch** | Automatisk trading-stopp ved systemisk feil | Ingen trades under ustabilitet |
| **Idempotent** | Samme request = samme resultat, alltid | Ingen duplikate trades |
| **Deterministic** | Samme input = samme output, alltid | Gjenskapelige beslutninger |

### 1.2 Fail-Closed Triggere

```typescript
Trade AVVISES automatisk hvis:
✗ Risk state ikke kan leses (Redis + DB nede)
✗ Risk state er korrupt (negativ equity, NaN)
✗ Audit write feiler (og AUDIT_FAIL_BLOCK=true)
✗ Duplicate idempotency key
✗ Risk limits overskredet
✗ User i cooldown periode
✗ **Kill-switch aktivert (NY)**
✗ **Outbox failed > 0 (NY)**
✗ **Outbox pending > 100 i >5 min (NY)**
✗ **Health 503 (NY)**
```

### 1.3 Kill-Switch Mekanisme

```typescript
// Automatisk aktivering:
if (outbox.failed > 0) -> KILL-SWITCH ON
if (outbox.pending > 100 for > 5 min) -> KILL-SWITCH ON
if (health check throws exception) -> KILL-SWITCH ON

// Respons:
{
  success: false,
  rejectionReason: "KILL_SWITCH_ACTIVE",
  error: "KILL-SWITCH ACTIVE: Outbox has 3 failed items (blocked 42 trades)"
}

// Reset: Krever admin manuelt
POST /api/admin/kill-switch/reset (admin/risk_manager only)
```

### 1.4 Health Thresholds (Eksplisitte)

```typescript
export const HEALTH_THRESHOLDS = {
  latency: {
    warning: 500,     // > 500ms = degraded
    critical: 2000,   // > 2000ms = unhealthy
  },
  outbox: {
    pendingWarning: 50,       // > 50 = degraded
    pendingCritical: 100,     // > 100 = unhealthy
    failedCritical: 1,        // > 0 = unhealthy (NO failed allowed)
    interventionCritical: 1,  // > 0 = unhealthy
  },
  services: {
    minHealthy: 4, // Krever 4 av 5 services (80%)
  }
};
```

### 1.5 Health Status Mapping

| Status | Kriterier | Trading | HTTP |
|--------|-----------|---------|------|
| **healthy** | All checks OK, ingen warnings | ✅ Tillatt | 200 |
| **degraded** | 1+ warnings, men >minHealthy services | ✅ Tillatt | 503 |
| **unhealthy** | <minHealthy services ELLER kill-switch ELLER any failed items | ❌ **BLOKKERT** | 503 |

### 1.6 Degraded Mode (Strammet inn)

```typescript
// GAMMEL: Trade tillates med warning
// NY: Trade BLOKKERES hvis:
if (outbox.failed > 0) -> BLOCK
if (outbox.pending > 100 for > 5 min) -> BLOCK
if (health status === 'unhealthy') -> BLOCK

// Kun faktiske partial writes (Redis OK / DB fail) tillates
// med outbox retry - men trades blokkeres hvis outbox vokser
```

---

## 2. Transaction Envelope (Utvidet)

```typescript
interface TradeEnvelope {
  tradeId: string;
  idempotencyKey: string;
  decisionHash: string;
  riskVersion: string;
  policyVersion: string;
  auditStatus: 'pending' | 'confirmed' | 'failed' | 'degraded';
  persistenceStatus: 'pending' | 'redis_ok' | 'db_ok' | 'dual_ok' | 'failed';
  createdAt: Date;
  degradedMode?: boolean;
  degradationReason?: string;
  
  // NYE FELT:
  killSwitchStatus?: {
    activated: boolean;
    reason?: string;
  };
  systemHealth?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    failedServices: string[];
  };
}
```

---

## 3. Partial Write Recovery

### 3.1 Scenarios

| Scenario | Redis | Supabase | S3 | Kill-Switch | Handling |
|----------|-------|----------|-----|-------------|----------|
| Normal | ✅ | ✅ | ✅ | OFF | Ingen action |
| S3 fail | ✅ | ✅ | ❌ | OFF | Outbox: S3 retry |
| DB fail | ✅ | ❌ | N/A | OFF | Outbox: Redis→DB |
| Redis fail | ❌ | ✅ | ✅ | OFF | Degraded, DB = source |
| **Failed items** | N/A | N/A | N/A | **ON** | **TRADING STOP** |
| **Backlog >100** | N/A | N/A | N/A | **ON** | **TRADING STOP** |
| Total fail | ❌ | ❌ | N/A | ON | **BLOCK TRADE** |

---

## 4. Release Gate (12 Gates – Alle Blokkerende)

```bash
./scripts/release-gate-staging.sh
```

| Gate | Sjekk | Blokkerende | Kommando |
|------|-------|-------------|----------|
| 1 | Database migrasjoner | ✅ | `supabase db push` |
| 2 | Type check & lint | ✅ | `npm run type-check && npm run lint` |
| 3 | Unit tester (40+) | ✅ | `npm run test:unit -- p0-*.test.ts` |
| 4 | Integrasjonstester | ✅ | `npm run test:integration:v3` |
| 5 | Deploy til staging | ✅ | `vercel --env staging` |
| 6 | Health check | ✅ | `curl /api/trading/v3/health` |
| 7 | Smoke tester | ✅ | `npm run test:smoke:staging` |
| 8 | Risk system verify | ✅ | `curl /api/trading/v3/risk/check` |
| **9** | **Audit integrity** | **✅ NY** | `npm run verify:audit:integrity` |
| 10 | Outbox status | ✅ | `curl /api/trading/v3/outbox/stats` |
| 11 | Load test (1000/min) | ✅ | `npm run test:load:v3` |
| **12** | **Rollback test** | **✅ NY** | `npm run test:rollback:staging` |

### 4.1 Gate 9: Audit Integrity (BLOCKING)

```bash
# Sjekker:
- Orphaned trades (uten audit log)
- Dangling audits (uten trade)
- SHA-256 hash integrity

# Feil -> DEPLOY BLOCKED
```

### 4.2 Gate 12: Rollback Test (BLOCKING)

```bash
# Sjekker:
- Rollback endpoint accessible
- Database rollback fungerer
- Config rollback fungerer
- Health OK etter rollback

# Feil -> DEPLOY BLOCKED
```

### 4.3 Production Gate (12 Gates – Alle Blokkerende)

```bash
./scripts/release-gate-production.sh
```

| Gate | Sjekk | Blokkerende | Kriterier |
|------|-------|-------------|-----------|
| 1 | Database migrasjon | ✅ | prod DB connect OK |
| 2 | Type check & lint | ✅ | zero warnings |
| 3 | Unit tester | ✅ | 40+ pass |
| 4 | Integrasjonstester | ✅ | all pass |
| 5 | Deploy til prod | ✅ | `vercel --prod` |
| 6 | Health check | ✅ | HTTP 200 |
| 7 | **V3 Health JSON** | ✅ | `status=healthy`, `tradingEnabled=true`, `killSwitch.activated=false` |
| 8 | Smoke tester | ✅ | `npm run test:smoke:prod` |
| 9 | Audit integrity (BLOCKING) | ✅ | 0 orphaned trades |
| 10 | Outbox status (BLOCKING) | ✅ | `failed=0`, `pending<50`, `requiringIntervention=0` |
| 11 | Load test (MANDATORY) | ✅ | 1000 orders/min OK |
| 12 | Rollback readiness (BLOCKING) | ✅ | endpoint OK, test pass |

**V3 Health JSON validering (Gate 7):**
```bash
curl https://www.klarpakke.no/api/trading/v3/health | jq '{
  status: .status,
  tradingEnabled: .tradingEnabled,
  killSwitch: .killSwitch.activated,
  outboxFailed: .checks.outbox.failed
}'
```

**Påkrevde verdier:**
- `status` = `"healthy"`
- `tradingEnabled` = `true`
- `killSwitch.activated` = `false`
- `checks.outbox.failed` = `0`

**Exit codes:** 0 = GO (live), 1 = NO-GO (trigger rollback)

---

## 5. Outbox Monitor & Kill-Switch

### 5.1 Konfigurasjon (Env)

```bash
# .env.local
OUTBOX_MAX_FAILED=0                    # 0 = NO failed items allowed
OUTBOX_PENDING_WARNING=50              # Advarsel ved 50
OUTBOX_PENDING_CRITICAL=100            # Stopp ved 100
OUTBOX_PENDING_DURATION_MS=300000      # 5 min over critical
```

### 5.2 API

```typescript
// Check health (auto-kjøres før hver trade)
const health = await checkOutboxHealth(supabase);
// Returns: { activated, reason, tradesBlocked }

// Check if trading allowed
const { allowed, reason } = await isTradingAllowed(supabase);

// Get status
const status = getKillSwitchStatus();

// Reset (admin only)
await resetKillSwitch(supabase, adminUserId, reason);
```

### 5.3 Alarmer

| Trigger | Severity | Handling |
|---------|----------|----------|
| Kill-switch aktivert | CRITICAL | PagerDuty + Slack |
| Pending > 100 | WARNING | Slack |
| Failed > 0 | CRITICAL | PagerDuty + Slack |
| Manual intervention required | CRITICAL | PagerDuty |

---

## 6. Files Endret

### 6.1 Nye Files

```
src/lib/trading/core/outbox-monitor.ts             # Kill-switch logikk
src/lib/trading/__tests__/p0-kill-switch.test.ts   # Kill-switch tester
scripts/release-gate-production.sh                 # PROD release gate
```

### 6.2 Endrede Files

```
scripts/release-gate-staging.sh                    # Gate 9 & 12 blokkerende
src/lib/trading/core/execute-trade-safe.ts         # Kill-switch integrasjon
src/app/api/trading/v3/health/route.ts             # Eksplisitte thresholds
docs/trading/V3-0-P0-HARDENING-PLAN.md             # Denne filen
```

---

## 7. Testing

### 7.1 Kill-Switch Tester

```bash
npm run test:unit -- src/lib/trading/__tests__/p0-kill-switch.test.ts
```

**Dekning:**
- Health 503 blokkerer trades
- Outbox backlog blokkerer trades  
- Failed items blokkerer trades
- Admin reset fungerer
- Safe-by-default på exceptions

### 7.2 Gate Tester

```bash
# Audit integrity
curl -X POST https://staging.klarpakke.no/api/trading/v3/health \
  -d '{"component":"audit-integrity"}'

# Rollback test
npm run test:rollback:staging
```

### 7.3 Full Gate

```bash
./scripts/release-gate-staging.sh
```

---

## 8. Deploy Instruksjoner

### 8.1 Staging

```bash
# 1. Database migrasjon
supabase db push --env staging

# 2. Kjør release gate (alle 12 gates MÅ passere)
./scripts/release-gate-staging.sh

# 3. Verifiser health
curl https://staging.klarpakke.no/api/trading/v3/health
# Forventet: {"status":"healthy","tradingEnabled":true}

# 4. Test kill-switch (manuell)
# Simuler outbox feil -> verifiser at trades blokkeres

# 5. Verifiser envelope inneholder killSwitchStatus
```

### 8.2 Production

**Forutsetning:** 24h stabil drift i staging

```bash
# 1. Verifiser staging fortsatt healthy
curl https://staging.klarpakke.no/api/trading/v3/health | jq '.status'

# 2. Kjør PRODUCTION release gate (STRIKT - alle må passere)
./scripts/release-gate-production.sh

# 3. Ved GO: produksjon er live
# 4. Ved NO-GO: automatisk rollback
npm run rollback:prod
```

**Post-deploy verifisering:**
```bash
# Verifiser V3 health JSON
watch -n 30 'curl -s https://www.klarpakke.no/api/trading/v3/health | jq "{\n  status: .status, \n  trading: .tradingEnabled, \n  killSwitch: .killSwitch.activated, \n  outboxFailed: .checks.outbox.failed\n}"'
```

---

## 9. Suksesskriterier (Oppdatert)

| Kriterie | Status |
|----------|--------|
| Risk Kernel blokkerer 100% av violations | ✅ Kode klar |
| State persistence dual-write | ✅ Implementert |
| Audit logs immutable | ✅ SHA-256 hash |
| Partial write recovery | ✅ Outbox pattern |
| Idempotency garanti | ✅ SHA-256 keys |
| **Kill-switch aktivert ved systemisk feil** | ✅ **Implementert** |
| **Gate 9 & 12 blokkerende** | ✅ **Implementert** |
| **Eksplisitte health thresholds** | ✅ **Implementert** |
| 40+ P0-tester passerer | ✅ Implementert |
| Release gate 12/12 | ⬜ Venter på staging |
| 24h stabil staging | ⬜ Post-deploy |

---

## 10. Endringslogg

| Versjon | Dato | Endringer |
|---------|------|-----------|
| 3.0.1-p0 | 2026-04-06 | Initial P0 hardening |
| 3.0.1-p1 | 2026-04-06 | Kill-switch, strammere gates, eksplisitte thresholds |

---

**Godkjent for implementering:**
- [x] Senior Architect (Delivery Owner)
- [ ] CTO
- [ ] Head of Risk

**Implementeringsdato:** 2026-04-06
