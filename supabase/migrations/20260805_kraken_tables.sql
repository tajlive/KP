-- Kraken API-nøkler per bruker (kryptert)
CREATE TABLE IF NOT EXISTS user_kraken_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE user_kraken_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own kraken keys"
  ON user_kraken_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kraken keys"
  ON user_kraken_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kraken keys"
  ON user_kraken_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kraken keys"
  ON user_kraken_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access kraken keys"
  ON user_kraken_keys FOR ALL
  USING (auth.role() = 'service_role');

-- Index
CREATE INDEX IF NOT EXISTS idx_user_kraken_keys_user_id ON user_kraken_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kraken_keys_active ON user_kraken_keys(is_active) WHERE is_active = true;

-- Kraken konverteringer
CREATE TABLE IF NOT EXISTS kraken_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_asset TEXT NOT NULL,
  to_asset TEXT NOT NULL DEFAULT 'USDT',
  amount NUMERIC NOT NULL,
  received_amount NUMERIC,
  order_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE kraken_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversions"
  ON kraken_conversions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access conversions"
  ON kraken_conversions FOR ALL
  USING (auth.role() = 'service_role');

-- Index
CREATE INDEX IF NOT EXISTS idx_kraken_conversions_user_id ON kraken_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_kraken_conversions_status ON kraken_conversions(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_kraken_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kraken_keys_updated_at
  BEFORE UPDATE ON user_kraken_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_kraken_keys_updated_at();
