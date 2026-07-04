# Klarpakke Trading Production Readiness Plan

**Date:** 2026-07-04  
**Author:** Trading Production Readiness Planner  
**Scope:** Three workstreams to determine if the trading system is ready for live trading.

---

## 1. Summary

This plan addresses three critical questions before enabling live trading:

1. **Conservative paper DCA restart:** How to start a new paper session with a safer DCA configuration and observe stability.
2. **Drawdown root-cause analysis:** Why session `e2f32f89-e513-4806-bb43-ed5744a50690` stopped after 3 paper trades with a reported 15.3% portfolio drawdown.
3. **Minimal live trading verification:** A safe, gated procedure to place one tiny real Binance order, verify the end-to-end flow, and define rollback/stop criteria.

The plan is ordered by dependency: first understand and fix the paper drawdown root cause, then run a conservative paper session to prove stability, and only then attempt a minimal live order.

---

## 2. Background and Current State

- Production is running commit `96c4f08`, which fixed paper DCA config merge precedence and disabled Dark Fleet for DCA.
- User `tomarnejensen@gmail.com` (`0dd08529-b8a8-4fd3-9806-275e2d0135dd`) has paper session `e2f32f89-e513-4806-bb43-ed5744a50690`.
- That session executed 3 trades (buy 00:50, sell 00:55, buy 01:00) and stopped with: `Circuit breaker: portfolio drawdown 15.3%`.
- `initial_capital` = 100,000 NOK, `current_capital` = 84,718.06 NOK, `total_pnl` = -10.72 NOK.
- `strategy_config` at stop: `{ position_size: 0.5, interval_minutes: 1, daily_buy_count: 0, daily_buys_today: "2026-07-03" }`.
- Visible trade rows total ~23,902 NOK notional; realized PnL + fees total only ~35 NOK. The drop to 84,718 NOK cannot be explained by these rows alone, indicating a likely paper capital accounting bug.

---

## 3. Workstream A: Conservative Paper DCA Session Restart

### Goal
Create a new paper DCA session with conservative, well-defined parameters and observe it long enough to confirm stability before any live trading.

### Recommended Configuration
Use the DCA Trygg UUID default (`9fab4471-a0d4-4870-9611-44bd69403775`) as the base, but explicitly override in the session with the following conservative values:

| Parameter | Current (failed session) | Recommended conservative value | Rationale |
|-----------|--------------------------|--------------------------------|-----------|
| `interval_minutes` | 1 | 240 (4 h) | Prevents minute-level churn; matches DCA Trygg default. |
| `position_size` | 0.5 (50%) | 0.04 (4%) | Aligns with DCA Trygg default; dynamic sizing will further reduce it to ~0.5–2% for new sessions. |
| `max_daily_buys` | 3 (default) | 2 | Hard cap on daily buy frequency. |
| `dip_multiplier` | 2 (default) | 1.5 | Less aggressive buying in dips. |
| `fomo_reduction` | 0.5 (default) | 0.5 | Keep; reduces size when market is up. |
| `partial_tp_levels` | default | default `[{5,25},{10,25},{15,25},{25,25}]` | Standard partial profit-taking. |
| `stop_loss_pct` | -10 (default) | -5 | Tighter capital protection. |
| `use_trailing_stop` | true | true | Keep ATR trailing stop. |
| `starting_capital_nok` | 100,000 | 100,000 | Keep; enough for small positions. |
| `trading_pair` | BTCUSDT | BTCUSDT | Liquid, narrow spreads. |

### How to Create the Session
1. **Via UI:** Use the trading wizard (`BotWizard`) to start a paper DCA bot. Choose risk level **low/safe** and pair **BTCUSDT**. The wizard calls `startTrading` in `src/app/actions/trading.ts`, which writes to `public.trading_sessions`.
2. **Via direct DB (admin only):** Insert a row into `public.trading_sessions` with `mode='paper'`, `strategy_id='dca'`, and the `strategy_config` JSON above. Verify the merge order in `src/app/api/cron/tick/route.ts` (`{ ...baseConfig, ...session.strategy_config, engineKey: resolvedEngine }`) so session values override defaults.
3. **Stop the old session first:** Ensure `e2f32f89-e513-4806-bb43-ed5744a50690` is already `stopped`. If any other active sessions exist for this user, stop them to avoid the portfolio drawdown breaker aggregating across sessions.

