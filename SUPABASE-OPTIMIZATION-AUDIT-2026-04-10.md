# Supabase Optimization Audit Report
**Date:** 2026-04-10  
**Project:** Klarpakke Trading Platform  
**Supabase Tier:** Free (500MB storage, 2GB bandwidth, 4GB/month egress)

---

## 🚨 CRITICAL FINDINGS

### 1. Storage Crisis: unified_notifications Table
| Metric | Value | Free Tier Limit | Status |
|--------|-------|-----------------|--------|
| **unified_notifications** | 8,887,364 rows | N/A | 🔴 CRITICAL |
| **Table Size** | 2,833 MB (2.8 GB) | 500 MB | 🔴 **567% OVER LIMIT** |
| **Total DB Size** | ~3.5 GB estimated | 500 MB | 🔴 **700% OVER LIMIT** |

**Impact:** This single table consumes nearly 6x the entire Free tier storage limit. The database is running on borrowed time.

### 2. Row Count Distribution
| Table | Rows | Size | Priority |
|-------|------|------|----------|
| unified_notifications | 8,887,364 | 2,833 MB | 🔴 Critical |
| unified_trades | 5,270 | 5 MB | 🟡 Medium |
| trading_signals | 1,143 | 272 KB | 🟢 Low |
| notification_queue | 168 | 128 KB | 🟢 Low |
| trade_decisions | 146 | 152 KB | 🟢 Low |

---

## 📊 DATABASE STATISTICS

### Extensions Active (11)
```
pg_cron (1.6.4)          - Job scheduling (22 active jobs)
pgmq (1.5.1)             - Message queuing
pg_graphql (1.5.11)      - GraphQL API
pgsodium (3.1.8)         - Encryption
supabase_vault (0.3.1)   - Secure storage
pg_stat_statements (1.11) - Query stats
hypopg (1.4.1)           - Index advisor
index_advisor (0.2.0)    - Index recommendations
pg_net (0.19.5)          - HTTP requests
wrappers (0.5.7)         - Foreign data
pgcrypto                 - Cryptography
```

### Edge Functions (65+)
- **High Activity:** signal-engine, trading-push, position-monitor
- **Billing:** stripe-webhook, get-billing-status
- **Trading:** taj-trade-engine, unified-trading-engine, auto-trading-executor
- **Notifications:** unified-notifications, send-notifications

### PG Cron Jobs (22 Active)
| Job | Schedule | Description |
|-----|----------|-------------|
| signal-engine-5min | */5 * * * * | Signal generation |
| klarpakke-trading-tick | * * * * * | Trading engine tick |
| sync-coin-prices | */5 * * * * | Price sync |
| notifications-sender | * * * * * | Notification processing |
| refresh-leaderboard | * * * * * | Leaderboard refresh |
| daily-analysis | 0 6 * * * | Daily reports |
| weekly-review | 0 10 * * 1 | Weekly reports |
| db-vacuum | 0 3 * * * | Maintenance |

---

## ⚠️ PERFORMANCE ADVISORIES

### 1. Unused Indexes (100+ identified)
**High Impact Tables:**
- `backtest_results` - 3 unused indexes
- `system_alerts` - 5 unused indexes
- `xp_transactions` - 3 unused indexes
- `user_profiles` - 5 unused indexes
- `trades` - 2 unused indexes

**Recommendation:** Remove unused indexes to save storage and improve write performance.

### 2. Unindexed Foreign Keys
| Table | Foreign Key | Impact |
|-------|-------------|--------|
| kelly_stats | kelly_stats_user_id_fkey | Slow joins |
| optimal_trades | optimal_trades_user_id_fkey | Slow joins |

### 3. RLS Policy Issues (500+ warnings)
**auth_rls_initplan Problems:**
- 150+ policies re-evaluate `auth.uid()` for each row
- Should use `(select auth.uid())` instead

**Multiple Permissive Policies:**
- Tables with duplicate/overlapping RLS policies
- Causes unnecessary policy evaluation overhead

**Affected Tables:**
- user_profiles (7 policies)
- trades (4 policies)
- trading_sessions (2 policies)
- copy_trading_follows (4 policies)

### 4. Duplicate Indexes
| Table | Duplicate Indexes |
|-------|-------------------|
| copy_trading_follows | idx_copy_trading_follows_follower_id, idx_follow_follower |

---

## 🎯 OPTIMIZATION RECOMMENDATIONS

### P0 - CRITICAL (Do Immediately)

#### 1. Archive/Partition unified_notifications
```sql
-- Create archive table for old notifications
CREATE TABLE unified_notifications_archive (
  LIKE unified_notifications INCLUDING ALL
);

-- Move notifications older than 30 days
INSERT INTO unified_notifications_archive
SELECT * FROM unified_notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete archived from main table
DELETE FROM unified_notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Estimated savings: 2.5 GB (89% reduction)
```

#### 2. Implement Notification Retention Policy
```sql
-- Auto-delete read notifications after 7 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM unified_notifications 
  WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup
SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 
  'SELECT cleanup_old_notifications()');
```

#### 3. Remove Unused Indexes
```sql
-- Backtest results
DROP INDEX IF EXISTS idx_backtest_results_user_id;
DROP INDEX IF EXISTS idx_backtest_results_created_at;
DROP INDEX IF EXISTS idx_backtest_results_symbol;

-- System alerts
DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_component;
DROP INDEX IF EXISTS idx_alerts_acknowledged;
DROP INDEX IF EXISTS idx_alerts_created;

-- User profiles
DROP INDEX IF EXISTS idx_user_profiles_dismissed_card;
DROP INDEX IF EXISTS idx_user_profiles_google_id;
DROP INDEX IF EXISTS idx_user_profiles_microsoft_id;
DROP INDEX IF EXISTS idx_user_profiles_provider;
DROP INDEX IF EXISTS idx_user_profiles_role;

-- Estimated savings: ~50-100 MB
```

