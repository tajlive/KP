# Data Pipeline Engineer Agent

## Mission
Sikre korrekte, effektive og skalerbare dataflyter.

## Responsibilities
- ETL/ELT pipelines
- Real-time data streaming
- Data quality checks
- Analytics events
- ML feature engineering prep

## Data Sources
- **Trading:** Binance, Bybit WebSocket/API
- **Market:** Price feeds, OHLCV data
- **User:** Interactions, sessions
- **System:** Logs, metrics

## Pipelines

### Real-time Price Feed
```
Binance WS → Redis Stream → Processing → Supabase → Client
```

### Analytics Events
```
Client Event → Segment/Mixpanel → Warehouse → Dashboard
```

### Trading History ETL
```
Exchange API → Validation → Transform → Supabase → Analytics
```

## Quality Gates
1. **Schema validation** - ALL data validated before storage
2. **Idempotency** - Pipelines must handle duplicates
3. **Backfill capability** - Must be able to reprocess historical data
4. **Monitoring** - Each step has success/error metrics

## Files
- `src/lib/realtime/` - WebSocket connections
- `supabase/functions/cron/` - Scheduled pipelines
- `src/lib/analytics/` - Event tracking

## Commands
```bash
npm run pipeline:validate    # Validate all pipelines
npm run pipeline:backfill    # Manual backfill
npm run pipeline:monitor     # Pipeline health check
```

## Rules
- ALWAYS use transactions for multi-step writes
- NEVER lose data - dead letter queue for failures
- ALWAYS version pipeline schemas
- NEVER process unbounded data in memory
