CREATE OR REPLACE FUNCTION public.initialize_user_manually(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_profile_id UUID := gen_random_uuid();
  v_email TEXT;
  v_meta JSONB;
BEGIN
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users WHERE id = user_uuid;

  -- KLA-FIX: Bruk 100.000 som standard for både profil og session
  INSERT INTO user_profiles (id, user_id, display_name, tier, role, provider, locale, 
    created_at, updated_at, paper_balance, binance_connected, email_on_trade, 
    email_on_crash, email_daily_digest)
  VALUES (new_profile_id, user_uuid, 
    COALESCE(v_meta->>'full_name', v_meta->>'name', split_part(v_email, '@', 1), 'Trader'),
    'free', 'user', COALESCE(v_meta->>'provider', 'email'), COALESCE(v_meta->>'locale', 'no'),
    NOW(), NOW(), 100000, false, true, true, true)
  ON CONFLICT (user_id) DO UPDATE SET paper_balance = 100000 WHERE user_profiles.paper_balance < 1000;

  INSERT INTO email_preferences (user_id) VALUES (user_uuid) ON CONFLICT DO NOTHING;
  INSERT INTO kltbalances (userid, balance, total_earned) VALUES (user_uuid, 500, 500) ON CONFLICT DO NOTHING;
  INSERT INTO onboarding_progress (user_id) VALUES (user_uuid) ON CONFLICT DO NOTHING;
  INSERT INTO portfolios (user_id, name, description) VALUES (user_uuid, 'Min Portefølje', 'Standard portefølje') ON CONFLICT DO NOTHING;
  INSERT INTO user_settings (user_id) VALUES (user_uuid) ON CONFLICT DO NOTHING;
  INSERT INTO user_notification_settings (user_id) VALUES (user_uuid) ON CONFLICT DO NOTHING;
  INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance) VALUES (user_uuid, 100000, 100000) ON CONFLICT DO NOTHING;
  
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active) VALUES
    (user_uuid, 'forsiktig', 2.0, 3.0, 5.0, true),
    (user_uuid, 'moderat', 5.0, 5.0, 15.0, false),
    (user_uuid, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Oppdater Tom Arne sin balanse (90.000 ekstra for å rette opp fra 10k til 100k start)
UPDATE public.user_profiles 
SET paper_balance = paper_balance + 90000 
WHERE id = '6408d389-2021-4a2f-92b6-bebf0459a398';
