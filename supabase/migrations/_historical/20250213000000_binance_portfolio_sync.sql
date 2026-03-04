-- Binance Portfolio Sync System
-- Henter data fra Binance API og lagrer i databasen

-- ============================================
-- 1. BINANCE SYNC LOG
-- ============================================
CREATE TABLE IF NOT EXISTS binance_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'in_progress')),
  message TEXT,
  balances_synced INTEGER DEFAULT 0,
  positions_synced INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. BINANCE BALANCES (Cache)
-- ============================================
CREATE TABLE IF NOT EXISTS binance_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  free DECIMAL(18, 8) NOT NULL DEFAULT 0,
  locked DECIMAL(18, 8) NOT NULL DEFAULT 0,
  total DECIMAL(18, 8) GENERATED ALWAYS AS (free + locked) STORED,
  usd_value DECIMAL(18, 2) DEFAULT 0,
  last_price DECIMAL(18, 8),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, asset)
);

-- ============================================
-- 3. FUNCTION: Sync Binance Balances
-- ============================================
CREATE OR REPLACE FUNCTION sync_binance_balances(
  p_user_id UUID,
  p_balances JSONB
)
RETURNS TABLE(assets_synced INTEGER, total_usd_value DECIMAL) AS $$
DECLARE
  v_asset TEXT;
  v_free DECIMAL;
  v_locked DECIMAL;
  v_count INTEGER := 0;
  v_total_usd DECIMAL := 0;
  v_balance RECORD;
BEGIN
  -- Loop through balances
  FOR v_balance IN SELECT * FROM jsonb_array_elements(p_balances)
  LOOP
    v_asset := v_balance->>'asset';
    v_free := (v_balance->>'free')::DECIMAL;
    v_locked := (v_balance->>'locked')::DECIMAL;
    
    -- Skip zero balances
    IF v_free > 0 OR v_locked > 0 THEN
      -- Insert or update
      INSERT INTO binance_balances (user_id, asset, free, locked)
      VALUES (p_user_id, v_asset, v_free, v_locked)
      ON CONFLICT (user_id, asset) 
      DO UPDATE SET 
        free = EXCLUDED.free,
        locked = EXCLUDED.locked,
        updated_at = NOW();
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_count, v_total_usd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCTION: Get Portfolio Overview (enhetlig)
-- ============================================
CREATE OR REPLACE FUNCTION get_portfolio_overview_v2(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_value DECIMAL := 0;
  v_total_invested DECIMAL := 0;
  v_position_count INTEGER := 0;
BEGIN
  -- Sjekk først om bruker har Binance-konto
  SELECT COALESCE(SUM(usd_value), 0), COUNT(*) 
  INTO v_total_value, v_position_count
  FROM binance_balances 
  WHERE user_id = p_user_id AND (free + locked) > 0;
  
  -- Hvis ingen Binance-data, bruk paper trading
  IF v_total_value = 0 THEN
    SELECT 
      COALESCE(SUM(current_value), 0),
      COALESCE(SUM(total_invested), 0),
      COUNT(*)
    INTO v_total_value, v_total_invested, v_position_count
    FROM portfolios
    WHERE user_id = p_user_id;
  END IF;
  
  v_result := jsonb_build_object(
    'totalValue', v_total_value,
    'totalInvested', v_total_invested,
    'positionCount', v_position_count,
    'hasRealAccount', EXISTS(SELECT 1 FROM exchange_api_keys WHERE user_id = p_user_id AND is_active = true),
    'lastSynced', (SELECT MAX(updated_at) FROM binance_balances WHERE user_id = p_user_id)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE binance_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE binance_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON binance_sync_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own balances"
  ON binance_balances FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 6. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_binance_balances_user ON binance_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_binance_balances_user_asset ON binance_balances(user_id, asset);
CREATE INDEX IF NOT EXISTS idx_binance_sync_log_user ON binance_sync_log(user_id, created_at DESC);

-- ============================================
-- 7. AUTO-SYNC TRIGGER (hver time)
-- ============================================
CREATE OR REPLACE FUNCTION trigger_binance_auto_sync()
RETURNS void AS $$
BEGIN
  -- Dette vil bli kalt av en cron-job eller edge function
  -- Marker kontoer som trenger sync
  UPDATE exchange_api_keys 
  SET updated_at = NOW()
  WHERE is_active = true 
    AND (last_validated_at IS NULL OR last_validated_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

SELECT 'Binance portfolio sync system created successfully!' as status;
