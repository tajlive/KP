import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const sql = await Deno.readTextFile('supabase/migrations/20260217030000_trading_mode_and_live_trading.sql')
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
