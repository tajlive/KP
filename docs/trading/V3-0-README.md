# Klarpakke V3.0 – AI Trading Bot Foundation

**Release:** Q3 2026 | **Benchmark Target:** 15% annualized > 8.33% pair-trading baseline

**Architecture:** Regime-aware | Risk-separated | Audit-compliant | Rollout-safe

---

## Quick Start

### 1. Regime-Aware Trading

```typescript
import { RegimeClassifier, PolicyEnsemble } from '@/lib/trading/regime';

// Detect market regime
const classifier = new RegimeClassifier();
const regime = classifier.classify({
  adx: 35,
  diPlus: 28,
  diMinus: 15,
  ema20Slope: 0.02,
  atrPercent: 0.03,
  // ... other features
});

// Regime-aware policy decision
const ensemble = new PolicyEnsemble();
const decision = ensemble.decide(state, useChallenger);

if (!decision.shouldTrade) {
  console.log('No-trade due to:', decision.explanation);
}
```

### 2. Risk Kernel (Server-Side Enforcement)

```typescript
import { RiskKernel, RiskStateManager } from '@/lib/trading/risk';

// Initialize
const risk = new RiskKernel({
  maxDailyLoss: 500,
  maxDrawdownPercent: 0.15,
  maxPositionSize: 0.3
});

const stateManager = new RiskStateManager(10000);

// Check trade before execution
const { allowed, violations, adjustedTrade } = risk.checkTrade(proposedTrade, stateManager.getState());

if (!allowed) {
  console.error('Risk violation:', violations);
}
```

### 3. Execution Audit

```typescript
import { ExecutionAuditor } from '@/lib/trading/execution';

const auditor = new ExecutionAuditor();

// Record intent
const evidence = auditor.recordIntent({
  orderId: 'order-123',
  clientId: 'user-456',
  side: 'buy',
  symbol: 'BTC/USDT',
  // ...
});

// Record fill
auditor.recordFill('order-123', {
  orderId: 'order-123',
  price: 65000,
  quantity: 0.1,
  // ...
});

// Verify integrity
const { valid } = auditor.verifyIntegrity('order-123');
```

### 4. Champion/Challenger Rollout

```typescript
import { ChampionChallengerRollout } from '@/lib/trading/rollout';

const rollout = new ChampionChallengerRollout();

// Check if user should use challenger
const { useChallenger, reason } = rollout.shouldUseChallenger('beta_1', 'user-123');

// Record metrics
rollout.recordMetrics({
  version: useChallenger ? 'challenger' : 'champion',
  cohort: 'beta_1',
  sharpeRatio: 1.2,
  maxDrawdown: 0.10,
  // ...
});

// Check status
const status = rollout.getStatus('beta_1');
console.log('Health:', status.health);
console.log('Recommendations:', status.recommendations);
```

---

## Rollout Strategy

### Phase 1: Alpha (Week 1-2)

| Aspect | Configuration |
|--------|---------------|
| Users | 10 internal |
| Traffic Split | 95% Champion / 5% Challenger |
| Policies | PPO RL (challenger) vs Ensemble (champion) |
| Risk Limits | Standard |
| Monitoring | Real-time Sharpe, drawdown, error rate |
| Rollback Trigger | Auto on degradation |

**Success Criteria:**
- Challenger Sharpe > 0.8
- No critical errors
- Risk limits respected

### Phase 2: Beta 1 (Week 3-6)

| Aspect | Configuration |
|--------|---------------|
| Users | 30 external |
| Traffic Split | 80% Champion / 20% Challenger |
| Auto-Rollback | Enabled |
| Calibration | Weekly slippage updates |

**Success Criteria:**
- Challenger Sharpe > Champion
- Max drawdown < 15%
- Error rate < 5%

### Phase 3: Beta 2 (Week 7-10)

