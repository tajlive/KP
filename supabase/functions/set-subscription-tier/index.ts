/**
 * Set Subscription Tier Edge Function
 * Admin function to set user subscription tier and status
 * For testing and support purposes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TIERS = ['free', 'standard', 'pluss', 'vip_ekstrem'];
const VALID_STATUSES = ['trial', 'active', 'past_due', 'canceled', 'expired'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body = await req.json();
    const { 
      user_id, 
      tier, 
      status = 'active',
      trial_ends_at,
      reason 
    } = body;

    if (!user_id || !tier) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_TIERS.includes(tier)) {
      return new Response(
        JSON.stringify({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {
      subscription_tier: tier,
      subscription_status: status,
      updated_at: new Date().toISOString(),
    };

    if (trial_ends_at) {
      updateData.trial_ends_at = trial_ends_at;
    }

    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    // Track admin action
    await supabase.rpc('record_app_event', {
      p_user_id: user_id,
      p_event_name: 'subscription_tier_changed',
      p_props: {
        new_tier: tier,
        new_status: status,
        changed_by: user.id,
        reason: reason || 'admin_action',
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          user_id: profile.user_id,
          display_name: profile.display_name,
          subscription_tier: profile.subscription_tier,
          subscription_status: profile.subscription_status,
          trial_ends_at: profile.trial_ends_at,
        },
        changed_by: user.id,
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
