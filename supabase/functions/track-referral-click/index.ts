/**
 * Track Referral Click Edge Function
 * Records when someone clicks a referral link
 * Can be called anonymously
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
    // Use service role for anonymous tracking
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { 
      referral_code, 
      source = 'direct', 
      landing_page = '/',
      ip_address,
      user_agent 
    } = body;

    if (!referral_code) {
      return new Response(
        JSON.stringify({ error: 'Missing referral_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find referrer by code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the click using RPC or direct insert
    // Using the track_referral_click function from database
    const { data: trackingId, error: trackError } = await supabase.rpc('track_referral_click', {
      p_referral_code: referral_code.toUpperCase(),
      p_source: source,
      p_landing_page: landing_page,
      p_ip_address: ip_address || null,
      p_user_agent: user_agent || req.headers.get('user-agent') || null,
    });

    if (trackError) {
      console.error('Track error:', trackError);
      // Fallback: insert directly
      const { data: inserted, error: insertError } = await supabase
        .from('referral_tracking')
        .insert({
          referrer_user_id: referrer.user_id,
          referral_code: referral_code.toUpperCase(),
          source,
          landing_page,
          ip_address: ip_address || null,
          user_agent: user_agent || req.headers.get('user-agent') || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          tracking_id: inserted.id,
          message: 'Referral click tracked' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tracking_id: trackingId,
        message: 'Referral click tracked' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Track referral error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
