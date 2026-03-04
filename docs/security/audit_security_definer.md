# Security Audit: SECURITY DEFINER Views and Missing RLS Policies

**Date:** $(date +%Y-%m-%d)  
**Auditor:** Kimi 2.5 Code  
**Status:** ✅ FIXED

## Issues Found

### Issue 1: SECURITY DEFINER Views (0010_security_definer_view)

15 views were defined with SECURITY DEFINER, bypassing normal RLS checks:

#### Admin-Only Views (Case A)
These views contain sensitive data and should only be accessed by service_role:

| View | Access Level | Rationale |
|------|--------------|-----------|
| admin_user_list | service_role only | Contains all user data from auth.users |
| campaign_stats | service_role only | Internal marketing data |
| signup_funnel_stats | service_role only | Internal analytics |
| user_stats_summary | service_role only | Aggregated user statistics |
| user_referrals_summary | service_role only | Referral program data |
| user_entitlements | service_role only | Subscription/access data |

**Fix Applied:**
- Dropped and recreated views WITHOUT SECURITY DEFINER
- Revoked ALL privileges from PUBLIC, authenticated, and anon
- Granted SELECT only to service_role

#### User-Facing Views (Case B)
These views are accessed by authenticated users and rely on RLS on base tables:

| View | Access Level | Rationale |
|------|--------------|-----------|
| v_paper_trading_stats | authenticated + service_role | Per-user trading statistics |
| v_user_trading_summary | authenticated + service_role | User portfolio summary |
| v_active_paper_positions | authenticated + service_role | User's paper positions |
| v_active_real_positions | authenticated + service_role | User's real positions |
| user_performance | authenticated + service_role | User performance metrics |
| active_signals_summary | anon + authenticated + service_role | Public trading signals |
| active_subscriptions | authenticated + service_role | User's own subscriptions |
| current_leaderboard | anon + authenticated + service_role | Public leaderboard |
| public_strategies | anon + authenticated + service_role | Public trading strategies |

**Fix Applied:**
- Dropped and recreated views WITHOUT SECURITY DEFINER
- Granted SELECT to appropriate roles
- RLS on base tables filters rows per user

### Issue 2: RLS-Enabled Tables with No Policies (0008_rls_enabled_no_policy)

5 tables had RLS enabled but no explicit policies defined:

| Table | Intended Use | Policies Added |
|-------|--------------|----------------|
| analytics_events | Write-only telemetry | INSERT: authenticated (own), SELECT: service_role only |
| auto_trading_strategies | Per-user strategies | Full CRUD: own user, SELECT public: is_public=true |
| beta_signups | Public form, admin read | INSERT: anon/authenticated, SELECT: service_role only |
| client_errors | Error telemetry | INSERT: authenticated (own), SELECT: service_role only |
| vipps_payments | Sensitive payments | INSERT: service_role only, SELECT: own user + service_role |

## Migration Files

1. `supabase/migrations/20260219034101_fix_security_definer_views.sql`
   - Fixes all 15 SECURITY DEFINER views
   - Applies proper GRANT statements

2. `supabase/migrations/20260219034136_add_missing_rls_policies.sql`
   - Adds RLS policies to 5 tables
   - Defines explicit access patterns

## Verification

After applying migrations, run:

```sql
-- Check views no longer have SECURITY DEFINER
SELECT table_name, security_type 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (/* view names */);
-- Expected: security_type = 'NONE' or NULL for all

-- Check tables have policies
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
-- Expected: Each of the 5 tables should have 1+ policies
```

## Security Improvements

1. **Principle of Least Privilege**: Each view/table now has explicit, minimal grants
2. **No Bypass**: Views no longer bypass RLS via SECURITY DEFINER
3. **Clear Boundaries**: Admin data is truly admin-only; user data is properly scoped
4. **Explicit Policies**: No ambiguous "RLS enabled but no policies" state

## Potential App Changes Required

- Ensure app uses `service_role` key only for admin operations
- Client-side queries will now respect RLS (this is the intended behavior)
- If any queries were relying on SECURITY DEFINER bypass, they will now fail (this is good - fix them properly)

