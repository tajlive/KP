-- Create exec_sql function for migrations runner
-- This allows executing SQL via RPC call

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow service_role to execute
  IF (SELECT auth.role()) != 'service_role' THEN
    RAISE EXCEPTION 'Only service_role can execute SQL';
  END IF;
  
  -- Execute the query
  EXECUTE query;
  
  -- Return success
  result := jsonb_build_object('status', 'success');
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := jsonb_build_object(
    'status', 'error',
    'message', SQLERRM
  );
  RETURN result;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM authenticated, anon;

COMMENT ON FUNCTION exec_sql(text) IS 'Execute SQL queries via RPC (service_role only)';
