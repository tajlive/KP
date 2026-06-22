# Market / Watchlist Feature

Core market flow: watchlists, top movers, asset discovery, asset detail in a market context.

## Scope

Components in this folder belong to the market journey:
- Watchlist / top movers
- Asset list / discovery
- Asset detail (market context)
- Market pulse / news feed

## Rules

- Read-only market data components.
- Use the canonical market-data provider (`src/lib/trading/canonical/market-data/`).
- Mobile-first: all primary actions must be reachable within four taps from the bottom navigation.
