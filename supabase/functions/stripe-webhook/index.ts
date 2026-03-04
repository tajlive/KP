/**
 * Stripe Webhook Handler Edge Function
 * Processes Stripe events and updates user subscriptions
 * 
 * Events handled:
 * - checkout.session.completed: New subscription started
 * - invoice.payment_succeeded: Subscription renewed
 * - invoice.payment_failed: Payment failed
 * - customer.subscription.deleted: Subscription canceled
 * - customer.subscription.updated: Plan changed
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Stripe signature
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<any> {
  const encoder = new TextEncoder();
  
  // Extract timestamp and signature parts
  const elements = signature.split(',');
  const signatureHash = elements.find(el => el.startsWith('v1='))?.replace('v1=', '');
  const timestamp = elements.find(el => el.startsWith('t='))?.replace('t=', '');
  
  if (!signatureHash || !timestamp) {
    throw new Error('Invalid signature format');
  }
  
  // Create signed payload
  const signedPayload = `${timestamp}.${payload}`;
  
  // Compute expected signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedHash = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Compare signatures
  if (signatureHash !== expectedHash) {
    throw new Error('Invalid signature');
  }
  
  // Check timestamp (allow 5 minute drift)
  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(timestamp) > 300) {
    throw new Error('Webhook timestamp too old');
  }
  
  return JSON.parse(payload);
}

// Map Stripe price IDs to subscription tiers
function getTierFromPriceId(priceId: string, priceMap: Record<string, string>): string {
  const tier = Object.entries(priceMap).find(([_, id]) => id === priceId)?.[0];
  return tier || 'free';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // Get Stripe price mapping from environment
    const priceMap = {
      standard: Deno.env.get('STRIPE_PRICE_STANDARD') || '',
      pluss: Deno.env.get('STRIPE_PRICE_PLUSS') || '',
      vip_ekstrem: Deno.env.get('STRIPE_PRICE_VIP') || '',
    };

    // Get the raw body and signature
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature and parse event
    const event = await verifyStripeSignature(payload, signature, stripeWebhookSecret);

    console.log('Processing Stripe event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        // Get the price ID from the line items
        const lineItems = session.display_items || session.line_items || [];
        const priceId = lineItems[0]?.price?.id || session.metadata?.price_id;
        const tier = getTierFromPriceId(priceId, priceMap);

        if (!userId) {
          console.error('No user ID in session');
          break;
        }

        // Update user profile
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }

        // Record billing event
        await supabase.rpc('record_billing_event', {
          p_user_id: userId,
          p_event_type: 'subscription_started',
          p_to_tier: tier,
          p_amount_nok: session.amount_total ? session.amount_total / 100 : null,
          p_metadata: {
            stripe_session_id: session.id,
            stripe_subscription_id: subscriptionId,
          },
        });

        console.log(`Subscription started for user ${userId}, tier: ${tier}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Record successful payment
          await supabase.rpc('record_billing_event', {
            p_user_id: profile.user_id,
            p_event_type: 'payment_succeeded',
            p_to_tier: profile.subscription_tier,
            p_amount_nok: invoice.amount_paid ? invoice.amount_paid / 100 : null,
            p_metadata: {
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: subscriptionId,
            },
          });

          console.log(`Payment succeeded for user ${profile.user_id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Record failed payment
          await supabase.rpc('record_billing_event', {
            p_user_id: profile.user_id,
            p_event_type: 'payment_failed',
            p_to_tier: profile.subscription_tier,
            p_metadata: {
              stripe_invoice_id: invoice.id,
              attempt_count: invoice.attempt_count,
            },
          });

          console.log(`Payment failed for user ${profile.user_id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find and update user
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Downgrade to free
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', profile.user_id);

          // Record cancellation
          await supabase.rpc('record_billing_event', {
            p_user_id: profile.user_id,
            p_event_type: 'subscription_canceled',
            p_from_tier: profile.subscription_tier,
            p_to_tier: 'free',
            p_metadata: {
              stripe_subscription_id: subscription.id,
            },
          });

          console.log(`Subscription canceled for user ${profile.user_id}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_tier')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile && subscription.items?.data[0]?.price?.id) {
          const newPriceId = subscription.items.data[0].price.id;
          const newTier = getTierFromPriceId(newPriceId, priceMap);

          if (newTier !== profile.subscription_tier) {
            // Tier changed
            await supabase
              .from('profiles')
              .update({
                subscription_tier: newTier,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', profile.user_id);

            // Record plan change
            await supabase.rpc('record_billing_event', {
              p_user_id: profile.user_id,
              p_event_type: newTier === 'free' ? 'plan_downgraded' : 'plan_upgraded',
              p_from_tier: profile.subscription_tier,
              p_to_tier: newTier,
              p_metadata: {
                stripe_subscription_id: subscription.id,
              },
            });

            console.log(`Plan changed for user ${profile.user_id}: ${profile.subscription_tier} -> ${newTier}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
