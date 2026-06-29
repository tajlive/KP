# Platform Foundation Reset — Design Document

**Date:** 2026-06-28  
**Status:** Design approved for implementation planning  
**Scope:** Database baseline, trading-engine unification, compliance/audit foundation, and UX trust layer  
**Owner:** Klarpakke Engineering  
**Related docs:** `docs/ARCHITECTURE.md`, `docs/CRON-SOURCE-OF-TRUTH.md`, `docs/AI-TRADING.md`, `docs/AUTO_TRADING.md`, `src/lib/supabase/TYPE_DEBT.md`

---

## 1. Background & Goal

Klarpakke runs in production on Cloudflare Workers + Supabase with a modern Next.js 16 / React 19 stack. Six internal domain audits and four competitive analyses (QuantConnect, Alpaca, TradingView, 3Commas, Coinrule, Robinhood EU, eToro, NORDNET, Avanza, Monzo, Wise, Stripe, Coinbase) revealed the same pattern: the platform is **feature-rich but foundation-fragmented**. Migrations have drifted, the trading engine has parallel implementations, audit/compliance primitives are missing, and the UX competes with Nordic fintech incumbents on trust rather than density.

**Goal:** Rebuild the platform foundation so that product iterations become cheaper, live trading becomes safe, and the user experience matches European retail-fintech trust expectations.

This document is the source of truth for the implementation plan that follows.

---

## 2. What Is In Scope

1. **Database baseline & migration hygiene**
   - Single Supabase project ID for type generation (`vuxbjlykgmzskxbclquf`).
   - One canonical generated-types file (`src/types/database.types.ts`).
   - Diagnostic/repair SQL moved out of `supabase/migrations/`.
   - Clean baseline migration representing current prod schema.
   - Canonical user-init trigger and single `user_profiles` source of truth.

2. **Trading-engine unification**
   - Deprecate the standalone `supabase/functions/auto-trade/index.ts` loop.
   - Route auto-trading users through `/api/cron/tick` + `ExecutorFactory`.
   - Add idempotency-key primitive for orders and signals.
   - Add reconciliation loop against Binance/exchange state.
   - Port `run-backtest` edge function to the canonical `backtestEngine.ts`.

3. **Compliance & audit foundation**
   - Immutable `security_events` / `audit_events` table with hash chaining.
   - MiFID II / MiCA-aligned appropriateness gate before enabling AI strategies.
   - API-key security hardening (no withdrawal rights, IP allowlist, encrypted storage).
   - GDPR data export + erasure workflow with anonymization.

4. **UX trust layer**
   - Progressive onboarding: account creation → demo dashboard → verification only at live/deposit gate.
   - Persistent getting-started stepper until first bot/paper trade.
   - Fee/risk pre-confirmation card on every bot launch/order.
   - Dark-mode-first, Nordic-minimal design system unification.

## 3. What Is Out of Scope

- New trading strategies or asset classes.
- Native mobile app.
- New payment providers.
- Re-architecting the entire frontend component tree (covered by separate frontend cleanup).
- Replacing Supabase or Cloudflare Workers.

---

## 4. Architectural Principles

1. **One source of truth per concern.** One generated-types file, one user table, one automation config table, one trade ledger.
2. **Paper/live parity by environment swap.** Same strategy code, same risk validator, same executor — only the account/brokerage endpoint changes.
3. **Event-driven, append-only financial records.** Trades, orders, balance changes, and audit events are immutable; read models are projections.
4. **Defense in depth for live trading.** Idempotency + reconciliation + circuit breakers + kill switch + appropriateness gate.
5. **Trust before complexity.** Progressive disclosure, transparent fees/risk, and demo-first value.

---

