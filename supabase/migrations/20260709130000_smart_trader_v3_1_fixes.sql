-- SmartTrader v3.1 — Forbedringer basert på crashed sessions-analyse
-- Kjør: npx supabase db push (eller manuelt via psql)

ALTER TABLE trading_sessions 
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS max_trades INT DEFAULT 50;
