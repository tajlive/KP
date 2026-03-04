-- Migration to create beta_feedback table
-- This table stores feedback and bug reports from users during the beta phase

CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  url TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new', -- new, in-progress, resolved, closed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even unauthenticated) to submit feedback during beta
-- (Or restrict to authenticated if you prefer)
CREATE POLICY "Anyone can submit feedback"
  ON public.beta_feedback FOR INSERT
  WITH CHECK (true);

-- Only admins can view feedback
CREATE POLICY "Admins can view feedback"
  ON public.beta_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('tom@klarpakke.no') -- Add admin emails here
    )
  );
