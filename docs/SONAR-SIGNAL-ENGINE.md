# 🧠 Klarpakke: Sonar Signal Engine
> Arkitekturdokument — Sist oppdatert: 2026-03-28

## Overordnet arkitektur

```
Binance WebSocket / REST (gratis)
  ↓  live 5m candles
SignalEngine (Edge Function)
  ↓  RSI + MACD + BB + Volume beregnet live
Sonar-pro via @ai-sdk/perplexity  ← GRATIS for Klarpakke (API-nøkkel i repo)
  ↓  confluence-score + norsk forklaring + kildelenker
Confluent Filter (>= 3 signaler)
  ↓  kun sterke setups
Safety Layer (risk-validator)
  ↓  posisjonsstørrelse, daglig tap-limit
Trade Executor (paper/live)
```

## Sonar-modeller (kostnad)

| Modell | Latency | Kostnad | Bruk i Klarpakke |
|--------|---------|---------|------------------|
| sonar | ~1s | $5/1M tokens | Signal-scan (bulk) |
| sonar-pro | ~2s | $15/1M tokens | Trade-analyse |
| sonar-reasoning | ~5s | $8/1M tokens | Forklaring til bruker |

**Estimert kostnad per bruker/dag: < $0.01** (10 signalsjekker à 500 tokens = 5000 tokens)

## Signal-flyt: Tre lag

### Lag 1: Tekniske indikatorer (0 kostnad)
- RSI(14): oversold < 30, overbought > 70
- MACD(12/26/9): bullish/bearish crossover
- Bollinger Bands(20/2): squeeze + breakout
- Volume: spike > 2x 20-snitt
- Markedsregime: 50-EMA vs pris

### Lag 2: Sonar Confluence Scorer
Sonar-pro mottar tekniske indikatorer + live nyheter og returnerer:
```json
{
  "confluence_score": 0.82,
  "direction": "BUY",
  "strength": "STRONG",
  "norwegian_reason": "BTC bryter motstand med høyt volum. RSI vender fra oversold.",
  "risk_factors": ["Fed-møte om 2 timer"],
  "sources": ["coindesk.com/...", "cointelegraph.com/..."]
}
```

### Lag 3: Confluent Filter
Handle KUN når confluence_score >= 0.70 OG minst 3 av 5 tekniske indikatorer er enige.

## UI: Swipe-kort med levende forklaringer
Hvert signal presenteres som et swipe-kort:
- Sveip høyre = godkjenn signal
- Sveip venstre = ignorer
- Tekst + ikoner oppdateres dynamisk per signal
- Norsk forklaring fra Sonar vises direkte på kortet

## Dokumentasjon oppdatert
- AUTO-TRADE-PLAN.md: Signal-arkitektur lagt til
- ml-risk-assessment.ts: Erstattet hardkodet med ekte Binance-data + Sonar
- analyze-trade/route.ts: Oppgradert til sonar-pro med confluence-output
