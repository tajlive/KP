# KLA-53: Arkiverte Trading Migrasjoner

## Bakgrunn
Disse migrasjonene ble arkivert som del av KLA-53 (Database Arkitektur Konsolidering) for å eliminere duplikate trading-systemer.

## Problem
Systemet hadde 3 parallelle trading-implementasjoner:
1. **user_strategies + trades + user_portfolios** (fra 001_trading_system.sql)
2. **user_auto_trading_configs + auto_trading_sessions + auto_trading_trades** (gammel auto-trading)
3. **paper_simulations + paper_trades + leaderboard_entries** (gammel paper trading)

Dette skapte data-inkonsistens og forvirring.

## Løsning
Alt konsolideres til ett canonical schema i `001_core_schema.sql`:
- `user_profiles` - Brukerprofil og preferanser
- `trading_sessions` - Paper/live sessions
- `trades` - ALLE trades (append-only event log)
- `copy_trading_follows` - Copy trading relasjoner
- `copy_trade_queue` - Fan-out buffer
- `notification_queue` - Email/SMS kø
- `leaderboard` - Materialized view

## Arkiverte filer

| Fil | Tabeller opprettet | Erstattet av |
|-----|-------------------|--------------|
| 001_trading_system.sql | user_strategies, trades, user_portfolios, grid_bot_state, onboarding_progress, leaderboard | 001_core_schema.sql |
| 20260131100000_real_trading.sql | real_trading_configs, real_trades, exchange_credentials | 001_core_schema.sql (trades med mode='live') |
| 20260201160000_paper_trading.sql | risk_presets, paper_simulations, paper_trades, leaderboard_entries, saved_strategies | 001_core_schema.sql |
| 20260206090000_paper_trading.sql | (duplikat paper trading) | 001_core_schema.sql |
| 20260208000000_add_auto_trading.sql | user_strategies, auto_trading_configs (gammel) | 001_core_schema.sql |

## Hvis du trenger å gjenopprette
1. Sjekk ut denne mappen fra git-historikk
2. Kjør migrasjonene manuelt i Supabase SQL Editor
3. Migrer data fra canonical tabeller tilbake

## Dato arkivert
2026-03-01 (KLA-53)
