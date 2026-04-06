-- Migration: Klarpakke V3.0 – AI Trading Bot Foundation
-- Created: 2026-04-06
-- Features: RL Training, Beta Users, White-label API, European Tax Compliance

-- =============================================================================
-- 1. RL TRAINING TABLES
-- =============================================================================

-- RL Agent configurations and versions
CREATE TABLE IF NOT EXISTS rl_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  state_vector BYTEA, -- Serialized model weights
  parent_agent_id TEXT REFERENCES rl_agents(agent_id),
  is_active BOOLEAN DEFAULT FALSE,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RL Training episodes
CREATE TABLE IF NOT EXISTS rl_training_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES rl_agents(agent_id),
  episode_number INTEGER NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_reward DECIMAL(18,8),
  final_pnl DECIMAL(18,8),
  sharpe_ratio DECIMAL(8,4),
  max_drawdown DECIMAL(8,4),
  fear_greed_correlation DECIMAL(5,4),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, episode_number)
);

-- Experience replay buffer (sampled for training)
CREATE TABLE IF NOT EXISTS rl_experience_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES rl_agents(agent_id),
  episode_id UUID REFERENCES rl_training_episodes(id),
  state_vector DECIMAL(18,8)[] NOT NULL,
  action INTEGER NOT NULL,
  reward DECIMAL(18,8) NOT NULL,
  next_state_vector DECIMAL(18,8)[],
  done BOOLEAN DEFAULT FALSE,
  priority DECIMAL(10,8) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent performance tracking
CREATE TABLE IF NOT EXISTS rl_agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES rl_agents(agent_id),
  backtest_period_start DATE NOT NULL,
  backtest_period_end DATE NOT NULL,
  annualized_return DECIMAL(8,4),
  sharpe_ratio DECIMAL(8,4),
  max_drawdown DECIMAL(8,4),
  win_rate DECIMAL(5,4),
  profit_factor DECIMAL(8,4),
  vs_dca_alpha DECIMAL(8,4),
  vs_pair_trading_alpha DECIMAL(8,4),
  benchmark_passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. BETA USER MANAGEMENT
-- =============================================================================

-- Beta users with kill switch
CREATE TABLE IF NOT EXISTS beta_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cohort TEXT NOT NULL CHECK (cohort IN ('alpha', 'beta_1', 'beta_2')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'killed')),
  daily_pnl_cap DECIMAL(18,8) DEFAULT -500,
  daily_max_gain DECIMAL(18,8) DEFAULT 2000,
  max_drawdown_pct DECIMAL(5,4) DEFAULT 0.15,
  max_consecutive_losses INTEGER DEFAULT 5,
  volatility_threshold DECIMAL(5,2) DEFAULT 2.5,
  initial_capital DECIMAL(18,8) DEFAULT 10000,
  kill_switch_triggered_at TIMESTAMPTZ,
  kill_switch_reason TEXT,
  kill_switch_count INTEGER DEFAULT 0,
  override_approved_by UUID REFERENCES auth.users(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Daily metrics for beta users
CREATE TABLE IF NOT EXISTS beta_user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  starting_balance DECIMAL(18,8),
  ending_balance DECIMAL(18,8),
  daily_pnl DECIMAL(18,8),
  daily_pnl_pct DECIMAL(8,4),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  max_drawdown DECIMAL(18,8),
  max_drawdown_pct DECIMAL(8,4),
  volatility DECIMAL(8,4),
  fear_greed_index_avg INTEGER,
  rl_agent_version TEXT,
  kill_switch_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Kill switch history
CREATE TABLE IF NOT EXISTS kill_switch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('daily_loss', 'drawdown', 'consecutive_losses', 'volatility', 'manual', 'api_error')),
  severity TEXT NOT NULL CHECK (severity IN ('soft', 'medium', 'hard')),
  metric DECIMAL(18,8) NOT NULL,
  threshold DECIMAL(18,8) NOT NULL,
  message TEXT,
  auto_action TEXT NOT NULL CHECK (auto_action IN ('warn', 'pause', 'kill')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- 3. WHITE-LABEL PARTNER MANAGEMENT
-- =============================================================================

-- White-label partners
CREATE TABLE IF NOT EXISTS white_label_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  config JSONB NOT NULL DEFAULT '{}',
  compliance_settings JSONB NOT NULL DEFAULT '{}',
  fee_tiers JSONB NOT NULL DEFAULT '[]',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner user assignments
CREATE TABLE IF NOT EXISTS partner_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES white_label_partners(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  external_id TEXT,
  fee_tier_override JSONB,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, user_id)
);

