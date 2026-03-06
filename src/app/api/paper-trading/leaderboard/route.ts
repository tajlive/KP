/**
 * Paper Trading Leaderboard API
 * 
 * Returns top performing paper traders sorted by ROI.
 * Features:
 * - Time period filtering (daily/weekly/monthly/all-time)
 * - Privacy-respecting (users opt-in to appear on leaderboard)
 * - Calculates win rate, total trades, and risk score
 * - Cached for 60 seconds to reduce DB load
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  startingCapital: number;
  currentCapital: number;
  totalPnL: number;
  roi: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskScore: number;
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  show_on_leaderboard: boolean;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Get period from query params
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') || 'all-time') as Period;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
  
  try {
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'all-time':
      default:
        startDate = null;
    }
    
    // Fetch paper trading sessions with user info
    // Only include users who have opted in to leaderboard
    let query = supabase
      .from('trading_sessions')
      .select(`
        id,
        user_id,
        starting_capital_nok,
        current_capital_nok,
        total_pnl,
        total_trades,
        started_at,
        user_profiles!inner(
          full_name,
          avatar_url,
          show_on_leaderboard
        )
      `)
      .eq('mode', 'paper')
      .eq('status', 'active')
      .eq('user_profiles.show_on_leaderboard', true)
      .order('current_capital_nok', { ascending: false })
      .limit(limit);
    
    if (startDate) {
      query = query.gte('started_at', startDate.toISOString());
    }
    
    const { data: sessions, error: sessionsError } = await query;
    
    if (sessionsError) {
      console.error('Failed to fetch leaderboard sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }
    
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        period,
        entries: [],
        totalParticipants: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
    
    // Fetch trade stats for each user to calculate win rate
    const userIds = sessions.map(s => s.user_id);
    
    const { data: tradeStats, error: tradeError } = await supabase
      .from('trades')
      .select('user_id, side, pnl')
      .in('user_id', userIds)
      .eq('mode', 'paper');
    
    if (tradeError) {
      console.error('Failed to fetch trade stats:', tradeError);
    }
    
    // Calculate user trade statistics
    const userTradeStats = new Map<string, { wins: number; total: number; pnls: number[] }>();
    
    tradeStats?.forEach(trade => {
      const stats = userTradeStats.get(trade.user_id) || { wins: 0, total: 0, pnls: [] };
      stats.total++;
      
      // For sell trades, positive PnL = win
      if (trade.side === 'sell' && trade.pnl && trade.pnl > 0) {
        stats.wins++;
      }
      
      if (trade.pnl) {
        stats.pnls.push(trade.pnl);
      }
      
      userTradeStats.set(trade.user_id, stats);
    });
    
    // Build leaderboard entries
    const entries: LeaderboardEntry[] = sessions.map((session, index) => {
      const profile = session.user_profiles as UserProfile;
      const stats = userTradeStats.get(session.user_id);
      
      const startingCapital = session.starting_capital_nok || 1000000; // Default 1M NOK
      const currentCapital = session.current_capital_nok || startingCapital;
      const totalPnL = currentCapital - startingCapital;
      const roi = ((currentCapital - startingCapital) / startingCapital) * 100;
      
      const totalTrades = stats?.total || session.total_trades || 0;
      const winningTrades = stats?.wins || 0;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      // Calculate Sharpe ratio (simplified)
      const pnls = stats?.pnls || [];
      const sharpeRatio = calculateSharpeRatio(pnls);
      
      // Calculate max drawdown (simplified estimation)
      const maxDrawdown = calculateMaxDrawdown(pnls);
      
      // Risk score: 0-100 based on sharpe and drawdown
      const riskScore = calculateRiskScore(sharpeRatio, maxDrawdown);
      
      return {
        userId: session.user_id,
        username: profile?.full_name || 'Anonymous Trader',
        avatarUrl: profile?.avatar_url,
        rank: index + 1,
        startingCapital,
        currentCapital,
        totalPnL,
        roi: Math.round(roi * 100) / 100,
        totalTrades,
        winningTrades,
        winRate: Math.round(winRate * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        riskScore: Math.round(riskScore),
      };
    });
    
    // Re-sort by ROI for final ranking
    entries.sort((a, b) => b.roi - a.roi);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return NextResponse.json({
      period,
      entries,
      totalParticipants: entries.length,
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate simplified Sharpe ratio
 * Sharpe = (mean return - risk free rate) / standard deviation
 */
function calculateSharpeRatio(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Assume risk-free rate of 2% annually, converted to per-trade basis (simplified)
  const riskFreeRate = 0.02 / 252; // Daily rate
  return (mean - riskFreeRate) / stdDev;
}

/**
 * Calculate maximum drawdown from return series
 */
function calculateMaxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  let maxDrawdown = 0;
  let peak = returns[0];
  
  for (const value of returns) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Calculate risk score (0-100) based on Sharpe ratio and drawdown
 * Lower score = higher risk
 */
function calculateRiskScore(sharpeRatio: number, maxDrawdown: number): number {
  // Sharpe contribution: higher is better (0-50 points)
  const sharpeScore = Math.min(Math.max(sharpeRatio * 25, 0), 50);
  
  // Drawdown contribution: lower is better (0-50 points)
  const drawdownScore = Math.max(0, 50 - maxDrawdown * 100);
  
  return sharpeScore + drawdownScore;
}
