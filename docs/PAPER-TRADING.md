# Paper Trading Feature

**Issue:** #55
**Status:** ✅ Implemented

## Overview

Paper Trading allows users to practice trading risk-free with a simulated account. Users can test strategies and gain experience before trading with real capital.

### Key Features

- ⚪ **White Badge Indicator** - Demo account clearly marked
- 💰 **Virtual Balance** - Start with a configurable amount
- 📊 **Real-time P&L Tracking** - Track profits and losses
- 📈 **Trading Statistics** - Win rate, average profit, best/worst trades
- 🔒 **Safe Mode Integration** - Works with Trygg modus guardrails
- 🚫 **Permission Gating** - Blocks access until safe mode is understood

## Architecture

### Database Schema

Three main tables in Supabase:

#### `paper_accounts`
User's paper trading account with balance tracking.

```sql
CREATE TABLE paper_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  initial_balance DECIMAL(12, 2),
  current_balance DECIMAL(12, 2),
  total_profit_loss DECIMAL(12, 2),
  win_count INTEGER,
  loss_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `paper_positions`
Open and closed trading positions.

```sql
CREATE TABLE paper_positions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  position_type TEXT ('long' | 'short'),
  entry_price DECIMAL(10, 4),
  quantity DECIMAL(16, 8),
  current_price DECIMAL(10, 4),
  stop_loss DECIMAL(10, 4),
  take_profit DECIMAL(10, 4),
  status TEXT ('open' | 'closed' | 'cancelled'),
  profit_loss DECIMAL(12, 2),
  profit_loss_percent DECIMAL(6, 2),
  opened_at TIMESTAMP,
  closed_at TIMESTAMP
);
```

#### `paper_trades`
Historical record of closed positions and trades.

```sql
CREATE TABLE paper_trades (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  position_id UUID NOT NULL,
  symbol TEXT,
  position_type TEXT,
  entry_price DECIMAL(10, 4),
  exit_price DECIMAL(10, 4),
  profit_loss DECIMAL(12, 2),
  profit_loss_percent DECIMAL(6, 2),
  duration_hours INTEGER,
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  created_at TIMESTAMP
);
```

### Views

#### `v_active_paper_positions`
Positions currently open, including unrealized P&L.

#### `v_paper_trading_stats`
Aggregated trading statistics per account.

## Frontend Components

### `PaperTradingDashboard`
Main dashboard showing:
- Account balance (initial, current, profit/loss)
- Trading statistics (trades, win rate, average profit)
- Return percentage
- Information box about paper trading

**Props:**
```typescript
interface PaperTradingDashboardProps {
  userId: string;
  onSelectPosition?: (positionId: string) => void;
}
```

**Usage:**
```tsx
<PaperTradingDashboard userId={user.id} />
```

### `PaperBadge`
White badge component indicating demo/paper account.

**Props:**
```typescript
interface PaperBadgeProps {
  variant?: 'default' | 'compact';
  className?: string;
}
```

**Usage:**
```tsx
<PaperBadge variant="compact" />
```

## API Endpoints

### GET `/api/paper-trading/account`
Get user's paper trading account.

**Query Parameters:**
- `userId` (required) - User ID

**Response:**
```typescript
interface PaperAccount {
  id: string;
  user_id: string;
  initial_balance: number;
  current_balance: number;
  total_profit_loss: number;
  win_count: number;
  loss_count: number;
  created_at: string;
  updated_at: string;
}
```

### POST `/api/paper-trading/account`
Create a new paper trading account.

**Request Body:**
```json
{
  "userId": "uuid",
  "initialBalance": 10000
}
```

### GET `/api/paper-trading/stats`
Get trading statistics.

**Query Parameters:**
- `userId` (required) - User ID

**Response:**
```typescript
interface PaperTradingStats {
  account_id: string;
  user_id: string;
  initial_balance: number;
  current_balance: number;
  total_profit_loss: number;
  return_percent: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_trade_profit_loss: number;
  best_trade: number;
  worst_trade: number;
  avg_trade_duration_hours: number;
}
```

### GET `/api/paper-trading/positions`
Get user's positions.

**Query Parameters:**
- `userId` (required) - User ID
- `status` (optional) - 'open' or 'closed' (default: 'open')

### POST `/api/paper-trading/positions`
Open a new position.

**Request Body:**
```json
{
  "accountId": "uuid",
  "symbol": "AAPL",
  "positionType": "long",
  "entryPrice": 150.25,
  "quantity": 10
}
```

## User Flow

### 1. Initialize Paper Account
When user first accesses paper trading:
1. Check if paper account exists
2. If not, create account with $10,000 starting capital
3. Show white "Demo Account" badge

### 2. Place Trade
User can:
1. Select symbol (from available signals)
2. Choose position type (long/short)
3. Enter amount or quantity
4. Set optional stop loss/take profit
5. Submit order

### 3. Monitor Position
- See unrealized P&L
- Track position performance
- Close position when ready

### 4. View Statistics
- Total trades count
- Win rate percentage
- Average profit per trade
- Best and worst trades
- Account return percentage

## Integration with Safe Mode (Trygg Modus)

Paper Trading works seamlessly with Safe Mode:

1. **Forced Paper Trading** - New users with Safe Mode ON can only access paper trading
2. **Guard Rails** - Position size limits based on account balance
3. **Education First** - Must complete paper trading before accessing live trading
4. **Risk Awareness** - Clear labeling of demo vs. live accounts

## Webflow Elements

### Required Elements

```html
<!-- Paper Trading Badge -->
<div data-paper-trading-badge></div>

