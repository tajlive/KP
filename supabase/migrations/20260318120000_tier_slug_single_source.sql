-- Tier: én kilde til sannhet – kun student, bachelor, master, phd, professor
-- 1) Legg til manglende verdier i enum subscription_tier (remote kan ha free/standard/pluss/vip_ekstrem)
-- 2) Sett alle ukjente/gamle tier-verdier til 'student'

-- 1. Legg til student, bachelor, master, phd, professor i enum (ignorer hvis de finnes fra før)
DO $$
BEGIN
  ALTER TYPE subscription_tier ADD VALUE 'student';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE subscription_tier ADD VALUE 'bachelor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE subscription_tier ADD VALUE 'master';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE subscription_tier ADD VALUE 'phd';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE subscription_tier ADD VALUE 'professor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Normaliser tier: ukjente eller NULL → 'student'
UPDATE public.user_profiles
SET tier = 'student'::subscription_tier
WHERE tier IS NULL
   OR tier::text NOT IN ('student', 'bachelor', 'master', 'phd', 'professor');

COMMENT ON COLUMN public.user_profiles.tier IS 'Klarpakke tier slug: student | bachelor | master | phd | professor. Source of truth: src/lib/pricing/tiers.ts';
