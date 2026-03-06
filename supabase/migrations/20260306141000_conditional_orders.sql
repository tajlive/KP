-- ============================================================================
-- Conditional Orders (Stop Loss / Take Profit / Trailing Stop)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conditional_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES trading_sessions(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stop_loss', 'take_profit', 'trailing_stop')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL,
  trigger_price NUMERIC NOT NULL,
  limit_price NUMERIC NOT NULL,
  trailing_percent NUMERIC,
  current_price_at_creation NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'executed', 'cancelled', 'expired')),
  mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
  triggered_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conditional_orders_user_id ON conditional_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_session_id ON conditional_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_status ON conditional_orders(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_conditional_orders_symbol ON conditional_orders(symbol);

-- RLS Policies
ALTER TABLE conditional_orders ENABLE ROW LEVEL SECURITY;

-- Users can view own orders
DROP POLICY IF EXISTS "Users can view own conditional orders" ON conditional_orders;
CREATE POLICY "Users can view own conditional orders"
ON conditional_orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create own orders
DROP POLICY IF EXISTS "Users can create own conditional orders" ON conditional_orders;
CREATE POLICY "Users can create own conditional orders"
ON conditional_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own orders
DROP POLICY IF EXISTS "Users can update own conditional orders" ON conditional_orders;
CREATE POLICY "Users can update own conditional orders"
ON conditional_orders FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own orders
DROP POLICY IF EXISTS "Users can delete own conditional orders" ON conditional_orders;
CREATE POLICY "Users can delete own conditional orders"
ON conditional_orders FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- CRON Job: Process Conditional Orders (for paper trading)
-- ============================================================================

-- Function to check and execute conditional orders
CREATE OR REPLACE FUNCTION process_conditional_orders()
RETURNS INTEGER AS $$
DECLARE
  v_order RECORD;
  v_current_price NUMERIC;
  v_triggered_count INTEGER := 0;
BEGIN
  -- Process pending orders
  FOR v_order IN 
    SELECT * FROM conditional_orders 
    WHERE status = 'pending' 
      AND mode = 'paper'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Fetch current price (in production, use cached price)
    -- This is simplified - real implementation would use Redis/cache
    
    -- Check if trigger condition met
    DECLARE
      should_trigger BOOLEAN := false;
    BEGIN
      CASE v_order.type
        WHEN 'stop_loss' THEN
          -- For sell orders: trigger if price <= trigger_price
          -- For buy orders: trigger if price >= trigger_price (short position)
          should_trigger := CASE 
            WHEN v_order.side = 'sell' THEN v_current_price <= v_order.trigger_price
            ELSE v_current_price >= v_order.trigger_price
          END;
          
        WHEN 'take_profit' THEN
          -- For sell orders: trigger if price >= trigger_price
          -- For buy orders: trigger if price <= trigger_price (short position)
          should_trigger := CASE 
            WHEN v_order.side = 'sell' THEN v_current_price >= v_order.trigger_price
            ELSE v_current_price <= v_order.trigger_price
          END;
          
        WHEN 'trailing_stop' THEN
          -- Trailing stop logic requires tracking highest price since creation
          -- Simplified: update trigger_price as price moves up
          should_trigger := false; -- Complex logic handled separately
      END CASE;
      
      IF should_trigger THEN
        -- Mark as triggered
        UPDATE conditional_orders 
        SET status = 'triggered', 
            triggered_at = NOW(),
            updated_at = NOW()
        WHERE id = v_order.id;
        
        v_triggered_count := v_triggered_count + 1;
        
        -- Note: Actual trade execution happens via separate job
        -- to avoid long-running transactions
      END IF;
    END;
  END LOOP;
  
  RETURN v_triggered_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment explaining usage
COMMENT ON TABLE conditional_orders IS 
'Stores conditional orders (stop-loss, take-profit, trailing-stop) for both paper and live trading';
