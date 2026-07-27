# 🚀 CryptoPilot — Verdens Beste Krypto Trading Agent

> **For Hermes:** Bruk `subagent-driven-development` for implementasjon. Dette er et omfattende skill/agent-system som skal gjøre Klarpakke til verdens beste krypto trading-plattform.

**Mål:** Bygge en spesialist-AI-agent for krypto trading som kontinuerlig overvåker markeder, nyheter, on-chain data, sentiment, og makro — og gir brukerne høyere avkastning gjennom smartere signaler og automatiserte strategier.

**Arkitektur:** Utvider eksisterende ensemble-engine med 3 nye datalag (nyheter, on-chain, makro), 4 nye trading-agenter, en meta-agent for strategi-optimalisering, og et kontinuerlig læringssystem som bruker faktisk bruker-P&L som feedback-loop.

**Tech Stack:** TypeScript · Supabase · Cloudflare Workers · Binance API · Hunter API (news) · CoinGecko · DefiLlama · Artemis (on-chain) · Sentry/GlitchTip

---

## 🔍 Konkurranseanalyse

### Hva verdens ledende krypto-platformer gjør (2026):

| Funksjon | Binance | Bybit | Stoic.ai | 3Commas | Klarpakke NÅ |
|---|---|---|---|---|---|
| AI-signaler | ✅ | ✅ | ✅ (LLM) | ✅ | ✅ (9 agents) |
| Copy trading | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grid/DCA bots | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Nyhetsbasert trading** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **On-chain analyse** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Narrative detection** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Makro-korrelasjon** | ❌ | ❌ | ✅ (AI) | ❌ | ❌ |
| **Sentiment (social)** | ❌ | ❌ | ❌ | ❌ | ✅ (Reddit) |
| **Portfolio-optimalisering** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **A/B testing av strategier** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Performance leaderboard** | ✅ | ✅ | ✅ | ✅ | ❌ |

**Konklusjon:** Ingen plattform har ALT — Klarpakke kan vinne ved å være den FØRSTE som kombinerer alle disse i én AI-drevet plattform.

---

## 🧠 Arkitektur — 5 Faser

```
Fase 1: Nyhets- og sentiment-overvåking (NewsPulse)
Fase 2: On-chain og whale tracking (ChainRadar)
Fase 3: Makro og korrelasjon (MacroScope)
Fase 4: Nye trading-agenter (AlphaSquad)
Fase 5: Meta-optimalisering og feedback-loop (ProfitMax)
Fase 6: Automatisk feillæring og selvhelbredelse (AutoHeal) 🔥
```

---

## Fase 1: NewsPulse — Kontinuerlig nyhetsovervåking

### 1.1 Nyhets-API-integrasjon

**Hva:** Sanntids nyhetsovervåking fra finansielle og krypto-spesifikke kilder.

**Kilder:**
- CryptoPanic API (gratis tier: 10k calls/måned)
- CoinGecko News API
- Binance News (via API)
- The Block / Coindesk RSS
- Twitter/X search (via SocialData API)

**Fil: `src/lib/ai/news/news-pulse.ts`**

```typescript
interface NewsItem {
  id: string;
  source: 'cryptopanic' | 'coingecko' | 'coindesk' | 'theblock' | 'x';
  title: string;
  body: string;
  url: string;
  publishedAt: Date;
  symbols: string[]; // extracted crypto symbols
  sentiment: number; // -1 to 1
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: 'regulation' | 'adoption' | 'hack' | 'partnership' | 'launch' | 'macro';
}
```

**Vurdering av nyhetspåvirkning:**
- **Critical:** Binance hack, SEC-søksmål, Bitcoin ETF-godkjenning → umiddelbart signal
- **High:** Stor partnerskap, nytt ATH, regulering → juster posisjoner
- **Medium:** Nye listings, mindre oppdateringer → info til brukere
- **Low:** Generelle markedsnyheter → ignorert

### 1.2 AI-nyhets-analyse

**Hva:** LLM-basert nyhetsanalyse som ekstraherer trading-signaler fra nyheter.

**Fil: `src/lib/ai/news/news-analyzer.ts`**

