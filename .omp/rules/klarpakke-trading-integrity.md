---
description: Live/paper trading, trades, sessions, Binance, tier, RLS, and history integrity rule.
globs:
  - src/lib/trading/**/*
  - src/lib/trading-api.ts
  - src/app/api/trading/**/*
  - src/app/api/paper-trading/**/*
  - src/app/api/trading-cockpit/**/*
  - src/app/api/cron/tick/**/*
  - src/features/trading-cockpit/**/*
  - src/components/trading/**/*
  - src/components/paper-trading/**/*
  - src/app/**/handelshistorikk/**/*
  - supabase/migrations/**/*.sql
alwaysApply: true
---

# Klarpakke Trading Integrity Rule

When work touches live/paper trading, trades, sessions, Binance, tier gates, RLS, trade history, Trading Cockpit data, or cron trading heartbeat:

1. Maintain full context and map the data path before edits.
2. Do not put service-role credentials in client code.
3. Do not disable or weaken RLS as a shortcut.
4. Keep migrations under `supabase/migrations/` for DB changes.
5. Verify with focused tests/checks and update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` when verification is performed.
6. Prefer OMP agents `klarpakke-live-trading-integrity`, `klarpakke-trading-realtime-market-data`, `klarpakke-db-rls-guard`, and `klarpakke-cockpit-qa`.
