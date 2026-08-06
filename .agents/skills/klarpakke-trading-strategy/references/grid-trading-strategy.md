# Grid Trading — Klarpakke (Pionex/3Commas-standard)

> Implementert: 2026-08-02. Deployet: `v865228cb5`. 11/11 tester. 1732/1732 ingen regresjoner.

## Hvorfor grid?

Intern trading-fasit (2026-08-02): 78 BTC-trades med multi-signal (RSI+trend), **0 vinnere**. Profit factor ~0.01. Multi-signal taper i sideways/svingende markeder — ~70% av crypto.

Grid er verdensledende (Pionex 3M+ brukere, Bitsgap 800k+, 3Commas #1) fordi:
- **Kjøp lavt, selg høyt** i volatilitetsdefinerte intervaller
- **Profitabel i sideways** — marginale gevinster akkumuleres
- **AI-kalkulerte parametere** basert på ATR(14)
- **Bitsgap COMBO** (Grid + DCA) er gullstandarden

## Modul: `src/lib/trading/grid-strategy.ts`

### Eksporterte funksjoner

| Funksjon | Beskrivelse |
|---|---|
| `calculateOptimalGrid(price, volatility, capital)` | lower/upper/levels/spread fra ATR |
| `generateGridLevels(config)` | 10 nivåer med buyPrice/sellPrice/amount |
| `evaluateGridSignal(config, levels, price)` | BUY/SELL/WAIT — celle-basert, sell-first |

### Signal-evaluering (kritisk logikk)

```
1. Utenfor [lower, upper] → WAIT (standard Pionex — bot pauses)
2. cellIndex = floor((price - lower) / step)
3. SELL: cellen ELLER cellen-under er "bought" OG price ≥ sellPrice → SELL
4. BUY: cellen er "empty" OG price ≤ buyPrice → BUY
5. Ellers → WAIT
```

**Sell-first:** exits ALLTID først. Hvis kjøp sjekkes før salg, blokkeres profitt når pris stiger.

## Integrasjon i pilot-engine

```typescript
// src/app/api/pilot-engine/route.ts
const strategyType = userConfig?.strategy ?? "grid";  // grid = ny default

if (strategyType === "grid") {
  const gridParams = calculateOptimalGrid(price, market.volatility, capital);
  const levels = generateGridLevels(gridConfig);
  const signal = evaluateGridSignal(gridConfig, levels, price);
  // State i trading_sessions.strategy_config.grid_levels (JSONB)
}
```

## DB-migrasjon (2026-08-02)

```sql
-- Før: 11 aktive brukere med strategy='cryptopilot' → multi-signal (tap)
-- Etter: strategy='grid' → Pionex-standard
UPDATE auto_trading_configs SET strategy = 'grid' 
WHERE strategy = 'cryptopilot' AND is_enabled = true;
-- Verifisert: 11 rows, strategy=grid gruppert
```

**Pitfall — `config.type` fallback:** Gammel kode sjekket `userConfig?.config?.type` som fallback før `strategy`-kolonnen. Alle hadde `config.type: 'pilot'` som ga `strategyType = 'multi_signal'` — grid ble ALDRI valgt. Fiks: forenkle til `userConfig?.strategy ?? 'grid'`.

**API-default endret:** `pilot-engine/route.ts` linje 548: `(userConfig?.config as { type?: string })?.type ?? "multi_signal"` → `userConfig?.strategy ?? "grid"`.

## Test-fiksing (3 rotårsaker)

| # | Symptom | Rotårsak | Fiks |
|---|---|---|---|
| 1 | Pris < lowerPrice → WAIT i stedet for BUY | Grid pauser utenfor range (Pionex-standard) | Pris må være INNENFOR [lower, upper] |
| 2 | Pris ≥ sellPrice → BUY i stedet for SELL | Kjøp sjekket FØR salg | Sell-first: exits før entries |
| 3 | Pris mellom nivåer → BUY på feil nivå | `find()` fanget alle nivåer under pris | Celle-basert: kun NÆRMESTE celle |

## Sammenligning med konkurrenter

| Feature | Pionex | 3Commas | Bitsgap | Klarpakke |
|---|---|---|---|---|
| Grid | ✅ AI auto-range | ✅ Manuell | ✅ | ✅ ATR-basert |
| DCA | ✅ Martingale | ✅ | ✅ COMBO | ⚠️ Planlagt |
| Multi-TP | ❌ | ✅ | ✅ | ⚠️ Fase 3 |
| Marketplace | ❌ | ✅ | ✅ | ⚠️ Fase 4 |
| Paper trading | ✅ | ✅ | ✅ | ✅ 100 000 kr |

## Research-kilder (2026-08-02)

- **crypto.news**: «Grid bots and DCA bots dominate retail bot trading in 2026»
- **altFINS**: «Bitsgap COMBO bot combines DCA with grid — best overall»
- **Phemex Q1 2026**: Futures Grid #1 profitable strategy in sideways
- **Reddit r/algotrading**: PF 1.91 / 34% win rate = suksess. Separat risk layer anbefalt
- **Bitsgap**: «GRID bots catch even the fastest changes»
- **Pionex AI 2.0**: «Improved backtesting accuracy, increased grid profitability»