### P1 - HIGH PRIORITY (This Week)

#### 4. Optimize RLS Policies
```sql
-- Example: Fix user_profiles RLS policies
-- BEFORE: auth.uid() = user_id
-- AFTER: (select auth.uid()) = user_id

CREATE POLICY "Users can view own profile optimized"
ON user_profiles FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);
```

#### 5. Add Missing Indexes
```sql
-- Foreign key indexes
CREATE INDEX CONCURRENTLY idx_kelly_stats_user_id 
ON kelly_stats(user_id);

CREATE INDEX CONCURRENTLY idx_optimal_trades_user_id 
ON optimal_trades(user_id);
```

#### 6. Consolidate Duplicate Indexes
```sql
-- Remove duplicate on copy_trading_follows
DROP INDEX IF EXISTS idx_follow_follower;
-- Keep: idx_copy_trading_follows_follower_id
```

### P2 - MEDIUM PRIORITY (This Month)

#### 7. Table Partitioning Strategy
```sql
-- Partition unified_notifications by month
CREATE TABLE unified_notifications_partitioned (
  LIKE unified_notifications INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE unified_notifications_y2025m01 
PARTITION OF unified_notifications_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- ... continue for each month
```

#### 8. Optimize JSONB Columns
- Review large JSONB columns in `unified_notifications`
- Normalize frequently queried fields to separate columns
- Add GIN indexes for JSONB queries

#### 9. Review PG Cron Jobs
| Job | Frequency | Optimization |
|-----|-----------|--------------|
| refresh-leaderboard | Every minute | Consider materialized view refresh strategy |
| notifications-sender | Every minute | Batch processing |
| signal-engine-5min | Every 5 min | OK |
| sync-coin-prices | Every 5 min | Consider WebSocket instead |

---

## 💰 COST OPTIMIZATION

### Current Cost Analysis
| Service | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| Supabase Storage | 3.5 GB | < 500 MB | **Free tier viable** |
| Supabase Bandwidth | Unknown | ~1 GB/mo | Within 2GB limit |
| Vercel Functions | $20/mo | $20/mo | - |
| **Total** | **$20+/mo** | **$20/mo** | **$0-30/mo** |

### Free Tier Feasibility
After optimization:
- ✅ Storage: ~400 MB (under 500 MB limit)
- ✅ Bandwidth: ~1.5 GB (under 2 GB limit)
- ✅ Edge Functions: 65+ (no limit on free tier)
- ⚠️ Database connections: Monitor usage
- ✅ PG Cron: 22 jobs (supported on free tier)

### When to Upgrade
Consider Supabase Pro ($25/mo) when:
- Active users exceed 100 concurrent
- Notification volume exceeds 1M/month
- Need point-in-time recovery
- Need daily backups (free tier has weekly)

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Emergency Storage Reduction (Today)
- [ ] Archive unified_notifications > 30 days
- [ ] Implement retention policy
- [ ] Remove 20+ unused indexes
- [ ] Verify storage < 1 GB

### Phase 2: RLS & Index Optimization (This Week)
- [ ] Fix auth_rls_initplan policies
- [ ] Add missing foreign key indexes
- [ ] Consolidate duplicate indexes
- [ ] Test query performance

### Phase 3: Long-term Architecture (This Month)
- [ ] Implement table partitioning
- [ ] Optimize JSONB usage
- [ ] Review and optimize cron jobs
- [ ] Set up monitoring alerts

---

## 🔧 QUICK WINS (Run These Now)

```sql
-- 1. Check current storage
SELECT pg_size_pretty(pg_database_size(current_database()));

-- 2. Find largest tables
SELECT schemaname, relname, 
       pg_size_pretty(pg_total_relation_size(relid)) as size,
       n_live_tup as rows
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- 3. Count old notifications
SELECT COUNT(*) 
FROM unified_notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 4. Archive old notifications
CREATE TABLE IF NOT EXISTS unified_notifications_archive AS 
SELECT * FROM unified_notifications WHERE false;

INSERT INTO unified_notifications_archive
SELECT * FROM unified_notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM unified_notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 5. Verify savings
SELECT pg_size_pretty(pg_total_relation_size('unified_notifications'));
```

---

## 📈 MONITORING RECOMMENDATIONS

### Set Up Alerts For:
1. **Storage > 400 MB** (80% of free tier)
2. **unified_notifications > 1M rows**
3. **Query performance degradation**
4. **Failed cron jobs**

### Key Metrics to Track:
- Database size growth rate
- Notification volume per day
- Query execution times
- Index usage statistics

---

## ✅ VERIFICATION CHECKLIST

After optimization, verify:
- [ ] Database size < 500 MB
- [ ] unified_notifications < 500K rows (30-day retention)
- [ ] All critical queries execute < 100ms
- [ ] RLS policies work correctly
- [ ] Cron jobs running successfully
- [ ] No broken functionality

---

## 📚 REFERENCES

- Supabase Free Tier Limits: https://supabase.com/pricing
- Database Optimization Guide: https://supabase.com/docs/guides/database/optimizing
- PG Cron Documentation: https://github.com/citusdata/pg_cron
- RLS Best Practices: https://supabase.com/docs/guides/database/postgres/row-level-security

---

**Report Generated:** 2026-04-10  
**Next Review:** After Phase 1 completion
