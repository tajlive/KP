/**
 * Weekly Review Cron Job
 * Runs every Sunday at 23:00 UTC
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

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: sessions } = await supabase
      .from('auto_trading_sessions')
      .select('*')
      .gte('updated_at', sevenDaysAgo.toISOString())

    const results = {
      reviewsGenerated: 0,
      underperforming: 0,
      topPerformers: 0,
      errors: [] as string[]
    }

    for (const session of sessions || []) {
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: trades } = await supabase
          .from('auto_trading_trades')
          .select('*')
          .eq('session_id', session.id)
          .gte('created_at', thirtyDaysAgo.toISOString())

        if (!trades || trades.length === 0) continue

        const closedTrades = trades.filter(t => t.status === 'CLOSED')
        const returns = closedTrades.map(t => (t.realized_pnl || 0) / t.amount)
        const totalReturn = returns.reduce((a, b) => a + b, 0)
        const winningTrades = returns.filter(r => r > 0)
        const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0

        // Calculate grade
        let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F'
        const score = totalReturn > 0 ? 70 : 40
        if (score >= 80) grade = 'A'
        else if (score >= 70) grade = 'B'
        else if (score >= 60) grade = 'C'
        else if (score >= 50) grade = 'D'

        await supabase.from('auto_trading_reviews').insert({
          user_id: session.user_id,
          session_id: session.id,
          grade,
          score,
          total_return: totalReturn,
          win_rate: winRate,
          total_trades: closedTrades.length
        })

        await supabase.from('notifications').insert({
          user_id: session.user_id,
          type: 'weekly_review',
          title: `Ukentlig Rapport: Karakter ${grade}`,
          message: `Avkastning: ${(totalReturn * 100).toFixed(1)}%. Win rate: ${(winRate * 100).toFixed(0)}%.`,
          priority: grade === 'F' || grade === 'D' ? 'high' : 'medium',
          read: false
        })

        if (grade === 'A' || grade === 'B') results.topPerformers++
        if (grade === 'D' || grade === 'F') results.underperforming++
        results.reviewsGenerated++

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
