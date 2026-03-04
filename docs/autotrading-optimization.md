# Klarpakke Auto-Trading Optimalisering

## Executive Summary

Optimalisert basert på:
- **Konkurrentanalyse:** 3Commas (87% win rate, 29.4% ROI), Pionex Grid (84% win rate, 22.1% ROI), Freqtrade (65% win rate)
- **Akademisk research:** Kelly Criterion, volatility-based sizing, institutional risk management
- **Community insights:** Reddit r/algotrading, Freqtrade GitHub, crypto trading forums

**Key improvements:**
1. **Position sizing:** Kelly Criterion (conservative: f*/2, moderate: 2f*/3, aggressive: f*) med volatility-adjustment
2. **Risk:reward ratios:** Minimum 1:2 (basert på institutional standards)
3. **Stop-loss levels:** Optimalisert per risk profile (2% / 3.5% / 6%)
4. **Realistic paper trading:** Simulerer slippage (0.1-0.5%), fees (0.1%), og partial fills
5. **Systematic testing:** Backtest → Paper (7d) → Live-micro (14d) → Live-full

---

## Nåværende vs. Optimalisert

### FØR (Eksisterende kode)

| Parameter | Conservative | Moderate | Aggressive |
|-----------|-------------|----------|------------|
| Stop Loss | 1% | 2% | 3% |
| Position Size | 2% | 5% | 10% |
| Daily Loss | 5% | 10% | 20% |
| Max Drawdown | 10% | 15% | 25% |
| Leverage | 1x | 1x | 2x |

### ETTER (Optimalisert)

| Parameter | Conservative | Moderate | Aggressive |
|-----------|-------------|----------|------------|
| Stop Loss | 2% | 3.5% | 6% |
| Position Size | 5% | 8% | 12% |
| Take Profit | 4.5% | 9% | 18% |
| Risk:Reward | 1:2.25 | 1:2.57 | 1:3 |
| Daily Loss | 2% | 5% | 10% |
| Max Drawdown | 10% | 15% | 25% |
| Leverage | 1-2x | 2-3x | 3-5x |
| Kelly Fraction | 0.5 (Half) | 0.67 (2/3) | 1.0 (Full) |

---

## Benchmark vs. Konkurrenter

| Metric | Klarpakke (Target) | 3Commas | Pionex | Freqtrade |
|--------|--------------------|---------|--------|-----------|
| Win Rate | 55-70% | 87% | 84% | 65% |
| Profit Factor | >1.5-2.3 | >2.0 | >1.8 | 1.8 |
| Max Drawdown | 10-25% | 8.3% | 11.5% | 12% |
| Sharpe Ratio | 1.1-1.8 | N/A | N/A | 1.5 |

**ANALYSE:** Våre targets er konservative men realistic for retail algo trading.
Grid bots (3Commas, Pionex) har høyere win rate men fungerer kun i sideways markets.
Vårt oppsett er designet for både trend og sideways markets.

---

## Risk Profiles - Full Specification

### Conservative (Kapitalpreservering)

**Beskrivelse:** Fokus på kapitalbevaring, steady growth. Lav risiko, konsistente gevinster.

**Position Sizing:**
- Kelly Fraction: 0.5 (Half Kelly)
- Max Position: 5% av portfolio
- Min Position: $20
- Volatility Adjustment: Ja (ATR-based)

**Exit Levels:**
- Stop Loss: 2% (tight)
- Take Profit: 4.5% (1:2.25 ratio)
- Trailing Stop: 1%

**Leverage:**
- Max: 2x
- Default: 1x (ingen leverage)

**Portfolio Limits:**
- Max Open Positions: 3
- Max Daily Loss: 2%
- Max Total Drawdown: 10%

**Trading Frequency:**
- Min Interval: 30 minutter
- Max Trades/Day: 8

**Asset Filters:**
- Min Liquidity: $50M 24h volume
- Allowed Pairs: BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT
- Max Spread: 0.1%

**Performance Targets:**
- Win Rate: 58%
- Profit Factor: 1.6
- Sharpe Ratio: 1.1

---

### Moderate (Balansert vekst)

**Beskrivelse:** Balansert mellom vekst og sikkerhet. Moderat volatilitet for bedre avkastning.

**Position Sizing:**
- Kelly Fraction: 0.67 (2/3 Kelly)
- Max Position: 8% av portfolio
- Min Position: $15
- Volatility Adjustment: Ja

**Exit Levels:**
- Stop Loss: 3.5%
- Take Profit: 9% (1:2.57 ratio)
- Trailing Stop: 1.5%

**Leverage:**
- Max: 3x
- Default: 2x

**Portfolio Limits:**
- Max Open Positions: 5
- Max Daily Loss: 5%
- Max Total Drawdown: 15%

**Trading Frequency:**
- Min Interval: 15 minutter
- Max Trades/Day: 15

**Asset Filters:**
- Min Liquidity: $20M 24h volume
- Allowed Pairs: BTC, ETH, BNB, SOL, ADA, DOT, MATIC, AVAX
- Max Spread: 0.2%

**Performance Targets:**
- Win Rate: 65%
- Profit Factor: 2.0
- Sharpe Ratio: 1.5

---

### Aggressive (Maksimal vekst)

**Beskrivelse:** Maksimal vekst, aksepterer høyere risiko. Kun for erfarne tradere.

