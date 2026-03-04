-- ============================================================
-- Apply Admin Access Policy for trade_sync_log
-- ============================================================
-- 
-- Kjør dette i Supabase SQL Editor:
-- https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new

-- 1. Enable RLS
ALTER TABLE trade_sync_log ENABLE ROW LEVEL SECURITY;

-- 2. Create policies
DROP POLICY IF EXISTS "Users can view own sync logs" ON trade_sync_log;
DROP POLICY IF EXISTS "Admins can view all sync logs" ON trade_sync_log;
DROP POLICY IF EXISTS "Service role can manage all sync logs" ON trade_sync_log;

-- Brukere ser egne logger
CREATE POLICY "Users can view own sync logs"
  ON trade_sync_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admin ser alle logger
CREATE POLICY "Admins can view all sync logs"
  ON trade_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role (Edge Functions) kan gjøre alt
CREATE POLICY "Service role can manage all sync logs"
  ON trade_sync_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Ensure admin access
UPDATE profiles 
SET role = 'admin'
WHERE email = 'tomarnejensen@gmail.com';

-- 4. Verify
SELECT 'Admin RLS policy applied!' as result;
