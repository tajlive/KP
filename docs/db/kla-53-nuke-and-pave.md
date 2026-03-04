# KLA-53: Nuke & Pave Runbook

## Overview
Denne runbooken beskriver hvordan du migrerer fra legacy trading-tabeller til canonical schema (001_core_schema.sql).

## Pre-requisites
- Supabase CLI installert
- Tilgang til Supabase Dashboard (https://supabase.com/dashboard)
- Database-administrator tilgang

## Step 1: Backup (KRITISK)

### 1.1 Full Database Backup
```bash
# Via Supabase CLI
supabase db dump -f backup_pre_kla53.sql

# Eller via Supabase Dashboard:
# Project Settings > Database > Backups > Create Backup
```

### 1.2 Export Critical Data (hvis du har aktive brukere)
```sql
-- Kjør i Supabase SQL Editor
\copy (SELECT * FROM auto_trading_sessions WHERE status = 'active') TO '/tmp/sessions_backup.csv' CSV HEADER;
\copy (SELECT * FROM auto_trading_trades) TO '/tmp/trades_backup.csv' CSV HEADER;
\copy (SELECT * FROM user_profiles) TO '/tmp/profiles_backup.csv' CSV HEADER;
```

## Step 2: Identifiser Legacy Tabeller

### 2.1 Sjekk hvilke tabeller som eksisterer
```sql
-- Liste alle trading-relaterte tabeller
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'paper_simulations', 'paper_trades', 'leaderboard_entries', 'saved_strategies',
  'auto_trading_sessions', 'auto_trading_trades', 'user_auto_trading_configs',
  'auto_trading_strategies', 'auto_trading_backtests', 'auto_trading_settings',
  'real_trading_configs', 'real_trades', 'exchange_credentials',
  'user_strategies', 'user_portfolios', 'grid_bot_state', 'onboarding_progress'
)
ORDER BY table_name;
```

## Step 3: Drop Legacy Tabeller (NUKE)

### 3.1 Disable Triggers først
```sql
-- Disable alle triggers på tabeller som skal droppes
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT tgname, relname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND relname IN (
      'paper_simulations', 'paper_trades', 'leaderboard_entries', 'saved_strategies',
      'auto_trading_sessions', 'auto_trading_trades', 'user_auto_trading_configs',
      'auto_trading_strategies', 'auto_trading_backtests', 'auto_trading_settings',
      'real_trading_configs', 'real_trades', 'exchange_credentials',
      'user_strategies', 'user_portfolios', 'grid_bot_state', 'onboarding_progress'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', trigger_rec.relname, trigger_rec.tgname);
    RAISE NOTICE 'Disabled trigger % on %', trigger_rec.tgname, trigger_rec.relname;
  END LOOP;
END $$;
```

### 3.2 Drop Legacy Tabeller
```sql
-- Kjør dette som EN transaksjon
BEGIN;

-- Paper trading (gammel)
DROP TABLE IF EXISTS paper_trades CASCADE;
DROP TABLE IF EXISTS paper_simulations CASCADE;
DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS saved_strategies CASCADE;

-- Auto trading (gammel)
DROP TABLE IF EXISTS auto_trading_trades CASCADE;
DROP TABLE IF EXISTS auto_trading_sessions CASCADE;
DROP TABLE IF EXISTS user_auto_trading_configs CASCADE;
DROP TABLE IF EXISTS auto_trading_strategies CASCADE;
DROP TABLE IF EXISTS auto_trading_backtests CASCADE;
DROP TABLE IF EXISTS auto_trading_settings CASCADE;

-- Real trading (gammel)
DROP TABLE IF EXISTS real_trades CASCADE;
DROP TABLE IF EXISTS real_trading_configs CASCADE;
DROP TABLE IF EXISTS exchange_credentials CASCADE;

-- 001_trading_system (gammel)
DROP TABLE IF EXISTS user_strategies CASCADE;
DROP TABLE IF EXISTS user_portfolios CASCADE;
DROP TABLE IF EXISTS grid_bot_state CASCADE;
DROP TABLE IF EXISTS onboarding_progress CASCADE;

COMMIT;
```

### 3.3 Verifiser at legacy tabeller er borte
```sql
-- Skal returnere 0 rader
SELECT COUNT(*) as remaining_legacy_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'paper_simulations', 'paper_trades', 'leaderboard_entries', 'saved_strategies',
  'auto_trading_sessions', 'auto_trading_trades', 'user_auto_trading_configs',
  'auto_trading_strategies', 'auto_trading_backtests', 'auto_trading_settings',
  'real_trading_configs', 'real_trades', 'exchange_credentials',
  'user_strategies', 'user_portfolios', 'grid_bot_state', 'onboarding_progress'
);
```

## Step 4: Drop eksisterende canonical tabeller (hvis de finnes med gammel struktur)

```sql
BEGIN;

-- Drop hvis de finnes fra tidligere forsøk
DROP TABLE IF EXISTS archived_trade_summaries CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS copy_trade_queue CASCADE;
DROP TABLE IF EXISTS copy_trading_follows CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS trading_sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS leaderboard CASCADE;

-- Drop types (hvis de ikke er i bruk)
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS trading_mode CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS trade_side CASCADE;
DROP TYPE IF EXISTS trade_status CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS trading_phase CASCADE;
DROP TYPE IF EXISTS risk_level CASCADE;

COMMIT;
```

## Step 5: Apply Canonical Schema (PAVE)

### 5.1 Kjør canonical migrasjon
```bash
# Via Supabase CLI
supabase db reset
supabase db push

# Eller kopier innholdet fra 001_core_schema.sql til Supabase SQL Editor
```

### 5.2 Verifiser at tabeller er opprettet
```sql
-- Skal returnere 6+ rader (avhengig av views)
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles',
  'trading_sessions', 
  'trades',
  'copy_trading_follows',
  'copy_trade_queue',
  'notification_queue'
)
ORDER BY table_name;
```

## Step 6: Verifiser RLS Policies

```sql
-- Sjekk at RLS er enabled på alle user-tabeller
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'trading_sessions', 'trades', 'copy_trading_follows');

-- Sjekk at policies finnes
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'trading_sessions', 'trades', 'copy_trading_follows')
ORDER BY tablename, policyname;
```

## Step 7: Verifiser Triggers

```sql
-- Sjekk at triggers er aktive
SELECT event_object_table, trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('trades', 'auth.users')
ORDER BY event_object_table, trigger_name;
```

## Step 8: Test med en ny bruker

### 8.1 Opprett test-bruker
```sql
-- Sign up via app eller kjør:
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (gen_random_uuid(), 'test@example.com', '{"name": "Test User"}'::jsonb)
RETURNING id;
```

### 8.2 Verifiser at profile ble opprettet
```sql
SELECT * FROM user_profiles WHERE email = 'test@example.com';
```

### 8.3 Opprett test session
```sql
-- Via API eller:
INSERT INTO trading_sessions (user_id, mode, strategy_id, trading_pair, current_capital, initial_capital)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'paper',
  'dca',
  'BTC/USDT',
  100000,
  100000
)
RETURNING id;
```

### 8.4 Opprett test trade
```sql
INSERT INTO trades (
  session_id, user_id, idempotency_key, mode, trading_pair, side, 
  quantity, price, total_value, fee, status, executed_at
)
VALUES (
  '<session_id_from_above>',
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'test-' || now(),
  'paper',
  'BTC/USDT',
  'buy',
  0.1,
  50000,
  5000,
  5,
  'filled',
  now()
)
RETURNING *;
```

### 8.5 Verifiser at session ble oppdatert
```sql
-- Sjekk at total_trades økte
SELECT total_trades, current_capital, total_pnl 
FROM trading_sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');
```

## Step 9: Verifiser Leaderboard

```sql
-- Manuell refresh
REFRESH MATERIALIZED VIEW leaderboard;

-- Sjekk at test-bruker dukker opp
SELECT * FROM leaderboard WHERE display_name = 'Test User';
```

## Step 10: Cleanup Test Data

```sql
-- Slett test data
DELETE FROM trades 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');

DELETE FROM trading_sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');

DELETE FROM user_profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'test@example.com');

DELETE FROM auth.users 
WHERE email = 'test@example.com';
```

## Verifikasjonsspørringer (Quick Check)

### Alt-i-ett verifisering
```sql
-- 1. Sjekk at ingen legacy tabeller finnes
SELECT 'Legacy tables check' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL: ' || string_agg(table_name, ', ')
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'paper_simulations', 'paper_trades', 'leaderboard_entries', 'saved_strategies',
  'auto_trading_sessions', 'auto_trading_trades', 'user_auto_trading_configs',
  'auto_trading_strategies', 'auto_trading_backtests', 'auto_trading_settings',
  'real_trading_configs', 'real_trades', 'exchange_credentials',
  'user_strategies', 'user_portfolios', 'grid_bot_state', 'onboarding_progress'
)

UNION ALL

-- 2. Sjekk at canonical tabeller finnes
SELECT 'Canonical tables check' as check_name,
  CASE 
    WHEN COUNT(*) = 6 THEN '✅ PASS'
    ELSE '❌ FAIL: Missing tables'
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles', 'trading_sessions', 'trades',
  'copy_trading_follows', 'copy_trade_queue', 'notification_queue'
)

UNION ALL

-- 3. Sjekk RLS
SELECT 'RLS enabled check' as check_name,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL: RLS not enabled on all tables'
  END as result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'trading_sessions', 'trades', 'copy_trading_follows')
AND rowsecurity = true;
```

## Rollback (hvis noe går galt)

### Hvis du har backup:
```bash
# Gjenopprett fra backup
supabase db restore backup_pre_kla53.sql
```

### Hvis du trenger å gjenopprette legacy tabeller:
```bash
# Kopier migrasjoner tilbake fra arkiv
cp supabase/migrations/_archive/kla-53/*.sql supabase/migrations/

# Kjør migrasjoner
supabase db push
```

## Post-Migration Sjekkliste

- [ ] Legacy tabeller fjernet
- [ ] Canonical tabeller opprettet
- [ ] RLS enabled på alle user-tabeller
- [ ] Triggers aktive
- [ ] Test-bruker kan registreres
- [ ] Test-session kan opprettes
- [ ] Test-trade kan opprettes
- [ ] Session state oppdateres ved trade
- [ ] Leaderboard refreshes
- [ ] App kan starte uten feil
- [ ] Login fungerer
- [ ] Trading dashboard laster

## Troubleshooting

### Problem: "relation X does not exist"
**Løsning:** Kjør 001_core_schema.sql på nytt

### Problem: "duplicate key value violates unique constraint"
**Løsning:** Slett eksisterende data først, eller bruk ON CONFLICT

### Problem: "permission denied for table"
**Løsning:** Verifiser RLS policies er opprettet

### Problem: "cannot drop table X because other objects depend on it"
**Løsning:** Bruk CASCADE, eller dropp avhengige objekter først

## Support
- KLA-53 Issue: https://linear.app/klarpakke/issue/KLA-53
- Dokumentasjon: /docs/db/kla-53-nuke-and-pave.md
- Arkiverte filer: /supabase/migrations/_archive/kla-53/
