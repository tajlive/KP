import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' } 
    })
  }

  try {
    const { email, fullName, locale, source } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabase
      .from('beta_applications')
      .insert({ email, full_name: fullName, locale, source, created_at: new Date().toISOString() })

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
