import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars')
  }
  return createClient(url, key)
}

// Configure web-push lazily
function getWebPush() {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  
  if (!vapidPublic || !vapidPrivate) {
    throw new Error('VAPID keys not configured')
  }
  
  webpush.setVapidDetails(
    'mailto:tom@klarpakke.no',
    vapidPublic,
    vapidPrivate
  )
  
  return webpush
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { userId, title, body, data, actions } = await req.json()
    
    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for user' },
        { status: 404 }
      )
    }
    
    const wp = getWebPush()
    
    // Send push to all subscriptions
    const payload = JSON.stringify({
      title,
      body,
      data: data || {},
      actions: actions || [
        { action: 'open', title: 'Åpne app' },
        { action: 'dismiss', title: 'Lukk' },
      ],
    })
    
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }
        
        try {
          await wp.sendNotification(pushSubscription, payload)
          return { success: true, endpoint: sub.endpoint }
        } catch (err: any) {
          // Remove invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
          
          return { success: false, endpoint: sub.endpoint, error: err.message }
        }
      })
    )
    
    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - successful
    
    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
    })
  } catch (error: any) {
    console.error('Push send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
