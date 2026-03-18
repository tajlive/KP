-- ============================================================================
-- UKE 2: CORE FEATURES MIGRASJON
-- DCA Bot + AI Alerts + Paper Trading Leaderboard
-- ============================================================================

-- ============================================================================
-- 1. DCA BOT TABELL
-- ============================================================================

CREATE TABLE IF NOT EXISTS dca_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_per_month INTEGER NOT NULL CHECK (amount_per_month >= 100 AND amount_per_month <= 100000),
  crypto TEXT NOT NULL CHECK (crypto IN ('BTC', 'ETH', 'SOL')),
  frequency TEXT NOT NULL CHECK (frequency IN ('ukentlig', 'annenhver-uke', 'månedlig')),
  is_active BOOLEAN DEFAULT true,
  next_purchase_at TIMESTAMPTZ NOT NULL,
  total_invested DECIMAL(20,2) DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, crypto)
);
CREATE INDEX IF NOT EXISTS idx_dca_bots_active ON dca_bots(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dca_bots_next_purchase ON dca_bots(next_purchase_at) WHERE is_active = true;
ALTER TABLE dca_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see own bots" 
  ON dca_bots FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own bots" 
  ON dca_bots FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own bots" 
  ON dca_bots FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own bots" 
  ON dca_bots FOR DELETE 
  USING (auth.uid() = user_id);
COMMENT ON TABLE dca_bots IS 'Dollar Cost Averaging (DCA) bot konfigurasjon per bruker';
-- ============================================================================
-- 2. PRICE ALERTS TABELL
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('price_above', 'price_below', 'rsi_oversold', 'rsi_overbought', 'ai_confidence')),
  condition_value DECIMAL(20,8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol, is_active);
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alerts" 
  ON price_alerts FOR ALL 
  USING (auth.uid() = user_id);
COMMENT ON TABLE price_alerts IS 'AI-forklarte prisvarsler med push-notifikasjoner';
-- ============================================================================
-- 3. PAPER TRADING LEADERBOARD
-- ============================================================================

-- Legg til consent-felt i profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS consent_paper_trading_public BOOLEAN DEFAULT false;
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT;
-- Oppdater eksisterende brukere med username fra email
UPDATE profiles 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;
-- Materialized view for leaderboard (oppdatert via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS paper_trading_leaderboard AS
SELECT 
  p.id as user_id,
  COALESCE(p.username, 'Anonym') as username,
  p.avatar_url,
  COALESCE(SUM(pt.profit_loss_percent), 0) as total_profit_loss_percent,
  CASE 
    WHEN COUNT(pt.id) > 0 THEN
      (COUNT(CASE WHEN pt.profit_loss_percent >= 0 THEN 1 END)::DECIMAL / COUNT(pt.id) * 100)
    ELSE 0
  END as win_rate,
  COUNT(pt.id) as total_trades,
  CASE 
    WHEN COUNT(pt.id) >= 100 AND COALESCE(SUM(pt.profit_loss_percent), 0) > 50 THEN 'master'
    WHEN COUNT(pt.id) >= 50 AND COALESCE(SUM(pt.profit_loss_percent), 0) > 20 THEN 'pro'
    WHEN COUNT(pt.id) >= 20 THEN 'trader'
    ELSE 'rookie'
  END as badge
FROM profiles p
LEFT JOIN paper_accounts pa
  ON pa.user_id = p.id
LEFT JOIN paper_trades pt
  ON pt.account_id = pa.id
WHERE p.consent_paper_trading_public = true
GROUP BY p.id, p.username, p.avatar_url
HAVING COUNT(pt.id) >= 5;
CREATE INDEX IF NOT EXISTS idx_paper_trading_leaderboard_profit ON paper_trading_leaderboard(total_profit_loss_percent DESC);
-- Funksjon for å refreshe leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW paper_trading_leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_dca_bots_updated_at
  BEFORE UPDATE ON dca_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- ============================================================================
-- VERIFISERING
-- ============================================================================

SELECT 
  'Uke 2 migrasjon fullført' as status,
  (SELECT COUNT(*) FROM dca_bots WHERE 1=0) as dca_bots_ready,
  (SELECT COUNT(*) FROM price_alerts WHERE 1=0) as price_alerts_ready;