-- =============================================================================
-- 4. MiFID2 COMPLIANCE TABLES
-- =============================================================================

-- Suitability assessments
CREATE TABLE IF NOT EXISTS mifid2_suitability_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  partner_id UUID REFERENCES white_label_partners(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  knowledge_level TEXT CHECK (knowledge_level IN ('basic', 'informed', 'expert')),
  experience_years INTEGER,
  financial_situation_score INTEGER,
  investment_objectives TEXT[],
  risk_tolerance TEXT CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  ability_to_bear_loss DECIMAL(5,4),
  suitable_products TEXT[],
  result TEXT CHECK (result IN ('suitable', 'not_suitable', 'unsure')),
  not_suitable_reasons TEXT[],
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product governance
CREATE TABLE IF NOT EXISTS mifid2_product_governance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  target_market JSONB NOT NULL,
  product_risk_level INTEGER CHECK (product_risk_level BETWEEN 1 AND 7),
  is_complex BOOLEAN DEFAULT FALSE,
  leverage_factor DECIMAL(8,4),
  cost_structure JSONB NOT NULL,
  stress_test_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Best execution reports
CREATE TABLE IF NOT EXISTS mifid2_best_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  partner_id UUID REFERENCES white_label_partners(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  selected_venue TEXT NOT NULL,
  venues_considered JSONB NOT NULL,
  execution_factors JSONB NOT NULL,
  total_cost DECIMAL(18,8),
  slippage_bps DECIMAL(8,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction reports (RTS 22)
CREATE TABLE IF NOT EXISTS mifid2_transaction_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES white_label_partners(id),
  trade_id UUID REFERENCES trades(id),
  report_id TEXT UNIQUE NOT NULL,
  transaction_id TEXT,
  trading_venue_tx_id TEXT,
  executing_entity TEXT NOT NULL,
  trading_capacity TEXT NOT NULL CHECK (trading_capacity IN ('DEAL', 'MTCH', 'AOTC')),
  quantity DECIMAL(18,8) NOT NULL,
  price DECIMAL(18,8) NOT NULL,
  venue TEXT NOT NULL,
  transaction_time TIMESTAMPTZ NOT NULL,
  instrument_identification TEXT NOT NULL,
  instrument_full_name TEXT,
  instrument_classification TEXT,
  price_notation TEXT,
  notional_amount DECIMAL(18,8),
  notional_currency TEXT,
  nature_of_transaction TEXT CHECK (nature_of_transaction IN ('OPEN', 'CLOSE', 'INCREASE', 'DECREASE')),
  client_id UUID REFERENCES auth.users(id),
  country_of_branch TEXT,
  report_status TEXT DEFAULT 'pending' CHECK (report_status IN ('pending', 'submitted', 'acknowledged', 'rejected')),
  submitted_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. EUROPEAN TAX COMPLIANCE
-- =============================================================================

-- European tax reports
CREATE TABLE IF NOT EXISTS european_tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  partner_id UUID REFERENCES white_label_partners(id),
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'CH', 'NO')),
  tax_year INTEGER NOT NULL,
  report_format TEXT NOT NULL CHECK (report_format IN ('XML', 'CSV', 'PDF')),
  report_data JSONB NOT NULL,
  total_gains DECIMAL(18,8),
  total_losses DECIMAL(18,8),
  net_taxable DECIMAL(18,8),
  estimated_tax DECIMAL(18,8),
  tax_currency TEXT,
  calculation_method TEXT CHECK (calculation_method IN ('FIFO', 'LIFO', 'HIFO', 'AVG')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_to_authority BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  submission_reference TEXT,
  UNIQUE(user_id, jurisdiction, tax_year)
);

-- Tax lots for detailed reporting
CREATE TABLE IF NOT EXISTS tax_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_report_id UUID NOT NULL REFERENCES european_tax_reports(id),
  acquisition_date DATE NOT NULL,
  disposal_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(18,8) NOT NULL,
  cost_basis DECIMAL(18,8) NOT NULL,
  proceeds DECIMAL(18,8) NOT NULL,
  fees DECIMAL(18,8) NOT NULL,
  gain_loss DECIMAL(18,8) NOT NULL,
  holding_period_days INTEGER,
  is_short_term BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- High water marks for performance fee calculation
CREATE TABLE IF NOT EXISTS high_water_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  partner_id UUID REFERENCES white_label_partners(id),
  high_water_mark DECIMAL(18,8) NOT NULL,
  set_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, partner_id)
);

