-- Migration: MCP Server Setup
-- Creates tables for funnel tracking and audit logging

-- =====================================================
-- SIGNUP FUNNEL TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.signup_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'form_start', 'erfaring_selected', 'laeringsmaal_selected',
    'email_entered', 'submit_attempted', 'success', 'error'
  )),
  step_number INTEGER CHECK (step_number >= 0 AND step_number <= 7),
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_signup_funnel_session 
  ON public.signup_funnel(session_id);

CREATE INDEX IF NOT EXISTS idx_signup_funnel_event 
  ON public.signup_funnel(event_type);

CREATE INDEX IF NOT EXISTS idx_signup_funnel_created 
  ON public.signup_funnel(created_at DESC);

-- Enable RLS
ALTER TABLE public.signup_funnel ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for client-side tracking)
CREATE POLICY "Anyone can track funnel events"
  ON public.signup_funnel FOR INSERT
  WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Admins can view funnel data"
  ON public.signup_funnel FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- MCP AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mcp_audit_tool 
  ON public.mcp_audit_logs(tool_name);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_timestamp 
  ON public.mcp_audit_logs(timestamp DESC);

-- Enable RLS
ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert
CREATE POLICY "Service role can insert audit logs"
  ON public.mcp_audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view
CREATE POLICY "Admins can view audit logs"
  ON public.mcp_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get funnel stats
CREATE OR REPLACE FUNCTION public.get_funnel_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (event_type TEXT, unique_users BIGINT, total_events BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sf.event_type,
    COUNT(DISTINCT sf.session_id) as unique_users,
    COUNT(*) as total_events
  FROM public.signup_funnel sf
  WHERE sf.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY sf.event_type
  ORDER BY MIN(sf.step_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.signup_funnel IS 'Tracks user progress through signup funnel';
COMMENT ON TABLE public.mcp_audit_logs IS 'Audit log for all MCP server tool calls';
