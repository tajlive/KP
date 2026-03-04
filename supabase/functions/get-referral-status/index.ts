/**
 * Get Referral Status Edge Function
 * Returns user's referral code and stats
 * Used by: /app/referrals
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

    // Get profile with referral code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code, referred_by')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get referral stats
    const { data: referrals } = await supabase
      .from('referral_tracking')
      .select('status, signed_up_at, converted_at, referrer_reward_points, referrer_reward_months')
      .eq('referrer_user_id', user.id)
      .order('clicked_at', { ascending: false });

    // Calculate stats
    const stats = {
      totalClicks: referrals?.length || 0,
      signedUp: referrals?.filter((r: any) => r.status === 'signed_up' || r.status === 'converted').length || 0,
      converted: referrals?.filter((r: any) => r.status === 'converted').length || 0,
      totalPoints: referrals?.reduce((sum: number, r: any) => sum + (r.referrer_reward_points || 0), 0) || 0,
      freeMonthsEarned: referrals?.reduce((sum: number, r: any) => sum + (r.referrer_reward_months || 0), 0) || 0,
    };

    // Generate referral link
    const baseUrl = Deno.env.get('SITE_URL') || 'https://klarpakke.no';
    const referralLink = `${baseUrl}/signup?ref=${profile.referral_code}`;

    return new Response(
      JSON.stringify({
        referralCode: profile.referral_code,
        referralLink,
        stats,
        referrals: referrals || [],
        rewards: {
          perSignup: { points: 100 },
          perConversion: { freeMonths: 1 },
        },
        wasReferred: !!profile.referred_by,
        binanceReferral: {
          url: 'https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BOO6JZZW',
          instructions: 'Opprett Binance-konto via vår link for å støtte oss'
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
