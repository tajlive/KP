# Jokertrade Pipeline

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## JokerTrade Pipeline (v4.1 — 2026-07-29, oppryddet + optimalisert)

JokerTrade er FULLT operativt med ekte trading for ALLE paper-brukere. **v5-funksjoner ble fjernet 2026-07-29 fordi de var ulogiske eller blokkerte all handel** (se pitfall #17).

### Arkitektur — enkel, vedlikeholdbar, testbar

```
Cron hvert 15. min → jokertrade-ping.sh (10 kall, 0 LLM-tokens)
  → POST /api/jokertrade (cron-secret)
  → Velg round-robin auto-bruker (eldst sist handlet)
  → fetchMarketData() — ekte Binance-priser via binance-proxy EF
  → generateJokerSignal() — RSI + MACD + Bollinger + SMA (vektet scoring, se references/joker-signal-strategy.md)
  → getCoinWinRate() — justerer confidence basert på historisk P&L per coin
  → ensureActiveSession() — gjenbruk aktiv ELLER ny med paper_balance
  → checkExits() — dynamic SL/TP (vol + conf based, se klarpakke-trading-guards §10)
  → dynamicPositionPct() — 2-10% justert for volatilitet
  → MIN_ORDER_NOK guard (per-coin fallback-priser, USDT-aware)
  → executeTrade() → joker_trade + joker_explanation
  → Bulk heartbeat på ALLE aktive sessions
```

### Dashboard — /dashboard/jokertrade

Client-side page (`src/app/[locale]/(user)/dashboard/jokertrade/page.tsx`):
- Total P&L (realisert fra `trades.realized_pnl`)
- Win-rate (positive / total closed)
- Per-coin breakdown (handler, P&L, win-rate)
- Siste handler med `joker_explanation`

API: `GET /api/jokertrade` returnerer `{ trades, sessions, balance, analytics: { totalPnl, winRate, totalTrades, winningTrades, losingTrades, byCoin } }`

⚠️ **CRITICAL:** Client-side `fetch()` til autentiserte API-endepunkter MÅ ha `{ credentials: "include" }` — uten dette sendes ikke auth-cookies og API returnerer 401 "Unauthorized". Se `references/dashboard-auth-fix.md`.

### v4.1 — Hva er beholdt vs fjernet

| Beholdt ✅ | Fjernet ❌ (og hvorfor) |
|-----------|------------------------|
| Ekte Binance-priser | ~~Markedsregime-filter~~ — blokkerte ALLE handler (crypto er alltid volatilt) |
| RSI+MACD+Bollinger+SMA signal (generateJokerSignal) | ~~Sentiment-agent (F&G)~~ — BTC-sentiment for DOGE/AVAX er ulogisk |
| Dynamisk sizing 2-10% | ~~Trailing stop-loss~~ — `open_position` sporet kun siste trade |
| Dynamisk SL/TP (vol + conf) | ~~Hardkodet TP +3%/SL +5%~~ — erstattet med dynamicExits() |
| MIN_ORDER_NOK guard | ~~getRealAvailableCapital~~ — ga 100 kr minimum, verre UX enn phantom-kapital |
| Session reuse | ~~Signal guard~~ — for komplisert for enkel RSI-agent |
| Script-cron (0 tokens) | |
| joker_explanation i dashboard | |

### Systemnivå — ALLE brukere (viktig: round-robin design)

Dette er IKKE per-bruker. JokerTrade v4.2 opererer på systemnivå:
- **Cron velger ÉN bruker** per POST-kall via **round-robin** (eldst sist handlet først)
- `ensure_active_sessions_for_all()` sikrer ALLE auto-brukere har aktiv session hver cykel
- **Bulk heartbeat** på ALLE aktive sessions — hindrer crash mellom cykler
- `ensureActiveSession()` oppretter/gjenbruker session med `last_heartbeat=NOW()`
- **Session crasher ALDRI** for auto-trading-brukere — `NOT EXISTS atc` guard i session_maintenance
- Handler merkes `joker_trade: true` for sporbarhet


