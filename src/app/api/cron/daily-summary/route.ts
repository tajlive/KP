import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/auth/verify-cron'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { getDailySummaryEmail } from '@/lib/email/templates'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'

interface UserForSummary {
  id: string
  email: string | null
  full_name: string | null
}

export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req)
  if (authError) return authError

  try {
    const supabase = await createClient() as SupabaseClient<Database>
    const yesterday = new Date(Date.now() - 86400000).toISOString()

    // Hent alle brukere med e-post (user_profiles.id = auth.uid(); noen migrasjoner har også user_id)
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .not('email', 'is', null)

    if (!users) return NextResponse.json({ ok: true, sent: 0 })

    let sent = 0

    for (const user of users as Pick<UserForSummary, 'id' | 'email' | 'full_name'>[]) {
      if (!user.email) continue
      const userId = user.id

      // Hent brukerens trades siste 24t
      const { data: trades } = await supabase
        .from('trades')
        .select('realized_pnl')
        .eq('user_id', userId)
        .gte('executed_at', yesterday)

      if (!trades || trades.length === 0) continue

      const pnl = trades.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0)

      const { data: sessions } = await supabase
        .from('trading_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')

      const template = getDailySummaryEmail({
        userName: user.full_name || 'Bruker',
        tradesCount: trades.length,
        pnl,
        activeSessions: sessions?.length ?? 0,
        date: new Date().toISOString().split('T')[0],
      })

      await sendEmail({
        to: user.email,
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