## 5. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Interface Layer                           │
│  (Next.js 16 App Router, Server Components default, force-dynamic pages) │
│  Onboarding → Demo Dashboard → Portfolio/Bots → Order/Bot Launch Gate   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                          Application Services                            │
│  /api/cron/tick  →  ExecutorFactory  →  Paper/Binance Executor         │
│  /api/webhooks/* →  Signal Ingestion →  Idempotency + Deduplication    │
│  /api/cron/reconcile → Exchange state reconciliation                   │
│  Server Actions → Appropriateness gate, audit logging, GDPR requests   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           Data & State Layer                             │
│  Supabase Postgres:                                                      │
│    - event-sourced `trading_events` (orders, fills, balance changes)    │
│    - projection tables: `positions`, `balances`, `bot_health`           │
│    - `audit_events` with hash chain                                      │
│    - `idempotency_keys` with TTL and request fingerprint                │
│    - `appropriateness_assessments`                                       │
│  Supabase Edge Functions (reduced set): position-monitor, signal-engine │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                        Exchange & External APIs                          │
│  Binance (paper + live), TradingView webhooks, market data feeds        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Components & Data Flow

### 6.1 Database baseline & types

**Current problem:** `npm run db:gen-types` targets the wrong project ID; two generated-type files exist plus a stale hand-written file. Migration directory contains diagnostic scripts and remote-only patches.

**Design:**
- Update `package.json` `db:gen-types` to use `vuxbjlykgmzskxbclquf`.
- Delete `src/lib/supabase/database.types.ts` and `src/types/database.ts`; keep only `src/types/database.types.ts`.
- Move non-versioned repair scripts to `scripts/sql/diagnostics/`.
- Create a single baseline migration that reproduces the current production schema from a fresh `supabase db pull`.
- Add `db:status:ci --strict` and `db:lint:ci` to the pre-push gate.

### 6.2 Canonical user initialization

**Current problem:** Three overlapping triggers create default user data; `profiles` and `user_profiles` coexist; `paper_trading_sessions` was dropped and re-created.

**Design:**
- Audit all `auth.users` triggers and merge into one `handle_new_user()` function.
- Promote `user_profiles` as canonical; add deprecation comments/views for `profiles`.
- Initialize `trading_sessions` (not `paper_trading_sessions`) for every new user with paper mode active by default.
- Backfill existing users with a zero-downtime migration.

### 6.3 Trading-engine unification

**Current problem:** `supabase/functions/auto-trade/index.ts` duplicates signal generation, regime logic, sentiment, and execution; live branch is a stub; `run-backtest` uses inline SMA/RSI logic.

**Design:**
- Deprecate `auto-trade` edge function; remove from cron schedule.
- Extend `/api/cron/tick` to accept a list of auto-trading users or iterate over `user_auto_trading_configs`.
- Reuse `ExecutorFactory`, `executeTrade()`, FIFO ledger, canonical fill model, and risk validator.
- Add `idempotency_key` column to `trades` and `ai_decision_log`.
- Generate idempotency keys deterministically from `(user_id, strategy_id, signal_timestamp, action, symbol)`.
- Store idempotency records in Postgres with states `pending / completed / failed`, request hash, and TTL.
- Add `/api/cron/reconcile` that pulls Binance open orders, fills, and positions and emits alerts on drift.
- Port `run-backtest` edge function to call `backtestEngine.ts` / `resolveStrategy()`.

### 6.4 Idempotency primitive

**Design:**
```typescript
// src/lib/trading/idempotency.ts
export async function withIdempotency<T>(
  key: string,
  scope: string,
  requestHash: string,
  operation: () => Promise<T>
): Promise<T>
```
- Uses `INSERT ... ON CONFLICT DO NOTHING` into `idempotency_keys`.
- If state is `completed`, returns stored response.
- If state is `pending` and older than timeout, marks `failed` and retries.
- All order-creating paths (manual, auto, copy) must call this.

### 6.5 Reconciliation

**Design:**
- Hourly cron: query local trades in `submitted` state older than 5 minutes.
- Call Binance `GET /api/v3/order` for each.
- Update local state to `filled / canceled / expired` with actual fill price and fee.
- Emit Sentry alert + `bot_health` entry if local state diverges from exchange.

### 6.6 Audit & compliance

**Design:**
- New table `audit_events`:
  - `id` UUID, `occurred_at` timestamptz, `actor_id` UUID, `actor_type` (user/admin/system)
  - `action` enum, `resource_type`, `resource_id`, `session_id`, `ip_address`
  - `before_state` jsonb, `after_state` jsonb, `metadata` jsonb
  - `previous_hash` text, `event_hash` text (SHA-256 of serialized row + previous_hash)
- Hash chain makes tampering detectable.
- Log: login/logout, password reset, MFA changes, bot create/update/delete, trade/order lifecycle, API key CRUD, admin actions, data-export/deletion requests.
- Add `security_events` table for failed login attempts, OAuth errors, session refresh failures.

### 6.7 Appropriateness gate

**Design:**
- New table `appropriateness_assessments`:
  - `user_id`, `assessment_type` (ai_trading, margin, derivatives), `score`, `passed`, `warning_shown`, `user_decision`, `expires_at`
- Questionnaire stored in code as structured JSON; questions are objective (knowledge + experience), not “do you understand?”.
- If score below threshold, show interruption screen with clear warning and require explicit opt-in (not default proceed).
- Gate live-bot enablement, not paper trading or demo dashboard.

### 6.8 API-key security

**Design:**
- Reject keys with withdrawal permission at ingestion (`/api/binance/keys` validation).
- Encrypt keys at rest with `crypto.subtle` (AES-256-GCM) in a Cloudflare Worker/edge function; plaintext never in Postgres.
- Require IP allowlist to Klarpakke server egress IPs.
- UI reminders for 90-day rotation; one-click revoke; notification on new connection.
- Store key metadata (last four characters, created_at, expires_at, scopes) in Postgres.

### 6.9 GDPR export & erasure

**Design:**
- Server Action `requestDataExport()` → queues job → creates ZIP with user profile, trades, audit events.
- Server Action `requestAccountDeletion()` → anonymizes `user_profiles` PII, retains trades/audit events, logs deletion.
- 30-day SLA tracked in `gdpr_requests` table.

### 6.10 UX trust layer

**Design:**
- **Onboarding:** email/password only → immediate demo dashboard with sample bots and paper balance. KYC/verification triggered only on live-bot enablement or deposit.
- **Getting-started stepper:** visible until user has (a) connected exchange or paper mode, (b) created/copied first bot, (c) completed first paper trade.
- **Order/bot-launch confirmation card:** estimated entry/exit, slippage range, platform/subscription fee, total cash impact, max drawdown, plain-language risk line.
- **Design system:** dark-mode-first, desaturated semantic colors, monospaced numerals for prices, color-blind safe indicators (arrows/icons alongside red/green).

---

## 7. Error Handling & Reliability

1. **Database migrations:** run `db:lint` + `db:status` in CI; fail on drift.
2. **Idempotency:** duplicate key returns stored result; partial failure marks record `failed` and allows retry.
3. **Reconciliation:** divergence creates `bot_health` alert; never auto-correct without human review.
4. **Exchange API failures:** circuit breaker in `BinanceExecutor`; fallback to paper mode if live keys fail.
5. **Audit logging failures:** audit insert failures escalate to Sentry; operation is not blocked to avoid deadlock, but alert is P1.
6. **Appropriateness gate failures:** default to safest path (block live enablement) rather than allow.

---

## 8. Security & Compliance

1. **RLS:** all user/trading tables keep RLS; policies audited quarterly.
2. **MFA:** require TOTP/WebAuthn for admin users and for enabling live trading.
3. **Session:** shorten max age to 24h, add idle timeout, server-side invalidation.
4. **Cookies:** `httpOnly: true`, `sameSite: lax`, `secure: true` for auth cookies.
5. **CSP:** inject nonce into `script-src`; remove `unsafe-inline`.
6. **Secrets:** rotate `CRON_SECRET`; no hardcoded secrets in migrations.
7. **Audit:** immutable hash-chained `audit_events` retained per AML/statutory requirements.

---

## 9. Observability

1. **Metrics:** order submission success rate, reconciliation drift, Binance API latency P99, WebSocket reconnect rate, trade confirmation time.
2. **Traces:** OpenTelemetry spans across tick → signal → risk → execution → exchange.
3. **Logs:** structured JSON to GlitchTip; include `trace_id`, `user_id`, `bot_id`.
4. **Business SLOs:**
   - 99.9% order submission success (paper)
   - <60s trade confirmation time (p99)
   - <0.1% reconciliation divergence rate

---

## 10. Testing Strategy

1. **Unit:** idempotency logic, appropriateness scoring, hash-chain validation.
2. **Integration:** backtest/live parity tests, reconciliation loop against mocked Binance.
3. **E2E:** onboarding → demo → paper trade → live enablement gate.
4. **Migration tests:** apply baseline to fresh Supabase project, verify prod schema parity.
5. **Load:** simulate 1k concurrent paper trades, verify no duplicate orders.

---

## 11. Implementation Phases

**Phase 1 — Baseline & types (week 1)**
- Fix type generation project ID; canonicalize types file.
- Clean migration directory; create baseline.
- Canonical user-init trigger.

**Phase 2 — Trading engine unification (weeks 2–3)**
- Deprecate `auto-trade` edge function.
- Route auto-trades through `/api/cron/tick`.
- Implement idempotency primitive.
- Add reconciliation cron.
- Port `run-backtest` to canonical engine.

**Phase 3 — Compliance & audit (weeks 4–5)**
- `audit_events` + `security_events` tables.
- Appropriateness gate.
- API-key security hardening.
- GDPR export/erasure flow.

**Phase 4 — UX trust layer (weeks 6–7)**
- Progressive onboarding.
- Getting-started stepper.
- Fee/risk confirmation card.
- Dark-mode design-system unification.

**Phase 5 — Hardening & validation (week 8)**
- Full E2E, load tests, security review.
- Documentation update.
- Production rollout with feature flags.

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration drift not fully captured | Medium | High | Fresh prod backup + `supabase db diff` before baseline |
| Auto-trade deprecation breaks existing users | Medium | High | Feature flag; run both paths in shadow mode for 1 week |
| Idempotency key collisions | Low | High | Deterministic key includes sub-second jitter + user/strategy/timestamp/action |
| Exchange reconciliation alerts flood on Binance outage | Medium | Medium | Circuit breaker; batch alerts; distinguish infra vs drift |
| Appropriateness gate blocks conversion | Medium | Medium | A/B test copy; allow paper trading always; gate only live |
| Audit logging impacts write latency | Low | Medium | Async insert via Supabase Realtime/queue; do not block user path |
| GDPR deletion conflicts with AML retention | Low | High | Legal review; anonymize PII but retain transaction records |

---

## 13. Success Criteria

1. `npm run db:gen-types` produces zero uncommitted changes and one canonical file.
2. `db:status:ci --strict` passes in CI.
3. Auto-trading runs exclusively through `/api/cron/tick`; no duplicate trades in 7-day paper test.
4. 100% of order-creating paths use idempotency primitive.
5. Reconciliation job runs hourly with <0.1% divergence.
6. Appropriateness gate blocks 100% of unqualified live-bot enablements in testing.
7. Audit events cover all auth, trade, bot, admin, and API-key actions.
8. Onboarding drop-off rate reduced by 20% (measured via analytics).
9. Lighthouse score ≥ 90 on mobile dashboard.

---

## 14. Competitor Intelligence Summary

- **QuantConnect LEAN** and **HaasOnline** prove that one engine with pluggable handlers for backtest/paper/live is the right model.
- **Alpaca’s `paper=True`** shows that paper/live parity is an account toggle, not a code fork.
- **Robinhood EU, eToro, and MiFID II** require objective appropriateness tests that interrupt the flow with real warnings.
- **Monzo, Stripe, and Coinbase** show that idempotency keys + reconciliation + immutable ledgers are table stakes for financial operations.
- **TradingView and 3Commas** demonstrate that external signals should be ingested via webhooks with deterministic deduplication.
- **Nordic fintech trust** (Vipps/MobilePay, NORDNET, Avanza) is built on visual restraint, progressive disclosure, and regulatory transparency.

---

## 15. Open Questions Resolved

- **Which user table is canonical?** `user_profiles`.
- **Which Supabase project for types?** `vuxbjlykgmzskxbclquf`.
- **Paper/live boundary?** Same code path; toggle via account/environment.
- **Auto-trade edge function?** Deprecated; route through tick.
- **Live trading gate?** Appropriateness assessment + MFA + paper track record.

---

*Next step: create detailed implementation plan via writing-plans skill.*
