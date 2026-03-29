import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const processedEvents = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Mangler signatur eller webhook secret' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Invalid signature:', err);
      return NextResponse.json(
        { error: 'Ugyldig signatur' },
        { status: 400 }
      );
    }

    const eventId = `${event.id}:${event.type}`;
    if (processedEvents.has(eventId)) {
      return NextResponse.json({ received: true, idempotency: true });
    }
    processedEvents.add(eventId);
    
    if (processedEvents.size > 1000) {
      const iterator = processedEvents.values();
      for (let i = 0; i < 100; i++) {
        const value = iterator.next().value;
        if (value) processedEvents.delete(value);
      }
    }

    const supabase = createClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const subData = subscription as unknown as {
            id: string;
            status: string;
            current_period_start: number;
            current_period_end: number;
            items: { data: Array<{ price: { id: string } }> };
          };

          const insertData = {
            user_id: session.metadata?.supabase_user_id,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subData.id,
            status: subData.status,
            price_id: subData.items.data[0]?.price.id,
            current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('subscriptions').upsert(insertData as any, {
            onConflict: 'stripe_subscription_id',
          }));
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as unknown as {
          id: string;
          status: string;
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
          metadata?: { supabase_user_id?: string };
          items: { data: Array<{ price: { id: string } }> };
        };
        
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subData.id)
          .maybeSingle();

        const userId = subData.metadata?.supabase_user_id;
        
        if (existing && userId) {
          await supabase.from('subscriptions').update({
            status: subData.status,
            price_id: subData.items.data[0]?.price.id,
            current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subData.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', subData.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase.from('subscriptions').update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id);
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        
        if (invoice.subscription) {
          await supabase.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', invoice.subscription);
        }
        
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
