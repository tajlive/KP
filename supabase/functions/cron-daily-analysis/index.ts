/**
 * Daily Analysis Cron Job
 * Runs every day at 00:00 UTC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily analysis cron job...')

    // Get all active sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('auto_trading_sessions')
      .select('*')
      .eq('status', 'ACTIVE')

    if (sessionsError) throw sessionsError

    console.log(`Found ${activeSessions?.length || 0} active sessions`)

    const results = {
      sessionsProcessed: 0,
      circuitBreakersTriggered: 0,
      errors: [] as string[]
    }

    // Process each session
    for (const session of activeSessions || []) {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data: todaysTrades } = await supabase
          .from('auto_trading_trades')
          .select('*')
          .eq('session_id', session.id)
          .gte('created_at', today.toISOString())

        const dailyPnL = (todaysTrades || []).reduce((sum, t) => {
          if (t.status === 'CLOSED') return sum + (t.realized_pnl || 0)
          return sum + (t.unrealized_pnl || 0)
        }, 0)

        const { data: config } = await supabase
          .from('user_auto_trading_configs')
          .select('*')
          .eq('user_id', session.user_id)
          .single()

        const dailyLossLimit = (config?.daily_loss_limit || 2) / 100
        const dailyLossPercent = dailyPnL / session.current_balance

        if (dailyLossPercent <= -dailyLossLimit) {
          await supabase
            .from('auto_trading_sessions')
            .update({ 
              status: 'PAUSED',
              paused_reason: 'DAILY_LOSS_LIMIT',
              paused_at: new Date().toISOString()
            })
            .eq('id', session.id)

          await supabase.from('notifications').insert({
            user_id: session.user_id,
            type: 'circuit_breaker',
            title: 'Daglig Tapsgrense Nådd',
            message: `Daglig tap på ${(Math.abs(dailyLossPercent) * 100).toFixed(1)}%. Trading pauset.`,
            priority: 'high',
            read: false
          })

          results.circuitBreakersTriggered++
        }

        results.sessionsProcessed++

      } catch (err) {
        results.errors.push(`Session ${session.id}: ${err}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
