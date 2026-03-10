# Trade-tabell konsolideringsplan
> Dokument: docs/trade-consolidation-plan.md  
> Opprettet: 2026-03-10  
> Relatert: GitHub Issue #6 (Fase 2)

---

## 1. Eksisterende tilstand

### 1.1 Tabell-oversikt

| Tabell | Rader | FK-referanser | Status |
|--------|-------|---------------|--------|
| `trades` | 2 | ⚠️ Selv-referanse (leader_trade_id) | **Aktiv master** |
| `unified_trades` | 0 | ✅ Ingen | Planlagt ny master |
| `live_trades` | 0 | ✅ Ingen | 🟡 Kan renames til _legacy |
| `auto_trades` | 0 | ⚠️ trade_notes.trade_id | 🔴 Krever FK-migrasjon først |
| `trade_history` | 0 | ✅ Ingen | 🟡 Kan renames til _legacy |

### 1.2 Kolonne-analyse: trades vs unified_trades

#### ✅ Felles kolonner (6 stk)
- `id` (uuid)
- `user_id` (uuid)
- `session_id` (uuid)
- `quantity` (numeric)
- `created_at` (timestamptz)
- `idempotency_key` (text)

#### ❌ Kun i trades (mangler i unified_trades)
| Kolonne | Type | Påkrevd? | Action |
|---------|------|----------|--------|
| `binance_order_id` | text | Nei | Legg til i unified_trades |
| `executed_at` | timestamptz | Nei | Legg til i unified_trades |
| `fee` | numeric | Nei (default 0) | Legg til i unified_trades |
| `is_copy` | boolean | Nei (default false) | Legg til i unified_trades |
| `leader_trade_id` | uuid | Nei | Legg til i unified_trades |
| `order_type` | text | Nei (default 'market') | Legg til i unified_trades |
| `price` | numeric | Ja | ✅ Finnes som entry_price/exit_price |
| `realized_pnl` | numeric | Nei | Legg til i unified_trades |
| `strategy_signal` | jsonb | Nei | Legg til i unified_trades |
| `total_value` | numeric | Ja | Beregnes fra quantity * price |
| `trading_pair` | text | Ja | ✅ Finnes som symbol |

#### ❌ Kun i unified_trades (mangler i trades)
Disse er utvidelser som unified_trades har for fremtidig funksjonalitet:
- `client_order_id`, `close_reason`, `closed_at`
- `entry_price`, `exit_price`, `exchange_order_id`
- `execution_time_ms`, `fees` (merket som fees, ikke fee)
- `metadata` (jsonb)
- `opened_at`, `pnl`, `pnl_pct`, `position_value`
- `signal_confidence`, `signal_reason`, `slippage_pct`
- `stop_loss`, `strategy`, `symbol`, `take_profit`

---

## 2. Konsolideringsstrategi

### 2.1 Master-tabell beslutning

**Valg: `trades` beholdes som master inntil videre**

Rationale:
- Har 2 rader produksjonsdata
- Har selv-referanse (leader_trade_id) som må bevares
- All eksisterende kode peker på `trades`
- unified_trades er et pågående refactoringsprosjekt

**Langsiktig mål:** Migrer alt til `unified_trades` når:
- Kolonner er synkronisert
- Data er migrert
- All kode er oppdatert
- Tester passerer

### 2.2 Nullstilling av ubrukte tabeller

| Tabell | Rader | FK | Risiko | Anbefaling |
|--------|-------|-----|--------|------------|
| `live_trades` | 0 | Ingen | 🟡 Lav | `RENAME TO live_trades_legacy` |
| `trade_history` | 0 | Ingen | 🟡 Lav | `RENAME TO trade_history_legacy` |
| `auto_trades` | 0 | trade_notes | 🔴 Høy | Må oppdatere trade_notes først |

### 2.3 FK-migrasjonsstrategi

#### Problem: trade_notes.trade_id → auto_trades.id

```sql
-- Analyse: Hvilke rader i trade_notes peker på auto_trades?
SELECT COUNT(*) 
FROM trade_notes tn
WHERE EXISTS (
    SELECT 1 FROM auto_trades at WHERE at.id = tn.trade_id
);
-- Forventet: 0 (siden auto_trades er tom)
```

**Løsning:**
1. Sjekk at auto_trades faktisk er tom
2. Oppdater trade_notes.trade_id til NULL (eller slett trade_notes-rader)
3. Rename auto_trades → auto_trades_legacy

---

## 3. Migrasjonsrekkefølge

### Fase 2A: Nullstill ubrukte tabeller (lav risiko)

```sql
-- Migrasjon 1: live_trades
ALTER TABLE IF EXISTS live_trades 
RENAME TO live_trades_legacy;

COMMENT ON TABLE live_trades_legacy IS 
    'Legacy: Ingen data, ingen FK-referanser. Kan slettes post-launch. Issue #6.';

-- Migrasjon 2: trade_history  
ALTER TABLE IF EXISTS trade_history
RENAME TO trade_history_legacy;

COMMENT ON TABLE trade_history_legacy IS 
    'Legacy: Ingen data, ingen FK-referanser. Kan slettes post-launch. Issue #6.';
```

**Risiko:** 🟡 Lav  
**Rollback:** `ALTER TABLE live_trades_legacy RENAME TO live_trades;`

