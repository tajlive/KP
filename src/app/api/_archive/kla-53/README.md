# KLA-53: Arkiverte API-endepunkter

## Bakgrunn
Disse API-endepunktene ble arkivert som del av KLA-53 (Database Arkitektur Konsolidering).

## Problem
Endepunktene brukte legacy tabeller:
- `auto_trading_sessions`
- `auto_trading_trades`
- `auto_trading_strategies`
- `auto_trading_backtests`
- `auto_trading_settings`
- `auto_trading_config`

## Erstattet av
- `/api/trading/sessions` - Bruker canonical `trading_sessions` tabell
- `/api/trading/execute` - Bruker canonical `trades` tabell
- `/api/trading/mode` - Håndterer paper/live mode

## Arkiverte endepunkter

| Endepunkt | Legacy Tabell(er) | Erstattet av |
|-----------|-------------------|--------------|
| /auto-trading/backtest | auto_trading_strategies, auto_trading_backtests | - (må reimplementeres) |
| /auto-trading/copy | auto_trading_sessions, auto_trading_trades | /api/copy-trading/* |
| /auto-trading/execute-trade | auto_trading_trades | /api/trading/execute |
| /auto-trading/leaderboard | leaderboard_entries | materialized view leaderboard |
| /auto-trading/live/* | auto_trading_sessions, auto_trading_trades | /api/trading/* |
| /auto-trading/mistakes | auto_trading_sessions | - (må reimplementeres) |
| /auto-trading/paper/* | auto_trading_trades, auto_trading_sessions | /api/trading/* |
| /auto-trading/recommendations | auto_trading_strategies | - (må reimplementeres) |
| /auto-trading/sessions | auto_trading_sessions | /api/trading/sessions |
| /auto-trading/settings | auto_trading_settings | - (må reimplementeres) |
| /auto-trading/start | auto_trading_sessions | /api/trading/sessions (POST) |
| /auto-trading/stop | auto_trading_sessions | /api/trading/sessions (PATCH) |
| /auto-trading/strategies | auto_trading_strategies | - (må reimplementeres) |
| /auto-trading/tiers | - | - |

## Dato arkivert
2026-03-01 (KLA-53)
