import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, url, tag, notification_type = 'general' } = await req.json()

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 1. Check if user wants this notification type
    const shouldSendRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/should_send_push`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_user_id: user_id,
          p_notification_type: notification_type,
        }),
      }
    )

    const shouldSend = await shouldSendRes.json()

    if (!shouldSend) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'User preferences or quiet hours prevent this notification',
          user_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get user's push subscriptions
    const response = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${user_id}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
      }
    )

    const subscriptions = await response.json()

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Send notification to each subscription
    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const pushResponse = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `vapid t=${Deno.env.get('VAPID_PRIVATE_KEY')}, k=${Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')}`,
              'Content-Type': 'application/json',
              'TTL': '60',
            },
            body: JSON.stringify({
              title,
              body,
              url: url || '/',
              tag: tag || 'default',
              type: notification_type,
            }),
          })

          if (!pushResponse.ok) {
            // If subscription is expired/invalid, remove it
            if (pushResponse.status === 410 || pushResponse.status === 404) {
              await fetch(
                `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                  },
                }
              )
              return { endpoint: sub.endpoint, status: 'removed', reason: 'expired' }
            }
            throw new Error(`Push failed: ${pushResponse.status}`)
          }

          return { endpoint: sub.endpoint, status: 'sent' }
        } catch (error) {
          return { endpoint: sub.endpoint, status: 'failed', error: error.message }
        }
      })
    )

    // 4. Log notification to notification_history (optional tracking)
    await fetch(
      `${supabaseUrl}/rest/v1/notifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id,
          type: notification_type,
          title,
          message: body,
          sent_at: new Date().toISOString(),
          is_read: false,
        }),
      }
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        removed: results.filter(r => r.status === 'removed').length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
