# CryptoPilot — 6-Phase Implementation Roadmap

See also: `.hermes/plans/2026-07-27_061500-crypto-pilot-agent.md` for the master plan.

## Phase Status

| Phase | Name | Status | Files |
|---|---|---|---|
| 1 | NewsPulse | 🔴 Planned | `news/news-pulse.ts`, `news/news-analyzer.ts`, `news/social-sentiment.ts` |
| 2 | ChainRadar | 🔴 Planned | `onchain/whale-radar.ts`, `onchain/exchange-flow.ts` |
| 3 | MacroScope | 🔴 Planned | `macro/macro-scope.ts`, `macro/regime-detector.ts` |
| 4 | AlphaSquad | 🔴 Planned | `agents/news-agent.ts`, `agents/onchain-agent.ts`, `agents/narrative-agent.ts` |
| 5 | ProfitMax | 🔴 Planned | `meta/ab-testing.ts`, `meta/performance-feedback.ts`, `meta/user-calibration.ts` |
| 6 | AutoHeal | 🔴 Planned | `meta/mistake-classifier.ts`, `meta/auto-healer.ts`, `meta/continuous-learner.ts`, `meta/mistake-predictor.ts` |

## Key APIs & Dependencies

| Phase | External API | Cost |
|---|---|---|
| 1 | CryptoPanic API | Free (10k calls/mo) |
| 1 | CoinGecko News API | Free |
| 1 | SocialData API (Twitter) | Free tier |
| 2 | Whale Alert API | Free tier |
| 2 | Etherscan API | Free (5 calls/sec) |
| 2 | DefiLlama API | Free |
| 3 | FRED API (Federal Reserve) | Free |
| 3 | Yahoo Finance | Free (unofficial) |
| 3 | Trading Economics API | Free tier |

## New Supabase Tables

```sql
-- Phase 1
CREATE TABLE news_events (...);

-- Phase 2
CREATE TABLE whale_movements (...);

-- Phase 5
CREATE TABLE strategy_performance (
  user_id UUID, agent_id TEXT, win_rate NUMERIC, sharpe NUMERIC, ...
);

-- Phase 6
CREATE TABLE trade_mistakes (
  user_id UUID, agent_id TEXT, category TEXT, pnl NUMERIC,
  healing_applied BOOLEAN, healing_action JSONB, ...
);
```

## Cron Jobs

| Job | Schedule | Phase |
|---|---|---|
| CryptoPilot Daily Learning | 06:00 CET | 6 |
| Whale Radar Poll | Every 15 min | 2 |
| News Pulse Poll | Every 5 min | 1 |
| Macro Scope Update | Every 30 min | 3 |
