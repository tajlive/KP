# KLA-137 Staging Runbook

## SISTE COMMIT
```
b4ed1c661 KLA-137: harden fail-closed logic for calculate_daily_loss
```

## DEL 1 — PROBLEMANALYSE

### Funnet under review:
1. `calculate_daily_loss` RPC defaulter til `0` hvis det feiler (ikke fail-closed)
2. `trade_rejections` og `trade_decisions` tabeller mangler i database
3. `risk_profiles` mangler KLA-137 kolonner i database
4. Migrasjon er committed men ikke kjørt i Supabase

### Root Cause:
- Kode er committed og pushed
- Database er IKKE synkronisert
- Fail-closed logikk var ikke stringent nok for RPC failures

---

## DEL 2 — KODEENDRINGER UTFØRT

### 1. risk-validator.ts
- ✅ Lagt til error handling for `calculate_daily_loss` RPC
- ✅ Blokker trade hvis RPC returnerer error
- ✅ Blokker trade hvis RPC returnerer null/undefined
- ✅ Ny rejection reason: `DAILY_LOSS_CHECK_FAILED`

### 2. SQL Migration
- ✅ Oppdatert CHECK constraint med ny rejection reason
- ✅ Alle tabeller og funksjoner definert

---

## DEL 3 — STAGING CHECKLIST

### STEG 1: Kjør migrasjon
```sql
-- Gå til https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql-editor
-- Kopier innholdet fra:
-- supabase/migrations/20260309120000_kla137_trading_safety_core.sql
-- Kjør SQL
```

### STEG 2: Verifiser i DB
```sql
-- Sjekk risk_profiles kolonner
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'risk_profiles' 
AND column_name IN ('max_daily_loss_pct', 'allowed_pairs', 'leverage_allowed', 'max_position_pct', 'max_exposure_pct');

-- Forventet: 5 rader

-- Sjekk bot_health kolonner
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bot_health' 
AND column_name IN ('status', 'last_heartbeat', 'consecutive_errors');

-- Forventet: 3 rader

-- Sjekk tabeller
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trade_rejections', 'trade_decisions');

-- Forventet: 2 rader

-- Sjekk funksjoner
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_daily_loss', 'is_bot_healthy');

-- Forventet: 2 rader
```

### STEG 3: Kjør integrasjonstester

#### Test 1: Live trade uten risk profile
```bash
curl -X POST https://staging.klarpakke.no/api/trading/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "session_id": "<test-session>",
    "symbol": "BTCUSDT",
    "side": "buy",
    "quantity": 0.1,
    "order_type": "market"
  }'

-- Forventet: 
-- {
--   "success": false,
--   "rejectionReason": "NO_RISK_PROFILE",
--   "type": "TRADE_REJECTED"
-- }
```

#### Test 2: Live trade med unhealthy bot
```bash
-- Sett bot status til 'error' i bot_health tabellen
-- Kjør samme curl som over

-- Forventet:
-- {
--   "success": false,
--   "rejectionReason": "BOT_NOT_HEALTHY",
--   "type": "TRADE_REJECTED"
-- }
```

#### Test 3: Live trade med invalid pair
```bash
curl -X POST https://staging.klarpakke.no/api/trading/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "session_id": "<test-session>",
    "symbol": "INVALIDPAIR",
    "side": "buy",
    "quantity": 0.1,
    "order_type": "market"
  }'

-- Forventet:
-- {
--   "success": false,
--   "rejectionReason": "PAIR_NOT_ALLOWED",
--   "type": "TRADE_REJECTED"
-- }
```

#### Test 4: Paper trade med default profil
```bash
curl -X POST https://staging.klarpakke.no/api/paper-trading/trade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "buy",
    "quantity": 0.001,
    "price": 50000
  }'

-- Forventet:
-- {
--   "success": true,
--   "trade_id": "...",
--   "new_balance": ...
-- }
```

#### Test 5: Rejection logging
```sql
-- Etter å ha kjørt test 1-3, sjekk:
SELECT rejection_reason, COUNT(*) 
FROM trade_rejections 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY rejection_reason;

-- Forventet: Rader med NO_RISK_PROFILE, BOT_NOT_HEALTHY, PAIR_NOT_ALLOWED
```

#### Test 6: Decision logging
```sql
-- Sjekk at både allow og reject logges:
SELECT decision_type, COUNT(*) 
FROM trade_decisions 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY decision_type;

-- Forventet: Rader med både 'allow' og 'reject'
```

#### Test 7: Daily loss RPC unavailable
```sql
-- Midlertidig dropp calculate_daily_loss funksjonen:
DROP FUNCTION IF EXISTS calculate_daily_loss(UUID, UUID);

-- Kjør paper trade test
-- Forventet: Trade blokkert med DAILY_LOSS_CHECK_FAILED

-- Gjenopprett funksjonen:
CREATE OR REPLACE FUNCTION calculate_daily_loss(p_user_id UUID, p_session_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  daily_loss NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN side = 'sell' AND price < (
        SELECT AVG(price) FROM trades t2 
        WHERE t2.session_id = p_session_id 
        AND t2.side = 'buy' 
        AND t2.created_at::date = CURRENT_DATE
      ) THEN (price - (
        SELECT AVG(price) FROM trades t2 
        WHERE t2.session_id = p_session_id 
        AND t2.side = 'buy' 
        AND t2.created_at::date = CURRENT_DATE
      )) * quantity
      ELSE 0
    END
  ), 0) INTO daily_loss
  FROM trades
  WHERE user_id = p_user_id
  AND session_id = p_session_id
  AND created_at::date = CURRENT_DATE
  AND side = 'sell';
  
  RETURN daily_loss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## DEL 4 — STATUS

### Endrede filer:
- `src/lib/trading/safety/risk-validator.ts` (fail-closed forbedring)
- `supabase/migrations/20260309120000_kla137_trading_safety_core.sql` (ny rejection reason)

### SQL/Schema avhengigheter:
- `risk_profiles` kolonner må eksistere
- `bot_health` felter må eksistere
- `trade_rejections` tabell må eksistere
- `trade_decisions` tabell må eksistere
- `calculate_daily_loss()` funksjon må eksistere
- `is_bot_healthy()` funksjon må eksistere

### Testplan:
- [ ] Migrasjon kjørt i Supabase
- [ ] Alle tabeller verifisert
- [ ] Test 1: Live uten risk profile -> blokkert
- [ ] Test 2: Live med unhealthy bot -> blokkert
- [ ] Test 3: Invalid pair -> blokkert
- [ ] Test 4: Paper med default -> succeeds
- [ ] Test 5: Rejection logging verifisert
- [ ] Test 6: Decision logging verifisert
- [ ] Test 7: RPC unavailable -> blokkert

### Gjenværende risiko:
1. **Høy**: Database ikke synkronisert med kode
2. **Medium**: calculate_daily_loss kan være treg på store datasett
3. **Lav**: Audit trail logging kan feile uten å blokkere trade (akseptert tradeoff)

---

## ENDELIG STATUS

### BLOCKED

**Grunn**: Database migrasjon må kjøres i Supabase før staging kan verifiseres.

**Neste steg**:
1. Kjør migrasjon i Supabase Studio
2. Verifiser tabeller og kolonner
3. Kjør alle integrasjonstester
4. Deretter: READY TO DEPLOY STAGING
