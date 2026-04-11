// SECURITY: This function has been disabled due to SQL injection vulnerability
// It previously allowed arbitrary SQL execution with superuser privileges
// 
// If you need admin SQL execution, use one of these alternatives:
// 1. Supabase Dashboard SQL Editor (manual)
// 2. supabase/db/ migrations (version controlled)
// 3. A restricted RPC function with specific, parameterized queries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  return new Response(
    JSON.stringify({ 
      error: 'This endpoint has been disabled for security reasons',
      message: 'Use Supabase migrations or Dashboard SQL Editor instead'
    }),
    { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
});
