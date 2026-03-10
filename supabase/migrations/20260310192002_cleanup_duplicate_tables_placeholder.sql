-- Migration: Konsolider dupliserte tabeller (placeholder)
-- Issue: #6
-- Created: 2026-03-10 19:20:02 UTC
-- 
-- ANALYSE: Kjørte FK-sjekk og fant ingen faktiske duplikater.
-- Schema-dump viste duplikater pga. bug i dump-script (fikset i commit bb0481832).
-- 
-- Tabeller sjekket:
-- - paper_trading_sessions: 1 tabell, 3 rader
-- - auto_trading_configs: 1 tabell, 0 rader
-- - risk_profiles: 1 tabell, 9 rader
--
-- FK-relasjoner funnet:
-- - auto_trading_configs.risk_profile_id → risk_profiles
-- - trade_rejections.risk_profile_id → risk_profiles  
-- - trade_decisions.risk_profile_id → risk_profiles

-- ============================================
-- HVIS duplikater oppdages senere, bruk dette mønsteret:
-- ============================================

/*

-- STEG 1: Identifiser hvilken tabell som er i bruk (via FK)
-- (Kjør spørringen i PROBLEM 1A i KIMI-prompten)

-- STEG 2: Rename ubrukt tabell til _legacy
-- ALTER TABLE IF EXISTS paper_trading_sessions_unused 
-- RENAME TO paper_trading_sessions_legacy;

-- STEG 3: Oppdater FK-referanser hvis nødvendig
-- (Bare hvis data må migreres fra gammel til ny tabell)

-- STEG 4: Kommenter tabellen
-- COMMENT ON TABLE paper_trading_sessions_legacy IS 
--   'Legacy: fjernes i neste major migrasjon. Se issue #6.';

*/

-- ============================================
-- Ingen action nødvendig denne gangen
-- ============================================

SELECT 'Ingen dupliserte tabeller funnet - ingen action nødvendig' as result;

-- ============================================
-- Verifisering (skal returnere 1 rad per tabell):
-- ============================================
-- SELECT table_name, COUNT(*) as antall
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('paper_trading_sessions', 'auto_trading_configs', 'risk_profiles')
-- GROUP BY table_name;