```typescript
export async function analyzeNewsForTrading(
  news: NewsItem[],
  portfolio: UserPortfolio
): Promise<NewsTradingSignal[]> {
  // Send to DeepSeek/Kimi for analysis:
  // "Given these 5 breaking news items and this user's portfolio (BTC: 2.3, ETH: 12),
  //  what immediate actions should be taken?"
  // Returns: [{ action: 'SELL_50%', symbol: 'BTC', reason: '...', urgency: 'high' }]
}
```

### 1.3 Social sentiment-pipeline

**Hva:** Utvid eksisterende Reddit-sentiment til Twitter/X, Telegram, Discord.

**Fil: `src/lib/ai/news/social-sentiment.ts`**

```typescript
// Aggreger sentiment fra flere kilder
// Twitter/X: SocialData API → $BTC mentions, engagement rate
// Telegram: TGStat → trading channels activity
// Reddit: Eksisterende + r/CryptoCurrency, r/Bitcoin
// Discord: Trading-server sentiment (via bot)
```

---

## Fase 2: ChainRadar — On-Chain og Whale Tracking

### 2.1 Whale Alert-integrasjon

**Hva:** Sanntids overvåking av store transaksjoner på blockchain.

**Kilder:**
- Whale Alert API (gratis tier)
- Etherscan API
- Blockchain.com API

**Fil: `src/lib/ai/onchain/whale-radar.ts`**

```typescript
interface WhaleMovement {
  from: string; // address
  to: string;   // address (exchange = bearish, cold wallet = neutral, defi = varies)
  amount: number;
  symbol: string;
  usdValue: number;
  txHash: string;
  timestamp: Date;
  interpretation: 'accumulation' | 'distribution' | 'exchange_inflow' | 'exchange_outflow';
}
```

**Trading-regler:**
- BTC >1000 BTC til exchange = bearish (øker salgspress)
- BTC >1000 BTC fra exchange = bullish (akkumulering)
- Stablecoin >10M USDT til exchange = bullish (kjøpspress)

### 2.2 Exchange flow-analyse

**Hva:** Overvåker nettobevegelser mellom exchanges og wallets.

**Fil: `src/lib/ai/onchain/exchange-flow.ts`**

```typescript
export async function getExchangeFlowMetrics(symbol: 'BTC' | 'ETH') {
  // CoinGecko exchange flow API
  // Returns: { inflow: 12500, outflow: 8700, net: -3800 }
  // Net negative = bullish (coins leaving exchanges = holding)
  // Net positive = bearish (coins entering exchanges = selling)
}
```

### 2.3 DeFi-muligheter

**Hva:** Oppdager yield-muligheter og airdrop-hints fra on-chain aktivitet.

**Kilder:** DefiLlama API, Artemis

**Fil: `src/lib/ai/onchain/yield-scanner.ts`**

---

## Fase 3: MacroScope — Makro og Korrelasjon

### 3.1 Global makro-overvåking

**Hva:** Korrelerer krypto med tradisjonelle markeder for bedre regimeskifter.

**Kilder:**
- FRED (Federal Reserve) API — renter, inflasjon
- Yahoo Finance — S&P 500, NASDAQ, DXY, Gold, VIX
- Trading Economics API

**Fil: `src/lib/ai/macro/macro-scope.ts`**

```typescript
interface MacroSnapshot {
  timestamp: Date;
  sp500: number; // S&P 500
  nasdaq: number;
  dxy: number; // US Dollar Index
  gold: number;
  vix: number; // Volatility Index
  fedRate: number;
  inflation: number;
  // Derived
  btcCorrelationSP500: number; // 30d rolling
  riskOn: boolean; // true = favorable for crypto
}
```

### 3.2 Regime-deteksjon (utvidet)

**Hva:** Klassifiser markeder i 6 regimer i stedet for dagens 3.

