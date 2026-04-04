# AI Trading Architecture — Klarpakke

> Oppdatert: 2026-04-04

## Oversikt

Klarpakke bruker en 3-lags AI-beslutningsmotor for alle auto-trades. Ingen handler utføres uten å passere gjennom alle tre lagene.

## Pipeline

```
Signal (SMA/DCA/Grid)
        │
        ▼
┌─────────────────────────────────────┐
│  LAG 1: REGIME-DETEKSJON            │
│  src/services/regimeDetector.ts     │
│                                     │
│  Indikatorer: EMA21/55/200, ADX14,  │
│  RSI14, Bollinger Width             │
│  Cache: regime_cache (4H TTL)       │
│                                     │
│  BEAR → positionSizeMul = 0 (BLOKK) │
└────────────┬────────────────────────┘
             │ regimeMul: 0.0–1.0
             ▼
┌─────────────────────────────────────┐
│  LAG 2: SONAR NEWS-FILTER           │
│  src/lib/ai/sonar/marketSentiment.ts│
│                                     │
│  Kilde: Perplexity Sonar Pro        │
│  Cache: sonar_sentiment_cache (15m) │
│                                     │
│  avoid + confidence > 0.7 → BLOKK   │
└────────────┬────────────────────────┘
             │ sentimentMul: 0.75–1.0
             ▼
┌─────────────────────────────────────┐
│  LAG 3: KOMBINERT UTFØRELSE         │
│  supabase/functions/auto-trade/     │
│                                     │
│  finalSize = base                   │
│            × regimeMul              │
│            × sentimentMul           │
│  Logg → ai_decision_log             │
└─────────────────────────────────────┘
```

## Regime-strategi mapping

| Regime      | Pos.størrelse | Max pos. | Stop-loss | Tilnærming        |
|-------------|--------------|----------|-----------|-------------------|
| BULL        | 100%         | 3        | 1.0×      | trend-following   |
| BULL_WEAK   | 75%          | 2        | 1.0×      | trend-following   |
| SIDEWAYS    | 60%          | 2        | 1.5×      | grid/mean-rev.    |
| UNCERTAIN   | 30%          | 1        | 1.2×      | defensiv          |
| BEAR_WEAK   | 35%          | 1        | 0.8×      | dca-defensiv      |
| BEAR        | 0% (BLOKK)   | 0        | 0.8×      | flat/halt         |

## Sonar blokkering

- **Blokker:** `recommendation === 'avoid' && confidence > 0.70`
- **Reduser størrelse:** `sentiment === 'bearish'` → `sizeMul × 0.75`
- **Pass gjennom:** `sentiment === 'bullish'` → ingen endring
- **Fail-open:** Hvis Sonar er nede → pipeline fortsetter uten Sonar-lag

## Viktige filer

| Fil | Ansvar |
|-----|--------|
| src/services/regimeDetector.ts | Regime-klassifisering |
| src/services/indicators.ts | EMA/ADX/RSI/BB beregninger |
| src/lib/ai/sonar/marketSentiment.ts | Sonar API-kall + cache |
| src/lib/ai/sonar/types.ts | TypeScript-typer |
| src/lib/ai/sonar/config.ts | Prompt-templates |
| supabase/functions/auto-trade/index.ts | Hoved-pipeline |
| src/features/trading/MarketIntelligencePanel.tsx | UI-panel |
| src/app/api/market-intelligence/route.ts | REST-endepunkt |

## Kalkulator-presets

Alle avkastningstall i UI hentes fra:
`src/features/landing/backtestPresets.ts`

Hook: `useBacktestEstimate(profile, months, amount)`

**ALDRI hardkod avkastningstall andre steder.**
Én sannhetskilde for landing, paper og live.

## Neste steg (planlagt)

- [ ] Multi-asset (BTC, ETH, SOL parallelt)
- [ ] 4H-timeframe for SMA-crossover
- [ ] AI Trade Journal (ukentlig coaching)
- [ ] Live Binance OHLCV feed til backtestPresets
