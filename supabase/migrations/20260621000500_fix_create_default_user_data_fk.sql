-- Follow-up fix: create_default_user_data() generated a random UUID for
-- public.user_profiles.id, but production has a foreign key
-- user_profiles_id_fkey (id -> auth.users.id). The random UUID caused an FK
-- violation and the hidden SQL error surfaced as GoTrue 500.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_default_user_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_id UUID := NEW.id;
BEGIN
  -- Create user_profiles (canonical user record)
  INSERT INTO public.user_profiles (
    id, user_id, display_name, email_on_trade, email_on_crash, email_daily_digest,
    tier, role, provider, locale, created_at, updated_at
  )
  VALUES (
    new_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1), 'Trader'),
    true, true, true,
    'free', 'user',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_settings
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create user_notification_settings
  INSERT INTO user_notification_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create paper trading session using unified schema
  INSERT INTO trading_sessions (
    user_id, trading_pair, mode, strategy_id, status,
    starting_capital_nok, current_capital_nok, initial_capital, current_capital,
    total_trades, winning_trades, losing_trades, total_pnl,
    strategy_config, started_at, last_heartbeat
  )
  VALUES (
    NEW.id, 'BTCUSDT', 'paper', 'manual', 'active',
    100000, 100000, 100000, 100000,
    0, 0, 0, 0,
    '{}', NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Create default risk profiles
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct,
                             max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMIT;
