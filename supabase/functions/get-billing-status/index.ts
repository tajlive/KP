/**
 * Get Billing Status Edge Function
 * Returns user's subscription and billing info
 * Used by: /app/billing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, subscription_tier, subscription_status, trial_started_at, trial_ends_at, referral_code')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get billing history
    const { data: billingEvents } = await supabase
      .from('billing_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate days remaining in trial
    let trialDaysRemaining = 0;
    let isTrialExpired = false;
    
    if (profile.subscription_status === 'trial' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isTrialExpired = trialDaysRemaining <= 0;
    }

    // Get entitlements for feature list
    const { data: entitlements } = await supabase.rpc('get_user_entitlements', {
      p_user_id: user.id
    });

    const ent = entitlements?.[0];

    return new Response(
      JSON.stringify({
        subscription: {
          tier: profile.subscription_tier,
          status: profile.subscription_status,
          isTrial: profile.subscription_status === 'trial',
          trialDaysRemaining: Math.max(0, trialDaysRemaining),
          isTrialExpired,
          trialEndsAt: profile.trial_ends_at,
        },
        features: ent ? {
          canAccessSpot: ent.can_access_spot,
          canAccessFutures: ent.can_access_futures,
          canUseSMS: ent.can_use_sms,
          canUseAutotrade: ent.can_use_autotrade,
          canUseCopyTrading: ent.can_use_copy_trading,
          canUseLimitOrders: ent.can_use_limit_orders,
          futuresQuizPassed: ent.futures_quiz_passed,
        } : null,
        billing: {
          history: billingEvents || [],
          nextBillingDate: profile.subscription_status === 'active' 
            ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
            : null,
        },
        pricing: {
          standard: { monthly: 500, annual: 5000 },
          pluss: { monthly: 1000, annual: 10000 },
          vip: { monthly: 1500, annual: 15000 },
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