-- AUM fee calculations
CREATE TABLE IF NOT EXISTS aum_fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  partner_id UUID REFERENCES white_label_partners(id),
  calculation_date DATE NOT NULL,
  aum DECIMAL(18,8) NOT NULL,
  annual_performance DECIMAL(18,8),
  management_fee DECIMAL(18,8),
  performance_fee DECIMAL(18,8),
  platform_fee DECIMAL(18,8),
  total_fee DECIMAL(18,8),
  effective_rate DECIMAL(8,6),
  applied_tier JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, partner_id, calculation_date)
);

-- =============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================================================

-- RL training indexes
CREATE INDEX IF NOT EXISTS idx_rl_episodes_agent ON rl_training_episodes(agent_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_rl_experience_agent ON rl_experience_buffer(agent_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_rl_performance_agent ON rl_agent_performance(agent_id, backtest_period_end DESC);

-- Beta user indexes
CREATE INDEX IF NOT EXISTS idx_beta_users_cohort ON beta_users(cohort, status);
CREATE INDEX IF NOT EXISTS idx_beta_users_status ON beta_users(status);
CREATE INDEX IF NOT EXISTS idx_beta_metrics_user_date ON beta_user_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_kill_switch_user ON kill_switch_history(user_id, triggered_at DESC);

-- White-label indexes
CREATE INDEX IF NOT EXISTS idx_partner_users_partner ON partner_users(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_users_user ON partner_users(user_id);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_suitability_client ON mifid2_suitability_assessments(client_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_reports_partner ON mifid2_transaction_reports(partner_id, transaction_time DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_reports_status ON mifid2_transaction_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_best_execution_order ON mifid2_best_execution(order_id);

-- Tax indexes
CREATE INDEX IF NOT EXISTS idx_tax_reports_user ON european_tax_reports(user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_reports_jurisdiction ON european_tax_reports(jurisdiction, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_lots_report ON tax_lots(tax_report_id);

-- =============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE rl_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_training_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_experience_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kill_switch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mifid2_suitability_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mifid2_product_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mifid2_best_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE mifid2_transaction_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE european_tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_water_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aum_fee_calculations ENABLE ROW LEVEL SECURITY;

-- Service role can access all
CREATE POLICY service_all_rl_agents ON rl_agents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_beta_users ON beta_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_partners ON white_label_partners FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_tax ON european_tax_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can only see their own data
CREATE POLICY user_own_beta ON beta_users FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_own_metrics ON beta_user_metrics FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_own_kill ON kill_switch_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_own_tax ON european_tax_reports FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_own_suitability ON mifid2_suitability_assessments FOR SELECT TO authenticated USING (client_id = auth.uid());

-- Partners can see their assigned users (simplified - would need partner auth)
CREATE POLICY partner_own_users ON partner_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- 8. FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_rl_agents_updated_at BEFORE UPDATE ON rl_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beta_users_updated_at BEFORE UPDATE ON beta_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON white_label_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_governance_updated_at BEFORE UPDATE ON mifid2_product_governance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check beta user kill switch
CREATE OR REPLACE FUNCTION check_beta_kill_switch(p_user_id UUID)
RETURNS TABLE (
  can_trade BOOLEAN,
  reason TEXT,
  severity TEXT
) AS $$
DECLARE
  v_status TEXT;
  v_daily_pnl DECIMAL;
  v_daily_cap DECIMAL;
  v_current_drawdown DECIMAL;
  v_max_drawdown DECIMAL;
BEGIN
  -- Get user status
  SELECT status, daily_pnl_cap, max_drawdown_pct
  INTO v_status, v_daily_cap, v_max_drawdown
  FROM beta_users
  WHERE user_id = p_user_id;
  
  -- Check if killed
  IF v_status = 'killed' THEN
    RETURN QUERY SELECT FALSE, 'Account killed', 'hard';
    RETURN;
  END IF;
  
  -- Check if paused
  IF v_status = 'paused' THEN
    RETURN QUERY SELECT FALSE, 'Account paused', 'medium';
    RETURN;
  END IF;
  
  -- Get today's PnL
  SELECT COALESCE(daily_pnl, 0)
  INTO v_daily_pnl
  FROM beta_user_metrics
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- Check daily loss limit
  IF v_daily_pnl <= v_daily_cap THEN
    -- Trigger kill switch
    INSERT INTO kill_switch_history (user_id, trigger_type, severity, metric, threshold, message, auto_action)
    VALUES (p_user_id, 'daily_loss', 'hard', v_daily_pnl, v_daily_cap, 
            format('Daily loss limit: %s / %s', v_daily_pnl, v_daily_cap), 'kill');
    
    UPDATE beta_users 
    SET status = 'killed', kill_switch_triggered_at = NOW(), kill_switch_reason = 'Daily loss limit',
        kill_switch_count = kill_switch_count + 1, status_changed_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT FALSE, format('Daily loss limit reached: %s USD', v_daily_pnl), 'hard';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate AUM fees
CREATE OR REPLACE FUNCTION calculate_aum_fees(
  p_client_id UUID,
  p_partner_id UUID,
  p_aum DECIMAL,
  p_annual_performance DECIMAL
)
RETURNS TABLE (
  management_fee DECIMAL,
  performance_fee DECIMAL,
  platform_fee DECIMAL,
  total_fee DECIMAL,
  effective_rate DECIMAL
) AS $$
DECLARE
  v_tier JSONB;
  v_management_fee DECIMAL;
  v_performance_fee DECIMAL;
  v_platform_fee DECIMAL;
  v_high_water_mark DECIMAL;
  v_profit_above_hwm DECIMAL;
BEGIN
  -- Get applicable fee tier
  SELECT fee_tiers -> 0 INTO v_tier
  FROM white_label_partners
  WHERE id = p_partner_id;
  
  -- Find correct tier
  FOR i IN 0..(
    SELECT jsonb_array_length(fee_tiers) - 1 
    FROM white_label_partners WHERE id = p_partner_id
  ) LOOP
    SELECT fee_tiers -> i INTO v_tier
    FROM white_label_partners
    WHERE id = p_partner_id
      AND (fee_tiers -> i ->> 'minAUM')::DECIMAL <= p_aum
      AND (fee_tiers -> i ->> 'maxAUM')::DECIMAL > p_aum;
    
    EXIT WHEN v_tier IS NOT NULL;
  END LOOP;
  
  -- Default to first tier if not found
  IF v_tier IS NULL THEN
    SELECT fee_tiers -> 0 INTO v_tier
    FROM white_label_partners WHERE id = p_partner_id;
  END IF;
  
  -- Calculate management fee
  v_management_fee := GREATEST(
    (v_tier ->> 'minFee')::DECIMAL,
    p_aum * (v_tier ->> 'managementFee')::DECIMAL
  );
  
  -- Calculate performance fee with high water mark
  SELECT high_water_mark INTO v_high_water_mark
  FROM high_water_marks
  WHERE client_id = p_client_id AND partner_id = p_partner_id;
  
  v_high_water_mark := COALESCE(v_high_water_mark, p_aum - p_annual_performance);
  v_profit_above_hwm := GREATEST(0, p_aum - v_high_water_mark);
  v_performance_fee := v_profit_above_hwm * (v_tier ->> 'performanceFee')::DECIMAL;
  
  -- Update high water mark
  INSERT INTO high_water_marks (client_id, partner_id, high_water_mark)
  VALUES (p_client_id, p_partner_id, GREATEST(v_high_water_mark, p_aum))
  ON CONFLICT (client_id, partner_id) 
  DO UPDATE SET high_water_mark = GREATEST(high_water_marks.high_water_mark, p_aum);
  
  -- Platform fee (monthly * 12)
  v_platform_fee := (v_tier ->> 'platformFee')::DECIMAL * 12;
  
  RETURN QUERY SELECT 
    v_management_fee,
    v_performance_fee,
    v_platform_fee,
    v_management_fee + v_performance_fee + v_platform_fee,
    (v_management_fee + v_performance_fee + v_platform_fee) / NULLIF(p_aum, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment explaining the migration
COMMENT ON TABLE rl_agents IS 'RL agent configurations for V3.0 sentiment-based trading';
COMMENT ON TABLE beta_users IS 'Beta user management with kill switch for V3.0';
COMMENT ON TABLE white_label_partners IS 'White-label partner configuration for B2B API';
COMMENT ON TABLE mifid2_transaction_reports IS 'MiFID2 RTS 22 transaction reporting';
COMMENT ON TABLE european_tax_reports IS 'European jurisdiction tax compliance reports';
