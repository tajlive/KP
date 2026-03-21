# Bevis: Resultatside (`/dashboard/resultater`) viser ikke-null tall uten `realized_pnl`

## Problem

Paper-handler ble lagret med `total_value` (NOK i `execute-paper-trade`) men **uten** `realized_pnl`.  
`buildTradingAnalytics` brukte kun `realized_pnl` → alle summer 0, «Unknown P&L», flate grafer.

## Løsning

- `src/lib/trading/build-trading-analytics.ts`: `effectivePnlDelta()` — bruker `realized_pnl` når satt, ellers **signert notional** (`buy` → −|total_value|, `sell` → +|total_value|).
- `aggregates.totalEffectivePnl` — sum av `effectivePnlDelta` per rad (i tillegg til eksisterende `totalRealizedPnl` / vinnrate kun på kjente realiserte).
- `TradingResultsDashboard`: KPI og akser bruker `totalEffectivePnl` + `useCurrency().format` (NOK → USD/EUR etter sidevalg).

## Verifikasjon

```bash
npx vitest run src/lib/trading/build-trading-analytics.test.ts
```

Forventet: alle tester grønne, inkl. «uses signed total_value when realized_pnl is null».

## Merknad

Signert notional er **ikke** samme som regnskapsmessig realisert avkastning på lukkede posisjoner; det gir likevel meningsfull kurve og netto flyt for manuelle paper-fyll der DB ikke har lukket P&L.
