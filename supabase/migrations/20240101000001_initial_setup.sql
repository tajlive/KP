-- Migration: initial_setup — idempotent (safe to re-run)
SET statement_timeout = '30s';
-- =====================================================
-- KLARPAKKE UNIVERSITET - SUPABASE SETUP
-- Beta Signups Table
-- =====================================================

-- Create beta_signups table
CREATE TABLE IF NOT EXISTS beta_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_nummer INTEGER NOT NULL UNIQUE,
  erfaring TEXT NOT NULL,
  laeringsmaal TEXT[] NOT NULL,
  email TEXT NOT NULL UNIQUE,
  handle TEXT,
  tokens_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_beta_signups_student_nummer 
  ON beta_signups(student_nummer);
CREATE INDEX IF NOT EXISTS idx_beta_signups_email 
  ON beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at 
  ON beta_signups(created_at DESC);
-- Enable Row Level Security
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;
-- Policy: Anyone can insert (for signup form)
CREATE POLICY "Anyone can signup" 
  ON beta_signups
  FOR INSERT 
  WITH CHECK (true);
-- Policy: Service role can read all (for admin)
CREATE POLICY "Service role can read" 
  ON beta_signups
  FOR SELECT 
  USING (auth.role() = 'service_role');
-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON beta_signups
  FOR SELECT
  USING (email = auth.email());
-- Add comment for documentation
COMMENT ON TABLE beta_signups IS 'Beta signup registrations for Klarpakke Universitet. Max 100 students.';
