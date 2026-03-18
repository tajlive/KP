-- ============================================
-- CLIENT ERROR TRACKING - For admin dashboard
-- ============================================

-- 1. Tabell for klient-feil (JS errors, network errors, etc.)
CREATE TABLE IF NOT EXISTS public.client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL, -- 'javascript', 'network', 'api', 'react', 'other'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT, -- Hvilken React-komponent
  page_url TEXT NOT NULL, -- Hvilken side brukeren var på
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  screen_size TEXT, -- "1920x1080"
  metadata JSONB DEFAULT '{}', -- Ekstra info (f.eks. API endpoint som feilet)
  severity TEXT DEFAULT 'error', -- 'warning', 'error', 'critical'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT, -- Admin notater
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Indexer for ytelse
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_error_type ON client_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_client_errors_page_url ON client_errors(page_url);
CREATE INDEX IF NOT EXISTS idx_client_errors_severity ON client_errors(severity);
CREATE INDEX IF NOT EXISTS idx_client_errors_resolved ON client_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_client_errors_user_id ON client_errors(user_id);
-- 3. Funksjon for å hente feil-statistikk
CREATE OR REPLACE FUNCTION public.get_error_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_errors BIGINT,
  critical_errors BIGINT,
  unresolved_errors BIGINT,
  top_error_type TEXT,
  top_page TEXT,
  errors_last_hour BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE NOT resolved) as unresolved,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
    FROM public.client_errors
    WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
  ),
  top_type AS (
    SELECT error_type
    FROM public.client_errors
    WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY error_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  top_page_url AS (
    SELECT page_url
    FROM public.client_errors
    WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY page_url
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT 
    s.total,
    s.critical,
    s.unresolved,
    tt.error_type,
    tp.page_url,
    s.last_hour
  FROM stats s
  CROSS JOIN top_type tt
  CROSS JOIN top_page_url tp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 4. RLS Policies
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
-- Service role kan insert (fra API)
CREATE POLICY "Service role can insert errors"
  ON public.client_errors FOR INSERT
  WITH CHECK (true);
-- Kun admins kan lese
CREATE POLICY "Admins can view all errors"
  ON public.client_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
-- Kun admins kan oppdatere (markere som løst)
CREATE POLICY "Admins can update errors"
  ON public.client_errors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
-- 5. Trigger for å logge til admin_notifications ved kritiske feil
CREATE OR REPLACE FUNCTION public.notify_critical_error()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    INSERT INTO public.admin_notifications (admin_id, title, message, type, priority)
    SELECT 
      p.id as admin_id,
      'Kritisk feil: ' || NEW.error_type,
      NEW.error_message || ' på ' || NEW.page_url,
      'error',
      'urgent'
    FROM public.profiles p
    WHERE p.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_critical_error_notification ON public.client_errors;
CREATE TRIGGER trg_critical_error_notification
  AFTER INSERT ON public.client_errors
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_critical_error();
-- 6. View for enkel visning i admin
CREATE OR REPLACE VIEW public.client_errors_summary AS
SELECT 
  id,
  error_type,
  error_message,
  page_url,
  browser,
  device_type,
  severity,
  resolved,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 hour' THEN 'Just now'
    WHEN created_at > NOW() - INTERVAL '24 hours' THEN 'Today'
    WHEN created_at > NOW() - INTERVAL '7 days' THEN 'This week'
    ELSE 'Older'
  END as time_ago
FROM public.client_errors
ORDER BY created_at DESC;
-- ============================================
-- FERDIG! Nå kan vi tracke feil i admin
-- ============================================;
