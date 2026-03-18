-- Pre-Migration Fix
-- Migration: 20260129135900_pre_migration_fix.sql
-- Created: 2026-02-02
-- Purpose: Ensure signals table has all required columns before running other migrations
-- This migration runs BEFORE 20260129140000_initial_schema.sql (note the timestamp)

BEGIN;
-- =====================================================
-- ENSURE UUID EXTENSION IS PROPERLY CONFIGURED
-- =====================================================

-- Enable UUID extension in both extensions and public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Make sure uuid functions are available in public schema
DO $$
BEGIN
  -- Check if uuid_generate_v4 is accessible
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'uuid_generate_v4'
  ) THEN
    -- If not, explicitly import from extensions schema
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public';
  END IF;
END;
$$;
-- =====================================================
-- ENSURE SIGNALS TABLE EXISTS WITH PROPER STRUCTURE
-- =====================================================

-- Create signals table if it doesn't exist
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb
);
-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signals' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE signals ADD COLUMN created_by UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added created_by column to signals table';
  ELSE
    RAISE NOTICE 'created_by column already exists in signals table';
  END IF;

  -- Add processed_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signals' AND column_name = 'processed_by'
  ) THEN
    ALTER TABLE signals ADD COLUMN processed_by UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added processed_by column to signals table';
  ELSE
    RAISE NOTICE 'processed_by column already exists in signals table';
  END IF;

  -- Add processed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signals' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE signals ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added processed_at column to signals table';
  ELSE
    RAISE NOTICE 'processed_at column already exists in signals table';
  END IF;
END;
$$;
-- =====================================================
-- CREATE INDEXES (Idempotent)
-- =====================================================

DO $$
BEGIN
  -- Index on status
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_signals_status') THEN
    CREATE INDEX idx_signals_status ON signals(status);
    RAISE NOTICE 'Created index: idx_signals_status';
  END IF;

  -- Index on direction
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_signals_direction') THEN
    CREATE INDEX idx_signals_direction ON signals(direction);
    RAISE NOTICE 'Created index: idx_signals_direction';
  END IF;

  -- Index on created_at
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_signals_created_at') THEN
    CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
    RAISE NOTICE 'Created index: idx_signals_created_at';
  END IF;

  -- Index on created_by
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_signals_created_by') THEN
    CREATE INDEX idx_signals_created_by ON signals(created_by);
    RAISE NOTICE 'Created index: idx_signals_created_by';
  END IF;

  -- Index on processed_by
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_signals_processed_by') THEN
    CREATE INDEX idx_signals_processed_by ON signals(processed_by);
    RAISE NOTICE 'Created index: idx_signals_processed_by';
  END IF;
END;
$$;
-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  col_count INTEGER;
  idx_count INTEGER;
  rec RECORD;
BEGIN
  -- Count columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'signals';

  -- Count indexes
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'signals';

  RAISE NOTICE '================================================';
  RAISE NOTICE 'PRE-MIGRATION FIX VERIFICATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Signals table columns: %', col_count;
  RAISE NOTICE 'Signals table indexes: %', idx_count;
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Pre-migration fix completed successfully!';
  RAISE NOTICE '✅ UUID extension configured';
  RAISE NOTICE '✅ All required columns and indexes are in place';
  RAISE NOTICE '================================================';
END;
$$;
COMMIT;