### Observation Period and Success Criteria
- **Minimum observation:** 72 hours (3 full days) of cron ticks, or at least 5 DCA buy cycles (5 × 4 h = 20 h minimum).
- **Success criteria:**
  - No `portfolio_stop` or `risk_blocked` entries in `public.trading_logs` for the new session.
  - `current_capital` stays within ±5% of `initial_capital`.
  - All trades are BUYs at 4-hour intervals except valid partial-profit SELLs.
  - No session crashes (`status != 'crashed'`).
  - `last_heartbeat` and `last_tick_at` update regularly (every 5 minutes).
  - `/api/health` and `/api/trading/v3/health` remain `healthy`.

### Monitoring Commands
```bash
# Session status and capital
node scripts/tmp-session-reason.mjs  # adapt for new session id

# User-level diagnostics
node scripts/investigate-user-trading.mjs --user-id=0dd08529-b8a8-4fd3-9806-275e2d0135dd
node scripts/diagnose-user-trades.mjs --user-id=0dd08529-b8a8-4fd3-9806-275e2d0135dd

# Health
npm run health:trading
npm run health:prod

# Manually trigger one tick (for smoke test only)
node scripts/simulate-tick-for-user.mjs --user-id=0dd08529-b8a8-4fd3-9806-275e2d0135dd
```

### Go / No-Go Gate (Workstream A)
- **Go:** 72 h stable, capital within ±5%, no circuit breakers, regular heartbeats, all trades look like expected DCA behavior.
- **No-Go:** Any crash, any unexpected drawdown >5%, any `portfolio_stop` or repeated `risk_blocked`, or missing heartbeat updates. If no-go, return to Workstream B.

---

## 4. Workstream B: Drawdown Root-Cause Analysis

### Goal
Explain why 3 trades produced a 15.3% portfolio drawdown and identify whether it is a config bug, strategy behavior, or code issue.

### Key Code Paths to Inspect
1. **Tick engine merge logic:** `src/app/api/cron/tick/route.ts` lines ~300–360.
2. **DCA strategy:** `src/lib/trading/strategies/dca.ts`.
3. **Dynamic position sizing:** `src/lib/trading/optimal/position-size.ts`.
4. **Paper execution:** `src/lib/trading/paper-executor.ts` and `src/lib/trading/core/execute-trade.ts`.
5. **Capital update trigger:** `supabase/migrations/20260501160000_fix_multi_session_capital_sync.sql` (`trigger_update_session_state`).
6. **Portfolio drawdown breaker:** `src/app/api/cron/tick/route.ts` lines ~1562–1606.
7. **Beta guardrails:** `src/lib/trading/beta/tick-guardrails.ts`.

### Evidence from the Failed Session

| Trade | Time | Side | qty | price (NOK) | total_value (NOK) | fee (NOK) | realized_pnl | strategy_signal.position_size |
|-------|------|------|-----|------------|-------------------|----------|--------------|---------------------------------|
| 1 | 00:50 | buy | 0.0199023 | 619,262 | 12,324.74 | 12.32 | null | 0.0125 (1.25%) |
| 2 | 00:55 | sell | 0.0069893 | 618,346 | 4,321.81 | 4.32 | -10.72 | 0.005 (0.5%) |
| 3 | 01:00 | buy | 0.0117192 | 619,077 | 7,255.11 | 7.26 | null | 0.008 (0.8%) |

- `strategy_config.position_size` was `0.5`, but dynamic sizing reduced effective signal sizes to 0.5–1.25%.
- The 00:55 sell reason: `Trailing stop: dropped 89.9% from peak (2x ATR)`. `strategy_signal.pnl_pct` = -89.87%.
- Realized PnL was only -10.72 NOK, so the -89.87% figure is a data artifact, not a real portfolio loss.
- Despite small trades, `current_capital` dropped from 100,000 → 84,718.06 (15.3%). The visible trades + fees cannot account for this.

### Hypotheses to Test

1. **Capital accounting bug in paper mode.**
   - `trigger_update_session_state` updates `current_capital` on every `INSERT` to `trades` using `NEW.total_value` and `NEW.fee`. It also sets `open_position = NULL` on a sell, meaning the sell after the first buy resets the position rather than tracking remaining lots.
   - Additionally, `execute-trade.ts` for paper mode relies on the trigger only, but the trigger may double-count fees or not credit the full sell proceeds because `total_value` is stored in NOK while `quantity * price` is also converted.
   - **Check:** Compare `trades.total_value` sums to `initial_capital - current_capital` for the session. Verify the trigger formula matches the trade rows exactly.

