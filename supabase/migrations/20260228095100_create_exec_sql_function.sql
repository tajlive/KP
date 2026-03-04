-- ============================================================================
-- CRITICAL: exec_sql function for AI automation
-- This enables AI agents to execute SQL programmatically via Supabase RPC
-- ============================================================================

-- Create exec_sql function for dynamic SQL execution
-- SECURITY WARNING: Only service_role can execute this
CREATE OR REPLACE FUNCTION exec_sql(
  query_text TEXT,
  query_params JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow service_role to execute
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Only service_role can execute dynamic SQL';
  END IF;
  
  -- Execute the query and return results as JSON
  EXECUTE query_text 
  USING query_params
  INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: exec_sql that returns SETOF (for SELECT queries)
CREATE OR REPLACE FUNCTION exec_sql_query(
  query_text TEXT
)
RETURNS TABLE (result JSONB) AS $$
BEGIN
  -- Only allow service_role to execute
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Only service_role can execute dynamic SQL';
  END IF;
  
  RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run migrations safely
CREATE OR REPLACE FUNCTION run_migration(
  migration_name TEXT,
  migration_sql TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  migration_exists BOOLEAN;
BEGIN
  -- Check if migration already ran
  SELECT EXISTS(
    SELECT 1 FROM migration_history 
    WHERE name = migration_name AND status = 'success'
  ) INTO migration_exists;
  
  IF migration_exists THEN
    RETURN QUERY SELECT FALSE, 'Migration already ran: ' || migration_name;
    RETURN;
  END IF;
  
  -- Run the migration
  BEGIN
    EXECUTE migration_sql;
    
    -- Log success
    INSERT INTO migration_history (name, sql_content, status, executed_at)
    VALUES (migration_name, migration_sql, 'success', NOW());
    
    RETURN QUERY SELECT TRUE, 'Migration successful: ' || migration_name;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log failure
      INSERT INTO migration_history (name, sql_content, status, error_message, executed_at)
      VALUES (migration_name, migration_sql, 'failed', SQLERRM, NOW());
      
      RETURN QUERY SELECT FALSE, 'Migration failed: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration history table
CREATE TABLE IF NOT EXISTS migration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sql_content TEXT,
  status TEXT CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on migration history
ALTER TABLE migration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage migrations"
  ON migration_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON FUNCTION exec_sql IS 'Execute dynamic SQL via RPC. Service role only.';
COMMENT ON FUNCTION exec_sql_query IS 'Execute SELECT queries via RPC. Service role only.';
COMMENT ON FUNCTION run_migration IS 'Run migration with tracking. Service role only.';
COMMENT ON TABLE migration_history IS 'Track all executed migrations';
