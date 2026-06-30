# ADR 2026-06-30: Isolerte database-typer for Trading Cockpit

## Status

Godkjent og implementert.

## Kontekst

`src/types/database.types.ts` hadde driftet fra produksjonsskjemaet over tid. Ved regenerering fra live Supabase-DB oppstod **265 type-feil i 56 filer**. Størsteparten av feilene lå utenfor Trading Cockpit Fase 1-arbeidet:

- Auto-trading settings-kolonner (`auto_trading_enabled` → `is_enabled`, `max_position_percent` → `max_position_size_percent`, `daily_trade_limit` → `max_daily_trades`)
- `trade_status`-enum-verdier (`"executed"` finnes ikke i produksjon; riktig er `"filled"`)
- Fjernede/omdøpte kolonner i `trades`, `paper_trades`, `profiles`, `portfolios`, m.m.

Samtidig er Fase 1-koden (trading-cockpit) avhengig av korrekte typer for `trading_sessions`, `trades` og de tilhørende RPC-ene (`get_trades_paginated`, `get_trading_analytics`, `get_dashboard_metrics`, `calculate_effective_pnl`).

## Beslutning

1. **Rulle tilbake** den brede regenereringen av `src/types/database.types.ts`.
2. **Isolere** cockpit-relevante, produksjonskorrekte typer i `src/features/trading-cockpit/cockpit-database.types.ts`.
3. **Omdirigere** Fase 1-kode til å importere `CockpitDatabase` fra den nye filen.
4. **Beholde** resten av kodebasen på den gamle types-filen inntil en dedikert oppryddingssak gjennomføres.

## Konsekvenser

### Fordeler

- `npm run type-check` er grønn uten masse `@ts-expect-error` eller `as`-cast i hele kodebasen.
- Trading Cockpit Fase 1 bygger på korrekte, produksjonsverifiserte typer.
- Resten av systemet forblir stabilt (ingen utilsiktede type-endringer i auto-trading, admin, academy, etc.).
- Risikoen for runtime-feil fra feilaktige status/enums reduseres i cockpit.

### Ulemper / teknisk gjeld

- Midlertidig to-sannheter-situasjon: én types-fil for cockpit, én for resten.
- `src/server/dashboard/getUserDashboardMetrics.ts` bruker fortsatt `Database` fra hovedtyper fordi den er delt på tvers av mange konsumenter. Dette er OK så lenge hovedtyper er rullet tilbake.
- `getCockpitInitialData.ts` trengte en `as TradingSessionSummary[]`-cast fordi `createClient()` returnerer `SupabaseClient<Database>`.

## Migreringsvei

1. På et senere tidspunkt regenereres `src/types/database.types.ts` fra produksjon på kontrollert vis.
2. Type-feil rettes domene for domene (auto-trading, trading-status, admin/analytics, academy, etc.) i dedikerte PR-er.
3. Når hovedtypes-filen er korrekt, slettes `src/features/trading-cockpit/cockpit-database.types.ts` og Fase 1-kode bytter tilbake til `Database`.

## Verifikasjon

```bash
npm run type-check
```

Forventet resultat: ingen feil.

## Referanser

- `src/features/trading-cockpit/cockpit-database.types.ts`
- `src/features/trading-cockpit/types.ts`
- `src/features/trading-cockpit/server/getCockpitInitialData.ts`
- Backup: `src/types/database.types.ts.backup-20260630-020327`
