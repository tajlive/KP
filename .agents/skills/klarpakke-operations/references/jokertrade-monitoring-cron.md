# JokerTrade 30-min helsemonitor (Hermes cron)

Oppskrift på å overvåke JokerTrade med en Hermes-cron som kjører hver 30. minutt.

## Hva som sjekkes

1. Antall aktive paper-sesjoner.
2. Antall sesjoner med `smart_trader_enabled = true`.
3. Inflerte kapitaler (`current_capital_nok > 200000 OR < 0`).
4. Symbol-mismatch (`open_position->>'symbol' != trading_pair`).
5. Drawdown >20 % (`current_capital_nok < starting_capital_nok * 0.8`).
6. Ugyldige handler siste time (`quantity <= 0 OR price <= 0 OR total_value <= 0`).
7. Siste oppføringer i `public.jokertrade_guard_log`.
8. `smart-trader-v3` Edge Function kjøres manuelt og rapporterer `processed` / `errors` / `duration_ms`.
9. `cron.job`-status for `smart-trader-v3` og `jokertrade-health-guard`.

## SQL — samlet helsestatus

```sql
SELECT
  COUNT(*) FILTER (WHERE mode = 'paper' AND status = 'active') AS active_paper,
  COUNT(*) FILTER (WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true) AS enabled,
  COUNT(*) FILTER (WHERE mode = 'paper' AND status = 'active' AND (current_capital_nok > 200000 OR current_capital_nok < 0)) AS inflated,
  COUNT(*) FILTER (WHERE mode = 'paper' AND status = 'active' AND open_position IS NOT NULL AND open_position->>'symbol' != trading_pair) AS symbol_mismatch,
  COUNT(*) FILTER (WHERE mode = 'paper' AND status = 'active' AND starting_capital_nok > 0 AND current_capital_nok < starting_capital_nok * 0.8) AS drawdown_20pct,
  (SELECT COUNT(*) FROM trades WHERE created_at > NOW() - INTERVAL '1 hour' AND (quantity <= 0 OR price <= 0 OR total_value <= 0)) AS invalid_trades_last_hour
FROM trading_sessions;
```

## Edge Function-test

```bash
curl -s -X POST \
  https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/smart-trader-v3 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <CRON_SECRET>' \
  -d '{"cron":true,"mode":"paper"}'
```

## Hermes cron-oppsett

```bash
hermes cron create "*/30 * * * *" \
  --name "JokerTrade 30-min health monitor" \
  --prompt "Run JokerTrade health checks and report." \
  --deliver origin
```

Eller opprett LLM-drevet cron som bruker `mcp__supabase__execute_sql` + `terminal` for curl.

## Når du skal gripe inn

| Funn | Handling |
|---|---|
| `inflated > 0` | Kjør `SELECT public.jokertrade_emergency_stop('inflated capital detected');` |
| `symbol_mismatch > 0` | Stop og fiks `open_position->>symbol` |
| `invalid_trades_last_hour >= 3` | Guard vil auto-killswitche; verifiser |
| Edge function errors > 0 | Sjekk Supabase Functions-logger |
| `cron.job` inaktiv | Reaktiver via `SELECT cron.unschedule(...) / cron.schedule(...)` |
