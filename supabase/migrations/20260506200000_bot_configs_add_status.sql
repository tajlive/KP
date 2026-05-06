-- ===========================================
-- Add status column to bot_configs
-- Fixes: pauseBot and stopBot both set is_active=false (BUG)
-- ===========================================

-- 1. Add status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bot_configs' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.bot_configs
      ADD COLUMN status TEXT NOT NULL DEFAULT 'stopped';
  END IF;
END $$;

-- 2. Migrate existing data from is_active
UPDATE public.bot_configs
SET status = CASE
  WHEN is_active = true THEN 'active'
  ELSE 'stopped'
END;

-- 3. Create index for status lookups
CREATE INDEX IF NOT EXISTS bot_configs_status_idx ON public.bot_configs(status);

-- 4. Update partial index to cover active bots
DROP INDEX IF EXISTS bot_configs_is_active_idx;
CREATE INDEX IF NOT EXISTS bot_configs_is_active_idx ON public.bot_configs(is_active) WHERE is_active = true;
