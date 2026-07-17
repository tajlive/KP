-- Migration: Add joker_explanation column to trades table
-- This column stores AI-generated explanations for Joker trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS joker_explanation TEXT;
