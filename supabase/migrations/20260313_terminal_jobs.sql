-- Migration: Terminal Jobs for MCP Server
-- Opprettet: 2026-03-13
-- Formål: Lagre og spore terminal-script executions via MCP

-- Hovedtabell for terminal jobs
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

-- Indexer for ytelse
CREATE INDEX IF NOT EXISTS idx_terminal_jobs_status 
  ON public.terminal_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_terminal_jobs_session 
  ON public.terminal_jobs(session_id);

CREATE INDEX IF NOT EXISTS idx_terminal_jobs_created 
  ON public.terminal_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.terminal_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for service_role (full tilgang for MCP server)
DROP POLICY IF EXISTS "Service role full access on terminal_jobs" ON public.terminal_jobs;
CREATE POLICY "Service role full access on terminal_jobs"
  ON public.terminal_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Kommentarer
COMMENT ON TABLE public.terminal_jobs IS 'Queue and log for MCP terminal script executions';
COMMENT ON COLUMN public.terminal_jobs.cmd IS 'The shell command that was executed';
COMMENT ON COLUMN public.terminal_jobs.validation_result IS 'Security validation result (safe: boolean, reason?: string)';
COMMENT ON COLUMN public.terminal_jobs.pid IS 'Process ID if command was executed locally';
