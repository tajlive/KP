

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';
  
  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d': startDate.setDate(now.getDate() - 7); break;
    case '30d': startDate.setDate(now.getDate() - 30); break;
    case '90d': startDate.setDate(now.getDate() - 90); break;
    case 'all': startDate = new Date('2020-01-01'); break;
    default: startDate.setDate(now.getDate() - 30);
  }

  if (!supabase) {
    return NextResponse.json({
      error: 'Database not configured',
      kpis: { total_users: 0, active_traders: 0, mrr: 0, course_enrollments: 0 },
      signup_trend: [],
      revenue_trend: [],
      trading_volume: [],
      course_progress: [],
      top_traders: [],
      recent_payments: [],
      _meta: {
        source: 'error',
        message: 'Supabase credentials not found',
        timestamp: new Date().toISOString(),
      }
    }, { status: 503 });
  }

  try {
    // 1. Get total users from profiles
    const { count: totalUsers } = await supabase
      .from('user_profiles' as unknown)
      .select('*', { count: 'exact', head: true });
    
    // 2. Get active traders (fra paper_accounts som har trades)
    const { data: paperAccounts } = await supabase
      .from('paper_accounts')
      .select('id, user_id');
    
    const activeTraders = paperAccounts?.length || 0;

    // 3. Get MRR (hvis orders finnes)
    let mrr = 0;
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('amount, status, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      mrr = orders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
    } catch {
      mrr = 0;
    }

    // 4. Get course enrollments
    const { count: enrollments } = await supabase
      .from('course_progress')
      .select('*', { count: 'exact', head: true });

    // 5. Get signup trend fra profiles
    const { data: signupData } = await supabase
      .from('user_profiles' as unknown)
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    const signupTrend = processTrendData(signupData || []);

    // 6. Get paper trades for activity
    const { data: paperTrades } = await supabase
      .from('trades')
      .select('executed_at')
      .eq('mode', 'paper')
      .gte('executed_at', startDate.toISOString())
      .order('executed_at');

    const tradingVolume = processTradingVolume(
      (paperTrades || []).map(t => ({ created_at: t.executed_at })), 
      startDate, 
      now
    );

    // 7. Get course stats
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title');

    const courseProgress: unknown[] = [];
    if (courses && courses.length > 0) {
      for (const course of courses) {
        const { count: enrolled } = await supabase
          .from('course_progress')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        const { count: completed } = await supabase
          .from('course_progress')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('status', 'completed');

        courseProgress.push({
          name: course.title,
          enrolled: enrolled || 0,
          completed: completed || 0,
        });
      }
    }

    // 8. Get beta signups
    const { data: betaSignups } = await supabase
      .from('beta_signups')
      .select('email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      kpis: {
        total_users: totalUsers || 0,
        active_traders: activeTraders,
        mrr,
        course_enrollments: enrollments || 0,
      },
      signup_trend: signupTrend,
      revenue_trend: [], // Ingen ordredata ennå
      trading_volume: tradingVolume,
      course_progress: courseProgress,
      top_traders: [],
      recent_payments: [],
      beta_signups: betaSignups || [],
      _meta: {
        source: 'database',
        period,
        timestamp: new Date().toISOString(),
        is_empty: (totalUsers || 0) === 0,
      }
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      kpis: { total_users: 0, active_traders: 0, mrr: 0, course_enrollments: 0 },
      signup_trend: [],
      revenue_trend: [],
      trading_volume: [],
      course_progress: [],
      top_traders: [],
      recent_payments: [],
      _meta: {
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }, { status: 500 });
  }
}

function processTrendData(data: Array<{ created_at: string }>) {
  if (!data || data.length === 0) return [];
  
  const trend: Record<string, number> = {};
  data.forEach(item => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    trend[date] = (trend[date] || 0) + 1;
  });

  return Object.entries(trend)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function processTradingVolume(trades: Array<{ created_at: string }>, startDate: Date, endDate: Date) {
  if (!trades || trades.length === 0) return [];
  
  const volume: Record<string, number> = {};
  
  // Initialize all dates with 0
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  for (let i = 0; i < Math.min(days, 30); i++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    volume[date.toISOString().split('T')[0]] = 0;
  }
  
  trades.forEach(trade => {
    const date = new Date(trade.created_at).toISOString().split('T')[0];
    if (volume[date] !== undefined) {
      volume[date] = (volume[date] || 0) + 1;
    }
  });

  return Object.entries(volume)
    .map(([date, vol]) => ({ date, volume: vol }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
