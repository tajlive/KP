-- ============================================================================
-- Setup Test Trader: test.trader.lowrisk@klarpakke.no
-- ============================================================================
-- Kjøres med: psql $DATABASE_URL -f scripts/setup-test-trader.sql
-- Eller: npm run db:setup-test-trader
--
-- Oppretter:
-- 1. Auth-bruker
-- 2. user_profiles med beta_user rolle
-- 3. risk_profiles (forsiktig = low risk)
-- 4. paper trading session med 100k NOK
-- 5. Verifiserer at alt er korrekt
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_profile_id UUID;
  v_existing_user_id UUID;
BEGIN
  -- ========================================================================
  -- 1. Slett eksisterende testbruker hvis finnes (full reset)
  -- ========================================================================
  SELECT id INTO v_existing_user_id 
  FROM auth.users 
  WHERE email = 'test.trader.lowrisk@klarpakke.no';
  
  IF v_existing_user_id IS NOT NULL THEN
    RAISE NOTICE 'Sletter eksisterende testbruker: %', v_existing_user_id;
    
    -- Slett avhengigheter først (rekkefølge viktig)
    DELETE FROM trading_sessions WHERE user_id = v_existing_user_id;
    DELETE FROM risk_profiles WHERE user_id = v_existing_user_id;
    DELETE FROM user_profiles WHERE user_id = v_existing_user_id;
    DELETE FROM auth.users WHERE id = v_existing_user_id;
    
    RAISE NOTICE 'Eksisterende bruker slettet';
  END IF;
  
  -- ========================================================================
  -- 2. Opprett auth-bruker
  -- ========================================================================
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    role,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'test.trader.lowrisk@klarpakke.no',
    crypt('TestLowRisk123!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"display_name": "Test Trader Low Risk", "role": "beta_user"}',
    'authenticated',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;
  
  RAISE NOTICE 'Auth-bruker opprettet: %', v_user_id;
  
  -- ========================================================================
  -- 3. Opprett user_profiles
  -- ========================================================================
  INSERT INTO user_profiles (
    id,
    user_id,
    full_name,
    subscription_tier,
    subscription_status,
    role,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Test Trader Low Risk',
    'bachelor',
    'active',
    'beta_user',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'User profile opprettet';
  
  -- ========================================================================
  -- 4. Opprett risk_profiles (forsiktig = LOW RISK)
  --    max_position_pct: 2% (2% av kapital per trade)
  --    max_exposure_pct: 5% (total eksponering)
  --    max_daily_loss_pct: 1% (max tap per dag)
  -- ========================================================================
  INSERT INTO risk_profiles (
    id,
    user_id,
    name,
    max_position_pct,
    max_exposure_pct,
    max_daily_loss_pct,
    allowed_pairs,
    leverage_allowed,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'forsiktig',
    2.0,    -- 2% max position
    5.0,    -- 5% max exposure
    1.0,    -- 1% max daily loss
    ARRAY['BTCUSDT', 'ETHUSDT'],
    false,  -- ingen leverage
    true,   -- aktiv profil
    NOW(),
    NOW()
  )
  RETURNING id INTO v_profile_id;
  
  RAISE NOTICE 'Risk profile opprettet (forsiktig): %', v_profile_id;
  
  -- ========================================================================
  -- 5. Opprett paper trading session
  --    starting_capital_nok: 100000 (100k NOK)
  --    current_capital_nok: 100000 (starter med fullt beløp)
  -- ========================================================================
  INSERT INTO trading_sessions (
    id,
    user_id,
    mode,
    status,
    starting_capital_nok,
    current_capital_nok,
    starting_capital,
    current_capital,
    total_pnl,
    realized_pnl,
    unrealized_pnl,
    winning_trades,
    losing_trades,
    total_trades,
    allocated_capital_pct,
    created_at,
    updated_at,
    last_heartbeat,
    last_analysis_details,
    risk_config
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'paper',
    'active',
    100000,  -- starting NOK
    100000,  -- current NOK
    100000,  -- starting USDT (approx)
    100000,  -- current USDT (approx)
    0,       -- total PnL
    0,       -- realized PnL
    0,       -- unrealized PnL
    0,       -- winning trades
    0,       -- losing trades
    0,       -- total trades
    0,       -- allocated %
    NOW(),
    NOW(),
    NOW(),
    '{}'::jsonb,
    '{"max_position_pct": 2.0, "max_exposure_pct": 5.0, "max_daily_loss_pct": 1.0}'::jsonb
  )
  RETURNING id INTO v_session_id;
  
  RAISE NOTICE 'Paper trading session opprettet: %', v_session_id;
  
  -- ========================================================================
  -- 6. Verifiser at alt er korrekt
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'TEST TRADER OPRETTET';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Email:     test.trader.lowrisk@klarpakke.no';
  RAISE NOTICE 'Password:  TestLowRisk123!';
  RAISE NOTICE 'User ID:   %', v_user_id;
  RAISE NOTICE 'Session:   %', v_session_id;
  RAISE NOTICE 'Risk:      forsiktig (low)';
  RAISE NOTICE '  - Max position:  2%% (2000 NOK av 100k)';
  RAISE NOTICE '  - Max exposure:  5%% (5000 NOK total)';
  RAISE NOTICE '  - Max daily loss: 1%% (1000 NOK)';
  RAISE NOTICE '  - Allowed pairs: BTCUSDT, ETHUSDT';
  RAISE NOTICE '  - Leverage:      Disabled';
  RAISE NOTICE 'Saldo:     100,000 NOK';
  RAISE NOTICE 'Mode:      paper';
  RAISE NOTICE '========================================================================';
  
END $$;

-- ============================================================================
-- Verifikasjon (viser resultat)
-- ============================================================================
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  p.role,
  p.subscription_tier,
  r.name as risk_profile,
  r.max_position_pct,
  r.max_exposure_pct,
  r.max_daily_loss_pct,
  r.allowed_pairs,
  s.id as session_id,
  s.mode,
  s.status,
  s.current_capital_nok
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
LEFT JOIN risk_profiles r ON u.id = r.user_id
LEFT JOIN trading_sessions s ON u.id = s.user_id AND s.status = 'active'
WHERE u.email = 'test.trader.lowrisk@klarpakke.no';
