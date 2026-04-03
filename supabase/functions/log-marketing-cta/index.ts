/**
 * Log Marketing CTA Edge Function
 * Records CTA clicks for marketing analytics
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid tracking IDs whitelist
const VALID_TRACKING_IDS = new Set([
  'pricing-primary',
  'pricing-secondary',
  'paper-primary',
  'paper-secondary',
  'hero-primary',
  'hero-secondary',
  'course-primary',
  'course-secondary',
  'help-primary',
  'signup-primary',
]);

// Valid funnel stages
const VALID_FUNNEL_STAGES = new Set(['landing', 'paper', 'pricing', 'course', 'signup', 'general']);

interface LogCtaRequest {
  tracking_id: string;
  locale: string;
  variant: string;
  href: string;
  route: string;
  experiment_key?: string;
  variant_key?: 'A' | 'B';
  funnel_stage?: string;
  user_id?: string;
  session_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: LogCtaRequest = await req.json();
    const {
      tracking_id,
      locale,
      variant,
      href,
      route,
      experiment_key,
      variant_key,
      funnel_stage = 'general',
      user_id: providedUserId,
      session_id,
    } = body;

    // Validate required fields
    if (!tracking_id || !locale || !href || !route) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tracking_id against whitelist (log warning but still accept)
    if (!VALID_TRACKING_IDS.has(tracking_id)) {
      console.warn(`[log-marketing-cta] Unknown tracking_id: ${tracking_id}`);
    }

    // Validate variant_key if provided
    if (variant_key && !['A', 'B'].includes(variant_key)) {
      return new Response(
        JSON.stringify({ error: 'Invalid variant_key. Must be A or B' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate funnel_stage
    if (!VALID_FUNNEL_STAGES.has(funnel_stage)) {
      return new Response(
        JSON.stringify({ error: `Invalid funnel_stage. Must be one of: ${Array.from(VALID_FUNNEL_STAGES).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT if present (override provided user_id for security)
    let finalUserId: string | null = null;
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
      finalUserId = user?.id ?? null;
    }

    // Use provided user_id only if no JWT user (for anonymous tracking)
    if (!finalUserId && providedUserId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(providedUserId)) {
        finalUserId = providedUserId;
      }
    }

    // Get request metadata
    const userAgent = req.headers.get('user-agent');
    const ipAddress = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Insert event
    const { data, error } = await supabase
      .from('marketing_cta_events')
      .insert({
        user_id: finalUserId,
        session_id: session_id || null,
        tracking_id,
        locale,
        variant: variant || 'default',
        route,
        href,
        experiment_key: experiment_key || null,
        variant_key: variant_key || null,
        funnel_stage,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[log-marketing-cta] Error inserting event:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: data.id,
        tracked_for: finalUserId || 'anonymous',
        funnel_stage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[log-marketing-cta] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