| Aspect | Configuration |
|--------|---------------|
| Users | 60 external |
| Traffic Split | 50% Champion / 50% Challenger |
| Evaluation | A/B statistical significance |

**Success Criteria:**
- Statistical significance (p < 0.05)
- Consistent outperformance
- No rollback events for 30 days

### Phase 4: Production (Week 11-12)

| Aspect | Configuration |
|--------|---------------|
| Users | All |
| Champion | Graduated challenger |
| Monitoring | Continuous |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRADING AGENT                            │
├─────────────────────────────────────────────────────────────────┤
│  Regime Classifier → Policy Ensemble (V2/PPO/Fallback)          │
│         ↓                                                       │
│  Decision: {action, confidence, uncertainty, shouldTrade}       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      RISK KERNEL (Server)                       │
├─────────────────────────────────────────────────────────────────┤
│  Hard Limits: daily loss, drawdown, position, leverage, etc.    │
│  Actions: ALLOW / REDUCE / BLOCK                                │
│  Immutable: Cannot be overridden by agent                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      EXECUTION ENGINE                           │
├─────────────────────────────────────────────────────────────────┤
│  L2 Snapshot → Venue Scoring → Best Execution Selection         │
│         ↓                                                       │
│  Immutable Audit: Intent → Expected → Actual → Evidence         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### Regime Awareness
- **Bull**: Trend-following strategies
- **Bear**: Trend + mean-reversion
- **Chop**: Mean-reversion only
- **High-Vol**: No-trade mode

### Risk Separation
- Risk Kernel runs independently
- Hard limits cannot be overridden
- Violations logged immutably

### Uncertainty Quantification
- Explicit confidence scoring
- Policy disagreement = uncertainty
- No-trade when uncertain

### Audit Trail
- SHA-256 hashed evidence
- MiFID II compliant
- Weekly calibration

### Auto-Rollback
- Automatic degradation detection
- Traffic switches to champion
- Alert to risk team

---

## API Endpoints

### Regime & Policy
```bash
POST /api/trading/v3/regime/classify
POST /api/trading/v3/policy/decide
```

### Risk
```bash
POST /api/trading/v3/risk/check
GET  /api/trading/v3/risk/status
```

### Execution
```bash
POST /api/trading/v3/execution/audit
GET  /api/trading/v3/execution/evidence/:orderId
```

### Rollout
```bash
GET  /api/trading/v3/rollout/status
POST /api/trading/v3/rollout/metrics
```

---

## Configuration

### Environment Variables
```bash
# Risk
RISK_MAX_DAILY_LOSS=500
RISK_MAX_DRAWDOWN=0.15
RISK_MAX_POSITION=0.3

# Rollout
ROLLOUT_CHAMPION=ensemble
ROLLOUT_CHALLENGER=ppo-rl
ROLLOUT_AUTO_ROLLBACK=true

# Audit
AUDIT_RETENTION_DAYS=2555  # 7 years
```

---

## Testing

```bash
# Unit tests
npm run test:unit -- src/lib/trading/regime
npm run test:unit -- src/lib/trading/risk
npm run test:unit -- src/lib/trading/execution
npm run test:unit -- src/lib/trading/rollout

# Integration
npm run test:integration -- trading-v3

# Calibration
npm run execution:calibrate
```

---

## Monitoring

### Dashboards
- **Risk**: Real-time limits, violations
- **Execution**: Slippage, latency, fill rates
- **Rollout**: Champion vs challenger metrics
- **Regime**: Regime distribution, transitions

### Alerts
- Risk limit breach (Critical)
- Execution quality degradation (Warning)
- Rollback activated (Critical)
- Calibration deviation (Warning)

---

## Documentation

- **Architecture:** `docs/trading/V3-0-ARCHITECTURE.md`
- **Governance:** `docs/trading/V3-0-GOVERNANCE.md`
- **API:** `docs/trading/V3-0-API.md`

---

## License

© 2026 Klarpakke AS. All rights reserved.