2. **Incorrect `highest_price` initialization causes bogus trailing stop.**
   - The DCA strategy trailing stop uses `session.open_position.highest_price ?? entryPrice`. If `highest_price` is initialized to 0 or not persisted, the `dropFromPeak` becomes enormous and triggers an immediate sell at the next tick.
   - The sell quantity (~35% of position) is consistent with a partial TP path, but the reason is from the trailing stop block.
   - **Check:** Inspect `open_position.highest_price` values in `trading_sessions` history; confirm it is initialized to the entry price and updated on new highs.

3. **Config merge allowed `interval_minutes: 1` to override the 4-hour default.**
   - The session config contained `interval_minutes: 1`. The merge order now is correct (`session.strategy_config` over base), but the session itself was created with an aggressive interval. This is not a code bug but a configuration/user-input issue.

4. **Portfolio drawdown breaker aggregates across all sessions.**
   - The breaker sums `initial_capital` and `current_capital` across all active sessions for the user. If any other active session also had depressed capital, the aggregate drawdown would cross 15% faster.
   - In this case the user had only one active session at the time of stop, but the low `current_capital` (84,718) drove the 15.3% drawdown.

### Root-Cause Procedure

1. **Reproduce the capital math.**
   ```sql
   SELECT
     initial_capital,
     current_capital,
     initial_capital - current_capital AS reported_drawdown,
     (SELECT COALESCE(SUM(total_value),0) FROM public.trades WHERE session_id = 'e2f32f89-...' AND side = 'buy') AS total_bought,
     (SELECT COALESCE(SUM(total_value),0) FROM public.trades WHERE session_id = 'e2f32f89-...' AND side = 'sell') AS total_sold,
     (SELECT COALESCE(SUM(fee),0) FROM public.trades WHERE session_id = 'e2f32f89-...') AS total_fees,
     (SELECT COALESCE(SUM(realized_pnl),0) FROM public.trades WHERE session_id = 'e2f32f89-...') AS total_pnl
   FROM public.trading_sessions
   WHERE id = 'e2f32f89-...';
   ```
   Compare `initial_capital - current_capital` to `total_bought - total_sold + total_fees - total_pnl`. If they differ, the trigger is the culprit.

2. **Inspect the trigger in production.**
   - `\df+ trigger_update_session_state`
   - Confirm whether `current_capital` is updated on the same `trades` insert that the `execute-trade.ts` paper path expects.

3. **Inspect `highest_price` initialization.**
   - Query current `open_position` for the stopped session: `SELECT open_position FROM public.trading_sessions WHERE id = 'e2f32f89-...';`
   - If `highest_price` is missing or 0, the trailing stop is miscalculating.

4. **Review the 00:55 candle data.**
   - Fetch the 1-hour candles for BTCUSDT around 2026-07-04 00:50–01:00 from `public.trading_signals` or market data provider to see if a legitimate 2× ATR drop occurred. (It is unlikely within 5 minutes.)

5. **Check for duplicate capital updates.**
   - Verify that `execute-trade.ts` does NOT call `decrement_capital`/`increment_capital` RPC for paper mode; it currently relies on the trigger only. If both trigger and RPC run, capital is double-counted.

### Fix Options (depending on root cause)

1. If `trigger_update_session_state` is wrong for paper:
   - Update the migration to correctly credit sell proceeds and track remaining open position lots (FIFO).
   - Ensure `current_capital` represents cash only, not position value.
2. If `highest_price` initialization is wrong:
   - In `src/lib/trading/strategies/dca.ts`, change the trailing-stop calculation to use `entryPrice` when `highest_price` is missing or invalid.
   - In the tick route, persist `highest_price` on position creation and update it on new highs.
3. If `interval_minutes: 1` is user error:
   - Enforce a minimum interval in the wizard/validation (e.g., `interval_minutes >= 60`).
4. If the breaker is too aggressive for single-session tests:
   - Do not change the 15% threshold; instead, ensure paper sessions start with sane configs so the threshold is not hit spuriously.

### Acceptance for Workstream B
- A documented root cause in `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`.
- A SQL-backed reconciliation showing how capital moved.
- Either a code fix or a validated configuration change that prevents recurrence.

---

## 5. Workstream C: Minimal Live Trading Verification

### Goal
Place one tiny real Binance order, verify the end-to-end flow, and define rollback/stop criteria.

### Prerequisites (Go/No-Go Gate before any live test)
- Workstream B is closed and the capital accounting bug is fixed.
- Workstream A has run for at least 24 h without unexpected behavior (preferably 72 h).
- User has Bachelor+ tier and `binance_connected = true`.
- User's Binance API keys are stored in Supabase Vault and `decrypt_binance_keys` returns them.
- `BINANCE_PROXY_ENABLED` is not `0` (so the Supabase Edge proxy is used; required because Cloudflare Worker egress is WAF-blocked by Binance mainnet).
- `/api/health` and `/api/trading/v3/health` are `healthy` in production.
- `npm run health:prod:gate` passes.
- A second engineer or stakeholder is available for go/no-go approval.

