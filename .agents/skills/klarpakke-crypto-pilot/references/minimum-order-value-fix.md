# Minimum Order Value Fix (2026-07-29)

## Problem

JokerTrade's `executeTrade()` rejected trades with:
```
Order value 4.74 below minimum 10.00
```

Root cause: `positionValue` was computed in NOK, but `executeTrade()` internally converts to USDT using an internal exchange rate. When the binance-proxy returned errors (timeout/network), the fallback price was hardcoded to 60,000 (BTC price), causing non-BTC coins to get `quantity = NOK / 60,000` → tiny total → below 10 USDT minimum.

## Solution: Per-coin fallback prices + USDT-aware guard

```typescript
const FALLBACK_PRICES: Record<string, number> = {
  BTCUSDT: 60000,
  ETHUSDT: 2500,
  SOLUSDT: 25,
  AVAXUSDT: 18,
  DOGEUSDT: 0.12,
};

// In trade execution:
const rawValueNok = session.capital * (sizingPct / 100);
const nokPerUsdt = 12; // Conservative rate for guard
const usdtValue = rawValueNok / nokPerUsdt;
const finalValueNok = usdtValue < 10 ? 120 : Math.max(rawValueNok, 120);
const quantity = finalValueNok / price; // price is from FALLBACK_PRICES if binance-proxy fails
```

## Why 12 NOK/USDT?

Conservative estimate ensures the guard always works. Actual rate is ~7.3, but 12 gives safety margin. If the rate ever goes above 12, increase this.

## Lessons

1. **Never use a single hardcoded fallback price** — BTC's 60,000 makes all other coins tiny
2. **Guard in absolute terms, not percentages** — `MIN_ORDER_NOK = 150` was insufficient because the executor's internal conversion differs
3. **Test each coin individually** — what works for BTC may fail for DOGE
