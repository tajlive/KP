# Health Monitoring & Alerting for Klarpakke

## Arkitektur

```
┌─────────────────────┐     ┌──────────────────────────────┐
│  /api/health        │     │  /api/health/metrics         │
│  (full infrastruktur)│     │  (trading-subsystem health)  │
│  DB, KV, Binance,   │     │  activeSessions, recentTrades│
│  tradingSignals,    │     │  totalPnl24h, errorRate5min  │
│  hangingSessions...)│     │  30s in-memory cache         │
└─────────────────────┘     └──────────┬───────────────────┘
                                       │
                               ┌───────▼────────┐
                               │ getHealthMetrics│
                               │ (4 parallel     │
                               │  timed queries) │
                               └───────┬────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        ▼              ▼              ▼
                 activeSessions  recentTrades    totalPnl24h
                 errorRate5min   (alle via Supabase)
```

```
┌──────────────────┐     ┌───────────────────┐
│ session-invariants│────▶│  checkAndSendAlerts│────▶ Resend → admin
│ (detectViolations)│     │  + RateLimiter    │      (tomarnejensen@gmail.com)
└──────────────────┘     │  1/type/time      │
                         └───────────────────┘
```

## Filer opprettet 2026-07-28

### Health Metrics

| Fil | Type | Beskrivelse |
|-----|------|-------------|
| `src/lib/trading/health-metrics.ts` | Lib (238 linjer) | `getHealthMetrics()` — 4 parallelle queries, 5s timeout per query, 30s in-memory cache |
| `src/app/api/health/metrics/route.ts` | Route (37 linjer) | GET → kaller getHealthMetrics(), deriverer status |

**timedQuery() pattern:**
```typescript
async function timedQuery<T>(
  label: string,
  fn: (supabase: SB, signal: AbortSignal) => Promise<T>,
): Promise<{ data: T | null; latencyMs: number; ok: boolean }> {
  const supabase = createClient();
  const t0 = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const data = await fn(supabase, controller.signal);
    return { data, latencyMs: Math.round(performance.now() - t0), ok: true };
  } catch {
    return { data: null, latencyMs: Math.round(performance.now() - t0), ok: false };
  } finally { clearTimeout(timeout); }
}
```

### Alerting

| Fil | Type | Beskrivelse |
|-----|------|-------------|
| `src/lib/trading/alerting.ts` | Lib (238 linjer) | sendAlert(), RateLimiter, checkAndSendAlerts(), sendDeployFailureAlert() |

**RateLimiter key properties:**
- Default window: 60 minutes
- Max per type: 1 per window
- Storage: in-memory Map<string, number[]>
- Pruning: automatic on every canSend()/record() call
- Singleton: `alertRateLimiter` (module-scope)

## CI/CD Promotion Pipeline (2026-07-28)

Workflow: `.github/workflows/deploy-production.yml` — restrukturert til 4-jobs promotion pipeline:

```
build-and-test ──▶ deploy-staging ──▶ smoke-test-staging ──▶ deploy (production)
     │                    │                    │                    │
  npm ci + build      wrangler deploy     curl staging         wrangler deploy
  + lint gate         --env staging       3× retry             --minify
```

**Key decisions:**
- `cancel-in-progress: false` på staging concurrency — samme regel som production (aldri avbryt)
- Smoke test bruker `jq -r '.status'` på health endpoint — sjekker `"healthy"` eksplisitt
- 3 forsøk med 10s mellom — staging trenger cold-start tid
- Hvis staging smoke feiler → production deploy KANSLERES (exit 1)
- Lint gate har `continue-on-error: true` — warnings stopper ikke pipeline

**Integrasjon med eksisterende workflow:**
- `deploy-production.yml` triggers på push til `main`
- `deploy-staging.yml` forblir uendret (trigger på push til `staging`)
- Eksisterende `health-monitor.yml` forblir (kronisk sjekk hvert 15. min)
- `pre-merge-gates.yml` forblir (PR gates mot staging)