<!-- Paper Trading Dashboard -->
<div id="klarpakke-paper-trading-root"></div>

<!-- Initial Balance Input (for setup) -->
<input type="number" data-paper-initial-balance min="1000" />

<!-- Position Entry Form -->
<div data-paper-position-form>
  <input type="text" data-symbol placeholder="Symbol" />
  <select data-position-type>
    <option value="long">Long</option>
    <option value="short">Short</option>
  </select>
  <input type="number" data-entry-price placeholder="Entry Price" />
  <input type="number" data-quantity placeholder="Quantity" />
  <button type="submit">Open Position</button>
</div>
```

## Testing

Run tests with:
```bash
npm test
```

Tests include:
- Paper account creation
- Position opening and closing
- P&L calculations
- Statistics accuracy
- Safe mode integration

## Implementation Checklist

- [x] Database schema (tables, views, functions)
- [x] TypeScript types
- [x] React components (Dashboard, Badge)
- [x] API routes (account, stats, positions)
- [x] Documentation
- [ ] Webflow pages integration
- [ ] End-to-end tests
- [ ] Live trading integration (Phase 3)

## Future Enhancements

1. **Real Market Data** - Connect to live price feeds
2. **Advanced Orders** - Limit orders, market orders, trailing stops
3. **Leaderboards** - Compare performance with other users
4. **Sharing** - Share trading performance and strategies
5. **Mobile App** - Native iOS/Android support
6. **Paper Trading Tournaments** - Compete for prizes

## Security Considerations

- **Row Level Security (RLS)** - Users only see their own data
- **Service Role Key** - API endpoints use server-side authentication
- **Input Validation** - All inputs validated server-side
- **Audit Logging** - All trades logged for compliance

## Performance

- Trades are calculated server-side for accuracy
- Views provide optimized query performance
- Indexes on frequently accessed columns
- Pagination ready for large position lists

## Related Documentation

- [Safe Mode (Trygg Modus)](/docs/ELEMENT-ID-REFERENCE.md#-trygg-modus-safe-mode)
- [Signals System](/docs/API.md)
- [Database Schema](/supabase/migrations/paper_trading.sql)
