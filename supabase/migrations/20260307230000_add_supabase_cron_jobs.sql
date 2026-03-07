-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job for auto-trading (runs every 5 minutes)
-- This calls the auto-trade Edge Function
SELECT cron.schedule(
    'auto-trading-every-5-min',  -- job name
    '*/5 * * * *',               -- every 5 minutes
    $$
    SELECT net.http_get(
        url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/auto-trade',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
);

-- Cron job for price syncing (runs every hour)
SELECT cron.schedule(
    'sync-prices-hourly',
    '0 * * * *',  -- every hour
    $$
    SELECT net.http_get(
        url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/sync-prices',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
);

-- View existing cron jobs
COMMENT ON TABLE cron.job IS 'Scheduled cron jobs for Klarpakke';

-- Log table for cron executions
CREATE TABLE IF NOT EXISTS cron_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    status TEXT,
    response_body TEXT,
    error_message TEXT
);

-- Enable RLS
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read logs
CREATE POLICY "Service role can read cron logs"
    ON cron_execution_logs
    FOR SELECT
    TO service_role
    USING (true);
