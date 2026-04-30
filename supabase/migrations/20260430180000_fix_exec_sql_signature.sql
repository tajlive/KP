-- Fix exec_sql signature collision
-- 20260215000006 created exec_sql(query text)
-- 20260228095100 overwrote it with exec_sql(query_text, query_params)
-- This restores the single-parameter version that scripts expect

DROP FUNCTION IF EXISTS exec_sql(text, jsonb);

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