### Safe Test Procedure

1. **Pre-test balance check.**
   ```bash
   curl -s -H "Authorization: Bearer $CRON_SECRET" \
     https://www.klarpakke.no/api/admin/test-binance-proxy
   ```
   Expected: `ok: true`, `balance.total > 0`, `proxyUsed: true`.

2. **Set minimal capital session.**
   - Create a new live session with `starting_capital_nok` set to a very small amount, e.g., 1,000 NOK (or the minimum allowed by validation). This is the **maximum capital at risk** for the test; the session's `current_capital` will be decremented/incremented by this amount, not the full Binance balance.
   - Alternatively, use the Binance API's `test` endpoint first (the Edge proxy supports `testConnection`/`account` actions, but a real order test is stronger). Use a limit order far from market if available, but market order is the production path.

3. **Place the smallest possible market order.**
   - BTCUSDT minimum notional on Binance is ~10 USDT. Use the minimum lot size from `src/lib/trading/canonical/symbols/lot-sizes.ts`.
   - The order should be placed via the normal production path: cron tick or an admin script that calls `executeTrade` with `mode: 'live'` and `orderType: 'market'`.
   - Recommended manual approach: trigger `POST /api/cron/tick` with `CRON_SECRET` after ensuring the live session is the only active session for the user and the signal is a buy. Better: use an admin script that directly calls `executeTrade` so the order is deterministic and not dependent on market signals.

4. **Verify the order on Binance.**
   - Check the Binance Spot account order history or use the Edge proxy `orderStatus` action.
   - Confirm the order ID matches the `binance_order_id` stored in `public.trades`.

5. **Verify the trade row.**
   - `public.trades` should contain one row with `mode='live'`, correct `quantity`, `price`, `total_value`, `fee`, and `binance_order_id`.
   - `public.trading_sessions` should show `current_capital` updated via `decrement_capital`.

6. **Verify no errors.**
   - `public.trading_logs` should have a `trade_executed` row and no `live_trade_failed` row.
   - `public.trade_rejections` should be empty for this attempt.
   - Circuit breaker and kill switch should remain closed.

7. **Stop the session.**
   - After the single verified trade, immediately set `status = 'stopped'` on the live session to prevent further trading.

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Accidentally large order due to config bug | Medium | High | Use minimum notional (~10 USDT), small session capital, and lot-size rounding. Review `src/lib/trading/canonical/symbols/lot-sizes.ts` before test. |
| Cloudflare/Binance WAF blocks live order | Medium | High | Ensure `BINANCE_PROXY_ENABLED != "0"` and the Edge Function is deployed. Verify with `/api/admin/test-binance-proxy`. |
| Invalid or expired Binance API keys | Low | Medium | Pre-test balance fetch validates keys. If order fails permanently, the session is stopped automatically by `executeLiveTrade`. |
| Duplicate live orders due to idempotency failure | Low | High | Use deterministic `idempotencyKey` and confirm one row in `trades`. |
| Circuit breaker stops all sessions | Low | Medium | Use a dedicated test user if possible; otherwise ensure no other active sessions for the user. |
| Capital accounting bug affects live | Medium | High | Fix paper accounting first; live uses the same `executeTrade` path but `decrement_capital`/`increment_capital` RPCs instead of trigger. Verify RPC math in `supabase/migrations/20260301111500_atomic_trading.sql`. |
| Market slippage causes loss on test order | High | Low | Tiny notional means tiny loss; accept as cost of verification. |

### Rollback / Stop Criteria
- **Immediate stop:** Any error from `/api/admin/test-binance-proxy`, any `live_trade_failed` log, any circuit breaker open, any `trade_rejections` row with a reason other than expected validation, or any unexpected `current_capital` change.
- **Stop the session:** After the first verified trade, set the live session `status = 'stopped'`.
- **Global kill switch:** If anything looks wrong, activate emergency stop via `src/lib/trading/emergency.ts` or set the `signalEngineKillSwitch` flag.
- **Code rollback:** If the deployed code has a bug, revert the commit via GitHub and redeploy through Cloudflare Workers Builds (or Wrangler backup).

### Go / No-Go Gate (Workstream C)
- **Go:** One successful live BTCUSDT market order, verified on Binance, recorded in `public.trades` with correct `binance_order_id`, session capital updated correctly, no errors, no circuit breakers. Then stop the session.
- **No-Go:** Any permanent error, any unexpected capital change, any failed order, or inability to verify the order on Binance. If no-go, fix the issue and repeat the live test only after the fix is deployed and paper re-verified.