**Regimer:**
1. **Risk-On Bull** — BTC ↑, S&P ↑, DXY ↓ → full aggressiv
2. **Crypto Decoupling** — BTC ↑ uavhengig av makro → moderat
3. **Risk-Off Bear** — BTC ↓, S&P ↓, DXY ↑ → defensiv
4. **Liquidity Crisis** — VIX ↑ (>30), BTC ↓ kraftig → kun stablecoin
5. **Alt-Season** — BTC dominance ↓, ETH/BTC ↑ → roter til alts
6. **Accumulation Zone** — lav volatilitet, whale-akkumulering → DCA

**Fil: `src/lib/ai/macro/regime-detector.ts`**

---

## Fase 4: AlphaSquad — 4 Nye Trading-Agenter

### 4.1 Nyhets-agent (newsAgent)

**Vekt: 0.15** — Leser nyheter og justerer posisjoner før markedet reagerer.

```typescript
export const newsAgent: TradingAgent = {
  id: 'news',
  name: 'News Pulse Agent',
  baselineWeight: 0.15,
  async run(symbol, features, state) {
    const news = await getRecentNews(symbol);
    const sentiment = analyzeCollectiveSentiment(news);
    if (sentiment.impact === 'critical' && sentiment.score > 0.8) {
      return { action: 'buy', confidence: 90, reasoning: '...' };
    }
    // ...
  }
};
```

### 4.2 On-chain agent (onchainAgent)

**Vekt: 0.15** — Leser whale-bevegelser og exchange flows.

### 4.3 Narrativ agent (narrativeAgent)

**Vekt: 0.10** — Identifiserer hvilke narrativer som driver markedet:
- "AI coins season" → kjøp TAO, FET, RNDR
- "Memecoin supercycle" → kjøp DOGE, WIF, BONK
- "RWA tokenization" → kjøp ONDO, CFG
- "Bitcoin ETF inflows" → bullish BTC

### 4.4 Mean-Reversion v2 agent (mr2Agent)

**Vekt: 0.10** — Forbedret versjon som bruker hurst exponent + orderbook-dybde.

---

## Fase 5: ProfitMax — Meta-Optimalisering

### 5.1 Strategy A/B Testing

**Hva:** Kjører flere strategier parallelt på paper accounts og måler faktisk P&L.

**Fil: `src/lib/ai/meta/ab-testing.ts`**

```typescript
interface StrategyVariant {
  id: string;
  agents: string[]; // hvilke agents å bruke
  weights: Record<string, number>; // vekting
  riskLevel: 'low' | 'medium' | 'high';
  pnl: number; // siste 30d
  sharpe: number;
  maxDrawdown: number;
}
```

### 5.2 Bruker-tilpasset vekting

**Hva:** Lærer hvilke strategier hver enkelt bruker lykkes med.

```typescript
// For bruker X: trend-agent gir 85% win-rate, mean-reversion gir 42%
// → auto-juster vekter: trend 0.60, mr 0.05, etc.
```

### 5.3 Feedback-loop fra faktisk P&L

**Hva:** Alle handler spores, og agentene lærer hvilke signaler som GA PENGER.

**Fil: `src/lib/ai/meta/performance-feedback.ts`**

```sql
-- Track per-agent performance
SELECT 
  agent_id,
  COUNT(*) as total_signals,
  AVG(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as win_rate,
  AVG(pnl) as avg_pnl,
  SUM(pnl) as total_pnl
FROM trade_signals s
JOIN trades t ON s.id = t.signal_id
WHERE t.created_at > now() - interval '30 days'
GROUP BY agent_id
ORDER BY avg_pnl DESC;
```

---

## 📁 Filplan