### Fase 2B: auto_trades (medium risiko)

```sql
-- Steg 1: Verifiser at auto_trades er tom
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM auto_trades) = 0, 
        'auto_trades har data! Kan ikke rename.';
END $$;

-- Steg 2: Oppdater trade_notes (hvis nødvendig)
-- UPDATE trade_notes SET trade_id = NULL 
-- WHERE trade_id IN (SELECT id FROM auto_trades);

-- Steg 3: Rename
ALTER TABLE IF EXISTS auto_trades
RENAME TO auto_trades_legacy;

COMMENT ON TABLE auto_trades_legacy IS 
    'Legacy: Tømt, trade_notes FK oppdatert. Kan slettes post-launch. Issue #6.';
```

**Risiko:** 🟠 Medium (pga. FK)  
**Rollback:** Samme som over + gjenopprett trade_notes-data fra backup

### Fase 2C: Synkroniser unified_trades (høy risiko - UTSETTES)

Denne fasen utsettes til etter lansering når:
- unified_trades er ferdig designet
- Kolonner er ajourført
- Data-migrasjon er testet
- All kode er oppdatert til å peke på unified_trades

**Risiko:** 🔴 Høy (berører produksjonsdata i trades)

---

## 4. Implementerte migrasjoner

### Migrasjon 20260310192000: RLS for leaderboard_history og coin_prices ✅
- Status: Pushet til main
- Resultat: Begge tabeller har nå RLS aktivert

### Migrasjon 20260310192001: Notification queue funksjon ✅
- Status: Pushet til main
- Inneholder: process_pending_notifications()

### Migrasjon 20260310200000: Oppdatert notification funksjon med HTTP
- Status: Klar for review
- Inneholder: HTTP-kall til Edge Function, email preferences sjekk, dead-letter

### Migrasjon 20260310200001: Cron scheduling for notifications
- Status: Klar for review
- Schedule: Hvert 5. minutt
- Kaller: process_pending_notifications(10)

---

## 5. Testplan

### Test 1: Notification migrasjoner

```sql
-- Før kjøring:
SELECT status, COUNT(*) FROM notification_queue GROUP BY status;
-- Forventet: pending: 13, sent: 6

-- Kjør manuelt:
SELECT * FROM process_pending_notifications(5);

-- Etter kjøring:
SELECT status, COUNT(*) FROM notification_queue GROUP BY status;
-- Forventet: sendt + processed, failed + feilet, skipped + hoppet over

-- Sjekk cron:
SELECT * FROM cron.job WHERE jobname = 'process-notification-queue';
-- Forventet: 1 rad, active = true
```

### Test 2: Trade-tabell nullstillinger (etter deploy)

```sql
-- Verifiser rename:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_legacy';
-- Forventet: live_trades_legacy, trade_history_legacy, auto_trades_legacy

-- Verifiser at trades fortsatt fungerer:
SELECT COUNT(*) FROM trades;
-- Forventet: 2

-- Verifiser at trade_notes FK er intakt:
SELECT COUNT(*) FROM trade_notes WHERE trade_id IS NOT NULL;
-- Forventet: 0 (hvis auto_trades_legacy er tømt)
```

---

## 6. Rollback-prosedyrer

### Scenario: Notification cron feiler

```sql
-- Fjern cron-jobb
SELECT cron.unschedule('process-notification-queue');

-- Gjenopprett gammel funksjon (fra backup)
-- Eller: CREATE OR REPLACE FUNCTION process_pending_notifications(...)
```

### Scenario: Trade rename må reverseres

```sql
-- Gjenopprett fra legacy
ALTER TABLE live_trades_legacy RENAME TO live_trades;
ALTER TABLE trade_history_legacy RENAME TO trade_history;
ALTER TABLE auto_trades_legacy RENAME TO auto_trades;
```

---

## 7. Akseptansekriterier

- [ ] `process_pending_notifications` returnerer riktig (processed, failed, skipped)
- [ ] Email preferences respekteres (transaction_emails, trading_alerts)
- [ ] Dead-letters (attempts >= 3) markeres som 'failed'
- [ ] Cron-jobb kjører hvert 5. minutt uten feil
- [ ] `live_trades_legacy` eksisterer og er tom
- [ ] `trade_history_legacy` eksisterer og er tom
- [ ] `auto_trades_legacy` eksisterer og er tom
- [ ] `trades` fungerer normalt med alle 2 rader intakte
- [ ] Ingen FK-constraint violations i logs

---

## 8. Post-launch oppgaver (etter produksjonslansering)

1. **Slett legacy-tabeller** (30 dager etter lansering)
   ```sql
   DROP TABLE IF EXISTS live_trades_legacy;
   DROP TABLE IF EXISTS trade_history_legacy;
   DROP TABLE IF EXISTS auto_trades_legacy;
   ```

2. **Konsolider til unified_trades** (når design er ferdig)
   - Legg til manglende kolonner
   - Migrer data fra trades
   - Oppdater all kode
   - Rename trades → trades_legacy
   - Rename unified_trades → trades

3. **Overvåking**
   - Sett opp alerting på cron.job_run_details
   - Monitorer notification_queue status-fordeling
   - Sjekk dead-letter rate
