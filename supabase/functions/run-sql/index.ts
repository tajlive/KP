import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  try {
    const { query } = await req.json()
    
    const { data, error } = await supabase.rpc('exec_sql', { query })
    
    if (error) {
      // Hvis exec_sql ikke finnes, prøv direkte SQL
      const { data: result, error: sqlError } = await supabase
        .from('trades')
        .select('count')
        .limit(0)
      
      if (sqlError && sqlError.message.includes('mode')) {
        // Mode kolonne mangler - kjør ALTER TABLE
        const fixQuery = `
          ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live'));
        `
        return new Response(JSON.stringify({ 
          message: 'Mode column needs to be added. Run this SQL in Supabase Dashboard:',
          sql: fixQuery
        }), { status: 200 })
      }
      
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    
    return new Response(JSON.stringify({ success: true, data }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
