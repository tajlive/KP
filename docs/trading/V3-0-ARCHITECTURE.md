# Klarpakke V3.0 – AI Trading Bot Foundation

**Timeline:** 12 uker | **MVP Launch:** Q3 2026  
**Benchmark:** 15% annualisert (konservativ) > 8.33% pair-trading baseline

---

## 1. Sentiment-RL Integration

### 1.1 Fear & Greed Index som Reward Signal

```typescript
// Core reward formula
R_t = α·PnL_t + β·FearGreedSignal_t + γ·RiskAdjustedReturn_t + δ·RegimeAlignment_t

where:
- α = 0.5 (PnL vekt)
- β = 0.3 (Fear/Greed vekt)
- γ = 0.15 (Sharpe-adjusted)
- δ = 0.05 (Market regime alignment)
```

**Fear/Greed Signal Mapping:**
| Index Verdi | Signal | Handling | Reward Boost |
|-------------|--------|----------|--------------|
| 0-20 (Extreme Fear) | +1 | Aggressiv kjøp | +0.15 |
| 21-40 (Fear) | +0.5 | Forsiktig kjøp | +0.08 |
| 41-60 (Neutral) | 0 | Hold | 0 |
| 61-80 (Greed) | -0.5 | Forsiktig salg | +0.08 |
| 81-100 (Extreme Greed) | -1 | Aggressiv salg | +0.15 |

### 1.2 PPO Finetuning på Binance Historikk

**State Space (48 dimensjoner):**
- Pris features: OHLCV (5)
- Tekniske indikatorer: RSI, MACD, BB, ATR, EMA (15)
- Fear/Greed index: Nåværende + 7-dagers trend (8)
- Portfolio state: Posisjon, P&L, drawdown (5)
- Market regime: Volatilitet, trendstyrke (5)
- Time features: Time of day, day of week (10)

**Action Space:**
- Diskret: [-1, -0.5, 0, +0.5, +1] = [100% sell, 50% sell, hold, 50% buy, 100% buy]
- Kontinuerlig: [-1, 1] lineær posisjonsendring

**Hyperparametere:**
```yaml
ppo:
  learning_rate: 3e-4
  gamma: 0.99
  gae_lambda: 0.95
  clip_epsilon: 0.2
  value_coef: 0.5
  entropy_coef: 0.01
  batch_size: 2048
  epochs: 10
  hidden_dims: [256, 256, 128]
```

---

## 2. Realistisk Execution (Bybit)

### 2.1 Fee Structure

| Ordretype | Maker Fee | Taker Fee | Notes |
|-----------|-----------|-----------|-------|
| Spot | 0.1% | 0.1% | Standard |
| Futures | 0.02% | 0.055% | V3.0 target |
| Options | 0.03% | 0.03% | Avansert |

**Slippage Model:**
```typescript
// Realistisk slippage basert på order book dybde
slippage = baseSlippage + volatilityFactor * orderSizeFactor

where:
- baseSlippage = 0.01% (1 bps)
- volatilityFactor = ATR(14) / SMA(20) * 100
- orderSizeFactor = orderSize / orderBookDepth
```

### 2.2 Queue Time Simulasjon

```typescript
// Limit order fill probability basert på queue position
fillProbability = 1 / (1 + exp(-k * (queuePosition - threshold)))

// Forventet ventetid (sekunder)
expectedWaitTime = baseLatency + queueDepth * avgFillRate

// Bybit-spesifikk: 50-200ms base latency
```

---

## 3. Paper Trading Harness

### 3.1 100 Beta Bruker Struktur

| Cohort | Brukere | Formål | Varighet |
|--------|---------|--------|----------|
| Alpha | 10 | Intern testing | Uke 1-2 |
| Beta 1 | 30 | Begrenset release | Uke 3-6 |
| Beta 2 | 60 | Full skala testing | Uke 7-12 |

### 3.2 Daily P&L Capping

```typescript
// Auto-kill switch konfigurasjon
interface KillSwitchConfig {
  dailyMaxLoss: 500;        // USD
  dailyMaxGain: 2000;       // Soft cap (advarsel)
  maxDrawdown: 0.15;        // 15% av initial capital
  consecutiveLosses: 5;     // Stop etter 5 tapende trades
  volatilitySpike: 2.5;     // ATR multiplier threshold
}
```

### 3.3 Human Override (Kill Switch)

```typescript
// Tre nivåer av inngripen
enum OverrideLevel {
  SOFT = 'soft',      // Advarsel + logging
  MEDIUM = 'medium',  // Pause + manuell review
  HARD = 'hard'       // Full stopp + kontakt team
}

// Triggere for automatisk override
const autoOverrideRules = {
  dailyLossLimit: { threshold: 500, level: OverrideLevel.HARD },
  drawdownLimit: { threshold: 0.15, level: OverrideLevel.MEDIUM },
  volatilitySpike: { threshold: 3.0, level: OverrideLevel.SOFT },
  apiErrorRate: { threshold: 0.1, level: OverrideLevel.MEDIUM }
};
```

