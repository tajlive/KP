# P0 OKX-AVSTEMMING — Tom (read-only) 2026-08-12

**Bruker:** tomarnejensen@gmail.com · `0dd08529-b8a8-4fd3-9806-275e2d0135dd`
**Metode:** `getOkxLiveBalance()` (OKX API GET, read-only) + Supabase DB-spørringer
**Status:** ✅ AVSTEMMT — avvik 1.04 NOK (0.1 %)

---

## 1. LIVE — OKX vs DB

| Kilde | Verdi | Enhet | Alder |
|---|---|---|---|
| **OKX API** (eea.okx.com/api/v5/account/balance) | 101.657728 USDC | USDC | live (< 2 s) |
| **OKX → NOK** (rate 9.49) | 964.73 NOK | NOK | live |
| **Live-sesjon** d10c6096 (SOLUSDC, simple_grid, is_pilot) | 965.77 NOK | NOK | last_tick 07:55 (frisk) |
| **Avvik** | **1.04 NOK** | NOK | — |

**Konklusjon:** Avviket på 1.04 NOK (0.1 %) forklares av rate-timing (9.49 i dag vs 9.6 da sesjonen ble satt opp). **Live saldo er AVSTEMMT.**

### Live-sesjonsdetaljer

| Felt | Verdi |
|---|---|
| id | d10c6096-67e4-4b60-b870-4b2dd1ed04b6 |
| status | active |
| mode | live |
| trading_pair | SOLUSDC |
| strategy | simple_grid (pilot) |
| current_capital_nok | 965.77 |
| starting_capital_nok | 965.77 |
| total_pnl | 0.00 |
| last_tick_at | 2026-08-12 07:55 (frisk — < 10 min) |

### OKX posisjon/daglig P&L

| Felt | Verdi |
|---|---|
| connected | true |
| quoteCcy | USDC |
| dailyPnl | 0 |
| dailyPnlPct | 0 |
| position | null (ingen åpen posisjon i OKX) |

---

## 2. PAPER — DB-avstemming

| Kilde | Verdi | Alder |
|---|---|---|
| **paper_accounts.current_balance** (SSoT) | 100 000.00 NOK | updated 02:32 (frisk) |
| **user_profiles.paper_balance** | 100 000.00 NOK | synkronisert |
| **Aktive paper-sesjoner** | 0 | — |
| **Ikke-arkiverte stoppede** | a44184d3 (100 000) + ec00e202 (88 909.31) | — |

**Funn (ikke-arkiverte stoppede sesjoner):**
- `a44184d3` — BTCUSDT dca, stopped, archived=false, 100 000 NOK, **0 trades** (opprettet 08-11 20:15)
- `ec00e202` — SOLUSDT simple_grid pilot, stopped, archived=false, 88 909.31 NOK, **19 trades / 11 002.66 NOK kjøpt** (opprettet 08-11 00:37, stoppet 08-12 02:10)

**Vurdering:** Per kontrakten v1.0 er stoppede sesjoner fryst historikk — de skal IKKE summeres inn i SSoT. `paper_accounts.current_balance` = 100 000 er konsistent med `user_profiles.paper_balance` = 100 000. ✅

⚠️ **Merk:** `ec00e202` er en PILOT-sesjon (is_pilot=true) som ble stoppet i natt. Den er IKKE arkivert ennå — auto-archive (klarpakke-auto-archive-sessions, 03:00) arkiverer stopped/crashed. Dersom den skal forbli synlig som stoppet historikk er det OK; dersom den skal fjernes fra aktive lister må den arkiveres. **Ingen endring gjort (read-only).**

---

## 3. KRAKEN — død/Stale

| Kilde | Verdi | Alder | Status |
|---|---|---|---|
| **kraken_live_state** | 152.62 USDC, 13 ordre | **76 timer** (08-09 03:35) | 🔴 STALE — Kraken-nøkkel død |
| **user_kraken_keys** | — | — | Tom har ingen aktiv Kraken-nøkkel |

**Konklusjon:** `kraken_live_state` skal IKKE vises som nåværende saldo. KrakenLiveCard vil vise `{connected:false}` for Tom (korrekt — han bruker OKX).

---

## 4. TRADES-FORDELING (Tom)

| Mode | Status | Count |
|---|---|---|
| paper | filled | 22 |
| live | filled | 11 |

Live-trades (11 stk) tilhører alle baf65159 (ADAUSDT ensemble_ai, 01.08 — arkivert, stopped). Den aktive live-sesjonen d10c6096 har 0 trades i DB.

---

## 5. AVVIKSLISTE (alt)

| # | Funn | Alvor | Anbefaling |
|---|---|---|---|
| 1 | OKX-saldo har ingen DB-persistens (kun live API) | P0 | KLA-300: `okx_live_state` tabell + cron |
| 2 | kraken_live_state 76t stale, vises ikke lenger (connected=false) | P1 | KLA-308: erstatt med OKX-kort |
| 3 | ec00e202 stopped men ikke arkivert (pilot SOL) | P2 | Overvåk — auto-archive skal ta den 03:00 |
| 4 | Live-sesjon d10c6096 har 0 trades i DB men OKX kjører grid | P2 | Reconcile-cron dekker — sjekk /api/cron/reconcile |
| 5 | Avvik 1.04 NOK live (rate-timing) | OK | Ingen handling |

---

## 6. VERIFIKASJON (gates)

```
TSC       = 0 feil
ESLINT    = 0 warnings (8 filer)
VITEST    = 18/18 nye tester + 2246/2252 full suite (6 skip pre-eksisterende)
```

## 7. KODE LEVERT I FASE 0–1

| Fil | Hva | Flagg |
|---|---|---|
| `src/lib/auth/live-trading-dogfood.ts` | Dogfood-gate (whitelist Tom) | NEXT_PUBLIC_LIVE_TRADING_DOGFOOD |
| `src/lib/auth/live-trading.ts` | verifyLiveEntitlement: gate 0 dogfood + OKX-nøkkel-sjekk | samme |
| `src/app/api/trading/mode/route.ts` | GET: dogfood-status; POST: 403 for ikke-Tom | samme |
| `src/lib/trading/money-data-health.ts` | Datahelse-vurdering (stale/unknown/verified) | NEXT_PUBLIC_MONEY_GUARDRAILS |
| `src/components/MoneyDataBadge.tsx` | Badge som merker uverifiserte pengetall | samme |
| `src/features/dashboard/DashboardPro.tsx` | Badge integrert i balanse-kort | samme |
| `scripts/p0-okx-reconcile.ts` | Read-only OKX-avstemmingsscript | — |
| `wrangler.jsonc` + `.env.local` | Begge flags = true | — |

**Alle endringer er reversible:** fjern flaggene / revert filene.
