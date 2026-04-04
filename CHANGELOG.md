# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] — 2026-04-04

### 🐛 Fixed
- **Auth:** Server Components brukte `createClient` (service-role) i stedet for `createServerClient` — portfolio, konto og admin-sider viste "Please log in" for innloggede brukere
- **Dashboard nav:** Home/Trading/AI/Portfolio/Learn viste overlappende innhold — unike page.tsx og empty states opprettet
- **Kalkulator:** Pessimistisk > Forventet (logikkfeil) fikset — alle scenarier garanterer pess < forventet < optimistisk

### ✨ Added
- **backtestPresets.ts** — 15 preaggregerte backtesting-presets (3 profiler × 5 horisonter), runtime-validert
- **useBacktestEstimate.ts** — Gjenbrukbar hook for landing/paper/live
- **Sonar News-filter** — Perplexity Sonar Pro blokkerer trades ved negativ nyhetssentiment (avoid + confidence > 0.7)
  - Filer: src/lib/ai/sonar/marketSentiment.ts, types.ts, config.ts
  - Cache: sonar_sentiment_cache (15 min TTL)
  - UI: SonarSentimentBadge, SonarSentimentPanel
- **Regime-deteksjon** — BULL/BEAR/SIDEWAYS/UNCERTAIN basert på EMA 21/55/200 + ADX 14 + RSI 14
  - Filer: src/services/regimeDetector.ts, indicators.ts
  - Cache: regime_cache (4 timer TTL)
  - UI: MarketIntelligencePanel, MarketIntelligenceBadge
- **3-lags AI pipeline** — Regime → Sonar → Execute i supabase/functions/auto-trade/index.ts
  - LAG 1: Regime-blokkerer BEAR marked (positionSizeMul = 0)
  - LAG 2: Sonar-blokkerer ved avoid + confidence > 0.7
  - LAG 3: Kombinert størrelsesjustering (regimeMul × sentimentMul)
- **GET /api/market-intelligence** — Kombinert regime + sentiment endepunkt, < 500ms responstid
- **34 integrasjonstester** for AI-pipeline
- **17 enhetstester** for backtestPresets

### 🗑️ Removed
- LottoCalculator.tsx — dead code, ikke importert
- LottoComparison.tsx — duplikat av LottoCalculator

### 🧪 Tests
- 490+ tester totalt (opp fra 439)
- Alle 10 pipeline-scenarioer testet:
  1. BULL + bullish → execute, 100% size
  2. BULL + bearish → execute, 75% size
  3. BULL + avoid (>0.7) → SONAR BLOCK
  4. BEAR + bullish → REGIME BLOCK (regime vinner)
  5. BEAR + avoid → REGIME BLOCK (regime-lag er først)
  6. SIDEWAYS + neutral → execute, 60% size
  7. UNCERTAIN + bearish → execute, 22% size (0.3 × 0.75)
  8. maxOpenPositions → BLOCK med 'regime_limit'
  9. Sonar error → pipeline fortsetter (fail-open)
  10. Insufficient candles → UNCERTAIN, men fortsetter

### 🗄️ Database
- ALTER TABLE ai_decision_log ADD: regime_context, regime_confidence, regime_reasoning, sonar_sentiment, sonar_recommendation, sonar_confidence, position_size_mul, block_layer
- CREATE TABLE regime_cache (4H TTL)
- CREATE TABLE sonar_sentiment_cache (15 min TTL)

---

## [1.0.0] — 2026-03-28

### ✨ Launched
- Produksjonslansering av Klarpakke Universitet
- Paper trading med 100 000 kr lekepenger
- Auto-trading med SMA-crossover strategier
- AI Academy med interaktive kurs

### 🔧 Technical Foundation
- Next.js 15 App Router
- Supabase Auth + Database
- Stripe betalinger
- Perplexity Sonar Pro integrasjon