---

## 4. White-label API

### 4.1 MiFID2 Compliance Layer

**Kravisett:**
- Best Execution (Art. 27)
- Transaction Reporting (Art. 26)
- Order Record Keeping (Art. 25)
- Product Governance (Art. 16 & 24)
- Suitable Assessment (Art. 25)

**API Endpoints:**
```typescript
// Compliance metadata på hver ordre
interface MiFID2OrderMetadata {
  bestExecutionVenue: string;
  executionQualityScore: number;
  clientCategory: 'retail' | 'professional' | 'eligible_counterparty';
  appropriatenessTest: boolean;
  productSuitability: 'suitable' | 'not_suitable' | 'unsure';
}

// Transaction reporting (RTS 22)
interface TransactionReport {
  tradeId: string;
  executingEntity: string;
  tradingCapacity: 'DEAL' | 'MTCH' | 'AOTC';
  quantity: number;
  price: number;
  venue: string;
  transactionTime: ISO8601;
  instrumentIdentification: ISIN | LEI;
}
```

### 4.2 AUM Fee Calculator

```typescript
// Tiered fee structure for white-label partners
interface AUMFeeTier {
  minAUM: number;
  maxAUM: number;
  managementFee: number;  // Annual %
  performanceFee: number; // Annual % of profits
  platformFee: number;    // Fixed monthly
}

const defaultFeeTiers: AUMFeeTier[] = [
  { minAUM: 0, maxAUM: 100000, managementFee: 0.015, performanceFee: 0.10, platformFee: 199 },
  { minAUM: 100000, maxAUM: 500000, managementFee: 0.012, performanceFee: 0.15, platformFee: 499 },
  { minAUM: 500000, maxAUM: 1000000, managementFee: 0.010, performanceFee: 0.20, platformFee: 999 },
  { minAUM: 1000000, maxAUM: Infinity, managementFee: 0.008, performanceFee: 0.20, platformFee: 1999 }
];
```

### 4.3 B2B Fintech Integration

```typescript
// White-label partner konfigurasjon
interface WhiteLabelPartner {
  partnerId: string;
  name: string;
  branding: {
    logo: string;
    primaryColor: string;
    appName: string;
  };
  compliance: {
    jurisdiction: 'EU' | 'UK' | 'CH' | 'NO';
    mifid2Compliant: boolean;
    gdprCompliant: boolean;
  };
  features: {
    allowCrypto: boolean;
    allowLeverage: boolean;
    maxLeverage: number;
    allowedAssets: string[];
  };
  fees: AUMFeeTier[];
}
```

---

## 5. Database Skjema Utvidelser

### 5.1 RL Training Tabeller

```sql
-- RL Agent state og rewards
CREATE TABLE rl_training_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_reward DECIMAL(18,8),
  final_pnl DECIMAL(18,8),
  sharpe_ratio DECIMAL(8,4),
  max_drawdown DECIMAL(8,4),
  fear_greed_correlation DECIMAL(5,4),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experience replay buffer
CREATE TABLE rl_experience_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  episode_id UUID REFERENCES rl_training_episodes(id),
  state_vector DECIMAL(18,8)[] NOT NULL,
  action INTEGER NOT NULL,
  reward DECIMAL(18,8) NOT NULL,
  next_state_vector DECIMAL(18,8)[],
  done BOOLEAN DEFAULT FALSE,
  priority DECIMAL(10,8) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Beta User Management

```sql
-- Beta user tracking med kill switch
CREATE TABLE beta_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  cohort TEXT NOT NULL CHECK (cohort IN ('alpha', 'beta_1', 'beta_2')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'killed')),
  daily_pnl_cap DECIMAL(18,8) DEFAULT 500,
  max_drawdown_pct DECIMAL(5,4) DEFAULT 0.15,
  kill_switch_triggered_at TIMESTAMPTZ,
  kill_switch_reason TEXT,
  override_approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beta user performance metrics
CREATE TABLE beta_user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  starting_balance DECIMAL(18,8),
  ending_balance DECIMAL(18,8),
  daily_pnl DECIMAL(18,8),
  total_trades INTEGER,
  winning_trades INTEGER,
  max_drawdown_today DECIMAL(8,4),
  fear_greed_index_avg INTEGER,
  rl_agent_version TEXT,
  UNIQUE(user_id, date)
);
```

### 5.3 White-label Partner Tabeller

```sql
-- White-label partners
CREATE TABLE white_label_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  config JSONB NOT NULL DEFAULT '{}',
  compliance_settings JSONB NOT NULL DEFAULT '{}',
  fee_tiers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MiFID2 transaction reports
