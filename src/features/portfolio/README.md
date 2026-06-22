# Portfolio Feature

Core portfolio flow: holdings, P&L, performance analytics, history and asset detail.

## Scope

Components in this folder belong to the portfolio journey:
- Portfolio overview / dashboard
- Position lists and detail
- Performance charts and KPIs
- Trade history and results
- Asset detail pages (when primarily portfolio-context)

## Rules

- Keep components free of trading-execution logic.
- Use the canonical trading data layer (`src/lib/trading/canonical/`) for prices, P&L and risk data.
- Mobile-first: all primary actions must be reachable within four taps from the bottom navigation.
