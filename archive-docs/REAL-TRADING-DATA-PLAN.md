# Real Trading Data Integration Plan

**Status:** Planning
**Scope:** Fetch real Binance trades → Store in Supabase → Display on Dashboard
**Priority:** HIGH - Core feature for beta

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Dashboard                           │
│                   (DashboardClient)                        │
│         Displays: Portfolio stats + Recent trades           │
└────────────────────────┬────────────────────────────────────┘
                         │ Fetches real data
                         ↓
         ┌───────────────────────────────┐
         │    Supabase Tables            │
         ├───────────────────────────────┤
         │ - auto_trades (trade history) │
         │ - portfolio_summary (stats)   │
         │ - trading_api_keys (encrypted)│
         └────────────────────┬──────────┘
                              │ Synced by
                              ↓
         ┌──────────────────────────────┐
         │  Binance Trade Sync Engine   │
         ├──────────────────────────────┤
         │ 1. Get encrypted API keys    │
         │ 2. Decrypt (AES-256)         │
         │ 3. Fetch trades from Binance │
         │ 4. Parse & store in DB       │
         │ 5. Calculate portfolio stats │
         └──────────────────────────────┘
              ↑                 ↑
    Triggered by:    Every 5 min (or manual)
    - Manual button
    - Scheduled job
    - Webhook from Binance
```

---

## 📋 Step-by-Step Implementation

### Phase 1: Database Schema (This Session)

**Create tables & RLS policies:**

```sql
-- 1. Auto Trades Table
CREATE TABLE auto_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Trade info
  symbol TEXT NOT NULL,           -- BTCUSDT, ETHUSDT, etc.
  side TEXT NOT NULL,             -- buy | sell
  order_type TEXT,                -- market | limit

  -- Amounts
  quantity FLOAT NOT NULL,        -- How much crypto
  quantity_nok FLOAT NOT NULL,    -- Amount in NOK spent/received
  price_per_unit FLOAT,           -- Entry price

  -- P&L
  current_price FLOAT,            -- Current market price
  pnl_nok FLOAT DEFAULT 0,        -- Profit/Loss in NOK
  pnl_percent FLOAT DEFAULT 0,    -- Profit/Loss %

  -- Status
  status TEXT DEFAULT 'open',     -- open | closed | cancelled
  close_price FLOAT,              -- Price when closed

  -- Binance info
  binance_order_id TEXT UNIQUE,   -- External ID from Binance

  -- Timestamps
  executed_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Portfolio Summary (Cached calculations)
CREATE TABLE portfolio_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Values
  total_value_nok FLOAT DEFAULT 0,    -- Total portfolio value
  total_profit_nok FLOAT DEFAULT 0,   -- Total profit
  total_profit_percent FLOAT DEFAULT 0,

  -- Today
  daily_change_nok FLOAT DEFAULT 0,
  daily_change_percent FLOAT DEFAULT 0,

  -- Counts
  total_trades INT DEFAULT 0,
  open_trades INT DEFAULT 0,
  closed_trades INT DEFAULT 0,
  win_rate FLOAT DEFAULT 0,           -- % of profitable trades

  -- Last updated
  last_synced_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Trade Sync Log (Track sync history)
CREATE TABLE trade_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT,                    -- success | error | in_progress
  message TEXT,
  trades_fetched INT DEFAULT 0,
  trades_saved INT DEFAULT 0,
  error_message TEXT,

  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 4. Enable RLS
ALTER TABLE auto_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_sync_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can read own trades"
  ON auto_trades
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own portfolio"
  ON portfolio_summary
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own sync logs"
  ON trade_sync_log
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

### Phase 2: Binance Sync Engine (Supabase Edge Function)

**File:** `supabase/functions/sync-binance-trades/index.ts`

**Functionality:**
1. Get user's encrypted Binance API keys from `trading_api_keys` table
2. Decrypt them (using ENCRYPTION_SECRET)
3. Call Binance API to fetch trades
4. Store new trades in `auto_trades` table
5. Calculate portfolio stats
6. Update `portfolio_summary` table
7. Log sync status in `trade_sync_log`

**Pseudocode:**
```typescript
export async function syncBinanceTrades(userId: string) {
  const supabase = createClient(...)

  // 1. Get encrypted keys
  const { data: apiKeys } = await supabase
    .from('trading_api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('exchange', 'binance')
    .single()

  if (!apiKeys) return { error: 'No API keys' }

  // 2. Decrypt
  const key = decrypt(apiKeys.api_key_encrypted, ENV.ENCRYPTION_SECRET)
  const secret = decrypt(apiKeys.api_secret_encrypted, ENV.ENCRYPTION_SECRET)

  // 3. Fetch from Binance
  const client = new BinanceClient(key, secret)
  const trades = await client.getMyTrades()

  // 4. Store in DB
  for (const trade of trades) {
    await supabase.from('auto_trades').upsert({
      user_id: userId,
      binance_order_id: trade.id,
      symbol: trade.symbol,
      // ... map Binance fields
    }, { onConflict: 'binance_order_id' })
  }

  // 5. Calculate portfolio stats
  const stats = await calculatePortfolioStats(userId)

  // 6. Update summary
  await supabase
    .from('portfolio_summary')
    .upsert({ user_id: userId, ...stats }, { onConflict: 'user_id' })

  // 7. Log
  await supabase.from('trade_sync_log').insert({
    user_id: userId,
    status: 'success',
    trades_fetched: trades.length,
    completed_at: new Date()
  })
}
```

---

### Phase 3: Dashboard Updates

