# Handelsmotor-arkitektur: Lekepenger og Ekte Penger

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Dokumenter og verifiser hvordan trading-motorene er satt opp for paper (lekepenger) og live (ekte penger) — inkludert strategi-registrering, tick-flyt, exchange-kobling, og status per 2026-08-10.

**Architecture:** Begge moduser bruker SAMME tick-motor (`/api/cron/tick`) men med ulike executor-veier: paper = `PaperExecutor` (simulert), live = `OkxExecutor` (ekte OKX API). Strategiene er registret i `strategyRegistry` og mappes via `resolveTickStrategyEngineKey`.

**Tech Stack:** Next.js 16 API Routes, Supabase (trading_sessions, user_okx_keys), Cloudflare Workers (cron), OKX API (eea.okx.com), Kraken API (fallback).

---

## Nåværende tilstand (verifisert 2026-08-10)

### Motor-kjerne
- **Tick-motor:** `src/app/api/cron/tick/route.ts` — kjører hvert 5. min via pg_cron (`klarpakke-trading-tick`, jobid 1143)
- **Strategi-registry:** `src/lib/trading/strategies/index.ts` — `strategyRegistry` med alle registrerte strategier
- **Alias-resolver:** `src/lib/trading/strategy-id-aliases.ts` — `resolveTickStrategyEngineKey()` mapper `strategy_id` til motor-nøkkel
- **Engine-config:** `src/lib/trading/strategy-configs.ts` — `engineDefaults` med parametere per motor

### Registrerte strategier (i registry)
| Strategi | Motor | Status |
|----------|-------|--------|
| `max_aggressive` | `MaxAggressiveGridStrategy` | ✅ Registrert (2026-08-09) |
| `dca` | `DCAStrategy` | ✅ |
| `trend_follow` | `TrendFollowStrategy` | ✅ |
| `multi_signal` | `MultiSignalStrategy` | ✅ |
| `grid` | `GridBotStrategy` | ✅ |
| `ai_copy` | `AICopyStrategy` | ✅ |
| `hybrid_arbitrage` | `HybridArbitrageStrategy` | ✅ |
| `ensemble_ai` | `EnsembleAIStrategy` | ✅ |

### Lekepenger (Paper)
| Komponent | Implementasjon | Status |
|-----------|---------------|--------|
| Executor | `PaperExecutor` (simulert) | ✅ |
| Saldo-kilde | `paper_accounts.current_balance` (SSoT) | ✅ Fikset 2026-08-10 |
| Sesjoner | `trading_sessions` med `mode='paper'` | ✅ |
| Tick-kjøring | Ja, hvert 5. min | ✅ |
| Aktive sesjoner | Tom: 1 aktiv (99 646,50 kr) | ✅ |

### Ekte penger (Live)
| Komponent | Implementasjon | Status |
|-----------|---------------|--------|
| Executor | `OkxExecutor` (eea.okx.com) | ✅ Fikset 2026-08-09 |
| Nøkkel-kilde | `user_okx_keys` (kryptert i DB) | ✅ |
| Saldo-valuta | USDC (ikke USDT) | ✅ Fikset 2026-08-09 |
| Sesjoner | `trading_sessions` med `mode='live'` | ✅ |
| Toms sesjon | `d10c6096` — **status: stopped** | 🔴 |

---

## Kritisk funn: Toms live-sesjon er stopped

**Sesjon `d10c6096-67e4-4b60-b870-4b2dd1ed04b6`:**
- `status: stopped` (ikke `active`)
- `last_tick_at: 2026-08-09 23:05:03` (stoppet for ~2 timer siden)
- `total_trades: 0` — ingen ordre plassert
- `last_status_message: "Max Aggressive 5x SOL-USDC (EU/eea.okx.com) — klar for tick"`

**Konsekvens:** Tick-motoren hopper over stoppede sesjoner. Ingen bevegelse på OKX fordi sesjonen ikke er aktiv.

---

## Plan: Gjenopprette live-trading (etter godkjenning)

### Task 1: Undersøk hvorfor sesjonen ble stopped (read-only)

**Objective:** Finn ut hva som stoppet sesjonen — kill-switch, feil, eller manuell stopp.

**Files:**
- Read: `src/app/api/cron/tick/route.ts:1560-1585` (permanent stop-logikk)
- Read: `src/lib/trading/liquidation-guard.ts` (kill-switch)
- Query: `audit_events` for sesjon `d10c6096`

**Step 1:** Sjekk om `liquidation-guard` eller annen guard stoppet sesjonen
**Step 2:** Sjekk om det var en `permanent` feil (bad keys, permissions)
**Step 3:** Rapporter funn — IKKE restart uten Tom-godkjenning

---

### Task 2: Verifiser at live-kjeden er komplett (read-only)

**Objective:** Bekreft at alle 7 ledd i live-kjeden er operative.

**Sjekkliste:**
- [ ] `user_okx_keys` har aktiv rad for Tom
- [ ] `strategyRegistry["max_aggressive"]` returnerer strategi
- [ ] `resolveTickStrategyEngineKey("max_aggressive")` → `max_aggressive`
- [ ] `engineDefaults["max_aggressive"]` har config
- [ ] `OkxExecutor.fromUser()` returnerer executor
- [ ] OKX API (eea.okx.com) svarer med saldo 151.84 USDC
- [ ] `OKX_ENABLED=true` i CF secrets

---

### Task 3: Dokumenter motor-arkitektur (ingen endringer)

**Objective:** Lag en oversikt som viser hvordan paper og live er koblet sammen.

**Deliverable:** Markdown-diagram eller tabell som viser:
- Tick → strategi-resolver → engine-config → executor → exchange
- Forskjeller: Paper (simulert) vs Live (OKX API)
- Hvor `mode` påvirker flyten

---

## Risikoer og åpne spørsmål

1. **Hvorfor stoppet sesjonen?** — Ukjent. Kan være kill-switch (3% daglig tap), permanent feil, eller manuell stopp. Må undersøkes før restart.
2. **Er 151.84 USDC nok for 5x grid?** — Strategien krever 100% kapital i 5x posisjon. Ved 151.84 USDC blir hvert grid-nivå ~7.59 USDC. Lavt, men teknisk mulig.
3. **Er liquidation guard aktiv?** — 3% daglig tap = 45 USDC. Hvis SOL faller 3% på 5x, stopper sesjonen igjen.

## Anbefaling

**Ikke restart sesjonen ennå.** Først:
1. Finn ut hvorfor den stoppet (Task 1)
2. Bekreft at Tom vil kjøre 5x leveraged grid med 151.84 USDC
3. Eventuelt: øk kapital eller reduser leverage før restart

---

## Neste handling

Venter på Toms beslutning:
- **A:** Undersøk hvorfor sesjonen stoppet (read-only, ingen endringer)
- **B:** Restart sesjonen (krever eksplisitt godkjenning)
- **C:** Øk kapital før restart (Tom må overføre mer til OKX)
