/**
 * Compute Leaderboard Monthly Edge Function
 * Calculates monthly leaderboard based on learning events
 * Can be called by cron job or admin
 * 
 * Scoring:
 * - Module completed: 10 pts
 * - Quiz passed: 25 pts  
 * - Perfect quiz score: 50 pts
 * - Risk rule followed: 15 pts
 * - Paper trade profit: 20 pts
 * - Paper trade loss: 5 pts (learning from mistakes)
 * - Daily login: 2 pts
 * - Referral: 100 pts
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

    // Check admin authorization (optional, for manual triggers)
    const authHeader = req.headers.get('authorization');
    let isAdmin = false;
    
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } },
        }
      );
      
      const { data: { user } } = await userClient.auth.getUser();
      
      if (user) {
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        isAdmin = roleData?.role === 'admin';
      }
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const targetMonth = body.month || getFirstDayOfMonth();
    const dryRun = body.dry_run || false;

    // Calculate leaderboard
    const { data: results, error } = await supabase.rpc(
      'compute_leaderboard_monthly',
      { p_month: targetMonth }
    );

    if (error) {
      console.error('Error computing leaderboard:', error);
      throw error;
    }

    // Get top 10 for response
    const { data: topUsers, error: topError } = await supabase
      .from('leaderboard_monthly')
      .select('rank, display_name, points, stats, user_id')
      .eq('month', targetMonth)
      .order('rank', { ascending: true })
      .limit(10);

    if (topError) {
      console.error('Error fetching top users:', topError);
    }

    // Track event
    await supabase.rpc('record_app_event', {
      p_user_id: null,
      p_event_name: 'leaderboard_computed',
      p_props: {
        month: targetMonth,
        users_count: results || 0,
        dry_run: dryRun,
        triggered_by: isAdmin ? 'admin' : 'cron'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        month: targetMonth,
        users_processed: results,
        dry_run: dryRun,
        top_10: topUsers?.map(u => ({
          rank: u.rank,
          display_name: u.display_name,
          points: u.points,
          stats: u.stats,
        })) || [],
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

function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}
