# API Route Fikser

## 1. Fix: cron/tick/route.ts

Erstatt session-fetch logikken:

```typescript
// ERSTATT (linje 341-346):
const { data: sessions, error } = await db
  .from('trading_sessions')
  .select('*')
  .eq('status', 'active')
  .order('last_tick_at', { ascending: true, nullsFirst: true })
  .limit(50);

// MED:
// Hent fra begge tabeller
const [{ data: sessions1 }, { data: sessions2 }] = await Promise.all([
  db.from('trading_sessions').select('*').eq('status', 'active'),
  db.from('auto_trading_sessions').select('*').eq('status', 'active')
]);

// Konverter auto_trading_sessions format
const convertedSessions = (sessions2 || []).map(s => ({
  id: s.id,
  user_id: s.user_id,
  mode: s.is_paper_trading ? 'paper' : 'live',
  status: s.status === 'error' ? 'crashed' : s.status,
  strategy_id: s.strategy_name?.toLowerCase().replace(/\s+/g, '_') || 'dca',
  strategy_config: {},
  trading_pair: 'BTC/USDT', // TODO: Må migreres
  current_capital: s.current_capital_nok,
  initial_capital: s.starting_capital_nok,
  open_position: null,
  total_trades: s.total_trades,
  winning_trades: s.winning_trades,
  total_pnl: s.total_pnl_nok,
  last_heartbeat: s.updated_at,
  last_tick_at: null,
  crash_count: 0,
  started_at: s.started_at,
  stopped_at: s.ended_at,
  _source: 'auto_trading_sessions' // Track source for insert
}));

const allSessions = [...(sessions1 || []), ...convertedSessions]
  .sort((a, b) => {
    const aTick = a.last_tick_at ? new Date(a.last_tick_at).getTime() : 0;
    const bTick = b.last_tick_at ? new Date(b.last_tick_at).getTime() : 0;
    return aTick - bTick;
  })
  .slice(0, 50);
```

Også oppdater insert logikken:

```typescript
// ERSETT (linje 431-450):
const { data: trade, error } = await db
  .from('trades')
  .insert({ ... });

// MED:
const isLegacySession = (session as any)._source === 'auto_trading_sessions';

let tradeResult;
if (isLegacySession) {
  // Insert i auto_trading_trades
  tradeResult = await db
    .from('auto_trading_trades')
    .insert({
      session_id: session.id,
      user_id: session.user_id,
      symbol: session.trading_pair.replace('/', ''),
      side: signal.action === 'buy' ? 'LONG' : 'SHORT',
      entry_price: currentPrice,
      quantity: quantity,
      position_value_nok: totalValue,
      status: 'OPEN',
      is_paper: session.mode === 'paper',
      opened_at: new Date().toISOString(),
    })
    .select('id')
    .single();
} else {
  // Insert i trades
  tradeResult = await db
    .from('trades')
    .insert({
      session_id: session.id,
      user_id: session.user_id,
      idempotency_key: idempotencyKey,
      mode: session.mode,
      trading_pair: session.trading_pair,
      side: signal.action,
      order_type: 'market',
      quantity: quantity,
      price: currentPrice,
      total_value: totalValue,
      fee: session.mode === 'live' ? mul(totalValue, 0.001) : 0,
      status: 'filled',
      strategy_signal: signal.indicators,
    })
    .select('id')
    .single();
}
```

## 2. Fix: Legg til Risk Manager i cron/tick

Legg til før trade insert:

```typescript
// Importer RiskManager
import { RiskManager } from '@/lib/auto-trading/risk-manager';

// I processSession, før trade insert:
const riskConfig = await getRiskConfig(session.user_id);
const riskManager = new RiskManager(riskConfig);

const riskCheck = await riskManager.canExecuteTrade({
  userId: session.user_id,
  sessionId: session.id,
  tradeAmount: totalValue,
  currentCapital: session.current_capital,
  direction: signal.action === 'buy' ? 'LONG' : 'SHORT',
  symbol: session.trading_pair,
});

if (!riskCheck.allowed) {
  console.warn(`Trade blocked by risk manager: ${riskCheck.reason}`);
  return { session_id: session.id, action: 'hold', error: riskCheck.reason };
}
```

## 3. Fix: Forbedre idempotency key

```typescript
// ERSETT (linje 424):
const idempotencyKey = `${session.id}-${signal.action}-${new Date().toISOString().slice(0, 16)}`;

// MED:
const idempotencyKey = `${session.id}-${signal.action}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

## 4. Fix: Legg til Sentry logging i alle routes

```typescript
// I catch blocks, erstatt:
console.error('Error:', error);

// Med:
import * as Sentry from '@sentry/nextjs';

Sentry.captureException(error, {
  level: 'error',
  tags: { 
    component: 'cron-tick',
    sessionId: session.id,
    userId: session.user_id 
  },
  extra: { 
    signal,
    currentPrice,
    quantity
  }
});
```
