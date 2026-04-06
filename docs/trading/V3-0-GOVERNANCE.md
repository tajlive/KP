# Klarpakke V3.0 – Trading Governance & Best Execution Policy

**Document Version:** 1.0  
**Effective Date:** 2026-04-06  
**Review Cycle:** Quarterly  
**Owner:** Head of Quantitative Trading

---

## 1. Policy Objectives

This document establishes the governance framework for algorithmic trading in Klarpakke V3.0, ensuring:

- **Best Execution** for all client orders
- **Risk Management** that cannot be overridden by trading algorithms
- **Transparency** through immutable audit trails
- **Regulatory Compliance** (MiFID II, national regulations)
- **Continuous Improvement** via champion/challenger methodology

---

## 2. Best Execution Policy

### 2.1 Execution Factors (MiFID II Art. 27)

When executing client orders, we consider and document the following factors:

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Price | 30% | Distance from mid-price |
| Costs | 25% | Trading fees, slippage, market impact |
| Speed | 20% | Latency to execution |
| Likelihood of execution | 15% | Order book depth analysis |
| Size | 5% | Capacity to fill large orders |
| Nature of order | 5% | Urgency, order type |

### 2.2 Venue Selection

Available venues are scored and ranked based on the above factors. The venue with the highest total score is selected unless:

- Client specifies a particular venue
- Technical constraints prevent access
- Liquidity is insufficient (< 10% of order size)

### 2.3 Evidence Collection

For every order, we collect immutable evidence:

1. **Order Intent** – Time, size, side, type, strategy
2. **L2 Snapshot** – Top 5 bid/ask levels at decision time
3. **Venue Scores** – Scored factors for all venues
4. **Expected Fill** – Estimated price, slippage, confidence
5. **Actual Fill** – Executed price, fees, latency, venue
6. **Outcome Analysis** – Price improvement, quality score

---

## 3. Risk Governance

### 3.1 Hard Limits (Agent Cannot Override)

| Limit | Default | Hard/Soft | Action on Breach |
|-------|---------|-----------|------------------|
| Max Daily Loss | $500 / 5% | Hard | Block trading |
| Max Drawdown | 15% | Hard | Block trading |
| Max Position Size | 30% of equity | Hard | Reduce/Reject |
| Max Notional | $50,000 | Hard | Reduce/Reject |
| Max Leverage | 3x | Hard | Reject |
| Consecutive Loss Cooldown | 5 losses / 10 bars | Hard | Block temporarily |
| Volatility Circuit Breaker | 8% ATR | Hard | Block temporarily |
| Max Trades/Day | 50 | Soft | Warn, then block |

### 3.2 Risk Kernel Architecture

The Risk Kernel runs server-side and operates independently of the trading agent:

```
Trading Agent → Risk Kernel → Execution
     ↓              ↓            ↓
  Proposes      Validates    Executes
   Trade        / Adjusts
```

The Risk Kernel:
- Maintains immutable state
- Logs all violations
- Can reduce trade size but not increase it
- Blocks trades that violate hard limits

### 3.3 Risk State Management

Risk state is maintained per user:

```typescript
interface RiskState {
  equity: number;
  peakEquity: number;
  dailyPnl: number;
  openPositions: number;
  consecutiveLosses: number;
  tradesToday: number;
  volatilitySpikeActive: boolean;
  // ... additional fields
}
```

---

## 4. Trading Strategy Governance

### 4.1 Policy Ensemble Structure

Trading decisions are made by an ensemble of policies:

| Policy | Type | Purpose |
|--------|------|---------|
| V2 Trend | Legacy | Trend following with EMA crossover |
| V2 DCA | Legacy | Dollar cost averaging |
| V2 Grid | Legacy | Mean reversion within bands |
| PPO RL | ML | Neural network policy with sentiment |
| Fallback | Safety | Conservative rules-based |
| No-Trade | Safety | Explicit non-action |

### 4.2 Regime-Aware Selection

Market regimes are classified as:

| Regime | Primary Policy | Secondary | No-Trade Threshold |
|--------|---------------|-----------|-------------------|
| Bull | Trend | Breakout | Uncertainty > 40% |
| Bear | Trend | Mean-reversion | Uncertainty > 40% |
| Chop | Mean-reversion | – | Uncertainty > 50% |
| High Vol | No-trade | Breakout | Always block |
| Unknown | No-trade | – | Always block |

### 4.3 Uncertainty & No-Trade

Every decision includes:
- **Confidence**: 0-1 score
- **Uncertainty**: 0-1 score (disagreement between policies)

Explicit no-trade occurs when:
- Uncertainty > 40%
- Confidence < 60%
- Regime confidence < 50%
- In high-volatility regime

