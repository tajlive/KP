-- Migration: Cleanup duplicate indexes
-- Created: 2026-03-28
-- Risk Level: LOW (removing only redundant indexes, keeping constraints)
-- Estimated savings: ~48KB + reduced maintenance overhead

-- ============================================================
-- TABLE: copy_trading_follows
-- ============================================================
-- Keep: copy_trading_follows_follower_id_leader_id_key (constraint)
-- Drop: idx_follow_unique (duplicate)
DROP INDEX IF EXISTS idx_follow_unique;

-- ============================================================
-- TABLE: push_subscriptions  
-- ============================================================
-- Keep: idx_push_subscriptions_user_id (explicit index)
-- Drop: push_subs_user_idx (duplicate, older naming)
DROP INDEX IF EXISTS push_subs_user_idx;

-- ============================================================
-- TABLE: user_profiles
-- ============================================================
-- Keep: user_profiles_user_id_key (primary/unique constraint)
-- Drop: idx_leaderboard_user (duplicate)
DROP INDEX IF EXISTS idx_leaderboard_user;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this after deployment to verify:
-- SELECT indexname FROM pg_indexes WHERE indexname IN (
--   'idx_follow_unique', 'push_subs_user_idx', 'idx_leaderboard_user'
-- );
-- Should return 0 rows
