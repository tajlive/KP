# JokerTrade v5 — Competitor Research & Optimization Drivers

**Sesjon:** 2026-07-29 kveld
**Kilde:** web_search av best crypto trading bots 2026, Reddit-tråder, Medium-artikler, konkurrentanalyse av SaintQuant/3Commas/Cryptohopper

---

## Hovedfunn — Hva gjør konkurrentene bedre?

### 1. SaintQuant (#1 rangert 2026) — "Vet når den IKKE skal handle"
- Markedsregime-filter som hopper over handler i kaotiske, flate, eller illikvide markeder
- "A genuine AI trading bot knows when NOT to trade. That's where most retail bots fail."
- Implementert som `assessMarketRegime()` i JokerTrade v5

### 2. Sentiment-drevne agenter utkonkurrerer tekniske
- Trader tapte $14 000 på CCI/RSI-boter, snudde til profit med sentiment-agenter
- "During a Reddit-led squeeze, the CCI bot sees 'overbought' and sells. The AI Agent looks at sentiment velocity and realizes the squeeze is just beginning. It holds. That's the difference between 2% and 40% profit."
- Implementert som `fetchFearGreedIndex()` (alternative.me API) i JokerTrade v5
- Fear & Greed: <30 = Extreme Fear → kjøp (kontrær). >70 = Extreme Greed → selg

### 3. Trailing stop-loss er bransjestandard
- 3Commas, Coinrule, Cryptohopper — alle tilbyr trailing stop-loss
- Beskytter gevinst: selger når prisen faller X% fra toppen, ikke fra inngang
- Implementert i `checkExits()`: -5% fra `highest_price` (lagret i `open_position`)

### 4. Null oppsett — "zero configuration"
- SaintQuant krever ingen konfigurasjon — én knapp, ferdig
- Vi krever auto_trading_configs. Løses delvis av `enableAutoTradingForPaperUsers()`

### 5. 70-90% av retail traders taper penger (2026 data)
- Hovedårsaker: ingen stop-loss, overleverage, emosjonell trading, overtrading
- Vår respons: stop-loss + trailing stop + signal guard + markedsregime-filter

---

## Konkurrent-sammenligning (2026)

| Feature | SaintQuant | 3Commas | CryptoHopper | JokerTrade v5 |
|---------|:--:|:--:|:--:|:--:|
| AI-ensemble | ✅ | ❌ | ✅ | ✅ (12+1 agenter) |
| Markedsregime-filter | ✅ | ❌ | ❌ | ✅ |
| Sentiment-analyse | ❌ | ❌ | ⚠️ | ✅ (F&G) |
| Trailing stop-loss | ✅ | ✅ | ✅ | ✅ |
| Portfolio rebalansering | ✅ | ✅ | ✅ | ❌ |
| Copy trading | ❌ | ✅ | ✅ | ❌ |
| Backtesting | ✅ | ✅ | ✅ | ❌ |
| Multi-exchange | ✅ | ✅ | ✅ | ❌ |
| Null oppsett | ✅ | ❌ | ❌ | ⚠️ (auto-enable) |
| Gratis (paper) | ❌ | ❌ | ❌ | ✅ |

---

## Kilder
- blockster.com/best-ai-crypto-trading-bots-in-2026-ranked-reviewed-and-actually-compared
- medium.com — "I lost $14,000 testing crypto bots — here's what actually works"
- crypto.news/5-ai-trading-bots-for-2026
- tradezella.com/blog/trading-mistakes
- fxstreet.com — SaintQuant 7 best crypto trading strategies
