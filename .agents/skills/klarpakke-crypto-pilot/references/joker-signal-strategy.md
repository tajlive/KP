# JokerTrade — Multi-Indikator Signalstrategi

**Kilde:** `src/app/api/jokertrade/signal.ts`  
**Tester:** `src/app/api/jokertrade/__tests__/signal.test.ts`  
**Integrert i:** `route.ts` via `generateJokerSignal(market, winMultiplier)`

Erstatter den gamle `generateSignal()` (ren RSI + trend) med en vektet multi-indikator scoring.

## Innputt

```typescript
type MarketData = {
  currentPrice: number;
  rsi: number;
  macd: { histogram: number; signal: number; macd: number };
  bollinger: { upper: number; middle: number; lower: number };
  sma10: number;
  sma30: number;
  volatility: number;
  trend: "up" | "down" | "flat";
};
```

## Scoring (base = 50, nøytral)

| Indikator | Vilkår | Poeng | Maks |
|-----------|--------|-------|------|
| **RSI** | oversold (< 30) | +25 | ±25 |
| | moderat bullish (50-65) | +10 | |
| | overkjøpt (> 70) | -25 | |
| | moderat bearish (35-50) | -10 | |
| **MACD** | bullish + smaBullish | +20 | ±20 |
| | bullish + !smaBullish | +10 | |
| | bearish + smaBearish | -20 | |
| | bearish + !smaBearish | -10 | |
| **Bollinger** | pris under lower band + !down-trend | +15 | ±15 |
| | pris over upper band + !up-trend | -15 | |
| **SMA-crossover** | sma10 > sma30 + opptrend | +10 | ±10 |
| | sma10 < sma30 + nedtrend | -10 | |
| **Volatilitet** | `Math.min(20, Math.max(-10, (50 - vol) / 5))` | -10 til +20 | |

Deretter multipliseres score med `winMultiplier` (0.7–1.3x) og normaliseres til [0, 99].

## Beslutning

| Confidence | Action |
|------------|--------|
| ≥ 65 | BUY (hvis score ≥ 50 etter multiplier) |
| ≤ 35 | SELL (hvis score < 50 etter multiplier) |
| 36–64 | WAIT |

## Tester (8 stk)

Kjøres via `vitest`:

```
✓ RSI oversold + MACD bullish → BUY med høy confidence
✓ RSI overkjøpt + MACD bearish → SELL med høy confidence
✓ pris under Bollinger lower → BUY
✓ pris over Bollinger upper → SELL
✓ SMA10 > SMA30 i opptrend → BUY signal
✓ nøytral RSI + nøytral MACD → WAIT
✓ win multiplier booster confidence
✓ win multiplier reduserer confidence
```

## Viktig for subagenter som endrer signalet

- `winMultiplier` sendes direkte til `generateJokerSignal(market, winMultiplier)` — **ikke** juster confidence i etterkant.
- Score-aksen er 0–99 **før** multiplier; multiplier kan presse confidence til 99 uansett utgangspunkt.
- `const action = score >= 50 ? "BUY" : "SELL"` — beslutningen baseres på **rå score**, ikke confidence (som er clamped).
- Dersom `fetchMarketData()` ikke returnerer MACD/Bollinger/SMA-data, utvides den til å returnere fullt `MarketData`-objekt. Se `route.ts` for hvordan markedsdata hentes.
