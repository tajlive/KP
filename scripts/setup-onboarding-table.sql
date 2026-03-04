-- Setup script for onboarding_progress table
-- This fixes the 404 error during Phase 1 Onboarding

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    step1_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step2_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step3_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step4_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step5_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step2_started_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own onboarding progress" 
ON public.onboarding_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress" 
ON public.onboarding_progress FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress" 
ON public.onboarding_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Trigger for auto-updating `updated_at`
CREATE OR REPLACE FUNCTION update_onboarding_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON public.onboarding_progress;

CREATE TRIGGER update_onboarding_progress_updated_at
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_updated_at_column();
