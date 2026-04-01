/**
 * Public stats API for landing page
 * GET /api/stats
 * Returns aggregated paper trading statistics (no auth required)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

interface PaperStats {
  active_paper_traders: number;
  avg_return_pct: number | null;
  best_return_pct: number | null;
  hasEnoughData: boolean;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Query for active paper trading sessions with stats
    const { data: sessions, error } = await supabase
      .from('trading_sessions')
      .select('current_capital_nok, initial_capital')
      .eq('mode', 'paper')
      .eq('status', 'active');

    if (error) {
      console.error('Stats API error:', error);
      // Return fallback data on error
      return NextResponse.json<PaperStats>({
        active_paper_traders: 0,
        avg_return_pct: null,
        best_return_pct: null,
        hasEnoughData: false,
      });
    }

    // Calculate stats manually if we have data
    if (sessions && sessions.length > 0) {
      const returns = sessions
        .map(s => {
          const current = Number(s.current_capital_nok) || 100000;
          const initial = Number(s.initial_capital) || 100000;
          return ((current - initial) / initial) * 100;
        })
        .filter(r => !isNaN(r));

      const avgReturn = returns.length > 0
        ? returns.reduce((a, b) => a + b, 0) / returns.length
        : null;

      const bestReturn = returns.length > 0
        ? Math.max(...returns)
        : null;

      return NextResponse.json<PaperStats>({
        active_paper_traders: sessions.length,
        avg_return_pct: avgReturn,
        best_return_pct: bestReturn,
        hasEnoughData: sessions.length >= 10,
      });
    }

    // No data yet
    return NextResponse.json<PaperStats>({
      active_paper_traders: 0,
      avg_return_pct: null,
      best_return_pct: null,
      hasEnoughData: false,
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json<PaperStats>({
      active_paper_traders: 0,
      avg_return_pct: null,
      best_return_pct: null,
      hasEnoughData: false,
    });
  }
}
