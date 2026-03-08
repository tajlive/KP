# Klarpakke Operational Runbook (Production)

This document provides procedures for maintaining and troubleshooting the Klarpakke trading engine.

## 🚨 Incident Response (P0/P1)

### Bot Execution Failure (Crash)

**Symptoms:** No trades in logs for > 15 mins, "Heartbeat stale" alerts.

1. Check Railway/Fly.io logs for `persistent-worker.ts`.
2. Verify Binance API connectivity (`ping binance.com`).
3. Check Supabase RLS logs for `Permission Denied` errors.
4. **Action:** Restart worker: `railway restart`.

### Runaway Trading / Buggy Execution

**Symptoms:** High frequency of small losses, unexpected large positions.

1. **Emergency Stop:** Run `supabase migration repair` or manually set `status = 'PAUSED'` for all sessions in `auto_trading_sessions`.
2. Check `binance-executor.ts` for logic changes in the last deployment.
3. Review "Circuit Breaker" logs in Axiom to see why it didn't trigger.

## 🔐 Security Procedures

### Rotating Binance API Keys

1. Generate new keys in Binance Dashboard (Enable Futures/Spot, Restrict IP).
2. Update Supabase Vault secrets via CLI or Dashboard.
3. Re-link user profile connections.

### Emergency Killswitch

We have implemented a global "Maintenance Mode" flag in `system_config`. Setting `trading_enabled = false` kills all execution immediately in `binance-executor.ts`.

## 📈 Monitoring & Health

### Key Metrics to Watch

- **Execution Lag:** Time between signal and Binance fill (Target: < 500ms).
- **Fill Rate:** Percentage of signals that result in filled orders (Target: > 95%).
- **Risk Block Rate:** Signals blocked by ML Risk or Circuit Breakers (Target: < 5%).

### Dashboards

- **Axiom:** `https://axiom.co/klarpakke/dashboard` (Structured logs)
- **Supabase:** Database health and RLS audit logs.
