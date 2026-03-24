-- Safe backfill for discover visibility:
-- 1) Sync user_profiles.email from auth.users when missing
-- 2) Create trader_profiles for users with observed trading activity
--    (trades, trading_sessions or paper_trading_sessions) if missing.
-- New profiles are private by default (is_public=false).

SET statement_timeout = '30s';

UPDATE public.user_profiles up
SET
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE au.id = up.id
  AND au.email IS NOT NULL
  AND (up.email IS NULL OR btrim(up.email) = '');

INSERT INTO public.trader_profiles (
  user_id,
  display_name,
  is_public,
  verified,
  created_at,
  updated_at
)
SELECT
  up.id AS user_id,
  COALESCE(
    NULLIF(btrim(up.full_name), ''),
    NULLIF(btrim(split_part(COALESCE(au.email, ''), '@', 1)), ''),
    'Trader'
  ) AS display_name,
  FALSE AS is_public,
  FALSE AS verified,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE NOT EXISTS (
    SELECT 1
    FROM public.trader_profiles tp
    WHERE tp.user_id = up.id
  )
  AND (
    EXISTS (
      SELECT 1
      FROM public.trades t
      WHERE t.user_id = up.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.trading_sessions ts
      WHERE ts.user_id = up.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.paper_trading_sessions ps
      WHERE ps.user_id = up.id
    )
  );
