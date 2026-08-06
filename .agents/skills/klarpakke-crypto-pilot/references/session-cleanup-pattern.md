# Session Cleanup Pattern (2026-07-29)

## Problem

JokerTrade created sessions at the start of each POST handler, but trades could fail (position limit, minimum order, binance-proxy timeout). This left **empty active sessions** that accumulated over time — 15 active/crashed sessions with 0 trades.

## Solution: Clean up after failed trades

```typescript
// At the END of the POST handler, after all trade attempts:
if (!tradeData.success && exitsExecuted === 0) {
  await db.from("trading_sessions").update({ status: "stopped" }).eq("id", session.id);
}
```

## Why "stopped" not deleted?

- Deletion removes audit trail
- "Stopped" preserves the session record without cluttering active views
- Future `ensureActiveSession()` creates a new one if needed (same behavior as before)

## Cleanup existing empty sessions

```sql
DELETE FROM trading_sessions
WHERE status = 'crashed'
  AND NOT EXISTS (SELECT 1 FROM trades WHERE session_id = trading_sessions.id);
```

## Combined with ensureActiveSession()

The full lifecycle:
1. `ensureActiveSession()` finds existing active → reuses it
2. Trade either succeeds (session stays active) or fails (session is stopped)
3. Next cycle: `ensureActiveSession()` creates a new session since the old one is stopped
4. No accumulation of empty sessions

## When NOT to clean up

- If `exitsExecuted > 0` → don't stop session (it has real activity)
- If the session has existing trades (from earlier cycles) → don't stop
- The check `!tradeData.success && exitsExecuted === 0` correctly handles both cases