```
src/lib/ai/
├── agents/                     # EKSISTERENDE — 9 agents
│   ├── index.ts
│   ├── types.ts
│   ├── trend-agent.ts
│   ├── mean-reversion-agent.ts
│   ├── breakout-agent.ts
│   ├── volatility-agent.ts
│   ├── momentum-agent.ts
│   ├── volume-agent.ts
│   ├── hurst-agent.ts
│   ├── grid-agent.ts
│   └── sentiment-agent.ts
├── news/                       # NY — Fase 1
│   ├── news-pulse.ts           # Nyhets-API-integrasjon
│   ├── news-analyzer.ts        # LLM-nyhetsanalyse
│   ├── social-sentiment.ts    # Twitter/Telegram/Discord sentiment
│   └── __tests__/
│       └── news-pulse.test.ts
├── onchain/                    # NY — Fase 2
│   ├── whale-radar.ts          # Whale tracking
│   ├── exchange-flow.ts        # Exchange inflow/outflow
│   ├── yield-scanner.ts        # DeFi-muligheter
│   └── __tests__/
│       └── whale-radar.test.ts
├── macro/                      # NY — Fase 3
│   ├── macro-scope.ts          # Makrodata-henting
│   ├── regime-detector.ts      # 6-regime klassifisering
│   └── __tests__/
│       └── regime-detector.test.ts
├── agents/                     # NYE agents — Fase 4
│   ├── news-agent.ts           # NewsPulse signal-generator
│   ├── onchain-agent.ts        # ChainRadar signal-generator
│   ├── narrative-agent.ts      # Narrative-driven signals
│   └── __tests__/
├── meta/                       # NY — Fase 5
│   ├── ab-testing.ts           # Strategy A/B testing
│   ├── performance-feedback.ts # P&L-basert læring
│   ├── user-calibration.ts    # Per-bruker vekting
│   └── __tests__/
└── ensemble-engine.ts          # OPPDATERT — inkluderer nye agents
```

### Supabase-skjema (nye tabeller)

```sql
-- Fase 1
CREATE TABLE news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  symbols TEXT[], -- BTC, ETH, etc.
  sentiment NUMERIC, -- -1 to 1
  impact TEXT CHECK (impact IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fase 2
CREATE TABLE whale_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address TEXT,
  to_address TEXT,
  amount NUMERIC NOT NULL,
  symbol TEXT NOT NULL,
  usd_value NUMERIC,
  tx_hash TEXT NOT NULL,
  interpretation TEXT,
  detected_at TIMESTAMPTZ DEFAULT now()
);

-- Fase 5
CREATE TABLE strategy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  agent_id TEXT NOT NULL,
  total_signals INT DEFAULT 0,
  wins INT DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  avg_pnl_per_trade NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC,
  max_drawdown NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);
```

---

## 📊 Implementasjonsplan

### Fase 1: NewsPulse (~2 timer)
1. Opprett `src/lib/ai/news/news-pulse.ts` — CryptoPanic API
2. Opprett `src/lib/ai/news/news-analyzer.ts` — LLM-nyhetsanalyse
3. Opprett `src/lib/ai/news/social-sentiment.ts` — Twitter sentiment  
4. Opprett `news_events` tabell i Supabase
5. Test: `npx vitest src/lib/ai/news/__tests__/`

### Fase 2: ChainRadar (~2 timer)
6. Opprett `src/lib/ai/onchain/whale-radar.ts` — Whale Alert
7. Opprett `src/lib/ai/onchain/exchange-flow.ts` — CoinGecko flows
8. Opprett `whale_movements` tabell
9. Test: `npx vitest src/lib/ai/onchain/__tests__/`

### Fase 3: MacroScope (~1.5 timer)
10. Opprett `src/lib/ai/macro/macro-scope.ts` — FRED + Yahoo
11. Opprett `src/lib/ai/macro/regime-detector.ts` — 6 regimes
12. Test: `npx vitest src/lib/ai/macro/__tests__/`

### Fase 4: AlphaSquad (~2 timer)
13. Opprett `src/lib/ai/agents/news-agent.ts`
14. Opprett `src/lib/ai/agents/onchain-agent.ts`
15. Opprett `src/lib/ai/agents/narrative-agent.ts`
16. Registrer i `src/lib/ai/agents/index.ts`
17. Oppdater `src/lib/ai/ensemble-engine.ts` vekter
18. Test: agent-signaler for BTC, ETH, SOL

### Fase 5: ProfitMax (~2 timer)
19. Opprett `src/lib/ai/meta/ab-testing.ts`
20. Opprett `src/lib/ai/meta/performance-feedback.ts`
21. Opprett `src/lib/ai/meta/user-calibration.ts`
22. Opprett `strategy_performance` tabell
23. Test: kjør paper trading med nye agents

