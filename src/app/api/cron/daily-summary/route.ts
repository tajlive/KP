import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/auth/verify-cron'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { getDailySummaryEmail } from '@/lib/email/templates'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req)
  if (authError) return authError
  
  try {
    const supabase = createClient()
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    
    // Hent alle brukere med aktive sessions
    const { data: users } = await supabase
      .from('user_profiles' as any)
      .select('id, email, full_name')
      .not('email', 'is', null)
    
    if (!users) return NextResponse.json({ ok: true, sent: 0 })
    
    let sent = 0
    
    for (const user of users) {
      // Hent brukerens trades siste 24t
      const { data: trades } = await supabase
        .from('trades')
        .select('realized_pnl')
        .eq('user_id', user.id)
        .gte('executed_at', yesterday)
      
      if (!trades || trades.length === 0) continue
      
      const pnl = trades.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0)
      
      const { data: sessions } = await supabase
        .from('trading_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
      
      const template = getDailySummaryEmail({
        userName: user.full_name || 'Bruker',
        tradesCount: trades.length,
        pnl,
        activeSessions: sessions?.length ?? 0,
        date: new Date().toISOString().split('T')[0],
      })
      
      await sendEmail({
        to: user.email!,
        ...template,
      })
      
      sent++
    }
    
    return NextResponse.json({ ok: true, sent })
  } catch (error) {
    console.error('[Daily Summary]:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
