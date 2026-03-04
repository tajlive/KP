/**
 * Track Event Edge Function
 * Records analytics events: paywall views, referral clicks, upgrades, etc.
 * Supports both authenticated and anonymous events
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackEventRequest {
  event_name: string;
  props?: Record<string, any>;
  session_id?: string;
  page_path?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: TrackEventRequest = await req.json();
    const { event_name, props = {}, session_id, page_path } = body;

    if (!event_name) {
      return new Response(
        JSON.stringify({ error: 'Missing event_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client for inserting events
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT if present
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Get request metadata
    const userAgent = req.headers.get('user-agent');
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      '127.0.0.1';

    // Insert event using RPC (bypasses RLS with service role)
    const { data: eventId, error } = await supabase.rpc('record_app_event', {
      p_user_id: userId,
      p_event_name: event_name,
      p_props: props,
      p_session_id: session_id || null,
      p_page_path: page_path || null,
    });

    if (error) {
      console.error('Error recording event:', error);
      throw error;
    }

    // Special handling for specific events
    if (event_name === 'paywall_view' && userId) {
      // Update user's last paywall view time (could be used for retargeting)
      await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    if (event_name === 'plan_select' && userId && props.plan) {
      // Track plan selection intent
      await supabase.rpc('record_app_event', {
        p_user_id: userId,
        p_event_name: 'plan_select_intent',
        p_props: { selected_plan: props.plan, source: props.source || 'paywall' },
        p_session_id: session_id || null,
        p_page_path: page_path || null,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: eventId,
        tracked_for: userId || 'anonymous'
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
