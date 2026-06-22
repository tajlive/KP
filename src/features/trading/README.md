# Trading Feature

Core trading flow: order entry, execution, active sessions, bot/automation and strategy configuration.

## Scope

Components in this folder belong to the trading journey:
- Order entry / ticket
- Active positions / sessions
- Bot / auto-trading configuration
- Signal feed and trade history

## Rules

- Modus-specific differences (paper vs live) must live in execution adapters only.
- Use the canonical trading data layer for prices, instruments, risk, P&L and order planning.
- Mobile-first: all primary actions must be reachable within four taps from the bottom navigation.
