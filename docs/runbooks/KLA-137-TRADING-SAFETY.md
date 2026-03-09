# KLA-137 Trading Safety Core — Operational Runbook

## Overview
KLA-137 implements fail-closed trading safety guardrails with full audit trail.

**Status:** ✅ DEPLOYED (2026-03-09)
**Commits:** 9e348fc4b, b4ed1c661, 6876a412f

**Key Components:**
- Risk profile validation
- Bot health checks
- Pair restrictions
- Daily loss limits
- Physical separation of paper/live execution
- Complete audit logging

## Monitoring Dashboards

**Supabase SQL Editor:**
- Project: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql

**Vercel:**
- Application Logs: https://vercel.com/tom-jensens-projects/klarpakke/logs
- Deployment Status: https://vercel.com/tom-jensens-projects/klarpakke/deployments

## Monitoring Queries

### Query 1: Rejection Rate (Hourly)
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  rejection_reason,
  COUNT(*) as rejection_count
FROM trade_rejections
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, rejection_reason
ORDER BY hour DESC, rejection_count DESC;
```

### Query 2: RPC Performance
```sql
SELECT
  COUNT(*) as total_decisions,
  COUNT(CASE WHEN rejection_reason = 'DAILY_LOSS_CHECK_FAILED' THEN 1 END) as rpc_failures,
  ROUND(
    COUNT(CASE WHEN rejection_reason = 'DAILY_LOSS_CHECK_FAILED' THEN 1 END)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 2
  ) as failure_rate_pct
FROM trade_decisions
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Query 3: Risk Profile Coverage
```sql
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(DISTINCT user_id) FROM risk_profiles WHERE is_active = true) as users_with_active_profile,
  ROUND(
    (SELECT COUNT(DISTINCT user_id) FROM risk_profiles WHERE is_active = true)::NUMERIC
    / NULLIF((SELECT COUNT(*) FROM auth.users), 0) * 100, 2
  ) as coverage_pct;
```

### Query 4: Trade Activity (Last Hour)
```sql
SELECT
  'Paper Trades' as category,
  COUNT(*) as count
FROM trades
WHERE mode = 'paper' AND created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT
  'Live Trades' as category,
  COUNT(*) as count
FROM trades
WHERE mode = 'live' AND created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT
  'Rejections' as category,
  COUNT(*) as count
FROM trade_rejections
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Normal Operating Parameters

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| Rejection Rate | < 20% | 20-40% | > 40% |
| RPC Failure Rate | 0% | 0.1-1% | > 1% |
| calculate_daily_loss Latency | < 100ms | 100-200ms | > 200ms |
| Risk Profile Coverage | > 80% | 60-80% | < 60% |

## Common Alerts & Responses

### Alert: High Rejection Rate (> 40%)

**Symptoms:**
- Many trades rejected
- Users reporting "can't trade"
- trade_rejections table filling rapidly

**Investigation:**
```sql
SELECT rejection_reason, COUNT(*) as count
FROM trade_rejections
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY rejection_reason
ORDER BY count DESC;
```

**Resolution:**
- If NO_RISK_PROFILE dominant: Guide users to create risk profiles
- If PAIR_NOT_ALLOWED dominant: Verify allowed_pairs defaults
- If POSITION_LIMIT_EXCEEDED: Consider increasing max_position_pct

### Alert: RPC Failures (DAILY_LOSS_CHECK_FAILED)

**Symptoms:**
- DAILY_LOSS_CHECK_FAILED rejections appearing
- High latency in risk validation

**Investigation:**
```sql
-- Test function directly
SELECT calculate_daily_loss(
  'user-uuid'::UUID,
  'session-uuid'::UUID
);
```

**Resolution:**
- Check Supabase database load
- Verify function exists
- If slow: Add index on trades(session_id, created_at, side)

### Alert: Database Errors (PostgrestError)

**Symptoms:**
- 500 errors in API responses
- Connection timeouts

**Investigation:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('trade_rejections', 'trade_decisions');
```

**Resolution:**
- If tables missing: Re-run migration
- If RLS blocking: Verify service role key
- If connection exhaustion: Review pool settings

## Emergency Procedures

### EMERGENCY: All Trades Being Rejected

1. Check Supabase status: https://status.supabase.com
2. Verify calculate_daily_loss() exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'calculate_daily_loss';
```
3. If function missing, restore from migration:
```bash
supabase db push
```

### EMERGENCY: Trades Executing Without Safety Checks

1. STOP NEW DEPLOYMENTS immediately
2. Check Vercel logs for "RiskValidator"
3. If safety layer bypassed: Rollback deployment
4. Alert team and investigate

## Maintenance Tasks

### Weekly
- Review rejection rate trends
- Check for unusual patterns
- Verify risk profile coverage

### Monthly
- Analyze calculate_daily_loss performance
- Review and optimize slow queries
- Update risk profile thresholds

### Quarterly
- Review full audit trail
- Archive old rejections (> 6 months)
- Performance test with projected load

## Rollback Procedure

If KLA-137 causes critical issues:

```bash
# 1. Revert code to pre-KLA-137
git revert 6876a412f b4ed1c661 9e348fc4b
git push origin main

# 2. Optionally drop new tables (loses audit data!)
# psql $DATABASE_URL <<SQL
# DROP TABLE IF EXISTS trade_rejections CASCADE;
# DROP TABLE IF EXISTS trade_decisions CASCADE;
# DROP FUNCTION IF EXISTS calculate_daily_loss(UUID, UUID);
# DROP FUNCTION IF EXISTS is_bot_healthy(UUID);
# SQL
```

## Contact & Escalation

**Escalation Path:**
1. Check runbook and attempt resolution (15 min)
2. Alert team in Slack #engineering
3. Escalate to tech lead if user-facing impact
4. Consider rollback if critical and no quick fix

---

**Last Updated:** 2026-03-09
**Author:** Klarpakke Engineering
