-- Migration: Private Supabase Storage bucket for cockpit report screenshots
-- Date: 2026-07-04
-- Context: Admin "Cockpit report" feature. GitHub Actions runner uploads PNGs here
--          and stores the signed URL in public.cockpit_report_jobs.
-- Service role has full access; no public or authenticated RLS policies are created.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'cockpit-reports',
  'cockpit-reports',
  false,
  10485760,
  ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
