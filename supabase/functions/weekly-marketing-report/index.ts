/**
 * Weekly Marketing Report Edge Function
 * 
 * Sends a weekly Slack report with CTA and funnel metrics.
 * Triggered via Supabase cron scheduler.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunnelSummary {
  tracking_id: string;
  variant_key: string | null;
  experiment_key: string | null;
  funnel_stage: string;
  total_clicks: number;
  users_signed_up: number;
  users_with_first_paper: number;
  users_with_first_auto_trade: number;
}

interface WeeklyStats {
  tracking_id: string;
  total_clicks: number;
  signups: number;
  paper_sessions: number;
  auto_trades: number;
  signup_rate: number;
  paper_activation_rate: number;
  auto_trade_activation_rate: number;
}

async function fetchWeeklyStats(supabase: ReturnType<typeof createClient>): Promise<WeeklyStats[]> {
  // Refresh materialized view first
  await supabase.rpc('refresh_marketing_funnel_summary');

  // Fetch last 7 days of data
  const { data, error } = await supabase
    .from('marketing_funnel_summary')
    .select('*')
    .gte('last_click_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('total_clicks', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[weekly-report] Error fetching stats:', error);
    throw error;
  }

  const summary = (data || []) as FunnelSummary[];

  // Aggregate by tracking_id (sum up A/B variants)
  const aggregated = summary.reduce((acc, row) => {
    if (!acc[row.tracking_id]) {
      acc[row.tracking_id] = {
        tracking_id: row.tracking_id,
        total_clicks: 0,
        signups: 0,
        paper_sessions: 0,
        auto_trades: 0,
      };
    }
    acc[row.tracking_id].total_clicks += row.total_clicks;
    acc[row.tracking_id].signups += row.users_signed_up;
    acc[row.tracking_id].paper_sessions += row.users_with_first_paper;
    acc[row.tracking_id].auto_trades += row.users_with_first_auto_trade;
    return acc;
  }, {} as Record<string, Omit<WeeklyStats, 'signup_rate' | 'paper_activation_rate' | 'auto_trade_activation_rate'>>);

  // Calculate rates
  return Object.values(aggregated)
    .map((item) => ({
      ...item,
      signup_rate: item.total_clicks > 0 ? (item.signups / item.total_clicks) * 100 : 0,
      paper_activation_rate: item.signups > 0 ? (item.paper_sessions / item.signups) * 100 : 0,
      auto_trade_activation_rate: item.paper_sessions > 0 ? (item.auto_trades / item.paper_sessions) * 100 : 0,
    }))
    .sort((a, b) => b.total_clicks - a.total_clicks)
    .slice(0, 5);
}

function buildSlackMessage(stats: WeeklyStats[], experiments: { name: string; winner: string; lift: number }[]): string {
  const dateRange = `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('nb-NO')} - ${new Date().toLocaleDateString('nb-NO')}`;
  
  let message = `📊 *Ukentlig CTA/Funnel-rapport*\n`;
  message += `*Periode:* ${dateRange}\n\n`;

  // Top CTAs table
  message += `*Topp 5 CTA-er etter klikk:*\n\n`;
  message += '`Tracking ID` | Klikk | Signups | Paper | Auto-trade\n';
  message += '---|---|---|---|---\n';

  for (const stat of stats) {
    const signupRate = stat.signup_rate.toFixed(1);
    message += `\`${stat.tracking_id}\` | ${stat.total_clicks} | ${stat.signups} (${signup_rate}%) | ${stat.paper_sessions} | ${stat.auto_trades}\n`;
  }

  // A/B test results
  if (experiments.length > 0) {
    message += `\n🧪 *A/B-test resultater:*\n\n`;
    for (const exp of experiments) {
      const emoji = exp.lift > 0 ? '📈' : '📉';
      message += `${emoji} *${exp.name}*: Variant ${exp.winner} vinner med ${exp.lift > 0 ? '+' : ''}${exp.lift.toFixed(1)}%\n`;
    }
  }

  // Add context/help
  message += `\n_Ses i admin: /admin/marketing/ctas_`;

  return message;
}

async function sendToSlack(webhookUrl: string, message: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Slack API error: ${response.status} - ${error}`);
  }
}

async function fetchExperimentComparisons(supabase: ReturnType<typeof createClient>): Promise<{ name: string; winner: string; lift: number }[]> {
  const { data, error } = await supabase
    .from('marketing_funnel_summary')
    .select('experiment_key, variant_key, users_signed_up')
    .not('experiment_key', 'is', null)
    .gte('last_click_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) {
    return [];
  }

  // Group by experiment
  const byExperiment = (data as { experiment_key: string; variant_key: string; users_signed_up: number }[])
    .reduce((acc, row) => {
      if (!acc[row.experiment_key]) {
        acc[row.experiment_key] = {};
      }
      acc[row.experiment_key][row.variant_key || 'A'] = row.users_signed_up;
      return acc;
    }, {} as Record<string, Record<string, number>>);

  // Calculate winners
  return Object.entries(byExperiment)
    .filter(([_, variants]) => Object.keys(variants).length >= 2)
    .map(([name, variants]) => {
      const aSignups = variants['A'] || 0;
      const bSignups = variants['B'] || 0;
      const winner = bSignups > aSignups ? 'B' : 'A';
      const lift = aSignups > 0 ? ((bSignups - aSignups) / aSignups) * 100 : 0;
      return { name, winner, lift };
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookUrl = Deno.env.get('SLACK_MARKETING_WEBHOOK');
    
    if (!webhookUrl) {
      console.warn('[weekly-report] SLACK_MARKETING_WEBHOOK not set, returning data instead');
      
      // Still generate the report for testing
      const stats = await fetchWeeklyStats(supabase);
      const experiments = await fetchExperimentComparisons(supabase);
      
      return new Response(
        JSON.stringify({
          warning: 'SLACK_MARKETING_WEBHOOK not configured',
          stats,
          experiments,
          message_preview: buildSlackMessage(stats, experiments),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch stats
    const stats = await fetchWeeklyStats(supabase);
    const experiments = await fetchExperimentComparisons(supabase);

    if (stats.length === 0) {
      console.log('[weekly-report] No data to report');
      return new Response(
        JSON.stringify({ message: 'No data to report' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build and send message
    const message = buildSlackMessage(stats, experiments);
    await sendToSlack(webhookUrl, message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly report sent to Slack',
        stats_count: stats.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[weekly-report] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
