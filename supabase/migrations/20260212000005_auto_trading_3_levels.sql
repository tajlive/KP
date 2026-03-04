-- Auto-Trading 3 Levels: Conservative, Balanced, Aggressive
-- =========================================================

-- Update risk_level to include Norwegian names and better defaults
ALTER TABLE auto_trading_settings 
DROP CONSTRAINT IF EXISTS auto_trading_settings_risk_level_check;

ALTER TABLE auto_trading_settings 
ADD CONSTRAINT auto_trading_settings_risk_level_check 
CHECK (risk_level IN ('conservative', 'balanced', 'aggressive', 'low', 'medium', 'high'));

-- Function to get trading level config
CREATE OR REPLACE FUNCTION get_trading_level_config(p_level TEXT)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  v_config := CASE p_level
    -- Level 1: Conservative (Pensjonist-modus)
    WHEN 'conservative' THEN jsonb_build_object(
      'name_no', 'Pensjonist',
      'name_en', 'Conservative',
      'description', 'Sikker vekst med lav risiko. Bra for langsiktig sparing.',
      'max_allocation_percent', 10,
      'stop_loss_percent', 2.0,
      'take_profit_percent', 4.0,
      'max_trades_per_day', 2,
      'min_time_between_trades', 360, -- 6 hours
      'ma_short', 20,
      'ma_long', 50,
      'rsi_oversold', 25,
      'rsi_overbought', 75,
      'color', 'emerald',
      'icon', '🛡️'
    )
    
    -- Level 2: Balanced (Student-modus)
    WHEN 'balanced' THEN jsonb_build_object(
      'name_no', 'Student',
      'name_en', 'Balanced',
      'description', 'Balansert risiko/avkastning. Standard for de fleste brukere.',
      'max_allocation_percent', 25,
      'stop_loss_percent', 4.0,
      'take_profit_percent', 8.0,
      'max_trades_per_day', 5,
      'min_time_between_trades', 180, -- 3 hours
      'ma_short', 12,
      'ma_long', 26,
      'rsi_oversold', 30,
      'rsi_overbought', 70,
      'color', 'blue',
      'icon', '⚖️'
    )
    
    -- Level 3: Aggressive (Day Trader-modus)
    WHEN 'aggressive' THEN jsonb_build_object(
      'name_no', 'Day Trader',
      'name_en', 'Aggressive',
      'description', 'Høy risiko, høy potensiell avkastning. Kun for erfarne tradere.',
      'max_allocation_percent', 50,
      'stop_loss_percent', 6.0,
      'take_profit_percent', 12.0,
      'max_trades_per_day', 15,
      'min_time_between_trades', 60, -- 1 hour
      'ma_short', 5,
      'ma_long', 15,
      'rsi_oversold', 35,
      'rsi_overbought', 65,
      'color', 'red',
      'icon', '🚀'
    )
    
    ELSE NULL
  END;
  
  RETURN v_config;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to apply trading level to user settings
CREATE OR REPLACE FUNCTION apply_trading_level(
  p_user_id UUID,
  p_level TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  v_config := get_trading_level_config(p_level);
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid trading level');
  END IF;
  
  -- Insert or update settings
  INSERT INTO auto_trading_settings (
    user_id,
    risk_level,
    max_auto_allocation_percent,
    stop_loss_percent,
    take_profit_percent,
    max_trades_per_day_per_coin,
    min_time_between_trades_minutes,
    ma_short,
    ma_long,
    rsi_oversold,
    rsi_overbought
  ) VALUES (
    p_user_id,
    p_level,
    (v_config->>'max_allocation_percent')::int,
    (v_config->>'stop_loss_percent')::float,
    (v_config->>'take_profit_percent')::float,
    (v_config->>'max_trades_per_day')::int,
    (v_config->>'min_time_between_trades')::int,
    (v_config->>'ma_short')::int,
    (v_config->>'ma_long')::int,
    (v_config->>'rsi_oversold')::int,
    (v_config->>'rsi_overbought')::int
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    risk_level = EXCLUDED.risk_level,
    max_auto_allocation_percent = EXCLUDED.max_auto_allocation_percent,
    stop_loss_percent = EXCLUDED.stop_loss_percent,
    take_profit_percent = EXCLUDED.take_profit_percent,
    max_trades_per_day_per_coin = EXCLUDED.max_trades_per_day_per_coin,
    min_time_between_trades_minutes = EXCLUDED.min_time_between_trades_minutes,
    ma_short = EXCLUDED.ma_short,
    ma_long = EXCLUDED.ma_long,
    rsi_oversold = EXCLUDED.rsi_oversold,
    rsi_overbought = EXCLUDED.rsi_overbought,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'level', p_level,
    'config', v_config
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for trading levels overview
CREATE OR REPLACE VIEW trading_levels AS
SELECT 
  'conservative' as level_id,
  'Pensjonist' as name_no,
  'Conservative' as name_en,
  '🛡️' as icon,
  'emerald' as color,
  1 as sort_order
UNION ALL SELECT 
  'balanced' as level_id,
  'Student' as name_no,
  'Balanced' as name_en,
  '⚖️' as icon,
  'blue' as color,
  2 as sort_order
UNION ALL SELECT 
  'aggressive' as level_id,
  'Day Trader' as name_no,
  'Aggressive' as name_en,
  '🚀' as icon,
  'red' as color,
  3 as sort_order;

GRANT SELECT ON trading_levels TO authenticated;

-- Default settings for existing users (set to balanced)
INSERT INTO auto_trading_settings (user_id, risk_level)
SELECT id, 'balanced'
FROM profiles
WHERE id NOT IN (SELECT user_id FROM auto_trading_settings)
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Auto-trading 3 levels setup complete' as status;