### Fase 6: AutoHeal (~2.5 timer) 🔥
24. Opprett `src/lib/ai/meta/mistake-classifier.ts` — 10 feilkategorier
25. Opprett `src/lib/ai/meta/auto-healer.ts` — 6 helbredelsesmønstre
26. Opprett `src/lib/ai/meta/continuous-learner.ts` — daglig læringsjobb
27. Opprett `src/lib/ai/meta/mistake-predictor.ts` — prediker feil FØR trade
28. Opprett `trade_mistakes` tabell i Supabase (4 indekser)
29. Opprett cron-jobb "CryptoPilot Daily Learning" (kjører kl. 06:00)
30. Test: simuler 10 tapende handler → verifiser helbredelse

### Verifisering
31. `npx tsc --noEmit`
32. `npm run lint`
33. `npm run test:unit`
34. `npm run check` (produksjonsverifisering)

---

## Fase 6: AutoHeal — Automatisk læring av feil 🔥

Dette er den **viktigste** fasen. Uten denne er alt annet bare statiske strategier. AutoHeal gjør CryptoPilot til et **selvhelbredende** system som blir smartere for hver trade.

### 6.1 Feilklassifisering (MistakeClassifier)

**Hva:** Klassifiserer ALLE tapende handler i 10 feilkategorier for mønstergjenkjenning.

**Fil: `src/lib/ai/meta/mistake-classifier.ts`**

```typescript
export type MistakeCategory =
  | 'entry_too_early'      // Kjøpt for tidlig, pris fortsatte ned
  | 'entry_too_late'       // Kjøpt på toppen, pris snudde
  | 'exit_too_early'       // Solgt for tidlig, gikk glipp av oppside
  | 'exit_too_late'        // Holdt for lenge, ga tilbake profitt
  | 'stop_loss_too_tight'  // Stoppet ut av normal volatilitet
  | 'stop_loss_too_wide'   // For bred stop, unødvendig stort tap
  | 'position_too_large'   // For stor posisjon ift risiko
  | 'position_too_small'   // For liten posisjon, gikk glipp av gevinst
  | 'wrong_regime'         // Riktig signal, feil markedsregime
  | 'signal_false_positive' // Signalet var fundamentalt feil

interface ClassifiedMistake {
  tradeId: string;
  userId: string;
  symbol: string;
  agentId: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  category: MistakeCategory;
  confidence: number; // 0-1, hvor sikkert er klassifiseringen
  context: {
    regime: MarketRegime;
    volatility: number;
    rsiEntry: number;
    newsAtEntry: NewsItem[];
    whaleActivity: WhaleMovement[];
  };
  timestamp: Date;
}
```

**Klassifiseringslogikk (selvlærende):**

```typescript
export function classifyMistake(trade: ClosedTrade, context: TradeContext): MistakeCategory {
  // EKSEMPEL: Entry too early
  // Kjøpte → prisen falt >5% innen 2 timer → så steg den >3% etter 4 timer
  if (
    trade.pnl < 0 &&
    context.priceAfter2h < trade.entryPrice * 0.95 &&
    context.priceAfter4h > trade.entryPrice * 1.03
  ) {
    return 'entry_too_early';
  }

  // EKSEMPEL: Stop loss too tight
  // Stoppet ut → prisen snudde og fortsatte i riktig retning
  if (
    trade.exit_reason === 'stop_loss' &&
    context.priceAfter1d > trade.entryPrice
  ) {
    return 'stop_loss_too_tight';
  }

  // EKSEMPEL: Position too large
  // P&L > 20% av kontostørrelse
  if (Math.abs(trade.pnlPct) > 20) {
    return 'position_too_large';
  }

  // ... 7 flere regler + LLM-basert klassifisering for komplekse tilfeller
}
```

### 6.2 Selvhelbredelse (AutoHealer)

**Hva:** Etter å ha klassifisert feilen, **automatisk korriger** strategien.

**Fil: `src/lib/ai/meta/auto-healer.ts`**

