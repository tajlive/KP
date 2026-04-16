# TASK-ARCHITECTURE-REFACTOR-001: P&L and Balance Consolidation

## Objective
Refactor the Dashboard metrics to use a single "Source of Truth" for user capital and live trades, removing legacy database dependencies and preventing UI desync.

## Instructions for KIMI
1. **Analyze dependencies**: Review `src/app/[locale]/(user)/dashboard/page.tsx` and `src/features/dashboard/DashboardContent.tsx`.
2. **Remove Deprecated Tables**:
   - In `dashboard/page.tsx`, remove the query to `auto_trading_trades`.
   - Replace it by querying `trades` (the live table). Ensure you query trades joined with `session_id` matching the user's active session, returning `symbol, side, quantity, price, status, realized_pnl as pnl, created_at, executed_at`.
3. **Consolidate Capital Source of Truth**:
   - In `dashboard/page.tsx`, stop propagating `profile.paper_balance` to the dashboard for live visual representations if `activeSession` exists.  
   - Propagate `activeSession.current_capital_nok` as the primary balance metric to `DashboardContent`.
   - Update `DashboardContent.tsx` if necessary so it receives and prioritizes the active session capital over the static profile capital.
4. **Compile and Test**: 
   - Run `npm run type-check` and `npm run lint` to ensure no Typescript errors exist due to the table shift from `auto_trading_trades` to `trades`.
5. **Report**: Ensure the UI only displays the real live numbers.
