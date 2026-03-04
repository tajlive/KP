/**
 * Update User Settings Edge Function
 * Updates user's general settings (safe mode, autotrade, etc)
 * Used by: /app/settings
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
    const { 
      safeModeEnabled, 
      autotradeEnabled, 
      autotradeMaxPositionPercent, 
      autotradeMaxDailyTrades,
      autotradeStopLossPercent,
      autotradeTakeProfitPercent,
      theme, 
      language,
      showInLeaderboard,
      allowCopyTrading
    } = body;

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

    // Check entitlements for autotrade
    const { data: entitlements } = await supabase.rpc('get_user_entitlements', {
      p_user_id: user.id
    });

    const canUseAutotrade = entitlements?.[0]?.can_use_autotrade ?? false;
    const canCopyTrade = entitlements?.[0]?.can_use_copy_trading ?? false;

    // Build update object
    const updateData: Record<string, any> = {};
    
    if (safeModeEnabled !== undefined) updateData.safe_mode_enabled = safeModeEnabled;
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (showInLeaderboard !== undefined) updateData.show_in_leaderboard = showInLeaderboard;
    
    // Autotrade requires proper tier
    if (autotradeEnabled !== undefined) {
      if (autotradeEnabled && !canUseAutotrade) {
        return new Response(
          JSON.stringify({ error: 'Autotrade requires active subscription' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData.autotrade_enabled = autotradeEnabled;
    }
    if (autotradeMaxPositionPercent !== undefined) updateData.autotrade_max_position_percent = autotradeMaxPositionPercent;
    if (autotradeMaxDailyTrades !== undefined) updateData.autotrade_max_daily_trades = autotradeMaxDailyTrades;
    if (autotradeStopLossPercent !== undefined) updateData.autotrade_stop_loss_percent = autotradeStopLossPercent;
    if (autotradeTakeProfitPercent !== undefined) updateData.autotrade_take_profit_percent = autotradeTakeProfitPercent;
    
    // Copy trading requires proper tier
    if (allowCopyTrading !== undefined) {
      if (allowCopyTrading && !canCopyTrade) {
        return new Response(
          JSON.stringify({ error: 'Copy trading requires Standard tier or higher' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData.allow_copy_trading = allowCopyTrading;
    }

    updateData.updated_at = new Date().toISOString();

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...updateData
      })
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    // Track event
    await supabase.rpc('record_app_event', {
      p_user_id: user.id,
      p_event_name: 'user_settings_updated',
      p_props: { changes: Object.keys(updateData) }
    });

    return new Response(
      JSON.stringify({
        success: true,
        settings
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
