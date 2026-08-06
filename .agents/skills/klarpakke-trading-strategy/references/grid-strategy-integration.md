# Grid Strategy — Aktivering og Pitfalls

## Hvorfor grid

Intern fasit 2026-08-02: 78 BTC-trades, 0 vinnere, profit factor 0.01. Multi-signal (RSI+trend) taper i sideways-markeder. Crypto er ~70% sidelengs → grid trading er verdensledende (Pionex, Bitsgap, 3Commas).

## Arkitektur

```
src/lib/trading/grid-strategy.ts
  └─ calculateOptimalGrid(price, volatility, capital) → { lowerPrice, upperPrice, gridLevels, spreadPct }
  └─ generateGridLevels(config) → GridLevel[]  (10 nivåer)
  └─ evaluateGridSignal(config, levels, currentPrice) → { action, level, reason }

src/app/api/pilot-engine/route.ts
  └─ strategyType = userConfig?.strategy ?? "grid"
  └─ if strategyType === "grid": generateGridLevels → evaluateGridSignal → execute trade
  └─ Grid-state i trading_sessions.strategy_config (JSONB, grid_levels[])
```

## Aktivering i DB

```sql
UPDATE auto_trading_configs SET strategy = 'grid' WHERE is_enabled = true;
```

**ALDRI stol på `config.type`-fallback:** Gammel kode (2026-07) sjekket `userConfig?.config?.type` SOM FALLBACK før `strategy`-kolonnen. Alle 11 brukere hadde `config.type: 'pilot'` → `strategyType = 'multi_signal'` → grid ALDRI aktivert til tross for at `strategy`-kolonnen var satt til `'grid'`.

**Fiks (2026-08-02):** `userConfig?.strategy ?? 'grid'` — én kilde, ingen fallback. `config` er legacy og ignoreres.

## Grid pitfalls

1. **Sell-first**: Sjekk ALLTID kjøpte celler FØR tomme. Kjøp-først logikk blokkerer profitt når pris stiger.
2. **Celle-basert evaluering**: `find()` over alle nivåer fanger feil nivå. Bruk `cellIndex = floor((price - lower) / step)`.
3. **Utenfor grid = WAIT**: Pionex-standard — bot pauses utenfor range. Ikke følg markedet.
4. **Grid-state**: `trading_sessions.strategy_config.grid_levels[]` JSONB, muteres hver trade.

## 3Commas/Bitsgap research (2026-08-02)

- **COMBO-bot** (Bitsgap): Grid + DCA = vinner i 2026
- **Multi-TP**: 25/25/50% scale-out (Fase 3 i plan)
- **AI-optimalisering**: ATR-basert grid-bredde, regime-deteksjon (Fase 5)
- **Pionex AI Grid 2.0**: auto-kalkulerer range fra volatilitet
