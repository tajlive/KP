# Bulk Pilot-Onboarding — SQL-oppskrift (2026-08-02)

Toms direktiv: alle brukere med `paper_accounts` skal ha Pilot (grid-strategi), og all kapital skal være investert. Utført i prod 2026-08-02: 11 → 36 pilot-brukere, 112 → 361 aktive sesjoner, 0 duplikater, 0 desync.

## Steg 1: auto_trading_configs for alle kontoholdere

**Felle:** `auto_trading_configs` har INGEN unique constraint på `user_id` → `ON CONFLICT (user_id)` kaster `42P10`. Bruk `WHERE NOT EXISTS`:

```sql
INSERT INTO auto_trading_configs (user_id, is_enabled, strategy, config)
SELECT pa.user_id, true, 'grid', '{"type":"pilot"}'::jsonb
FROM paper_accounts pa
WHERE NOT EXISTS (
  SELECT 1 FROM auto_trading_configs atc WHERE atc.user_id = pa.user_id
)
RETURNING user_id;
```

## Steg 2: 10 grid-sesjoner per bruker

**Felle:** Kolonnen heter IKKE `initial_capital_nok` — den finnes ikke. Korrekte kolonner: `initial_capital`, `current_capital`, `starting_capital_nok`, `current_capital_nok`. Alle fire MÅ settes ved manuell INSERT.

```sql
INSERT INTO trading_sessions (
  user_id, mode, status, trading_pair,
  starting_capital_nok, current_capital_nok,
  initial_capital, current_capital,
  strategy_config, strategy_id
)
SELECT
  pa.user_id, 'paper', 'active', sym.pair,
  ROUND(pa.current_balance/10), ROUND(pa.current_balance/10),
  ROUND(pa.current_balance/10), ROUND(pa.current_balance/10),
  '{"type":"grid"}'::jsonb, 'grid'
FROM paper_accounts pa
CROSS JOIN (VALUES
  ('BTCUSDT'),('ETHUSDT'),('SOLUSDT'),('AVAXUSDT'),('DOGEUSDT'),
  ('LINKUSDT'),('ADAUSDT'),('DOTUSDT'),('UNIUSDT'),('POLUSDT')
) AS sym(pair)
WHERE NOT EXISTS (
  SELECT 1 FROM trading_sessions ts
  WHERE ts.user_id = pa.user_id AND ts.trading_pair = sym.pair
    AND ts.mode = 'paper' AND ts.status = 'active'
)
RETURNING user_id, trading_pair;
```

`WHERE NOT EXISTS` gjør INSERTen idempotent OG unngår brudd på `idx_one_active_paper_session_per_pair` (unique partial index på (user_id, trading_pair) WHERE mode='paper' AND status='active').

## Steg 3: Resync grid-celle/posisjon-desync

**Desync =** `grid_levels[]` har celler med `status:"bought"` men sesjonens `open_position IS NULL`. Motoren kjøper aldri igjen (cella ser opptatt ut). Symptom: bruker 100% cash, 0 nye trades.

Diagnose:

```sql
SELECT u.email, ts.trading_pair,
  (SELECT COUNT(*) FROM jsonb_array_elements(ts.strategy_config->'grid_levels') gl
   WHERE gl->>'status'='bought') AS bought
FROM trading_sessions ts JOIN auth.users u ON u.id=ts.user_id
WHERE ts.mode='paper' AND ts.status='active'
  AND ts.open_position IS NULL
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(ts.strategy_config->'grid_levels') gl
              WHERE gl->>'status'='bought');
```

Resync (bought-celler uten posisjon → empty, fjern trade-felter):

```sql
UPDATE trading_sessions
SET strategy_config = jsonb_set(strategy_config, '{grid_levels}', (
  SELECT jsonb_agg(
    CASE WHEN gl->>'status' = 'bought'
         THEN (gl - 'boughtAt' - 'buyPrice' - 'sizeMultiplier') || '{"status":"empty"}'::jsonb
         ELSE gl END)
  FROM jsonb_array_elements(strategy_config->'grid_levels') gl
))
WHERE mode='paper' AND status='active'
  AND open_position IS NULL
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(strategy_config->'grid_levels') gl
              WHERE gl->>'status'='bought');
```

Verifiser: samme diagnose-spørring skal returnere 0 rader.

## Steg 4: Verifikasjon

```sql
-- Ingen duplikate aktive sesjoner per (user, pair) — skal være 0 rader:
SELECT user_id, trading_pair, COUNT(*) FROM trading_sessions
WHERE mode='paper' AND status='active'
GROUP BY user_id, trading_pair HAVING COUNT(*) > 1;

-- Alle sesjoner tickes av motoren (< 2 min gammel heartbeat):
SELECT COUNT(*) FROM trading_sessions
WHERE mode='paper' AND status='active'
  AND last_tick_at > NOW() - INTERVAL '2 minutes';

-- pg_cron kjører (MERK: job_run_details har IKKE jobname — JOIN på jobid):
SELECT j.jobname, d.status, d.start_time
FROM cron.job_run_details d JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname='klarpakke-trading-tick'
ORDER BY d.start_time DESC LIMIT 3;
```

## Etter onboarding

- Motoren (`/api/cron/tick` via pg_cron hvert minutt) plukker nye sesjoner automatisk — `ensureActiveSessions()` heartbeater alle.
- Nye sesjoner starter med `strategy_config = {"type":"grid"}` uten `grid_levels` → første tick kjører `calculateOptimalGrid` på nåværende pris (første-kjørings-regelen i Funn 3, fast grid-intervall).
- Forvent 0 umiddelbare trades hvis markedet er utenfor grid-intervallene — grid handler kun når pris treffer en celle. Det er normal oppførsel, ikke en feil.
