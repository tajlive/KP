-- 11. View for admin user list
DROP VIEW IF EXISTS admin_user_list;
CREATE OR REPLACE VIEW admin_user_list AS
SELECT 
  p.id,
  p.email,
  p.display_name as full_name,
  p.role,
  p.role as subscription_tier,
  p.created_at,
  (p.paper_balance + COALESCE(p.real_balance, 0)) as portfolio_value,
  COUNT(DISTINCT t.id) as total_trades
FROM profiles p
LEFT JOIN trades t ON t.user_id = p.user_id
GROUP BY p.id, p.email, p.display_name, p.role, p.created_at, p.paper_balance, p.real_balance;

-- Grant access
GRANT SELECT ON admin_user_list TO authenticated;
GRANT SELECT ON admin_user_list TO service_role;
