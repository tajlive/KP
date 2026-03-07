# Auto Trading System

Complete automated trading system for Klarpakke. Allows users to enable AI-driven trading that executes trades automatically based on market signals.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER DASHBOARD                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auto Config  │  │ Paper Trade  │  │ Risk Profile │      │
│  │   Card       │  │    Card      │  │   Selector   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                           │
│  auto_trading_configs    paper_trading_sessions             │
│  - enabled               - balance                          │
│  - mode (paper/live)     - trades                           │
│  - risk_level                                               │
│  - max_trade_size_nok                                       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRADING ENGINE                           │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Signal Eval    │───▶│  Trade Executor │                │
│  │  - Confidence   │    │  - Paper/Live   │                │
│  │  - Risk Check   │    │  - Validation   │                │
│  │  - Freshness    │    │  - Logging      │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CRON JOB                                 │
│  Runs every 15 minutes via Vercel Cron                      │
│  - Fetches active traders                                   │
│  - Evaluates recent signals                                 │
│  - Executes eligible trades                                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### auto_trading_configs
```sql
CREATE TABLE auto_trading_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  mode VARCHAR(10) CHECK (mode IN ('paper', 'live')),
  risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
  max_trade_size_nok INTEGER DEFAULT 10000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### paper_trading_sessions
```sql
CREATE TABLE paper_trading_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_balance DECIMAL(15,2) DEFAULT 100000,
  current_balance DECIMAL(15,2) DEFAULT 100000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Paper Trading
- `POST /api/paper-trading/init` - Initialize session for new user
- `POST /api/paper-trading/trade` - Execute paper trade
- `GET /api/paper-trading/balance` - Get current balance

### Auto Trading
- `GET /api/cron/auto-trade` - Cron endpoint for trading cycle

### Configuration
Risk thresholds:
- **Low**: 80%+ confidence required
- **Medium**: 70%+ confidence required  
- **High**: 60%+ confidence required

## Components

### AutoTradingConfigCard
Full configuration UI with:
- Enable/disable toggle
- Mode selector (Paper/Live)
- Risk level selector (Low/Medium/High)
- Max trade size slider

### PaperTradingCard
Balance display with:
- Current balance
- P&L calculation
- Reset functionality

### AutoTradingToggle
Simple on/off switch for auto trading.

## Usage

### Enable Auto Trading
```typescript
import { AutoTradingConfigCard } from '@/components/dashboard/AutoTradingConfigCard';

// In dashboard:
<AutoTradingConfigCard />
```

### Execute Trade Manually
```typescript
import { executePaperTrade } from '@/lib/supabase/paper-trading';

await executePaperTrade(userId, {
  symbol: 'BTC',
  side: 'buy',
  quantity: 0.01,
  price: 900000,
  total_value: 9000,
});
```

### Toggle Auto Trading
```typescript
import { toggleAutoTrading } from '@/lib/supabase/auto-trading';

await toggleAutoTrading(userId, true); // Enable
await toggleAutoTrading(userId, false); // Disable
```

## Testing

Run tests:
```bash
npm test src/lib/trading/__tests__/auto-trader.test.ts
```

## Security

- All API routes require authentication
- Database RLS policies enforce user isolation
- Paper trading mode is default for new users
- Live trading requires explicit opt-in

## Cron Configuration (Supabase)

We use **Supabase Cron** (pg_cron) instead of Vercel Cron for better reliability and no rate limits.

### Setup

Run the migration to enable cron jobs:
```bash
supabase db push
```

This creates:
- Cron job running every 5 minutes
- Calls Supabase Edge Function `auto-trade`
- Logs all executions to `cron_execution_logs`

### Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `auto-trading-every-5-min` | `*/5 * * * *` | Executes auto trades |
| `sync-prices-hourly` | `0 * * * *` | Syncs price data |

### Manual Trigger

You can manually trigger via Supabase Dashboard:
1. Go to Database → Cron Jobs
2. Click "Run" on the job

Or via SQL:
```sql
SELECT cron.run_job('auto-trading-every-5-min');
```

### Monitoring

Check execution logs:
```sql
SELECT * FROM cron_execution_logs 
ORDER BY executed_at DESC 
LIMIT 10;
```

View cron job status:
```sql
SELECT * FROM cron.job;
```

## Future Enhancements

- [ ] Real-time WebSocket signals
- [ ] Trade history and analytics
- [ ] Strategy backtesting
- [ ] Copy trading integration
- [ ] Mobile notifications
