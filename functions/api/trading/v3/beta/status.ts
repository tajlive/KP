export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * Beta User Status API
 * 
 * GET /api/trading/v3/beta/status - Get current user's beta status
 * POST /api/trading/v3/beta/status/check - Check if trading is allowed
 */

import { createServerClient } from "@/lib/supabase/server";

async function GETHandler(request: Request, env: Env)() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }
    
    // Get beta user status
    const { data: betaUser } = await supabase
      .from('beta_users')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (!betaUser) {
      return new Response(JSON.stringify({ error: 'Not enrolled in beta' }), { headers: { 'Content-Type': 'application/json', ..., { status: 404 }.headers || {} }, status: , { status: 404 }.status || 200 });
    }
    
    // Get today's metrics
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMetrics } = await supabase
      .from('beta_user_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
    
    // Calculate current drawdown
    const { data: peakBalance } = await supabase
      .from('beta_user_metrics')
      .select('ending_balance')
      .eq('user_id', user.id)
      .order('ending_balance', { ascending: false })
      .limit(1)
      .single();
    
    const currentBalance = todayMetrics?.ending_balance ?? betaUser.initial_capital ?? 0;
    const peak = peakBalance?.ending_balance ?? betaUser.initial_capital ?? 0;
    const currentDrawdown = (peak ?? 0) > 0 ? ((peak ?? 0) - (currentBalance ?? 0)) / (peak ?? 1) : 0;
    
    return NextResponse.json({
      status: betaUser.status,
      cohort: betaUser.cohort,
      enrolledAt: betaUser.enrolled_at,
      limits: {
        dailyPnlCap: betaUser.daily_pnl_cap,
        dailyMaxGain: betaUser.daily_max_gain,
        maxDrawdownPct: betaUser.max_drawdown_pct,
        maxConsecutiveLosses: betaUser.max_consecutive_losses
      },
      metrics: {
        initialCapital: betaUser.initial_capital,
        currentBalance,
        peakBalance: peak,
        currentDrawdown: Math.round(currentDrawdown * 10000) / 10000,
        todayPnl: todayMetrics?.daily_pnl ?? 0,
        todayTrades: todayMetrics?.total_trades ?? 0,
        totalTrades: todayMetrics?.total_trades ?? 0,
        // @ts-expect-error - kill_switch_count not in generated types yet
        killSwitchCount: betaUser.kill_switch_count
      },
      canTrade: betaUser.status === 'active' && currentDrawdown < (betaUser.max_drawdown_pct ?? 0.1)
    });
    
  } catch (error) {
    console.error('Beta status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }
    
    const body = await request.json();
    const { proposedTrade } = body;
    
    // Call kill switch check function
    const { data: checkResult, error } = await supabase.rpc('check_beta_kill_switch', {
      p_user_id: user.id
    });
    
    if (error) {
      console.error('Kill switch check error:', error);
      return NextResponse.json(
        { error: 'Failed to check trading status' },
        { status: 500 }
      );
    }
    
    const canTrade = checkResult?.[0]?.can_trade ?? false;
    const reason = checkResult?.[0]?.reason;
    const severity = checkResult?.[0]?.severity;
    
    return NextResponse.json({
      canTrade,
      reason,
      severity,
      proposedTrade: proposedTrade ? {
        allowed: canTrade,
        warning: severity === 'soft' ? reason : undefined
      } : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Beta check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
