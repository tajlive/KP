import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars')
  }
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log('Stripe webhook received:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancelled(subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = getSupabase()
  const userId = session.metadata?.userId
  const planType = session.metadata?.planType
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!userId || !planType) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Update user profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: planType,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (profileError) {
    console.error('Error updating profile:', profileError)
    return
  }

  // Insert subscription record
  const { error: subError } = await supabase.from('subscriptions').insert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_type: planType,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (subError) {
    console.error('Error creating subscription:', subError)
  }

  console.log(`User ${userId} subscribed to ${planType}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = getSupabase()
  const subscriptionId = (invoice as any).subscription as string | undefined
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: new Date(invoice.lines.data[0]?.period?.end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getSupabase()
  const subscriptionId = (invoice as any).subscription as string | undefined
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  // Send email notification to user
  console.log(`Payment failed for subscription ${subscriptionId}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const supabase = getSupabase()
  const subscriptionId = subscription.id
  
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub || !subscriptionId) return

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  // Downgrade user to free plan
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.user_id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}
