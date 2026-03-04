/**
 * Follow Strategy Edge Function
 * Allows users to follow/unfollow strategies
 * Used by: /app/strategies (Fase 2)
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
    const body = await req.json();
    const { strategyId, action, allocationPercent, maxPositionSize, stopLossPercent } = body;

    if (!strategyId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Check entitlements
    const { data: entitlements } = await supabase.rpc('get_user_entitlements', {
      p_user_id: user.id
    });

    const canCopyTrade = entitlements?.[0]?.can_use_copy_trading ?? false;

    if (!canCopyTrade) {
      return new Response(
        JSON.stringify({ 
          error: 'Copy trading requires Standard tier or higher',
          upgradeRequired: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent following own strategy
    const { data: strategy } = await supabase
      .from('strategies')
      .select('user_id')
      .eq('id', strategyId)
      .single();

    if (strategy?.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot follow your own strategy' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'follow') {
      // Start following
      const { data: follow, error } = await supabase
        .from('strategy_followers')
        .upsert({
          strategy_id: strategyId,
          follower_user_id: user.id,
          allocation_percent: allocationPercent || 100,
          max_position_size_usd: maxPositionSize,
          stop_loss_percent: stopLossPercent || 10,
          is_active: true,
          started_at: new Date().toISOString()
        }, {
          onConflict: 'strategy_id,follower_user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Follow error:', error);
        throw error;
      }

      // Track event
      await supabase.rpc('record_app_event', {
        p_user_id: user.id,
        p_event_name: 'strategy_followed',
        p_props: { strategy_id: strategyId }
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Now following strategy',
          follow
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'unfollow') {
      // Stop following
      const { error } = await supabase
        .from('strategy_followers')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          end_reason: 'user_choice'
        })
        .eq('strategy_id', strategyId)
        .eq('follower_user_id', user.id);

      if (error) {
        console.error('Unfollow error:', error);
        throw error;
      }

      // Track event
      await supabase.rpc('record_app_event', {
        p_user_id: user.id,
        p_event_name: 'strategy_unfollowed',
        p_props: { strategy_id: strategyId }
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Unfollowed strategy'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use follow or unfollow' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
