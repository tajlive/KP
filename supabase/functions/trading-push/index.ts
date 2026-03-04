// Trading Push Edge Function — Sprint 11
// Mottar Database Webhook ved bot_health INSERT
// Sender Web Push-varsel til brukerens enheter via VAPID

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hendelsesmaler
const EVENT_MESSAGES: Record<string, { title: string; body: string }> = {
  TRADE_CLOSED_PROFIT: {
    title: '✅ Trade lukket – gevinst!',
    body: 'Strategien din har tatt profitt.',
  },
  TRADE_CLOSED_LOSS: {
    title: '🔴 Trade lukket – tap',
    body: 'Stop-loss trigget. Kapitalen din er beskyttet.',
  },
  SIGNAL_BUY: {
    title: '📈 Kjøpssignal generert',
    body: 'En av strategiene dine vil kjøpe.',
  },
  SIGNAL_SELL: {
    title: '📉 Salgssignal generert',
    body: 'En av strategiene dine vil selge.',
  },
  ERROR: {
    title: '⚠️ Trading-feil',
    body: 'En av bot-ene dine støtte på et problem.',
  },
  CIRCUIT_OPEN: {
    title: '🔌 Trading midlertidig pauset',
    body: 'Circuit breaker aktivert etter gjentatte Binance-feil.',
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys mangler')
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  webpush.setVapidDetails('mailto:admin@klarpakke.no', vapidPublicKey, vapidPrivateKey)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const payload = await req.json()
    // Supabase Database Webhook format: { type, table, record, old_record, schema }
    const record = payload?.record ?? payload

    // Hopp over INFO-hendelser (for mange, unødvendig støy)
    if (!record || record.event_type === 'INFO') {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'INFO events skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = record.user_id
    if (!userId) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No user_id in event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hent push-abonnementer for brukeren
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) throw error
    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'No subscriptions for user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const msgTemplate = EVENT_MESSAGES[record.event_type] ?? {
      title: '🤖 Klarpakke Trading',
      body: record.message ?? 'En trading-hendelse har inntruffet.',
    }

    const notification = JSON.stringify({
      title: msgTemplate.title,
      body: record.message ?? msgTemplate.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: record.event_type,
      data: {
        event_type: record.event_type,
        details: record.details,
        url: '/auto-trading',
        timestamp: new Date().toISOString(),
      },
    })

    let sent = 0
    const expired: string[] = []

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notification
          )
          sent++
        } catch (pushErr: unknown) {
          const statusCode = (pushErr as { statusCode?: number }).statusCode
          if (statusCode === 410 || statusCode === 404) {
            // Utløpt eller ugyldig abonnement – rydd opp
            expired.push(sub.id)
          } else {
            console.error(`Push-feil for sub ${sub.id}:`, pushErr)
          }
        }
      })
    )

    // Slett utløpte abonnementer
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    return new Response(
      JSON.stringify({ success: true, sent, expired_cleaned: expired.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Trading push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
