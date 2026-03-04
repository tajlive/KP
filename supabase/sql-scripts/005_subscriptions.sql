-- Sprint 12: Subscriptions og betalingshistorikk
-- Kjøres i Supabase SQL Editor

-- ============================================================
-- TABELL: subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tier (matcher TierSlug fra src/lib/pricing/tiers.ts)
  tier_slug               TEXT NOT NULL CHECK (tier_slug IN ('student','bachelor','master','phd','professor')),

  -- Provider
  provider                TEXT NOT NULL CHECK (provider IN ('stripe','vipps','manual')),

  -- Stripe
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,

  -- Vipps
  vipps_order_id          TEXT,
  vipps_agreement_id      TEXT,

  -- Status
  status                  TEXT NOT NULL DEFAULT 'incomplete'
                            CHECK (status IN ('active','paused','cancelled','past_due','incomplete')),

  -- Periode
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELL: payment_history
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider              TEXT NOT NULL CHECK (provider IN ('stripe','vipps','manual')),
  provider_payment_id   TEXT,

  -- Beløp i øre (smallest unit) — 49900 = 499 kr
  amount_ore            INTEGER NOT NULL CHECK (amount_ore >= 0),
  currency              TEXT NOT NULL DEFAULT 'NOK',

  status                TEXT NOT NULL CHECK (status IN ('paid','pending','failed','refunded')),
  metadata              JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEKSER
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id
  ON payment_history(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id
  ON payment_history(subscription_id);

-- ============================================================
-- TRIGGER: oppdater updated_at automatisk
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Brukere kan kun se egne subscriptions
CREATE POLICY "subscriptions: bruker ser egne"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Kun service_role kan INSERT/UPDATE/DELETE (webhooks)
CREATE POLICY "subscriptions: service_role full tilgang"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Brukere kan kun se egne betalinger
CREATE POLICY "payment_history: bruker ser egne"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "payment_history: service_role full tilgang"
  ON payment_history FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- HJELPEFUNKSJON: hent aktiv tier for bruker
-- ============================================================
CREATE OR REPLACE FUNCTION get_active_tier(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT tier_slug
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- GRATIS STUDENT-TIER VED SIGNUP
-- Trigger: opprett gratis subscription når ny bruker registrerer seg
-- ============================================================
CREATE OR REPLACE FUNCTION create_student_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, tier_slug, provider, status)
  VALUES (NEW.id, 'student', 'manual', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_student_subscription_on_signup();