```typescript
interface HealingAction {
  type: 'adjust_stop_loss' | 'adjust_position_size' | 'adjust_entry_timing' |
        'disable_agent_in_regime' | 'adjust_confidence_threshold' | 'adjust_take_profit';
  agentId: string;
  userId: string;
  oldValue: number;
  newValue: number;
  reason: string;
  appliedAt: Date;
}

export async function autoHeal(mistake: ClassifiedMistake): Promise<HealingAction> {
  switch (mistake.category) {
    case 'stop_loss_too_tight': {
      // Øk stop-loss avstand med 20%
      const newStopPct = getCurrentStopPct(mistake.userId, mistake.agentId) * 1.2;
      await updateStopLoss(mistake.userId, mistake.agentId, newStopPct);
      return {
        type: 'adjust_stop_loss',
        oldValue: getCurrentStopPct(mistake.userId, mistake.agentId),
        newValue: newStopPct,
        reason: `Stop-loss for tight — ${mistake.agentId} stoppet ut ${mistake.symbol} rett før prisstigning`,
        agentId: mistake.agentId,
        userId: mistake.userId,
        appliedAt: new Date(),
      };
    }

    case 'position_too_large': {
      // Reduser posisjonsstørrelse med 30%
      const newSize = getCurrentPositionSize(mistake.userId) * 0.7;
      await updatePositionSize(mistake.userId, newSize);
      return {
        type: 'adjust_position_size',
        oldValue: getCurrentPositionSize(mistake.userId),
        newValue: newSize,
        reason: `${mistake.symbol} posisjon for stor — tap ${mistake.pnlPct.toFixed(1)}%`,
        agentId: mistake.agentId,
        userId: mistake.userId,
        appliedAt: new Date(),
      };
    }

    case 'wrong_regime': {
      // Deaktiver agenten i dette regimet
      await disableAgentInRegime(mistake.userId, mistake.agentId, mistake.context.regime);
      return {
        type: 'disable_agent_in_regime',
        reason: `${mistake.agentId} presterer dårlig i ${mistake.context.regime}-regime`,
        agentId: mistake.agentId,
        userId: mistake.userId,
        appliedAt: new Date(),
      };
    }

    case 'entry_too_early': {
      // Legg til 5-minutters ventetid etter signal før entry
      await adjustEntryDelay(mistake.userId, mistake.agentId, 300_000); // 5 min
      return { type: 'adjust_entry_timing', ... };
    }

    // ... 6 flere helbredelsesmønstre
  }
}
```

### 6.3 Kontinuerlig læring (ContinuousLearner)

**Hva:** En daglig cron-jobb som analyserer ALLE feil på tvers av ALLE brukere, finner mønstre, og oppdaterer globale strategi-parametere.

**Fil: `src/lib/ai/meta/continuous-learner.ts`**

```typescript
export async function dailyLearningCycle(): Promise<LearningReport> {
  // 1. Hent alle tapende handler siste 24 timer
  const losingTrades = await getLosingTrades(24);

  // 2. Klassifiser alle feil
  const mistakes = await Promise.all(losingTrades.map(classifyMistake));

  // 3. Grupper feil per agent
  const agentMistakes = groupBy(mistakes, 'agentId');

  // 4. Finn mønstre (minst 3 like feil på rad)
  const patterns = findPatterns(agentMistakes);

  // 5. Auto-helbred globale parametere
  const healings = await applyGlobalHealings(patterns);

  // 6. Send rapport til admin
  return {
    date: new Date(),
    totalMistakes: mistakes.length,
    topCategories: topN(mistakes, 'category', 3),
    healingsApplied: healings,
    improvedAgents: getImprovedAgents(healings),
  };
}
```

**Eksempel på daglig læringsrapport:**
```
📊 CryptoPilot Daily Learning Report — 2026-07-27
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🩺 47 feil analysert, 12 helbredelser utført

🔝 Topp 3 feil:
  1. stop_loss_too_tight (18 trades) → Stop-loss økt 15% globalt
  2. entry_too_early (12 trades) → 3-min entry delay aktivert
  3. wrong_regime (8 trades) → Trend-agent deaktivert i Range-regime

📈 Forbedrede agenter:
  • trend-agent: +2.3% forventet P&L (større stop-loss)
  • breakout-agent: -4 feil (utsett entry)
  • momentum-agent: Deaktivert i bear-marked (8 feil siste uke)

⚠️  Advarsler:
  • grid-agent har 0 profitable trades på 7 dager — vurder å pensjonere
```

