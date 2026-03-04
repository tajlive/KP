# KLA-53: Database Arkitektur Konsolidering - Endringslogg

## Oppsummering
Eliminert 3 parallelle trading-systemer og etablert én canonical trading-arkitektur med EN sann datamodell.

## Arkitektur-før
- **System 1:** `user_strategies` + `trades` + `user_portfolios` (001_trading_system.sql)
- **System 2:** `user_auto_trading_configs` + `auto_trading_sessions` + `auto_trading_trades` (auto_trading)
- **System 3:** `paper_simulations` + `paper_trades` + `leaderboard_entries` (paper_trading.sql)

## Arkitektur-etter
- **Canonical:** `user_profiles` + `trading_sessions` + `trades` + `copy_trading_follows`

## Migrasjoner Arkivert

| Fil | Årsak |
|-----|-------|
| `001_trading_system.sql` | Duplikat - erstattet av 001_core_schema.sql |
| `20260131100000_real_trading.sql` | Legacy real_trades tabell |
| `20260201160000_paper_trading.sql` | Legacy paper_simulations, paper_trades |
| `20260206090000_paper_trading.sql` | Duplikat paper trading |
| `20260208000000_add_auto_trading.sql` | Legacy auto_trading_configs |

**Arkivplassering:** `/supabase/migrations/_archive/kla-53/`

## Kode-filer Arkivert

| Fil | Årsak |
|-----|-------|
| `AutoTradingDashboard.tsx` | Brukte legacy tabeller |
| `PlanSelectionWizard.tsx` | Brukte legacy tabeller |
| `src/app/api/auto-trading/*` | 17 endepunkter med legacy tabeller |

**Arkivplassering:** 
- `/src/components/_archive/kla-53/` (slettet pga broken imports)
- `/src/app/api/_archive/kla-53/`

## Tabeller Fjernet

### Legacy tabeller (droppes ved migrering):
- `paper_simulations`
- `paper_trades`
- `leaderboard_entries`
- `saved_strategies`
- `auto_trading_sessions`
- `auto_trading_trades`
- `user_auto_trading_configs`
- `auto_trading_strategies`
- `auto_trading_backtests`
- `auto_trading_settings`
- `real_trading_configs`
- `real_trades`
- `exchange_credentials`
- `user_strategies`
- `user_portfolios`
- `grid_bot_state`
- `onboarding_progress`

### Canonical tabeller (nye):
- `user_profiles` - Brukerprofil og preferanser
- `trading_sessions` - Paper/live sessions med mutable state
- `trades` - Append-only event log (ALLE trades)
- `copy_trading_follows` - Copy trading relasjoner
- `copy_trade_queue` - Fan-out buffer for copy trading
- `notification_queue` - Email/SMS kø
- `leaderboard` - Materialized view (regenereres)

## API-endepunkter Endret

### Oppdatert:
| Endepunkt | Endring |
|-----------|---------|
| `/api/trading/sessions` | Oppdatert til canonical schema kolonner |
| `/api/admin/stats` | Endret fra auto_trading_config til trading_sessions |

### Arkivert:
- `/api/auto-trading/backtest/*`
- `/api/auto-trading/copy/*`
- `/api/auto-trading/execute-trade/*`
- `/api/auto-trading/leaderboard/*`
- `/api/auto-trading/live/*`
- `/api/auto-trading/mistakes/*`
- `/api/auto-trading/paper/*`
- `/api/auto-trading/quick-backtest/*`
- `/api/auto-trading/recommendations/*`
- `/api/auto-trading/recover/*`
- `/api/auto-trading/session/*`
- `/api/auto-trading/sessions/*`
- `/api/auto-trading/settings/*`
- `/api/auto-trading/start/*`
- `/api/auto-trading/stop/*`
- `/api/auto-trading/strategies/*`
- `/api/auto-trading/tiers/*`

## Frontend-komponenter Endret

### Oppdatert:
| Komponent | Endring |
|-----------|---------|
| `trading-api.ts` | Full refactor til canonical tabeller |
| `UnifiedTradingDashboard.tsx` | Property-navn: `strategy_type` → `strategy_id`, `pnl` → `realized_pnl`, etc |
| `ActiveStrategiesSection.tsx` | Property-navn oppdatering |
| `RecentTradesSection.tsx` | Property-navn oppdatering |
| `StrategySelectorSection.tsx` | Property-navn oppdatering |
| `ClientAutoTradingPage.tsx` | Endret til UnifiedTradingDashboard + ExchangeApiSettings |

