/**
 * Upsert Profile on Signup Edge Function
 * Ensures user profile exists with trial period configured
 * Can be called as webhook or directly after signup
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body = await req.json();
    const { user_id, email, display_name, referral_code } = body;

    // Support both webhook format (user object) and direct call
    const targetUserId = user_id || body.user?.id || body.record?.id;
    const targetEmail = email || body.user?.email || body.record?.email;
    const targetDisplayName = display_name || 
                              body.user?.user_metadata?.display_name || 
                              body.record?.raw_user_meta_data?.display_name ||
                              (targetEmail ? targetEmail.split('@')[0] : null);

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ 
          message: 'Profile already exists',
          profile: existingProfile
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle referral
    let referredBy: string | null = null;
    if (referral_code) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referral_code)
        .single();
      
      if (referrer) {
        referredBy = referrer.user_id;
        
        // Award points to referrer
        await supabase.rpc('award_learning_points', {
          p_user_id: referrer.user_id,
          p_event_type: 'referral_signup',
          p_points: 100,
          p_metadata: { referred_user_id: targetUserId }
        });
      }
    }

    // Create profile with 14-day trial
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: targetUserId,
        display_name: targetDisplayName,
        subscription_tier: 'free',
        subscription_status: 'trial',
        trial_started_at: trialStartedAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        referral_code: generateReferralCode(),
        referred_by: referredBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    // Track signup event
    await supabase.rpc('record_app_event', {
      p_user_id: targetUserId,
      p_event_name: 'user_signup',
      p_props: {
        has_referral: !!referredBy,
        trial_ends_at: trialEndsAt.toISOString(),
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        trial: {
          started_at: trialStartedAt.toISOString(),
          ends_at: trialEndsAt.toISOString(),
          days: 14,
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

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
