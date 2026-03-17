import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BINANCE_REFERRAL_CODE = '43427892' // Kept inline -- Edge Functions can't import from src/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId and action required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (action) {
      case 'start':
        return await startTrading(supabase, userId)
      case 'stop':
        return await stopTrading(supabase, userId)
      case 'status':
        return await getStatus(supabase, userId)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function startTrading(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .single()

  if (existing) {
    return new Response(
      JSON.stringify({ error: 'Trading already active' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: config } = await supabase
    .from('user_auto_trading_configs')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!config) {
    return new Response(
      JSON.stringify({ error: 'No trading configuration found' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: apiKeys } = await supabase
    .from('trading_api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('exchange', 'binance')
    .single()

  if (!apiKeys) {
    return new Response(
      JSON.stringify({ 
        error: 'Binance API keys not configured',
        referralLink: `https://accounts.binance.com/register?ref=${BINANCE_REFERRAL_CODE}`
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: session, error } = await supabase
    .from('trading_sessions')
    .insert({
      user_id: userId,
      status: 'ACTIVE',
      phase: config.phase,
      initial_balance: config.max_capital,
      current_balance: config.max_capital,
      peak_balance: config.max_capital,
      referral_code: BINANCE_REFERRAL_CODE
    })
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to start trading' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  await supabase.from('auto_trading_logs').insert({
    user_id: userId,
    session_id: session.id,
    action: 'SESSION_STARTED',
    details: { phase: config.phase, initial_balance: config.max_capital }
  })

  return new Response(
    JSON.stringify({ 
      success: true, 
      session,
      referralCode: BINANCE_REFERRAL_CODE,
      message: 'Auto-trading started successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function stopTrading(supabase: any, userId: string) {
  const { data: session } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .single()

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'No active session' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  await supabase
    .from('trading_sessions')
    .update({ 
      status: 'STOPPED',
      stopped_at: new Date().toISOString(),
      stop_reason: 'USER_REQUEST'
    })
    .eq('id', session.id)

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Trading stopped',
      sessionId: session.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getStatus(supabase: any, userId: string) {
  const { data: session } = await supabase
    .from('trading_sessions')
    .select('*, trades:trades(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!session) {
    return new Response(
      JSON.stringify({ active: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const openTrades = (session.trades || []).filter((t: any) => t.status === 'OPEN')
  const closedTrades = (session.trades || []).filter((t: any) => t.status === 'CLOSED')
  
  const totalPnL = closedTrades.reduce((sum: number, t: any) => sum + (t.realized_pnl || 0), 0)

  return new Response(
    JSON.stringify({
      active: session.status === 'ACTIVE',
      session,
      stats: {
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        totalPnL,
        return: ((session.current_balance - session.initial_balance) / session.initial_balance) * 100
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