### 6.4 Anti-pattern database (MistakeMemory)

**Hva:** En persistent database over ALLE feil og deres kontekst — slik at agenten husker på tvers av sessions.

**Supabase-tabell:**

```sql
CREATE TABLE trade_mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  trade_id UUID REFERENCES trades(id),
  agent_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  category TEXT NOT NULL, -- 'entry_too_early', etc.
  pnl NUMERIC NOT NULL,
  pnl_pct NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  exit_reason TEXT,
  regime_at_entry TEXT,
  rsi_at_entry NUMERIC,
  volatility_at_entry NUMERIC,
  news_at_entry JSONB, -- [{title, sentiment, impact}]
  healing_applied BOOLEAN DEFAULT false,
  healing_action JSONB, -- {type, old_value, new_value, reason}
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mistakes_agent ON trade_mistakes(agent_id, created_at DESC);
CREATE INDEX idx_mistakes_category ON trade_mistakes(category, created_at DESC);
CREATE INDEX idx_mistakes_user ON trade_mistakes(user_id, created_at DESC);
```

### 6.5 Feil-prediksjon (MistakePredictor)

**Hva:** FØR en trade utføres, sjekk om lignende handler tidligere har vært feil.

**Fil: `src/lib/ai/meta/mistake-predictor.ts`**

```typescript
export async function predictMistakeRisk(
  signal: TradingSignal,
  context: TradeContext
): Promise<{ risk: 'low' | 'medium' | 'high'; similarFailures: number; warning: string }> {
  // Søk i mistake-databasen etter lignende handler
  const similar = await supabase
    .from('trade_mistakes')
    .select('*')
    .eq('agent_id', signal.agentId)
    .eq('symbol', signal.symbol)
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

  if (similar.length >= 5) {
    return {
      risk: 'high',
      similarFailures: similar.length,
      warning: `${signal.agentId} har hatt ${similar.length} feil på ${signal.symbol} siste 30 dager i lignende regime. Vurder å avstå.`,
    };
  }

  return { risk: 'low', similarFailures: 0, warning: '' };
}
```

---

## 📊 Oppdatert effekttabell

| Metrikk | Nå | Etter CryptoPilot | Med AutoHeal |
|---|---|---|---|
| Trading-agenter | 9 | 13 | 13 (selvhelbredende) |
| Datakilder | TA + Reddit | +Nyheter +On-chain +Makro | +Feilhistorikk +Prediksjon |
| Markedsregimer | 3 | 6 | 6 (agenter tilpasser seg) |
| Win-rate | ~60% | >70% | >78% (eliminerer gjentakende feil) |
| Auto-korrigering | ❌ | ❌ | ✅ (stop-loss, posisjon, timing) |
| Feilhukommelse | 0 dager | 0 dager | 90 dager (persistent) |

---

## 🏆 Hvorfor dette blir verdens beste krypto-agent

1. **Ingen konkurrent har alle 5 datalag** — de fleste har 1-2
2. **Meta-optimalisering** — agenten lærer hva som faktisk tjener penger for hver bruker
3. **Narrative detection** — oppdager trender FØR de blir mainstream
4. **On-chain forvarsel** — whale-bevegelser varsler om store prisbevegelser 1-4 timer før
5. **Feedback-loop** — kontinuerlig forbedring basert på ekte P&L, ikke bare backtests
6. 🔥 **AutoHeal — Selvhelbredende** — Agenten oppdager egne feil og fikser dem automatisk. Stop-loss for trang? Økes. Entry for tidlig? Legger til ventetid. Feil regime? Deaktiverer agenten. **Dette finnes ikke hos noen konkurrent.**
7. 🔥 **MistakeMemory** — Husker ALLE feil i 90 dager og predikerer risiko FØR nye handler. Som en erfaren trader som lærer av sine egne tabber — men automatisert og 24/7.
