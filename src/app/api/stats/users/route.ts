/**
 * User stats API for landing page
 * GET /api/stats/users
 * Returns count of users created in the last 90 days
 * Cached with ISR for 1 hour
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

interface UserStatsResponse {
  count: number;
  cachedAt: string;
}

interface UserStatsErrorResponse {
  count: number;
  error: string;
  cachedAt: string;
}

const FALLBACK_COUNT = 100000; // 100K fallback

export async function GET() {
  const cachedAt = new Date().toISOString();

  try {
    const supabase = createClient();

    // Query count of users created in last 90 days
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('User stats API error:', error);
      // Return fallback data on error with 200 status
      return NextResponse.json<UserStatsErrorResponse>(
        {
          count: FALLBACK_COUNT,
          error: 'Failed to fetch user count',
          cachedAt,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    const count = data?.length ?? 0;

    return NextResponse.json<UserStatsResponse>(
      {
        count,
        cachedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('User stats API unexpected error:', error);
    // Return fallback data on any unexpected error
    return NextResponse.json<UserStatsErrorResponse>(
      {
        count: FALLBACK_COUNT,
        error: error instanceof Error ? error.message : 'Unknown error',
        cachedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  }
}
