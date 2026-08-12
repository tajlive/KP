import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { betaPaymentsDisabled } from '@/lib/beta-guards';

const pendingCheckouts = new Set<string>();

/**
 * Beta-sperre (2026-08-12): betaling er IKKE åpnet for kunder.
 * Sett til true i et fremtidig deploy når betaling faktisk åpner.
 */
const BETA_PAYMENTS_ENABLED = false;

// Valid Stripe price IDs - must match environment variables
const getAllowedPriceIds = (): string[] => {
  return [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_BACHELOR,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PHD,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR,
  ].filter((id): id is string => !!id && id.startsWith('price_'));
};

export async function POST(request: NextRequest) {
  // P0 kundevendt (2026-08-12): betaling er ikke åpnet i beta.
  // Alle kunder (inkludert Tom) får BETA_PAYMENTS_DISABLED.
  // Reversibelt: sett BETA_PAYMENTS_ENABLED=true for å gjenåpne (krever deploy).
  if (!BETA_PAYMENTS_ENABLED) {
    return betaPaymentsDisabled();
  }
  try {
    const { priceId, mode = 'subscription', successPath = '/dashboard' } = await request.json();
    
    // Validate priceId against allowed values
    const allowedPriceIds = getAllowedPriceIds();
    if (!priceId || !allowedPriceIds.includes(priceId)) {
      console.error('[Stripe Checkout] Invalid price ID:', priceId);
      return NextResponse.json(
        { error: 'Ugyldig pris-ID' },
        { status: 400 }
      );
    }
    
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Du må være logget inn for å fortsette' },
        { status: 401 }
      );
    }

    const dedupeKey = `${user.id}:${priceId}`;
    if (pendingCheckouts.has(dedupeKey)) {
      return NextResponse.json(
        { error: 'Betaling pågår allerede' },
        { status: 429 }
      );
    }
    
    pendingCheckouts.add(dedupeKey);
    
    setTimeout(() => pendingCheckouts.delete(dedupeKey), 30000);

    const stripe = getStripe();
    
    let customerId: string | undefined;
    
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://klarpakke.no';
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as 'subscription' | 'payment',
      success_url: `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/priser?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        price_id: priceId,
      },
      subscription_data: mode === 'subscription' ? {
        metadata: {
          supabase_user_id: user.id,
        },
      } : undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      payment_method_types: ['card'],
      customer_update: {
        address: 'auto',
      },
    });

    pendingCheckouts.delete(dedupeKey);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    
    const message = error instanceof Error 
      ? error.message 
      : 'Kunne ikke starte betalingen. Prøv igjen senere.';
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