**Update:** `DashboardClient.tsx`

**Changes:**
1. Remove hardcoded mock data
2. Fetch from Supabase in useEffect:
   ```typescript
   const { data: portfolio } = await supabase
     .from('portfolio_summary')
     .select('*')
     .eq('user_id', user.id)
     .single()

   const { data: trades } = await supabase
     .from('auto_trades')
     .select('*')
     .eq('user_id', user.id)
     .order('executed_at', { ascending: false })
     .limit(5)
   ```

3. Add "Sync Now" button:
   ```typescript
   const handleSyncTrades = async () => {
     const response = await fetch(
       `${SUPABASE_URL}/functions/v1/sync-binance-trades`,
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${session.access_token}`
         }
       }
     )
     // Refresh portfolio data
   }
   ```

4. Implement remaining tabs:
   - **Portfolio:** List all open positions with current values
   - **Trading:** Place new trades (or view history)
   - **Aktivitet:** Show all trades with P&L
   - **Innstillinger:** User preferences

---

### Phase 4: Real-time Updates (Optional)

**Future enhancement:**
- WebSocket subscription to Binance price updates
- Real-time P&L calculation
- Live portfolio value updates
- Push notifications on price alerts

---

## 🔧 Technical Details

### Binance API Integration

**Required libraries:**
```bash
npm install binance-api-node
# or use REST API directly with fetch
```

**Binance API calls needed:**
```typescript
// Get account trades
GET /api/v3/myTrades?symbol=BTCUSDT

// Get account balance
GET /api/v3/account

// Get order details
GET /api/v3/order?symbol=BTCUSDT&orderId=12345
```

### Encryption/Decryption

We already have `encryptApiKey()` in binance-connect Edge Function. We need the reverse:

```typescript
async function decryptApiKey(encrypted: string, iv: string, secret: string) {
  // Reverse of encryptApiKey()
  // Use AES-256-GCM with PBKDF2 derived key
}
```

### Portfolio Calculation Logic

```typescript
async function calculatePortfolioStats(userId: string) {
  // Fetch all open trades
  const openTrades = await supabase
    .from('auto_trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')

  // Fetch all closed trades
  const closedTrades = await supabase
    .from('auto_trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'closed')

  // Calculate
  const totalValue = openTrades.reduce((sum, t) => sum + (t.quantity * t.current_price), 0)
  const totalProfit = closedTrades.reduce((sum, t) => sum + t.pnl_nok, 0)
  const openProfit = openTrades.reduce((sum, t) => sum + t.pnl_nok, 0)

  const winRate = closedTrades.filter(t => t.pnl_nok > 0).length / closedTrades.length * 100

  const dailyChange = closedTrades
    .filter(t => isToday(t.closed_at))
    .reduce((sum, t) => sum + t.pnl_nok, 0)

  return {
    total_value_nok: totalValue,
    total_profit_nok: totalProfit + openProfit,
    total_trades: openTrades.length + closedTrades.length,
    open_trades: openTrades.length,
    closed_trades: closedTrades.length,
    win_rate: winRate,
    daily_change_nok: dailyChange,
    last_synced_at: new Date()
  }
}
```

---

## 📅 Implementation Timeline

### Session 1 (Today?)
- [ ] Create SQL tables
- [ ] Apply RLS policies
- [ ] Create migration file

### Session 2
- [ ] Create Supabase Edge Function for trade sync
- [ ] Implement Binance API integration
- [ ] Test with real API keys

### Session 3
- [ ] Update DashboardClient to fetch real data
- [ ] Remove mock data
- [ ] Implement "Sync Now" button
- [ ] Test on dashboard

### Session 4+
- [ ] Implement Portfolio tab
- [ ] Implement Trading tab
- [ ] Implement Aktivitet tab
- [ ] Implement Innstillinger tab

---

## ⚠️ Important Considerations

### Security
- ✅ API keys encrypted with AES-256
- ✅ RLS policies enforce user isolation
- ✅ Edge Function uses service role (server-side only)
- ✅ Never expose API keys to client

### Performance
- ⚠️ Fetching all trades on first sync could be slow
- Solution: Implement incremental sync (fetch only since last_synced_at)
- Solution: Paginate results
- Solution: Cache portfolio_summary table

### Data Accuracy
- ⚠️ Binance API rate limits (1200 requests/min)
- Solution: Batch sync requests
- Solution: Cache results
- Solution: Exponential backoff on errors

### Error Handling
- Network errors: Retry with exponential backoff
- API errors: Log and notify user
- Decryption errors: Require API key re-entry
- Data inconsistencies: Verification logic

---

## 🚀 Deployment Checklist

- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Edge Function deployed
- [ ] DashboardClient updated
- [ ] Error handling complete
- [ ] Rate limiting handled
- [ ] Testing on staging
- [ ] Production deployment

---

## 📊 Success Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Sync time | < 5 sec | For 100 trades |
| Data accuracy | 100% | Match Binance UI |
| Uptime | 99.9% | During trading hours |
| User satisfaction | > 4.5/5 | In beta feedback |

---

## 🎯 MVP (Minimum Viable Product)

**For beta launch, we need:**
1. ✅ Database tables
2. ✅ Binance sync (at least manual button)
3. ✅ Dashboard display real data
4. ⏳ Portfolio summary working
5. ⏳ "Sync Now" button available

**Can come later:**
- Automated sync schedule
- Live price updates
- All dashboard tabs fully implemented
- Advanced portfolio analytics

---

**Ready to start Phase 1?**