CREATE TABLE mifid2_transaction_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES white_label_partners(id),
  trade_id UUID REFERENCES trades(id),
  report_id TEXT UNIQUE NOT NULL,
  executing_entity TEXT NOT NULL,
  trading_capacity TEXT NOT NULL,
  venue TEXT NOT NULL,
  instrument_identification TEXT NOT NULL,
  transaction_time TIMESTAMPTZ NOT NULL,
  report_status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- European tax reports
CREATE TABLE european_tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'CH', 'NO')),
  tax_year INTEGER NOT NULL,
  report_format TEXT NOT NULL CHECK (report_format IN ('XML', 'CSV', 'PDF')),
  report_data JSONB NOT NULL,
  total_gains DECIMAL(18,8),
  total_losses DECIMAL(18,8),
  net_taxable DECIMAL(18,8),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_to_authority BOOLEAN DEFAULT FALSE
);
```

---

## 6. Benchmark Testing Framework

### 6.1 Target Metrics

| Metric | Target | Baseline (DCA) | Notes |
|--------|--------|----------------|-------|
| Annualized Return | ≥ 15% | 8.33% (pair-trading) | Conservative target |
| Sharpe Ratio | ≥ 1.2 | 0.8 | Risk-adjusted returns |
| Max Drawdown | ≤ 20% | 25% | Capital preservation |
| Win Rate | ≥ 55% | 50% | Directional accuracy |
| Profit Factor | ≥ 1.3 | 1.0 | Gross profit / gross loss |
| Calmar Ratio | ≥ 0.75 | 0.33 | Return / max drawdown |

### 6.2 Backtest vs DCA Baseline

```typescript
// DCA (Dollar Cost Average) baseline strategi
interface DCABaselineConfig {
  investmentAmount: number;    // Fixed amount per period
  frequency: 'daily' | 'weekly' | 'monthly';
  asset: string;               // e.g., 'BTC/USDT'
  startDate: Date;
  endDate: Date;
}

// Sammenligningsmetrikker
interface BenchmarkComparison {
  strategyReturn: number;
  dcaReturn: number;
  alpha: number;               // Strategy - DCA
  beta: number;                // Market correlation
  informationRatio: number;    // Alpha / tracking error
  treynorRatio: number;        // Return / beta
}
```

---

## 7. Implementasjons Roadmap

### Fase 1: Fundament (Uke 1-3)
- [ ] Database migrasjoner (RL, beta users, white-label)
- [ ] Bybit API client med realistic execution
- [ ] Fear/Greed index integrasjon
- [ ] RL environment setup

### Fase 2: RL Engine (Uke 4-6)
- [ ] PPO implementasjon
- [ ] State space encoding
- [ ] Reward function tuning
- [ ] Backtest integrasjon

### Fase 3: Paper Harness (Uke 7-9)
- [ ] Beta user onboarding flow
- [ ] Kill switch system
- [ ] Daily P&L tracking
- [ ] Performance dashboards

### Fase 4: White-label (Uke 10-12)
- [ ] MiFID2 compliance layer
- [ ] AUM fee calculator
- [ ] B2B API endpoints
- [ ] Partner onboarding portal

---

## 8. Teknisk Stack

| Komponent | Teknologi | Begrunnelse |
|-----------|-----------|-------------|
| RL Framework | TensorFlow.js / ONNX | Browser + server kompatibel |
| Exchange API | Bybit v5 | Lave fees, god API |
| Execution | Rust/WASM | Latency-kritisk kode |
| Compliance | Node.js + PostgreSQL | Eksisterende stack |
| ML Pipeline | Python + FastAPI | Training offline |
| Monitoring | Grafana + Prometheus | Real-time metrics |

---

## 9. Risiko & Mitigasjon

| Risiko | Sannsynlighet | Impact | Mitigasjon |
|--------|--------------|--------|------------|
| RL overfitting | Medium | Høy | Walk-forward testing, regelmessig retraining |
| Regulatorisk endring | Medium | Høy | MiFID2 compliance som standard, fleksibel arkitektur |
| API endringer | Lav | Medium | Abstraksjonslag, versjonering |
| Beta user churn | Medium | Lav | God UX, transparent rapportering |
| Performance under target | Medium | Høy | Fallback til eksisterende strategier |

---

## 10. Suksesskriterier

1. **RL Performance:** ≥ 15% annualisert på 12-måneders backtest
2. **Beta User Satisfaction:** NPS ≥ 50 etter 12 uker
3. **Compliance:** 100% MiFID2 transaction reporting accuracy
4. **System Reliability:** 99.9% uptime for white-label API
5. **Kill Switch Effectiveness:** < 0.1% av brukere når daily loss cap

---

**Dokumentversjon:** 1.0  
**Sist oppdatert:** 2026-04-06  
**Eier:** Trading AI Team