---

## 5. Champion/Challenger Rollout

### 5.1 Rollout Strategy

| Cohort | Champion | Challenger | Promotion Criteria |
|--------|----------|------------|-------------------|
| Alpha | 95% | 5% | Sharpe > 0.8 |
| Beta 1 | 80% | 20% | Sharpe > champion |
| Beta 2 | 50% | 50% | Outperformance sustained |
| Production | Champion | – | – |

### 5.2 Auto-Rollback Triggers

Challenger is automatically rolled back if:

- Sharpe ratio < 0.8 AND < 70% of champion
- Max drawdown > 20%
- Error rate > 5%
- Win rate < 45%
- Total return < 50% of champion

### 5.3 Graduation Criteria

A challenger graduates to champion when:

- 100+ trades in sample
- Sharpe ratio > 1.1x champion
- Max drawdown < 1.1x champion
- No rollback events for 30 days
- Approved by Risk Committee

---

## 6. Audit & Compliance

### 6.1 Immutable Audit Trail

Every order generates an `ExecutionEvidence` record:

- **Hash**: SHA-256 of content (tamper detection)
- **Evidence ID**: Unique identifier
- **Timeline**: Intent → Decision → Submission → Fill
- **Immutable**: Cannot be modified after creation

### 6.2 MiFID II Reporting

Transaction reports include (RTS 22):

- Transaction ID
- Instrument identification (ISIN)
- Price, quantity, venue
- Transaction time (UTC, μs precision)
- Client categorization
- Best execution evidence reference

### 6.3 Weekly Calibration

Slippage and latency parameters are calibrated weekly:

1. Collect actual fill data
2. Compare expected vs actual
3. Adjust slippage factors
4. Update latency buffers
5. Document changes

---

## 7. Data Retention

| Data Type | Retention Period | Format |
|-----------|-----------------|--------|
| Execution Evidence | 7 years | Immutable JSON |
| L2 Snapshots | 30 days | Compressed |
| Risk Violations | 7 years | Database |
| Calibration Data | 2 years | JSON |
| Champion/Challenger Metrics | 2 years | Database |

---

## 8. Incident Response

### 8.1 Risk Limit Breach

1. **Detection**: Risk Kernel blocks trade
2. **Notification**: Alert to risk team
3. **Investigation**: Review within 1 hour
4. **Resolution**: Manual reset or continued block
5. **Documentation**: Incident report within 24 hours

### 8.2 Execution Quality Degradation

1. **Detection**: Weekly calibration or real-time monitoring
2. **Threshold**: > 20% increase in slippage or latency
3. **Action**: Switch to fallback execution
4. **Investigation**: Root cause analysis
5. **Resolution**: Fix or escalate

### 8.3 Rollback Activation

1. **Trigger**: Automated threshold breach
2. **Action**: 100% traffic to champion
3. **Notification**: Immediate to all stakeholders
4. **Investigation**: Post-mortem within 48 hours
5. **Recovery**: Fix challenger before re-enabling

---

## 9. Roles & Responsibilities

| Role | Responsibilities |
|------|-----------------|
| Head of Quant | Policy approval, champion/challenger decisions |
| Risk Manager | Risk limit setting, violation review |
| Compliance Officer | MiFID II reporting, audit trail verification |
| Trading Engineer | Implementation, calibration, monitoring |
| ML Engineer | Model training, evaluation, deployment |

---

## 10. Review & Updates

This policy is reviewed quarterly and updated as needed:

- **Q1 Review**: Focus on risk limits and performance
- **Q2 Review**: Focus on execution quality
- **Q3 Review**: Focus on regulatory compliance
- **Q4 Review**: Annual comprehensive review

Changes require approval from:
1. Head of Quant
2. Risk Manager
3. Compliance Officer

---

## 11. Appendices

### Appendix A: Glossary

- **Champion**: Current production policy
- **Challenger**: New policy under evaluation
- **Evidence ID**: SHA-256 hash of execution evidence
- **Hard Limit**: Cannot be overridden
- **L2 Snapshot**: Limit order book state
- **Regime**: Market condition classification
- **Soft Limit**: Can be overridden with approval

### Appendix B: Regulatory References

- MiFID II Directive 2014/65/EU
- MiFID II Delegated Regulation (EU) 2017/565
- RTS 6 (Algorithmic Trading)
- RTS 22 (Transaction Reporting)
- RTS 27 (Best Execution)

### Appendix C: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-06 | Initial governance framework |

---

**Approval:**

- [ ] Head of Quantitative Trading
- [ ] Chief Risk Officer
- [ ] Compliance Officer

---

*This document is confidential and proprietary to Klarpakke AS.*
