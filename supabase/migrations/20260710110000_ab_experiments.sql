-- A/B-testing rammeverk
-- Tabell for å spore A/B-test eksperimenter og konverteringer

CREATE TABLE IF NOT EXISTS ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  variant text NOT NULL CHECK (variant IN ('A', 'B')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indeks for raske queries per eksperiment
CREATE INDEX IF NOT EXISTS idx_ab_experiments_name ON ab_experiments(name);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_user ON ab_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_anonymous ON ab_experiments(anonymous_id);

-- Unique constraint: én rad per bruker/anon per eksperiment
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_experiments_user_unique
  ON ab_experiments(name, COALESCE(user_id::text, anonymous_id))
  WHERE user_id IS NOT NULL OR anonymous_id IS NOT NULL;

-- RLS: admin leser, alle skriver
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;

-- Alle kan opprette rader (landing page visitors)
CREATE POLICY "Anyone can insert ab_experiments"
  ON ab_experiments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Kun admin kan lese (resultater)
CREATE POLICY "Admins can read ab_experiments"
  ON ab_experiments FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ingen kan oppdatere eller slette (append-only log)
CREATE POLICY "No update or delete on ab_experiments"
  ON ab_experiments FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No delete on ab_experiments"
  ON ab_experiments FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE ab_experiments IS 'A/B-testing: spor eksperimenter og konverteringer';
COMMENT ON COLUMN ab_experiments.variant IS 'Variant A (control) eller B (treatment)';
COMMENT ON COLUMN ab_experiments.converted IS 'Har brukeren konvertert?';
