

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { NextResponse } from 'next/server';
import { CAMPAIGN_CONFIG } from '@/lib/campaign-config';
import { getErrorMessage } from '@/lib/utils/error';

// Get environment variables at runtime
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pskhryjzkobytnfwucrb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!key) {
    return null;
  }
  
  return createClient<Database>(url, key);
}

export async function GET() {
  const supabase = getSupabaseClient();
  
  // If no Supabase connection, return fallback
  if (!supabase) {
    return NextResponse.json({
      ...CAMPAIGN_CONFIG.DEFAULT_STATS,
      channels: { linkedin: 12, email: 15, facebook: 8, direct: 12 },
      email: { sent: 850, opened: 340, clicked: 85 },
      is_fallback: true,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    // Get total signups from beta_signups table (the actual campaign registrations)
    const { count: total, error: countError } = await supabase
      .from('beta_signups')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
      throw countError;
    }

    // Get today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCount, error: todayError } = await supabase
      .from('beta_signups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (todayError) {
      console.error('Today count error:', todayError);
    }

    // Get this week's registrations
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: weekCount, error: weekError } = await supabase
      .from('beta_signups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    if (weekError) {
      console.error('Week count error:', weekError);
    }

    // Get channel breakdown (if source field exists)
    const { data: channelData, error: channelError } = await supabase
      .from('beta_signups')
      .select('source');

    const channels = {
      linkedin: channelData?.filter(u => u.source === 'linkedin').length || 0,
      email: channelData?.filter(u => u.source === 'email').length || 0,
      facebook: channelData?.filter(u => u.source === 'facebook').length || 0,
      direct: channelData?.filter(u => !u.source || u.source === 'direct').length || 0,
    };

    const totalUsers = total || 0;
    const remaining = Math.max(0, 100 - totalUsers);
    const percentage = Math.min(100, (totalUsers / 100) * 100);
    return NextResponse.json({
      total: totalUsers,
      today: todayCount || 0,
      week: weekCount || 0,
      remaining,
      percentage,
      channels,
      email: { sent: 0, opened: 0, clicked: 0 },
      is_fallback: false,
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Dashboard stats error:', getErrorMessage(error));
    
    // Return fallback on error
    return NextResponse.json({
      ...CAMPAIGN_CONFIG.DEFAULT_STATS,
      channels: { linkedin: 0, email: 0, facebook: 0, direct: 0 },
      email: { sent: 0, opened: 0, clicked: 0 },
      is_fallback: true,
      error: 'Database connection failed',
      updated_at: new Date().toISOString(),
    });
  }
}
