# Session Auto-Healing — Implementasjonsdetaljer

Dato: 2026-07-27
Bruker: palivarhjertholm@gmail.com
Sesjon: 7bda12b3-f03b-46ac-9275-8fec8c0777b0

## Problem

Sesjon opprettet kl 18:58 med `status: "active"`, `last_heartbeat: 18:58`.
Cron/tick prosesserte aldri sesjonen → heartbeat forble på opprettelsestidspunkt.
Etter 5 min: `detect_crashed_sessions` (pg_cron) kjørte, men satte IKKE til `crashed` — sesjonen ble `paused` (ukjent mekanisme, sannsynligvis manuell eller circuit breaker).
`recover_crashed_paper_sessions()` håndterte KUN `status = 'crashed'` → `paused` ble permanent fastlåst.

## Funn ved kjøring av heal_stale_sessions()

```
SELECT heal_stale_sessions();
→ healed_count: 7
```

7 sesjoner var fastlåst i `paused` på tvers av alle brukere — kunne pågått i dager.

## DB-migrasjon

```sql
CREATE OR REPLACE FUNCTION heal_stale_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE healed_count integer;
BEGIN
    WITH healed AS (
        UPDATE trading_sessions
        SET status = 'active', last_heartbeat = NOW(), last_tick_at = NOW(),
            updated_at = NOW(), error_message = NULL, stopped_at = NULL
        WHERE (
            (status = 'paused' AND last_heartbeat < NOW() - INTERVAL '3 minutes')
            OR (status = 'crashed' AND stopped_at IS NULL AND started_at > NOW() - INTERVAL '7 days')
        )
        AND mode = 'paper' AND archived = FALSE
        RETURNING id
    ) SELECT COUNT(*) INTO healed_count FROM healed;
    RETURN healed_count;
END;
$$;
```

## Kodeendringer

1. `src/app/api/cron/tick/route.ts:1605` — erstattet `recover_crashed_paper_sessions` med `heal_stale_sessions`
2. `src/app/api/cron/ai-engine/route.ts:93` — samme

```typescript
// FØR:
await db.rpc("recover_crashed_paper_sessions");

// ETTER:
await db.rpc("heal_stale_sessions" as never);
```
