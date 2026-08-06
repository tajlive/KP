# DB-Backed Smoke Testing

For features that require auth and the Cloudflare Workers API doesn't accept
`curl` + Bearer token (httpOnly cookies only), create a minimal test row in the
DB via Supabase MCP, then navigate the **already-authenticated browser** to the
detail page to test the UI flow.

## When to use this pattern

- The API route uses `createServerClient()` → `supabase.auth.getUser()` which
  reads httpOnly cookies, not Bearer headers
- You need to verify Norwegian toast messages, dispatch events, or UI state changes
- You cannot extract the browser's auth cookie (httpOnly)
- Supabase REST auth (`grant_type=password` + cookie construction) fails on
  Cloudflare Workers (cookie format mismatch or signature verification)

## Recipe

```sql
-- 1. Create minimal test session (via Supabase MCP)
INSERT INTO trading_sessions (
  id, user_id, mode, status, trading_pair,
  risk_level, current_capital, initial_capital,
  strategy_config, smart_trader_enabled, archived,
  created_at, updated_at, started_at
) VALUES (
  gen_random_uuid(),
  '<user_id>',
  'paper', 'active',
  'SOLUSDT',
  'balanced', 50.00, 50.00,
  '{"close_on_stop": true}',
  false, false,
  NOW(), NOW(), NOW()
);

-- 2. Navigate browser to session detail
-- URL: https://www.klarpakke.no/no/dashboard/bot/<session_id>
-- (from src/app/[locale]/(user)/dashboard/bot/[session_id]/page.tsx)

-- 3. Interact with UI (click stop, verify toast, etc.)

-- 4. Clean up
DELETE FROM trading_sessions WHERE id = '<session_id>';
```

## Pitfalls

- **Binance 403 on Workers**: close-on-stop needs a live price from Binance.
  Cloudflare Workers IP is blocked → priceUsdt = 0 → `closeOnStop` stays null →
  no toast. This is a KNOWN LIMITATION — not a bug in the code being tested.
  For paper sessions without `open_position`, the `closeSessionPositionOnStop`
  returns `{closed: false, reason: "no_position"}` quickly.
- **Session must exist in DB**: the page fetches via `createServerClient()` which
  RLS-scopes to the authenticated user. A session created for a different user
  won't be accessible.
- **DNS/cache delay**: immediately after INSERT, the page may return a 404 if
  the Worker's cache hasn't picked up the new row. Wait ~5s or retry the
  navigation.
- **Don't leave test data**: always DELETE the test row after verification.
  Present the DELETE SQL to Tom before executing if the row has side effects
  (activity logs, leaderboard entries, balance changes).

## Verified 2026-07-26

- Session creation + browser navigation + status change + cleanup all worked
- Toast didn't fire because Binance 403 blocked the price lookup (known issue)
- Norwegian labels on BotDetailView confirmed: "Tradingbot", "Kapitalkurve",
  "Handelshistorikk", "Strategiinfo", close-on-stop toggle text