### Arkivert:
- `AutoTradingDashboard.tsx`
- `PlanSelectionWizard.tsx`

## Type-endringer

### Trade interface:
```typescript
// Før:
interface Trade {
  symbol: string;
  amount: number;
  pnl: number;
  strategy_type: string;
  ...
}

// Etter:
interface Trade {
  trading_pair: string;    // was: symbol
  total_value: number;     // was: amount
  realized_pnl: number;    // was: pnl
  strategy_signal: { strategy_type?: string };  // was: strategy_type
  ...
}
```

### UserStrategy interface:
```typescript
// Før:
interface UserStrategy {
  strategy_type: StrategyType;
  ...
}

// Etter:
interface UserStrategy {
  strategy_id: StrategyType;  // was: strategy_type
  strategy_config: Record<string, unknown>;
  ...
}
```

## Database Schema-endringer

### trading_sessions tabell:
```sql
-- Nye kolonner:
- strategy_id (TEXT) - unified identifier
- strategy_config (JSONB) - flexible configuration
- risk_level (risk_level ENUM)
- phase (trading_phase ENUM)
- open_position (JSONB)
- max_drawdown_pct

-- Fjernede kolonner:
- strategy (TEXT) - erstattet av strategy_id
- params (JSONB) - erstattet av strategy_config
- allocated_capital_pct
- risk_config
```

### trades tabell:
```sql
-- Nye kolonner:
- idempotency_key (TEXT, UNIQUE) - prevents duplicates
- order_type (order_type ENUM)
- is_copy (BOOLEAN)
- leader_trade_id (UUID)
- strategy_signal (JSONB)
- executed_at (TIMESTAMPTZ)

-- Fjernede kolonner:
- amount_nok
- exit_price
- pnl_pct
- ai_explanation
- closed_at
```

## RLS Policies

Alle canonical tabeller har RLS enabled med policies:
- `user_profiles`: read/update own profile
- `trading_sessions`: manage own sessions
- `trades`: see own trades (+ service_role bypass)
- `copy_trading_follows`: manage own follows
- `notification_queue`: see own notifications
- `copy_trade_queue`: service_role only

## Triggers

- `on_auth_user_created`: Auto-creates user_profiles on signup
- `on_trade_update_session`: Updates session state after trade insert
- `on_trade_notify`: Queues notification on trade

## Cron Jobs

- `refresh-leaderboard`: Every minute
- `detect-crashed-sessions`: Every minute

## Verifisering

### TypeScript:
```bash
✅ npx tsc --noEmit  # Ingen feil
```

### ESLint:
```bash
✅ npm run lint  # Passerer med eksisterende warnings
```

## Migrerings-instruksjoner

Se: `/docs/db/kla-53-nuke-and-pave.md`

### Kortversjon:
1. Backup database
2. Kjør `nuke` SQL for å droppe legacy tabeller
3. Kjør `001_core_schema.sql`
4. Verifiser at canonical tabeller finnes
5. Test med ny bruker

## Risikoer

### Høy risiko:
- Alle eksisterende trades i legacy tabeller vil være utilgjengelige etter migrering
- **Løsning:** Eksporter data før migrering hvis historikk er viktig

### Medium risiko:
- Auto-trading endepunkter er arkivert - funksjonalitet må reimplementeres
- **Løsning:** Bruk `/api/trading/sessions` og `/api/trading/execute`

### Lav risiko:
- PlanSelectionWizard er fjernet - wizard-flyt må redesignes
- **Løsning:** Bruk eksisterende UnifiedTradingDashboard

## Testing

- [x] TypeScript build passerer
- [x] ESLint passerer
- [x] Legacy imports fjernet
- [x] Canonical schema komplett
- [x] RLS policies definert

## Deploy-sjekkliste

- [ ] Kjør `nuke-and-pave` i staging først
- [ ] Verifiser at login fungerer
- [ ] Verifiser at trading dashboard laster
- [ ] Verifiser at session kan opprettes
- [ ] Verifiser at trade kan opprettes (via API)
- [ ] Deploy til produksjon
- [ ] Monitorere error logs

## Referanser

- Linear Issue: [KLA-53](https://linear.app/klarpakke/issue/KLA-53)
- Runbook: `/docs/db/kla-53-nuke-and-pave.md`
- Arkiv: `/supabase/migrations/_archive/kla-53/`

## Ansvarlig
Kimi 2.5 Code - 2026-03-01