---

## 6. Dependency Order and Phases

| Phase | Workstream | Entry Criteria | Exit Criteria | Go/No-Go Gate |
|-------|------------|----------------|---------------|---------------|
| 1 | B – Drawdown RCA | Session data available; code paths mapped | Root cause documented; capital math reconciled; fix or config validated | **No-go if capital accounting bug is not fixed** |
| 2 | A – Conservative paper restart | Bug fixed or explained; no other active sessions | New session created with conservative config | Proceed only after go/no-go review |
| 3 | A – Observation | Session active and ticking | 72 h stable, capital ±5%, no circuit breakers | **No-go if any instability observed** |
| 4 | C – Live readiness gates | Paper stable for 24+ h; health green; user tier + Binance OK | All prerequisites met; go/no-go approved | **No-go if any prerequisite missing** |
| 5 | C – Minimal live test | Gates passed | One verified live trade; session stopped | **No-go if any error or unverified order** |
| 6 | Documentation | Live test go | Update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` | Required before declaring ready |

---

## 7. Critical Files and Symbols

| File | Purpose |
|------|---------|
| `src/app/api/cron/tick/route.ts` | Tick engine, config merge, drawdown breaker, live/paper execution dispatch. |
| `src/lib/trading/strategies/dca.ts` | DCA signal generation, trailing stop, partial TP. |
| `src/lib/trading/optimal/position-size.ts` | Dynamic Kelly/ATR/regime/drawdown position sizing. |
| `src/lib/trading/core/execute-trade.ts` | Unified paper/live execution, idempotency, capital update. |
| `src/lib/trading/paper-executor.ts` | Paper fill simulation. |
| `src/lib/trading/executor-factory.ts` | Chooses executor; decrypts Binance keys; live entitlement. |
| `src/lib/trading/binance-proxy-executor.ts` | Live proxy executor routing to Supabase Edge. |
| `supabase/functions/binance-proxy/index.ts` | Edge Function that signs Binance requests. |
| `src/lib/trading/canonical/symbols/lot-sizes.ts` | Lot-size and minimum-quantity validation. |
| `src/lib/trading/circuit-breaker.ts` | Binance circuit breaker. |
| `src/lib/trading/emergency.ts` | Global emergency stop and panic close. |
| `src/lib/trading/beta/tick-guardrails.ts` | Per-user daily loss / drawdown / consecutive-loss guardrails. |
| `src/lib/trading/safety/risk-validator.ts` | Fail-closed risk validation. |
| `src/app/api/trading/mode/route.ts` | User live/paper mode switch with entitlement checks. |
| `src/app/api/admin/test-binance-proxy/route.ts` | Admin live proxy connectivity test. |
| `src/app/actions/trading.ts` | Server action to create paper/live sessions. |
| `supabase/migrations/20260301111500_atomic_trading.sql` | `decrement_capital` / `increment_capital` RPCs. |
| `supabase/migrations/20260501160000_fix_multi_session_capital_sync.sql` | `trigger_update_session_state` (paper capital update). |
| `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` | Integrity source of truth to update after verification. |
| `scripts/investigate-user-trading.mjs` | Service-role diagnostic. |
| `scripts/diagnose-user-trades.mjs` | Trade/session counts. |
| `scripts/simulate-tick-for-user.mjs` | Manual tick trigger. |
| `scripts/health-check.mjs` / `scripts/prod-health-gate.mjs` | Health checks. |

---

## 8. Risks Requiring Explicit Approval

1. **Live trading uses real money.** Even a 10 USDT order is irreversible. Approval required.
2. **Cloudflare Worker egress is WAF-blocked by Binance.** The proxy must be verified before any live order.
3. **Capital accounting bug in paper may exist in live.** The live path uses different RPCs (`decrement_capital`/`increment_capital`), but the same `executeTrade` function. The paper bug must be understood before live testing.
4. **Single-session drawdown breaker affects all sessions.** If other active sessions exist, the test could stop unrelated bots.

---

## 9. Next Immediate Actions (in priority order)

1. Run the SQL reconciliation for session `e2f32f89-...` to confirm the capital accounting discrepancy.
2. Inspect `trigger_update_session_state` and `open_position.highest_price` to find the root cause.
3. Decide if a code fix or configuration enforcement is required.
4. Create the new conservative paper session with the config above.
5. Observe for 72 hours.
6. If stable, run the live readiness gates and the minimal live test.
7. Update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` with all evidence and outcomes.
