/**
 * Update Notification Settings Edge Function
 * Updates user's notification preferences
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
    const { pushEnabled, pushSignals, pushPriceAlerts, emailEnabled, emailSignals, emailWeeklyReport, smsEnabled, smsSignals } = body;

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

    // Check entitlements for SMS
    const { data: entitlements } = await supabase.rpc('get_user_entitlements', {
      p_user_id: user.id
    });

    const canUseSMS = entitlements?.[0]?.can_use_sms ?? false;

    // Build update object
    const updateData: Record<string, any> = {};
    
    if (pushEnabled !== undefined) updateData.push_enabled = pushEnabled;
    if (pushSignals !== undefined) updateData.push_signals = pushSignals;
    if (pushPriceAlerts !== undefined) updateData.push_price_alerts = pushPriceAlerts;
    if (emailEnabled !== undefined) updateData.email_enabled = emailEnabled;
    if (emailSignals !== undefined) updateData.email_signals = emailSignals;
    if (emailWeeklyReport !== undefined) updateData.email_weekly_report = emailWeeklyReport;
    
    // Only allow SMS if tier permits
    if (smsEnabled !== undefined) {
      if (smsEnabled && !canUseSMS) {
        return new Response(
          JSON.stringify({ error: 'SMS requires Pluss tier or higher' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData.sms_enabled = smsEnabled;
    }
    if (smsSignals !== undefined) {
      if (smsSignals && !canUseSMS) {
        return new Response(
          JSON.stringify({ error: 'SMS requires Pluss tier or higher' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updateData.sms_signals = smsSignals;
    }

    updateData.updated_at = new Date().toISOString();

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
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
      p_event_name: 'notification_settings_updated',
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
