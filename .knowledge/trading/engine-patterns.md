# Trading Engine Knowledge

## Caching-strategi (2026-04-13)
- **RegimeScan:** Redis/Memory cache per symbol, `sonar:regime:${symbol}`, TTL fra config
- **NarrativeScan:** Redis/Memory cache per symbol, `sonar:narrative:${symbol}`, 2h TTL (matcher regimeScan)
- Cache-modul: `src/lib/cache.ts` (Upstash Redis i prod, MemoryCache i dev)
- Alle nye Sonar/Perplexity-kall SKAL vurdere caching

## Database-constraints
- `trading_sessions` har `UNIQUE(user_id, trading_pair, strategy_id)` — duplikat insert gir postgres 23505
- API-ruten `POST /api/auto-trading/paper` fanger nå 23505 og returnerer beskrivende feilmelding

## Confluent Signal Engine
- Hovedmotor for AI-signaler: `src/lib/trading/confluent-signal-engine.ts`
- Dashboard-komponent: `src/features/trading/TopAIInsightsRow.tsx` (henter BTC-signal)
- Plassert over SignalFeed i `UnifiedTradingDashboard.tsx`

## Paper Trading Flow
- BotWizard → `POST /api/auto-trading/paper` → `trading_sessions` insert → redirect til `/dashboard/bot/{id}`
- Session limits: `src/lib/trading/session-limits.ts` (per tier)
- Toast-nøkler: `toasts.paperBot.*` namespace i messages/

## Strategy IDs
- Gyldige: `dca`, `trend`, `grid`, `multi`, `ai-copy`
- Validert med Zod i API-ruten
