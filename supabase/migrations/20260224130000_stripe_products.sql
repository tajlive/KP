-- Opprett stripe_products tabell for automatisk produkthåndtering
CREATE TABLE IF NOT EXISTS stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_slug TEXT UNIQUE NOT NULL CHECK (tier_slug IN ('bachelor', 'master', 'phd', 'professor')),
  stripe_product_id TEXT UNIQUE,
  stripe_price_id TEXT UNIQUE,
  name_no TEXT NOT NULL,
  name_en TEXT,
  description_no TEXT,
  description_en TEXT,
  amount_nok INTEGER NOT NULL,
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'nok',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Legg til RLS policies
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
-- Alle kan lese aktive produkter
CREATE POLICY "Allow public read access to active products"
  ON stripe_products
  FOR SELECT
  USING (is_active = true);
-- Bare service role kan skrive
CREATE POLICY "Only service role can write"
  ON stripe_products
  FOR ALL
  USING (false)
  WITH CHECK (false);
-- Funksjon for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_stripe_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER stripe_products_updated_at
  BEFORE UPDATE ON stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_products_updated_at();
-- Seed data: Initialiser med våre 4 prisplaner
INSERT INTO stripe_products (tier_slug, name_no, name_en, amount_nok, description_no, description_en)
VALUES 
  ('bachelor', 'Bachelor', 'Bachelor', 29000, 'Perfekt for enkeltpersoner som vil komme i gang', 'Perfect for individuals getting started'),
  ('master', 'Master', 'Master', 49000, 'For små team som trenger mer kapasitet', 'For small teams needing more capacity'),
  ('phd', 'PhD', 'PhD', 99000, 'For voksende team med avanserte behov', 'For growing teams with advanced needs'),
  ('professor', 'Professor', 'Professor', 199000, 'For store organisasjoner med skreddersøm', 'For large organizations with custom needs')
ON CONFLICT (tier_slug) DO NOTHING;
-- Kommentar for dokumentasjon
COMMENT ON TABLE stripe_products IS 'Stripe produkter og priser - synces automatisk med Stripe via Edge Function';
