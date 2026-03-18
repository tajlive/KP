-- Tabell for idempotent webhook processing
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events(processed_at);
-- RLS: kun server kan skrive
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
-- Ingen policies (kun server via service role key)
COMMENT ON TABLE stripe_events IS 'For idempotent Stripe webhook processing';
