# JokerTrade Integration — CryptoPilot Ensemble + Trade Execution

**Historikk:**
- v1 (før 2026-07-27): `Math.random()` for alt — coin, action, sentiment, confidence
- v2 (2026-07-27): 12-agent CryptoPilot ensemble, men fortsatt fake priser (`Math.random()` for RSI/MACD) og KUN analyse i `market_intelligence` — INGEN trade-execution
- v3 (2026-07-29): Ekte Binance-priser via proxy, `executeTrade()`, cron-secret, joker_trade-merking
- v4 (2026-07-29): Auto-session, exit-logikk, dynamisk posisjonsstørrelse, auto-enable for alle paper-brukere

## v4 — Full pipeline (nåværende)

```typescript
// POST /api/jokertrade — v4
// 1. Cron-secret → iterer brukere med auto_trading_configs
// 2. ensureActiveSession() → opprett session hvis ingen
// 3. checkExits() → selg ≥3% profit posisjoner
// 4. EKTE priser via Binance-proxy (alle symboler)
// 5. 12 agenter stemmer med ekte RSI/volatilitet
// 6. Signal guard validerer
// 7. dynamicPositionPct() → justert for volatilitet × confidence
// 8. executeTrade() → faktisk handel
// 9. joker_trade: true merking
```

### Dynamisk posisjonsstørrelse

```
Posisjon% = BASE(5%) × volFactor(0.3-1.0) × confFactor(0.5-1.5)
Klemt mellom MIN(2%) og MAX(10%)

volFactor = 1 - volatility/200  → høyere volatilitet = mindre posisjon
confFactor = 0.5 + confidence/100 → høyere confidence = større posisjon
```

### Auto-trading enable

`enableAutoTradingForPaperUsers()`: finner alle `paper_accounts` med `current_balance > 0` og oppretter `auto_trading_configs` (strategy='dca', is_enabled=true) for de som mangler.

### DB-konfigurasjon

```sql
-- auto_trading_configs for paper-brukere
INSERT INTO auto_trading_configs (user_id, is_enabled, strategy, config)
SELECT pa.user_id, true, 'dca',
  '{"markets":["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","DOGEUSDT"],
    "position_size_pct":5,"stop_loss_pct":5,"take_profit_pct":3}'::jsonb
FROM paper_accounts pa
WHERE pa.current_balance > 0
AND NOT EXISTS (SELECT 1 FROM auto_trading_configs atc WHERE atc.user_id = pa.user_id);
```

### Valuta-guard

`ensureNokDenominated()` i `execute-trade.ts` oppdager og korrigerer USDT→NOK dobbelkonvertering. Tre bånd: already_nok, converted_usdt, fixed_double.

## Før (broken)

```typescript
// POST /api/jokertrade — FØR-fiks
const coins = ["BTC", "ETH", "SOL"];
const actions = ["LONG", "SHORT", "HOLD", "WAIT"];
const sentiments = ["bullish", "bearish", "neutral"];
const selectedCoin = coins[Math.floor(Math.random() * coins.length)];
const selectedAction = actions[Math.floor(Math.random() * actions.length)];
const selectedSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
const confidence = Math.floor(Math.random() * 41) + 55; // 55-95
```

## Etter (fixed)

```typescript
// POST /api/jokertrade — ETTER-fiks
const TOP_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT"];
const symbol = TOP_SYMBOLS[Math.floor(Math.random() * TOP_SYMBOLS.length)];

// Kjør ALLE 12 agents
const agents = DEFAULT_AGENTS;
for (const agent of agents) {
  const signal = await agent.run(symbol, features);
  votes.push({ agent: agent.id, signal });
}

// Ensemble vote
const buyVotes = votes.filter(v => v.signal.action === 'buy');
// ... avg confidence, guard check

// Signal guard validerer
const guardResult = evaluateSignalGuard({
  action: action === "BUY" ? "buy" : "sell",
  confidence: confidence / 100,
});
```

## Konsekvenser for JokerTradeClient

- `hasTrades` sjekker `data.history.length > 0 || data.positions.length > 0`
- `data.history` = trades med `realized_pnl IS NOT NULL`
- `data.positions` = trades med `realized_pnl IS NULL` (åpne posisjoner)
- Første gang: `hasTrades = false` → viser `WelcomeBanner` med JOKER-knapp
- Etter første trade: `hasTrades = true` → viser fullt dashboard

## Auth-krav

JokerTrade-siden (`/(social)/jokertrade`) må være i PROTECTED_PATHS for at `useAuth()` skal fungere. Uten dette viser `JokerTradeClient` login-prompt selv for innloggede brukere.

Se `klarpakke-auth-data-access` skill — RLS-fellen / PROTECTED_PATHS.

## API-nøkkel-notat

CryptoPanic (`CRYPTOPANIC_API_KEY`) og Whale Alert (`WHALE_ALERT_API_KEY`) er valgfrie — systemet fallbacker til CoinGecko gratis tier uten dem. Med nøkler får man nyhets- og onchain-signaler i tillegg til teknisk analyse.
