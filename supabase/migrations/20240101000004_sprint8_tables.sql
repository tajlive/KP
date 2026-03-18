-- Migration: sprint8_tables — idempotent (safe to re-run)
SET statement_timeout = '30s';
-- ============================================================
-- Migration 003: Sprint 8 — auto_trading_strategies + bot_health
-- ============================================================

-- 1. Manglende kolonner på auto_trading_strategies
ALTER TABLE public.auto_trading_strategies
  ADD COLUMN IF NOT EXISTS trading_mode TEXT NOT NULL DEFAULT 'paper'
    CHECK (trading_mode IN ('paper', 'live')),
  ADD COLUMN IF NOT EXISTS capital_nok  NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capital_usdt NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
-- 2. UNIQUE constraint for upsert (onConflict: 'user_id,strategy_id')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ats_user_strategy_unique'
  ) THEN
    ALTER TABLE public.auto_trading_strategies
      ADD CONSTRAINT ats_user_strategy_unique UNIQUE (user_id, strategy_id);
  END IF;
END;
$$;
-- 3. user_id på bot_health (nødvendig for Sprint 8-10 logging)
ALTER TABLE public.bot_health
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bot_health_user_id_idx 
  ON public.bot_health (user_id);
-- 4. push_subscriptions (for trading-push Edge Function, Sprint 9)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_all_own"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS push_subs_user_idx
  ON public.push_subscriptions (user_id);