**Position Sizing:**
- Kelly Fraction: 1.0 (Full Kelly)
- Max Position: 12% av portfolio
- Min Position: $10
- Volatility Adjustment: Ja (KRITISK for aggressive)

**Exit Levels:**
- Stop Loss: 6% (wider for volatility)
- Take Profit: 18% (1:3 ratio)
- Trailing Stop: 2.5%

**Leverage:**
- Max: 5x (institutional limit)
- Default: 3x

**Portfolio Limits:**
- Max Open Positions: 8
- Max Daily Loss: 10%
- Max Total Drawdown: 25%

**Trading Frequency:**
- Min Interval: 5 minutter
- Max Trades/Day: 30

**Asset Filters:**
- Min Liquidity: $5M 24h volume
- Allowed Pairs: 12+ pairs inkl. LINK, UNI, ATOM, FTM
- Max Spread: 0.5%

**Performance Targets:**
- Win Rate: 70%
- Profit Factor: 2.3
- Sharpe Ratio: 1.8

---

## Testing Protocol

Alle strategies MÅ gjennomføre 4-stage pipeline før full deployment:

### Stage 1: Backtest (30+ dager)

**Formål:** Validere edge mot historical data

**Kriterier:**
- Win Rate: ≥55%
- Profit Factor: ≥1.5
- Max Drawdown: ≤10%
- Sharpe Ratio: ≥1.0
- Min Trades: 50
- Duration: 30+ dager

**Hvis fails:** Juster parametere, re-run

---

### Stage 2: Paper Trading (7+ dager)

**Formål:** Real-time testing med realistic fills/slippage/fees

**Kriterier:**
- Win Rate: ≥50%
- Profit Factor: ≥1.3
- Max Drawdown: ≤12%
- Sharpe Ratio: ≥0.8
- Min Trades: 20
- Duration: 7+ dager

**Hvis fails:** Analyser forskjell fra backtest

---

### Stage 3: Live Micro (14+ dager, 1% portfolio)

**Formål:** Validering med REAL penger ($50-100 minimum)

**Kriterier:**
- Win Rate: ≥45%
- Profit Factor: ≥1.2
- Max Drawdown: ≤15%
- Sharpe Ratio: ≥0.7
- Min Trades: 30
- Duration: 14+ dager

**Hvis fails:** STOPP - ikke øk allocation

---

### Stage 4: Live Full (continuous)

**Formål:** Full deployment etter verifisert performance

**Kriterier:**
- Maintain consistency fra Stage 3
- Monitor drawdown, win rate, profit factor kontinuerlig
- Stopp auto hvis drawdown > profile limit

---

## Slippage & Fees Realisme

### Paper Trading Problem

Naiv paper trading overvurderer performance med **15-30%** fordi den:
- Antar perfekte fills
- Ignorerer slippage
- Ikke simulerer fees
- Fyller limit orders 100%

### Vår Løsning

**Slippage Simulation:**
```typescript
// Base slippage: 0.1% (BTC/ETH normal conditions)
// Volume impact: +slippage for store orders
// Volatility multiplier: +slippage i høy vol

// Eksempel: $10,000 order i BTC under høy vol
// = 0.1% base + 0.05% volume + 0.2% vol = 0.35% slippage
```

**Fee Simulation:**
```typescript
// Binance: 0.1% maker/taker (0.075% med BNB)
// Round-trip: 0.2% total

// Eksempel: $10,000 position
// Entry: $10 fee
// Exit: $10 fee
// Total: $20 (0.2%)
```

**Limit Order Fill Rate:**
- Paper: 75% fill rate (realistisk)
- Live: 90%+ (order book depth)
- Naiv paper: 100% (unrealistisk)

---

## Kilder & Referanser

### Konkurrent Data
- 3Commas AI Trading Bot Performance (2025)
- Pionex Grid Bot Backtest Results (Reddit r/Pionex)
- Freqtrade GitHub Community Backtests
- Best AI Trading Bot 2025 (+298% ROI, 93% win rate)

### Akademisk Research
- Kelly Criterion: Optimal Position Sizing (mbrenndoerfer.com)
- Volatility-Adjusted Position Sizing (HyperQuant.tech)
- Institutional Risk Management Best Practices

### Trading Research
- Alpaca Markets: Paper vs. Live Trading Analysis (2025)
- Interactive Brokers: Trading Cost Analysis
- Binance Fee Schedule

---

## Filer Opprettet

| Fil | Beskrivelse |
|-----|-------------|
| `src/lib/config/optimized-risk-profiles.ts` | Optimaliserte risk profiles med Kelly Criterion |
| `src/lib/trading/paper-trade-simulator.ts` | Realistic paper trading med slippage/fees |
| `src/lib/trading/backtester.ts` | Backtesting framework med ATR calculation |
| `src/lib/testing/test-pipeline.ts` | 4-stage test pipeline konfigurasjon |

---

## Neste Steg

1. **Integrere** nye risk profiles i eksisterende auto-trading kode
2. **Kjøre backtest** for alle tre risk levels
3. **Starte paper trading** (7 dager minimum)
4. **Monitorere** results og justere parametere
5. **Deploye til live** kun etter successful test pipeline

---

*Sist oppdatert: 2026-02-24*
