---
name: klarpakke-crypto-pilot
description: Use when building crypto AI, agents, signals, or strategy.
version: 1.2.0
author: Hermes Lead Architect
tags:
- crypto
- trading
- ai
- agents
- signals
- auto-heal
whenToUse: Når bruker ber om trading-signaler, agent-ensemble, auto-healing eller
  strategi-optimalisering. IKKE for ren UI/dashboard-styling.
---

# CryptoPilot — Klarpakke Crypto Trading AI Agent

This skill defines the architecture and implementation patterns for all crypto trading AI agents in Klarpakke. Load it when working on: trading signals, AI agents, ensemble engines, auto-trading, market analysis, strategy optimization, or the auto-healing system.

## 📚 Referanser (les når du trenger det)

| Fil | Les når... |
|---|---|
| `references/jokertrade-pipeline.md` | Du jobber med JokerTrade |
| `references/arkitektur-og-agenter.md` | Du endrer agent-arkitektur |
| `references/signal-pipeline.md` | Du endrer signal-pipeline |
| `references/competitor-research-v5.md` | Du trenger konkurrent-analyse |
| `references/currency-mismatch-fix.md` | Du feilsøker valuta-bugs |
| `references/dashboard-auth-fix.md` | Du feilsøker auth |
| `references/db-constraint-debugging.md` | Du feilsøker DB-constraints |
| `references/implementation-roadmap.md` | Du planlegger implementasjon |
| `references/joker-signal-strategy.md` | Du endrer signal-strategi |
| `references/jokertrade-integration.md` | Du integrerer JokerTrade |
| `references/minimum-order-value-fix.md` | Du feilsøker min-order |
| `references/phantom-capital-fix.md` | Du feilsøker kapital-bugs |
| `references/session-cleanup-pattern.md` | Du rydder sesjoner |
| `references/session-crash-investigation.md` | Du feilsøker krasj |
| `references/test-strategy.md` | Du tester strategier |
| `references/misc.md` | Diverse andre crypto-pilot-oppgaver |

---

## Architecture

Klarpakke uses a **multi-agent ensemble** approach: 12 independent trading agents each generate their own signals, and an ensemble engine combines them with weighted scoring.

### Active Agents

| Agent | Weight | Strategy | Added |
|---|---|---|---|
| trendAgent | 0.20 | Follow directional price trends | original |
| meanReversionAgent | 0.15 | Buy oversold, sell overbought | original |
| breakoutAgent | 0.15 | Enter on volatility breakouts | original |
| volatilityAgent | 0.10 | Trade volatility regimes | original |
| momentumAgent | 0.10 | Follow price momentum | original |
| volumeAgent | 0.10 | Volume-confirmed entries | original |
| hurstAgent | 0.10 | Hurst exponent regime detection | original |
| gridAgent | 0.05 | Range-bound grid trading | original |
| sentimentAgent | 0.05 | Social/Reddit sentiment signals | original |
| newsAgent | 0.08 | NewsPulse: CryptoPanic + LLM analysis | 2026-07-27 |
| onchainAgent | 0.07 | ChainRadar: whale tracking + exchange flow | 2026-07-27 |
| narrativeAgent | 0.05 | Narrative detection + rotation signals | 2026-07-27 |

### Signal Pipeline

```
Market Data → 12 Agents → Ensemble Engine → Signal Guard → Risk Engine → Execution
                    ↑              ↑
          News/On-chain/Narrative   Makro (6 regimes)
```

## Competitive Strategy — 6 Data Layers

To beat Binance/Bybit/3Commas, CryptoPilot aims to be the first platform with ALL of:

1. **Technical Analysis** — RSI, MACD, Bollinger, Hurst (existing ✅)
2. **Social Sentiment** — Reddit (existing ✅), planned: Twitter/X, Telegram
3. **News** — CryptoPanic API, CoinGecko News, LLM-based analysis
4. **On-Chain** — Whale Alert, exchange flows, DeFi yields
5. **Macro** — FRED, S&P correlation, 6 market regimes
6. **Mistake Memory** — AutoHeal: classify → heal → remember → predict

## Adding a New Trading Agent

1. Create `src/lib/ai/agents/<name>-agent.ts` implementing `TradingAgent`
2. Export from `src/lib/ai/agents/index.ts`
3. Add to `DEFAULT_AGENTS` array with appropriate `baselineWeight`
4. Write test in `src/lib/ai/agents/__tests__/`
5. Update ensemble-engine weights if needed

### Agent Interface

```typescript
interface TradingAgent {
  id: string;           // unique, e.g. 'trend'
  name: string;         // display name
  baselineWeight: number; // 0-1, relative weight in ensemble
  run(symbol: string, features: AgentFeatures, state?: AgentState): AgentSignal | Promise<AgentSignal>;
}

interface AgentSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasoning: string;
  meta?: Record<string, unknown>;
}
```

## Reference

See `.hermes/plans/2026-07-27_061500-crypto-pilot-agent.md` for the full CryptoPilot implementation plan including NewsPulse, ChainRadar, MacroScope, and AlphaSquad phases.

See `references/jokertrade-integration.md` for how JokerTrade was converted from Math.random() to the CryptoPilot 12-agent ensemble (2026-07-27 session).

See `references/db-constraint-debugging.md` for DB constraint pitfalls on the `trades` table (is_copy, is_mock, double-balance from paused sessions).

See `references/competitor-research-v5.md` for the 2026 competitor analysis that drove v5 features (market-regime filter, sentiment agent, trailing stop-loss).

See `references/phantom-capital-fix.md` for the critical phantom-capital accounting bug, root cause analysis, `getRealAvailableCapital()` permanent fix, and one-time correction query.

See `references/currency-mismatch-fix.md` for the critical currency mismatch bug (NOK vs USDT) and how it was fixed — 7.3× capital drain per trade.

See `references/session-crash-investigation.md` for the unresolved investigation into what sets `trading_sessions.status = 'crashed'` — the trigger, tick cron, and application code were all ruled out.

See `references/minimum-order-value-fix.md` for the minimum order value bug (4.74 < 10.00) — per-coin fallback prices, USDT-aware guard, and why hardcoded BTC fallback breaks non-BTC coins.

See `references/session-cleanup-pattern.md` for the session cleanup pattern — stopping empty sessions after failed trades to prevent 15+ active/crashed sessions with 0 trades.
