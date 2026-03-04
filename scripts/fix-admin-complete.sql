-- ============================================
-- KOMPLETT FIX: Legg til kolonner OG sett admin-rolle
-- Kjør denne i Supabase SQL Editor:
-- https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new
-- ============================================

-- 1. Legg til manglende kolonner (hvis de ikke finnes)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS user_number INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'organic' 
  CHECK (source IN ('organic', 'google_ads', 'referral', 'social', 'partner', 'beta_invite'));

-- 2. Lag sekvens for brukernumre (starter på 4101)
DROP SEQUENCE IF EXISTS user_number_seq;
CREATE SEQUENCE user_number_seq START 4101;

-- 3. Funksjon for auto-generere brukernummer
CREATE OR REPLACE FUNCTION assign_user_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    NEW.user_number := nextval('user_number_seq');
  END IF;
  
  IF NEW.username IS NULL AND NEW.email IS NOT NULL THEN
    NEW.username := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for auto-generering
DROP TRIGGER IF EXISTS trigger_assign_user_number ON profiles;
CREATE TRIGGER trigger_assign_user_number
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_number();

-- 5. Sett sekvens til 4101 (du får 4100)
SELECT setval('user_number_seq', 4101, false);

-- 6. OPPDATER DIN PROFIL TIL ADMIN
UPDATE profiles 
SET 
  role = 'admin',
  subscription_tier = 'vip_ekstrem',
  subscription_status = 'active',
  user_number = 4100,
  username = 'taj_admin',
  source = 'organic',
  updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';

-- 7. Backfill eksisterende brukere med brukernumre
UPDATE profiles 
SET user_number = nextval('user_number_seq')
WHERE user_number IS NULL 
  AND email != 'tomarnejensen@gmail.com';

-- 8. Backfill usernames
UPDATE profiles 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- 9. Lag admin-funksjoner
CREATE OR REPLACE FUNCTION admin_change_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_admin_id UUID
)
RETURNS JSONB AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;
  
  IF p_new_role NOT IN ('admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;
  
  UPDATE profiles SET role = p_new_role, updated_at = NOW() WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'new_role', p_new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_upgrade_user(
  p_user_id UUID,
  p_new_tier TEXT,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_old_tier TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;
  
  SELECT subscription_tier INTO v_old_tier FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET subscription_tier = p_new_tier, subscription_status = 'active', updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'old_tier', v_old_tier, 'new_tier', p_new_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Lag admin_user_list view
DROP VIEW IF EXISTS admin_user_list;
CREATE OR REPLACE VIEW admin_user_list AS
SELECT 
  p.id,
  p.user_number,
  p.username,
  p.email,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.source,
  p.beta_approved,
  p.created_at,
  p.last_sign_in_at,
  COALESCE(ps.total_value_nok, 0) as portfolio_value,
  COALESCE((SELECT COUNT(*) FROM auto_trades at WHERE at.user_id = p.id), 0) as total_trades
FROM profiles p
LEFT JOIN portfolio_summary ps ON ps.user_id = p.id;

GRANT SELECT ON admin_user_list TO authenticated;

-- 11. Verifiser at alt fungerer
SELECT 
  'Din profil:' as info,
  user_number,
  username,
  email,
  role,
  subscription_tier
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';
