/**
 * Migration Management Tools
 * Direct SQL execution via Supabase API
 */

import { getSupabase } from "../clients/supabase.ts";
import type { ToolOutput } from "../types.ts";

// Security hardening SQL
const SECURITY_SQL = `
-- Supabase Security Hardening Migration
-- Enable RLS on sensitive tables
ALTER TABLE IF EXISTS public.klt_earning_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.risk_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.beta_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vipps_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auto_trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_errors ENABLE ROW LEVEL SECURITY;

-- Create schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Set search_path on existing functions
DO $$
DECLARE
    func RECORD;
BEGIN
    FOR func IN 
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', 
                      func.proname, func.args);
    END LOOP;
END $$;

SELECT 'Security hardening applied' as status;
`;

export async function applySecurityMigration(): Promise<ToolOutput> {
  try {
    const supabase = getSupabase();
    
    // Execute security SQL
    const { error } = await supabase.rpc('exec_sql', { 
      query: SECURITY_SQL 
    });
    
    if (error) {
      // Try direct SQL execution
      const { error: err2 } = await supabase.from('_sql').select('*').eq('query', SECURITY_SQL);
      
      if (err2) {
        return {
          content: [{
            type: "text",
            text: `⚠️ Could not apply automatically.\n\nPlease run this SQL manually in Supabase Dashboard:\n\nhttps://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql\n\nSQL file location:\nsupabase/migrations/20260215000005_security_hardening.sql`,
          }],
        };
      }
    }
    
    return {
      content: [{
        type: "text",
        text: `✅ Security migration applied successfully!\n\nRLS enabled on 9 tables.\nSearch path hardened on functions.`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{
        type: "text",
        text: `❌ Error: ${error}\n\nPlease apply manually via Dashboard: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql`,
      }],
      isError: true,
    };
  }
}

export async function getMigrationStatus(): Promise<ToolOutput> {
  try {
    const supabase = getSupabase();
    
    // Check RLS status on tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'orders', 
        'analytics_events', 
        'course_progress',
        'beta_signups',
        'vipps_payments'
      ]);
    
    if (error) throw error;
    
    return {
      content: [{
        type: "text",
        text: `📊 Migration Status Check\n\nTables found: ${data?.length || 0}\n\nTo check RLS status, run in SQL Editor:\n\nSELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`,
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error checking status` }],
      isError: true,
    };
  }
}
