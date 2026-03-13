-- Migration: terminal_jobs for MCP
-- Opprettet: 2026-03-13

CREATE TABLE IF NOT EXISTS public.terminal_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  cmd TEXT NOT NULL,
  pid BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','blocked','error')),
  validation_result JSONB,
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_terminal_jobs_status ON public.terminal_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terminal_jobs_created ON public.terminal_jobs(created_at DESC);

ALTER TABLE public.terminal_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.terminal_jobs;
CREATE POLICY "Service role full access"
  ON public.terminal_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.terminal_jobs IS 'MCP terminal script executions';
