-- ============================================================
-- RLS Policy for Admin Access to trade_sync_log
-- ============================================================
-- 
-- Dette gir admin-brukere tilgang til å se alle trade_sync_log entries
-- mens vanlige brukere kun ser sine egne.

-- 1. Sikre at RLS er aktivert
ALTER TABLE trade_sync_log ENABLE ROW LEVEL SECURITY;

-- 2. Fjern eksisterende policies hvis de finnes (for å unngå konflikter)
DROP POLICY IF EXISTS "Users can view own sync logs" ON trade_sync_log;
DROP POLICY IF EXISTS "Admins can view all sync logs" ON trade_sync_log;
DROP POLICY IF EXISTS "Service role can manage all sync logs" ON trade_sync_log;

-- 3. Policy: Brukere kan se egne sync-logger
CREATE POLICY "Users can view own sync logs"
  ON trade_sync_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: Admin kan se ALLE sync-logger
CREATE POLICY "Admins can view all sync logs"
  ON trade_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Policy: Service role kan gjøre alt (for Edge Functions)
CREATE POLICY "Service role can manage all sync logs"
  ON trade_sync_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. Verifiser at tomarnejensen@gmail.com er admin
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';

-- 7. Sjekk at policies er på plass
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'trade_sync_log'
ORDER BY policyname;

-- 8. Verifiser admin-tilgang
SELECT 
    email,
    role,
    'Admin access granted' as status
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- Done!
SELECT 'RLS policies for trade_sync_log updated successfully!' as status;
