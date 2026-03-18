-- Onboarding Progress Table for Klarpakke
-- Tracks user onboarding steps completion

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  step_1_started boolean DEFAULT false,
  step_1_completed_at timestamptz,
  step_2_completed_at timestamptz,
  step_3_completed_at timestamptz,
  step_4_completed_at timestamptz,
  step_5_completed_at timestamptz,
  onboarding_complete boolean GENERATED ALWAYS AS (
    step_1_completed_at IS NOT NULL AND
    step_2_completed_at IS NOT NULL AND
    step_3_completed_at IS NOT NULL AND
    step_4_completed_at IS NOT NULL AND
    step_5_completed_at IS NOT NULL
  ) STORED,
  created_at timestamptz DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
-- RLS Policies
CREATE POLICY "Users can read own progress" ON public.onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.onboarding_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert" ON public.onboarding_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Auto-create progress row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.onboarding_progress (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to create onboarding progress for new users
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
