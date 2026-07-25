-- Oppfolging til KLT-konsolidering (20260725000003):
-- initialize_user_manually skrev til kltbalances (renamet) — pekes om.
-- handle_new_user_klt var dod kode (ingen trigger) — droppes.
-- MERK: Allerede applyet i prod 2026-07-25 via MCP apply_migration.

CREATE OR REPLACE FUNCTION public.initialize_user_manually(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_profile_id UUID := gen_random_uuid();
  v_email TEXT;
  v_meta JSONB;
BEGIN
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users WHERE id = user_uuid;

  INSERT INTO user_profiles (id, user_id, display_name, tier, role, provider, locale,
    created_at, updated_at, paper_balance, binance_connected, email_on_trade,
    email_on_crash, email_daily_digest)
  VALUES (new_profile_id, user_uuid,
    COALESCE(v_meta->>'full_name', v_meta->>'name', split_part(v_email, '@', 1), 'Trader'),
    'free', 'user', COALESCE(v_meta->>'provider', 'email'), COALESCE(v_meta->>'locale', 'no'),
    NOW(), NOW(), 100000, false, true, true, true)
  ON CONFLICT (user_id) DO UPDATE SET paper_balance = 100000 WHERE user_profiles.paper_balance < 1000;

  INSERT INTO email_preferences (user_id) VALUES (user_uuid) ON CONFLICT DO NOTHING;
  -- KLA-fix: var kltbalances (legacy, renamet 2026-07-25) — na user_klt_balances
  INSERT INTO user_klt_balances (user_id, balance, total_earned) VALUES (user_uuid, 500, 500) ON CONFLICT DO NOTHING;
END;
$function$;

DROP FUNCTION IF EXISTS public.handle_new_user_klt();
